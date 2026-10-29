import {z} from 'zod';
import {PlanningPackageSchema,GATES,type PlanningPackage} from '../contracts/planning.js';
import {ProductionPackageSchema,type ProductionPackage} from '../contracts/production.js';
import {Hash} from '../contracts/video.js';
import {canonical,sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';

export const DIFF_LIMITS={inputBytes:4_000_000,outputBytes:8_000_000,depth:40,nodes:100_000,changes:2_000} as const;
type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
export type RevisionChange={path:string;beforePresent:boolean;afterPresent:boolean;before?:Json;after?:Json};
export type ChangedCollection={added:string[];removed:string[];modified:string[];moved:string[];beforeOrder:string[];afterOrder:string[]};
export type RevisionDiff={schemaVersion:'revision-diff/1.0';kind:'plan'|'production';projectId:string;fromHash:string;toHash:string;identical:boolean;changes:RevisionChange[];changedIds:Record<string,ChangedCollection>;
 invalidation:{approvalGates:string[];work:string[];reason:string;requiresIndependentReview:boolean;mediaReuse:'not-proven-by-structural-diff'};productionAuthorizationGranted:false;finalHumanAcceptance:'pending'};
const ReviewInputSchema=z.object({snapshotHash:Hash,plan:PlanningPackageSchema}).strict().superRefine((v,ctx)=>{if(v.snapshotHash!==v.plan.snapshotHash)ctx.addIssue({code:'custom',message:'Planning envelope snapshotHash differs from its plan'});});
function fail(message:string,code='DIFF_INVALID'):never{throw new EngineError(code,message);}

/** Bound unknown input before schema recursion/serialization; only ordinary JSON data is accepted. */
function boundedJson(input:unknown):asserts input is Json{
 let nodes=0,bytes=0;const active=new WeakSet<object>();
 const add=(n:number)=>{bytes+=n;if(bytes>DIFF_LIMITS.inputBytes)fail('Revision diff input exceeds 4 MB','DIFF_LIMIT');};
 const visit=(v:unknown,depth:number):void=>{
  if(++nodes>DIFF_LIMITS.nodes||depth>DIFF_LIMITS.depth)fail('Revision diff input traversal limit exceeded','DIFF_LIMIT');
  if(v===null){add(4);return;}if(typeof v==='string'){add(Buffer.byteLength(JSON.stringify(v)));return;}
  if(typeof v==='boolean'){add(v?4:5);return;}if(typeof v==='number'){if(!Number.isFinite(v))fail('Revision diff requires finite JSON numbers');add(String(v).length);return;}
  if(typeof v!=='object')fail('Revision diff accepts JSON values only');
  if(active.has(v))fail('Revision diff input contains a cycle');active.add(v);
  try{
   if(Array.isArray(v)){
    if(v.length>DIFF_LIMITS.nodes)fail('Revision diff input traversal limit exceeded','DIFF_LIMIT');
    if(Reflect.ownKeys(v).length!==v.length+1)fail('Revision diff arrays must be dense JSON arrays');add(2+Math.max(0,v.length-1));
    for(let i=0;i<v.length;i++){const p=Object.getOwnPropertyDescriptor(v,String(i));if(!p||!('value'in p))fail('Revision diff arrays must contain data values');visit(p.value,depth+1);}
   }else{
    const prototype=Object.getPrototypeOf(v);if(prototype!==Object.prototype&&prototype!==null)fail('Revision diff accepts plain JSON objects only');
    const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(v);if(keys.length>DIFF_LIMITS.nodes)fail('Revision diff input traversal limit exceeded','DIFF_LIMIT');add(2+Math.max(0,keys.length-1));
    for(const key of keys){if(typeof key!=='string')fail('Revision diff cannot contain symbol keys');const p=descriptors[key];if(!p?.enumerable||!('value'in p))fail('Revision diff objects must contain enumerable data values');add(Buffer.byteLength(JSON.stringify(key))+1);visit(p.value,depth+1);}
   }
  }finally{active.delete(v);}
 };
 visit(input,0);
}
function supportedInput(kind:'plan'|'production',value:unknown){
 boundedJson(value);
 const parsed=kind==='plan'?ReviewInputSchema.safeParse(value):ProductionPackageSchema.safeParse(value);
 if(!parsed.success)fail('Unsupported or malformed '+kind+' revision: '+parsed.error.message);
 // Trimming/normalizing an already persisted object would silently alter its fingerprint.
 if(canonical(parsed.data)!==canonical(value))fail('Revision inputs must already contain canonical schema values; normalization would change their identity');
 return parsed.data;
}
const escapePointer=(s:string)=>s.replaceAll('~','~0').replaceAll('/','~1');
const isObject=(v:Json):v is {[key:string]:Json}=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function compareCollection(a:readonly{id:string}[],b:readonly{id:string}[]):ChangedCollection{
 const beforeOrder=a.map(v=>v.id),afterOrder=b.map(v=>v.id),before=new Map(a.map(v=>[v.id,v])),after=new Map(b.map(v=>[v.id,v]));
 return{added:afterOrder.filter(id=>!before.has(id)),removed:beforeOrder.filter(id=>!after.has(id)),modified:afterOrder.filter(id=>before.has(id)&&canonical(before.get(id))!==canonical(after.get(id))),moved:afterOrder.filter((id,i)=>before.has(id)&&beforeOrder.indexOf(id)!==i),beforeOrder,afterOrder};
}
/** Pure structural comparison. It does not verify source truth, media bytes or existing approvals. */
export function diffRevisions(kind:'plan'|'production',before:unknown,after:unknown):RevisionDiff{
 if(kind!=='plan'&&kind!=='production')fail('Revision diff kind must be plan or production');
 const a=supportedInput(kind,before),b=supportedInput(kind,after);
 const pa=kind==='plan'?(a as {plan:PlanningPackage}).plan:a as ProductionPackage,pb=kind==='plan'?(b as {plan:PlanningPackage}).plan:b as ProductionPackage;
 if(pa.projectId!==pb.projectId)fail('Revision diff cannot compare different projects','DIFF_PROJECT');
 const fromHash=sha256(canonical(a)),toHash=sha256(canonical(b)),changes:RevisionChange[]=[];
 const put=(path:string,av:Json|undefined,bv:Json|undefined,ap:boolean,bp:boolean)=>{if(changes.length>=DIFF_LIMITS.changes)fail('Revision diff change limit exceeded','DIFF_LIMIT');changes.push({path,beforePresent:ap,afterPresent:bp,...(ap?{before:av}:{}),...(bp?{after:bv}:{})});};
 const walk=(av:Json,bv:Json,path:string):void=>{
  if(canonical(av)===canonical(bv))return;
  if(Array.isArray(av)&&Array.isArray(bv)){for(let i=0;i<Math.max(av.length,bv.length);i++){const ap=i<av.length,bp=i<bv.length,p=path+'/'+i;if(ap&&bp)walk(av[i]!,bv[i]!,p);else put(p,av[i],bv[i],ap,bp);}return;}
  if(isObject(av)&&isObject(bv)){for(const key of [...new Set([...Object.keys(av),...Object.keys(bv)])].sort()){const ap=Object.hasOwn(av,key),bp=Object.hasOwn(bv,key),p=path+'/'+escapePointer(key);if(ap&&bp)walk(av[key]!,bv[key]!,p);else put(p,av[key],bv[key],ap,bp);}return;}
  put(path,av,bv,true,true);
 };
 walk(a as Json,b as Json,'');
 const identical=fromHash===toHash,changedIds:Record<string,ChangedCollection>={};
 if(kind==='plan'){const p=pa as PlanningPackage,q=pb as PlanningPackage;for(const key of ['facts','script','storyboard','concepts'] as const)changedIds[key]=compareCollection(p[key],q[key]);}
 else changedIds.scenes=compareCollection((pa as ProductionPackage).scenes,(pb as ProductionPackage).scenes);
 const result:RevisionDiff={schemaVersion:'revision-diff/1.0',kind,projectId:pa.projectId,fromHash,toHash,identical,changes,changedIds,
  invalidation:{approvalGates:identical?[]:kind==='plan'?[...GATES]:['G3','G4','G5','G6'],work:identical?[]:kind==='plan'?['readthrough','style','animatic','motion','full-production','final-quality']:['style','animatic','motion','full-production','final-quality'],reason:identical?'Canonical inputs are identical; no structural invalidation is indicated.':kind==='plan'?'Planning revision changed. Recheck its approvals and all dependent preparation/media; this diff does not select a version.':'Production package changed. Recheck G3 onward and dependent media; unchanged readthrough references are not proof of measured reuse.',requiresIndependentReview:!identical,mediaReuse:'not-proven-by-structural-diff'},productionAuthorizationGranted:false,finalHumanAcceptance:'pending'};
 if(Buffer.byteLength(JSON.stringify(result))>DIFF_LIMITS.outputBytes)fail('Revision diff output limit exceeded','DIFF_LIMIT');return result;
}
