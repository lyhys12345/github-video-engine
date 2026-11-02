import {readFile,writeFile,mkdir,stat,lstat,copyFile} from 'node:fs/promises';
import {resolve,join,dirname,relative,isAbsolute} from 'node:path';
import {StorySchema} from '../contracts/story.js';
import {compileAnimation} from '../story-planner/animation.js';
import {command} from '../core/process.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {sha256,canonical} from '../core/util.js';
import {projectRoot,browserPath,ffmpegPath,ffprobePath} from '../providers/local.js';
import {SegmentInputSchema,SegmentCueTimingSchema,VisualPlanSchema,VisualStyleSchema,validateSegmentNarration,validateSegmentGeneration,buildSegmentTimeline,segmentSrt} from './plan.js';
import {renderSegmentFrame} from './frame.js';
import {segmentRevision} from './revision.js';
async function bounded(path:string,max=10_000_000){const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.size>max)throw Error('Expected bounded regular input: '+path);const bytes=await readFile(path);if(bytes.length!==info.size)throw Error('Input changed while reading');return bytes;}
function child(root:string,path:string){if(!path||path.includes('\\')||path.startsWith('/')||path.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Unsafe pack path');const dest=resolve(root,path),rel=relative(root,dest);if(isAbsolute(rel)||rel.startsWith('..'))throw Error('Pack path outside bundle');return dest;}
export async function renderShortSegment(configPath:string,outputPath:string,signal:AbortSignal){
 const inputBytes=await bounded(resolve(configPath)),input=SegmentInputSchema.parse(JSON.parse(inputBytes.toString('utf8'))),bundleRoot=resolve(input.bundlePath),out=resolve(outputPath);
 if(out===bundleRoot||!relative(bundleRoot,out).startsWith('..')||!relative(out,bundleRoot).startsWith('..'))throw Error('Output and source pack overlap');
 try{await stat(out);throw Error('Output exists; choose a new versioned directory');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const manifestBytes=await bounded(join(bundleRoot,'manifest.json')),manifest=JSON.parse(manifestBytes.toString('utf8'));
 if(manifest.kind!=='experimental-story-asset-pack-v1'||!Array.isArray(manifest.files)||manifest.files.length>600)throw Error('Not a bounded asset-pack closure');
 const captured=new Map<string,Buffer>();
 for(const entry of manifest.files){if(captured.has(entry.path))throw Error('Duplicate source path');const bytes=await bounded(child(bundleRoot,entry.path));if(sha256(bytes)!==entry.sha256||bytes.length!==entry.bytes)throw Error('Source asset closure hash mismatch: '+entry.path);captured.set(entry.path,bytes);}
 const story=StorySchema.parse(JSON.parse(captured.get('story.json')!.toString('utf8'))),animation=JSON.parse(captured.get('animation.json')!.toString('utf8'));
 if(canonical(compileAnimation(story,animation))!==canonical(JSON.parse(captured.get('compiled.json')!.toString('utf8'))))throw Error('Captured animation derivation mismatch');
 const planBytes=await bounded(resolve(input.visualPlanPath)),plan=VisualPlanSchema.parse(JSON.parse(planBytes.toString('utf8')));
 const styleBytes=plan.styleAssetPath?captured.get(plan.styleAssetPath):undefined;
 if(plan.presentation==='continuous-explainer'&&!styleBytes)throw Error('Continuous style asset missing from verified source closure');
 const visualStyle=styleBytes?VisualStyleSchema.parse(JSON.parse(styleBytes.toString('utf8'))):undefined;
 const narration=validateSegmentNarration(story,plan,input.voice.transcript),voice=await bounded(resolve(input.voice.path),50_000_000);
 if(sha256(voice)!==input.voice.sha256)throw Error('Current voice integrity mismatch');
 const font=await bounded(join(projectRoot,'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'),30_000_000);if(sha256(font)!=='a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da')throw Error('Locked font mismatch');
 const receipt=input.generationReceiptPath?await bounded(resolve(input.generationReceiptPath)):undefined;
 validateSegmentGeneration(plan,receipt?JSON.parse(receipt.toString('utf8')):undefined,sha256(voice),narration,input.voice.provider,input.voice.voiceLabel);
 const cueTimingBytes=input.cueTimingPath?await bounded(resolve(input.cueTimingPath)):undefined,cueTiming=cueTimingBytes?SegmentCueTimingSchema.parse(JSON.parse(cueTimingBytes.toString('utf8'))):undefined;
 const implementationBytes=await Promise.all(['plan.ts','frame.ts','captions.ts','continuous.ts','revision.ts','composition.tsx','render.ts','worker.ts'].map(async name=>({name,bytes:await readFile(join(projectRoot,'src/short-segment',name))})));
 const fingerprint={source:sha256(manifestBytes),plan:sha256(planBytes),voice:sha256(voice),transcript:sha256(narration),cueTiming:cueTimingBytes?sha256(cueTimingBytes):'estimated',style:styleBytes?sha256(styleBytes):'none',font:sha256(font),implementation:sha256(canonical(implementationBytes.map(f=>({name:f.name,sha256:sha256(f.bytes)}))))};
 const revision=await segmentRevision(input.previousOutputPath?resolve(input.previousOutputPath):undefined,fingerprint);
 await mkdir(dirname(out),{recursive:true});await mkdir(out,{recursive:false});await mkdir(join(out,'source-pack'));
 await mkdir(join(out,'implementation'));for(const file of implementationBytes)await writeFile(join(out,'implementation',file.name),file.bytes);
 await writeFile(join(out,'source-pack/manifest.json'),manifestBytes);
 for(const [path,bytes] of captured){const dest=child(join(out,'source-pack'),path);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});}
 await writeFile(join(out,'input.json'),inputBytes);await writeFile(join(out,'visual-plan.json'),planBytes);await writeFile(join(out,'source-audio.bin'),voice);
 await writeFile(join(out,'revision.json'),JSON.stringify(revision,null,2));
 if(receipt)await writeFile(join(out,'generation-receipt.json'),receipt);
 if(cueTimingBytes)await writeFile(join(out,'cue-timing.json'),cueTimingBytes);
 const commands:{exe:string;args:string[]}[]=[];
 const run=async(exe:string,args:string[],timeout=90000)=>{commands.push({exe,args});await writeFile(join(out,'commands.json'),JSON.stringify(commands,null,2));return command(exe,args,{signal,timeout});};
 const voiceProbeRaw=await run(ffprobePath(),['-v','error','-show_streams','-show_format','-of','json',join(out,'source-audio.bin')]);
 await writeFile(join(out,'source-audio.ffprobe.json'),voiceProbeRaw);const vp=JSON.parse(voiceProbeRaw),audio=vp.streams.filter((s:any)=>s.codec_type==='audio');
 if(vp.streams.length!==1||audio.length!==1)throw Error('One continuous source audio stream required');
 const voiceSeconds=Number(vp.format.duration),timeline=buildSegmentTimeline(plan,voiceSeconds,cueTiming,{voiceSha256:sha256(voice),transcriptSha256:sha256(narration)}),duration=timeline.totalFrames/timeline.fps;
 const provenanceHash=sha256(captured.get('provenance.json')!),sampleFrames=[...new Set([1,timeline.totalFrames-2,...timeline.cues.flatMap(c=>[Math.max(0,c.startFrame-1),c.startFrame,Math.floor((c.startFrame+c.endFrame)/2),c.endFrame-1]),...timeline.cues.slice(0,-1).map(c=>c.endFrame)])].sort((a,b)=>a-b);
 await writeFile(join(out,'timeline.json'),JSON.stringify(timeline,null,2));await writeFile(join(out,'captions.srt'),segmentSrt(timeline));
 await writeFile(join(out,'segment-binding.json'),JSON.stringify({schemaVersion:'1.0',storyId:story.id,sourceShotIds:plan.sourceShotIds,transcript:narration,sourceAudio:{path:'source-audio.bin',sha256:sha256(voice),measuredSeconds:voiceSeconds},voice:input.voice,transcriptVerification:'exact caller declaration and submitted generation text; listening/transcription pending',timing:timeline,retiming:'none; original playback speed; continuous source retained'},null,2));
 await mkdir(join(out,'svg'));for(const frame of sampleFrames)await writeFile(join(out,'svg',`${frame}.svg`),renderSegmentFrame(plan,timeline,frame,provenanceHash,visualStyle));
 const runtimeDir=join(out,'runtime');await mkdir(runtimeDir);await mkdir(join(runtimeDir,'public'));await writeFile(join(runtimeDir,'public/font.ttf'),font);
 const workerInput=join(runtimeDir,'input.json');await writeFile(workerInput,JSON.stringify({entry:join(projectRoot,'src/short-segment/composition.tsx'),browser:await browserPath(),props:{plan,timeline,provenanceHash,visualStyle},sampleFrames}));
 const runtime=await createOwnedRuntimeTmp(runtimeDir);
 try{
  const args=['--import','tsx',join(projectRoot,'src/short-segment/worker.ts'),workerInput];commands.push({exe:process.execPath,args});await writeFile(join(out,'commands.json'),JSON.stringify(commands,null,2));
  const log=await command(process.execPath,args,{signal,timeout:660000,cwd:projectRoot,env:{TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory}});await writeFile(join(out,'render.stdout.txt'),log);
 }finally{await cleanupOwnedRuntimeTmp(runtimeDir);}
 await run(ffmpegPath(),['-v','error','-nostdin','-n','-i',join(out,'source-audio.bin'),'-af',`aresample=48000,adelay=400|400,apad,atrim=duration=${duration}`,'-ac','2','-c:a','pcm_s16le',join(out,'narration.wav')]);
 const rawProbe=JSON.parse(await run(ffprobePath(),['-v','error','-show_streams','-of','json',join(runtimeDir,'silent.mp4')]));
 await writeFile(join(out,'raw-video.ffprobe.json'),JSON.stringify(rawProbe,null,2));
 if(rawProbe.streams.length!==1||rawProbe.streams[0].codec_type!=='video'||rawProbe.streams[0].codec_name!=='h264')throw Error('Expected one silent raw H264 stream');
 const full=rawProbe.streams[0].color_range==='pc'||String(rawProbe.streams[0].pix_fmt).startsWith('yuvj');
 await run(ffmpegPath(),['-v','error','-nostdin','-n','-i',join(runtimeDir,'silent.mp4'),'-i',join(out,'narration.wav'),'-map','0:v:0','-map','1:a:0','-vf',full?'scale=in_range=pc:out_range=tv,format=yuv420p':'format=yuv420p','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','192k','-movflags','+faststart',join(out,'segment.mp4')],240000);
 const probeRaw=await run(ffprobePath(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',join(out,'segment.mp4')]);await writeFile(join(out,'segment.ffprobe.json'),probeRaw);const probe=JSON.parse(probeRaw),v=probe.streams.find((s:any)=>s.codec_type==='video'),a=probe.streams.find((s:any)=>s.codec_type==='audio');
 if(probe.streams.length!==2||v?.codec_name!=='h264'||v.width!==1080||v.height!==1920||v.pix_fmt!=='yuv420p'||v.avg_frame_rate!=='30/1'||Number(v.nb_read_frames)!==timeline.totalFrames||a?.codec_name!=='aac'||a.sample_rate!=='48000'||Math.abs(Number(probe.format.duration)-duration)>.07)throw Error('Final bounded media technical verification failed');
 await run(ffmpegPath(),['-v','error','-xerror','-i',join(out,'segment.mp4'),'-f','null','-'],120000);
 await mkdir(join(out,'samples'));for(const frame of sampleFrames)await copyFile(join(runtimeDir,'samples',`${frame}.png`),join(out,'samples',`${frame}.png`));
 const implementation=[];for(const file of implementationBytes){if(sha256(await readFile(join(projectRoot,'src/short-segment',file.name)))!==sha256(file.bytes))throw Error('Implementation changed during render; new version required');implementation.push({path:'src/short-segment/'+file.name,sha256:sha256(file.bytes)});}
 const evaluation={schemaVersion:'1.0',scope:'one bounded current-story Chen segment; no full film',technicalPassed:true,fingerprint,revision,sourcePackTaskId:manifest.taskId,sourceManifestSha256:sha256(manifestBytes),planSha256:sha256(planBytes),voiceSha256:sha256(voice),generationReceipt:receipt?{path:'generation-receipt.json',sha256:sha256(receipt)}:'missing; current-generation provenance unverified',cueTiming:cueTimingBytes?{path:'cue-timing.json',sha256:sha256(cueTimingBytes),method:timeline.cueMethod}:'estimated text-weighted timing',fontSha256:sha256(font),implementation,timeline,output:{path:'segment.mp4',sha256:sha256(await readFile(join(out,'segment.mp4'))),seconds:duration,probe},sampleFrames,fullDecodeExit:0,listening:'owner-review-pending',subtitleSync:cueTiming?'reviewed-boundaries-owner-acceptance-pending':'estimated-not-forced-aligned-owner-review-pending',continuousAv:'owner-review-pending',visualSampleReview:'independent-review-pending',paidCalls:0,targetExecution:false};
 await writeFile(join(out,'evaluation.json'),JSON.stringify(evaluation,null,2));return {out,evaluation};
}
