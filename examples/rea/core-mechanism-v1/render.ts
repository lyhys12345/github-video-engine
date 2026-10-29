import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {TaskRunner} from '../../../src/orchestrator/tasks.js';
import {command} from '../../../src/core/process.js';
import {sha256,canonical} from '../../../src/core/util.js';
import {browserPath,projectRoot,ffmpegPath,ffprobePath} from '../../../src/providers/local.js';
import {normalizeSilent} from '../../../src/final-renderer/normalization.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../../../src/core/owned-runtime.js';
import {samples} from './timeline.js';
const here=import.meta.dirname,state=resolve('C:/Users/luyuh/Documents/Codex/work/gve-core-mechanism-v1'),out=resolve(process.argv[2]??join(here,'preview-v1'));await mkdir(out,{recursive:true});
const font=await readFile(join(projectRoot,'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'));if(sha256(font)!=='a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da')throw Error('Font integrity');
const paths=['composition.tsx','worker.ts','render.ts','timeline.ts'].map(n=>join(here,n)).concat([join(projectRoot,'src/evidence-planner/continuity.ts'),join(projectRoot,'work/rea-core-story/sources/src/browser/CdpPageCaptureScripts.ts'),join(projectRoot,'work/rea-core-story/sources/src/domain/evidence.ts')]);
const sources=await Promise.all(paths.map(async path=>({path,sha256:sha256(await readFile(path))})));
const input={sources,font:sha256(font),scope:'30s silent source-grounded mechanism illustration only',commit:'f4cc6c85efe7f3513d587df3bd5086adb1bc6a76'},tasks=new TaskRunner(state),control=new AbortController();process.once('SIGINT',()=>control.abort(Error('Cancelled')));process.once('SIGTERM',()=>control.abort(Error('Cancelled')));
try{const result=await tasks.run('core-mechanism-30s',input,async(dir,signal)=>{const runtime=await createOwnedRuntimeTmp(dir,state);try{
await mkdir(join(dir,'public'));await writeFile(join(dir,'public/font.ttf'),font);const path=join(dir,'worker-input.json');await writeFile(path,JSON.stringify({entry:join(here,'composition.tsx'),browser:await browserPath()}));await command(process.execPath,['--import','tsx',join(here,'worker.ts'),path],{cwd:projectRoot,signal,timeout:660000,env:{TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory}});
await normalizeSilent(join(dir,'silent-raw.mp4'),join(dir,'preview.mp4'),{frames:900,fps:30},signal);
const video=join(dir,'preview.mp4'),probe=JSON.parse(await command(ffprobePath(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',video],{signal,timeout:60000}));const v=probe.streams[0];if(probe.streams.length!==1||v.codec_type!=='video'||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||v.width!==1080||v.height!==1920||v.nb_read_frames!=='900'||v.avg_frame_rate!=='30/1'||Math.abs(Number(probe.format.duration)-30)>.05)throw Error('Silent media scope mismatch');await command(ffmpegPath(),['-v','error','-xerror','-i',video,'-f','null','-'],{signal,timeout:60000});
const files:any[]=[];files.push({name:'preview.mp4',artifact:await tasks.artifacts.commit(await readFile(video),'video/mp4','PUBLISH',sha256(canonical(input)))});
for(const frame of samples){const fn=`frame-${frame}.png`,fp=join(dir,fn);await command(ffmpegPath(),['-v','error','-nostdin','-n','-i',video,'-vf',`select='eq(n,${frame})'`,'-frames:v','1',fp],{signal,timeout:60000});files.push({name:fn,artifact:await tasks.artifacts.commit(await readFile(fp),'image/png','PUBLISH',sha256(canonical(input)))});}
const evaluation={probe,fullDecodeExit:0,scope:input.scope,sourceCommit:input.commit,listening:'not applicable, no audio',continuousPerception:'unverified',sourceExecution:'none; source-based illustration',retention:'not measured',pixelSamples:'exact zero-based frame selects from delivered MP4'};files.push({name:'evaluation.json',artifact:await tasks.artifacts.commit(JSON.stringify(evaluation,null,2),'application/json','VERIFY_MEDIA',sha256(canonical(input)))});return{value:{files,input},outputs:files.map(f=>f.artifact)};
}finally{await cleanupOwnedRuntimeTmp(dir,state);}},control.signal,{attempts:2,timeoutMs:780000,scopeKey:'core-mechanism',maxScopeAttempts:6});
for(const f of result.value.files){const p=join(out,f.name);try{if(sha256(await readFile(p))!==f.artifact.sha256)throw Error('Refuse overwrite; use new delivery directory');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await copyFile(tasks.artifacts.path(f.artifact),p);}}await writeFile(join(out,'manifest.json'),JSON.stringify({taskId:result.id,cached:result.cached,...result.value},null,2));console.log(JSON.stringify({output:out,cached:result.cached,taskId:result.id}));
}finally{tasks.close();}
