import {readFile,writeFile,mkdir,mkdtemp,rename,rm,lstat,readdir,rmdir} from 'node:fs/promises';
import {resolve,dirname,join,relative,isAbsolute,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {z} from 'zod';
import {StorySchema,type Story} from '../contracts/story.js';
import {ArtifactSchema} from '../contracts/runtime.js';
import {ArtifactStore} from '../assets/store.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {canonical,sha256} from '../core/util.js';
import {EngineError,checkAbort,errorInfo} from '../core/errors.js';
import {command} from '../core/process.js';
import {ffprobePath} from '../providers/local.js';
import {captureEvidence,boundedFile,ancestors,preflightStatePath,verifyCaptured,readTask} from './runtime.js';
import {AnimationSchema,compileAnimation} from './animation.js';
import {compileStory} from './compile.js';
import {VoiceBindingSchema} from './voice-handoff.js';
import {deriveResearchHandoff} from './research-handoff.js';
import {renderFramePreview} from './frame-preview.js';

export const ASSET_PACK_KIND='experimental-story-asset-pack-v1';
const MAX_AUDIO=50_000_000,MAX_TOTAL_AUDIO=100_000_000;
const json=(v:unknown)=>JSON.stringify(v,null,2)+'\n';
const parse=(b:Buffer)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b).replace(/^\uFEFF/,''));
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const Clip=z.object({shotId:z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),path:z.string(),sha256:hash,transcript:z.string().min(1),bytes:z.number().int().positive().max(MAX_AUDIO)}).strict();
const Probe=z.discriminatedUnion('ok',[
 z.object({ok:z.literal(true),shotId:z.string(),measuredSeconds:z.number().finite().positive(),audioStreams:z.literal(1),videoStreams:z.literal(0)}).strict(),
 z.object({ok:z.literal(false),shotId:z.string(),code:z.string(),message:z.string()}).strict(),
]);
const Input=z.object({story:StorySchema,animation:AnimationSchema,voice:z.object({schemaVersion:z.literal('1.0'),storyId:z.string(),voiceLabel:z.string().min(1).max(300),clips:z.array(Clip).max(100)}).strict(),sources:z.array(z.object({id:z.string(),sha256:hash,bytes:z.number().int().positive().max(2_000_000)}).strict()).max(8),probe:z.object({tool:z.literal('ffprobe'),version:z.string().max(1000),receipts:z.array(Probe).max(100)}).strict(),compiler:z.array(z.object({file:z.string(),sha256:hash}).strict()).min(1).max(30)}).strict();
type PackInput=z.infer<typeof Input>;
const File=z.object({path:z.string().regex(/^(story|portable-story|animation|compiled|research-handoff|voice-bindings|voice-handoff|probe-receipts|provenance|manifest)\.json$|^index\.html$|^sources\/[a-z][a-z0-9-]{0,63}\.txt$|^audio\/[a-z][a-z0-9-]{0,63}\.bin$|^frames\/[a-z][a-z0-9-]{0,63}-(early|middle|late)\.svg$/),artifact:ArtifactSchema}).strict();
const Result=z.object({schemaVersion:z.literal('1.0'),kind:z.literal(ASSET_PACK_KIND),review:z.literal('pending'),files:z.array(File).min(12).max(420)}).strict();
const compilerFiles=['story-planner/asset-pack.ts','story-planner/animation.ts','story-planner/frame-preview.ts','story-planner/compile.ts','story-planner/runtime.ts','story-planner/research-handoff.ts','story-planner/voice-handoff.ts','story-planner/cli.ts','contracts/story.ts','contracts/evidence-plan.ts','contracts/runtime.ts','assets/store.ts','orchestrator/tasks.ts','operations/usage.ts','core/util.ts','core/errors.ts','core/process.ts','providers/local.ts'];
const fingerprint=(input:PackInput)=>sha256(canonical({version:'production-task-v1',kind:ASSET_PACK_KIND,input}));

