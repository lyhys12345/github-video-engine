import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {ProductionPackage,Readthrough} from '../contracts/production.js';
import type {PlanningPackage} from '../contracts/planning.js';
import type {Artifact} from '../contracts/runtime.js';
import {ArtifactStore} from '../assets/store.js';
import {command} from '../core/process.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {EngineError,checkAbort} from '../core/errors.js';
import {browserPath,projectRoot,ffmpegPath,ffprobePath} from '../providers/local.js';
export async function inspectProduction(path:string,expected:{width:number;height:number;fps:number;frames:number;audio:boolean},signal:AbortSignal){
  const probe=JSON.parse(await command(ffprobePath(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',path],{signal,timeout:90000}));
  const video=probe.streams.filter((s:any)=>s.codec_type==='video'),audio=probe.streams.filter((s:any)=>s.codec_type==='audio');const v=video[0]??{};const [n,d]=String(v.avg_frame_rate).split('/').map(Number);
  const checks=[['container',String(probe.format.format_name).includes('mp4')],['video',video.length===1&&v.codec_name==='h264'&&v.pix_fmt==='yuv420p'],['dimensions',v.width===expected.width&&v.height===expected.height],['fps',Math.abs(n!/d!-expected.fps)<.001],['frames',Number(v.nb_read_frames)===expected.frames],['duration',Math.abs(Number(probe.format.duration)-expected.frames/expected.fps)<.09],['audio',audio.length===(expected.audio?1:0)&&(!expected.audio||audio[0].codec_name==='aac')]] as const;
  if(checks.some(([,passed])=>!passed))throw new EngineError('MEDIA_INVALID',JSON.stringify({checks,probe}));
  await command(ffmpegPath(),['-v','error','-xerror','-i',path,'-map','0:v:0',...(expected.audio?['-map','0:a:0']:[]),'-f','null','-'],{signal,timeout:90000});
  return{evaluatorVersion:'production-ffprobe-v1',passed:true,checks:[...checks,['whole-decode',true]],probe};
}
export async function renderProduction(mode:'style'|'animatic'|'motion',design:ProductionPackage,readthrough:Readthrough,plan:PlanningPackage,directory:string,artifacts:ArtifactStore,fingerprint:string,signal:AbortSignal){
  for(const l of readthrough.lines)await artifacts.verify(l.audio);
  const input=join(directory,'render-input.json'),raw=join(directory,'raw.mp4');
  checkAbort(signal);const runtime=await createOwnedRuntimeTmp(directory);
  try {
  await writeFile(input,JSON.stringify({design,readthrough,captions:Object.fromEntries(plan.script.map(l=>[l.id,l.caption])),mode,browser:await browserPath(),parentPid:process.pid}));
  await command(process.execPath,['--import','tsx',join(projectRoot,'src/renderer/production-worker.ts'),input,raw],{signal,timeout:240000,cwd:projectRoot,env:{TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory}});
  await cleanupOwnedRuntimeTmp(directory,runtime.root);
  }catch(error){await cleanupOwnedRuntimeTmp(directory,runtime.root);throw error;}
  const outputs:Artifact[]=[];
  if(mode==='style'){
    for(let i=0;i<design.scenes.length;i++)outputs.push(await artifacts.commit(await readFile(join(directory,`scene-${i+1}.png`)),'image/png','RENDER',fingerprint));
    const contact=join(directory,'contact-sheet.png');
    await command(ffmpegPath(),['-v','error','-nostdin','-n','-framerate','1','-i',join(directory,'scene-%d.png'),'-vf','scale=180:320,tile=4x2:padding=12:margin=12:color=0x18202b','-frames:v','1',contact],{signal,timeout:30000});
    const sheet=await artifacts.commit(await readFile(contact),'image/png','RENDER',fingerprint);outputs.push(sheet);
    return{value:{mode,frames:outputs.slice(0,-1),contactSheet:sheet,sharedComposition:'production-composition.tsx'},outputs};
  }
  const combined=join(directory,'timed.wav');
  const selected=mode==='motion'?[readthrough.lines.find(l=>l.id===design.authorization.motionAudioScriptId)!]:readthrough.lines;
  const args=['-v','error','-nostdin','-n',...selected.flatMap(l=>['-i',artifacts.path(l.audio)])];
  const filters=selected.map((l,i)=>`[${i}:a]aresample=48000,apad,atrim=duration=${mode==='motion'?design.authorization.motionSeconds:l.allocatedFrames/readthrough.fps},asetpts=PTS-STARTPTS[a${i}]`);
  filters.push(selected.map((_,i)=>`[a${i}]`).join('')+`concat=n=${selected.length}:v=0:a=1[a]`);
  await command(ffmpegPath(),[...args,'-filter_complex',filters.join(';'),'-map','[a]','-c:a','pcm_s16le',combined],{signal,timeout:60000});
  const motionIndex=design.scenes.findIndex(s=>s.id===design.authorization.motionScene);
  const start=readthrough.lines.slice(0,motionIndex).reduce((n,l)=>n+l.allocatedFrames,0)/readthrough.fps;
  const frames=mode==='motion'?Math.round(design.authorization.motionSeconds*readthrough.fps):readthrough.totalFrames;
  const output=join(directory,`${mode}.mp4`);
  // Remotion's JPEG frame path may produce full-range yuvj420p despite its pixelFormat
  // option. Normalize explicitly, as the M0 adapter does, before media verification.
  await command(ffmpegPath(),['-v','error','-nostdin','-n','-i',raw,'-i',combined,'-map','0:v:0','-map','1:a:0','-vf','scale=in_range=auto:out_range=tv,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-color_range','tv','-c:a','aac','-b:a','128k','-t',String(frames/readthrough.fps),'-movflags','+faststart',output],{signal,timeout:90000});
  const evaluation=await inspectProduction(output,{width:mode==='animatic'?360:720,height:mode==='animatic'?640:1280,fps:readthrough.fps,frames,audio:true},signal);checkAbort(signal);
  const video=await artifacts.commit(await readFile(output),'video/mp4','RENDER',fingerprint);outputs.push(video);
  const report=await artifacts.commit(JSON.stringify(evaluation),'application/json','VERIFY_MEDIA',fingerprint);outputs.push(report);
  return{value:{mode,video,evaluation:report,frames,fps:readthrough.fps,width:mode==='animatic'?360:720,height:mode==='animatic'?640:1280,temporaryVoice:true},outputs};
}
