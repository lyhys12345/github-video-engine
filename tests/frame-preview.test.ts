import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {compileAnimation,sampleAnimation} from '../src/story-planner/animation.js';
import {renderFramePreview} from '../src/story-planner/frame-preview.js';
it('renders evidence-bound schematic sequences for two projects',async()=>{
 for(const n of ['rea','rembg']){const read=async(s:string)=>JSON.parse(await readFile(`examples/story-planner-v1/${s}.json`,'utf8'));const p=compileAnimation(await read(n),await read(n+'-animation'));for(const shot of p.shots){const first=renderFramePreview(p,shot.startFrame),last=renderFramePreview(p,shot.endFrame-1);expect(first).toContain('实验示意');expect(first).toContain('<metadata>');expect(first).toContain('非实际执行记录');expect(last).not.toEqual(first);for(const o of sampleAnimation(p,shot.startFrame).objects){expect(o.x).toBeGreaterThanOrEqual(0);expect(o.x).toBeLessThanOrEqual(1);}}}
});

it('keeps the entire disclosure visible across SVG lines and gives transfer traces a direction',async()=>{
 const read=async(name:string)=>JSON.parse(await readFile('examples/http-story-v1/'+name+'.json','utf8'));
 const story=await read('express-story'),animation=await read('express-animation');
 story.evidence.disclosure='Illustrative client request & response. The server was never run. '+('界'.repeat(85));
 const plan=compileAnimation(story,animation),shot=plan.shots[2]!;
 const context={story,provenanceSha256:'a'.repeat(64)};
 const preview=renderFramePreview(plan,shot.endFrame-1,context);
 const renderedLines=[...preview.matchAll(/<tspan [^>]+>([^<]*)<\/tspan>/gu)].map(line=>line[1]!).join('');
 expect(renderedLines).toBe((story.name+story.evidence.disclosure).replace('&','&amp;'));
 expect((preview.match(/<tspan /g)??[]).length).toBeGreaterThan(4);
 expect(preview).toContain('data-from="handler" data-to="response"');
 expect(preview).toContain('marker-end="url(#flow-arrow)"');
 expect(preview).toContain('orient="auto"');
 expect(preview).toContain('M480 530H216');
 expect(preview).toContain('Client receives Hello World');
 const midpoint=shot.startFrame+Math.floor((shot.endFrame-shot.startFrame-1)*.5);
 const middle=renderFramePreview(plan,midpoint,context);
 expect(middle).toContain('translate(216.00 640.00)');
 expect(middle).toContain('translate(480.00 640.00)');
 expect(middle).toContain('M480 530H216');
 expect(renderFramePreview(plan,midpoint,context,'2')).not.toContain('translate(216.00 640.00)');
 const legacy=renderFramePreview(plan,shot.endFrame-1,context,'legacy');
 expect(legacy).not.toContain('<tspan ');
 expect(legacy).not.toContain('marker-end=');
});
