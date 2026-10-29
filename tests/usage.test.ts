import {test,expect,afterEach} from 'vitest';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {TaskRunner} from '../src/orchestrator/tasks.js';
import {AccountingPolicySchema,UsageEventSchema,summarizeUsage,type UsageEvent} from '../src/operations/usage.js';
import {EngineError} from '../src/core/errors.js';
import {canonical} from '../src/core/util.js';
const runners:TaskRunner[]=[],directories:string[]=[];
const signal=()=>new AbortController().signal;
const accounting={provider:'windows-sapi-offline',ratePolicy:'local-zero-v1'} as const;
const local=async()=>({value:{simulatedCallback:true},outputs:[]});
async function make(){const root=await mkdtemp(join(tmpdir(),'gve-usage-'));directories.push(root);const r=new TaskRunner(root);runners.push(r);return r;}
function events(r:TaskRunner):UsageEvent[]{return r.db.prepare('SELECT data FROM usage_events ORDER BY seq').all().map(row=>JSON.parse(row.data as string));}
afterEach(async()=>{for(const r of runners.splice(0))r.close();for(const root of directories.splice(0)){const rel=relative(resolve(tmpdir()),resolve(root));if(isAbsolute(rel)||rel==='..'||rel.startsWith('..')||!basename(root).startsWith('gve-usage-'))throw new Error('Unsafe test cleanup path');await rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:50});}});

test('real SQLite/CAS: explicit offline charges, generic unknown, cache hits/failure are distinct (simulated callbacks)',async()=>{
  const r=await make();let calls=0;const work=async()=>{calls++;return local();};
  const first=await r.run('offline',{projectId:'p'},work,signal(),{accounting});
  await r.run('offline',{projectId:'p'},work,signal(),{accounting});await r.run('offline',{projectId:'p'},work,signal());
  expect(calls).toBe(1);expect(r.get(first.id)!.attempt).toBe(1);
  expect(r.usage('p')).toMatchObject({totalAttempts:1,recordedAttempts:1,terminalAttempts:1,knownChargeAttempts:1,totalProviderChargeMicros:0,cacheHits:2,cacheFailures:0,unknownDurationAttempts:0});
  const generic=await r.run('generic',{projectId:'unknown'},local,signal());expect(r.usage()).toMatchObject({totalAttempts:2,knownProviderChargeMicros:0,totalProviderChargeMicros:null});
  expect(events(r).find(e=>e.taskId===generic.id&&e.phase==='terminal')).toMatchObject({policy:null,providerChargeMicros:null});
  await writeFile(r.artifacts.path(r.get(first.id)!.result!),'tampered');
  await expect(r.run('offline',{projectId:'p'},work,signal(),{accounting})).rejects.toMatchObject({code:'INTEGRITY'});
  expect(r.usage('p')).toMatchObject({cacheHits:2,cacheFailures:1,totalAttempts:1});expect(calls).toBe(1);
  const before=JSON.stringify(events(r));const other=new TaskRunner(r.root);runners.push(other);expect(JSON.stringify(events(other))).toBe(before);
});

test('policies and forged costs fail strict validation before simulated work',async()=>{
  const r=await make();let calls=0;
  for(const bad of [{provider:'paid',ratePolicy:'local-zero-v1'},{provider:'windows-sapi-offline',ratePolicy:'free'},{...accounting,providerChargeMicros:0},null]){
    await expect(r.run('bad',{},async()=>{calls++;return local();},signal(),{accounting:bad as never})).rejects.toMatchObject({code:'USAGE_POLICY'});
  }
  expect(calls).toBe(0);expect(r.list()).toEqual([]);expect(AccountingPolicySchema.safeParse(accounting).success).toBe(true);
  await r.run('okay',{},local,signal(),{accounting});const terminal=events(r).find(e=>e.phase==='terminal')!;
  expect(UsageEventSchema.safeParse({...terminal,providerChargeMicros:100}).success).toBe(false);
  expect(UsageEventSchema.safeParse({...terminal,policy:null}).success).toBe(false);
  expect(UsageEventSchema.safeParse({...terminal,wallDurationMs:null}).success).toBe(false);
});

