import {mkdir,readFile,writeFile,copyFile,rename,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {TaskRunner} from '../../../../src/orchestrator/tasks.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../../../../src/core/owned-runtime.js';
import {command,killTree} from '../../../../src/core/process.js';
import {sha256,canonical} from '../../../../src/core/util.js';
import {browserPath,projectRoot,ffmpegPath,ffprobePath} from '../../../../src/providers/local.js';
import {normalizeSilent} from '../../../../src/final-renderer/normalization.js';
const here=import.meta.dirname,short=resolve('C:/Users/luyuh/Documents/Codex/work/gve-dino-teaser-v2'),out=join(here,'preview'),voiceRoot=join(projectRoot,'work/owner-revision-1/teaser-v2-voice');
await mkdir(short,{recursive:true});const voices=JSON.parse(await readFile(join(voiceRoot,'manifest.json'),'utf8'));
const audio=[];for(let i=0;i<1;i++){const path=join(voiceRoot,`clip-0${i+1}.mp3`),bytes=await readFile(path);if(sha256(bytes)!==voices.clips[i].sha256)throw Error('Voice integrity mismatch');audio.push({path,bytes});}
const font=await readFile(join(projectRoot,'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'));if(sha256(font)!=='a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da')throw Error('Font mismatch');
const input={projectId:'rea-dino-teaser',authority:'Owner requests only20–30second preview; no full video',duration:23,voiceProvider:voices.provider,voice:voices.voice,voiceHashes:audio.map(a=>sha256(a.bytes)),sourceHashes:await Promise.all(['composition.tsx','worker.ts','render.ts'].map(async n=>[n,sha256(await readFile(join(here,n)))])),font:sha256(font)};
const tasks=new TaskRunner(join(short,'state')),control=new AbortController();process.once('SIGINT',()=>control.abort(Error('Cancelled')));process.once('SIGTERM',()=>control.abort(Error('Cancelled')));
async function worker(dir:string,signal:AbortSignal){const runtime=await createOwnedRuntimeTmp(dir,short);const path=join(dir,'worker-input.json');await writeFile(path,JSON.stringify({entry:join(here,'composition.tsx'),browser:await browserPath()}));
 await new Promise<void>((done,reject)=>{const child=spawn(process.execPath,['--import','tsx',join(here,'worker.ts'),path],{cwd:projectRoot,env:{...process.env,TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});let log='',error='',failure:unknown;const stop=()=>{failure=signal.reason??Error('Timed out');try{child.send({type:'cancel'});}catch{};if(child.pid)void killTree(child.pid);};const timer=setTimeout(stop,660000);signal.addEventListener('abort',stop,{once:true});child.stdout!.on('data',x=>{log+=String(x);process.stdout.write(x);});child.stderr!.on('data',x=>error+=String(x));child.on('error',e=>{failure=e;});child.on('close',async code=>{clearTimeout(timer);signal.removeEventListener('abort',stop);await writeFile(join(short,'worker.stdout'),log);await writeFile(join(short,'worker.stderr'),error);if(failure||code!==0)reject(failure??Error(`Worker failed ${code}: ${error}`));else done();});});await cleanupOwnedRuntimeTmp(dir,short);
}
try{
 const result=await tasks.run('owner-authorized-dino-preview',input,async(dir,signal)=>{
  await mkdir(join(dir,'public'));await writeFile(join(dir,'public/font.ttf'),font);await worker(dir,signal);
  const raw=join(dir,'silent-raw.mp4'),silent=join(dir,'silent.mp4');await normalizeSilent(raw,silent,{frames:690,fps:30},signal);
  const args=['-v','error','-nostdin','-n'];for(const a of audio)args.push('-i',a.path);
  const starts=[150];const filter='[0:a]aresample=48000,aformat=channel_layouts=stereo,adelay=150|150,loudnorm=I=-18:TP=-1.5:LRA=7,aresample=48000,apad,atrim=duration=23[out]';
  const narration=join(dir,'narration.wav');await command(ffmpegPath(),[...args,'-filter_complex',filter,'-map','[out]','-c:a','pcm_s16le',narration],{signal,timeout:60000});
  const video=join(dir,'preview.mp4');await command(ffmpegPath(),['-v','error','-nostdin','-n','-i',silent,'-i',narration,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',video],{signal,timeout:60000});
  const probe=JSON.parse(await command(ffprobePath(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',video],{signal,timeout:60000}));const v=probe.streams.find((s:any)=>s.codec_type==='video'),a=probe.streams.find((s:any)=>s.codec_type==='audio');
  if(probe.streams.length!==2||v.width!==1080||v.height!==1920||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||Number(v.nb_read_frames)!==690||v.avg_frame_rate!=='30/1'||a.codec_name!=='aac'||a.sample_rate!=='48000'||Math.abs(Number(probe.format.duration)-23)>.06)throw Error('Media verification failed');
  await command(ffmpegPath(),['-v','error','-xerror','-i',video,'-f','null','-'],{signal,timeout:60000});
  const fingerprint=sha256(canonical(input)),outputs=[],files:any[]=[];
  for(const [name,path,type] of [['preview.mp4',video,'video/mp4'],['narration.wav',narration,'audio/wav'],...([45,100,220,360,480,650].map(f=>[`frame-${f}.png`,join(dir,'samples',`${f}.png`),'image/png']))]){const bytes=await readFile(path!);const artifact=await tasks.artifacts.commit(bytes,type!,'PUBLISH',fingerprint);outputs.push(artifact);files.push({name,artifact});}
  const evaluation={technicalPassed:true,probe,fullDecodeExit:0,voiceProvider:voices.provider,voice:voices.voice,voiceRate:voices.rate,voiceStartsSeconds:starts.map(x=>x/1000),scope:'owner requested23second preview only',listening:'owner-review-pending',visualReview:'sampled-frames-pending',retention:'not measured; no publication',source:'https://rea.tools/examples/dino-lab/',illustration:'original code-native teaching animation; not a recorded target execution'};
  const artifact=await tasks.artifacts.commit(JSON.stringify(evaluation,null,2),'application/json','VERIFY_MEDIA',fingerprint);outputs.push(artifact);files.push({name:'evaluation.json',artifact});return {value:{files,input},outputs};
 },control.signal,{attempts:2,timeoutMs:780000,scopeKey:'owner-dino-teaser-v2',maxScopeAttempts:3,beforeDiscardTemporary:dir=>cleanupOwnedRuntimeTmp(dir,short)});
 await mkdir(out,{recursive:true});for(const file of result.value.files){const dest=join(out,file.name);let exists=false;try{await access(dest);exists=true;}catch{}if(exists){if(sha256(await readFile(dest))!==file.artifact.sha256)throw Error('Existing delivery differs; use new version');continue;}const temp=dest+'.partial';await copyFile(tasks.artifacts.path(file.artifact),temp);await rename(temp,dest);}
 await writeFile(join(out,'manifest.json'),JSON.stringify({taskId:result.id,cached:result.cached,...result.value,status:'PREVIEW_FOR_OWNER_REVIEW_NOT_FINAL'},null,2));await writeFile(join(short,'latest-task.json'),JSON.stringify(tasks.get(result.id),null,2));console.log(JSON.stringify({success:true,taskId:result.id,cached:result.cached,output:out}));
}finally{tasks.close();}
