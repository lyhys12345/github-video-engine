import {z} from 'zod';
import {compileStory} from './compile.js';
const id=z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const ruleEffect=z.object({inputLabel:z.string().min(1).max(80),outputLabel:z.string().min(1).max(80),effect:z.enum(['speed','opacity']),from:z.number().finite(),to:z.number().finite(),unit:z.string().max(20)}).strict().superRefine((r,c)=>{if(r.effect==='opacity'&&[r.from,r.to].some(n=>n<0||n>1))c.addIssue({code:'custom',message:'Opacity range must be 0..1'});if(r.effect==='speed'&&[r.from,r.to].some(n=>n<0||n>10))c.addIssue({code:'custom',message:'Speed range must be 0..10'});});
export const AnimationSchema=z.object({schemaVersion:z.literal('1.0'),storyId:id,shots:z.array(z.object({shotId:id,objects:z.array(z.object({id,label:z.string().min(1).max(200),visual:z.enum(['code','agent','scene','mask','cutout','runner','gauge']).optional(),kind:z.enum(['document','actor','image','state'])}).strict()).min(1).max(30),actions:z.array(z.object({kind:z.enum(['reveal','transfer','transform','compare','emphasize','rule-build','mask-apply']),target:id,source:id.optional(),operand:id.optional(),rule:ruleEffect.optional(),start:z.number().min(0).max(1),end:z.number().min(0).max(1),claimIds:z.array(id).min(1)}).strict()).min(1).max(50)}).strict()).min(1).max(100)}).strict();
/** Authored choreography only. A renderer must explicitly support this version. */
export function compileAnimation(rawStory:unknown,rawAnimation:unknown){
 const story=compileStory(rawStory),animation=AnimationSchema.parse(rawAnimation);
 const input=rawStory as {id:string};
 if(animation.storyId!==input.id)throw new Error('Animation story identity mismatch');
 const ids=animation.shots.map(s=>s.shotId);
 if(new Set(ids).size!==ids.length||ids.length!==story.shots.length||story.shots.some(s=>!ids.includes(s.id)))throw new Error('Animation must cover every story shot exactly once');
 const shots=story.shots.map(shot=>{const binding=animation.shots.find(s=>s.shotId===shot.id)!;const objects=new Set(binding.objects.map(o=>o.id));if(objects.size!==binding.objects.length)throw new Error('Duplicate object identity');
 const actions=binding.actions.map(action=>{if(!objects.has(action.target)||action.source&&!objects.has(action.source)||action.start>=action.end||action.claimIds.some(id=>!shot.claimIds.includes(id)))throw new Error('Invalid animation object, interval or claim binding');if(['transfer','compare'].includes(action.kind)&&(!action.source||action.source===action.target))throw new Error('Transfer/compare requires distinct source and target');if(['rule-build','mask-apply'].includes(action.kind)&&(!action.source||!objects.has(action.source)))throw new Error('Operation needs source');if(action.kind==='mask-apply'&&(action.source===action.target||!action.operand||!objects.has(action.operand)||action.operand===action.source||action.operand===action.target))throw new Error('Mask application needs distinct image/mask/output');if(action.kind==='rule-build'&&!action.rule)throw new Error('Rule build requires explicit effect parameters');const length=shot.endFrame-shot.startFrame;const startFrame=shot.startFrame+Math.floor(action.start*length),endFrame=shot.startFrame+Math.ceil(action.end*length);return {...action,startFrame,endFrame,evidence:action.claimIds.map(id=>{const c=(rawStory as any).evidence.claims.find((c:any)=>c.id===id);return {id:c.id,kind:c.kind,citations:c.citations};})};});return {shotId:shot.id,startFrame:shot.startFrame,endFrame:shot.endFrame,objects:binding.objects,actions};});
 return {schemaVersion:'1.0',compilerVersion:'story-animation-1',scope:'authored-animation-plan-not-rendered-or-quality-approved',fps:story.fps,totalFrames:story.totalFrames,shots};
}
export function sampleAnimation(plan:ReturnType<typeof compileAnimation>,frame:number){
 if(!Number.isInteger(frame)||frame<0||frame>=plan.totalFrames)throw new Error('Frame outside animation');
 const shot=plan.shots.find(s=>frame>=s.startFrame&&frame<s.endFrame)!;
 const states=new Map(shot.objects.map((o,i)=>[o.id,{...o,x:(i+1)/(shot.objects.length+1),y:0.5,opacity:1,scale:1,mix:0,highlight:0}]));
 const actions=shot.actions.map(a=>{const progress=Math.max(0,Math.min(1,(frame-a.startFrame)/(a.endFrame-a.startFrame)));const target=states.get(a.target)!;
  if(a.kind==='reveal')target.opacity=progress;
  if(a.kind==='transfer'){const source=states.get(a.source!)!;target.x=source.x+(0.8-source.x)*progress;target.opacity=progress;}
  if(a.kind==='rule-build'||a.kind==='mask-apply'){target.mix=progress;target.opacity=progress===0?0:1;}
  if(a.kind==='transform'){target.mix=progress;target.opacity=progress===0?0:1;}
  if(a.kind==='compare'){target.opacity=progress;target.x=0.8;}
  if(a.kind==='emphasize'){target.highlight=progress;target.scale=1+0.12*progress;}
  return {...a,progress};});
 return {shotId:shot.shotId,objects:[...states.values()],actions};
}
