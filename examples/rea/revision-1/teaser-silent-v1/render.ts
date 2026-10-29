import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {TaskRunner} from '../../../../src/orchestrator/tasks.js';
import {command} from '../../../../src/core/process.js';
import {sha256,canonical} from '../../../../src/core/util.js';
import {browserPath,projectRoot,ffmpegPath,ffprobePath} from '../../../../src/providers/local.js';
import {normalizeSilent} from '../../../../src/final-renderer/normalization.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../../../../src/core/owned-runtime.js';
const here=import.meta.dirname,state=resolve('C:/Users/luyuh/Documents/Codex/work/gve-silent-pair-v1'),out=join(here,'comparison');await mkdir(out,{recursive:true});
const font=await readFile(join(projectRoot,'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'));
const sources=await Promise.all(['composition.tsx','worker.ts','render.ts'].map(async name=>({path:join(here,name),sha256:sha256(await readFile(join(here,name)))})));
sources.push({path:'src/evidence-planner/continuity.ts',sha256:sha256(await readFile(join(projectRoot,'src/evidence-planner/continuity.ts')))});
const old=join(projectRoot,'examples/rea/revision-1/teaser-v4/preview/preview.mp4'),input={sources,font:sha256(font),baseline:sha256(await readFile(old)),scope:'30s silent comparison only'};
const tasks=new TaskRunner(state);try{const result=await tasks.run('silent-pair-30s',input,async(dir,signal)=>{const runtime=await createOwnedRuntimeTmp(dir,state);try{
await mkdir(join(dir,'public'));await writeFile(join(dir,'public/font.ttf'),font);const path=join(dir,'worker-input.json');await writeFile(path,JSON.stringify({entry:join(here,'composition.tsx'),browser:await browserPath()}));await command(process.execPath,['--import','tsx',join(here,'worker.ts'),path],{cwd:projectRoot,signal,timeout:660000,env:{TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory}});
await normalizeSilent(join(dir,'silent-raw.mp4'),join(dir,'B.mp4'),{frames:900,fps:30},signal);
await command(ffmpegPath(),['-v','error','-nostdin','-n','-i',old,'-map','0:v:0','-c:v','copy','-an','-movflags','+faststart',join(dir,'A.mp4')],{signal,timeout:60000});
const files:any[]=[];for(const name of ['A.mp4','B.mp4']){const p=join(dir,name),probe=JSON.parse(await command(ffprobePath(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',p],{signal,timeout:60000}));if(probe.streams.length!==1||probe.streams[0].codec_type!=='video'||probe.streams[0].nb_read_frames!=='900')throw Error('Silent scope mismatch');await command(ffmpegPath(),['-v','error','-xerror','-i',p,'-f','null','-'],{signal,timeout:60000});const media=await tasks.artifacts.commit(await readFile(p),'video/mp4','PUBLISH',sha256(canonical(input)));files.push({name,artifact:media,probe});for(const frame of [45,180,285,330,420,540,600,660,750,850]){const fn=`${name[0]}-${frame}.png`,fp=join(dir,fn);await command(ffmpegPath(),['-v','error','-nostdin','-n','-i',p,'-vf',`select='eq(n,${frame})'`,'-frames:v','1',fp],{signal,timeout:60000});files.push({name:fn,artifact:await tasks.artifacts.commit(await readFile(fp),'image/png','PUBLISH',sha256(canonical(input)))});}}
return{value:{files,input},outputs:files.map(f=>f.artifact)};}finally{await cleanupOwnedRuntimeTmp(dir,state);}},new AbortController().signal,{attempts:2,timeoutMs:780000,scopeKey:'silent-pair',maxScopeAttempts:4});
for(const f of result.value.files){const p=join(out,f.name);try{if(sha256(await readFile(p))!==f.artifact.sha256)throw Error('Refuse overwrite');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await copyFile(tasks.artifacts.path(f.artifact),p);}}
await writeFile(join(out,'manifest.json'),JSON.stringify({taskId:result.id,cached:result.cached,...result.value},null,2));console.log(JSON.stringify({output:out,cached:result.cached}));}finally{tasks.close();}
