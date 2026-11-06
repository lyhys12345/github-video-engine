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
it('enlarges only bounded short object labels and keeps long labels at legacy size',async()=>{
 const read=async(name:string)=>JSON.parse(await readFile('examples/http-story-v1/'+name+'.json','utf8'));
 const story=await read('express-story'),animation=await read('express-animation');
 animation.shots[0].objects[0].label='POST→405';
 animation.shots[0].objects[1].label='THIS IS A DELIBERATELY LONG LABEL';
 const plan=compileAnimation(story,animation),svg=renderFramePreview(plan,plan.shots[0]!.endFrame-1);
 expect(svg).toContain('font-size="28">POST→405</text>');
 expect(svg).toContain('font-size="20">THIS IS A DELIBERATELY LONG LABEL</text>');
});
it('renders two explicitly disjoint request-response transfers as independent lanes',async()=>{
 const read=async(name:string)=>JSON.parse(await readFile('examples/http-story-v1/'+name+'.json','utf8'));
 const story=await read('express-story'),a=await read('express-animation'),shot=a.shots[0],claims=shot.actions[0].claimIds;
 shot.objects=[{id:'one-in',label:'POST /books',kind:'state',visual:'request'},{id:'one-out',label:'405',kind:'state',visual:'response'},{id:'two-in',label:'GET /missing',kind:'state',visual:'request'},{id:'two-out',label:'404',kind:'state',visual:'response'}];
 shot.actions=[{kind:'transfer',source:'one-in',target:'one-out',start:.1,end:.4,claimIds:claims},{kind:'transfer',source:'two-in',target:'two-out',start:.6,end:.9,claimIds:claims}];
 const p=compileAnimation(story,a),svg=renderFramePreview(p,p.shots[0]!.endFrame-1);
 expect(svg).toContain('data-independent-lane="1"');expect(svg).toContain('data-independent-lane="2"');expect(svg).toContain('POST /books');expect(svg).toContain('GET /missing');
 expect(svg).toContain('M260 420 H460');expect(svg).toContain('M260 700 H460');
});
it('does not disguise a shared-input graph as independent request lanes',async()=>{
 const read=async(name:string)=>JSON.parse(await readFile('examples/http-story-v1/'+name+'.json','utf8'));
 const story=await read('express-story'),a=await read('express-animation'),shot=a.shots[0],claims=shot.actions[0].claimIds;
 shot.objects=[{id:'in-a',label:'REQUEST A',kind:'state',visual:'request'},{id:'out-a',label:'A',kind:'state',visual:'response'},{id:'in-b',label:'REQUEST B',kind:'state',visual:'request'},{id:'out-b',label:'B',kind:'state',visual:'response'}];
 shot.actions=[{kind:'transfer',source:'in-a',target:'out-a',start:.1,end:.4,claimIds:claims},{kind:'transfer',source:'in-a',target:'out-b',start:.6,end:.9,claimIds:claims}];
 const p=compileAnimation(story,a),svg=renderFramePreview(p,p.shots[0]!.endFrame-1);
 expect(svg).not.toContain('data-independent-lane=');
});
