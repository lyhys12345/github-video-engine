import {z} from 'zod';
const Id=z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const Shape=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('rect'),x:z.number(),y:z.number(),w:z.number().positive(),h:z.number().positive(),fill:z.string(),radius:z.number().optional()}).strict(),
 z.object({kind:z.literal('path'),d:z.string().min(1),fill:z.string()}).strict(),
 z.object({kind:z.literal('text'),x:z.number(),y:z.number(),text:z.string().min(1).max(70),size:z.number().min(16).max(100),fill:z.string()}).strict(),
]);
const State=z.object({at:z.number().nonnegative(),x:z.number(),y:z.number(),scale:z.number().positive(),opacity:z.number().min(0).max(1)}).strict();
const Driver=z.object({id:Id,entityId:Id,start:z.number().nonnegative(),end:z.number().positive(),axis:z.enum(['x','y']),origin:z.number(),wrapDistance:z.number().positive(),initialRate:z.number().positive(),label:z.string().min(1).max(24),events:z.array(z.object({at:z.number().nonnegative(),rate:z.number().positive(),evidenceId:Id}).strict()).min(1).max(12)}).strict();
export const ExplanationSchema=z.object({
 schemaVersion:z.literal('1.0'),id:Id,projectName:z.string().min(1).max(40),audience:z.string().min(1),purpose:z.string().min(1),input:z.string().min(1),output:z.string().min(1),
 audio:z.literal('silent-visual-proof'),durationSeconds:z.number().min(10).max(30),
 evidence:z.array(z.object({id:Id,url:z.url(),snapshot:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/),supports:z.string().min(1)}).strict()).min(1),
 comprehensionQuestions:z.array(z.string().min(1)).length(3),
 drivers:z.array(Driver).max(12),
 entities:z.array(z.object({id:Id,meaning:z.string().min(1),shapes:z.array(Shape).min(1),states:z.array(State).min(2),reaction:z.object({driverId:Id,axis:z.enum(['x','y']),center:z.number(),range:z.number().positive(),amplitude:z.number()}).strict().optional(),loop:z.object({from:z.number(),to:z.number(),period:z.number().positive(),distance:z.number(),axis:z.enum(['x','y'])}).strict().optional()}).strict()).min(1),
 beats:z.array(z.object({id:Id,start:z.number().nonnegative(),end:z.number().positive(),caption:z.string().min(1).max(75),narrationDraft:z.string().min(1),cause:z.string().min(1),effect:z.string().min(1),visibleEntityIds:z.array(Id).min(1),evidenceIds:z.array(Id).min(1),mode:z.enum(['result','input','handoff','mechanism','output']),causal:z.object({triggerEntityId:Id,affectedEntityId:Id,triggerAt:z.number().nonnegative(),effectAt:z.number().nonnegative(),before:z.string().min(1),after:z.string().min(1),operation:z.enum(['handoff','rule','separate','compare']),recipe:z.enum(['handoff-v1','rule-v1','separation-v1','comparison-v1']),driverId:Id.optional()}).strict()}).strict()).min(3),
 disclosure:z.string().min(1).max(80),
}).strict().superRefine((p,c)=>{
 const ids=new Set(p.entities.map(e=>e.id)),ev=new Set(p.evidence.map(e=>e.id));
 if(ids.size!==p.entities.length||ev.size!==p.evidence.length||new Set(p.beats.map(b=>b.id)).size!==p.beats.length)c.addIssue({code:'custom',message:'Duplicate identity'});
 let end=0;for(const b of p.beats){if(b.start!==end||b.end<=b.start||b.end>p.durationSeconds)c.addIssue({code:'custom',message:'Beats must exactly partition timeline'});end=b.end;
 for(const id of b.visibleEntityIds)if(!ids.has(id))c.addIssue({code:'custom',message:`Unknown entity ${id}`});for(const id of b.evidenceIds)if(!ev.has(id))c.addIssue({code:'custom',message:`Unknown evidence ${id}`});
 const k=b.causal;if(!ids.has(k.triggerEntityId)||!ids.has(k.affectedEntityId)||!b.visibleEntityIds.includes(k.triggerEntityId)||!b.visibleEntityIds.includes(k.affectedEntityId))c.addIssue({code:'custom',message:'Causal entity must exist and be declared visible'});
 if(k.triggerAt<b.start||k.effectAt<k.triggerAt||k.effectAt>=b.end)c.addIssue({code:'custom',message:'Causal trigger/effect order outside beat'});
 if(k.before===k.after)c.addIssue({code:'custom',message:'Causal state must change'});
 if(k.operation==='rule'&&!p.drivers.some(d=>d.id===k.driverId&&d.entityId===k.affectedEntityId&&d.start>=b.start&&d.end<=b.end))c.addIssue({code:'custom',message:'Rule beat must bind a rendered driver affecting its entity'});
 const effect=p.entities.find(e=>e.id===k.affectedEntityId);if(effect&&sampleEntity(effect,k.effectAt).opacity<.5)c.addIssue({code:'custom',message:'Effect not observable at effect time'});
 }
 if(end!==p.durationSeconds)c.addIssue({code:'custom',message:'Incomplete timeline'});
 if(new Set(p.drivers.map(d=>d.id)).size!==p.drivers.length)c.addIssue({code:'custom',message:'Duplicate driver identity'});
 for(const d of p.drivers){if(!ids.has(d.entityId)||d.start>=d.end||d.end>p.durationSeconds)c.addIssue({code:'custom',message:'Invalid driver target/window'});let at=d.start;for(const e of d.events){if(e.at<=at||e.at>=d.end||!ev.has(e.evidenceId))c.addIssue({code:'custom',message:'Invalid rule event time/evidence'});at=e.at;}}
 for(const e of p.entities){if(e.reaction&&!p.drivers.some(d=>d.id===e.reaction!.driverId))c.addIssue({code:'custom',message:'Unknown reaction driver'});let at=-1;if(e.states[0]?.at!==0||e.states.at(-1)?.at!==p.durationSeconds)c.addIssue({code:'custom',message:'States must cover full timeline'});for(const s of e.states){if(s.at<=at||s.at>p.durationSeconds)c.addIssue({code:'custom',message:'Unordered/out-of-range keyframes'});at=s.at;}if(e.loop&&(e.loop.from<0||e.loop.to>p.durationSeconds||e.loop.from>=e.loop.to))c.addIssue({code:'custom',message:'Invalid loop interval'});}
});
export type ExplanationPlan=z.infer<typeof ExplanationSchema>;
export function sampleEntity(e:ExplanationPlan['entities'][number],t:number,drivers:ExplanationPlan['drivers']=[]){
 const a=e.states.findLast(s=>s.at<=t)??e.states[0]!,b=e.states.find(s=>s.at>t)??a;
 const u=a===b?0:Math.min(1,Math.max(0,(t-a.at)/(b.at-a.at))),q=u*u*(3-2*u);
 const value={x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,scale:a.scale+(b.scale-a.scale)*q,opacity:a.opacity+(b.opacity-a.opacity)*q};
 if(e.loop&&t>=e.loop.from&&t<e.loop.to)value[e.loop.axis]+=((t-e.loop.from)%e.loop.period)/e.loop.period*e.loop.distance;
 for(const d of drivers)if(d.entityId===e.id&&t>=d.start&&t<d.end){const r=sampleDriver(d,t);value[d.axis]=d.origin-(r.distance%d.wrapDistance);}
 if(e.reaction){const reaction=e.reaction,d=drivers.find(d=>d.id===reaction.driverId);if(d&&t>=d.start&&t<d.end){const position=d.origin-sampleDriver(d,t).distance%d.wrapDistance;value[reaction.axis]+=Math.max(0,1-Math.abs(position-reaction.center)/reaction.range)*reaction.amplitude;}}
 return value;
}
export function sampleDriver(d:z.infer<typeof Driver>,t:number){let at=d.start,rate=d.initialRate,distance=0,lastEvent:number|null=null;for(const e of d.events){if(e.at>t)break;distance+=(e.at-at)*rate;at=e.at;rate=e.rate;lastEvent=e.at;}distance+=Math.max(0,t-at)*rate;return{rate,distance,lastEvent,multiplier:rate/d.initialRate};}
