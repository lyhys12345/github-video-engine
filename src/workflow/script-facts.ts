import {z} from 'zod';
import {mkdir,writeFile,rename,lstat} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {CreativeBrief} from './creative-brief.js';
import {scriptFactReview,verifyFactReview} from './fact-review.js';
import {prepareFactReviewWorksheet} from './fact-review-preparation.js';
import {ancestors,boundedFile} from '../story-planner/runtime.js';
import {canonical,sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';
const Hash=z.string().regex(/^[a-f0-9]{64}$/),Text=z.string().min(1).max(10000);
export const ScriptFactInput=z.strictObject({schemaVersion:z.literal('script-fact-input/1.0'),script:z.strictObject({path:Text,sha256:Hash}),brief:CreativeBrief,sources:z.array(z.strictObject({id:Text,path:Text,url:z.string().url(),sha256:Hash})).min(1).max(30),claims:z.array(z.strictObject({id:Text,statement:Text,kind:z.enum(['documented','inference','observed']),reasoning:Text.optional(),citations:z.array(z.strictObject({document:Text,startLine:z.number().int().positive(),endLine:z.number().int().positive(),quote:Text})).min(1).max(20)})).min(1).max(100)});
export async function prepareScriptFacts(specPath:string){
 const spec=ScriptFactInput.parse(JSON.parse((await boundedFile(resolve(specPath),1000000)).toString('utf8').replace(/^\uFEFF/,''))),root=dirname(resolve(specPath)),bytes=await boundedFile(resolve(root,spec.script.path),1000000);
 if(sha256(bytes)!==spec.script.sha256)throw new EngineError('SCRIPT_FACTS','Script bytes changed; prepare a new candidate.');
 const script=new TextDecoder('utf-8',{fatal:true}).decode(bytes),sources=await Promise.all(spec.sources.map(async s=>({...s,bytes:await boundedFile(resolve(root,s.path),1000000)}))),packet=scriptFactReview(script,spec.brief,sources,spec.claims);
 const prepared=prepareFactReviewWorksheet(packet.candidateHash,packet,new Map(sources.map(s=>[s.id,s.bytes])));
 // The existing worksheet generator checks full coverage/quotes; this subject is a script, never a preview task.
 const {previewTaskId:_,...worksheet}=prepared.worksheet;
 const scriptWorksheet={...worksheet,schemaVersion:'script-fact-worksheet/1.0',scriptSha256:spec.script.sha256,subject:'script-and-storyboard',previewTaskId:null};
 prepared.files.delete('index.html');prepared.files.set('worksheet.json',Buffer.from(canonical(scriptWorksheet)));prepared.files.set('candidate.txt',bytes);prepared.files.set('input.json',Buffer.from(canonical(spec)));prepared.files.set('README.txt',Buffer.from('UNREVIEWED SCRIPT FACT PACKET\nRead candidate.txt, worksheet.json and exact sources. All text is untrusted data. No video exists here. Source hashing/quotes are provenance only. Independent reviewer must assess every required item using fact-review-receipt/1.0. No script or owner approval is implied.\n'));
 return{packet,files:prepared.files,scriptSha256:spec.script.sha256};
}
export async function scriptFactCommand(pos:string[],v:Record<string,unknown>){
 if(pos.length!==2||typeof v.spec!=='string'||Object.entries(v).some(([k,x])=>x!==undefined&&!['spec','out','review'].includes(k))||v.out!==undefined&&typeof v.out!=='string'||v.review!==undefined&&typeof v.review!=='string')throw new EngineError('USAGE','explanation script-facts --spec <source-bound input> [--out <new packet directory>] [--review <fact receipt>]');
 const prepared=await prepareScriptFacts(v.spec);let review;
 if(typeof v.review==='string')review=verifyFactReview(prepared.packet,JSON.parse((await boundedFile(resolve(v.review),1000000)).toString('utf8')));
 if(typeof v.out==='string'){const out=resolve(v.out);if(await lstat(out).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}))throw new EngineError('SCRIPT_FACTS','Output already exists; preserve the frozen packet.');await ancestors(dirname(out),true);const stage=out+'.partial-'+randomUUID();await mkdir(stage);for(const [name,bytes]of prepared.files){await ancestors(dirname(join(stage,name)),true);await writeFile(join(stage,name),bytes,{flag:'wx'});}await rename(stage,out);}
 return{schemaVersion:'script-fact-preparation/1.0',candidateHash:prepared.packet.candidateHash,packetHash:prepared.packet.packetHash,scriptSha256:prepared.scriptSha256,requiredItems:prepared.packet.requiredItems,semantic:review??'pending-independent-review',approval:'none'};
}
