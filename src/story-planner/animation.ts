import {z} from 'zod';
import {compileStory} from './compile.js';
import {StorySchema} from '../contracts/story.js';
const id=z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
export type IndependentFlowLane={id:string;label:string;operationIds:string[];objectIds:string[]};
const ruleEffect=z.object({inputLabel:z.string().min(1).max(80),outputLabel:z.string().min(1).max(80),effect:z.enum(['speed','opacity']),from:z.number().finite(),to:z.number().finite(),unit:z.string().max(20)}).strict().superRefine((r,c)=>{if(r.effect==='opacity'&&[r.from,r.to].some(n=>n<0||n>1))c.addIssue({code:'custom',message:'Opacity range must be 0..1'});if(r.effect==='speed'&&[r.from,r.to].some(n=>n<0||n>10))c.addIssue({code:'custom',message:'Speed range must be 0..10'});});
export const LegacyAnimationSchema=z.object({schemaVersion:z.literal('1.0'),storyId:id,shots:z.array(z.object({shotId:id,objects:z.array(z.object({id,label:z.string().min(1).max(200),visual:z.enum(['code','agent','scene','mask','cutout','runner','gauge','request','route','response']).optional(),kind:z.enum(['document','actor','image','state'])}).strict()).min(1).max(30),actions:z.array(z.object({kind:z.enum(['reveal','transfer','transform','compare','emphasize','rule-build','mask-apply']),target:id,source:id.optional(),operand:id.optional(),rule:ruleEffect.optional(),destinationX:z.number().min(0).max(1).optional(),start:z.number().min(0).max(1),end:z.number().min(0).max(1),claimIds:z.array(id).min(1)}).strict()).min(1).max(50)}).strict()).min(1).max(100)}).strict();
export const IndependentAnimationSchema=z.strictObject({schemaVersion:z.literal('1.1'),storyId:id,shots:z.array(z.strictObject({shotId:id,flows:z.array(z.strictObject({flowId:id,steps:z.array(z.strictObject({operationId:id,start:z.number().min(0).max(1),end:z.number().min(0).max(1)})).min(1).max(4)})).min(1).max(4)})).min(1).max(100)});
export const AnimationSchema=z.discriminatedUnion('schemaVersion',[LegacyAnimationSchema,IndependentAnimationSchema]);
function compileIndependentAnimation(rawStory:unknown,animation:z.infer<typeof IndependentAnimationSchema>){
 const raw=StorySchema.parse(rawStory),timeline=compileStory(raw),graph=raw.evidence;
 if(graph.schemaVersion!=='1.2'||animation.storyId!==raw.id)throw new Error('Independent animation requires the exact independent evidence1.2 Story');
 if(new Set(animation.shots.map(s=>s.shotId)).size!==animation.shots.length||animation.shots.length!==raw.shots.length||raw.shots.some(s=>!animation.shots.some(a=>a.shotId===s.id)))throw new Error('Independent animation must cover every Story shot exactly once');
 const shots=timeline.shots.map(shot=>{
  const authored=animation.shots.find(s=>s.shotId===shot.id)!;
  if(new Set(authored.flows.map(f=>f.flowId)).size!==authored.flows.length)throw new Error('Duplicate selected independent flow');
  const objects:z.infer<typeof LegacyAnimationSchema>['shots'][number]['objects']=[];
  const independentFlows:IndependentFlowLane[]=[];
  const actions=authored.flows.flatMap(selection=>{
   const flow=graph.flows.find(f=>f.id===selection.flowId);
   if(!flow||selection.steps.length!==flow.operationIds.length||selection.steps.some((s,i)=>s.operationId!==flow.operationIds[i])||flow.claimIds.some(id=>!shot.claimIds.includes(id)))throw new Error('Selected flow must retain every ordered operation and all source claims in its Story shot');
   let end=0;const objectIds:string[]=[];
   const compiled=selection.steps.map(step=>{
    const op=graph.operations.find(op=>op.id===step.operationId)!;
    const startFrame=shot.startFrame+Math.floor(step.start*(shot.endFrame-shot.startFrame)),endFrame=shot.startFrame+Math.ceil(step.end*(shot.endFrame-shot.startFrame));
    if(step.start>=step.end||startFrame<end||endFrame<=startFrame)throw new Error('Independent flow steps must be positive, ordered and nonoverlapping');end=endFrame;
    for(const id of [op.input,op.output])if(!objectIds.includes(id)){objectIds.push(id);const object=graph.objects.find(o=>o.id===id)!;objects.push({id,label:object.label,kind:'document',visual:'code'});}
    const action:z.infer<typeof LegacyAnimationSchema>['shots'][number]['actions'][number]={kind:'transform',source:op.input,target:op.output,start:step.start,end:step.end,claimIds:op.claimIds};
    return{...action,flowId:flow.id,operationId:op.id,startFrame,endFrame,evidence:op.claimIds.map(id=>{const c=graph.claims.find(c=>c.id===id)!;return{id:c.id,kind:c.kind,citations:c.citations};})};
   });
   independentFlows.push({id:flow.id,label:flow.label,operationIds:flow.operationIds,objectIds});return compiled;
  });
  return{shotId:shot.id,startFrame:shot.startFrame,endFrame:shot.endFrame,objects,actions,independentFlows};
 });
 return{schemaVersion:'1.1',compilerVersion:'story-independent-document-animation-1',scope:'independent-source-examples-not-executed-or-roundtrip-verified',fps:timeline.fps,totalFrames:timeline.totalFrames,shots};
}
/** Authored choreography only. A renderer must explicitly support this version. */
export function compileAnimation(rawStory:unknown,rawAnimation:unknown){
 const story=compileStory(rawStory),animation=AnimationSchema.parse(rawAnimation);
 const input=rawStory as {id:string;evidence:any};
 if(animation.schemaVersion==='1.1')return compileIndependentAnimation(rawStory,animation);
 if(input.evidence.schemaVersion==='1.2')throw new Error('Independent evidence requires versioned independent-flow animation1.1');
 if(animation.storyId!==input.id)throw new Error('Animation story identity mismatch');
 const ids=animation.shots.map(s=>s.shotId);
 if(new Set(ids).size!==ids.length||ids.length!==story.shots.length||story.shots.some(s=>!ids.includes(s.id)))throw new Error('Animation must cover every story shot exactly once');
 const shots=story.shots.map(shot=>{const binding=animation.shots.find(s=>s.shotId===shot.id)!;const objects=new Set(binding.objects.map(o=>o.id));if(objects.size!==binding.objects.length)throw new Error('Duplicate object identity');
 const actions=binding.actions.map(action=>{if(!objects.has(action.target)||action.source&&!objects.has(action.source)||action.start>=action.end||action.claimIds.some(id=>!shot.claimIds.includes(id)))throw new Error('Invalid animation object, interval or claim binding');if(action.destinationX!==undefined&&action.kind!=='transfer')throw new Error('Only a transfer can set its destination');if(['transfer','compare'].includes(action.kind)&&(!action.source||action.source===action.target))throw new Error('Transfer/compare requires distinct source and target');if(['rule-build','mask-apply'].includes(action.kind)&&(!action.source||!objects.has(action.source)))throw new Error('Operation needs source');if(action.kind==='mask-apply'&&(action.source===action.target||!action.operand||!objects.has(action.operand)||action.operand===action.source||action.operand===action.target))throw new Error('Mask application needs distinct image/mask/output');if(action.kind==='rule-build'&&!action.rule)throw new Error('Rule build requires explicit effect parameters');const length=shot.endFrame-shot.startFrame;const startFrame=shot.startFrame+Math.floor(action.start*length),endFrame=shot.startFrame+Math.ceil(action.end*length);return {...action,startFrame,endFrame,evidence:action.claimIds.map(id=>{const c=(rawStory as any).evidence.claims.find((c:any)=>c.id===id);return {id:c.id,kind:c.kind,citations:c.citations};})};});return {shotId:shot.id,startFrame:shot.startFrame,endFrame:shot.endFrame,objects:binding.objects,actions};});
 return {schemaVersion:'1.0',compilerVersion:'story-animation-1',scope:'authored-animation-plan-not-rendered-or-quality-approved',fps:story.fps,totalFrames:story.totalFrames,shots};
}
export function sampleAnimation(plan:ReturnType<typeof compileAnimation>,frame:number){
 if(!Number.isInteger(frame)||frame<0||frame>=plan.totalFrames)throw new Error('Frame outside animation');
 const shot=plan.shots.find(s=>frame>=s.startFrame&&frame<s.endFrame)!;
 const states=new Map(shot.objects.map((o,i)=>[o.id,{...o,x:(i+1)/(shot.objects.length+1),y:0.5,opacity:1,scale:1,mix:0,highlight:0}]));
 const actions=shot.actions.map(a=>{const progress=Math.max(0,Math.min(1,(frame-a.startFrame)/(a.endFrame-a.startFrame)));const target=states.get(a.target)!;
  if(a.kind==='reveal')target.opacity=progress;
  if(a.kind==='transfer'){const source=states.get(a.source!)!;target.x=source.x+((a.destinationX??0.8)-source.x)*progress;target.opacity=progress;}
  if(a.kind==='rule-build'||a.kind==='mask-apply'){target.mix=progress;target.opacity=progress===0?0:1;}
  if(a.kind==='transform'){target.mix=progress;target.opacity=progress===0?0:1;}
  if(a.kind==='compare'){target.opacity=progress;target.x=0.8;}
  if(a.kind==='emphasize'){target.highlight=progress;target.scale=1+0.12*progress;}
  return {...a,progress};});
 const independentFlows='independentFlows'in shot?(shot as {independentFlows:IndependentFlowLane[]}).independentFlows:undefined;
 return {shotId:shot.shotId,objects:[...states.values()],actions,...(independentFlows?{independentFlows}:{})};
}
