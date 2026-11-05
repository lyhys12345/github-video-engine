import {z} from 'zod';
import {AnimationSchema,LegacyAnimationSchema,IndependentAnimationSchema,compileAnimation} from '../story-planner/animation.js';
import {CausalAnimationSchema} from '../story-planner/causal-operation.js';
import {Id} from '../contracts/video.js';
import {canonical} from '../core/util.js';
const SceneAnimation=z.discriminatedUnion('profile',[
 z.strictObject({sceneId:Id,profile:z.literal('legacy-animation/1.0'),animation:LegacyAnimationSchema}),
 z.strictObject({sceneId:Id,profile:z.literal('independent-flow/1.0'),animation:IndependentAnimationSchema}),
 z.strictObject({sceneId:Id,profile:z.literal('causal-operation/1.0'),animation:CausalAnimationSchema}),
]);
export const NarrativeSceneAnimations=z.strictObject({schemaVersion:z.literal('narrative-scene-animations/1.0'),storyId:Id,scenes:z.array(SceneAnimation).min(2).max(40)});
export const NarrativeRunAnimation=z.union([AnimationSchema,NarrativeSceneAnimations]);
/** Normalize only trusted versioned data; each scene still compiles against its exact source Story. */
export function prepareNarrativeSceneAnimations(story:any,plan:any,raw:unknown){
 const parsed=NarrativeRunAnimation.parse(raw),supported=plan.scenes.filter((s:any)=>s.execution?.kind==='supported-story'),out=new Map<string,{profile:string;animation:z.infer<typeof AnimationSchema>}>();
 if(parsed.storyId!==story.id)throw Error('Scene animation Story identity differs');
 if(parsed.schemaVersion==='narrative-scene-animations/1.0'){
  if(canonical(parsed.scenes.map(s=>s.sceneId))!==canonical(supported.map((s:any)=>s.id)))throw Error('Scene animation profiles must cover every supported scene exactly once in narrative order; gaps have no animation');
  for(const scene of supported){const entry=parsed.scenes.find(s=>s.sceneId===scene.id)!;if(entry.animation.storyId!==story.id||canonical(entry.animation.shots.map(s=>s.shotId))!==canonical(scene.execution.shotIds))throw Error('Scene animation must bind its exact ordered source shots, without cross-scene shots');const derived={...story,shots:scene.execution.shotIds.map((id:string)=>story.shots.find((s:any)=>s.id===id))};compileAnimation(derived,entry.animation);if(entry.profile==='causal-operation/1.0'&&scene.visualContext)throw Error('Native causal scene must not carry a separate context overlay');out.set(scene.id,{profile:entry.profile,animation:entry.animation});}
 }else{
  compileAnimation(story,parsed);
  for(const scene of supported){const animation={...parsed,shots:parsed.shots.filter(s=>scene.execution.shotIds.includes(s.shotId))} as z.infer<typeof AnimationSchema>;out.set(scene.id,{profile:parsed.schemaVersion==='1.2'?'causal-operation/1.0':parsed.schemaVersion==='1.1'?'independent-flow/1.0':'legacy-animation/1.0',animation});}
 }
 return out;
}
