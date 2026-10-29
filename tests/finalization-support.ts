import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {deflateSync} from 'node:zlib';
import {repairFixture,cleanupRepairRoot} from './repair-support.js';
import {FinalizationStore,type FinalizationOptions,type FullRenderRequest,type FullRendered} from '../src/workflow/finalization.js';
import {canonical,sha256} from '../src/core/util.js';
import type {Artifact} from '../src/contracts/runtime.js';
import type {finishFinal} from '../src/renderer/final-finishing.js';
import type {inspectProduction} from '../src/renderer/production.js';

const signal=()=>new AbortController().signal;
// A decodable synthetic blank PNG; never presented as a Remotion/visual-quality result.
let blankPng:Buffer|undefined;
function png(){if(blankPng)return blankPng;const crc=(data:Buffer)=>{let v=0xffffffff;for(const b of data){v^=b;for(let i=0;i<8;i++)v=(v>>>1)^((v&1)?0xedb88320:0);}return(v^0xffffffff)>>>0;};const chunk=(kind:string,data:Buffer)=>{const type=Buffer.from(kind),length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([length,type,data,sum]);};const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1080,0);ihdr.writeUInt32BE(1920,4);ihdr[8]=8;ihdr[9]=6;const pixels=Buffer.alloc((1080*4+1)*1920);blankPng=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);return blankPng;}

export async function mockFinalPreview(base:Awaited<ReturnType<typeof repairFixture>>,kind:'animatic'|'motion'){
 return base.store.tasks.run(kind,{projectId:'demo',packageHash:base.row.hash,fixture:'MOCK media preview; no renderer or real speech'},async()=>{
  const video=await base.store.tasks.artifacts.commit('MOCK '+kind+' video, not a real media stream','video/mp4','RENDER',base.row.hash),evaluation=await base.store.tasks.artifacts.commit(canonical({evaluatorVersion:'production-ffprobe-v1',passed:true,checks:[['MOCK',true]],note:'MOCK inspection; not an FFprobe result'}),'application/json','VERIFY_MEDIA',base.row.hash),readthrough=await base.store.readMeasured(base.design);
  return{value:{mode:kind,video,evaluation,frames:kind==='animatic'?readthrough.totalFrames:Math.round(base.design.authorization.motionSeconds*readthrough.fps),fps:readthrough.fps,width:kind==='animatic'?360:720,height:kind==='animatic'?640:1280,temporaryVoice:true},outputs:[video,evaluation]};
 },signal());
}

export async function finalizationFixture(options:{g3?:boolean;previews?:Array<'animatic'|'motion'>}={}){
 const base=await repairFixture(2,options.g3??true),ownerPath=join(base.root,'owner-av.json');
 const authorityBytes=await readFile('reviews/owner-av-deferral-2026-10-26.json');await writeFile(ownerPath,authorityBytes);
 for(const kind of options.previews??['animatic','motion'])await mockFinalPreview(base,kind);
 const counts={inspect:0,render:0,finish:0};
 const controls:{onRender?:((input:FullRenderRequest,signal:AbortSignal)=>Promise<void>)}={};
 const render=async(input:FullRenderRequest,directory:string,control:AbortSignal):Promise<FullRendered>=>{
  counts.render++;await controls.onRender?.(input,control);await mkdir(directory,{recursive:true});
  const clean=join(directory,'clean-silent.mp4'),captioned=join(directory,'captioned-silent.mp4'),cover=join(directory,'cover.png'),sample=join(directory,'sample.png'),metadata=join(directory,'metadata.json'),progress=join(directory,'progress.json');
  await writeFile(clean,'MOCK clean video; not real media');await writeFile(captioned,'MOCK captioned video; not real media');await writeFile(cover,png());await writeFile(sample,png());
  const font={sha256:input.font.sha256,family:'GVE Noto Sans SC',legacyRequestedFamily:input.design.style.fontFamily,loaded:true},source={recipe:'portrait-cascade-derived-v2',upstreamCommit:'43bd349a136651865ecfa6ea1cf012f6e957d304'};
  await writeFile(metadata,canonical({mock:true,font,source,note:'MOCK renderer metadata; no browser/font/quality observation'}));await writeFile(progress,canonical({mock:true}));
  return{clean,captioned,cover,samples:[{sceneId:input.design.scenes[0]!.id,frame:0,localFrame:0,phase:'start',path:sample}],frames:input.readthrough.totalFrames,fps:input.readthrough.fps,width:1080,height:1920,metadata,progress,font,source,silent:true};
 };
 const finisher=async(_input:unknown,directory:string)=>{
  counts.finish++;await mkdir(directory,{recursive:true});const masterPath=join(directory,'master.mp4'),captionedPath=join(directory,'captioned.mp4'),narrationPath=join(directory,'narration.wav'),srtPath=join(directory,'captions.srt'),vttPath=join(directory,'captions.vtt');
  for(const[file,bytes]of [[masterPath,'MOCK finished master'],[captionedPath,'MOCK finished captioned'],[narrationPath,'MOCK finished voice'],[srtPath,'1\n00:00:00,000 --> 00:00:10,000\nMOCK caption\n'],[vttPath,'WEBVTT\n\n00:00:00.000 --> 00:00:10.000\nMOCK caption\n']])await writeFile(file!,bytes!);
  return{masterPath,captionedPath,narrationPath,srtPath,vttPath,cues:[],evaluation:{schemaVersion:'final-finishing/1.0',passed:true,mock:true,note:'MOCK finisher; no FFmpeg, media validation or hearing'}};
 };
 const injected:FinalizationOptions={reviewRoot:base.root,authorityPath:ownerPath,assets:async()=>({font:Buffer.from('MOCK font; not real font data'),license:Buffer.from('MOCK license fixture; not a distribution claim'),metadata:Buffer.from('MOCK font metadata'),sourceCommit:'a'.repeat(40)}),inspectPreview:async()=>{counts.inspect++;return{passed:true,mock:true,note:'MOCK preview inspection; not FFprobe'} as unknown as Awaited<ReturnType<typeof inspectProduction>>;},renderer:render,finisher:finisher as unknown as typeof finishFinal};
 const store=new FinalizationStore(base.store.root,injected);
 return{base,store,ownerPath,authorityBytes,counts,controls,injected,close:async()=>{store.close();base.store.close();await cleanupRepairRoot(base.root);}};
}

