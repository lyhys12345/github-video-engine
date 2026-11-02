import {it,expect} from 'vitest';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {compileAnimation} from '../src/story-planner/animation.js';
import {renderFramePreview} from '../src/story-planner/frame-preview.js';
it('same rule renderer supports opacity rather than speed',async()=>{
 const story=JSON.parse((await readFile('examples/story-planner-v1/rea.json','utf8')).replace(/^\uFEFF/,''));
 const input=JSON.parse(await readFile('examples/story-planner-v1/rea-animation.json','utf8'));
 const shot=input.shots.find((s:any)=>s.shotId==='shot-7'),action=shot.actions.find((a:any)=>a.kind==='rule-build');
 action.rule={inputLabel:'完成条件',outputLabel:'可见度',effect:'opacity',from:0,to:1,unit:''};
 const p=compileAnimation(story,input),s=p.shots.find(s=>s.shotId==='shot-7')!;
 const before=renderFramePreview(p,s.startFrame),after=renderFramePreview(p,s.endFrame-1);
 expect(before).toContain('可见度');expect(after).not.toContain('更新计数');expect(before).not.toEqual(after);
 await mkdir('work/non-speed-rule',{recursive:true});await writeFile('work/non-speed-rule/animation.json',JSON.stringify(input,null,2));
 for(const f of [.1,.5,.9])await writeFile(`work/non-speed-rule/rule-${f}.svg`,renderFramePreview(p,s.startFrame+Math.floor((s.endFrame-s.startFrame-1)*f)));
 action.rule.to=2;expect(()=>compileAnimation(story,input)).toThrow(/Opacity/);
});
