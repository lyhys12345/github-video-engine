import {z} from 'zod';
const Id=z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),text=z.string().trim().min(1).max(240);
const citation=z.object({document:Id,startLine:z.number().int().positive(),endLine:z.number().int().positive(),quote:z.string().min(1).max(3000)}).strict();
export const EvidenceGraphSchema=z.object({
 schemaVersion:z.literal('1.0'),id:Id,name:text,audience:text,
 interpretation:z.literal('agent-curated-semantic-graph-not-automatic-source-understanding'),
 sources:z.array(z.object({id:Id,path:text,url:z.url(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).min(1),
 claims:z.array(z.object({id:Id,statement:text,kind:z.enum(['documented','inference']),citations:z.array(citation).min(1),rationale:text}).strict()).min(1),
 objects:z.array(z.object({id:Id,label:text,kind:z.enum(['code','game','image','mask','cutout','demo'])}).strict()).min(1),
 actors:z.array(z.object({id:Id,label:text,role:z.enum(['source','tool','interpreter','user'])}).strict()).min(1),
 operations:z.array(z.object({id:Id,kind:z.enum(['handoff','rate-change','control','segment','extract','composite']),input:Id,output:Id,dependsOn:z.array(Id),claimIds:z.array(Id).min(1),actorIds:z.array(Id).min(1),
 parameters:z.object({initialRate:z.number().positive().max(500).optional(),rateMultiplier:z.number().min(1).max(5).optional()}).strict()}).strict()).min(1).max(5),
 disclosure:text,
}).strict().superRefine((g,c)=>{
 const fail=(message:string)=>c.addIssue({code:'custom',message});
 for(const list of [g.sources,g.claims,g.objects,g.actors,g.operations])if(new Set(list.map(x=>x.id)).size!==list.length)fail('Duplicate identity');
 const sources=new Set(g.sources.map(x=>x.id)),claims=new Set(g.claims.map(x=>x.id)),objects=new Map(g.objects.map(x=>[x.id,x])),actors=new Set(g.actors.map(x=>x.id)),ops=new Map(g.operations.map(x=>[x.id,x]));
 for(const claim of g.claims)for(const q of claim.citations)if(!sources.has(q.document)||q.endLine<q.startLine)fail('Invalid citation');
 const expected={handoff:['code','code'],'rate-change':['code','game'],control:['game','demo'],segment:['image','mask'],extract:['mask','cutout'],composite:['cutout','image']} as const;
 for(const op of g.operations){const types=expected[op.kind];if(objects.get(op.input)?.kind!==types[0]||objects.get(op.output)?.kind!==types[1])fail('Operation input/output type mismatch');
 if(op.actorIds.some(id=>!actors.has(id))||op.claimIds.some(id=>!claims.has(id))||op.dependsOn.some(id=>!ops.has(id)||id===op.id))fail('Unknown operation reference');
 if(op.kind==='handoff'&&op.actorIds.length!==3)fail('Handoff requires source/tool/interpreter');
 if(op.kind==='handoff'&&op.actorIds.some((id,i)=>g.actors.find(a=>a.id===id)?.role!==['source','tool','interpreter'][i]))fail('Handoff role order mismatch');
 const roles=op.actorIds.map(id=>g.actors.find(a=>a.id===id)?.role);
 if(op.kind==='rate-change'&&(roles.length!==1||roles[0]!=='interpreter'))fail('Rule interpretation needs one interpreter');
 if(op.kind==='control'&&(roles.length!==2||roles[0]!=='interpreter'||roles[1]!=='user'))fail('Reconstruction needs interpreter then user');
 if(['segment','extract','composite'].includes(op.kind)&&(roles.length!==1||roles[0]!=='tool'))fail('Image transform needs one tool');
 if(op.kind==='rate-change'&&(!op.parameters.initialRate||!op.parameters.rateMultiplier))fail('Rule needs illustrative rate parameters');
 if(op.kind!=='rate-change'&&Object.keys(op.parameters).length)fail('Unsupported parameters for operation');
 if(op.dependsOn.length>1||op.dependsOn.some(id=>ops.get(id)?.output!==op.input))fail('Dependency does not supply unique semantic input');
 }
 if(g.operations.filter(x=>!x.dependsOn.length).length!==1||g.operations.filter(x=>!g.operations.some(y=>y.dependsOn.includes(x.id))).length!==1||g.operations.some(x=>g.operations.filter(y=>y.dependsOn.includes(x.id)).length>1))fail('Only connected single-input single-output chains supported');
 const done=new Set<string>();let pending=[...g.operations];while(pending.length){const ready=pending.filter(x=>x.dependsOn.every(id=>done.has(id)));if(!ready.length){fail('Cyclic semantic graph');break;}for(const x of ready)done.add(x.id);pending=pending.filter(x=>!done.has(x.id));}
});
export type EvidenceGraph=z.infer<typeof EvidenceGraphSchema>;
export const CompiledPlanSchema=z.object({schemaVersion:z.literal('1.0'),compilerVersion:z.literal('evidence-planner-1'),graphHash:z.string().length(64),graph:EvidenceGraphSchema,
 goals:z.array(z.object({question:text,answer:text,claimIds:z.array(Id).min(1)}).strict()).length(3),
 durationSeconds:z.literal(18),scenes:z.array(z.object({operationId:Id,start:z.number().nonnegative(),end:z.number().positive(),shortLabel:text,claimIds:z.array(Id).min(1)}).strict()).min(1),
}).strict().superRefine((p,c)=>{const fail=(message:string)=>c.addIssue({code:'custom',message});let end=0;const seen=new Set<string>();for(const s of p.scenes){const op=p.graph.operations.find(x=>x.id===s.operationId);if(!op||seen.has(s.operationId)||s.start!==end||s.end<=s.start||s.end>18||op.dependsOn.some(id=>!seen.has(id))||JSON.stringify(s.claimIds)!==JSON.stringify(op.claimIds))fail('Invalid compiled scene lineage/coverage');seen.add(s.operationId);end=s.end;}if(end!==18||seen.size!==p.graph.operations.length)fail('Incomplete compiled coverage');});
export type CompiledPlan=z.infer<typeof CompiledPlanSchema>;
