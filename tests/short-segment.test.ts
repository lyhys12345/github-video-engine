import {it,expect} from 'vitest';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sha256} from '../src/core/util.js';
import {segmentRevision,type SegmentFingerprint} from '../src/short-segment/revision.js';
import {StorySchema} from '../src/contracts/story.js';
import {VisualPlanSchema,SegmentCueTimingSchema,validateSegmentNarration,buildSegmentTimeline,segmentSrt} from '../src/short-segment/plan.js';
import {renderSegmentFrame,captionLines} from '../src/short-segment/frame.js';
const load=async(name:string)=>{const story=StorySchema.parse(JSON.parse(await readFile(`examples/story-planner-v1/${name}.json`,'utf8'))),plan=VisualPlanSchema.parse(JSON.parse(await readFile(`reviews/chen-segments-v1/${name}-visual-plan.json`,'utf8')));return {story,plan};};
it('keeps index.js in one subtitle line without changing current narration',async()=>{
 const {plan}=await load('rea'),caption=plan.phases[0]!.captionText,wrapped=captionLines(caption,22);expect(wrapped.join('')).toBe(caption);expect(wrapped.some(line=>line.includes('index.js'))).toBe(true);expect(wrapped.every(line=>Array.from(line).length<=22)).toBe(true);expect(wrapped).toHaveLength(2);
 const timeline=buildSegmentTimeline(plan,13.792625),svg=renderSegmentFrame(plan,timeline,84,'a'.repeat(64));expect(svg).toMatch(/<text[^>]*>[^<]*index\.js[^<]*<\/text>/);
});
it('binds current selected narration as one continuous source and rejects historic text',async()=>{
 for(const name of ['rea','rembg']){const {story,plan}=await load(name),narration=plan.sourceShotIds.map(id=>story.shots.find(s=>s.id===id)!.narration).join('');expect(validateSegmentNarration(story,plan,narration)).toBe(narration);expect(()=>validateSegmentNarration(story,plan,'old teaser')).toThrow('Exact current');expect(()=>validateSegmentNarration(story,{...plan,sourceShotIds:[plan.sourceShotIds[0]!,plan.sourceShotIds[0]!]},narration)).toThrow('Duplicate');}
});
it('keeps full measured audio at original speed and marks approximate source-time cues honestly',async()=>{
 const {plan}=await load('rembg'),timeline=buildSegmentTimeline(plan,13.137);expect(timeline.totalFrames/30).toBeGreaterThanOrEqual(14.137);expect(timeline.cues[0]!.sourceStartSeconds).toBe(0);expect(timeline.cues.at(-1)!.sourceEndSeconds).toBeCloseTo(13.137);expect(timeline.cueMethod).toBe('text-weighted-within-measured-continuous-audio-not-forced-aligned');expect(timeline.cues.every(c=>c.confidence==='estimated-unverified-by-listening')).toBe(true);expect(timeline.timingEvidence).toBeUndefined();expect(timeline.cues.map(c=>c.text).join('')).toBe(plan.phases.map(p=>p.captionText).join(''));for(let i=1;i<timeline.cues.length;i++)expect(timeline.cues[i]!.startFrame).toBe(timeline.cues[i-1]!.endFrame);expect(segmentSrt(timeline)).toContain('00:00:00,400 -->');expect(()=>buildSegmentTimeline(plan,41)).toThrow('Bounded');
});
const timingFixture=async()=>{
 const {plan}=await load('rembg'),seconds=13.137,voiceSha256='a'.repeat(64),transcriptSha256=sha256(plan.phases.map(p=>p.captionText).join(''));
 const timing=SegmentCueTimingSchema.parse({schemaVersion:'1.1',captionTextSha256:plan.phases.map(p=>sha256(p.captionText)),voiceSha256,transcriptSha256,measuredVoiceSeconds:seconds,method:'manual-listening',boundariesSeconds:[0,3.2,6,9.1,seconds],reviewBasis:'Caller reports listening to the exact phase boundaries; independent review and final owner acceptance pending'});
 return {plan,seconds,timing,binding:{voiceSha256,transcriptSha256}};
};
it.each(['manual-listening','forced-alignment-reviewed'] as const)('records %s boundaries as caller declarations with independent timing UNVERIFIED',async(method)=>{
 const {plan,seconds,timing,binding}=await timingFixture(),timeline=buildSegmentTimeline(plan,seconds,{...timing,method},binding);
 expect(timeline.cueMethod).toBe(method==='manual-listening'?'caller-declared-manual-listening-boundaries':'caller-declared-forced-alignment-reviewed-boundaries');expect(timeline.cues[0]!.sourceEndSeconds).toBe(3.2);expect(timeline.cues.every(c=>c.confidence==='caller-declared-reviewed-timing-independent-unverified')).toBe(true);
 expect(timeline.timingEvidence).toEqual({source:'caller-declared',independentTimingReview:'UNVERIFIED',ownerAcceptance:'pending',reviewBasis:timing.reviewBasis});
 expect(()=>buildSegmentTimeline(plan,seconds,timing,{...binding,voiceSha256:'c'.repeat(64)})).toThrow('exact current voice');
 expect(()=>buildSegmentTimeline(plan,seconds,timing,{...binding,transcriptSha256:'d'.repeat(64)})).toThrow('exact current voice');
 expect(()=>buildSegmentTimeline(plan,seconds,timing)).toThrow('exact current voice');
 expect(()=>buildSegmentTimeline(plan,seconds+.01,timing,binding)).toThrow('measured duration');
});
it('rejects stale timing after moving one character between adjacent phases with unchanged full text and phase count',async()=>{
 const {plan,seconds,timing,binding}=await timingFixture(),phases=plan.phases.map(p=>({...p})),moved=Array.from(phases[0]!.captionText).pop()!;
 phases[0]!.captionText=phases[0]!.captionText.slice(0,-moved.length);phases[1]!.captionText=moved+phases[1]!.captionText;
 expect(phases).toHaveLength(plan.phases.length);expect(phases.map(p=>p.captionText).join('')).toBe(plan.phases.map(p=>p.captionText).join(''));
 expect(()=>buildSegmentTimeline({...plan,phases},seconds,timing,binding)).toThrow('each exact current caption phase in order');
});
it('rejects missing, wrong-count, reordered and mismatched phase hashes at the runtime entry',async()=>{
 const {plan,seconds,timing,binding}=await timingFixture(),{captionTextSha256,...missing}=timing;
 for(const invalid of [missing,{...timing,captionTextSha256:captionTextSha256.slice(1)},{...timing,captionTextSha256:[...captionTextSha256].reverse()},{...timing,captionTextSha256:captionTextSha256.map((hash,i)=>i===0?'f'.repeat(64):hash)},{...timing,captionTextSha256:[...captionTextSha256,captionTextSha256[0]!]}])expect(()=>buildSegmentTimeline(plan,seconds,invalid,binding)).toThrow();
});
it('hashes raw UTF-8 caption text without Unicode or whitespace normalization',async()=>{
 const {plan,seconds,timing,binding}=await timingFixture(),phases=plan.phases.map((p,i)=>({...p,captionText:i===0?'e\u0301 '+p.captionText:p.captionText})),captionTextSha256=phases.map(p=>sha256(p.captionText));
 const exact={...timing,captionTextSha256,transcriptSha256:sha256(phases.map(p=>p.captionText).join(''))},exactBinding={...binding,transcriptSha256:exact.transcriptSha256};
 expect(()=>buildSegmentTimeline({...plan,phases},seconds,exact,exactBinding)).not.toThrow();
 for(const normalize of [(text:string)=>text.normalize('NFC'),(text:string)=>text.replace(/\s/g,'')])expect(()=>buildSegmentTimeline({...plan,phases},seconds,{...exact,captionTextSha256:phases.map(p=>sha256(normalize(p.captionText)))},exactBinding)).toThrow('each exact current caption phase in order');
});
it('rejects legacy 1.0 in both schema and direct runtime with a fresh review requirement',async()=>{
 const {plan,seconds,timing,binding}=await timingFixture(),{captionTextSha256,...legacyFields}=timing,legacy={...legacyFields,schemaVersion:'1.0'};
 for(const input of [legacy,{...timing,schemaVersion:'1.0'}]){
  expect(()=>SegmentCueTimingSchema.parse(input)).toThrow('reviewed again against the exact caption phases');
  expect(()=>buildSegmentTimeline(plan,seconds,input,binding)).toThrow('do not migrate by adding hashes alone');
 }
});
it('rejects malformed direct sidecars and boundary attacks without falling back to estimates',async()=>{
 const {plan,seconds,timing,binding}=await timingFixture();
 for(const invalid of [null,{}, {...timing,method:'unreviewed'}, {...timing,reviewBasis:''}, {...timing,extra:true}, {...timing,measuredVoiceSeconds:NaN}])expect(()=>buildSegmentTimeline(plan,seconds,invalid,binding)).toThrow();
 for(const boundariesSeconds of [[0,3.2,6,seconds],[0,3.2,6,9.1,10,seconds],[.0011,3.2,6,9.1,seconds],[0,3.2,6,9.1,seconds+.0051],[0,3.2,3.2,9.1,seconds],[0,6,3.2,9.1,seconds],[0,.1,6,9.1,seconds],[0,3.2,6,seconds-.05,seconds],[0,-.001,6,9.1,seconds],[0,NaN,6,9.1,seconds],[0,Infinity,6,9.1,seconds]])expect(()=>buildSegmentTimeline(plan,seconds,{...timing,boundariesSeconds},binding)).toThrow();
 const minimum=buildSegmentTimeline(plan,seconds,{...timing,boundariesSeconds:[0,4/30,6,9.1,seconds]},binding);expect(minimum.cues[0]!.endFrame-minimum.cues[0]!.startFrame).toBe(4);
 const tail=buildSegmentTimeline(plan,seconds,{...timing,boundariesSeconds:[0,3.2,6,seconds-.1,seconds]},binding);expect(tail.cues.at(-1)!.endFrame-tail.cues.at(-1)!.startFrame).toBe(4);
});
it('invalidates timeline, captions and downstream outputs for a timing-only revision while preserving prior bytes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'segment-timing-'));
 try{
  const fingerprint:SegmentFingerprint={source:'source',plan:'plan',voice:'voice',transcript:'transcript',cueTiming:'old-timing',style:'style',font:'font',implementation:'implementation'},mp4=Buffer.from('prior output bytes'),evaluation=JSON.stringify({fingerprint,technicalPassed:true,output:{sha256:sha256(mp4)}});
  await writeFile(join(root,'evaluation.json'),evaluation);await writeFile(join(root,'segment.mp4'),mp4);
  const revision=await segmentRevision(root,{...fingerprint,cueTiming:'new-timing'});expect(revision.kind).toBe('local-revision');
  if(revision.kind!=='local-revision')throw Error('Expected local revision');
  expect(revision.changed).toEqual(['cueTiming']);expect(revision.invalidated).toEqual(['timeline','captions','frames','mp4','review-approval']);expect(revision.approvalStatus).toBe('previous-review-stale-new-review-required');
  expect(await readFile(join(root,'evaluation.json'),'utf8')).toBe(evaluation);expect(await readFile(join(root,'segment.mp4'))).toEqual(mp4);
 }finally{await rm(root,{recursive:true,force:true});}
});
it('shows source condition separately from illustrative range and preserves the foreground during mask application',async()=>{
 const rea=await load('rea'),timeline=buildSegmentTimeline(rea.plan,17),r=renderSegmentFrame(rea.plan,timeline,timeline.voiceEndFrame-1,'a'.repeat(64));expect(r).toContain('speed &lt; 13');expect(r).toContain('6 → 12');expect(r).toContain('非实际测速');
 const rembg=await load('rembg'),t=buildSegmentTimeline(rembg.plan,13),early=renderSegmentFrame(rembg.plan,t,t.cues[2]!.startFrame,'b'.repeat(64)),late=renderSegmentFrame(rembg.plan,t,t.voiceEndFrame-1,'b'.repeat(64));expect(early).toContain('url(#checker)');expect(early).toContain('白色 → 保留前景');expect(early).not.toEqual(late);expect(late).toContain('sourceShotIds');expect(()=>renderSegmentFrame(rembg.plan,t,t.totalFrames,'x')).toThrow('outside');
});
