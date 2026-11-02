import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {StorySchema} from '../src/contracts/story.js';
import {VisualPlanSchema,validateSegmentNarration,buildSegmentTimeline,segmentSrt} from '../src/short-segment/plan.js';
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
 const {plan}=await load('rembg'),timeline=buildSegmentTimeline(plan,13.137);expect(timeline.totalFrames/30).toBeGreaterThanOrEqual(14.137);expect(timeline.cues[0]!.sourceStartSeconds).toBe(0);expect(timeline.cues.at(-1)!.sourceEndSeconds).toBeCloseTo(13.137);expect(timeline.cueMethod).toContain('not-forced-aligned');expect(timeline.cues.map(c=>c.text).join('')).toBe(plan.phases.map(p=>p.captionText).join(''));for(let i=1;i<timeline.cues.length;i++)expect(timeline.cues[i]!.startFrame).toBe(timeline.cues[i-1]!.endFrame);expect(segmentSrt(timeline)).toContain('00:00:00,400 -->');expect(()=>buildSegmentTimeline(plan,41)).toThrow('Bounded');
});
it('shows source condition separately from illustrative range and preserves the foreground during mask application',async()=>{
 const rea=await load('rea'),timeline=buildSegmentTimeline(rea.plan,17),r=renderSegmentFrame(rea.plan,timeline,timeline.voiceEndFrame-1,'a'.repeat(64));expect(r).toContain('speed &lt; 13');expect(r).toContain('6 → 12');expect(r).toContain('非实际测速');
 const rembg=await load('rembg'),t=buildSegmentTimeline(rembg.plan,13),early=renderSegmentFrame(rembg.plan,t,t.cues[2]!.startFrame,'b'.repeat(64)),late=renderSegmentFrame(rembg.plan,t,t.voiceEndFrame-1,'b'.repeat(64));expect(early).toContain('url(#checker)');expect(early).toContain('白色 → 保留前景');expect(early).not.toEqual(late);expect(late).toContain('sourceShotIds');expect(()=>renderSegmentFrame(rembg.plan,t,t.totalFrames,'x')).toThrow('outside');
});
