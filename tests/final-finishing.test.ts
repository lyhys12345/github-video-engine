import {test,expect,afterEach} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,rm,access,readdir} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {finishFinal,finalSubtitleCues,type FinalFinishingInput} from '../src/renderer/final-finishing.js';
import {command} from '../src/core/process.js';
import {EngineError} from '../src/core/errors.js';
import {ffmpegPath} from '../src/providers/local.js';
import {sha256} from '../src/core/util.js';

const roots:string[]=[],executions:{command:string;exitCode:number;purpose:string}[]=[],evidence=resolve('work/m3-finishing-builder');
const signal=()=>new AbortController().signal;
async function run(args:string[],purpose:string){try{await command(ffmpegPath(),args,{timeout:30000});executions.push({command:[ffmpegPath(),...args].join(' '),exitCode:0,purpose});}catch(e){executions.push({command:[ffmpegPath(),...args].join(' '),exitCode:-1,purpose});throw e;}}
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'gve-final-fin-'));roots.push(root);const clean=join(root,'clean.mp4'),captioned=join(root,'captioned.mp4');
 const video=['-v','error','-nostdin','-n','-f','lavfi','-i','color=c=0x123456:s=180x320:r=24:d=3','-frames:v','72'];
 await run([...video,'-an','-c:v','libx264','-pix_fmt','yuv420p',clean],'Actual synthetic silent72-frame video');
 await run([...video,'-vf','drawbox=x=20:y=260:w=140:h=30:color=white:t=fill','-an','-c:v','libx264','-pix_fmt','yuv420p',captioned],'Actual synthetic caption-variant video; white box, no font/content claim');
 const wavs=[join(root,'a.wav'),join(root,'b.wav')];for(let i=0;i<2;i++)await run(['-v','error','-nostdin','-n','-f','lavfi','-i',`sine=frequency=${440+i*220}:sample_rate=16000:duration=0.8`,'-c:a','pcm_s16le',wavs[i]!],'Actual synthetic tone, NOT speech or listening');
 const input:FinalFinishingInput={cleanVideoPath:clean,captionedVideoPath:captioned,width:180,height:320,fps:24,totalFrames:72,lines:[{id:'first',audioPath:wavs[0]!,durationMs:800,allocatedFrames:36,caption:'合成媒体 <tag> & 测试'},{id:'second',audioPath:wavs[1]!,durationMs:800,allocatedFrames:36,caption:'第二个场景；不是实际语音'}]};return{root,input};
}
afterEach(async()=>{await mkdir(evidence,{recursive:true});await writeFile(join(evidence,'fixture-commands.json'),JSON.stringify(executions,null,2)+'\n');for(const root of roots.splice(0)){const rel=relative(resolve(tmpdir()),resolve(root));if(isAbsolute(rel)||rel.startsWith('..')||!basename(root).startsWith('gve-final-fin-'))throw Error('Unsafe test cleanup path');await rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:50});}});