function validateVoice(story:Story,voice:PackInput['voice']){
 if(voice.storyId!==story.id||new Set(voice.clips.map(c=>c.shotId)).size!==voice.clips.length)throw new Error('Voice story/shot binding mismatch');
 for(const clip of voice.clips){const shot=story.shots.find(s=>s.id===clip.shotId);if(!shot||shot.narration!==clip.transcript||clip.path!==`audio/${clip.shotId}.bin`)throw new Error('Voice transcript does not match exact current narration or portable clip path');}
}
function handoff(input:PackInput){
 validateVoice(input.story,input.voice);const plan=compileStory(input.story);
 if(input.probe.receipts.length!==input.voice.clips.length||new Set(input.probe.receipts.map(p=>p.shotId)).size!==input.probe.receipts.length)throw new Error('Probe receipt coverage mismatch');
 const clips=input.voice.clips.map(c=>{const p=input.probe.receipts.find(p=>p.shotId===c.shotId);if(!p||!p.ok)throw new EngineError('ASSET_AUDIO',p&&!p.ok?p.message:'Missing audio receipt');const shot=plan.shots.find(s=>s.id===c.shotId)!;const availableSeconds=(shot.endFrame-shot.startFrame)/plan.fps;return{...c,measuredSeconds:p.measuredSeconds,availableSeconds,fits:p.measuredSeconds<=availableSeconds};});
 const pendingShots=input.story.shots.filter(s=>!clips.some(c=>c.shotId===s.id)).map(s=>s.id);
 return{schemaVersion:'1.0',storyId:input.story.id,voiceLabel:input.voice.voiceLabel,scope:'local-audio-technical-handoff-not-listening-approval',transcriptVerification:'caller-declared; recorded speech not verified',timingBasis:!clips.length?'estimate-only':pendingShots.length?'partial-measured-audio':'measured-audio',timelineBasis:'estimated-story-frames; measured audio does not automatically retime animation',clips,pendingShots,review:'pending',retiming:'manual review required; never stretch or truncate automatically'};
}
function deriveFiles(input:PackInput,sources:Map<string,Buffer>,audio:Map<string,Buffer>){
 const story=input.story,compiled=compileAnimation(story,input.animation),voice=handoff(input);
 const provenance={schemaVersion:'1.0',scope:'authored-diagnostic-illustration-not-observed-execution',review:'pending',storyId:story.id,disclosure:story.evidence.disclosure,sources:story.evidence.sources.map(s=>({...s,path:`sources/${s.id}.txt`})),claims:story.evidence.claims,authoredAnimation:input.animation,parameterBasis:'All rule ranges, rates, mappings, artwork and choreography are author-selected illustrations; citations do not establish their numerical values or observed results.'};
 const provenanceBytes=json(provenance),files=new Map<string,Buffer>();const put=(path:string,value:unknown)=>files.set(path,Buffer.from(json(value)));
 put('story.json',story);put('portable-story.json',{...story,evidence:{...story.evidence,sources:provenance.sources}});put('animation.json',input.animation);put('compiled.json',compiled);put('research-handoff.json',deriveResearchHandoff({graph:story,sources:[...sources].map(([id,bytes])=>({id,bytes}))}));put('voice-bindings.json',input.voice);put('voice-handoff.json',voice);put('probe-receipts.json',input.probe);files.set('provenance.json',Buffer.from(provenanceBytes));
 for(const [id,b] of sources)files.set(`sources/${id}.txt`,b);for(const [id,b] of audio)files.set(`audio/${id}.bin`,b);
 const samples=[];
 for(const shot of compiled.shots)for(const [label,fraction] of [['early',.1],['middle',.5],['late',.9]] as const){const frame=shot.startFrame+Math.floor((shot.endFrame-shot.startFrame-1)*fraction),path=`frames/${shot.shotId}-${label}.svg`;files.set(path,Buffer.from(renderFramePreview(compiled,frame,{story,provenanceSha256:sha256(provenanceBytes)})));samples.push({shotId:shot.shotId,label,frame,path});}
 // All HTML strings are fixed or generated safe identifiers; authored prose stays in escaped SVG/JSON.
 files.set('index.html',Buffer.from('<!doctype html><meta charset="utf-8"><title>Experimental authored asset pack</title><body style="background:#101827;color:white;font-family:Arial"><h1>Experimental authored asset pack — review pending</h1><p>Diagnostic sampled SVG frames; no movie, observed target execution, listening approval or audience-quality claim. Timings remain estimates. Audio transcripts are caller-declared.</p><p><a href="provenance.json">Statements, rationale, exact citations, source URLs and hashes</a> · <a href="voice-handoff.json">Measured / pending voice handoff</a> · <a href="manifest.json">Manifest</a></p>'+(voice.clips.length?'<h2>Captured audio — listening and transcript review pending</h2>'+voice.clips.map(c=>`<p>${c.shotId}: <audio controls src="${c.path}"></audio></p>`).join(''):'<p>No recordings supplied; all narration shots pending. Estimated timing only.</p>')+samples.map(s=>`<figure style="display:inline-block"><img width="240" src="${s.path}" alt="${s.shotId} ${s.label} frame ${s.frame}"><figcaption>${s.shotId} ${s.label} frame ${s.frame}</figcaption></figure>`).join('')+'</body>'));
 put('manifest.json',{schemaVersion:'1.0',kind:ASSET_PACK_KIND,taskId:fingerprint(input),review:'pending',scope:'bounded authored SVG asset pack; no movie or production approval',samples,files:[...files].map(([path,b])=>({path,sha256:sha256(b),bytes:b.length}))});
 return{files,voice,samples};
}

