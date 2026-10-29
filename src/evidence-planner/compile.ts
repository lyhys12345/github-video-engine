import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {EvidenceGraphSchema,CompiledPlanSchema,type EvidenceGraph,type CompiledPlan} from '../contracts/evidence-plan.js';
import {canonical,sha256} from '../core/util.js';
export async function verifyEvidence(raw:unknown,root:string){
 const g=EvidenceGraphSchema.parse(raw),sourceBytes=new Map<string,string>(),realRoot=await realpath(root);
 for(const s of g.sources){const path=await realpath(resolve(root,s.path)),rel=relative(realRoot,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith('..\\')||rel.startsWith('../'))throw Error('Source path outside workspace');const bytes=await readFile(path);if(sha256(bytes)!==s.sha256)throw Error(`Source integrity ${s.id}`);sourceBytes.set(s.id,new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 for(const claim of g.claims)for(const q of claim.citations){const lines=sourceBytes.get(q.document)!.split(/\r?\n/);if(q.endLine>lines.length||lines.slice(q.startLine-1,q.endLine).join('\n')!==q.quote)throw Error(`Exact citation mismatch ${claim.id}`);}
 return g;
}
export function compileGraph(raw:unknown):CompiledPlan{
 const graph=EvidenceGraphSchema.parse(raw),ordered:EvidenceGraph['operations']=[],done=new Set<string>();
 while(ordered.length<graph.operations.length){const next=graph.operations.filter(x=>!done.has(x.id)&&x.dependsOn.every(id=>done.has(id))).sort((a,b)=>a.id.localeCompare(b.id))[0]!;ordered.push(next);done.add(next.id);}
 const names={handoff:'代码交接','rate-change':'规则改变运动',control:'重建可控演示',segment:'预测前景蒙版',extract:'按蒙版保留主体',composite:'透明结果可再利用'};
 const first=ordered[0]!,last=ordered.at(-1)!,object=(id:string)=>graph.objects.find(x=>x.id===id)!.label;
 return CompiledPlanSchema.parse({schemaVersion:'1.0',compilerVersion:'evidence-planner-1',graphHash:sha256(canonical(graph)),graph,durationSeconds:18,
 goals:[{question:'输入是什么？',answer:object(first.input),claimIds:first.claimIds},{question:'中间怎样改变？',answer:ordered.map(x=>names[x.kind]).join(' → '),claimIds:[...new Set(ordered.flatMap(x=>x.claimIds))]},{question:'输出是什么？',answer:object(last.output),claimIds:last.claimIds}],
 scenes:ordered.map((op,i)=>({operationId:op.id,start:18*i/ordered.length,end:18*(i+1)/ordered.length,shortLabel:names[op.kind],claimIds:op.claimIds}))});
}
