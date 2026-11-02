import {it,expect} from 'vitest';
import {mkdtemp,readFile,writeFile,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {planAnimationTask,inspectAnimationTask,exportAnimationTask} from '../src/story-planner/animation-task.js';
import {ArtifactStore} from '../src/assets/store.js';
import {canonical} from '../src/core/util.js';
import {fork} from 'node:child_process';
const signal=new AbortController().signal;
async function setup(){const dir=await mkdtemp(resolve('work/attack-'));const task=await planAnimationTask('examples/story-planner-v1/rembg.json','.', 'examples/story-planner-v1/rembg-animation.json',dir,signal);return {dir,id:task.taskId};}
for(const target of ['story.json','animation.json','source'])it('rejects coherent valid-hash substitution of '+target,async()=>{
 const {dir,id}=await setup(),db=new DatabaseSync(join(dir,'tasks.sqlite')),store=new ArtifactStore(dir);
 try{const row=db.prepare('SELECT data FROM tasks WHERE id=?').get(id)!;const task=JSON.parse(String(row.data));const result:any=await store.readJson(task.result);const file=result.files.find((x:any)=>target==='source'?x.path.startsWith('sources/'):x.path===target);const old=file.artifact;
 const bytes=await readFile(store.path(old),'utf8');let changed:string;if(target==='source')changed=bytes+'\nforged';else{const input=JSON.parse(bytes);if(target==='story.json')input.name+=' forged';else input.shots[0].objects[0].label+=' forged';changed=canonical(input);}
 file.artifact=await store.commit(changed,old.mediaType,'PUBLISH',id);task.outputs=task.outputs.map((x:any)=>x.sha256===old.sha256?file.artifact:x);task.result=await store.commit(canonical(result),'application/json','PUBLISH',id);const trigger=String(db.prepare("SELECT sql FROM sqlite_master WHERE name='completed_task_immutable'").get()!.sql);db.exec('DROP TRIGGER completed_task_immutable');db.prepare('UPDATE tasks SET data=? WHERE id=?').run(canonical(task),id);db.exec(trigger);
 }finally{db.close();}
 await expect(inspectAnimationTask(dir,id)).rejects.toThrow();await expect(exportAnimationTask(dir,id,join(dir,'bad.json'))).rejects.toThrow();await expect(access(join(dir,'bad.json'))).rejects.toThrow();
 await expect(planAnimationTask('examples/story-planner-v1/rembg.json','.','examples/story-planner-v1/rembg-animation.json',dir,signal)).rejects.toThrow();
});
it('atomic export preserves an existing destination and permits a separate complete export',async()=>{const {dir,id}=await setup(),out=join(dir,'out.json');await writeFile(out,'owner edit');await expect(exportAnimationTask(dir,id,out)).rejects.toThrow();expect(await readFile(out,'utf8')).toBe('owner edit');await exportAnimationTask(dir,id,join(dir,'fresh.json'));expect(JSON.parse(await readFile(join(dir,'fresh.json'),'utf8')).state).toBe('succeeded');});
it('real process killed after staging leaves no published partial file and can export again',async()=>{const {dir,id}=await setup(),out=join(dir,'interrupted.json');const child=fork(resolve('tests/animation-export-child.ts'),[dir,id,out],{execArgv:['--import','tsx'],stdio:['ignore','pipe','pipe','ipc']});let errors='';child.stderr?.on('data',b=>errors+=b);try{const msg:any=await new Promise((yes,no)=>{const timer=setTimeout(()=>no(new Error('No export barrier: '+errors)),15000);child.once('message',m=>{clearTimeout(timer);yes(m);});child.once('exit',code=>{clearTimeout(timer);no(new Error('Early exit '+code+errors));});});expect(JSON.parse(await readFile(msg.staged,'utf8')).state).toBe('succeeded');await expect(access(out)).rejects.toThrow();await new Promise<void>(yes=>{child.once('exit',()=>yes());child.kill('SIGKILL');});await expect(access(out)).rejects.toThrow();await exportAnimationTask(dir,id,out);expect(JSON.parse(await readFile(out,'utf8')).state).toBe('succeeded');}finally{child.kill('SIGKILL');}},20000);
