import {z} from 'zod';
import {Hash,Id} from './video.js';
import {ArtifactSchema} from './runtime.js';
import {ProductionPackageSchema} from './production.js';
import {canonical,sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';
const text=(max:number)=>z.string().trim().min(1).max(max);
export const RepairRequestSchema=z.object({schemaVersion:z.literal('1.0'),requestId:Id,expectedPackageHash:Hash,sceneId:Id,
 issue:z.object({id:Id,requirement:text(1000),observation:text(2000),evidence:ArtifactSchema,timecodeMs:z.number().int().min(0).max(60000).optional()}).strict(),
 replacement:ProductionPackageSchema.shape.scenes.element.pick({title:true,subtitle:true,labels:true,sourceLabel:true}),
}).strict();
export type RepairRequest=z.infer<typeof RepairRequestSchema>;
export const repairScopeId=(projectId:string,planRevision:string)=>sha256(canonical({version:'repair-scope-v1',projectId,planRevision}));
export const repairRequestId=(scopeId:string,requestId:string)=>sha256(canonical({version:'repair-request-v1',scopeId,requestId}));
export const RepairScopeSchema=z.object({schemaVersion:z.literal('1.0'),id:Hash,projectId:Id,planRevision:Hash,baselinePackageHash:Hash,baselineApproval:ArtifactSchema,maxRounds:z.number().int().min(1).max(5),createdAt:z.iso.datetime()}).strict();
export type RepairScope=z.infer<typeof RepairScopeSchema>;
export const RepairRoundSchema=z.object({schemaVersion:z.literal('1.0'),id:Hash,scopeId:Hash,requestId:Id,round:z.number().int().min(1).max(5),projectId:Id,planRevision:Hash,parentHash:Hash,nextHash:Hash,request:RepairRequestSchema,diff:ArtifactSchema,createdAt:z.iso.datetime()}).strict();
export type RepairRound=z.infer<typeof RepairRoundSchema>;
/** Data consistency only; callers additionally verify CAS, approved baseline and referenced packages/tasks. */
export function validateRepairRows(scopeRows:readonly unknown[],roundRows:readonly unknown[]){
 const bad=(message:string):never=>{throw new EngineError('REPAIR_INVALID',message);};
 if(scopeRows.length>10000||roundRows.length>10000||Buffer.byteLength(JSON.stringify([scopeRows,roundRows]))>32000000)bad('Repair ledger coverage limit exceeded');
 const scopes=scopeRows.map(s=>RepairScopeSchema.parse(s)),rounds=roundRows.map(r=>RepairRoundSchema.parse(r)),ids=new Set<string>(),scopeKeys=new Set<string>();
 for(const s of scopes){if(s.id!==repairScopeId(s.projectId,s.planRevision)||ids.has(s.id)||scopeKeys.has(s.projectId+':'+s.planRevision))bad('Conflicting repair scope identity');ids.add(s.id);scopeKeys.add(s.projectId+':'+s.planRevision);}
 const receipts=new Set<string>();
 for(const r of rounds){const s=scopes.find(s=>s.id===r.scopeId);if(!s||r.projectId!==s.projectId||r.planRevision!==s.planRevision||r.requestId!==r.request.requestId||r.id!==repairRequestId(s.id,r.requestId)||r.parentHash!==r.request.expectedPackageHash||r.nextHash===r.parentHash||receipts.has(r.id))bad('Conflicting repair receipt identity or scope');receipts.add(r.id);}
 for(const s of scopes){const rs=rounds.filter(r=>r.scopeId===s.id).sort((a,b)=>a.round-b.round);if(!rs.length||rs.length>s.maxRounds)bad('Repair scope has missing or exhausted round coverage');let parent=s.baselinePackageHash;for(let i=0;i<rs.length;i++){const r=rs[i]!;if(r.round!==i+1||r.parentHash!==parent)bad('Repair rounds must form a complete selected-version chain');parent=r.nextHash;}}
 return{scopes,rounds};
}
