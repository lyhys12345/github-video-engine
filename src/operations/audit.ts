import {DatabaseSync} from 'node:sqlite';
import {lstat,realpath,open,stat,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {ArtifactSchema,JobSchema,JobStepSchema,ErrorSchema,EvaluationResultSchema,STAGES} from '../contracts/runtime.js';
import {Hash,Id} from '../contracts/video.js';
import {ProductionPackageSchema,ReadthroughSchema} from '../contracts/production.js';
import {validateSnapshot,validatePlan,sourceFingerprint} from '../workflow/store.js';
import {canonical,sha256} from '../core/util.js';
import {UsageEventSchema,summarizeUsage,TASKS_DB_VERSION,USAGE_SCHEMA_SQL} from './usage.js';
import {validateRepairRows} from '../contracts/revision.js';
import {PRODUCTION_DB_VERSION,validateProductionSchema} from '../workflow/repair-db.js';
import {diffRevisions} from './revision-diff.js';
import {auditFinalizations} from './final-audit.js';

type Row=Record<string,any>;
type Check={name:string;passed:boolean;severity:'error'|'warning';explanation:string};
export type AuditReport={schemaVersion:'operations-audit/1.3';ok:boolean;checks:Check[];[key:string]:unknown};
const MAX_ROWS=10000,MAX_JSON=4_000_000,MAX_ARTIFACTS=10000,MAX_BYTES=1_000_000_000,MAX_BLOB=250_000_000;
const layouts:Record<string,Record<string,string[]>>={
 jobs:{jobs:['id','fingerprint','data'],steps:['job_id','stage','data'],events:['seq','job_id','at','type','detail'],cache:['fingerprint','outputs']},
 workflow:{sources:['hash','data'],projects:['id','data'],revisions:['hash','project_id','data'],approvals:['project_id','revision_hash','gate','data'],events:['seq','project_id','at','type','data']},
 tasks:{tasks:['id','data'],task_events:['seq','task_id','at','type','data']},
 production:{packages:['hash','data'],selected:['project_id','hash'],production_approvals:['project_id','package_hash','gate','data']},
};
const triggers:Record<string,string[]>={jobs:['immutable_steps','preserve_steps'],workflow:['no_source_update','no_source_delete','no_revision_update','no_revision_delete','no_approval_update','no_approval_delete'],tasks:['completed_task_immutable','task_delete_forbidden'],production:['package_no_update','package_no_delete','pa_no_update','pa_no_delete']};
const primaryKeys:Record<string,string[]>={'jobs.jobs':['id'],'jobs.steps':['job_id','stage'],'jobs.events':['seq'],'jobs.cache':['fingerprint'],'workflow.sources':['hash'],'workflow.projects':['id'],'workflow.revisions':['hash'],'workflow.approvals':['project_id','revision_hash','gate'],'workflow.events':['seq'],'tasks.tasks':['id'],'tasks.task_events':['seq'],'production.packages':['hash'],'production.selected':['project_id'],'production.production_approvals':['project_id','package_hash','gate']};
const required:Record<string,string[]>={'jobs.jobs':['fingerprint','data'],'jobs.steps':['job_id','stage','data'],'jobs.events':['job_id','at','type','detail'],'jobs.cache':['outputs'],'workflow.sources':['data'],'workflow.projects':['data'],'workflow.revisions':['project_id','data'],'workflow.approvals':['project_id','revision_hash','gate','data'],'workflow.events':['project_id','at','type','data'],'tasks.tasks':['data'],'tasks.task_events':[],'production.packages':['data'],'production.selected':['hash'],'production.production_approvals':[]};
const expectedForeignKeys:Record<string,string[][]>={'jobs.steps':[['job_id','jobs','id']],'jobs.events':[['job_id','jobs','id']],'workflow.revisions':[['project_id','projects','id']],'workflow.approvals':[['project_id','projects','id'],['revision_hash','revisions','hash']],'production.selected':[['hash','packages','hash']]};
const triggerDefinitions:Record<string,[string,string,string,string?]>={immutable_steps:['steps','UPDATE','Committed steps are immutable',"json_extract(OLD.data,'$.status')='succeeded'"],preserve_steps:['steps','DELETE','Steps cannot be deleted'],no_source_update:['sources','UPDATE','Source snapshots are immutable'],no_source_delete:['sources','DELETE','Source snapshots are immutable'],no_revision_update:['revisions','UPDATE','Plan revisions are immutable'],no_revision_delete:['revisions','DELETE','Plan revisions are immutable'],no_approval_update:['approvals','UPDATE','Approval history is immutable'],no_approval_delete:['approvals','DELETE','Approval history is immutable'],completed_task_immutable:['tasks','UPDATE','Successful tasks are immutable',"json_extract(OLD.data,'$.state')='succeeded'"],task_delete_forbidden:['tasks','DELETE','Task history is immutable'],package_no_update:['packages','UPDATE','Packages are immutable'],package_no_delete:['packages','DELETE','Packages are immutable'],pa_no_update:['production_approvals','UPDATE','Approvals are immutable'],pa_no_delete:['production_approvals','DELETE','Approvals are immutable']};
const normalizedSql=(v:unknown)=>String(v).replace(/\s+/g,'').replace(/ifnotexists/ig,'').toLowerCase();
primaryKeys['tasks.usage_events']=['seq'];
required['tasks.usage_events']=['id','task_id','attempt','phase','data'];
expectedForeignKeys['tasks.usage_events']=[['task_id','tasks','id']];
triggerDefinitions.usage_update_forbidden=['usage_events','UPDATE','Usage history is immutable'];
triggerDefinitions.usage_delete_forbidden=['usage_events','DELETE','Usage history is immutable'];
primaryKeys['production.repair_scopes']=['id'];primaryKeys['production.repair_rounds']=['id'];
required['production.repair_scopes']=['project_id','plan_revision','data'];required['production.repair_rounds']=['scope_id','request_id','round','data'];
expectedForeignKeys['production.repair_rounds']=[['scope_id','repair_scopes','id']];
const extension=(type:string)=>({'video/mp4':'mp4','image/png':'png','audio/wav':'wav','audio/flac':'flac','text/vtt':'vtt','text/plain':'txt','application/zip':'zip','font/ttf':'ttf'}[type]??'json');
const inside=(base:string,target:string)=>{const rel=relative(base,target);return !isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep);};
const date=z.string().datetime();
const Task=z.object({id:Hash,kind:z.string().min(1).max(100),input:z.unknown(),scopeKey:z.string().nullable().optional(),state:z.enum(['running','succeeded','failed','cancelled']),attempt:z.number().int().positive(),owner:z.string().min(1),leaseUntil:z.number().finite().nonnegative(),result:ArtifactSchema.nullable(),outputs:z.array(ArtifactSchema).max(MAX_ARTIFACTS),error:ErrorSchema.nullable(),startedAt:date,finishedAt:date.nullable()}).strict();
const Source=z.object({hash:Hash,artifact:ArtifactSchema,createdAt:date}).strict();
const Revision=z.object({hash:Hash,projectId:Id,snapshotHash:Hash,artifact:ArtifactSchema,createdAt:date}).strict();
const Project=z.object({id:Id,repository:z.string(),snapshotHash:Hash,currentRevision:Hash.nullable(),createdAt:date,updatedAt:date}).strict();
const Package=z.object({hash:Hash,projectId:Id,planRevision:Hash,artifact:ArtifactSchema}).strict();
const Approval=z.object({projectId:Id,revisionHash:Hash,gate:z.enum(['G1','G2']),artifact:ArtifactSchema,recordedAt:date,actor:z.literal('delegated-judge'),candidateHash:Hash,activeRoles:z.array(z.string()).min(3)}).strict();
const ProductionApproval=z.object({projectId:Id,packageHash:Hash,gate:z.enum(['G3','G4']),artifact:ArtifactSchema,actor:z.literal('delegated-judge'),recordedAt:date,candidateHash:Hash}).strict();

