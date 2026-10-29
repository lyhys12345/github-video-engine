import {readFile,writeFile,mkdir,copyFile,rename,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {ExplanationSchema} from '../contracts/explanation.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {sha256,canonical} from '../core/util.js';
import {command} from '../core/process.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {browserPath,projectRoot} from '../providers/local.js';
import {normalizeSilent} from '../final-renderer/normalization.js';
const specPath=resolve(process.argv[2]??''),output=resolve(process.argv[3]??'work/cross-project-v1/output');
const plan=ExplanationSchema.parse(JSON.parse(await readFile(specPath,'utf8')));
for(const e of plan.evidence){const actual=sha256(await readFile(resolve(projectRoot,e.snapshot)));if(actual!==e.sha256)throw Error(`Evidence hash mismatch ${e.id}`);}
const stateRoot=resolve(process.env.GVE_DATA??join(projectRoot,'.gve','experiments','explanation-v1')),tasks=new TaskRunner(join(stateRoot,'state'));
const sourcePaths=['src/contracts/explanation.ts','src/explanation/composition.tsx','src/explanation/worker.ts','src/explanation/render.ts'];
const sources=await Promise.all(sourcePaths.map(async p=>({path:p,sha256:sha256(await readFile(p))})));
const font=await readFile(join(projectRoot,'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'));
if(sha256(font)!=='a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da')throw Error('Font hash mismatch');
const input={projectId:plan.id,plan,sources,font:sha256(font),version:'explanation-visual-v1'},controller=new AbortController();
process.once('SIGINT',()=>controller.abort(Error('Cancelled')));process.once('SIGTERM',()=>controller.abort(Error('Cancelled')));
try{
 const result=await tasks.run('explanation-visual-proof',input,async(dir,signal)=>{
  const runtime=await createOwnedRuntimeTmp(dir,stateRoot);
  try{await mkdir(join(dir,'public'));await writeFile(join(dir,'public/font.ttf'),font);const workerInput=join(dir,'worker-input.json');await writeFile(workerInput,JSON.stringify({plan,browser:await browserPath()}));
   await command(process.execPath,['--import','tsx',join(projectRoot,'src/explanation/worker.ts'),workerInput],{signal,timeout:600000,cwd:projectRoot,env:{TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory}});
   const evaluation=await normalizeSilent(join(dir,'raw.mp4'),join(dir,'preview.mp4'),{frames:plan.durationSeconds*30,fps:30},signal);
   const files=[];for(const name of ['preview.mp4',...([1,4.5,6.5,8,10,12,15,17].map(s=>`frames/${s}.png`))]){const media=name.endsWith('.mp4')?'video/mp4':'image/png';files.push({name,artifact:await tasks.artifacts.commit(await readFile(join(dir,name)),media,'PUBLISH',sha256(canonical(input)))});}
   const report={...evaluation,audio:'absent by design; voice/naturalness UNVERIFIED',representation:'synthetic schematic, not target repository execution',retention:'not measured',status:'VISUAL_PROOF_ONLY_NOT_FINAL',planHash:sha256(canonical(plan)),sourcePaths:sources};
   files.push({name:'evaluation.json',artifact:await tasks.artifacts.commit(JSON.stringify(report,null,2),'application/json','VERIFY_MEDIA',sha256(canonical(input)))});
   return{value:{files,input},outputs:files.map(f=>f.artifact)};
  }finally{await cleanupOwnedRuntimeTmp(dir,stateRoot);}
 },controller.signal,{attempts:1,timeoutMs:720000,scopeKey:plan.id,maxScopeAttempts:8,beforeDiscardTemporary:dir=>cleanupOwnedRuntimeTmp(dir,stateRoot)});
 await mkdir(output,{recursive:true});for(const f of result.value.files){const dest=join(output,f.name);await mkdir(resolve(dest,'..'),{recursive:true});try{await access(dest);if(sha256(await readFile(dest))!==f.artifact.sha256)throw Error('Output exists with different content; use new output folder');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await copyFile(tasks.artifacts.path(f.artifact),dest+'.partial');await rename(dest+'.partial',dest);}}
 await writeFile(join(output,'manifest.json'),JSON.stringify({taskId:result.id,cached:result.cached,...result.value,status:'VISUAL_PROOF_ONLY_NOT_FINAL'},null,2));console.log(JSON.stringify({output,taskId:result.id,cached:result.cached}));
}finally{tasks.close();}