test('real SQLite claims and terminal receipts roll back atomically on accounting failure',async()=>{
  const r=await make();let calls=0;
  r.db.exec("CREATE TRIGGER injected_start_failure BEFORE INSERT ON usage_events WHEN NEW.phase='started' BEGIN SELECT RAISE(ABORT,'start receipt blocked');END;");
  await expect(r.run('rollback',{},async()=>{calls++;return local();},signal(),{accounting})).rejects.toThrow('start receipt blocked');
  expect(calls).toBe(0);expect(r.list()).toEqual([]);expect(r.db.prepare('SELECT COUNT(*) AS n FROM task_events').get()!.n).toBe(0);
  r.db.exec("DROP TRIGGER injected_start_failure;CREATE TRIGGER injected_terminal_failure BEFORE INSERT ON usage_events WHEN NEW.phase='terminal' BEGIN SELECT RAISE(ABORT,'terminal receipt blocked');END;");
  await expect(r.run('rollback',{},local,signal(),{accounting,leaseMs:100})).rejects.toThrow('terminal receipt blocked');
  expect(r.list()[0]!.state).toBe('running');expect(events(r).map(e=>e.phase)).toEqual(['started']);expect(r.usage().pendingAttempts).toHaveLength(1);
  r.db.exec('DROP TRIGGER injected_terminal_failure');await new Promise(done=>setTimeout(done,130));
  await r.run('rollback',{},local,signal(),{accounting});expect(events(r).map(e=>e.outcome)).toEqual([null,'interrupted',null,'succeeded']);
  expect(r.usage()).toMatchObject({totalAttempts:2,terminalAttempts:2,unknownDurationAttempts:1,totalProviderChargeMicros:0});
});

test('real two-connection ownership, retries, timeout/cancel preserve separate receipts (simulated callbacks)',async()=>{
  const r=await make(),other=new TaskRunner(r.root);runners.push(other);let release!:()=>void,ready!:()=>void;
  const held=new Promise<void>(done=>release=done),started=new Promise<void>(done=>ready=done);
  const pending=r.run('busy',{},async()=>{ready();await held;return local();},signal(),{accounting});await started;
  await expect(other.run('busy',{},local,signal(),{accounting})).rejects.toMatchObject({code:'TASK_BUSY'});release();await pending;
  await expect(r.run('retry',{},async()=>{throw new EngineError('RETRY','simulated','retryable');},signal(),{accounting})).rejects.toMatchObject({code:'RETRY'});
  await other.run('retry',{},local,signal(),{accounting});
  const wait=async(_d:string,s:AbortSignal)=>{await new Promise<void>((_done,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));return local();};
  await expect(r.run('timeout',{},wait,signal(),{accounting,timeoutMs:20})).rejects.toMatchObject({code:'TIMEOUT'});
  const control=new AbortController(),cancel=r.run('cancel',{},wait,control.signal,{accounting});setTimeout(()=>control.abort(new EngineError('CANCELLED','simulated','cancelled')),20);await expect(cancel).rejects.toMatchObject({code:'CANCELLED'});
  expect(r.usage()).toMatchObject({totalAttempts:5,terminalAttempts:5,knownChargeAttempts:5,pendingAttempts:[],missingAttempts:[]});
  expect(events(r).filter(e=>e.phase==='terminal').map(e=>e.outcome).sort()).toEqual(['cancelled','failed','failed','succeeded','succeeded']);
});

