import {test,expect,afterEach,vi} from 'vitest';
import fs from 'node:fs/promises';
import {access,mkdtemp,writeFile,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as delay} from 'node:timers/promises';
import {syncBuiltinESMExports} from 'node:module';
import {TaskRunner} from '../src/orchestrator/tasks.js';
import {command} from '../src/core/process.js';
import {EngineError} from '../src/core/errors.js';
import {sha256} from '../src/core/util.js';
import {boundedFile,readTask} from '../src/story-planner/runtime.js';
const runners:TaskRunner[]=[],dirs:string[]=[];
const makeDir=async()=>{const dir=await mkdtemp(join(tmpdir(),'gve-task-'));dirs.push(dir);return dir;};
const make=async()=>{const r=new TaskRunner(await makeDir());runners.push(r);return r;};
afterEach(async()=>{for(const r of runners.splice(0))r.close();for(const d of dirs.splice(0))await rm(d,{recursive:true,force:true,maxRetries:3});});
const signal=()=>new AbortController().signal;
test.each(['EPERM','EACCES'])('CAS permission %s preserves a resumable task and atomic publication',async(code)=>{
  const r=await make();
  const original=fs.link;
  const denied=vi.spyOn(fs,'link').mockImplementation(async()=>{throw Object.assign(new Error('Permission boundary'),{code});});
  syncBuiltinESMExports();
  const work=async()=>({value:{ready:true},outputs:[await r.artifacts.commit('complete','text/plain','PUBLISH',sha256('permission-fixture'))]});
  try{
    await expect(r.run('permission-recovery',{version:1},work,signal())).rejects.toMatchObject({code:'ATOMIC_STORAGE_UNAVAILABLE',classification:'retryable'});
    const failed=r.list()[0]!;
    expect(failed.state).toBe('failed');expect(failed.attempt).toBe(1);expect(failed.outputs).toEqual([]);
    const dir=join(r.artifacts.root,sha256('complete').slice(0,2));
    expect(await readdir(dir)).toEqual([]);
    denied.mockRestore();syncBuiltinESMExports();
    expect(fs.link).toBe(original);
    const recovered=await r.run('permission-recovery',{version:1},work,signal());
    expect(recovered.id).toBe(failed.id);expect(recovered.cached).toBe(false);
    expect(r.get(failed.id)?.attempt).toBe(2);expect(r.get(failed.id)?.state).toBe('succeeded');
    expect((await r.run('permission-recovery',{version:1},work,signal())).cached).toBe(true);
    expect(await r.artifacts.readJson(r.get(failed.id)!.result!)).toEqual({ready:true});
    expect(await readdir(dir)).toEqual([sha256('complete')+'.txt']);
  }finally{denied.mockRestore();syncBuiltinESMExports();}
});
test('real CAS outputs persist, are reused and detect tampering; success cannot be edited',async()=>{
  const r=await make();let count=0;const work=async()=>{count++;const a=await r.artifacts.commit('sound','audio/wav','RENDER',sha256('input'));return{value:{answer:42},outputs:[a]};};
  const first=await r.run('fixture',{n:1},work,signal()),again=await r.run('fixture',{n:1},work,signal());expect(again.cached).toBe(true);expect(count).toBe(1);expect(again.id).toBe(first.id);
  expect(()=>r.db.prepare('UPDATE tasks SET data=data WHERE id=?').run(first.id)).toThrow('immutable');
  const other=new TaskRunner(r.root);runners.push(other);expect((await other.run('fixture',{n:1},work,signal())).cached).toBe(true);
  await writeFile(r.artifacts.path(first.outputs[0]!),'damage');await expect(r.run('fixture',{n:1},work,signal())).rejects.toMatchObject({code:'INTEGRITY'});expect(count).toBe(1);
});
test('real two-connection ownership prevents duplicate async execution',async()=>{const r=await make(),other=new TaskRunner(r.root);runners.push(other);let release!:()=>void;const wait=new Promise<void>(done=>release=done);let started!:()=>void;const ready=new Promise<void>(done=>started=done);
  const first=r.run('slow',{n:1},async()=>{started();await wait;return{value:true,outputs:[]};},signal());await ready;
  await expect(other.run('slow',{n:1},async()=>({value:true,outputs:[]}),signal())).rejects.toMatchObject({code:'TASK_BUSY'});release();await first;
});
test('task database startup waits for a real lock, reports exhausted SQLite busy as retryable, and recovers',async()=>{
  const source=`
    import {writeFileSync} from 'node:fs';
    import {TaskRunner} from './src/orchestrator/tasks.ts';
    const [dir, marker] = process.argv.slice(1);
    writeFileSync(marker,'ready');
    const start=performance.now();
    try {
      const runner=new TaskRunner(dir);
      runner.close();
      console.log(JSON.stringify({opened:true,elapsed:performance.now()-start}));
    } catch(error) {
      console.log(JSON.stringify({opened:false,code:error.code,classification:error.classification,elapsed:performance.now()-start}));
    }
  `;
  const openInProcess=async(dir:string,marker:string)=>JSON.parse(await command(process.execPath,
    ['--import','tsx','--input-type=module','-e',source,dir,marker],{signal:signal(),timeout:12_000}));
  const lockedOpen=async(releaseEarly:boolean)=>{
    const dir=await makeDir(), marker=join(dir,'child-ready');
    const owner=new DatabaseSync(join(dir,'tasks.sqlite'));
    owner.exec('BEGIN EXCLUSIVE; CREATE TABLE startup_lock_probe(id INTEGER);');
    let locked=true;
    try{
      const pending=openInProcess(dir,marker);
      if(releaseEarly){
        const deadline=Date.now()+7_000;
        while(await access(marker).then(()=>false,()=>true)){
          if(Date.now()>=deadline)throw new Error('Child did not reach TaskRunner startup');
          await delay(30);
        }
        await delay(250);
        owner.exec('ROLLBACK');
        locked=false;
      }
      return {dir,result:await pending};
    }finally{
      if(locked)owner.exec('ROLLBACK');
      owner.close();
    }
  };
  const early=await lockedOpen(true);
  expect(early.result).toMatchObject({opened:true});
  expect(early.result.elapsed).toBeGreaterThanOrEqual(200);
  const blocked=await lockedOpen(false);
  expect(blocked.result).toMatchObject({opened:false,code:'TASK_BUSY',classification:'retryable'});
  expect(blocked.result.elapsed).toBeGreaterThanOrEqual(4500);
  expect(await openInProcess(blocked.dir,join(blocked.dir,'retry-ready'))).toMatchObject({opened:true});
},22000);
test('task database startup preserves schema and version errors',async()=>{
  const invalidVersion=await makeDir(),invalidSchema=await makeDir();
  const version=new DatabaseSync(join(invalidVersion,'tasks.sqlite'));
  version.exec('PRAGMA user_version=99');
  version.close();
  const schema=new DatabaseSync(join(invalidSchema,'tasks.sqlite'));
  schema.exec('CREATE TABLE tasks (unexpected TEXT)');
  schema.close();
  expect(()=>new TaskRunner(invalidVersion)).toThrow(expect.objectContaining({code:'USAGE_DB_VERSION'}));
  expect(()=>new TaskRunner(invalidSchema)).toThrow(expect.objectContaining({code:'USAGE_DB_SCHEMA'}));
});
test('retries bounded active WAL growth without relaxing ordinary file integrity',async()=>{
  const runner=await make(), work=async()=>({value:true,outputs:[]});
  const committed=await runner.run('snapshot-race',{serial:0},work,signal());
  const wal=join(runner.root,'tasks.sqlite-wal'), ordinary=join(runner.root,'ordinary.txt');
  await writeFile(ordinary,'original');
  const stat=fs.lstat, read=fs.readFile;
  let stats=0, writes=0, continuous=false;
  const walRace=vi.spyOn(fs,'lstat').mockImplementation((async(path,options)=>{
    const info=await stat(path,options);
    if(path===wal&&++stats%2===0&&(continuous||writes===0)){
      await runner.run('snapshot-race',{serial:++writes},work,signal());
    }
    return info;
  }) as typeof fs.lstat);
  const otherTamper=vi.spyOn(fs,'readFile').mockImplementation((async(path,options)=>{
    if(path===ordinary)await writeFile(ordinary,'content changed');
    return read(path,options);
  }) as typeof fs.readFile);
  syncBuiltinESMExports();
  try{
    expect(await readTask(runner.root,committed.id,'snapshot-race')).toMatchObject({id:committed.id,state:'succeeded'});
    expect(writes).toBe(1);
    continuous=true;stats=0;
    await expect(readTask(runner.root,committed.id,'snapshot-race')).rejects.toMatchObject({code:'EXPLAIN_BUSY',classification:'retryable'});
    expect(writes).toBe(4);
    await expect(boundedFile(ordinary)).rejects.toMatchObject({code:'EXPLAIN_INPUT',classification:'permanent'});
  }finally{
    otherTamper.mockRestore();
    walRace.mockRestore();
    syncBuiltinESMExports();
  }
});
test('failed work cleans temporary output, retains committed inputs and resumes within bounded attempts',async()=>{const r=await make();const input=await r.artifacts.commit('preserve','text/plain','VALIDATE',sha256('x'));let attempts=0;
  const work=async(dir:string)=>{await writeFile(join(dir,'partial.mp4'),'unfinished');if(++attempts===1)throw new EngineError('TEMPORARY','injected','retryable');return{value:'okay',outputs:[input]};};
  await expect(r.run('recover',{x:1},work,signal())).rejects.toMatchObject({code:'TEMPORARY'});expect(await readdir(join(r.root,'tmp'))).toEqual([]);
  const next=await r.run('recover',{x:1},work,signal());expect(next.value).toBe('okay');expect(r.get(next.id)!.attempt).toBe(2);await r.artifacts.verify(input);
});
test('timeouts and cancellation stop real sleeping children and leave recoverable persistent failure',async()=>{const r=await make(),controller=new AbortController();
  const work=async(dir:string,s:AbortSignal)=>{await writeFile(join(dir,'partial'),'pending');await command(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:s,timeout:10000});return{value:'never',outputs:[]};};
  await expect(r.run('timeout',{},work,signal(),{timeoutMs:120})).rejects.toMatchObject({code:'TIMEOUT'});expect(await readdir(join(r.root,'tmp'))).toEqual([]);
  const pending=r.run('cancel',{},work,controller.signal);setTimeout(()=>controller.abort(new EngineError('CANCELLED','test','cancelled')),120);await expect(pending).rejects.toMatchObject({code:'CANCELLED'});
  expect(r.list().map(t=>t.state).sort()).toEqual(['cancelled','failed']);expect(await readdir(join(r.root,'tmp'))).toEqual([]);
},15000);
test('stale lease can be fenced and resumed; exhausted attempts and changed inputs remain distinct',async()=>{const r=await make();await expect(r.run('fail',{v:1},async()=>{throw new EngineError('BAD','transient','retryable');},signal(),{attempts:1})).rejects.toMatchObject({code:'BAD'});
  await expect(r.run('fail',{v:1},async()=>({value:true,outputs:[]}),signal(),{attempts:1})).rejects.toMatchObject({code:'RETRY_EXHAUSTED'});
  const changed=await r.run('fail',{v:2},async()=>({value:true,outputs:[]}),signal());expect(changed.value).toBe(true);
  const failed=r.list().find(t=>t.state==='failed')!;failed.state='running';failed.owner='dead-worker';failed.leaseUntil=Date.now()-1;r.db.prepare('UPDATE tasks SET data=? WHERE id=?').run(JSON.stringify(failed),failed.id);
  const recovered=await r.run('fail',{v:1},async()=>({value:'recovered',outputs:[]}),signal(),{attempts:2});expect(recovered.value).toBe('recovered');expect(r.get(recovered.id)!.owner).not.toBe('dead-worker');
});
test('durable scope budget counts attempts across environment fingerprints, cache reuse spends zero',async()=>{const r=await make(),other=new TaskRunner(r.root);runners.push(other);let calls=0;
  const options={attempts:2,scopeKey:'animatic:approved-package',maxScopeAttempts:2};
  const work=async()=>{calls++;if(calls===1)throw new EngineError('TRANSIENT','injected','retryable');return{value:'done',outputs:[]};};
  await expect(r.run('animatic',{environment:'A'},work,signal(),options)).rejects.toMatchObject({code:'TRANSIENT'});
  const done=await r.run('animatic',{environment:'A'},work,signal(),options);expect((await other.run('animatic',{environment:'A'},work,signal(),options)).cached).toBe(true);
  await expect(other.run('animatic',{environment:'B'},work,signal(),options)).rejects.toMatchObject({code:'PREVIEW_BUDGET'});expect(calls).toBe(2);expect(r.get(done.id)!.attempt).toBe(2);
  expect((await other.run('animatic',{environment:'B'},work,signal(),{...options,scopeKey:'animatic:new-approved-package'})).value).toBe('done');
});