test('actual FFmpeg finishing mixes synthetic tones, preserves72video frames, measures audio and writes scene-level subtitles',async()=>{
 const f=await fixture(),before=await Promise.all([f.input.cleanVideoPath,f.input.captionedVideoPath,...f.input.lines.map(l=>l.audioPath)].map(async p=>({path:p,hash:sha256(await readFile(p))}))),result=await finishFinal(f.input,join(f.root,'finished'),signal());
 expect(result.evaluation).toMatchObject({passed:true,frames:72,fps:24,width:180,height:320,durationSeconds:3,subtitleTiming:'sentence/scene-level measured allocation, not word-level alignment'});
 expect(result.cues.map(c=>[c.id,c.startMs,c.endMs])).toEqual([['first',0,1500],['second',1500,3000]]);expect(result.evaluation.lineTiming.map(l=>l.pauseMs)).toEqual([700,700]);
 expect(result.evaluation.audioMeasurements.integratedLufs).toBeGreaterThanOrEqual(-19);expect(result.evaluation.audioMeasurements.integratedLufs).toBeLessThanOrEqual(-13);expect(result.evaluation.audioMeasurements.truePeakDbtp).toBeLessThanOrEqual(-0.4);
 expect(result.evaluation.media).toHaveLength(2);for(const m of result.evaluation.media){expect(m.checks).toMatchObject({container:true,video:true,dimensions:true,fps:true,frames:true,duration:true,audio:true,fullDecode:true,encodedAudioMeasured:true});expect(m.probe.streams.filter(s=>s.codec_type==='audio')[0]!.codec_name).toBe('aac');expect(m.probe.format.filename).toBeUndefined();expect(m.audioMeasurements.truePeakDbtp).toBeLessThanOrEqual(-0.1);}
 const segmentPeak=async(start:string,length:string)=>{const stats=await command(ffmpegPath(),['-hide_banner','-nostdin','-i',result.narrationPath,'-af',`atrim=start=${start}:duration=${length},asetpts=PTS-STARTPTS,volumedetect`,'-f','null','-'],{capture:'stderr',timeout:30000});const match=stats.match(/max_volume:\s*(-?[0-9.]+)\s*dB/);expect(match).not.toBeNull();return Number(match![1]);};
 const gapPeakDb=await segmentPeak('0.9','0.4'),secondTonePeakDb=await segmentPeak('1.7','0.3');expect(gapPeakDb).toBeLessThanOrEqual(-85);expect(secondTonePeakDb).toBeGreaterThan(-40);
 const srt=await readFile(result.srtPath,'utf8'),vtt=await readFile(result.vttPath,'utf8');expect(srt).toContain('00:00:00,000 --> 00:00:01,500');expect(srt).toContain('&lt;tag&gt; &amp;');expect(vtt).toContain('WEBVTT\n\nfirst\n00:00:00.000 --> 00:00:01.500');
 expect(result.evaluation.deferredChecks).toContain('actual listening');for(const b of before)expect(sha256(await readFile(b.path))).toBe(b.hash);
 await mkdir(evidence,{recursive:true});await writeFile(join(evidence,'actual-short-result.json'),JSON.stringify({fixtureDescription:'actual synthetic tone/video tools; no speech/AV quality claim',...result.evaluation,cues:result.cues,waveformCheck:{gapPeakDb,secondTonePeakDb}},null,2)+'\n');
 const outputHash=sha256(await readFile(result.masterPath));await expect(finishFinal(f.input,join(f.root,'finished'),signal())).rejects.toMatchObject({code:'FINISH_OUTPUT_EXISTS'});expect(sha256(await readFile(result.masterPath))).toBe(outputHash);
},30000);

test('actual probes reject forged measured duration, source audio on a silent-video input and corrupted media without successful outputs',async()=>{
 const f=await fixture(),badDuration=structuredClone(f.input);badDuration.lines[0]!.durationMs=700;const out=join(f.root,'bad-duration');await expect(finishFinal(badDuration,out,signal())).rejects.toMatchObject({code:'FINISH_AUDIO'});expect(await readdir(out)).toEqual([]);
 const audible=join(f.root,'audible.mp4');await run(['-v','error','-nostdin','-n','-i',f.input.cleanVideoPath,'-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=3','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac',audible],'Actual intentionally audible source, rejected by silent-input boundary');
 await expect(finishFinal({...f.input,cleanVideoPath:audible},join(f.root,'bad-audible'),signal())).rejects.toMatchObject({code:'FINISH_MEDIA'});
 const corrupt=join(f.root,'corrupt.wav');await writeFile(corrupt,'NOT AUDIO');const input=structuredClone(f.input);input.lines[0]!.audioPath=corrupt;await expect(finishFinal(input,join(f.root,'bad-wave'),signal())).rejects.toThrow();expect(await readdir(join(f.root,'bad-wave'))).toEqual([]);
},30000);

test('pure subtitle/timing boundary rejects unsafe text, duplicate IDs, unsupported format and allocations before media execution',()=>{
 const input:FinalFinishingInput={cleanVideoPath:'not-used',captionedVideoPath:'not-used',width:180,height:320,fps:24,totalFrames:36,lines:[{id:'line',audioPath:'not-used',durationMs:800,allocatedFrames:36,caption:'Plain caption'}]};
 expect(finalSubtitleCues(input)).toEqual([{id:'line',startMs:0,endMs:1500,text:'Plain caption'}]);
 expect(()=>finalSubtitleCues({...input,speed:2} as FinalFinishingInput)).toThrow('Unsupported');expect(()=>finalSubtitleCues({...input,lines:[{...input.lines[0]!,speed:2}]} as unknown as FinalFinishingInput)).toThrow('Invalid');
 for(const caption of ['bad\ncue','bad\u0000cue','{\\pos(0,0)}','bad --> cue'])expect(()=>finalSubtitleCues({...input,lines:[{...input.lines[0]!,caption}]})).toThrow('caption');
 expect(()=>finalSubtitleCues({...input,lines:[input.lines[0]!,input.lines[0]!],totalFrames:72})).toThrow('duplicate');
 expect(()=>finalSubtitleCues({...input,fps:25})).toThrow('24/30');expect(()=>finalSubtitleCues({...input,totalFrames:35})).toThrow('entire');expect(()=>finalSubtitleCues({...input,lines:[{...input.lines[0]!,durationMs:1400}]})).toThrow('pause');
});