test('known legacy migration preserves exact task/events and attempts; legacy cache cannot backfill fees',async()=>{
  const r=await make();const done=await r.run('legacy',{projectId:'p'},local,signal());const task=r.db.prepare('SELECT data FROM tasks').get()!.data;const history=r.db.prepare('SELECT * FROM task_events ORDER BY seq').all();
  r.db.exec('DROP TABLE usage_events;PRAGMA user_version=0');
  const migrated=new TaskRunner(r.root);runners.push(migrated);
  expect(migrated.db.prepare('PRAGMA user_version').get()!.user_version).toBe(1);expect(migrated.db.prepare('SELECT data FROM tasks').get()!.data).toBe(task);expect(migrated.db.prepare('SELECT * FROM task_events ORDER BY seq').all()).toEqual(history);expect(events(migrated)).toEqual([]);
  await migrated.run('legacy',{projectId:'p'},async()=>{throw new Error('must not execute');},signal(),{accounting});
  expect(migrated.get(done.id)!.attempt).toBe(1);expect(migrated.usage()).toMatchObject({recordedAttempts:0,terminalAttempts:0,knownChargeAttempts:0,totalProviderChargeMicros:null,cacheHits:1});expect(migrated.usage().missingAttempts).toHaveLength(1);
  const twice=new TaskRunner(r.root);runners.push(twice);expect(events(twice)).toEqual(events(migrated));
});

test('future and unknown legacy schemas fail without silently rewriting version/data',async()=>{
  const r=await make();r.db.exec('PRAGMA user_version=8');expect(()=>new TaskRunner(r.root)).toThrow('unsupported tasks database version 8');expect(r.db.prepare('PRAGMA user_version').get()!.user_version).toBe(8);
  const root=await mkdtemp(join(tmpdir(),'gve-usage-'));directories.push(root);const raw=new DatabaseSync(join(root,'tasks.sqlite'));raw.exec('CREATE TABLE tasks(other TEXT);INSERT INTO tasks VALUES(\'preserve\')');raw.close();
  expect(()=>new TaskRunner(root)).toThrow('unknown legacy tasks schema');const check=new DatabaseSync(join(root,'tasks.sqlite'));try{expect(check.prepare('SELECT * FROM tasks').get()!.other).toBe('preserve');expect(check.prepare('PRAGMA user_version').get()!.user_version).toBe(0);}finally{check.close();}
});

test('unknown/partial legacy stores and version 1 missing preservation constraints are rejected before work',async()=>{
  const r=await make();r.db.exec('PRAGMA user_version=0;DROP TABLE usage_events;CREATE TABLE unrelated(data TEXT)');
  expect(()=>new TaskRunner(r.root)).toThrow('unsupported legacy tasks schema');expect(r.db.prepare('PRAGMA user_version').get()!.user_version).toBe(0);
  r.db.exec('DROP TABLE unrelated;DROP TABLE task_events');expect(()=>new TaskRunner(r.root)).toThrow('unsupported legacy tasks schema');
  const other=await make();other.db.exec('DROP TRIGGER usage_delete_forbidden');expect(()=>new TaskRunner(other.root)).toThrow('history-preservation triggers');
  const valid=await make();await valid.run('malformed-legacy',{},local,signal());const task=valid.list()[0]!;
  expect(()=>summarizeUsage([{...task,owner:''}],[])).toThrow('Usage accounting');expect(()=>summarizeUsage([{...task,state:'running'}],[])).toThrow('Usage accounting');
});

test('append-only, unique attempt boundaries, forged references/owners and SQL/JSON conflicts are rejected',async()=>{
  const r=await make();await r.run('immutable',{},local,signal(),{accounting});const ledger=events(r),start=ledger[0]!,terminal=ledger[1]!;
  expect(()=>r.db.exec('UPDATE usage_events SET data=data')).toThrow('immutable');expect(()=>r.db.exec('DELETE FROM usage_events')).toThrow('immutable');
  expect(()=>r.db.prepare('INSERT INTO usage_events(id,task_id,attempt,phase,data) VALUES(?,?,?,?,?)').run(randomUUID(),start.taskId,1,'started',canonical({...start,id:randomUUID()}))).toThrow('UNIQUE');
  for(const changed of [{...terminal,id:randomUUID(),owner:'forged'}, {...terminal,id:randomUUID(),attempt:2}, {...terminal,id:randomUUID(),taskId:'f'.repeat(64),inputFingerprint:'f'.repeat(64)}, {...terminal,id:randomUUID()}])expect(()=>summarizeUsage(r.list(),[start,terminal,changed])).toThrow('Usage accounting');
  const cache={...start,id:randomUUID(),phase:'cache_hit' as const,at:new Date().toISOString(),wallDurationMs:0,providerChargeMicros:0 as const,chargeBasis:'cache-no-provider-work' as const};
  r.db.prepare('INSERT INTO usage_events(id,task_id,attempt,phase,data) VALUES(?,?,?,?,?)').run(cache.id,cache.taskId,1,'cache_failure',canonical(cache));expect(()=>r.usage()).toThrow('receipt columns conflict');
});

