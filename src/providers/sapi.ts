import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {PlanningPackage} from '../contracts/planning.js';
import {ReadthroughSchema,type Readthrough} from '../contracts/production.js';
import type {ArtifactStore} from '../assets/store.js';
import {command} from '../core/process.js';
import {EngineError,checkAbort} from '../core/errors.js';
import {projectRoot,ffprobePath} from './local.js';
export const huihui='HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_MS_ZH-CN_HUIHUI_11.0';
export async function measureReadthrough(plan:PlanningPackage,revision:string,directory:string,artifacts:ArtifactStore,signal:AbortSignal):Promise<Readthrough>{
  if(process.platform!=='win32'||plan.brief.language!=='zh-CN')throw new EngineError('VOICE_UNAVAILABLE','Current offline readthrough adapter requires Windows with installed Microsoft Huihui Chinese voice; no remote fallback');
  const lines=plan.script.map(line=>({id:line.id,text:line.narration,output:join(directory,`${line.id}.wav`)}));
  const input=join(directory,'speech-input.json');await writeFile(input,JSON.stringify({voiceId:huihui,lines}));
  await command('powershell.exe',['-NoProfile','-NonInteractive','-File',join(projectRoot,'scripts/sapi-readthrough.ps1'),'-InputFile',input],{signal,timeout:90000});
  const measured=[];
  for(const line of lines){checkAbort(signal);const probe=JSON.parse(await command(ffprobePath(),['-v','error','-show_streams','-show_format','-of','json',line.output],{signal}));
    const durationMs=Math.ceil(Number(probe.format.duration)*1000);if(probe.streams.length!==1||probe.streams[0].codec_type!=='audio'||!Number.isFinite(durationMs)||durationMs<=0)throw new EngineError('VOICE_INVALID','Local voice did not produce valid measured audio');
    const audio=await artifacts.commit(await readFile(line.output),'audio/wav','RENDER',revision);
    const estimate=plan.script.find(s=>s.id===line.id)!.plannedDurationMs;
    measured.push({id:line.id,text:line.text,audio,durationMs,allocatedFrames:Math.ceil(Math.max(estimate,durationMs+500)/1000*plan.brief.fps),pronunciations:['REA: R E A','IPC: I P C','Notion/JavaScript: installed voice rendering, listening pending']});
  }
  return ReadthroughSchema.parse({schemaVersion:'1.0',projectId:plan.projectId,planRevision:revision,provider:'windows-sapi-offline',voiceId:huihui,rate:0,measuredAt:new Date().toISOString(),lines:measured,fps:plan.brief.fps,totalFrames:measured.reduce((n,l)=>n+l.allocatedFrames,0),status:'measured-not-yet-listened'});
}
