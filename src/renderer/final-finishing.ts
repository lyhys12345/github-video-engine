import {lstat,mkdir,access,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {EngineError,checkAbort} from '../core/errors.js';
import {command} from '../core/process.js';
import {ffmpegPath,ffprobePath} from '../providers/local.js';

export type FinalVoiceLine={id:string;audioPath:string;durationMs:number;allocatedFrames:number;caption:string};
export type FinalFinishingInput={cleanVideoPath:string;captionedVideoPath:string;width:number;height:number;fps:number;totalFrames:number;lines:FinalVoiceLine[]};
export type SubtitleCue={id:string;startMs:number;endMs:number;text:string};
type Probe={streams:Array<Record<string,unknown>>;format:Record<string,unknown>};
const fail=(code:string,message:string):never=>{throw new EngineError(code,message);};
const integer=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isInteger(n)&&n>=min&&n<=max;
function validate(input:FinalFinishingInput){
 if(!input||typeof input!=='object'||!integer(input.width,16,1920)||!integer(input.height,16,1920)||input.width%2||input.height%2||input.width*16!==input.height*9||![24,30].includes(input.fps)||!integer(input.totalFrames,1,input.fps*60))fail('FINISH_INPUT','Finishing requires an even9:16 format,24/30fps and at most60seconds');
 if(Object.keys(input).some(k=>!['cleanVideoPath','captionedVideoPath','width','height','fps','totalFrames','lines'].includes(k)))fail('FINISH_INPUT','Unsupported finishing input field');
 if(!Array.isArray(input.lines)||input.lines.length<1||input.lines.length>16)fail('FINISH_INPUT','Finishing requires1–16 measured voice lines');
 const ids=new Set<string>();let frames=0;
 for(const l of input.lines){if(!l||typeof l!=='object'||typeof l.id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(l.id)||ids.has(l.id)||typeof l.audioPath!=='string'||!l.audioPath||l.audioPath.length>1000||!integer(l.durationMs,1,20000)||!integer(l.allocatedFrames,1,input.fps*60)||typeof l.caption!=='string'||l.caption.trim()!==l.caption||l.caption.length<1||l.caption.length>200||/[\u0000-\u001f\u007f{}\\]/.test(l.caption)||l.caption.includes('-->')||Object.keys(l).some(k=>!['id','audioPath','durationMs','allocatedFrames','caption'].includes(k)))fail('FINISH_INPUT','Invalid or duplicate voice line, duration or plain subtitle caption');ids.add(l.id);frames+=l.allocatedFrames;if(l.allocatedFrames/input.fps*1000-l.durationMs<250-0.001)fail('FINISH_TIMING','Every measured line must retain at least250ms natural pause');}
 if(frames!==input.totalFrames)fail('FINISH_TIMING','Voice allocation must cover the entire video exactly');
 for(const p of [input.cleanVideoPath,input.captionedVideoPath])if(typeof p!=='string'||!p||p.length>1000)fail('FINISH_INPUT','Invalid input video path');
}
async function regular(path:string,max:number){const info=await lstat(path);if(!info.isFile()||info.size<=0||info.size>max)fail('FINISH_INPUT','Finishing inputs must be nonempty bounded regular files, not links');return info.size;}
async function probe(path:string,signal:AbortSignal,countFrames=false):Promise<Probe>{
 const result=JSON.parse(await command(ffprobePath(),['-v','error',...(countFrames?['-count_frames']:[]),'-show_streams','-show_format','-of','json',path],{signal,timeout:120000})) as Probe;
 if(!Array.isArray(result.streams)||!result.format)fail('FINISH_MEDIA','FFprobe returned incomplete media properties');delete result.format.filename;return result;
}
function duration(probe:Probe){const n=Number(probe.format.duration);if(!Number.isFinite(n)||n<=0)fail('FINISH_MEDIA','Media duration is missing or invalid');return n;}
function videoChecks(p:Probe,input:FinalFinishingInput,audio:boolean){
 const vs=p.streams.filter(s=>s.codec_type==='video'),as=p.streams.filter(s=>s.codec_type==='audio'),v=vs[0]??{},rate=String(v.avg_frame_rate).split('/').map(Number),fps=rate[0]!/rate[1]!;
 const checks={container:String(p.format.format_name).includes('mp4'),video:vs.length===1&&v.codec_name==='h264'&&v.pix_fmt==='yuv420p',dimensions:v.width===input.width&&v.height===input.height,fps:Number.isFinite(fps)&&Math.abs(fps-input.fps)<0.001,frames:Number(v.nb_read_frames)===input.totalFrames,duration:Math.abs(duration(p)-input.totalFrames/input.fps)<0.09,audio:as.length===(audio?1:0)&&(!audio||as[0]!.codec_name==='aac')};
 if(Object.values(checks).some(p=>!p))fail('FINISH_MEDIA','Video properties do not match the measured timeline: '+JSON.stringify(checks));return checks;
}
function stamp(milliseconds:number,separator:string){const ms=Math.max(0,Math.round(milliseconds)),hours=Math.floor(ms/3600000),minutes=Math.floor(ms/60000)%60,seconds=Math.floor(ms/1000)%60;return`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}${separator}${String(ms%1000).padStart(3,'0')}`;}
const subtitleText=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function finalSubtitleCues(input:FinalFinishingInput):SubtitleCue[]{validate(input);let start=0;return input.lines.map(l=>{const cue={id:l.id,startMs:Math.round(start/input.fps*1000),endMs:Math.round((start+l.allocatedFrames)/input.fps*1000),text:l.caption};start+=l.allocatedFrames;return cue;});}
async function loudness(path:string,signal:AbortSignal){
 const stderr=await command(ffmpegPath(),['-hide_banner','-nostdin','-i',path,'-map','0:a:0','-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],{signal,timeout:120000,capture:'stderr'}),from=stderr.lastIndexOf('{'),to=stderr.lastIndexOf('}');if(from<0||to<from)fail('FINISH_AUDIO','Loudness measurement did not return structured results');
 const raw=JSON.parse(stderr.slice(from,to+1)) as Record<string,string>,integratedLufs=Number(raw.input_i),truePeakDbtp=Number(raw.input_tp),loudnessRangeLu=Number(raw.input_lra);
 if(![integratedLufs,truePeakDbtp,loudnessRangeLu].every(Number.isFinite))fail('FINISH_AUDIO','Voice must contain measurable non-silent audio');
 return{integratedLufs,truePeakDbtp,loudnessRangeLu,targetIntegratedLufs:-16,targetTruePeakDbtp:-1.5,measurement:'FFmpeg loudnorm analysis of actual PCM input; not listening',raw};
}

/** File-producing technical adapter. Caller owns temporary directory and atomic CAS publication/cleanup. */
export async function finishFinal(input:FinalFinishingInput,directory:string,signal:AbortSignal){
 checkAbort(signal);validate(input);const output=resolve(directory);await mkdir(output,{recursive:true});
 const masterPath=join(output,'master.mp4'),captionedPath=join(output,'captioned.mp4'),narrationPath=join(output,'narration.wav'),srtPath=join(output,'captions.srt'),vttPath=join(output,'captions.vtt');
 for(const p of [masterPath,captionedPath,narrationPath,srtPath,vttPath]){try{await access(p);fail('FINISH_OUTPUT_EXISTS','Refusing to overwrite an existing finishing output');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
 let inputBytes=0;for(const p of [input.cleanVideoPath,input.captionedVideoPath])inputBytes+=await regular(p,250000000);for(const l of input.lines)inputBytes+=await regular(l.audioPath,64000000);if(inputBytes>1000000000)fail('FINISH_INPUT','Finishing input byte coverage limit exceeded');
 const incomingClean=await probe(input.cleanVideoPath,signal,true),incomingCaptioned=await probe(input.captionedVideoPath,signal,true);videoChecks(incomingClean,input,false);videoChecks(incomingCaptioned,input,false);
 const lines=[];let offsetFrames=0;
 for(const l of input.lines){const p=await probe(l.audioPath,signal),as=p.streams.filter(s=>s.codec_type==='audio'),measuredMs=duration(p)*1000;if(p.streams.length!==1||as.length!==1||!String(as[0]!.codec_name).startsWith('pcm_')||measuredMs>l.durationMs+1||l.durationMs-measuredMs>2||l.allocatedFrames/input.fps*1000-measuredMs<250-0.001)fail('FINISH_AUDIO','Actual PCM duration does not match its measured line or natural pause');lines.push({id:l.id,durationMs:measuredMs,declaredDurationMs:l.durationMs,startFrames:offsetFrames,allocatedFrames:l.allocatedFrames,pauseMs:l.allocatedFrames/input.fps*1000-measuredMs,probe:p});offsetFrames+=l.allocatedFrames;}
 const seconds=input.totalFrames/input.fps,narrationSamples=input.totalFrames*48000/input.fps,filters=lines.map((l,i)=>`[${i}:a]aresample=48000,asetpts=PTS-STARTPTS,adelay=${Math.round(l.startFrames/input.fps*48000)}S:all=1[a${i}]`);
 // loudnorm may change the sample rate and timestamps. Lock length only after
 // final resampling; time-based trimming before resampling lost1441 samples on
 // the real57.4s SAPI run. Natural speech ends>=250ms before each scene boundary.
 filters.push(lines.map((_l,i)=>`[a${i}]`).join('')+`amix=inputs=${lines.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=end_sample=${narrationSamples},asetpts=N/SR/TB[mix]`);
 await command(ffmpegPath(),['-v','error','-nostdin','-n',...input.lines.flatMap(l=>['-i',l.audioPath]),'-filter_complex',filters.join(';'),'-map','[mix]','-ac','1','-ar','48000','-c:a','pcm_s16le',narrationPath],{signal,timeout:120000});
 const narration=await probe(narrationPath,signal);if(narration.streams.length!==1||narration.streams[0]!.codec_name!=='pcm_s16le'||Number(narration.streams[0]!.sample_rate)!==48000||Number(narration.streams[0]!.duration_ts)!==narrationSamples||Math.abs(duration(narration)-seconds)>0.001)fail('FINISH_AUDIO','Final narration PCM properties do not match the locked timeline');
 const audioMeasurements=await loudness(narrationPath,signal);if(audioMeasurements.integratedLufs<-19||audioMeasurements.integratedLufs>-13||audioMeasurements.truePeakDbtp>-0.4)fail('FINISH_AUDIO','Normalized narration fails objective loudness/peak bounds');
 const finished=[];for(const [file,video,target]of [['master.mp4',input.cleanVideoPath,masterPath],['captioned.mp4',input.captionedVideoPath,captionedPath]] as const){
  await command(ffmpegPath(),['-v','error','-nostdin','-n','-i',video,'-i',narrationPath,'-map','0:v:0','-map','1:a:0','-map_metadata','-1','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(seconds),'-movflags','+faststart',target],{signal,timeout:120000});
  const p=await probe(target,signal,true),checks=videoChecks(p,input,true);await command(ffmpegPath(),['-v','error','-xerror','-nostdin','-i',target,'-map','0:v:0','-map','0:a:0','-f','null','-'],{signal,timeout:120000});const encodedAudioMeasurements=await loudness(target,signal);
  if(encodedAudioMeasurements.integratedLufs<-19||encodedAudioMeasurements.integratedLufs>-13||encodedAudioMeasurements.truePeakDbtp>-0.1)fail('FINISH_AUDIO','Encoded AAC fails objective loudness/peak bounds');finished.push({file,checks:{...checks,fullDecode:true,encodedAudioMeasured:true},probe:p,audioMeasurements:encodedAudioMeasurements});
 }
 checkAbort(signal);const cues=finalSubtitleCues(input),srt=cues.map((c,i)=>`${i+1}\n${stamp(c.startMs,',')} --> ${stamp(c.endMs,',')}\n${subtitleText(c.text)}\n`).join('\n'),vtt='WEBVTT\n\n'+cues.map(c=>`${c.id}\n${stamp(c.startMs,'.')} --> ${stamp(c.endMs,'.')}\n${subtitleText(c.text)}\n`).join('\n');
 await writeFile(srtPath,srt,{flag:'wx'});await writeFile(vttPath,vtt,{flag:'wx'});checkAbort(signal);
 const evaluation={schemaVersion:'final-finishing/1.0' as const,evaluatorVersion:'ffprobe-ffmpeg-final-v1',scope:'technical media measurements only; caller must bind exact committed artifact hashes',passed:true,frames:input.totalFrames,fps:input.fps,width:input.width,height:input.height,durationSeconds:seconds,narrationSamples,subtitleTiming:'sentence/scene-level measured allocation, not word-level alignment',audioPolicy:'actual local voice only; no music, speed-up or speech cropping',audioMeasurements,lineTiming:lines,media:finished,narrationProbe:narration,deferredChecks:['actual listening','pronunciation/expressiveness','subjective audio mix','continuous video viewing','final owner acceptance']};
 return{masterPath,captionedPath,narrationPath,srtPath,vttPath,cues,evaluation};
}