test('coverage bounds fail explicitly before huge attempt traversal or receipt loading',async()=>{
  const r=await make();await r.run('bounds',{},local,signal());const task=r.list()[0]!;
  expect(()=>summarizeUsage([{...task,attempt:Number.MAX_SAFE_INTEGER}],[])).toThrow('attempt coverage limit exceeded');
  expect(()=>summarizeUsage([],Array(10_001).fill(null))).toThrow('row limit exceeded');
  r.db.exec("CREATE TABLE payload(data TEXT);INSERT INTO payload VALUES(printf('%.*c',33554433,'x'));DROP TRIGGER usage_update_forbidden;UPDATE usage_events SET data=(SELECT data FROM payload) WHERE phase='terminal'");
  expect(()=>r.usage()).toThrow('row/data byte limit exceeded');
});

test('immutable success cannot precede a later attempt in persisted usage history (simulated callbacks)',async()=>{
  const r=await make();
  await expect(r.run('retry-history',{},async()=>{throw new EngineError('RETRY','simulated','retryable');},signal(),{accounting})).rejects.toMatchObject({code:'RETRY'});
  await r.run('retry-history',{},local,signal(),{accounting});
  const ledger=events(r);expect(summarizeUsage(r.list(),ledger).totalAttempts).toBe(2);
  const forged=ledger.map(e=>e.attempt===1&&e.phase==='terminal'?{...e,outcome:'succeeded' as const}:e);
  expect(()=>summarizeUsage(r.list(),forged)).toThrow('successful attempt cannot be retried');
});

test('real Node process crash/resume preserves prior receipt and records unknown crash wall duration',async()=>{
  const r=await make();await r.run('prior',{projectId:'crash'},local,signal(),{accounting});const prior=canonical(events(r));
  const child=spawn(process.execPath,['--import','tsx','tests/usage-child.ts',r.root],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',chunk=>stderr+=String(chunk));
  await new Promise<void>((done,reject)=>{const timeout=setTimeout(()=>reject(new Error(`Crash fixture failed to start: ${stderr}`)),10000);child.once('error',reject);child.stdout.on('data',chunk=>{if(String(chunk).includes('READY')){clearTimeout(timeout);done();}});child.once('exit',code=>{if(code!==null&&code!==0){clearTimeout(timeout);reject(new Error(`Child exited ${code}: ${stderr}`));}});});
  const exited=once(child,'exit');child.kill('SIGKILL');await exited;await new Promise(done=>setTimeout(done,350));
  const before=events(r);expect(canonical(before.slice(0,2))).toBe(prior);expect(before.at(-1)!.phase).toBe('started');
  const resumed=new TaskRunner(r.root);runners.push(resumed);await resumed.run('crash-fixture',{projectId:'crash'},local,signal(),{accounting});
  const after=events(resumed);expect(canonical(after.slice(0,before.length))).toBe(canonical(before));const interrupted=after.find(e=>e.outcome==='interrupted')!;expect(interrupted.wallDurationMs).toBeNull();expect(interrupted.owner).toBe(before.at(-1)!.owner);expect(resumed.usage()).toMatchObject({totalAttempts:3,terminalAttempts:3,unknownDurationAttempts:1,pendingAttempts:[],totalProviderChargeMicros:0});
},15000);