/** Capture immutable input bytes before probing. Status/export never read original paths or run tools. */
export async function planAssetPack(spec:string,root:string,animationPath:string,voicePath:string,data:string,signal:AbortSignal){
 checkAbort(signal);const snapshot=await captureEvidence(spec,root),animation=AnimationSchema.parse(parse(await boundedFile(resolve(animationPath))));compileAnimation(snapshot.graph,animation);
 const rawVoice=VoiceBindingSchema.parse(parse(await boundedFile(resolve(voicePath))));
 if(rawVoice.voiceLabel.length>300)throw new Error('Voice label exceeds bounded length');
 const voice={...rawVoice,clips:rawVoice.clips.map(c=>({...c,path:`audio/${c.shotId}.bin`,bytes:1}))};validateVoice(snapshot.graph,voice);
 const audio=new Map<string,Buffer>();let total=0;for(const c of rawVoice.clips){checkAbort(signal);const b=await boundedFile(resolve(c.path),MAX_AUDIO);if(sha256(b)!==c.sha256)throw new Error('Voice content hash mismatch');total+=b.length;if(total>MAX_TOTAL_AUDIO)throw new Error('Audio snapshot exceeds total byte limit');audio.set(c.shotId,b);voice.clips.find(x=>x.shotId===c.shotId)!.bytes=b.length;}
 const probe:PackInput['probe']={tool:'ffprobe',version:'not-invoked-no-clips',receipts:[]};
 if(audio.size){const dir=await mkdtemp(join(tmpdir(),'gve-asset-probe-'));try{
  let versionError:unknown;try{probe.version=(await command(ffprobePath(),['-version'],{signal,timeout:30000})).split(/\r?\n/)[0]!.slice(0,1000);}catch(e){checkAbort(signal);versionError=e;probe.version='unavailable';}
  for(const [shotId,b] of audio){checkAbort(signal);try{if(versionError)throw versionError;const path=join(dir,shotId+'.bin');await writeFile(path,b,{flag:'wx'});const raw=JSON.parse(await command(ffprobePath(),['-v','error','-show_streams','-show_format','-of','json',path],{signal,timeout:30000}));const streams=raw.streams??[],duration=Number(raw.format?.duration);if(streams.filter((s:{codec_type:string})=>s.codec_type==='audio').length!==1||streams.some((s:{codec_type:string})=>s.codec_type==='video')||!Number.isFinite(duration)||duration<=0)throw new Error('Expected one measurable audio stream and no video');probe.receipts.push({ok:true,shotId,measuredSeconds:duration,audioStreams:1,videoStreams:0});}catch(e){checkAbort(signal);const error=errorInfo(e);probe.receipts.push({ok:false,shotId,code:error.code,message:'Local audio probe failed: '+error.message.replaceAll(dir,'<owned-audio-snapshot>').slice(0,1200)});}}
 }finally{await rm(dir,{recursive:true,force:true});}}
 const compiler=await Promise.all([...compilerFiles.map(file=>({file,path:resolve(import.meta.dirname,'..',file)})),...['package.json','pnpm-lock.yaml','tsconfig.json'].map(file=>({file,path:resolve(import.meta.dirname,'../..',file)}))].map(async ({file,path})=>({file,sha256:sha256(await readFile(path))})));
 const input=Input.parse({story:snapshot.graph,animation,voice,sources:snapshot.sources.map(s=>({id:s.id,sha256:sha256(s.bytes),bytes:s.bytes.length})),probe,compiler}),id=fingerprint(input);
 data=resolve(data);preflightStatePath(data);await ancestors(data);const runner=new TaskRunner(data);
 try{const task=await runner.run(ASSET_PACK_KIND,input,async(_dir,workSignal)=>{checkAbort(workSignal);const derived=deriveFiles(input,new Map(snapshot.sources.map(s=>[s.id,s.bytes])),audio),outputs=[];for(const [path,bytes] of derived.files){checkAbort(workSignal);const artifact=await runner.artifacts.commit(bytes,path.endsWith('.txt')?'text/plain':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.html')?'text/html':path.endsWith('.bin')?'application/octet-stream':'application/json','PUBLISH',id);outputs.push({path,artifact});}return{value:{schemaVersion:'1.0',kind:ASSET_PACK_KIND,review:'pending',files:outputs},outputs:outputs.map(x=>x.artifact)};},signal,{attempts:3,timeoutMs:120000});await statusAssetPack(data,id);return{taskId:id,cached:task.cached,state:'succeeded',scope:'bounded authored SVG asset pack; no movie',review:'pending'};}finally{runner.close();}
}

async function checkedPack(data:string,id:string){
 const task=await readTask(data,id,ASSET_PACK_KIND),input=Input.parse(task.input);if(fingerprint(input)!==id)throw new Error('Asset pack identity mismatch');
 if(task.state!=='succeeded'||!task.result)throw new Error('Asset pack has no successful committed output');const store=new ArtifactStore(data);
 const read=async(a:z.infer<typeof ArtifactSchema>)=>{if(a.inputFingerprint!==id)throw new Error('Artifact fingerprint mismatch');const b=await boundedFile(store.path(a),MAX_AUDIO);if(b.length!==a.bytes||sha256(b)!==a.sha256)throw new Error('Asset pack artifact missing or damaged');return b;};
 const result=Result.parse(parse(await read(task.result)));if(canonical(result.files.map(f=>canonical(f.artifact)).sort())!==canonical(task.outputs.map(a=>canonical(a)).sort()))throw new Error('Asset pack output binding mismatch');
 const files=new Map<string,Buffer>();let total=0;for(const f of result.files){if(files.has(f.path))throw new Error('Duplicate asset pack path');const b=await read(f.artifact);total+=b.length;if(total>128_000_000)throw new Error('Asset pack exceeds total limit');files.set(f.path,b);}
 const sources=new Map(input.sources.map(s=>{const b=files.get(`sources/${s.id}.txt`);if(!b||sha256(b)!==s.sha256||b.length!==s.bytes)throw new Error('Source snapshot input mismatch');return[s.id,b] as const;}));verifyCaptured(input.story,[...sources].map(([id,bytes])=>({id,bytes})));
 if(canonical(input.sources.map(s=>s.id))!==canonical(input.story.evidence.sources.map(s=>s.id)))throw new Error('Source coverage mismatch');
 const audio=new Map(input.voice.clips.map(c=>{const b=files.get(c.path);if(!b||b.length!==c.bytes||sha256(b)!==c.sha256)throw new Error('Audio snapshot input mismatch');return[c.shotId,b] as const;}));
 const derived=deriveFiles(input,sources,audio);if(files.size!==derived.files.size)throw new Error('Asset pack file coverage mismatch');for(const [path,b] of derived.files)if(!files.has(path)||sha256(files.get(path)!)!==sha256(b))throw new Error('Asset pack derivation mismatch: '+path);
 return{task,result,input,...derived};
}
export async function statusAssetPack(data:string,id:string){
 const task=await readTask(data,id,ASSET_PACK_KIND);Input.parse(task.input);if(task.state!=='succeeded')return{taskId:id,state:task.state,attempt:task.attempt,error:task.error,integrity:'no committed successful pack',review:'pending'};
 const checked=await checkedPack(data,id);return{taskId:id,state:task.state,attempt:task.attempt,integrity:'verified',review:'pending',voice:checked.voice,samples:checked.samples,files:checked.result.files.map(f=>({path:f.path,sha256:f.artifact.sha256,bytes:f.artifact.bytes})),scope:'bounded authored SVG asset pack; no movie or production approval'};
}
const inside=(root:string,path:string)=>{const r=relative(root,path);return !isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);};
/** Publish one complete bundle inside an exclusively reserved output. Never overwrite user files. */
export async function exportAssetPack(data:string,id:string,out:string,signal:AbortSignal){
 checkAbort(signal);data=resolve(data);out=resolve(out);if(inside(data,out)||inside(out,data))throw new Error('Output and task state overlap');const checked=await checkedPack(data,id);await ancestors(dirname(out),true);await ancestors(out);
 await mkdir(out);let stage:string|undefined,complete=false;
 try{await writeFile(join(out,'.asset-pack-owner.json'),json({schemaVersion:'1.0',taskId:id}),{flag:'wx'});stage=await mkdtemp(join(out,'.asset-staging-'));for(const [path,bytes] of checked.files){checkAbort(signal);const dest=join(stage,...path.split('/'));await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes,{flag:'wx'});}checkAbort(signal);await ancestors(out);await rename(stage,join(out,'bundle'));stage=undefined;complete=true;return{taskId:id,output:out,bundle:join(out,'bundle'),review:'pending'};
 }finally{if(stage)await rm(stage,{recursive:true,force:true});if(!complete){const names=await readdir(out).catch(()=>[]);if(names.length===1&&names[0]==='.asset-pack-owner.json'){await rm(join(out,names[0]));await rmdir(out);}}}
}
