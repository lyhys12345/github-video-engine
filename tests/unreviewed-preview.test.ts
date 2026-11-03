import {it,expect} from 'vitest';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sha256,canonical} from '../src/core/util.js';
import {VisualPlanSchema,VisualStyleSchema,SegmentInputSchema,SegmentCueTimingSchema,buildSegmentTimeline,segmentSrt} from '../src/short-segment/plan.js';
import {UnreviewedAlignmentDraftSchema,buildUnreviewedPreviewTimeline,alignmentTokenLedger,inspectAlignmentPcm,type UnreviewedAlignmentBinding} from '../src/short-segment/unreviewed-alignment.js';
import {renderSegmentFrame} from '../src/short-segment/frame.js';
import {segmentRevision,type SegmentFingerprint} from '../src/short-segment/revision.js';
const json=async(path:string)=>JSON.parse(await readFile(path,'utf8'));
// Actual model-produced proposal values, with non-consumed machine paths replaced by /fixture/ placeholders.
// This tests the consumer contract; it does not replay a model run, source decoding or listening.
async function fixture(){
 const draft=await json('tests/fixtures/rembg-alignment-proposal.json'),planBytes=await readFile('reviews/continuous-explainer-v1/rembg-visual-plan.json'),plan=VisualPlanSchema.parse(JSON.parse(planBytes.toString('utf8'))),{path,fullDecode,trimmed,retimed,...decodedAudio}=draft.decodedAudio;
 const binding:UnreviewedAlignmentBinding={voiceSha256:draft.bindings.audioSha256,voiceBytes:521831,planSha256:sha256(planBytes),transcriptSha256:sha256(plan.phases.map(p=>p.captionText).join('')),generationReceiptSha256:sha256(await readFile('fixtures/continuous/generation-receipt.json')),decodedAudio};
 const build=(value:unknown=draft,b= binding)=>buildUnreviewedPreviewTimeline(plan,31.555875,value,b,sha256(JSON.stringify(value)));
 return {draft,plan,binding,build};
}
it('validates full actual proposal into a separately marked 977-frame owner hearing timeline',async()=>{
 const {draft,plan,build}=await fixture(),timeline=build();
 expect(timeline.totalFrames).toBe(977);expect(timeline.totalFrames/30).toBeCloseTo(32.5666666667);expect(timeline.voiceStartFrame).toBe(12);expect((timeline.totalFrames-timeline.voiceEndFrame)/30).toBe(.6);
 expect(timeline.purpose).toBe('owner-review-preview');expect(timeline.cueMethod).toBe('local-forced-alignment-proposal-unreviewed-preview');expect(timeline.cues.every(c=>c.confidence==='forced-alignment-proposal-unverified-by-listening')).toBe(true);
 expect(timeline.independentTimingReview).toBe('UNVERIFIED');expect(timeline.speechContentReview).toBe('UNVERIFIED');expect(timeline.ownerAcceptance).toBe('pending');expect(timeline.timingEvidence).toBeUndefined();
 expect(timeline.cues.map(c=>c.sourceStartSeconds)).toEqual(draft.assessment.boundariesSeconds.slice(0,-1));expect(timeline.cues.map(c=>c.text).join('')).toBe(plan.phases.map(p=>p.captionText).join(''));
 expect(timeline.unreviewedAlignment!.flags).toEqual(draft.assessment.flags);expect(timeline.unreviewedAlignment!.timestampRepairs).toEqual(draft.assessment.timestampRepairs);expect(timeline.unreviewedAlignment!.timestampResolution).toEqual(draft.timestampResolution);expect(segmentSrt(timeline)).toContain('00:00:00,400 -->');
 expect(draft.renderable).toBe(false);expect(draft.status).toBe('PROPOSED_UNREVIEWED');expect(()=>SegmentCueTimingSchema.parse(draft)).toThrow();
});
it.each(['voice hash','voice bytes','plan bytes','transcript hash','receipt hash'] as const)('rejects stale %s bindings',async(kind)=>{
 const {build,binding}=await fixture(),b={...binding};if(kind==='voice hash')b.voiceSha256='0'.repeat(64);if(kind==='voice bytes')b.voiceBytes--;if(kind==='plan bytes')b.planSha256='1'.repeat(64);if(kind==='transcript hash')b.transcriptSha256='2'.repeat(64);if(kind==='receipt hash')b.generationReceiptSha256='3'.repeat(64);expect(()=>build(undefined,b)).toThrow();
});
it.each(['phase hash','phase order','phase offset','token order','token offset','separators','anchor','midpoint','gap','boundary','diagnostic error','promoted status','renderable','review state','review basis','nonfinite','negative','overlap','out of range','PCM duration','PCM frames','clock difference','model resolution','missing token'] as const)('rejects mutated %s without fallback',async(kind)=>{
 const {draft,build}=await fixture();
 if(kind==='phase hash')draft.bindings.captionTextSha256[0]='f'.repeat(64);
 if(kind==='phase order')draft.phases.reverse();if(kind==='phase offset')draft.phases[1].codepointStart++;
 if(kind==='token order')draft.tokenLedger.tokens.reverse();if(kind==='token offset')draft.tokenLedger.tokens[1].utf8Start++;
 if(kind==='separators')draft.tokenLedger.discardedSeparators.pop();
 if(kind==='anchor')draft.assessment.cuts[0].leftEndSeconds+=.01;if(kind==='midpoint')draft.assessment.cuts[0].cutSeconds+=.01;if(kind==='gap')draft.assessment.cuts[0].gapSeconds+=.01;if(kind==='boundary')draft.assessment.boundariesSeconds[1]+=.01;
 if(kind==='diagnostic error')draft.assessment.errors.push('unresolved cut');if(kind==='promoted status')draft.status='REVIEWED';if(kind==='renderable')draft.renderable=true;if(kind==='review state')draft.independentTimingReview='PASS';if(kind==='review basis')draft.reviewBasis='fabricated';
 if(kind==='nonfinite')draft.postprocessedItems[0].endSeconds=NaN;if(kind==='negative')draft.postprocessedItems[0].startSeconds=-.01;if(kind==='overlap')draft.postprocessedItems[1].startSeconds=.01;if(kind==='out of range')draft.postprocessedItems.at(-1).endSeconds=32;
 if(kind==='PCM duration')draft.decodedAudio.durationSeconds+=.01;if(kind==='PCM frames')draft.decodedAudio.frames++;if(kind==='clock difference')draft.containerMinusPcmSeconds+=.0001;if(kind==='model resolution')draft.timestampResolution.modelTimestampSegmentTimeMilliseconds=1;if(kind==='missing token')draft.postprocessedItems.pop();
 expect(()=>build(draft)).toThrow();
});
it('rejects a coherently declared sub-four-frame cue using recomputed token anchors',async()=>{
 const {draft,build}=await fixture();
 for(let i=0;i<=9;i++){draft.postprocessedItems[i].startSeconds=i*.01;draft.postprocessedItems[i].endSeconds=(i+1)*.01;}
 draft.postprocessedItems[10].startSeconds=.1;
 const items=draft.postprocessedItems,assessment=draft.assessment;
 assessment.flags=items.flatMap((item:any,i:number)=>item.startSeconds===item.endSeconds?[{kind:'zero-duration-item',itemIndex:i,seconds:item.startSeconds}]:[]);
 assessment.gaps=items.flatMap((item:any,i:number)=>i&&item.startSeconds>items[i-1].endSeconds?[{leftItem:i-1,rightItem:i,startSeconds:items[i-1].endSeconds,endSeconds:item.startSeconds,durationSeconds:item.startSeconds-items[i-1].endSeconds}]:[]);
 assessment.cuts=draft.phases.slice(0,-1).map((phase:any)=>{const left=items[phase.lastToken],right=items[phase.lastToken+1];return{afterPhase:phase.index,leftItem:phase.lastToken,rightItem:phase.lastToken+1,leftEndSeconds:left.endSeconds,rightStartSeconds:right.startSeconds,cutSeconds:(left.endSeconds+right.startSeconds)/2,policy:'midpoint of [last-left-token end, first-right-token start]',gapSeconds:right.startSeconds-left.endSeconds};});
 assessment.boundariesSeconds=[0,...assessment.cuts.map((c:any)=>c.cutSeconds),draft.sourceAudio.containerDurationSeconds];
 assessment.prospectiveCueFramesAt30Fps=draft.phases.map((phase:any,i:number)=>{const start=Math.round(assessment.boundariesSeconds[i]*30),end=i===draft.phases.length-1?Math.ceil(draft.sourceAudio.containerDurationSeconds*30):Math.round(assessment.boundariesSeconds[i+1]*30);if(end-start<4)assessment.flags.push({kind:'prospective-cue-under-four-frames',phaseIndex:i,fps:30,durationFrames:end-start});return{phaseIndex:i,fps:30,roundedSourceStartFrame:start,roundedSourceEndFrame:end,durationFrames:end-start};});
 draft.boundaryAuditions.forEach((clip:any,i:number)=>{const seconds=assessment.cuts[i].cutSeconds,sample=Math.round(seconds*16000),start=Math.max(0,sample-24000),end=Math.min(draft.decodedAudio.frames,sample+24000);Object.assign(clip,{sourceClipStartFrame:start,sourceClipEndFrame:end,sourceClipStartSeconds:start/16000,sourceClipEndSeconds:end/16000,cutRelativeSample:sample-start,proposedCutSeconds:seconds,quantizedCutSeconds:sample/16000});});
 expect(()=>UnreviewedAlignmentDraftSchema.parse(draft)).not.toThrow();
 expect(()=>build(draft)).toThrow('cue under four frames');
});
it('retains simulated repair annotations and rejects inconsistent or duplicate repaired indices',async()=>{
 const {draft,build}=await fixture();
 draft.assessment.timestampRepairs=[{index:0,rawMilliseconds:80,repairedMilliseconds:0,deltaMilliseconds:-80}];
 expect(build(draft).unreviewedAlignment!.timestampRepairs).toEqual(draft.assessment.timestampRepairs);
 const altered=structuredClone(draft);altered.assessment.timestampRepairs[0].repairedMilliseconds=1;altered.assessment.timestampRepairs[0].deltaMilliseconds=-79;expect(()=>build(altered)).toThrow('repair evidence');
 draft.assessment.timestampRepairs.push({...draft.assessment.timestampRepairs[0]});expect(()=>build(draft)).toThrow('repair evidence');
});
it('rejects PCM hashes independently supplied from actual sibling payload validation',async()=>{
 const {build,binding}=await fixture();
 for(const decodedAudio of [{...binding.decodedAudio,pcmSha256:'f'.repeat(64)},{...binding.decodedAudio,sha256:'0'.repeat(64)},{...binding.decodedAudio,frames:binding.decodedAudio.frames-1}])expect(()=>build(undefined,{...binding,decodedAudio})).toThrow('PCM identity');
});
it('restricts explicit proposal mode and rejects both timing paths',async()=>{
 const {draft,plan,binding,build}=await fixture();expect(()=>buildUnreviewedPreviewTimeline({...plan,presentation:undefined},31.555875,draft,binding,'a'.repeat(64))).toThrow('continuous-explainer');
 const input={schemaVersion:'1.0',bundlePath:'/fixture/pack',visualPlanPath:'/fixture/plan',voice:{path:'/fixture/audio',sha256:'a'.repeat(64),transcript:'text',provider:'original',voiceLabel:'Chen',approvalBasis:'pending input only'}};
 expect(()=>SegmentInputSchema.parse({...input,unreviewedAlignmentPath:'/fixture/draft'})).not.toThrow();expect(()=>SegmentInputSchema.parse({...input,unreviewedAlignmentPath:''})).toThrow();expect(()=>SegmentInputSchema.parse({...input,cueTimingPath:'/fixture/timing',unreviewedAlignmentPath:'/fixture/draft'})).toThrow('mutually exclusive');
 expect(()=>buildUnreviewedPreviewTimeline(plan,31.565875,draft,binding,'a'.repeat(64))).toThrow('container duration');expect(()=>build(null)).toThrow();
});
it('keeps the badge outside fade groups on actual first/middle/last SVGs and preserves content disclosures',async()=>{
 const {plan,build}=await fixture(),timeline=build(),style=VisualStyleSchema.parse(await json('fixtures/continuous/rembg-style.json'));
 for(const frame of [0,Math.floor(timeline.totalFrames/2),timeline.totalFrames-1]){const svg=renderSegmentFrame(plan,timeline,frame,'a'.repeat(64),style),badge=svg.slice(svg.indexOf('<g data-owner-review-badge'));
  expect(badge).toContain('自动对齐·待听审');expect(badge).toContain('y="148"');expect(badge).not.toContain('opacity=');expect(svg).toMatch(/<\/g><g data-owner-review-badge="unreviewed">/);expect(svg).toContain('合成插画与蒙版示意 · 未运行 rembg 模型');
 }
 const weighted=buildSegmentTimeline(plan,31.555875);expect(renderSegmentFrame(plan,weighted,0,'a'.repeat(64),style)).not.toContain('自动对齐·待听审');
});
it('retains weighted and caller-reviewed timing behavior without changing reviewed schema',async()=>{
 const {plan,binding,draft}=await fixture(),weighted=buildSegmentTimeline(plan,31.555875),reviewed={schemaVersion:'1.1',captionTextSha256:plan.phases.map(p=>sha256(p.captionText)),voiceSha256:binding.voiceSha256,transcriptSha256:binding.transcriptSha256,measuredVoiceSeconds:31.555875,method:'forced-alignment-reviewed',boundariesSeconds:draft.assessment.boundariesSeconds,reviewBasis:'Test caller declaration; not a hearing assertion'};
 expect(weighted.cueMethod).toBe('text-weighted-within-measured-continuous-audio-not-forced-aligned');expect(weighted.purpose).toBeUndefined();expect(buildSegmentTimeline(plan,31.555875,reviewed,binding).cueMethod).toBe('caller-declared-forced-alignment-reviewed-boundaries');expect(()=>SegmentCueTimingSchema.parse({...reviewed,method:'local-forced-alignment-proposal'})).toThrow();
});
it('uses codepoint and UTF8 offsets without splitting mixed-script words or silently stripping symbols',()=>{
 const ledger=alignmentTokenLedger("中 REA index.js 12.50 don't");expect(ledger.tokens.map(t=>t.text)).toEqual(['中','REA','index','js','12','50',"don't"]);expect(ledger.tokens[1]).toMatchObject({codepointStart:2,utf8Start:4});
 expect(()=>alignmentTokenLedger('e\u0301')).toThrow('unsupported');expect(()=>alignmentTokenLedger('中😀')).toThrow('unsupported');
});
function pcmWav(){const data=Buffer.alloc(3200,1),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(16000,24);header.writeUInt32LE(32000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);return Buffer.concat([header,data]);}
it('verifies actual supplied PCM payload bytes, frame clock and rejects wrong formats/truncation',()=>{
 const bytes=pcmWav(),identity=inspectAlignmentPcm(bytes);expect(identity.frames).toBe(1600);expect(identity.durationSeconds).toBe(.1);expect(identity.pcmSha256).toBe(sha256(bytes.subarray(44)));expect(identity.sha256).toBe(sha256(bytes));
 const stereo=Buffer.from(bytes);stereo.writeUInt16LE(2,22);expect(()=>inspectAlignmentPcm(stereo)).toThrow('PCM');expect(()=>inspectAlignmentPcm(bytes.subarray(0,-2))).toThrow('RIFF');
});
it('invalidates all timing-dependent outputs on draft-only change and on preview removal, preserving prior bytes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'preview-revision-'));
 try{const fingerprint:SegmentFingerprint={source:'s',plan:'p',voice:'v',transcript:'t',cueTiming:'estimated',alignmentDraft:'old-draft',style:'style',font:'font',implementation:'i'},mp4=Buffer.from('prior fixture MP4 placeholder'),evaluation=JSON.stringify({fingerprint,technicalPassed:true,output:{sha256:sha256(mp4)}});await writeFile(join(root,'evaluation.json'),evaluation);await writeFile(join(root,'segment.mp4'),mp4);
  for(const current of [{...fingerprint,alignmentDraft:'new-draft'},(({alignmentDraft,...rest})=>rest)(fingerprint)]){const revision=await segmentRevision(root,current);expect(revision.kind).toBe('local-revision');if(revision.kind!=='local-revision')throw Error('revision expected');expect(revision.changed).toEqual(['alignmentDraft']);expect(revision.invalidated).toEqual(['timeline','captions','frames','mp4','review-approval']);}
  expect(await readFile(join(root,'evaluation.json'),'utf8')).toBe(evaluation);expect(await readFile(join(root,'segment.mp4'))).toEqual(mp4);
 }finally{await rm(root,{recursive:true,force:true});}
});
