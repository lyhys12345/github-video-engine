import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {mkdir,mkdtemp,rm,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ArtifactStore} from '../assets/store.js';
import type {Artifact} from '../contracts/runtime.js';
import {EngineError,checkAbort,errorInfo} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {AccountingPolicySchema,UsageEventSchema,summarizeUsage,TASKS_DB_VERSION,TASK_SCHEMA_SQL,USAGE_SCHEMA_SQL,USAGE_LIMITS,type AccountingPolicy,type UsageEvent} from '../operations/usage.js';
export type TaskRecord={id:string;kind:string;input:unknown;scopeKey?:string|null;state:'running'|'succeeded'|'failed'|'cancelled';attempt:number;owner:string;leaseUntil:number;result:Artifact|null;outputs:Artifact[];error:ReturnType<typeof errorInfo>|null;startedAt:string;finishedAt:string|null};
// One durable operation per fingerprint. Separate from M0's fixed five-stage pipeline.
export class TaskRunner{
  readonly db:DatabaseSync;readonly root:string;readonly artifacts:ArtifactStore;
  constructor(root:string){this.root=resolve(root);mkdirSync(this.root,{recursive:true});this.db=new DatabaseSync(join(this.root,'tasks.sqlite'));this.artifacts=new ArtifactStore(this.root);
    try{const version=this.db.prepare('PRAGMA user_version').get()!.user_version as number;
    if(version!==0&&version!==TASKS_DB_VERSION)throw new EngineError('USAGE_DB_VERSION',`Usage accounting: unsupported tasks database version ${version}`);
    this.db.exec('PRAGMA busy_timeout=5000;PRAGMA foreign_keys=ON');
    if(version===0)this.tx(()=>{
      // Another process may have completed the additive migration while this
      // connection waited for the write lock.
      const lockedVersion=this.db.prepare('PRAGMA user_version').get()!.user_version as number;
      if(lockedVersion===TASKS_DB_VERSION){this.validateSchema(1);return;}
      if(lockedVersion!==0)throw new EngineError('USAGE_DB_VERSION',`Usage accounting: unsupported tasks database version ${lockedVersion}`);
      if(this.db.prepare("SELECT name FROM sqlite_master WHERE name='usage_events'").get())throw new EngineError('USAGE_DB_SCHEMA','Usage accounting: unversioned usage table is unsupported');
      for(const [table,expected] of [['tasks',['id','data']],['task_events',['seq','task_id','at','type','data']]] as const){
        const columns=this.db.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name);
        if(columns.length&&canonical(columns)!==canonical(expected))throw new EngineError('USAGE_DB_SCHEMA',`Usage accounting: unknown legacy ${table} schema`);
      }
      this.validateSchema(0);
      this.db.exec(`${TASK_SCHEMA_SQL}
      ${USAGE_SCHEMA_SQL}
      PRAGMA user_version=1;`);
    });
    this.validateSchema(1);
    this.db.exec('PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL');
    }catch(error){this.db.close();throw error;}
  }
  close(){this.db.close();}
  private validateSchema(version:0|1){
    const read=(db:DatabaseSync)=>db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all().map(row=>({type:row.type,name:row.name,sql:String(row.sql).replace(/\s+/g,'').replace(/ifnotexists/ig,'').toLowerCase()}));
    const actual=read(this.db);if(version===0&&actual.length===0)return;
    const reference=new DatabaseSync(':memory:');try{reference.exec(TASK_SCHEMA_SQL+(version===1?USAGE_SCHEMA_SQL:''));if(canonical(actual)!==canonical(read(reference)))throw new EngineError('USAGE_DB_SCHEMA',`Usage accounting: unsupported ${version===0?'legacy':'version 1'} tasks schema, constraints or history-preservation triggers`);}finally{reference.close();}
  }
  private tx<T>(fn:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  get(id:string):TaskRecord|null{const row=this.db.prepare('SELECT data FROM tasks WHERE id=?').get(id);return row?JSON.parse(row.data as string):null;}
  list(){return this.db.prepare('SELECT data FROM tasks ORDER BY rowid DESC').all().map(r=>JSON.parse(r.data as string) as TaskRecord);}
  usage(projectId?:string){this.db.exec('BEGIN');try{const summary=this.usageSnapshot(projectId);this.db.exec('COMMIT');return summary;}catch(error){this.db.exec('ROLLBACK');if(error instanceof EngineError)throw error;throw new EngineError('USAGE_INVALID',`Usage accounting: malformed persisted row: ${error instanceof Error?error.message:String(error)}`);}}
  private usageSnapshot(projectId?:string){let bytes=0;for(const table of ['tasks','usage_events']){const count=this.db.prepare(`SELECT COUNT(*) AS n,COALESCE(SUM(length(CAST(data AS BLOB))),0) AS bytes FROM ${table}`).get()!;bytes+=count.bytes as number;if((count.n as number)>USAGE_LIMITS.rows||bytes>USAGE_LIMITS.bytes)throw new EngineError('USAGE_LIMIT','Usage accounting: row/data byte limit exceeded');}
    const tasks=this.db.prepare('SELECT id,data FROM tasks ORDER BY rowid DESC').all().map(row=>{const task=JSON.parse(row.data as string) as TaskRecord;if(row.id!==task?.id)throw new EngineError('USAGE_INVALID','Usage accounting: task SQL/JSON identity mismatch');return task;});const events=this.db.prepare('SELECT * FROM usage_events ORDER BY seq').all().map(row=>{
    const e=UsageEventSchema.parse(JSON.parse(row.data as string));if(row.id!==e.id||row.task_id!==e.taskId||row.attempt!==e.attempt||row.phase!==e.phase)throw new EngineError('USAGE_INVALID','Usage accounting: receipt columns conflict with data');return e;
  });
    // Validate the entire store before applying a display filter.
    const full=summarizeUsage(tasks,events);if(projectId===undefined)return full;
    const selected=tasks.filter(t=>typeof t.input==='object'&&t.input!==null&&'projectId' in t.input&&t.input.projectId===projectId),ids=new Set(selected.map(t=>t.id));return summarizeUsage(selected,events.filter(e=>ids.has(e.taskId)));
  }
  private receipt(event:UsageEvent){const e=UsageEventSchema.parse(event);this.db.prepare('INSERT INTO usage_events(id,task_id,attempt,phase,data) VALUES(?,?,?,?,?)').run(e.id,e.taskId,e.attempt,e.phase,canonical(e));}
  private startReceipt(record:TaskRecord,policy:AccountingPolicy|null):UsageEvent{return{schemaVersion:'1.0',id:randomUUID(),taskId:record.id,attempt:record.attempt,kind:record.kind,inputFingerprint:record.id,inputVersion:'production-task-v1',owner:record.owner,at:record.startedAt,phase:'started',policy,outcome:null,wallDurationMs:null,providerChargeMicros:null,chargeBasis:'unknown'};}
  private terminalReceipt(start:UsageEvent,outcome:'succeeded'|'failed'|'cancelled'|'interrupted',at:string,duration:number|null){this.receipt({...start,id:randomUUID(),at,phase:'terminal',outcome,wallDurationMs:duration,providerChargeMicros:start.policy?0:null,chargeBasis:start.policy?'calculated-local-provider-fee':'unknown'});}
  private cacheReceipt(record:TaskRecord,phase:'cache_hit'|'cache_failure'){
    const row=this.db.prepare("SELECT data FROM usage_events WHERE task_id=? AND attempt=? AND phase='started'").get(record.id,record.attempt);
    const start=row?UsageEventSchema.parse(JSON.parse(row.data as string)):this.startReceipt(record,null);
    this.receipt({...start,id:randomUUID(),at:new Date().toISOString(),phase,outcome:null,wallDurationMs:0,providerChargeMicros:0,chargeBasis:'cache-no-provider-work'});
  }
  event(id:string,type:string,data:unknown){this.db.prepare('INSERT INTO task_events(task_id,at,type,data) VALUES(?,?,?,?)').run(id,new Date().toISOString(),type,canonical(data));}
  private set(value:TaskRecord){this.db.prepare('INSERT INTO tasks(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(value.id,canonical(value));}
  async run<T>(kind:string,input:unknown,work:(directory:string,signal:AbortSignal)=>Promise<{value:T;outputs:Artifact[]}>,signal:AbortSignal,limits:{attempts?:number;timeoutMs?:number;leaseMs?:number;scopeKey?:string;maxScopeAttempts?:number;accounting?:AccountingPolicy;beforeDiscardTemporary?:(directory:string)=>Promise<void>}={}){
    checkAbort(signal);const parsedPolicy=limits.accounting===undefined?null:AccountingPolicySchema.safeParse(limits.accounting);
    if(parsedPolicy!==null&&!parsedPolicy.success)throw new EngineError('USAGE_POLICY','Usage accounting: only explicit windows-sapi-offline/remotion-local local-zero-v1 policies are supported');
    const policy=parsedPolicy?.data??null,id=sha256(canonical({version:'production-task-v1',kind,input}));
    const ttl=limits.leaseMs??15000,maxAttempts=limits.attempts??2;
    const owner=randomUUID();let cached:TaskRecord|null=null,start!:UsageEvent;let observedStart=0;
    this.tx(()=>{const previous=this.get(id);if(previous?.state==='succeeded'){cached=previous;return;}
      if(previous?.state==='running'&&previous.leaseUntil>Date.now())throw new EngineError('TASK_BUSY',`Task ${id} is owned until ${new Date(previous.leaseUntil).toISOString()}`,'retryable');
      if(previous?.state==='failed'&&previous.error?.classification==='permanent')throw new EngineError('TASK_PERMANENT_FAILURE',`Task ${id} failed permanently: ${previous.error.message}. Correct the input before retrying.`);
      if((previous?.attempt??0)>=maxAttempts)throw new EngineError('RETRY_EXHAUSTED',`Task ${id} used its ${maxAttempts} total attempts; correct inputs or inspect the failure`);
      if(limits.scopeKey){
        // All fingerprints in one approved scope share a durable budget. Same DB transaction
        // as ownership claim prevents concurrent environment revisions spending it twice.
        // The fallback counts pre-scope production records conservatively during upgrade.
        const spent=this.db.prepare("SELECT COALESCE(SUM(json_extract(data,'$.attempt')),0) AS n FROM tasks WHERE COALESCE(json_extract(data,'$.scopeKey'),json_extract(data,'$.kind')||':'||json_extract(data,'$.input.packageHash'))=?").get(limits.scopeKey)!.n as number;
        if(spent>=(limits.maxScopeAttempts??maxAttempts))throw new EngineError('PREVIEW_BUDGET',`Approved scope ${limits.scopeKey} used its ${limits.maxScopeAttempts??maxAttempts} total attempts across all environments`);
      }
      if(previous?.state==='running'){
        const abandoned=this.db.prepare("SELECT data FROM usage_events WHERE task_id=? AND attempt=? AND phase='started' AND NOT EXISTS(SELECT 1 FROM usage_events terminal WHERE terminal.task_id=? AND terminal.attempt=? AND terminal.phase='terminal')").get(id,previous.attempt,id,previous.attempt);
        if(abandoned)this.terminalReceipt(UsageEventSchema.parse(JSON.parse(abandoned.data as string)),'interrupted',new Date().toISOString(),null);
      }
      const record:TaskRecord={id,kind,input,scopeKey:limits.scopeKey??null,state:'running',attempt:(previous?.attempt??0)+1,owner,leaseUntil:Date.now()+ttl,result:null,outputs:[],error:null,startedAt:new Date().toISOString(),finishedAt:null};this.set(record);this.event(id,previous?'task_resumed':'task_started',{attempt:record.attempt,owner});
      start=this.startReceipt(record,policy);this.receipt(start);observedStart=performance.now();
    });
    if(cached){const prior=cached as TaskRecord;let value:T;try{for(const blob of [...prior.outputs,prior.result!])await this.artifacts.verify(blob);value=await this.artifacts.readJson<T>(prior.result!);}catch(error){this.tx(()=>this.cacheReceipt(prior,'cache_failure'));throw error;}this.tx(()=>this.cacheReceipt(prior,'cache_hit'));return{id,cached:true,value,outputs:prior.outputs};}
    const control=new AbortController();const abort=()=>control.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
    const timer=setTimeout(()=>control.abort(new EngineError('TIMEOUT',`${kind} exceeded bounded deadline`,'retryable')),limits.timeoutMs??240000);
    const heartbeat=setInterval(()=>{try{this.tx(()=>{const record=this.get(id)!;if(record.owner!==owner||record.state!=='running')throw new EngineError('TASK_FENCED','Task ownership changed');record.leaseUntil=Date.now()+ttl;this.set(record);});}catch(e){control.abort(e);}},Math.min(1000,ttl/3));
    let directory:string|undefined;
    try{
      const tmp=join(this.root,'tmp');await mkdir(tmp,{recursive:true});for(const name of await readdir(tmp))if(name.startsWith(`${id}-`)){const stale=join(tmp,name);await limits.beforeDiscardTemporary?.(stale);await rm(stale,{recursive:true,force:true,maxRetries:3});}
      directory=await mkdtemp(join(tmp,`${id}-`));const result=await work(directory,control.signal);checkAbort(control.signal);
      for(const blob of result.outputs)await this.artifacts.verify(blob);
      const artifact=await this.artifacts.commit(canonical(result.value),'application/json','PUBLISH',id);checkAbort(control.signal);
      this.tx(()=>{const record=this.get(id)!;if(record.owner!==owner||record.state!=='running'||record.leaseUntil<Date.now())throw new EngineError('TASK_FENCED','Cannot commit after losing task ownership');record.state='succeeded';record.result=artifact;record.outputs=result.outputs;record.leaseUntil=0;record.finishedAt=new Date().toISOString();this.set(record);this.event(id,'task_succeeded',{result:artifact.sha256});this.terminalReceipt(start,'succeeded',record.finishedAt,performance.now()-observedStart);});
      return{id,cached:false,value:result.value,outputs:result.outputs};
    }catch(error){this.tx(()=>{const record=this.get(id)!;if(record.owner===owner&&record.state==='running'&&record.leaseUntil>=Date.now()){record.state=errorInfo(error).classification==='cancelled'?'cancelled':'failed';record.error=errorInfo(error);record.finishedAt=new Date().toISOString();record.leaseUntil=0;this.set(record);this.event(id,'task_failed',record.error);this.terminalReceipt(start,record.state,record.finishedAt,performance.now()-observedStart);}});throw error;
    }finally{clearTimeout(timer);clearInterval(heartbeat);signal.removeEventListener('abort',abort);if(directory){await limits.beforeDiscardTemporary?.(directory);await rm(directory,{recursive:true,force:true,maxRetries:3,retryDelay:100});}}
  }
}