export const finalTaskRows=(store:FinalizationStore)=>store.tasks.db.prepare('SELECT id,data FROM tasks ORDER BY id').all().map(r=>({...r}));
export const artifactBytes=async(store:FinalizationStore,a:Artifact)=>readFile(store.tasks.artifacts.path(a));

/** All six Judge receipts are MOCK fixtures, never independent technical acceptance. */
export async function mockFinalReview(f:Awaited<ReturnType<typeof finalizationFixture>>,full:Awaited<ReturnType<FinalizationStore['run']>>){
 const folder=join(f.base.root,'mock-final-review');await mkdir(folder,{recursive:true});
 const rel=(path:string)=>relative(f.base.root,path).replaceAll('\\','/'),rulesPath=join(folder,'gate.json'),candidatePath=join(folder,'candidate.json'),delegationPath=join(folder,'delegation.json'),proof=join(folder,'MOCK-proof.log');
 const rules=JSON.parse(await readFile('reviews/M3/gate.json','utf8')),delegation=JSON.parse(await readFile(f.base.review.delegationPath,'utf8'));
 await writeFile(rulesPath,JSON.stringify(rules,null,2)+'\n');await writeFile(delegationPath,JSON.stringify(delegation,null,2)+'\n');await writeFile(proof,'MOCK six-role G5 engineering receipts. No real Judge, media or AV acceptance.\n');
 const task=f.store.tasks.get(full.id)!,auth=f.store.tasks.get(full.value.authorizationTaskId)!,prepared=await f.store.tasks.artifacts.readJson<any>(auth.result!);
 const artifacts=[task.result!,full.value.authorization,prepared.ownerDeferral,...task.outputs] as Artifact[];
 const candidate={id:'MOCK-final-engineering-candidate',milestone:rules.milestone,mock:true,finalization:{projectId:'demo',packageHash:full.value.packageHash,authorizationTaskId:full.value.authorizationTaskId,fullTaskId:full.id,masterHash:full.value.master.sha256,captionedHash:full.value.captioned.sha256,narrationHash:full.value.narration.sha256,srtHash:full.value.subtitles.srt.sha256,vttHash:full.value.subtitles.vtt.sha256,gate:'G5-engineering-owner-av-deferred'},files:[...artifacts.map(a=>({path:rel(f.store.tasks.artifacts.path(a)),sha256:a.sha256})),...await Promise.all([rulesPath,delegationPath,proof].map(async p=>({path:rel(p),sha256:sha256(await readFile(p))})))]};
 const reports:Record<string,any>={};
 const write=async()=>{await writeFile(candidatePath,canonical(candidate));const candidateHash=sha256(await readFile(candidatePath));for(const role of rules.activeRoles){reports[role]={role,candidateId:candidate.id,candidateSha256:candidateHash,verdict:'PASS',criteria:rules.requiredCriteria[role].map((id:string)=>({id,status:'PASS',evidence:[rel(proof)]})),findings:[],executed:[{command:'MOCK G5 role fixture; no independent review executed',exitCode:0,evidencePath:rel(proof)}],limitations:['MOCK Judge/media receipts; no real technical or AV acceptance. Deferred AV and final owner review remain pending.']};await writeFile(join(folder,role+'.json'),JSON.stringify(reports[role],null,2)+'\n');}};
 await write();return{folder,rules,candidate,reports,candidatePath,rulesPath,delegationPath,write};
}
