import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {compileAnimation,sampleAnimation} from '../src/story-planner/animation.js';
import {renderFramePreview} from '../src/story-planner/frame-preview.js';
it('binds a rule operation and a distinct image/mask/output operation',async()=>{
 for(const n of ['rea','rembg']){
  const story=JSON.parse(await readFile(`examples/story-planner-v1/${n}.json`,'utf8'));
  const animation=JSON.parse(await readFile(`examples/story-planner-v1/${n}-animation.json`,'utf8'));
  const p=compileAnimation(story,animation),shot=p.shots.find(s=>s.actions.some(a=>a.kind==='rule-build'||a.kind==='mask-apply'))!,action=shot.actions[0]!;
  const before=sampleAnimation(p,action.startFrame),after=sampleAnimation(p,Math.min(action.endFrame,shot.endFrame-1));
  expect(before.objects.find(o=>o.id===action.target)!.opacity).toBe(0);expect(after.objects.find(o=>o.id===action.target)!.mix).toBeGreaterThan(.9);
  expect(renderFramePreview(p,action.startFrame)).not.toBe(renderFramePreview(p,Math.min(action.endFrame,shot.endFrame-1)));
  if(n==='rembg'){animation.shots.find((s:any)=>s.shotId===shot.shotId).actions[0].operand='absent';expect(()=>compileAnimation(story,animation)).toThrow();}
 }
});