/** Bounded evidence inspection only. This function never constructs a runtime store or executes work. */
export async function auditRuntime(dataRoot:string):Promise<AuditReport>{
 const checks:Check[]=[],databases:Row[]=[],jobs:Row[]=[],tasks:Row[]=[],scopes:Row[]=[],versions:Row[]=[],approvals:Row[]=[],owners:Row[]=[],artifacts:Row[]=[],events:Row[]=[];
 const report:AuditReport={schemaVersion:'operations-audit/1.3',ok:false,checks,dataRoot:resolve(dataRoot),databases,jobs,tasks,scopes,versions,approvals,owners,artifacts,events,finalHumanAcceptance:'pending',productionAuthorizationGranted:false,milestoneVerdict:'not-assessed',snapshot:{mode:'per-database-read-transactions',crossDatabaseAtomic:false,filesAtomic:false},costs:{currency:'USD',actualPaidUsd:null,status:'unknown-not-recorded',ledgerAvailable:false,preflightCompletesCostAccounting:false,approvedZeroPolicies:[]},repairs:{ledgerAvailable:false,unrecordedHistoricalCorrections:null,historicalCoverage:'unknown; unrecorded corrections are not inferred',mediaReuse:'whole-package rendering; no scene-level cache inferred'}};
 const add=(name:string,passed:boolean,explanation:string,severity:'error'|'warning'='error')=>checks.push({name,passed,severity,explanation:explanation.slice(0,1200)});
 const guard=async(name:string,fn:()=>Promise<void>|void)=>{try{await fn();}catch(e){add(name,false,e instanceof Error?e.message:String(e));}};
 const assert:(test:unknown,message:string)=>asserts test=(test,message)=>{if(!test)throw new Error(message);};
 const parse=(s:unknown)=>{assert(typeof s==='string'&&Buffer.byteLength(s as string)<=MAX_JSON,'JSON row exceeds size bound or is not text');return JSON.parse(s as string) as Row;};
 const rows:Record<string,Row[]>={};const bases:Record<string,string>={};
 let base:string;try{base=await realpath(resolve(dataRoot));assert((await stat(base)).isDirectory(),'Data root must be a pre-existing directory');}catch(e){add('data-root',false,String(e));return report;}
 report.dataRoot=base;
 const exists=async(p:string)=>{try{await lstat(p);return true;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e;}};
 let workflowBase=join(base,'workflow');
 await guard('workflow-layout',async()=>{if(await exists(join(base,'workflow.sqlite'))){assert(!await exists(join(workflowBase,'workflow.sqlite')),'Ambiguous direct and nested workflow stores');workflowBase=base;}});
 add('snapshot-boundary',true,'Each SQLite file uses a consistent read transaction; separate databases and artifact files are not one atomic snapshot. Concurrent changes are reported, never repaired.','warning');
 const pending:{db:DatabaseSync;info:Row;version:number;temporary:string;sourceFiles:{path:string;hash:string}[]}[]=[];let sqlBytes=0;
 for(const kind of Object.keys(layouts)){
  const directory=kind==='jobs'?base:workflowBase,p=join(directory,kind+'.sqlite');const info:Row={kind,path:p,present:false};databases.push(info);bases[kind]=directory;
  await guard('database:'+kind,async()=>{
   if(!await exists(p)){info.status='absent';return;}info.present=true;
   assert((await lstat(p)).isFile(),'Database must be a regular file, not a link or device');const target=await realpath(p);assert(inside(base,target),'Database real path escapes audited root');
   // Opening even a readOnly WAL database can create source -wal/-shm files.
   // Copy stable, bounded main+WAL bytes first; SQLite may create sidecars only in scratch.
   const temporary=await mkdtemp(join(tmpdir(),'gve-operations-audit-'));let db:DatabaseSync|undefined,retained=false;const sourceFiles:{path:string;hash:string}[]=[];
   try{
    for(const source of [target,target+'-wal']){if(!await exists(source))continue;assert((await lstat(source)).isFile(),'Snapshot source must be a regular file');assert(inside(base,await realpath(source)),'Snapshot source escapes data root');const before=await stat(source);assert(before.size<=128_000_000,'SQLite snapshot exceeds 128MB file bound');const bytes=await readFile(source);const after=await stat(source);assert(bytes.length===before.size&&before.size===after.size&&before.mtimeMs===after.mtimeMs,'SQLite source changed during capture');sourceFiles.push({path:source,hash:sha256(bytes)});await writeFile(join(temporary,kind+'.sqlite'+(source.endsWith('-wal')?'-wal':'')),bytes,{flag:'wx'});}
    db=new DatabaseSync(join(temporary,kind+'.sqlite'),{readOnly:true});
    db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=1000;');const before=Number(db.prepare('PRAGMA data_version').get()!.data_version);db.exec('BEGIN');
    info.capturedAt=new Date().toISOString();info.snapshotMethod='bounded-stable-main-and-WAL-copy; readonly SQLite scratch connection';const schemaSize=db.prepare("SELECT COUNT(*) AS n,COALESCE(SUM(length(CAST(sql AS BLOB))),0) AS bytes FROM sqlite_schema").get()!;assert(Number(schemaSize.n)<=1000&&Number(schemaSize.bytes)<=1_000_000,'Schema text/count bound exceeded');const schema=db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    info.userVersion=Number(db.prepare('PRAGMA user_version').get()!.user_version);info.schemaSha256=sha256(canonical(schema));info.schema=schema;
    const withUsage=kind==='tasks'&&info.userVersion===TASKS_DB_VERSION,withRepairs=kind==='production'&&info.userVersion===PRODUCTION_DB_VERSION;
    assert(kind==='tasks'?[0,TASKS_DB_VERSION].includes(info.userVersion):kind==='production'?[0,PRODUCTION_DB_VERSION].includes(info.userVersion):info.userVersion===1,'Unsupported '+kind+' user_version '+info.userVersion);
    const layout:Record<string,string[]>=withUsage?{...layouts[kind],usage_events:['seq','id','task_id','attempt','phase','data']}:withRepairs?{...layouts[kind],repair_scopes:['id','project_id','plan_revision','data'],repair_rounds:['id','scope_id','request_id','round','data']}:layouts[kind]!;
    if(withRepairs)validateProductionSchema(db,1);
    const historyTriggers=withUsage?[...triggers[kind]!,'usage_update_forbidden','usage_delete_forbidden']:triggers[kind]!;
    const actual=schema.filter(s=>s.type==='table').map(s=>s.name).sort();assert(canonical(actual)===canonical(Object.keys(layout).sort()),'Unsupported table layout');
    for(const name of historyTriggers){const [table,operation,message,when]=triggerDefinitions[name]!;const expected=`CREATE TRIGGER ${name} BEFORE ${operation} ON ${table}${when?' WHEN '+when:''} BEGIN SELECT RAISE(ABORT,'${message}'); END`;assert(schema.some(s=>s.type==='trigger'&&s.name===name&&normalizedSql(s.sql)===normalizedSql(expected)),'Missing/unsupported history-preservation trigger '+name);}
    for(const[t,columns]of Object.entries(layout)){const metadata=db.prepare('PRAGMA table_info('+t+')').all(),key=kind+'.'+t;assert(canonical(metadata.map(c=>c.name))===canonical(columns),'Unsupported column layout '+t);for(const c of metadata){const index=primaryKeys[key]!.indexOf(c.name as string);assert(c.type===((c.name==='seq'||(key==='tasks.usage_events'&&c.name==='attempt')||(key==='production.repair_rounds'&&c.name==='round'))?'INTEGER':'TEXT')&&Number(c.pk)===(index<0?0:index+1)&&Number(c.notnull)===(required[key]!.includes(c.name as string)?1:0)&&c.dflt_value===null,'Unsupported column constraints '+key+'.'+c.name);}const fk=db.prepare('PRAGMA foreign_key_list('+t+')').all().map(f=>[f.from,f.table,f.to]);const order=(a:unknown,b:unknown)=>canonical(a).localeCompare(canonical(b));assert(canonical(fk.sort(order))===canonical((expectedForeignKeys[key]??[]).slice().sort(order)),'Unsupported foreign-key layout '+key);if(key==='jobs.jobs'){const indexes=db.prepare('PRAGMA index_list(jobs)').all();assert(indexes.some(i=>Number(i.unique)===1&&canonical(db!.prepare('SELECT name FROM pragma_index_info(?) ORDER BY seqno').all(String(i.name)).map(c=>c.name))===canonical(['fingerprint'])),'Missing unique job fingerprint constraint');}}
    if(withUsage){
      const tableSql=USAGE_SCHEMA_SQL.match(/CREATE TABLE usage_events[^;]+;/)?.[0].replace(/;$/,'');
      assert(tableSql&&schema.some(s=>s.type==='table'&&s.name==='usage_events'&&normalizedSql(s.sql)===normalizedSql(tableSql)),'Unsupported usage ledger table constraints');
      for(const sql of USAGE_SCHEMA_SQL.match(/CREATE UNIQUE INDEX [^;]+;/g)??[]){const name=sql.match(/CREATE UNIQUE INDEX (\w+)/)?.[1];assert(name&&schema.some(s=>s.type==='index'&&s.name===name&&normalizedSql(s.sql)===normalizedSql(sql.replace(/;$/,''))),'Missing/unsupported usage boundary index '+name);}
      const indexes=db.prepare('PRAGMA index_list(usage_events)').all();assert(indexes.some(i=>Number(i.unique)===1&&canonical(db!.prepare('SELECT name FROM pragma_index_info(?) ORDER BY seqno').all(String(i.name)).map(c=>c.name))===canonical(['id'])),'Missing unique usage receipt identity');
    }
    const health=db.prepare('PRAGMA quick_check').all();info.quickCheck=health;assert(health.length===1&&Object.values(health[0]!)[0]==='ok','SQLite quick_check failed');const fk=db.prepare('PRAGMA foreign_key_check').all();info.foreignKeyErrors=fk;assert(!fk.length,'Declared foreign-key violation');
    info.rowCounts={};const content:Row={};
    for(const t of Object.keys(layout)){const count=Number(db.prepare('SELECT COUNT(*) AS n FROM '+t).get()!.n);assert(count<=MAX_ROWS,'Row bound exceeded for '+t);const expression=layout[t]!.map(c=>'COALESCE(length(CAST('+c+' AS BLOB)),0)').join('+');const bytes=Number(db.prepare('SELECT COALESCE(SUM('+expression+'),0) AS n FROM '+t).get()!.n);sqlBytes+=bytes;assert(sqlBytes<=32_000_000,'Aggregate SQLite row byte bound exceeded');const values=db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all() as Row[];info.rowCounts[t]=values.length;rows[kind+'.'+t]=values;content[t]=values;}
    info.logicalSnapshotSha256=sha256(canonical(content));info.status='read';pending.push({db,info,version:before,temporary,sourceFiles});retained=true;
   }finally{if(!retained){try{db?.exec('ROLLBACK');}catch{}db?.close();assert(inside(resolve(tmpdir()),temporary),'Unsafe snapshot cleanup target');await rm(temporary,{recursive:true,force:true,maxRetries:3});}}
  });
 }
 for(const {db,info,version,temporary,sourceFiles}of pending){await guard('snapshot:'+info.kind,async()=>{try{db.exec('COMMIT');const after=Number(db.prepare('PRAGMA data_version').get()!.data_version);for(const f of sourceFiles){assert(inside(base,await realpath(f.path)),'Source path changed during snapshot');const s=await stat(f.path);assert(s.size<=128_000_000,'Snapshot source grew beyond bound');assert(sha256(await readFile(f.path))===f.hash,'Database/WAL changed during cross-store capture; rerun when idle');}const main=sourceFiles[0]!.path;assert(await exists(main+'-wal')===sourceFiles.some(f=>f.path===main+'-wal'),'WAL presence changed during capture');info.finishedAt=new Date().toISOString();info.changedDuringRead=after!==version;assert(after===version,'Scratch snapshot unexpectedly changed');}finally{db.close();assert(inside(resolve(tmpdir()),temporary),'Unsafe snapshot cleanup target');await rm(temporary,{recursive:true,force:true,maxRetries:3});}});}
 add('store-coverage',databases.some(d=>d.status==='read'),'At least one supported pre-existing database is required');
 const parsed:Record<string,Row[]>={};
 for(const[key,values]of Object.entries(rows)){
  parsed[key]=[];
  for(let i=0;i<values.length;i++){const raw=values[i]!;await guard('record:'+key+':'+i,()=>{let value:Row=raw;if('data'in raw)value={...raw,value:parse(raw.data)};else if('outputs'in raw)value={...raw,value:parse(raw.outputs)};else if('detail'in raw)value={...raw,value:parse(raw.detail)};parsed[key]!.push(value);});}
 }
 const get=(key:string)=>parsed[key]??[];
 const verified=new Map<string,Row>();let bytesRead=0,nodes=0;
 const readArtifact=async(a:unknown,kind:string,where:string,depth=0):Promise<any>=>{
  const v=ArtifactSchema.parse(a);assert(v.id===v.sha256,'Artifact id differs from sha256');const expected=`${v.sha256.slice(0,2)}/${v.sha256}.${extension(v.mediaType)}`;assert(v.storage===expected,'Artifact storage does not match content address');
  const directory=bases[kind]!,p=join(directory,'artifacts',...expected.split('/')),key=directory+':'+expected;
  const prior=verified.get(key);if(prior){assert(prior.bytes===v.bytes,'Conflicting declared artifact lengths');return prior.value;}
  assert(verified.size<MAX_ARTIFACTS,'Artifact count bound exceeded');assert(depth<=12,'Artifact nesting depth exceeded');
  const target=await realpath(p),cas=resolve(directory,'artifacts');assert(inside(cas,target)&&inside(base,target),'Artifact real path escapes its content store or audited root');assert((await lstat(p)).isFile(),'Artifact must be a regular non-link file');
  const handle=await open(p,'r');let payload:any;let total=0;const json:Buffer[]=[];
  try{const first=await handle.stat();assert(first.isFile()&&first.size>0&&first.size<=MAX_BLOB,'Artifact size is empty or exceeds bound');assert(first.size===v.bytes,'Artifact size differs from declared bytes');assert(bytesRead+first.size<=MAX_BYTES,'Aggregate artifact byte bound exceeded');const digest=createHash('sha256');const buffer=Buffer.alloc(65536);
   for(;;){const n=(await handle.read(buffer,0,buffer.length,null)).bytesRead;if(!n)break;total+=n;assert(total<=v.bytes,'Artifact grew during read');digest.update(buffer.subarray(0,n));if(v.mediaType==='application/json'){assert(total<=MAX_JSON,'JSON artifact exceeds document bound');json.push(Buffer.from(buffer.subarray(0,n)));}}
   const last=await handle.stat();assert(last.size===first.size&&last.mtimeMs===first.mtimeMs&&total===v.bytes,'Artifact changed while reading');assert(digest.digest('hex')===v.sha256,'Artifact SHA-256 mismatch');bytesRead+=total;if(v.mediaType==='application/json')payload=JSON.parse(Buffer.concat(json).toString('utf8'));
  }finally{await handle.close();}
  const entry:Row={sha256:v.sha256,storage:v.storage,bytes:v.bytes,store:directory,verified:true,where,value:payload};verified.set(key,entry);artifacts.push({sha256:v.sha256,storage:v.storage,bytes:v.bytes,store:directory,verified:true});
  if(payload!==undefined)await walk(payload,kind,where+'>'+v.sha256,depth+1);return payload;
 };
 const walk=async(value:any,kind:string,where:string,depth=0):Promise<void>=>{assert(++nodes<=200000,'JSON traversal node bound exceeded');assert(depth<=40,'JSON nesting bound exceeded');if(!value||typeof value!=='object')return;
  if('storage'in value||'producingStage'in value){await readArtifact(value,kind,where,depth);return;}
  for(const[k,v]of Object.entries(value))await walk(v,kind,where+'.'+k,depth+1);
 };
 for(const[key,values]of Object.entries(parsed))for(let i=0;i<values.length;i++)if(values[i]!.value!==undefined)await guard('artifacts:'+key+':'+i,()=>walk(values[i]!.value,key.split('.')[0]!,key+':'+i));
 for(const row of get('jobs.jobs'))await guard('job:'+row.id,()=>{const j=JobSchema.parse(row.value);assert(row.id===j.id&&row.fingerprint===j.inputFingerprint,'Job SQL/JSON identity mismatch');assert(j.inputFingerprint===sha256(canonical({spec:j.spec,environment:j.environment})),'Job input fingerprint mismatch');date.parse(j.createdAt);date.parse(j.updatedAt);assert(j.status==='running'?!!j.owner&&j.leaseUntil>0:!j.owner&&j.leaseUntil===0,'Job ownership state mismatch');jobs.push({id:j.id,status:j.status,environment:j.environment,inputFingerprint:j.inputFingerprint,error:j.error});if(j.status==='running')owners.push({kind:'job',id:j.id,owner:j.owner,leaseUntil:j.leaseUntil,expired:j.leaseUntil<=Date.now()});});
 for(const row of get('jobs.steps'))await guard('step:'+row.job_id+':'+row.stage,()=>{const s=JobStepSchema.parse(row.value);assert(row.job_id===s.jobId&&row.stage===s.stage,'Step SQL/JSON identity mismatch');assert(get('jobs.jobs').some(j=>j.id===s.jobId),'Step job missing');date.parse(s.startedAt);if(s.finishedAt)date.parse(s.finishedAt);assert(s.status==='running'?!s.finishedAt:!!s.finishedAt,'Step terminal timestamp mismatch');});
 for(const row of get('jobs.cache'))await guard('cache:'+row.fingerprint,()=>{Hash.parse(row.fingerprint);const list=z.array(ArtifactSchema).parse(row.value);assert(get('jobs.steps').some(s=>s.value.status==='succeeded'&&s.value.inputFingerprint===row.fingerprint&&canonical(s.value.outputs)===canonical(list)),'Cache entry lacks matching committed producer outputs');});
 for(const row of get('jobs.jobs'))await guard('job-stages:'+row.id,async()=>{
  const j=JobSchema.parse(row.value),done=get('jobs.steps').filter(s=>s.job_id===j.id&&s.value.status==='succeeded');
  if(j.status==='succeeded')assert(STAGES.every(stage=>done.some(s=>s.stage===stage)),'Succeeded job lacks committed stages');
  const outputs=new Map<string,any[]>();
  for(const stage of STAGES){
   const s=done.find(s=>s.stage===stage)?.value;if(!s)continue;
   const hashes=(key:string)=>(outputs.get(key)??[]).map(a=>a.sha256);
   const dependency=stage==='VALIDATE'?j.spec:stage==='RESOLVE_ASSETS'?j.spec.assets:stage==='RENDER'?{spec:hashes('VALIDATE'),assets:hashes('RESOLVE_ASSETS')}:stage==='VERIFY_MEDIA'?{render:hashes('RENDER'),video:j.spec.video,scenes:j.spec.scenes.map(s=>s.durationFrames),audio:j.spec.audio}:{job:j.id,prior:[...outputs.entries()].map(([key,list])=>[key,list.map(a=>a.sha256)])};
   assert(s.inputFingerprint===sha256(canonical({stage,dependency,environment:stage==='RESOLVE_ASSETS'?{resolver:'png-v1'}:j.environment})),'Committed '+stage+' dependency fingerprint mismatch');
   if(stage==='VALIDATE'){
    assert(s.outputs.length===1,'VALIDATE must commit one canonical spec');
    assert(canonical(await readArtifact(s.outputs[0],'jobs','validated-spec'))===canonical(j.spec),'Committed VALIDATE payload differs from job spec');
   }else if(stage==='RESOLVE_ASSETS'){
    assert(s.outputs.length===j.spec.assets.length+1,'RESOLVE_ASSETS output count differs from declared assets');
    const map=await readArtifact(s.outputs.at(-1),'jobs','resolved-assets');
    assert(map&&typeof map==='object'&&!Array.isArray(map)&&canonical(Object.keys(map).sort())===canonical(j.spec.assets.map(a=>a.id).sort()),'Resolved asset map identities differ from spec');
    for(const a of j.spec.assets){const ref=ArtifactSchema.parse(map[a.id]);assert(ref.sha256===a.sha256&&ref.mediaType===a.mediaType&&s.outputs.slice(0,-1).some((v:Row)=>canonical(v)===canonical(ref)),'Resolved asset map differs from declared hash or committed outputs');}
   }else if(stage==='RENDER'){
    assert(s.outputs.length===1&&s.outputs[0].mediaType==='video/mp4','RENDER must commit one MP4 reference');
   }else if(stage==='VERIFY_MEDIA'){
    assert(s.outputs.length===1,'VERIFY_MEDIA must commit one evaluation');
    const evaluation=EvaluationResultSchema.parse(await readArtifact(s.outputs[0],'jobs','media-evaluation')),video=outputs.get('RENDER')?.[0];
    assert(video&&evaluation.artifact===video.sha256,'Evaluation target differs from committed render artifact');
    assert(evaluation.passed&&evaluation.checks.every(c=>c.severity!=='error'||c.passed),'Succeeded VERIFY_MEDIA has failing evaluation checks');
   }else{
    assert(s.outputs.length===1,'PUBLISH must commit one manifest');
    const manifest=await readArtifact(s.outputs[0],'jobs','publication');
    assert(manifest?.schemaVersion==='1.0'&&manifest.jobId===j.id&&manifest.inputFingerprint===j.inputFingerprint&&canonical(manifest.environment)===canonical(j.environment)&&canonical(manifest.project)===canonical(j.spec.project)&&canonical(manifest.evidence)===canonical(j.spec.evidenceReferences),'Publication manifest job/input/environment/evidence binding mismatch');
    assert(canonical(manifest.artifacts)===canonical(Object.fromEntries(outputs)),'Publication manifest differs from committed stage outputs');
   }
   outputs.set(stage,s.outputs);
  }
 });
 for(const row of get('tasks.tasks'))await guard('task:'+row.id,()=>{const t=Task.parse(row.value);assert(row.id===t.id&&t.id===sha256(canonical({version:'production-task-v1',kind:t.kind,input:t.input})),'Task SQL/JSON identity or input fingerprint mismatch');assert(t.input!==null&&typeof t.input==='object'&&!Array.isArray(t.input),'Task input must be an object');assert(t.state==='running'?!t.result&&!t.error&&!t.finishedAt&&t.leaseUntil>0:!!t.finishedAt&&t.leaseUntil===0,'Task terminal/ownership state mismatch');assert(t.state==='succeeded'?!!t.result&&!t.error:t.state==='running'||!!t.error,'Task result/error state mismatch');const input=t.input as Row;tasks.push({id:t.id,kind:t.kind,state:t.state,attempt:t.attempt,scopeKey:t.scopeKey??(input.packageHash?`${t.kind}:${input.packageHash}`:null),projectId:input.projectId,packageHash:input.packageHash,environment:input.environment,error:t.error,startedAt:t.startedAt,finishedAt:t.finishedAt,latestAttemptElapsedMs:t.finishedAt?Date.parse(t.finishedAt)-Date.parse(t.startedAt):null,elapsedCoverage:'latest-attempt-only',historicalCacheHits:null});if(t.state==='running')owners.push({kind:'task',id:t.id,owner:t.owner,leaseUntil:t.leaseUntil,expired:t.leaseUntil<=Date.now()});});
 const sourceMap=new Map<string,Row>(),revisionMap=new Map<string,Row>(),packageMap=new Map<string,Row>();
 for(const row of get('workflow.sources'))await guard('source:'+row.hash,async()=>{const r=Source.parse(row.value),s=validateSnapshot(await readArtifact(r.artifact,'workflow','source'));assert(row.hash===r.hash&&sourceFingerprint(s)===r.hash,'Source row/content fingerprint mismatch');sourceMap.set(r.hash,s);});
 for(const row of get('workflow.revisions'))await guard('revision:'+row.hash,async()=>{const r=Revision.parse(row.value),p=await readArtifact(r.artifact,'workflow','revision');assert(row.hash===r.hash&&row.project_id===r.projectId&&sha256(canonical(p))===r.hash&&p.snapshotHash===r.snapshotHash,'Revision SQL/JSON/payload binding mismatch');const source=sourceMap.get(r.snapshotHash);assert(source,'Revision source missing');const plan=validatePlan(p.plan,source as any,r.snapshotHash);assert(plan.projectId===r.projectId,'Plan project mismatch');revisionMap.set(r.hash,{...r,plan});versions.push({kind:'revision',hash:r.hash,projectId:r.projectId,snapshotHash:r.snapshotHash});});
 for(const row of get('workflow.projects'))await guard('project:'+row.id,()=>{const p=Project.parse(row.value);assert(row.id===p.id,'Project SQL/JSON identity mismatch');assert(sourceMap.has(p.snapshotHash),'Project source missing');if(p.currentRevision){const r=revisionMap.get(p.currentRevision);assert(r?.projectId===p.id&&r.snapshotHash===p.snapshotHash,'Current revision source/project mismatch');}versions.push({kind:'project-selection',projectId:p.id,snapshotHash:p.snapshotHash,currentRevision:p.currentRevision});});
 for(const row of get('production.packages'))await guard('package:'+row.hash,async()=>{const r=Package.parse(row.value),design=await readArtifact(r.artifact,'production','package');assert(row.hash===r.hash&&sha256(canonical(design))===r.hash&&design.projectId===r.projectId&&design.planRevision===r.planRevision,'Package SQL/JSON/payload fingerprint mismatch');let legacy=false;const result=ProductionPackageSchema.safeParse(design);if(!result.success){const without=structuredClone(design);without.authorization??={};without.authorization.motionAudioScriptId='legacy-unselected-line';const historical=!get('production.selected').some(s=>s.hash===r.hash);assert(historical&&design.authorization?.motionAudioScriptId===undefined&&ProductionPackageSchema.safeParse(without).success,'Package shape is invalid for current schema');legacy=true;add('legacy-package:'+r.hash,true,'Intact historical schemaVersion1.0 package predates required motionAudioScriptId; not eligible for current production.','warning');}
 const rev=revisionMap.get(r.planRevision);assert(rev?.projectId===r.projectId,'Package revision missing or belongs to another project');const measured=ReadthroughSchema.parse(await readArtifact(design.readthrough,'production','readthrough'));assert(measured.projectId===r.projectId&&measured.planRevision===r.planRevision,'Readthrough binding mismatch');assert(get('tasks.tasks').some(t=>t.value.state==='succeeded'&&t.value.kind==='readthrough'&&t.value.result?.sha256===design.readthrough.sha256),'Readthrough lacks successful task provenance');assert(canonical(measured.lines.map(l=>[l.id,l.text]))===canonical(rev.plan.script.map((s:Row)=>[s.id,s.narration])),'Readthrough differs from script');assert(canonical(design.scenes.map((s:Row)=>[s.scriptId,s.claimIds]))===canonical(rev.plan.script.map((s:Row)=>[s.id,s.claimIds])),'Package scenes differ from script');packageMap.set(r.hash,{...r,design,legacy});versions.push({kind:'package',hash:r.hash,projectId:r.projectId,planRevision:r.planRevision,compatibility:legacy?'legacy-historical':'current'});(report.costs as Row).approvedZeroPolicies.push({packageHash:r.hash,maxPaidUsd:design.authorization.maxPaidUsd});});
 for(const row of get('production.selected'))await guard('selection:'+row.project_id,()=>{const p=packageMap.get(row.hash);assert(p&&p.projectId===row.project_id,'Selected package missing or project mismatch');const current=get('workflow.projects').find(p=>p.id===row.project_id)?.value;versions.push({kind:'package-selection',projectId:row.project_id,packageHash:row.hash,stale:!current||current.currentRevision!==p.planRevision});});
 for(const row of get('tasks.tasks'))await guard('task-links:'+row.id,async()=>{const t=Task.parse(row.value),input=t.input as Row;if(input.projectId)assert(get('workflow.projects').some(p=>p.id===input.projectId),'Task project missing');if(input.planRevision)assert(revisionMap.get(input.planRevision)?.projectId===input.projectId,'Task plan revision/project mismatch');if(input.packageHash)assert(packageMap.get(input.packageHash)?.projectId===input.projectId,'Task package/project mismatch');if(t.state!=='succeeded')return;const manifest=await readArtifact(t.result,'tasks','task-result');let refs:unknown[]|undefined;
  if(t.kind==='readthrough'){const measured=ReadthroughSchema.parse(manifest);assert(measured.projectId===input.projectId&&measured.planRevision===input.planRevision,'Readthrough task result binding mismatch');refs=measured.lines.map(l=>l.audio);}
  else if(t.kind==='style'){assert(manifest?.mode==='style'&&Array.isArray(manifest.frames)&&manifest.contactSheet,'Style manifest shape mismatch');refs=[...manifest.frames,manifest.contactSheet];}
  else if(t.kind==='animatic'||t.kind==='motion'){assert(manifest?.mode===t.kind&&manifest.video&&manifest.evaluation,'Preview manifest shape mismatch');refs=[manifest.video,manifest.evaluation];const evaluation=await readArtifact(manifest.evaluation,'tasks','evaluation');assert(evaluation?.passed===true,'Successful preview has failing/missing evaluation');}
  if(refs)assert(canonical(refs.map(a=>ArtifactSchema.parse(a).sha256))===canonical(t.outputs.map(a=>a.sha256)),'Task manifest references differ from committed outputs');
 });
 for(const[key,schema]of [['workflow.approvals',Approval],['production.production_approvals',ProductionApproval]] as const)for(const row of get(key))await guard('approval:'+key+':'+row.project_id+':'+row.gate,async()=>{const r=schema.parse(row.value) as Row,production=key.startsWith('production'),binding=production?r.packageHash:r.revisionHash;assert(row.project_id===r.projectId&&row.gate===r.gate&&(production?row.package_hash:row.revision_hash)===binding,'Approval SQL/JSON binding mismatch');const target=production?packageMap.get(binding):revisionMap.get(binding);assert(target&&target.projectId===r.projectId,'Approval target missing or belongs to another project');const receipt=await readArtifact(r.artifact,production?'production':'workflow','approval');assert(receipt.projectId===r.projectId&&receipt.gate===r.gate&&(production?receipt.packageHash:receipt.revisionHash)===binding&&receipt.candidateHash===r.candidateHash,'Approval receipt binding mismatch');const candidate=production?receipt.candidate:receipt.reviewBundle?.candidate;assert(candidate&&typeof candidate==='object','Approval candidate receipt missing');const frozenBinding=production?candidate.production:candidate.workflow;assert(frozenBinding?.projectId===r.projectId&&(production?frozenBinding.packageHash===binding&&frozenBinding.planRevision===target.planRevision&&frozenBinding.gate===r.gate:frozenBinding.revisionHash===binding&&frozenBinding.gates?.includes(r.gate)),'Embedded candidate binding mismatch');const project=get('workflow.projects').find(p=>p.id===r.projectId)?.value,selected=get('production.selected').find(p=>p.project_id===r.projectId)?.hash;approvals.push({projectId:r.projectId,gate:r.gate,binding,active:production?selected===binding&&project?.currentRevision===target.planRevision:project?.currentRevision===binding,actor:r.actor,meaning:'recorded historical authority; audit grants no gate',candidateHash:r.candidateHash});});
 const repairDatabase=databases.find(d=>d.kind==='production'&&d.status==='read'&&d.userVersion===PRODUCTION_DB_VERSION);
 if(repairDatabase){
  (report.repairs as Row).ledgerAvailable=true;(report.repairs as Row).status='invalid';
  await guard('repair-ledger',async()=>{
   assert(get('production.repair_scopes').length===(rows['production.repair_scopes']??[]).length&&get('production.repair_rounds').length===(rows['production.repair_rounds']??[]).length,'Malformed repair JSON prevents complete correction coverage');
   const ledger=validateRepairRows(get('production.repair_scopes').map(r=>r.value),get('production.repair_rounds').map(r=>r.value));
   for(const row of get('production.repair_scopes'))assert(row.id===row.value.id&&row.project_id===row.value.projectId&&row.plan_revision===row.value.planRevision,'Repair scope SQL/JSON identity mismatch');
   for(const row of get('production.repair_rounds'))assert(row.id===row.value.id&&row.scope_id===row.value.scopeId&&row.request_id===row.value.requestId&&row.round===row.value.round,'Repair round SQL/JSON identity mismatch');
   const summary:Row[]=[];
   for(const scope of ledger.scopes){
    const plan=revisionMap.get(scope.planRevision),baseline=packageMap.get(scope.baselinePackageHash);
    assert(plan?.projectId===scope.projectId&&baseline?.projectId===scope.projectId&&baseline.planRevision===scope.planRevision&&!baseline.legacy,'Repair scope baseline package/plan is missing, incompatible or belongs to another project');
    assert(scope.maxRounds===plan.plan.budget.maxRevisionRounds,'Repair scope budget differs from its approved immutable plan');
    const g2=get('workflow.approvals').find(r=>r.project_id===scope.projectId&&r.revision_hash===scope.planRevision&&r.gate==='G2');
    assert(g2&&Approval.safeParse(g2.value).success,'Repair scope lacks exact approved G2 plan');
    const g3=get('production.production_approvals').find(r=>r.project_id===scope.projectId&&r.package_hash===scope.baselinePackageHash&&r.gate==='G3');
    assert(g3&&ProductionApproval.safeParse(g3.value).success&&canonical(g3.value.artifact)===canonical(scope.baselineApproval),'Repair scope lacks exact immutable G3 baseline receipt');
    const receipt=await readArtifact(scope.baselineApproval,'production','repair-baseline-approval');
    assert(receipt.projectId===scope.projectId&&receipt.planRevision===scope.planRevision&&receipt.packageHash===scope.baselinePackageHash&&receipt.gate==='G3','Repair baseline receipt binding mismatch');
    const rounds=ledger.rounds.filter(r=>r.scopeId===scope.id).sort((a,b)=>a.round-b.round);
    for(const round of rounds){
     const parent=packageMap.get(round.parentHash),next=packageMap.get(round.nextHash);
     assert(parent&&!parent.legacy&&next&&!next.legacy&&parent.projectId===scope.projectId&&next.projectId===scope.projectId&&parent.planRevision===scope.planRevision&&next.planRevision===scope.planRevision,'Repair round package provenance mismatch');
     const index=parent.design.scenes.findIndex((s:Row)=>s.id===round.request.sceneId);assert(index>=0,'Repair scene is absent from its parent package');
     const proposed=structuredClone(parent.design);Object.assign(proposed.scenes[index],round.request.replacement);ProductionPackageSchema.parse(proposed);
     assert(canonical(proposed)===canonical(next.design),'Repair changes fields outside its declared single-scene replacement');
     const evidence=round.request.issue.evidence;
     assert(['image/png','video/mp4'].includes(evidence.mediaType),'Repair observed issue evidence must reference committed image/video');
     assert(get('tasks.tasks').some(t=>t.value.state==='succeeded'&&['style','animatic','motion'].includes(t.value.kind)&&t.value.input?.projectId===scope.projectId&&t.value.input?.packageHash===round.parentHash&&t.value.outputs?.some((a:unknown)=>canonical(a)===canonical(evidence))),'Repair issue evidence lacks a matching committed parent-package task output');
     assert(round.diff.mediaType==='application/json'&&round.diff.producingStage==='VALIDATE'&&round.diff.inputFingerprint===round.nextHash,'Repair diff artifact metadata binding mismatch');
     const observed=await readArtifact(round.diff,'production','repair-diff'),expected=diffRevisions('production',parent.design,next.design);
     assert(canonical(observed)===canonical(expected),'Repair diff payload differs from the complete canonical package difference');
     versions.push({kind:'repair-round',scopeId:scope.id,round:round.round,requestId:round.requestId,parentHash:round.parentHash,nextHash:round.nextHash,projectId:scope.projectId});
    }
    const selected=get('production.selected').find(r=>r.project_id===scope.projectId),selectedPackage=selected&&packageMap.get(selected.hash);
    if(selectedPackage?.planRevision===scope.planRevision)assert(selected!.hash===rounds.at(-1)!.nextHash,'Selected package bypasses the latest committed repair chain');
    const current=get('workflow.projects').find(p=>p.id===scope.projectId)?.value;
    if(current?.currentRevision===scope.planRevision)assert(selected?.hash===rounds.at(-1)!.nextHash,'Current scoped plan has no matching latest repair selection');
    summary.push({scopeId:scope.id,projectId:scope.projectId,planRevision:scope.planRevision,baselinePackageHash:scope.baselinePackageHash,maxRounds:scope.maxRounds,consumedRounds:rounds.length,remaining:scope.maxRounds-rounds.length,latestPackageHash:rounds.at(-1)!.nextHash});
   }
   Object.assign(report.repairs as Row,{status:'recorded-scopes-validated',recordedScopes:ledger.scopes.length,recordedRounds:ledger.rounds.length,scopes:summary});
  });
 }
 for(const t of tasks.filter(t=>['animatic','motion'].includes(t.kind))){
  const hash=Hash.safeParse(t.packageHash);
  if(!hash.success){add('scope-binding:'+t.id,false,'Preview task requires a valid package hash before its approved scope can be audited');continue;}
  // ProductionStore authorizes one scope per mode/package. A persisted label is
  // evidence to validate, never an authority to split that approved budget.
  const key=`${t.kind}:${hash.data}`,p=packageMap.get(hash.data);
  add('scope-binding:'+t.id,t.scopeKey===key&&!!p,`Recorded scope must equal ${key} and resolve an approved package; received ${String(t.scopeKey)}`);
  let s=scopes.find(s=>s.key===key);
  if(!s){s={key,kind:t.kind,packageHash:hash.data,attempts:0,approvedMaxAttempts:p?.design.authorization.maxPreviewAttempts??null,taskIds:[],recordedScopeKeys:[]};scopes.push(s);}
  s.attempts+=t.attempt;s.taskIds.push(t.id);if(!s.recordedScopeKeys.includes(t.scopeKey))s.recordedScopeKeys.push(t.scopeKey);
 }
 for(const s of scopes){s.remaining=s.approvedMaxAttempts===null?null:Math.max(0,s.approvedMaxAttempts-s.attempts);if(s.approvedMaxAttempts!==null)add('scope-budget:'+s.key,s.attempts<=s.approvedMaxAttempts,`Recorded ${s.attempts} durable attempts of ${s.approvedMaxAttempts} authorized across environments; cache events add no attempts`);}
 for(const key of ['jobs.events','workflow.events','tasks.task_events']){const values=get(key);for(const row of values)await guard('event:'+key+':'+row.seq,()=>{date.parse(row.at);const parent=key==='jobs.events'?get('jobs.jobs').some(p=>p.id===row.job_id):key==='workflow.events'?get('workflow.projects').some(p=>p.id===row.project_id):get('tasks.tasks').some(p=>p.id===row.task_id);assert(parent,'Event parent missing');});events.push({store:key,count:values.length,types:values.reduce((acc:Row,r)=>{acc[r.type]=(acc[r.type]??0)+1;return acc;},{}),historicalCompleteness:'not-guaranteed'});}
 const usageDatabase=databases.find(d=>d.kind==='tasks'&&d.status==='read'&&d.userVersion===TASKS_DB_VERSION);
 if(usageDatabase){
  (report.costs as Row).ledgerAvailable=true;(report.costs as Row).status='usage-ledger-invalid';
  await guard('usage-ledger',()=>{
   assert(get('tasks.tasks').length===(rows['tasks.tasks']??[]).length&&get('tasks.usage_events').length===(rows['tasks.usage_events']??[]).length,'Malformed task or receipt JSON prevents complete usage coverage');
   const records=get('tasks.tasks').map(r=>Task.parse(r.value)),usageEvents=get('tasks.usage_events').map(row=>{
    const e=UsageEventSchema.parse(row.value);
    assert(Number.isSafeInteger(row.seq)&&row.seq>0&&row.id===e.id&&row.task_id===e.taskId&&row.attempt===e.attempt&&row.phase===e.phase,'Usage receipt SQL/JSON identity mismatch');return e;
   });
   const usage=summarizeUsage(records,usageEvents);
   Object.assign(report.costs as Row,{status:usage.unknownChargeAttempts.length?'usage-ledger-partial':'usage-ledger-covered-provider-fees-only',usage,calculatedProviderFeesUsd:usage.totalProviderChargeMicros===null?null:usage.totalProviderChargeMicros/1_000_000,knownCalculatedProviderFeesUsd:usage.knownProviderChargeMicros/1_000_000,actualPaidUsd:null,preflightCompletesCostAccounting:false});
  });
 }
 await auditFinalizations({get,sourceMap,revisionMap,packageMap,readArtifact,guard,report,scopes});
 report.artifactCoverage={verified:artifacts.length,bytesRead,traversalNodes:nodes};report.runtimeCounts={jobs:jobs.length,tasks:tasks.length,failedTasks:tasks.filter(t=>t.state==='failed').length,cancelledTasks:tasks.filter(t=>t.state==='cancelled').length};
 add('cost-coverage',true,'Supported usage records calculate only explicit offline-provider fees and measured attempt duration; absent policies/history remain unknown. Paid invoices, model/app, license, hardware and human costs are not recorded. A zero budget policy is not a zero project-cost claim.','warning');
 add('approval-proof-boundary',true,'Recorded receipt and embedded candidate bindings are checked; parsed embedded JSON cannot reconstruct the original candidate file whitespace/hash or re-perform independent reviews. Approval records never grant new authority.','warning');
 add('preview-evaluation-target-coverage',true,'M0 evaluations name a render SHA-256 and that binding is checked. Legacy M2 production-ffprobe-v1 payloads do not name a target artifact; their declared manifest/output references and passed flag are checked, but exact evaluator-to-video byte provenance is not independently provable from that payload. No media evaluation is rerun.','warning');
 report.ok=!checks.some(c=>!c.passed&&c.severity==='error');return report;
}
