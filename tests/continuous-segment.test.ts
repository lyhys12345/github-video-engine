import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {VisualPlanSchema,VisualStyleSchema,buildSegmentTimeline,validateSegmentGeneration,validateSegmentNarration} from '../src/short-segment/plan.js';
import {StorySchema} from '../src/contracts/story.js';
import {renderSegmentFrame} from '../src/short-segment/frame.js';
import {wrapCaption} from '../src/short-segment/captions.js';
const json=async(path:string)=>JSON.parse(await readFile(path,'utf8'));
it('keeps naturally measured continuous voice within each declared output band',async()=>{
 for(const [name,seconds] of [['rea',50.83425],['rembg',31.555875]] as const){const plan=VisualPlanSchema.parse(await json(`reviews/continuous-explainer-v1/${name}-visual-plan.json`)),story=StorySchema.parse(await json(`fixtures/continuous/${name}-story.json`)),text=story.shots.map(s=>s.narration).join('');expect(validateSegmentNarration(story,plan,text)).toBe(text);const timeline=buildSegmentTimeline(plan,seconds);expect(timeline.totalFrames/30).toBeGreaterThanOrEqual(plan.durationBounds!.minSeconds);expect(timeline.totalFrames/30).toBeLessThanOrEqual(plan.durationBounds!.maxSeconds);expect(timeline.cues.at(-1)!.sourceEndSeconds).toBeCloseTo(seconds,10);expect(()=>buildSegmentTimeline(plan,2)).toThrow('outside authored');}
});
it('rejects caller transcript forgery even when story and captions are changed together',async()=>{
 const plan=VisualPlanSchema.parse(await json('reviews/continuous-explainer-v1/rembg-visual-plan.json')),receipt=await json('fixtures/continuous/generation-receipt.json'),old=receipt.recordings[1],current=receipt.recordings[2];
 expect(()=>validateSegmentGeneration(plan,receipt,old.sha256,current.text,receipt.provider,receipt.voiceLabel)).toThrow('exact submitted text');
 expect(()=>validateSegmentGeneration(plan,receipt,current.sha256,current.text,receipt.provider,receipt.voiceLabel)).not.toThrow();expect(()=>validateSegmentGeneration(plan,undefined,current.sha256,current.text,receipt.provider,receipt.voiceLabel)).toThrow();
});
it('carries the same geometry through removal and actual edge magnification and consumes captured style',async()=>{
 const plan=VisualPlanSchema.parse(await json('reviews/continuous-explainer-v1/rembg-visual-plan.json')),style=VisualStyleSchema.parse(await json('fixtures/continuous/rembg-style.json')),timeline=buildSegmentTimeline(plan,31.555875),frame=timeline.cues[5]!.startFrame+60;
 const svg=renderSegmentFrame(plan,timeline,frame,'a'.repeat(64),style),changed=renderSegmentFrame(plan,timeline,frame,'a'.repeat(64),{...style,subjectColor:'#70d2c0'});
 expect(svg).toContain('clip-path="url(#edge-crop)"');expect(svg).toContain('scale(2.1) translate(-421 -600)');expect(svg).not.toEqual(changed);expect(changed).toContain('#70d2c0');expect(svg.match(/M-71 113V24/g)).toHaveLength(1);expect(svg.match(/mask="url\(#foreground-mask\)"/g)).toHaveLength(2);expect(svg).toContain('<use href="#source-photo"/>');
 const inspect=renderSegmentFrame(plan,timeline,timeline.cues[2]!.startFrame+30,'a'.repeat(64),style);expect(inspect).toContain('translate(356 268) scale(0.4)');
});
it('exposes authored rule revisions in the visible code and in causal speed state',async()=>{
 const plan=VisualPlanSchema.parse(await json('reviews/continuous-explainer-v1/rea-visual-plan.json')),style=VisualStyleSchema.parse(await json('fixtures/continuous/rea-style.json')),timeline=buildSegmentTimeline(plan,50.83425),frame=timeline.cues[4]!.startFrame+60;
 const before=renderSegmentFrame(plan,timeline,frame,'b'.repeat(64),style),after=renderSegmentFrame({...plan,rule:{...plan.rule!,to:9}},timeline,frame,'b'.repeat(64),style);expect(before).toContain('6 → 12');expect(after).toContain('6 → 9');expect(after).not.toEqual(before);
 expect(before).toContain('speed += 0.001;');expect(before).toContain('手动调速 · 作者预设轨迹');
});
it('hands automatic speed to manual control without resetting speed or integrated road position',async()=>{
 const plan=VisualPlanSchema.parse(await json('reviews/continuous-explainer-v1/rea-visual-plan.json')),style=VisualStyleSchema.parse(await json('fixtures/continuous/rea-style.json')),timeline=buildSegmentTimeline(plan,50.83425),handoff=timeline.cues[5]!.startFrame;
 const before=renderSegmentFrame(plan,timeline,handoff-1,'b'.repeat(64),style),after=renderSegmentFrame(plan,timeline,handoff,'b'.repeat(64),style),later=renderSegmentFrame(plan,timeline,handoff+30,'b'.repeat(64),style);
 const speed=(svg:string)=>Number(svg.match(/y="744"[^>]*>([0-9.]+)</)![1]);expect(speed(after)).toBe(speed(before));expect(speed(later)).toBeLessThan(speed(after));
 const obstacle=(svg:string)=>Number(svg.match(/clip-path="url\(#game-road\)"><g transform="translate\(([0-9.]+) 858\)/)![1]);const travel=(obstacle(before)-obstacle(after)+690)%690;expect(travel).toBeCloseTo(speed(after)*.52,2);
});
it('keeps spoken decimals and model words together and avoids a tiny closing subtitle line',()=>{
 const numeric=wrapCaption('每更新一次，就加一点。起步是六，每次加零点零零一，不到十三，就继续加速。',22);expect(numeric.some(l=>l.includes('零点零零一'))).toBe(true);
 const closing=wrapCaption('这里用合成插画演示处理原理，并没有实际运行模型。',22);expect(closing.some(l=>l.includes('模型'))).toBe(true);expect(Array.from(closing.at(-1)!).length).toBeGreaterThan(6);expect(closing.join('')).toBe('这里用合成插画演示处理原理，并没有实际运行模型。');
});
it('keeps the observed assistant and noncollision phrases together in REA subtitles',()=>{
 for(const [text,token] of [['这里，REA 提供程序线索，助手根据线索重建演示。','助手'],['沿着代码看，规则就出现了：没撞上、速度还没到上限，','没撞上']]){const lines=wrapCaption(text!,22);expect(lines.join('')).toBe(text);expect(lines.some(line=>line.includes(token!))).toBe(true);}
});