test('pre-cancelled finishing never creates an output directory or starts media work',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gve-final-fin-'));roots.push(root);const output=join(root,'never-created'),control=new AbortController();control.abort(new EngineError('CANCELLED','owned fixture cancellation','cancelled'));
 await expect(finishFinal({} as FinalFinishingInput,output,control.signal)).rejects.toMatchObject({code:'CANCELLED'});await expect(access(output)).rejects.toMatchObject({code:'ENOENT'});
});

test('long30fps timeline with noninteger-second scene allocations has exact final PCM samples and preserved voice windows',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gve-final-fin-'));roots.push(root);const clean=join(root,'long-clean.mp4'),captioned=join(root,'long-captioned.mp4'),frames=621,seconds=frames/30;
 await run(['-v','error','-nostdin','-n','-f','lavfi','-i',`color=c=0x263748:s=180x320:r=30:d=${seconds}`,'-frames:v',String(frames),'-an','-c:v','libx264','-pix_fmt','yuv420p',clean],'Actual long synthetic621frame timeline for sample-count regression');
 await run(['-v','error','-nostdin','-n','-i',clean,'-c:v','copy',captioned],'Actual second silent input for long finishing regression');
 const durations=[5600,7000,4800],allocations=[179,229,213],lines=[];for(let i=0;i<durations.length;i++){const audioPath=join(root,`long-${i}.wav`);await run(['-v','error','-nostdin','-n','-f','lavfi','-i',`sine=frequency=${330+i*220}:sample_rate=22050:duration=${durations[i]!/1000}`,'-c:a','pcm_s16le',audioPath],'Actual22050Hz long synthetic tone, not speech');lines.push({id:`long-${i}`,audioPath,durationMs:durations[i]!,allocatedFrames:allocations[i]!,caption:`Synthetic long scene ${i}`});}
 const result=await finishFinal({cleanVideoPath:clean,captionedVideoPath:captioned,width:180,height:320,fps:30,totalFrames:frames,lines},join(root,'long-finished'),signal());
 expect(Number(result.evaluation.narrationProbe.streams[0]!.duration_ts)).toBe(frames*48000/30);expect(Number(result.evaluation.narrationProbe.format.duration)).toBe(seconds);expect(result.cues.map(c=>[c.startMs,c.endMs])).toEqual([[0,5967],[5967,13600],[13600,20700]]);
 const peak=async(start:number,length:number)=>{const text=await command(ffmpegPath(),['-hide_banner','-nostdin','-i',result.narrationPath,'-af',`atrim=start=${start}:duration=${length},asetpts=PTS-STARTPTS,volumedetect`,'-f','null','-'],{capture:'stderr',timeout:30000});const match=text.match(/max_volume:\s*(-?[0-9.]+)\s*dB/);expect(match).not.toBeNull();return Number(match![1]);};
 const precedingGapPeak=await peak(5.7,0.15),secondVoicePeak=await peak(6.2,0.3),tailPeak=await peak(20.4,0.2);expect(precedingGapPeak).toBeLessThanOrEqual(-85);expect(secondVoicePeak).toBeGreaterThan(-40);expect(tailPeak).toBeLessThanOrEqual(-85);
 await mkdir(evidence,{recursive:true});await writeFile(join(evidence,'long-sample-proof.json'),JSON.stringify({scope:'actual synthetic long media, not real voice/hearing',expectedSamples:frames*48000/30,actualSamples:result.evaluation.narrationProbe.streams[0]!.duration_ts,seconds,cues:result.cues,precedingGapPeak,secondVoicePeak,tailPeak,media:result.evaluation.media,audioMeasurements:result.evaluation.audioMeasurements},null,2)+'\n');
},30000);
