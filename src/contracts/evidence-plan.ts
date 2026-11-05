import {z} from 'zod';
const Id=z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),text=z.string().trim().min(1).max(240);
const citation=z.object({document:Id,startLine:z.number().int().positive(),endLine:z.number().int().positive(),quote:z.string().min(1).max(3000)}).strict();
const objectKind=z.enum(['code','game','image','mask','cutout','demo']);
const operationKind=z.enum(['handoff','rate-change','control','segment','extract','composite']);
const graphObject=z.object({id:Id,label:text,kind:objectKind}).strict();
const graphOperation=z.object({id:Id,kind:operationKind,input:Id,output:Id,dependsOn:z.array(Id),claimIds:z.array(Id).min(1),actorIds:z.array(Id).min(1),
 parameters:z.object({initialRate:z.number().positive().max(500).optional(),rateMultiplier:z.number().min(1).max(5).optional()}).strict()}).strict();
const legacyGraph=z.object({
 schemaVersion:z.literal('1.0'),id:Id,name:text,audience:text,
 interpretation:z.literal('agent-curated-semantic-graph-not-automatic-source-understanding'),
 sources:z.array(z.object({id:Id,path:text,url:z.url(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).min(1),
 claims:z.array(z.object({id:Id,statement:text,kind:z.enum(['documented','inference']),citations:z.array(citation).min(1),rationale:text}).strict()).min(1),
 objects:z.array(graphObject).min(1),
 actors:z.array(z.object({id:Id,label:text,role:z.enum(['source','tool','interpreter','user'])}).strict()).min(1),
 operations:z.array(graphOperation).min(1).max(5),
 disclosure:text,
}).strict();
const storyGraph=legacyGraph.extend({
 objects:z.array(graphObject.extend({kind:z.enum([...objectKind.options,'http-request','route-handler','http-response'])})).min(1),
 operations:z.array(graphOperation.extend({kind:z.enum([...operationKind.options,'match-route','send-response'])})).min(1).max(5),
});
const documentStoryGraph=storyGraph.extend({
 schemaVersion:z.literal('1.1'),
 operations:z.array(graphOperation.extend({kind:z.enum([...operationKind.options,'match-route','send-response','document-transform'])})).min(1).max(5),
});
const independentDocumentGraph=documentStoryGraph.extend({
 schemaVersion:z.literal('1.2'),flowRelation:z.literal('independent-source-examples'),
 operations:z.array(graphOperation.extend({kind:z.literal('document-transform')})).min(2).max(12),
 flows:z.array(z.strictObject({id:Id,label:text.max(40),operationIds:z.array(Id).min(1).max(4),claimIds:z.array(Id).min(1)})).min(2).max(4),
});
const inputLink=z.strictObject({objectId:Id,claimIds:z.array(Id).min(1).max(20)});
const joinBase={id:Id,kind:z.literal('combine-inputs'),level:z.literal('source-process-summary'),dependsOn:z.tuple([]),inputs:z.tuple([inputLink,inputLink]),output:Id,actorIds:z.tuple([Id]),claimIds:z.array(Id).min(1).max(20),outputClaimIds:z.array(Id).min(1).max(20)};
const joinOperation=z.discriminatedUnion('mode',[
 z.strictObject({...joinBase,mode:z.literal('masked-image'),fixedContext:z.literal('transparent-rgba-base'),contextClaimIds:z.array(Id).min(1).max(20)}),
 z.strictObject({...joinBase,mode:z.literal('ordered-pages'),fixedContext:z.literal('new-document'),outputOrder:z.tuple([Id,Id]),orderClaimIds:z.array(Id).min(1).max(20)})
]);
export const MultiInputStoryEvidenceSchema=legacyGraph.extend({schemaVersion:z.literal('1.3'),objects:z.array(graphObject.extend({kind:z.enum(['image','mask','cutout','pdf-page','pdf-document'])})).length(3),actors:legacyGraph.shape.actors.length(1),operations:z.array(joinOperation).length(1)}).superRefine((g,c)=>{
 const fail=(message:string)=>c.addIssue({code:'custom',message}),op=g.operations[0]!,objects=new Map(g.objects.map(o=>[o.id,o])),claims=new Set(g.claims.map(c=>c.id)),sources=new Set(g.sources.map(s=>s.id)),inputs=op.inputs.map(i=>i.objectId),links=[...op.inputs.flatMap(i=>i.claimIds),...op.outputClaimIds,...(op.mode==='masked-image'?op.contextClaimIds:op.orderClaimIds)];
 for(const list of [g.sources,g.claims,g.objects,g.actors])if(new Set(list.map(x=>x.id)).size!==list.length)fail('Duplicate multi-input identity');
 for(const claim of g.claims)for(const q of claim.citations)if(!sources.has(q.document)||q.endLine<q.startLine)fail('Invalid multi-input citation');
 if(new Set(inputs).size!==2||inputs.includes(op.output)||!objects.has(op.output)||inputs.some(id=>!objects.has(id)))fail('Exactly two distinct known inputs and a separate output are required');
 if(g.actors[0]?.id!==op.actorIds[0]||g.actors[0]?.role!=='tool')fail('Multi-input operation requires its one known tool');
 if(new Set(op.claimIds).size!==op.claimIds.length||op.claimIds.some(id=>!claims.has(id))||links.some(id=>!op.claimIds.includes(id))||op.claimIds.some(id=>!links.includes(id)))fail('Every input/output/context/order connection must be source-claim bound; union must equal operation claims');
 for(const ids of [...op.inputs.map(i=>i.claimIds),op.outputClaimIds,op.mode==='masked-image'?op.contextClaimIds:op.orderClaimIds])if(new Set(ids).size!==ids.length)fail('Duplicate connection claim');
 if(op.mode==='masked-image'&&(objects.get(inputs[0]!)?.kind!=='image'||objects.get(inputs[1]!)?.kind!=='mask'||objects.get(op.output)?.kind!=='cutout'))fail('Masked-image mode requires ordered image and mask inputs with separate cutout');
 if(op.mode==='ordered-pages'&&(inputs.some(id=>objects.get(id)?.kind!=='pdf-page')||objects.get(op.output)?.kind!=='pdf-document'||new Set(op.outputOrder).size!==2||op.outputOrder.some(id=>!inputs.includes(id))))fail('Ordered-pages mode requires two source pages and exact distinct input-page order in a new document');
});
function validateGraph(g:z.infer<typeof storyGraph>|z.infer<typeof documentStoryGraph>|z.infer<typeof independentDocumentGraph>,c:z.RefinementCtx){
 const fail=(message:string)=>c.addIssue({code:'custom',message});
 for(const list of [g.sources,g.claims,g.objects,g.actors,g.operations])if(new Set(list.map(x=>x.id)).size!==list.length)fail('Duplicate identity');
 const sources=new Set(g.sources.map(x=>x.id)),claims=new Set(g.claims.map(x=>x.id)),objects=new Map(g.objects.map(x=>[x.id,x])),actors=new Set(g.actors.map(x=>x.id)),ops=new Map(g.operations.map(x=>[x.id,x]));
 for(const claim of g.claims)for(const q of claim.citations)if(!sources.has(q.document)||q.endLine<q.startLine)fail('Invalid citation');
 const expected={handoff:['code','code'],'rate-change':['code','game'],control:['game','demo'],segment:['image','mask'],extract:['mask','cutout'],composite:['cutout','image'],'match-route':['http-request','route-handler'],'send-response':['route-handler','http-response'],'document-transform':['code','code']} as const;
 for(const op of g.operations){const types=expected[op.kind];if(objects.get(op.input)?.kind!==types[0]||objects.get(op.output)?.kind!==types[1])fail('Operation input/output type mismatch');
 if(op.actorIds.some(id=>!actors.has(id))||op.claimIds.some(id=>!claims.has(id))||op.dependsOn.some(id=>!ops.has(id)||id===op.id))fail('Unknown operation reference');
 if(op.kind==='handoff'&&op.actorIds.length!==3)fail('Handoff requires source/tool/interpreter');
 if(op.kind==='handoff'&&op.actorIds.some((id,i)=>g.actors.find(a=>a.id===id)?.role!==['source','tool','interpreter'][i]))fail('Handoff role order mismatch');
 const roles=op.actorIds.map(id=>g.actors.find(a=>a.id===id)?.role);
 if(op.kind==='rate-change'&&(roles.length!==1||roles[0]!=='interpreter'))fail('Rule interpretation needs one interpreter');
 if(op.kind==='control'&&(roles.length!==2||roles[0]!=='interpreter'||roles[1]!=='user'))fail('Reconstruction needs interpreter then user');
 if(['segment','extract','composite'].includes(op.kind)&&(roles.length!==1||roles[0]!=='tool'))fail('Image transform needs one tool');
 if((op.kind==='match-route'||op.kind==='send-response')&&(roles.length!==1||roles[0]!=='tool'))fail('HTTP operation needs one tool');
 if(op.kind==='document-transform'&&(roles.length!==1||roles[0]!=='tool'))fail('Document transform needs exactly one tool; it represents an authored source-backed diagram, not executed code');
 if(op.kind==='rate-change'&&(!op.parameters.initialRate||!op.parameters.rateMultiplier))fail('Rule needs illustrative rate parameters');
 if(op.kind!=='rate-change'&&Object.keys(op.parameters).length)fail('Unsupported parameters for operation');
 if(op.dependsOn.length>1||op.dependsOn.some(id=>ops.get(id)?.output!==op.input))fail('Dependency does not supply unique semantic input');
 }
 const chain=(operations:typeof g.operations)=>operations.filter(x=>!x.dependsOn.length).length===1&&operations.filter(x=>!operations.some(y=>y.dependsOn.includes(x.id))).length===1&&!operations.some(x=>operations.filter(y=>y.dependsOn.includes(x.id)).length>1);
 if(g.schemaVersion==='1.2'){
  if(new Set(g.flows.map(f=>f.id)).size!==g.flows.length)fail('Duplicate independent flow identity');
  const covered=new Set<string>(),ownedObjects=new Set<string>();
  for(const flow of g.flows){const selected=flow.operationIds.map(id=>ops.get(id)),ids=new Set(flow.operationIds);if(ids.size!==flow.operationIds.length||selected.some(op=>!op)||flow.operationIds.some(id=>covered.has(id))){fail('Each operation must belong to exactly one known independent flow');continue;}
   const operations=selected as typeof g.operations,localObjects=new Set(operations.flatMap(op=>[op.input,op.output])),usedClaims=new Set(operations.flatMap(op=>op.claimIds));
   if(!chain(operations)||operations.some((op,i)=>op.dependsOn.some(id=>!ids.has(id)||!flow.operationIds.slice(0,i).includes(id))))fail('Each independent flow is an ordered connected chain; cross-flow dependencies are forbidden');
   if([...localObjects].some(id=>ownedObjects.has(id)))fail('Independent flows cannot share semantic objects or imply a round trip');
   if(new Set(flow.claimIds).size!==flow.claimIds.length||flow.claimIds.length!==usedClaims.size||flow.claimIds.some(id=>!usedClaims.has(id)))fail('Flow claims must exactly cover its source-bound operations');
   for(const id of ids)covered.add(id);for(const id of localObjects)ownedObjects.add(id);
  }
  if(covered.size!==g.operations.length)fail('Independent flows must cover every operation');
  if(g.objects.some(o=>o.label.length>24))fail('Independent-flow node labels must be at most24 characters for bounded readable lanes');
 }else if(!chain(g.operations))fail('Only connected single-input single-output chains supported');
 const done=new Set<string>();let pending=[...g.operations];while(pending.length){const ready=pending.filter(x=>x.dependsOn.every(id=>done.has(id)));if(!ready.length){fail('Cyclic semantic graph');break;}for(const x of ready)done.add(x.id);pending=pending.filter(x=>!done.has(x.id));}
}
export const EvidenceGraphSchema=legacyGraph.superRefine(validateGraph);
export const LegacyStoryEvidenceGraphSchema=storyGraph.superRefine(validateGraph);
export const StoryEvidenceGraphSchema=z.discriminatedUnion('schemaVersion',[LegacyStoryEvidenceGraphSchema,documentStoryGraph.superRefine(validateGraph),independentDocumentGraph.superRefine(validateGraph),MultiInputStoryEvidenceSchema]);
export type EvidenceGraph=z.infer<typeof EvidenceGraphSchema>;
export const CompiledPlanSchema=z.object({schemaVersion:z.literal('1.0'),compilerVersion:z.literal('evidence-planner-1'),graphHash:z.string().length(64),graph:EvidenceGraphSchema,
 goals:z.array(z.object({question:text,answer:text,claimIds:z.array(Id).min(1)}).strict()).length(3),
 durationSeconds:z.literal(18),scenes:z.array(z.object({operationId:Id,start:z.number().nonnegative(),end:z.number().positive(),shortLabel:text,claimIds:z.array(Id).min(1)}).strict()).min(1),
}).strict().superRefine((p,c)=>{const fail=(message:string)=>c.addIssue({code:'custom',message});let end=0;const seen=new Set<string>();for(const s of p.scenes){const op=p.graph.operations.find(x=>x.id===s.operationId);if(!op||seen.has(s.operationId)||s.start!==end||s.end<=s.start||s.end>18||op.dependsOn.some(id=>!seen.has(id))||JSON.stringify(s.claimIds)!==JSON.stringify(op.claimIds))fail('Invalid compiled scene lineage/coverage');seen.add(s.operationId);end=s.end;}if(end!==18||seen.size!==p.graph.operations.length)fail('Incomplete compiled coverage');});
export type CompiledPlan=z.infer<typeof CompiledPlanSchema>;
