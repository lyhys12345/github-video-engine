import {readFile,writeFile,stat,mkdtemp,link,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {TaskRunner} from '../orchestrator/tasks.js';
import {ArtifactStore} from '../assets/store.js';
import {ArtifactSchema} from '../contracts/runtime.js';
import {z} from 'zod';
import {canonical,sha256} from '../core/util.js';
import {checkAbort} from '../core/errors.js';
import {captureEvidence,readTask,boundedFile,ancestors,verifyCaptured,preflightStatePath} from './runtime.js';
import {compileAnimation,AnimationSchema} from './animation.js';

/** Persist a manually authored animation, its source evidence and compiled timeline. */
export async function planAnimationTask(spec:string,sourceRoot:string,animationPath:string,data:string,signal:AbortSignal){
 const snapshot=await captureEvidence(spec,sourceRoot);
 const raw=await boundedFile(resolve(animationPath));
 if(raw.length>2_000_000)throw new Error('Animation input exceeds size limit');
 const animation=AnimationSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw).replace(/^\uFEFF/,'')));
 const compiled=compileAnimation(snapshot.graph,animation);
 const files=['story-planner/animation.ts','story-planner/compile.ts','story-planner/animation-task.ts','story-planner/runtime.ts','contracts/story.ts','contracts/evidence-plan.ts','contracts/runtime.ts','core/util.ts','core/errors.ts','orchestrator/tasks.ts','assets/store.ts','operations/usage.ts'];
 const compiler=await Promise.all(files.map(async file=>({file,sha256:sha256(await readFile(resolve(import.meta.dirname,'..',file)))})));
 const kind='experimental-story-animation-v1';
 const input={story:snapshot.graph,animation,sources:snapshot.sources.map(s=>({id:s.id,sha256:sha256(s.bytes),bytes:s.bytes.length})),compiler};
 const id=sha256(canonical({version:'production-task-v1',kind,input}));checkAbort(signal);
 data=resolve(data);preflightStatePath(data);await ancestors(data);const runner=new TaskRunner(data);
 try{
  const task=await runner.run(kind,input,async(_dir,workSignal)=>{
   const outputs=[];
   const payloads:[string,Buffer|string][]=[['story.json',canonical(snapshot.graph)],['animation.json',canonical(animation)],['compiled.json',canonical(compiled)],...snapshot.sources.map(s=>[`sources/${s.id}.txt`,s.bytes] as [string,Buffer])];
   for(const [path,bytes] of payloads){checkAbort(workSignal);const artifact=await runner.artifacts.commit(bytes,path.endsWith('.txt')?'text/plain':'application/json','PUBLISH',id);outputs.push({path,artifact});}
   return{value:{schemaVersion:'1.0',scope:'experimental-authored-animation',files:outputs},outputs:outputs.map(x=>x.artifact)};
  },signal,{attempts:3,timeoutMs:60000});
  await inspectAnimationTask(data,task.id);
  return {taskId:task.id,cached:task.cached,result:task.value};
 }finally{runner.close();}
}

const StoredResult=z.object({schemaVersion:z.literal('1.0'),scope:z.literal('experimental-authored-animation'),files:z.array(z.object({path:z.string().regex(/^(story|animation|compiled)\.json$|^sources\/[a-z][a-z0-9-]{0,63}\.txt$/),artifact:ArtifactSchema}).strict()).min(3).max(11)}).strict();
export async function inspectAnimationTask(data:string,id:string){
 if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Invalid task id');
 const task=await readTask(data,id,'experimental-story-animation-v1');
 if(task.id!==id||task.kind!=='experimental-story-animation-v1'||sha256(canonical({version:'production-task-v1',kind:task.kind,input:task.input}))!==id)throw new Error('Invalid task identity');
 if(task.state!=='succeeded')return {taskId:id,state:task.state,attempt:task.attempt,error:task.error};
 if(!task.result)throw new Error('Missing result');const store=new ArtifactStore(data), result=StoredResult.parse(await store.readJson(task.result));
 if(canonical(result.files.map(x=>canonical(x.artifact)).sort())!==canonical(task.outputs.map((x:unknown)=>canonical(x)).sort()))throw new Error('Output binding mismatch');
 const files:Record<string,string>={};for(const f of result.files){if(f.artifact.inputFingerprint!==id||Object.hasOwn(files,f.path))throw new Error('Invalid output binding');await store.verify(f.artifact);files[f.path]=(await readFile(store.path(f.artifact))).toString('utf8');}
 const input=task.input as {story:unknown;animation:unknown};if(canonical(JSON.parse(files['story.json']!))!==canonical(input.story)||canonical(JSON.parse(files['animation.json']!))!==canonical(input.animation))throw new Error('Stored input mismatch');
 const story=JSON.parse(files['story.json']!);const sources=story.evidence.sources.map((x:{id:string})=>({id:x.id,bytes:Buffer.from(files['sources/'+x.id+'.txt']??'','utf8')}));verifyCaptured(story,sources);if(canonical(sources.map((x:{id:string;bytes:Buffer})=>({id:x.id,sha256:sha256(x.bytes),bytes:x.bytes.length})))!==canonical((task.input as {sources:unknown}).sources)||Object.keys(files).length!==3+sources.length)throw new Error('Source closure mismatch');
 if(canonical(JSON.parse(files['compiled.json']!))!==canonical(compileAnimation(JSON.parse(files['story.json']!),JSON.parse(files['animation.json']!))))throw new Error('Compiled animation mismatch');
 return {taskId:id,state:task.state,attempt:task.attempt,files};
}
/** Export as a single exclusively created JSON file; never replaces existing files. */
export async function exportAnimationTask(data:string,id:string,out:string){
 const result=await inspectAnimationTask(data,id);if(result.state!=='succeeded')throw new Error('Task has no successful output');
 const destination=resolve(out);await ancestors(dirname(destination));const temp=await mkdtemp(join(dirname(destination),'.animation-export-'));
 try{const staged=join(temp,'result.json');await writeFile(staged,JSON.stringify(result,null,2)+'\n',{flag:'wx'});await link(staged,destination);}finally{await rm(temp,{recursive:true,force:true});}return {taskId:id,output:destination};
}
