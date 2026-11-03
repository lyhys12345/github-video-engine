import {DatabaseSync} from 'node:sqlite';
import {lstat,mkdir,mkdtemp,readFile,readdir,realpath,rename,rm,rmdir,writeFile} from 'node:fs/promises';
import {basename,dirname,isAbsolute,join,parse,relative,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {ArtifactSchema,type Artifact} from '../contracts/runtime.js';
import {RepositoryUrl} from '../contracts/planning.js';
import {Id} from '../contracts/video.js';
import {StorySchema,type Story} from '../contracts/story.js';
import {TaskRunner,type TaskRecord} from '../orchestrator/tasks.js';
import {EngineError,checkAbort} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {TASK_SCHEMA_SQL,USAGE_SCHEMA_SQL,TASKS_DB_VERSION} from '../operations/usage.js';
import {compileStory} from '../story-planner/compile.js';

import {deriveResearchHandoff} from './research-handoff.js';
const stage='experimental-complete-story-plan-v1' as const;
const hash=z.string().regex(/^[a-f0-9]{64}$/),FILE_LIMIT=2_000_000,TOTAL_LIMIT=12_000_000,DB_LIMIT=64_000_000;
const File=z.object({path:z.string().min(1),artifact:ArtifactSchema}).strict();
const Result=z.object({schemaVersion:z.enum(['1.0','1.1']),stage:z.literal(stage),review:z.literal('pending'),graphHash:hash,files:z.array(File).min(5).max(30)}).strict();
type PlanResult=z.infer<typeof Result>;
export type StorySnapshot={graph:Story;sources:{id:string;bytes:Buffer}[]};
export const RepositoryBindingSchema=z.object({
 projectId:Id,repository:RepositoryUrl,commit:z.string().regex(/^[a-f0-9]{40}$/),snapshotHash:hash,evidenceFingerprint:hash,
}).strict();
type RepositoryBinding=z.infer<typeof RepositoryBindingSchema>;
const fail=(code:string,message:string):never=>{throw new EngineError(code,message);};
const json=(v:unknown)=>JSON.stringify(v,null,2)+'\n';
function safeRelative(p:string){if(!p||p.length>260||p.includes('\\')||isAbsolute(p)||/[\x00-\x1f\x7f:]/.test(p)||p.split('/').some(s=>!s||s==='.'||s==='..'))fail('EXPLAIN_PATH','Expected a safe relative path');return p;}
function inside(root:string,path:string){const r=relative(root,path);return !isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);}
export async function ancestors(path:string,create=false){let p=parse(path).root;for(const part of relative(p,path).split(sep).filter(Boolean)){p=join(p,part);let s;try{s=await lstat(p);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;if(!create)return;await mkdir(p);s=await lstat(p);}if(s.isSymbolicLink()||!s.isDirectory())fail('EXPLAIN_PATH','Linked or non-directory ancestors are not supported');}}
async function exists(path:string){try{return await lstat(path);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
export async function boundedFile(path:string,max=FILE_LIMIT){await ancestors(dirname(path));const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>max)fail('EXPLAIN_INPUT','Expected a bounded regular file');const b=await readFile(path);if(b.length!==s.size)fail('EXPLAIN_INPUT','File changed during read');return b;}
function parseJson(b:Buffer){try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b).replace(/^\uFEFF/,''));}catch{fail('EXPLAIN_JSON','Expected valid UTF-8 JSON');}}
export function verifyCaptured(graph:Story,sources:{id:string;bytes:Buffer}[]){const map=new Map(sources.map(s=>[s.id,s.bytes]));for(const s of graph.evidence.sources){const b=map.get(s.id);if(!b||sha256(b)!==s.sha256)fail('EXPLAIN_SOURCE','Source hash mismatch: '+s.id);let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(b);}catch{fail('EXPLAIN_SOURCE','Source is not UTF-8: '+s.id);}for(const c of graph.evidence.claims)for(const q of c.citations.filter(q=>q.document===s.id)){const lines=text!.split(/\r?\n/);if(q.endLine>lines.length||lines.slice(q.startLine-1,q.endLine).join('\n')!==q.quote)fail('EXPLAIN_CITATION','Exact cited lines do not match source for '+c.id);}}}
export async function captureEvidence(spec:string,root:string):Promise<StorySnapshot>{
 const graph=StorySchema.parse(parseJson(await boundedFile(resolve(spec))));
 if(graph.evidence.sources.length>8||graph.evidence.claims.length>100||graph.evidence.objects.length>100||graph.evidence.actors.length>30)fail('EXPLAIN_LIMIT','Graph exceeds bounded planning limits');
 await ancestors(resolve(root));const base=await realpath(root),sources:StorySnapshot['sources']=[];let total=0;
 for(const s of graph.evidence.sources){safeRelative(s.path);const path=resolve(base,s.path);if(!inside(base,path))fail('EXPLAIN_PATH','Source outside root');const b=await boundedFile(path);if(!inside(base,await realpath(path)))fail('EXPLAIN_PATH','Source outside real root');total+=b.length;if(total>TOTAL_LIMIT)fail('EXPLAIN_LIMIT','Source snapshot exceeds byte limit');sources.push({id:s.id,bytes:b});}
 verifyCaptured(graph,sources);return{graph,sources};
}
const compilerFiles=['src/contracts/evidence-plan.ts','src/contracts/story.ts','src/contracts/planning.ts','src/contracts/video.ts','src/story-planner/compile.ts','src/story-planner/research-handoff.ts','src/story-planner/runtime.ts','src/story-planner/cli.ts','src/core/util.ts','src/core/errors.ts','src/orchestrator/tasks.ts','src/assets/store.ts','src/contracts/runtime.ts','src/operations/usage.ts'];
async function compilerIdentity(){return Promise.all(compilerFiles.map(async path=>({path,sha256:sha256(await boundedFile(resolve(import.meta.dirname,'../..',path)))})));}
export function reviewPacket(graph:Story,plan:ReturnType<typeof compileStory>){const escape=(s:string)=>s.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!)).replace(/[\\`*_{}\[\]()!#>|~+\-=.]/g,'\\$&');return '# Experimental story — review required\n\nAgent-authored interpretation; citations prove provenance, not truth. Timings are estimates, not recorded audio. No media generated.\n\nEstimated duration: '+plan.estimatedSeconds+' s; frame rate: '+plan.fps+' fps.\n\n'+plan.shots.map(s=>`## ${escape(s.id)} (${s.startFrame/plan.fps}–${s.endFrame/plan.fps} s; frames ${s.startFrame}–${s.endFrame})\n\n${escape(s.narration)}\n\nVisual: ${escape(s.visual)}\n\nClaims: ${s.claimIds.map(escape).join(', ')}`).join('\n\n')+'\n\n## Evidence references\n\n'+graph.evidence.claims.map(c=>`- ${escape(c.id)} (${c.kind}): ${escape(c.statement)}; ${c.citations.map(q=>`${escape(q.document)} lines ${q.startLine}–${q.endLine}`).join(', ')}`).join('\n')+'\n';}
async function preflightOutput(out:string,data:string,taskId?:string){if(inside(out,data)||inside(data,out))fail('EXPLAIN_PATH','Output and task-state directories must not overlap');await ancestors(dirname(out));const s=await exists(out);if(s&&(s.isSymbolicLink()||!s.isDirectory()))fail('EXPLAIN_OUTPUT','Output must be a new regular directory');if(s){if(!await exists(join(out,'bundle','manifest.json')))fail('EXPLAIN_OUTPUT','Refusing unrelated or incomplete existing output');await ancestors(join(out,'bundle'));const m=parseJson(await boundedFile(join(out,'bundle','manifest.json')));if(m.stage!==stage||taskId&&m.taskId!==taskId)fail('EXPLAIN_OUTPUT','Output belongs to different inputs');}}
function fingerprint(input:unknown){return sha256(canonical({version:'production-task-v1',kind:'explain-story-plan',input}));}
/** Conservative bound for Windows APIs used by the existing TaskRunner and CAS. */
export function preflightStatePath(data:string){if(process.platform!=='win32')return;const generated=[join(data,'tmp','f'.repeat(64)+'-XXXXXX'),join(data,'artifacts','ab','f'.repeat(64)+'.json'),join(data,'artifacts','ab','.partial-'+'f'.repeat(36)),join(data,'tasks.sqlite-wal')];const longest=Math.max(...generated.map(p=>p.length));if(longest>250)fail('EXPLAIN_STATE_PATH_TOO_LONG',`Windows planning state path is too long: generated TaskRunner/CAS paths would reach ${longest} UTF-16 code units (supported planning limit:250). Choose a shorter --data directory; its absolute path must be at most167 characters for this runtime, for example a short work/plan-state directory. No planning state or output was created.`);}
export async function planStory(spec:string,root:string,data:string,out:string,signal:AbortSignal){
 return planCapturedStory(await captureEvidence(spec,root),data,out,signal);
}
export async function planCapturedStory(snapshot:StorySnapshot,data:string,out:string,signal:AbortSignal,repositoryBinding?:RepositoryBinding){
 compileStory(snapshot.graph);checkAbort(signal);data=resolve(data);preflightStatePath(data);out=resolve(out);await ancestors(data);await preflightOutput(out,data);
 const sources=await compilerIdentity(),input={stage,projectId:snapshot.graph.id,graph:snapshot.graph,sourceBytes:snapshot.sources.map(s=>({id:s.id,sha256:sha256(s.bytes),bytes:s.bytes.length})),compiler:sources,...(repositoryBinding?{repositoryBinding}:{})};
 const id=fingerprint(input);await preflightOutput(out,data,id);const runner=new TaskRunner(data);
 try{const result=await runner.run('explain-story-plan',input,async(_directory,workSignal)=>{
  const graph=snapshot.graph,plan=compileStory(graph),portable={...graph,evidence:{...graph.evidence,sources:graph.evidence.sources.map(s=>({...s,path:`sources/${s.id}.txt`}))}};
  const payloads:[string,string|Buffer,string][]=[['graph.json',json(graph),'application/json'],['portable-graph.json',json(portable),'application/json'],['compiled-plan.json',json(plan),'application/json'],['review.md',reviewPacket(graph,plan),'text/plain'],['research-handoff.json',json(deriveResearchHandoff(snapshot)),'application/json']];
  for(const s of snapshot.sources)payloads.push([`sources/${s.id}.txt`,s.bytes,'text/plain']);
  const files:PlanResult['files']=[];for(const [path,bytes,type] of payloads){checkAbort(workSignal);files.push({path,artifact:await runner.artifacts.commit(bytes,type,'PUBLISH',id)});}
  const manifest={schemaVersion:'1.0',stage,taskId:id,review:'pending',graphHash:sha256(canonical(graph)),scope:'agent-curated experimental complete story plan; no media or approval',...(repositoryBinding?{repositoryBinding}:{}),files:files.map(f=>({path:f.path,sha256:f.artifact.sha256,bytes:f.artifact.bytes}))};
  files.push({path:'manifest.json',artifact:await runner.artifacts.commit(json(manifest),'application/json','PUBLISH',id)});
  return{value:Result.parse({schemaVersion:'1.1',stage,review:'pending',graphHash:manifest.graphHash,files}),outputs:files.map(f=>f.artifact)};
 },signal,{attempts:3,timeoutMs:60000});
 const checked=await verifyResult(runner.artifacts,runner.get(id)!);const exported=await publishBundle(out,checked,signal);
 return{taskId:id,cached:result.cached,stage,review:'pending',output:exported};
 }finally{runner.close();}
}

/** Read stable SQLite bytes into an owned snapshot; original state is never opened or migrated. */
export async function readTask(data:string,id:string,kind='explain-story-plan'){hash.parse(id);data=resolve(data);await ancestors(data);const dbPath=join(data,'tasks.sqlite');if(!await exists(dbPath))fail('EXPLAIN_STATE','Existing planning state was not found');
 const read=async()=>{const db=await boundedFile(dbPath,DB_LIMIT),walPath=dbPath+'-wal',wal=await exists(walPath)?await boundedFile(walPath,DB_LIMIT):null;return{db,wal};};
 let captured:Awaited<ReturnType<typeof read>>|undefined;
 for(let n=0;n<3;n++){const a=await read(),b=await read();if(sha256(a.db)===sha256(b.db)&&((a.wal===null&&b.wal===null)||(a.wal&&b.wal&&sha256(a.wal)===sha256(b.wal)))){captured=b;break;}}
 if(!captured)fail('EXPLAIN_BUSY','State changed during snapshot; retry status/export');
 const temp=await mkdtemp(join(tmpdir(),'gve-explain-read-'));try{const p=join(temp,'tasks.sqlite');await writeFile(p,captured!.db);if(captured!.wal)await writeFile(p+'-wal',captured!.wal);
 const db=new DatabaseSync(p,{readOnly:true});try{if(db.prepare('PRAGMA user_version').get()!.user_version!==TASKS_DB_VERSION)fail('EXPLAIN_STATE','Unsupported task state version');const schemas=(d:DatabaseSync)=>d.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all().map(r=>({...r,sql:String(r.sql).replace(/\s+/g,'').replace(/ifnotexists/ig,'').toLowerCase()}));const reference=new DatabaseSync(':memory:');try{reference.exec(TASK_SCHEMA_SQL+USAGE_SCHEMA_SQL);if(canonical(schemas(db))!==canonical(schemas(reference)))fail('EXPLAIN_STATE','Unexpected state schema');}finally{reference.close();}const row=db.prepare('SELECT id,data FROM tasks WHERE id=?').get(id);if(!row)fail('EXPLAIN_TASK','Task was not found');if(Buffer.byteLength(String(row!.data))>TOTAL_LIMIT)fail('EXPLAIN_LIMIT','Task record exceeds size limit');const task=JSON.parse(String(row!.data)) as TaskRecord;if(task.id!==id||task.kind!==kind||sha256(canonical({version:'production-task-v1',kind,input:task.input}))!==id)fail('EXPLAIN_INTEGRITY','Task identity does not bind its planning input');return task;}finally{db.close();}
 }finally{await rm(temp,{recursive:true,force:true});}
}
type Checked={task:TaskRecord;result:PlanResult;graph:Story;payloads:Map<string,Buffer>;repositoryBinding?:RepositoryBinding};
/** Historical formatter 0: preserve exact original bytes; never use for new output. */
export function legacyReviewPacket0(graph:Story,plan:ReturnType<typeof compileStory>){return '# Experimental story — review required\n\nAgent-authored interpretation; citations prove provenance, not truth. Timings are estimates, not recorded audio. No media generated.\n\n'+plan.shots.map(s=>`## ${s.id} (${s.startFrame}–${s.endFrame})\n\n${s.narration}\n\nVisual: ${s.visual}\n\nClaims: ${s.claimIds.join(', ')}`).join('\n\n')+'\n';}
async function publishRename(from:string,to:string,signal:AbortSignal){for(let n=0;;n++){checkAbort(signal);try{await rename(from,to);return;}catch(e){if(n>=4||!['EPERM','EACCES','EBUSY'].includes((e as NodeJS.ErrnoException).code??'')||await exists(to))throw e;await new Promise(r=>setTimeout(r,40*2**n));}}}
async function readArtifact(store:ArtifactStore,artifact:Artifact){const path=store.path(artifact);await ancestors(dirname(path));const bytes=await boundedFile(path,TOTAL_LIMIT);if(bytes.length!==artifact.bytes||sha256(bytes)!==artifact.sha256)fail('EXPLAIN_INTEGRITY','Committed artifact is missing or damaged');return bytes;}
async function verifyResult(store:ArtifactStore,task:TaskRecord):Promise<Checked>{
 if(task.state!=='succeeded'||!task.result)fail('EXPLAIN_NOT_READY','Task has no committed planning result; resume the same plan command if recoverable');
 const result=Result.parse(parseJson(await readArtifact(store,task.result!))),payloads=new Map<string,Buffer>();
 if(canonical(result.files.map(f=>canonical(f.artifact)).sort())!==canonical(task.outputs.map(a=>canonical(a)).sort()))fail('EXPLAIN_INTEGRITY','Result/output references mismatch');for(const f of result.files){safeRelative(f.path);if(payloads.has(f.path)||f.artifact.inputFingerprint!==task.id)fail('EXPLAIN_INTEGRITY','Result file/artifact binding mismatch');payloads.set(f.path,await readArtifact(store,f.artifact));}
 if(result.files.length!==task.outputs.length||task.result!.inputFingerprint!==task.id)fail('EXPLAIN_INTEGRITY','Output coverage mismatch');
 const get=(p:string)=>{const b=payloads.get(p);if(!b)fail('EXPLAIN_INTEGRITY','Missing committed file '+p);return b!;};
 const graph=StorySchema.parse(parseJson(get('graph.json'))),plan=compileStory(graph),input=task.input as {graph?:unknown;stage?:unknown;sourceBytes?:unknown;repositoryBinding?:RepositoryBinding};if(input.stage!==stage||canonical(input.graph)!==canonical(graph)||result.graphHash!==sha256(canonical(graph))||canonical(parseJson(get('compiled-plan.json')))!==canonical(plan))fail('EXPLAIN_INTEGRITY','Plan/graph/input lineage mismatch');
 const sources=graph.evidence.sources.map(s=>({id:s.id,bytes:get(`sources/${s.id}.txt`)}));verifyCaptured(graph,sources);
 if(canonical(input.sourceBytes)!==canonical(sources.map(s=>({id:s.id,sha256:sha256(s.bytes),bytes:s.bytes.length}))))fail('EXPLAIN_INTEGRITY','Source snapshot input binding mismatch');
 const portable={...graph,evidence:{...graph.evidence,sources:graph.evidence.sources.map(s=>({...s,path:`sources/${s.id}.txt`}))}};const packet=get('review.md').toString('utf8');const supportedPacket=packet===reviewPacket(graph,plan)||(result.schemaVersion==='1.0'&&packet===legacyReviewPacket0(graph,plan));if(canonical(parseJson(get('portable-graph.json')))!==canonical(portable)||!supportedPacket)fail('EXPLAIN_INTEGRITY','Portable graph or review packet mismatch (unsupported formatter)');
 if(result.schemaVersion==='1.1' && canonical(parseJson(get('research-handoff.json')))!==canonical(deriveResearchHandoff({graph,sources})))fail('EXPLAIN_INTEGRITY','Research handoff mismatch');
 const manifest=parseJson(get('manifest.json'));const expectedManifest={schemaVersion:'1.0',stage,taskId:task.id,review:'pending',graphHash:result.graphHash,scope:'agent-curated experimental complete story plan; no media or approval',...(input.repositoryBinding?{repositoryBinding:input.repositoryBinding}:{}),files:result.files.filter(f=>f.path!=='manifest.json').map(f=>({path:f.path,sha256:f.artifact.sha256,bytes:f.artifact.bytes}))};if(canonical(manifest)!==canonical(expectedManifest)||payloads.size!==(result.schemaVersion==='1.1'?6:5)+sources.length)fail('EXPLAIN_INTEGRITY','Manifest/file closure mismatch');
 return{task,result,graph,payloads,repositoryBinding:input.repositoryBinding};
}
/** Recover verified Story bytes without assigning standalone sources to a Git revision. */
export async function loadStandaloneStory(data:string,id:string){
 const task=await readTask(data,id),checked=await verifyResult(new ArtifactStore(data),task);
 if(checked.repositoryBinding)fail('STORY_STANDALONE_REQUIRED','This pilot requires a standalone Story with no repository association');
 const snapshot:StorySnapshot={graph:checked.graph,sources:checked.graph.evidence.sources.map(s=>({id:s.id,bytes:checked.payloads.get('sources/'+s.id+'.txt')!}))};
 return{snapshot,taskId:id,graphHash:checked.result.graphHash};
}

/** Recover the exact authored story and pinned bytes from a successful URL-bound task. */
export async function loadBoundStory(data:string,id:string){
 const task=await readTask(data,id),checked=await verifyResult(new ArtifactStore(data),task);
 if(!checked.repositoryBinding)fail('STORY_REPOSITORY_REQUIRED','Asset planning from a task requires a repository-bound project story');
 const repositoryBinding=RepositoryBindingSchema.parse(checked.repositoryBinding);
 const prefix=repositoryBinding.repository+'/blob/'+repositoryBinding.commit+'/';
 if(checked.graph.evidence.sources.some(s=>!s.url.startsWith(prefix)))fail('STORY_REPOSITORY_REQUIRED','Stored Story sources are not pinned to the task repository and commit');
 const snapshot:StorySnapshot={graph:checked.graph,sources:checked.graph.evidence.sources.map(s=>({id:s.id,bytes:checked.payloads.get('sources/'+s.id+'.txt')!}))};
 return{snapshot,sourceStory:{taskId:id,graphHash:checked.result.graphHash,repositoryBinding}};
}
async function publishBundle(out:string,checked:Checked,signal:AbortSignal){out=resolve(out);await ancestors(dirname(out),true);let reserved=false,staging:string|undefined;const owner=randomUUID(),marker=join(out,'.explain-owner.json');
 try{try{await mkdir(out);reserved=true;await writeFile(marker,json({schemaVersion:'1.0',taskId:checked.task.id,owner}),{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const info=await lstat(out);if(info.isSymbolicLink()||!info.isDirectory())fail('EXPLAIN_OUTPUT','Refusing linked output');const rootItems=(await readdir(out)).sort();if(canonical(rootItems)!==canonical(['.explain-owner.json','bundle']))fail('EXPLAIN_OUTPUT','Refusing incomplete or unrelated existing output');const m=parseJson(await boundedFile(marker));if(m.taskId!==checked.task.id)fail('EXPLAIN_OUTPUT','Existing output belongs to different inputs');
  const bundle=join(out,'bundle');await ancestors(bundle);const seen:string[]=[];async function walk(dir:string,prefix=''){for(const name of await readdir(dir)){const path=join(dir,name),s=await lstat(path);if(s.isSymbolicLink())fail('EXPLAIN_OUTPUT','Linked bundle file');if(s.isDirectory())await walk(path,prefix+name+'/');else if(s.isFile())seen.push(prefix+name);else fail('EXPLAIN_OUTPUT','Non-regular bundle item');}}await walk(bundle);if(canonical(seen.sort())!==canonical([...checked.payloads.keys()].sort()))fail('EXPLAIN_OUTPUT','Existing bundle contains different files');for(const [p,b] of checked.payloads)if(sha256(await boundedFile(join(bundle,...p.split('/')),TOTAL_LIMIT))!==sha256(b))fail('EXPLAIN_OUTPUT','Existing bundle was edited; choose a new directory');return{directory:out,bundle,reused:true};}
  staging=await mkdtemp(join(out,'.staging-'));for(const [path,bytes] of checked.payloads){checkAbort(signal);const dest=join(staging,...safeRelative(path).split('/'));await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});}checkAbort(signal);await ancestors(out);if(parseJson(await boundedFile(marker)).owner!==owner)fail('EXPLAIN_OUTPUT','Output ownership changed');await publishRename(staging,join(out,'bundle'),signal);staging=undefined;reserved=false;return{directory:out,bundle:join(out,'bundle'),reused:false};
 }finally{if(staging)await rm(staging,{recursive:true,force:true});if(reserved){const items=await readdir(out).catch(()=>[]);if(canonical(items)!==canonical(['.explain-owner.json']))fail('EXPLAIN_OUTPUT','Owned output contains unexpected files; retained for inspection');const m=parseJson(await boundedFile(marker));if(m.owner===owner){await rm(marker);await rmdir(out);}}}
}
export async function statusStory(data:string,id:string){const task=await readTask(data,id);if(task.state!=='succeeded')return{taskId:id,stage,state:task.state,attempt:task.attempt,error:task.error,integrity:'no committed successful result',resume:(task.input as {repositoryBinding?:RepositoryBinding}).repositoryBinding?'repeat project story with the original inputs':'repeat story plan with the original inputs'};const checked=await verifyResult(new ArtifactStore(data),task);return{taskId:id,stage,state:task.state,attempt:task.attempt,review:'pending',integrity:'verified',graphHash:checked.result.graphHash,...(checked.repositoryBinding?{repositoryBinding:checked.repositoryBinding}:{}),files:checked.result.files.map(f=>({path:f.path,sha256:f.artifact.sha256,bytes:f.artifact.bytes})),scope:'experimental complete story plan, not production story or media'};}
export async function exportStory(data:string,id:string,out:string,signal:AbortSignal){checkAbort(signal);hash.parse(id);await preflightOutput(resolve(out),resolve(data),id);const task=await readTask(data,id),checked=await verifyResult(new ArtifactStore(data),task);return{taskId:id,stage,review:'pending',output:await publishBundle(out,checked,signal)};}
export function compareStories(a:Story,b:Story){const changed=(x:{id:string}[],y:{id:string}[])=>[...new Set([...x.map(z=>z.id),...y.map(z=>z.id)])].filter(id=>canonical(x.find(z=>z.id===id)??null)!==canonical(y.find(z=>z.id===id)??null));const sources=changed(a.evidence.sources,b.evidence.sources),claims=changed(a.evidence.claims,b.evidence.claims);for(const c of b.evidence.claims)if(c.citations.some(q=>sources.includes(q.document))&&!claims.includes(c.id))claims.push(c.id);const shots=changed(a.shots,b.shots),oldOrder=a.shots.map(s=>s.id),newOrder=b.shots.map(s=>s.id),globalSettingsChanged=canonical(a.timing)!==canonical(b.timing),reorderedShots=newOrder.filter((id,i)=>oldOrder.indexOf(id)!==i);const oldPlan=compileStory(a),newPlan=compileStory(b);const timelineAffectedShots=newPlan.shots.filter(s=>{const previous=oldPlan.shots.find(x=>x.id===s.id);return !previous||previous.startFrame!==s.startFrame||previous.endFrame!==s.endFrame}).map(s=>s.id);const neighbors=(order:string[],id:string)=>{const i=order.indexOf(id);return i<0?null:[order[i-1]??null,order[i+1]??null];};const continuityAffectedShots=newOrder.filter(id=>canonical(neighbors(oldOrder,id))!==canonical(neighbors(newOrder,id)));const affected=b.shots.filter(s=>globalSettingsChanged||shots.includes(s.id)||reorderedShots.includes(s.id)||timelineAffectedShots.includes(s.id)||continuityAffectedShots.includes(s.id)||s.claimIds.some(id=>claims.includes(id))).map(s=>s.id);return{changedSources:sources,changedClaims:claims,changedShots:shots,reorderedShots,timelineAffectedShots,continuityAffectedShots,affectedShots:affected,oldOrder,newOrder,globalSettingsChanged};}
export async function diffStory(data:string,before:string,after:string){const store=new ArtifactStore(data),a=await verifyResult(store,await readTask(data,before)),b=await verifyResult(store,await readTask(data,after));return{schemaVersion:'1.0',stage,before,after,...compareStories(a.graph,b.graph),scope:'editorial dependency guidance only; downstream timing may shift, no rendered-media cache reuse claimed'};}
export async function writeStoryDiff(path:string,result:unknown){path=resolve(path);await ancestors(dirname(path));await writeFile(path,json(result),{flag:'wx'});}
