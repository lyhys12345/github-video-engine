import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {compileAnimation,sampleAnimation} from '../src/story-planner/animation.js';
import {renderFramePreview} from '../src/story-planner/frame-preview.js';
it('renders evidence-bound schematic sequences for two projects',async()=>{
 for(const n of ['rea','rembg']){const read=async(s:string)=>JSON.parse(await readFile(`examples/story-planner-v1/${s}.json`,'utf8'));const p=compileAnimation(await read(n),await read(n+'-animation'));for(const shot of p.shots){const first=renderFramePreview(p,shot.startFrame),last=renderFramePreview(p,shot.endFrame-1);expect(first).toContain('实验示意');expect(first).toContain('<metadata>');expect(first).toContain('非实际执行记录');expect(last).not.toEqual(first);for(const o of sampleAnimation(p,shot.startFrame).objects){expect(o.x).toBeGreaterThanOrEqual(0);expect(o.x).toBeLessThanOrEqual(1);}}}
});
