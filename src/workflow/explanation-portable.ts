import {checkDatabaseFiles} from './cli.js';
import {readdir,lstat} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,sep} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {StoredStoryProposal} from '../contracts/authoring.js';
import {RepositorySnapshotSchema} from '../contracts/planning.js';
import {PresentationPlan,PRESENTATION_FPS} from '../contracts/presentation.js';
import {ArtifactSchema} from '../contracts/runtime.js';
import {Hash,Id} from '../contracts/video.js';
import {EngineError,checkAbort} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {compilePresentation} from '../presentation/compile.js';
import {AuthoredCaption,VoiceSpec} from '../presentation/narration.js';
import {bindPresentationVoiceFromSpec,createPresentationFromPlan,preflightPresentationState,readPresentation,renderPresentation} from '../presentation/runtime.js';
import {ZH_VISUAL_PROFILE} from '../presentation/visual-locale.js';
import {environment} from '../providers/local.js';
import {publishAssetFiles,RECEIPT_PUBLICATION} from '../story-planner/asset-pack.js';
import {ancestors,boundedFile,readTask} from '../story-planner/runtime.js';
import {produceTts,readLocalTts} from '../tts/runtime.js';
import {authoringPacket,submitParsedAuthoringProposal,verifyProposal} from './agent-authoring.js';
import {capturePortableExplanation} from './explanation-session.js';
import {HiddenNarratedRenderSpec,NarratedRenderSpec} from './explanation-contract.js';
import {FactReviewReceipt,presentationFactReview,verifyFactReview} from './fact-review.js';
import {evidenceWorkspace} from './project-evidence.js';
import {sourceFingerprint,validateSnapshot,WorkflowStore} from './store.js';

const IMPORT='portable-explanation-import-v1',RENDER='portable-explanation-render-v1';
export const PORTABLE_VOICE='portable-imported-original-audio/1.0';
const json=(v:unknown)=>Buffer.from(canonical(v));
const fail=(message:string):never=>{throw new EngineError('PORTABLE',message);};
function disjoint(a:string,b:string){const inside=(x:string,y:string)=>{const r=relative(resolve(x),resolve(y));return !isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);};if(inside(a,b)||inside(b,a))fail('Input, state and output directories must not overlap.');}
const fingerprint=(kind:string,input:unknown)=>sha256(canonical({version:'production-task-v1',kind,input}));
const Presentation=z.strictObject({mode:z.literal('narrated'),spec:z.union([NarratedRenderSpec,HiddenNarratedRenderSpec])});
const Audio=z.strictObject({beatId:Id,sha256:Hash,bytes:z.number().int().positive().max(25_000_000),mediaType:z.enum(['audio/wav','audio/mpeg','audio/flac']),originalReceiptSha256:Hash,originalReceiptBytes:z.number().int().positive().max(64_000)});
export const PortableManifest=z.strictObject({schemaVersion:z.literal('portable-explanation/1.0'),snapshot:RepositorySnapshotSchema,proposal:StoredStoryProposal,presentation:Presentation,historicalReview:FactReviewReceipt,maxSeconds:z.number().int().min(1).max(60),clips:z.array(Audio).min(1).max(20)});
type Manifest=z.infer<typeof PortableManifest>;
const ImportInput=z.strictObject({packageDigest:Hash,manifest:PortableManifest});
const ImportResult=z.strictObject({packageDigest:Hash,assets:z.array(z.strictObject({audio:ArtifactSchema,originalReceipt:ArtifactSchema})).min(1).max(20)});
export const PortableEdit=z.strictObject({schemaVersion:z.literal('portable-explanation-edit/1.0'),importTaskId:Hash,plan:PresentationPlan,offsets:z.array(z.strictObject({beatId:Id,startOffsetFrames:z.number().int().min(0).max(7200),captions:z.array(AuthoredCaption).min(1).max(40).optional()})).min(1).max(20)});
const RenderInput=z.strictObject({importTaskId:Hash,edit:PortableEdit,executionPacketHash:Hash,environment:z.record(z.string(),z.string())});
const RenderResult=z.strictObject({planTaskId:Hash,voiceTaskId:Hash,previewTaskId:Hash,executionPacketHash:Hash});
function decode(bytes:Buffer):unknown{try{return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));}catch{return fail('Expected UTF-8 JSON.');}}
function parsed<T>(schema:z.ZodType<T>,raw:unknown):T{const p=schema.safeParse(raw);if(!p.success)return fail(p.error.issues.slice(0,4).map(i=>i.path.join('.')+': '+i.message).join('; '));return p.data;}
function validate(manifest:Manifest){
 const snapshot=validateSnapshot(manifest.snapshot);
 const workspace=evidenceWorkspace(manifest.proposal.binding.projectId,sourceFingerprint(snapshot),snapshot);
 verifyProposal(manifest.proposal,workspace);
 const compiled=compilePresentation(manifest.proposal,manifest.presentation.spec.plan);
 if(compiled.timeline.totalFrames>manifest.maxSeconds*PRESENTATION_FPS)fail('Preview exceeds the portable duration limit.');
 if(manifest.clips.length!==manifest.proposal.beats.length||manifest.clips.some((c,i)=>c.beatId!==manifest.proposal.beats[i]!.id))fail('Audio clips must match every authored beat in order.');
 const packet=presentationFactReview(manifest.proposal,workspace.manifest.sources.map(s=>({...s,bytes:workspace.files.get(s.path)!})),manifest.presentation);
 const history=verifyFactReview(packet,manifest.historicalReview);
 if(history.status!=='attributed-review-complete')fail('Historical review is unresolved.');
 return {workspace,history,packet};
}
export async function exportPortableExplanation(data:string,id:string,out:string,signal:AbortSignal){
 const captured=await capturePortableExplanation(data,id,signal);
 const manifest=parsed(PortableManifest,{schemaVersion:'portable-explanation/1.0',snapshot:captured.snapshot,proposal:captured.proposal,presentation:captured.presentation,historicalReview:captured.historicalReview,maxSeconds:captured.maxSeconds,clips:captured.clips.map(c=>({beatId:c.beatId,sha256:sha256(c.audio),bytes:c.audio.length,mediaType:c.mediaType,originalReceiptSha256:sha256(c.sourceReceipt),originalReceiptBytes:c.sourceReceipt.length}))});
 validate(manifest);
 const bytes=json(manifest),packageDigest=sha256(bytes),files=new Map<string,Buffer>([['portable.json',bytes]]);
 captured.clips.forEach((c,i)=>{files.set('audio/'+i+'.audio',c.audio);files.set('audio/'+i+'.receipt.json',c.sourceReceipt);});
 return {packageDigest,review:'historical-untrusted-attribution',output:await publishAssetFiles(data,id,out,files,signal,RECEIPT_PUBLICATION)};
}
async function packageFiles(root:string,expected:string){
 parsed(Hash,expected);root=resolve(root);await ancestors(root);
 const bytes=await boundedFile(join(root,'portable.json'),4_000_000);
 if(sha256(bytes)!==expected)fail('Caller-held package digest mismatch. This digest is not a signature.');
 const manifest=parsed(PortableManifest,decode(bytes));if(!json(manifest).equals(bytes))fail('Portable manifest must have canonical exact bytes.');
 validate(manifest);
 const expectedFiles=new Set(['portable.json',...manifest.clips.flatMap((_,i)=>['audio/'+i+'.audio','audio/'+i+'.receipt.json'])]);
 const seen=new Set<string>();
 async function walk(dir:string,prefix=''){for(const e of await readdir(dir,{withFileTypes:true})){const p=prefix+e.name;if(e.isSymbolicLink())fail('Linked package entries are forbidden.');if(e.isDirectory()){if(p!=='audio')fail('Unexpected package directory.');await walk(join(dir,e.name),p+'/');}else {if(!e.isFile()||!expectedFiles.has(p))fail('Unexpected package entry.');seen.add(p);}}}await walk(root);
 if(seen.size!==expectedFiles.size)fail('Incomplete portable package.');
 let total=bytes.length;
 const assets=await Promise.all(manifest.clips.map(async(c,i)=>{const audio=await boundedFile(join(root,'audio',i+'.audio'),25_000_000),receipt=await boundedFile(join(root,'audio',i+'.receipt.json'),64_000);total+=audio.length+receipt.length;if(audio.length!==c.bytes||sha256(audio)!==c.sha256||receipt.length!==c.originalReceiptBytes||sha256(receipt)!==c.originalReceiptSha256)fail('Portable audio or original receipt bytes changed.');const original=parsed(z.object({artifact:z.object({sha256:Hash,mediaType:z.string()})}),decode(receipt));if(original.artifact.sha256!==c.sha256||original.artifact.mediaType!==c.mediaType)fail('Historical audio receipt does not bind the imported bytes.');return {audio,receipt};}));
 if(total>36_000_000)fail('Portable package exceeds total byte budget.');return {manifest,assets};
}
async function verifiedImport(data:string,id:string,signal:AbortSignal){
 const task=await readTask(data,id,IMPORT);if(task.state!=='succeeded'||!task.result)fail('Import checkpoint is not complete.');
 const input=parsed(ImportInput,task.input);if(canonical(input)!==canonical(task.input)||sha256(json(input.manifest))!==input.packageDigest)fail('Stored import input changed.');validate(input.manifest);
 if(task.result!.inputFingerprint!==id||task.result!.mediaType!=='application/json'||task.result!.producingStage!=='PUBLISH')fail('Import result artifact binding differs.');
 const store=new ArtifactStore(data);await store.verify(task.result!);const result=parsed(ImportResult,decode(await boundedFile(store.path(task.result!),64_000)));
 if(result.packageDigest!==input.packageDigest||result.assets.length!==input.manifest.clips.length||canonical(task.outputs)!==canonical(result.assets.flatMap(a=>[a.audio,a.originalReceipt])))fail('Import artifact closure differs.');
 for(const [i,a] of result.assets.entries()){for(const artifact of [a.audio,a.originalReceipt]){if(artifact.inputFingerprint!==id)fail('Import artifact belongs to another task.');await store.verify(artifact);}if(a.audio.sha256!==input.manifest.clips[i]!.sha256||a.audio.bytes!==input.manifest.clips[i]!.bytes||a.originalReceipt.sha256!==input.manifest.clips[i]!.originalReceiptSha256||a.originalReceipt.bytes!==input.manifest.clips[i]!.originalReceiptBytes)fail('Imported snapshot changed.');}
 checkAbort(signal);return {task,input,result};
}
function localAuthored(id:string,manifest:Manifest){
 const projectId='portable-'+id.slice(0,48),workspace=evidenceWorkspace(projectId,sourceFingerprint(manifest.snapshot),manifest.snapshot);
 const profile=manifest.proposal.schemaVersion==='1.2'?manifest.proposal.capabilityProfile:undefined;
 const identity=authoringPacket(workspace,profile).request;
 const proposal=parsed(StoredStoryProposal,{...manifest.proposal,...identity});verifyProposal(proposal,workspace);
 const plan=parsed(PresentationPlan,{...manifest.presentation.spec.plan,...identity,proposalHash:sha256(json(proposal))});
 return {projectId,workspace,proposal,plan};
}
function editTemplate(id:string,m:Manifest){return PortableEdit.parse({schemaVersion:'portable-explanation-edit/1.0',importTaskId:id,plan:localAuthored(id,m).plan,offsets:m.presentation.spec.offsets});}
async function importFiles(data:string,id:string,signal:AbortSignal){const v=await verifiedImport(data,id,signal),local=localAuthored(id,v.input.manifest);return {v,local,files:new Map<string,Buffer>([['import.json',json({schemaVersion:'portable-import-status/1.0',taskId:id,packageDigest:v.input.packageDigest,status:'imported-data-only',historicalReview:validate(v.input.manifest).history,currentReview:'pending',reviewAuthority:'none',sourceAuthenticity:'caller-held-digest; no signature or fresh GitHub attestation',ownerAcceptance:'pending'})],['edit.json',json(editTemplate(id,v.input.manifest))],['original-portable.json',json(v.input.manifest)],['local-proposal.json',json(local.proposal)]])};}
export async function importPortableExplanation(data:string,root:string,expected:string,out:string,signal:AbortSignal){
 disjoint(root,data);disjoint(root,out);disjoint(data,out);
 const captured=await packageFiles(root,expected);checkAbort(signal);data=await preflightPresentationState(data);
 const input=ImportInput.parse({packageDigest:expected,manifest:captured.manifest}),id=fingerprint(IMPORT,input),runner=new TaskRunner(data);
 try{const run=await runner.run(IMPORT,input,async(_dir,child)=>{const assets=[];for(const a of captured.assets){checkAbort(child);assets.push({audio:await runner.artifacts.commit(a.audio,'application/octet-stream','PUBLISH',id),originalReceipt:await runner.artifacts.commit(a.receipt,'application/json','PUBLISH',id)});}return {value:ImportResult.parse({packageDigest:expected,assets}),outputs:assets.flatMap(a=>[a.audio,a.originalReceipt])};},signal,{attempts:3,timeoutMs:120_000});const checked=await importFiles(data,id,signal);return {taskId:id,packageDigest:expected,cached:run.cached,currentReview:'pending',ownerAcceptance:'pending',output:await publishAssetFiles(data,id,out,checked.files,signal,RECEIPT_PUBLICATION)};}finally{runner.close();}
}
async function prepareRender(data:string,id:string,edit:z.infer<typeof PortableEdit>,signal:AbortSignal){
 const imported=await verifiedImport(data,id,signal),manifest=imported.input.manifest,local=localAuthored(id,manifest);
 if(edit.importTaskId!==id)fail('Edit belongs to another import.');
 const compiled=compilePresentation(local.proposal,edit.plan);
 if(compiled.timeline.totalFrames>manifest.maxSeconds*PRESENTATION_FPS)fail('Edited preview exceeds the original portable duration limit.');
 await ancestors(join(resolve(data),'workflow'));
 await checkDatabaseFiles(join(resolve(data),'workflow','workflow.sqlite'));
 const workflow=new WorkflowStore(join(resolve(data),'workflow'),{authoring:true});
 let planTaskId:string;
 try{await workflow.create(local.projectId,manifest.snapshot,{preserveExistingSource:true});const committed=await submitParsedAuthoringProposal(workflow,local.projectId,local.proposal,signal);const hidden=edit.plan.schemaVersion==='1.4';const result=await createPresentationFromPlan(workflow,local.projectId,committed.hash,edit.plan,data,signal,undefined,hidden?id:undefined);planTaskId=result.taskId;}finally{workflow.close();}
 const plan=await readPresentation(data,planTaskId,'plan',signal);if(!plan.files)fail('Local plan unavailable.');
 const store=new ArtifactStore(data),clips=[];
 for(const [i,asset] of imported.result.assets.entries()){
  const beat=local.proposal.beats[i]!,descriptor=manifest.clips[i]!;
  const localTts=await produceTts({schemaVersion:'1.0',provider:'local-import',text:beat.narration,voiceLabel:'Imported original audio; caller-declared',sourceSha256:descriptor.sha256,mediaType:descriptor.mediaType},data,signal,{audioPath:store.path(asset.audio)});
  const measured=await readLocalTts(data,localTts.fingerprint,signal),offset=edit.offsets[i];
  if(!offset||offset.beatId!==beat.id||edit.offsets.length!==local.proposal.beats.length)fail('Offsets must match each imported narration in order.');
  clips.push({beatId:beat.id,startOffsetFrames:offset!.startOffsetFrames,transcript:beat.narration,transcriptSha256:sha256(beat.narration),receiptFingerprint:localTts.fingerprint,receiptSha256:sha256(measured.receiptBytes),sourceAudioSha256:descriptor.sha256,...(offset!.captions&&{captions:offset!.captions})});
 }
 const voiceSpec=VoiceSpec.parse({schemaVersion:clips.some(c=>'captions' in c)?'presentation-voice-bindings/1.1':'presentation-voice-bindings/1.0',planTaskId,planManifestSha256:sha256(plan.files!.get('plan-manifest.json')!),proposalHash:sha256(json(local.proposal)),playbackRate:1,voicePolicy:'caller-declared-local-import',clips});
 const packet=presentationFactReview(local.proposal,local.workspace.manifest.sources.map(s=>({...s,bytes:local.workspace.files.get(s.path)!})),{profile:PORTABLE_VOICE,packageDigest:imported.input.packageDigest,importTaskId:id,plan:edit.plan,voiceSpec});
 return {imported,local,planTaskId,voiceSpec,packet};
}
async function checkedRender(data:string,id:string,signal:AbortSignal){const task=await readTask(data,id,RENDER);if(task.state!=='succeeded'||!task.result)fail('Render checkpoint not complete.');if(task.outputs.length)fail('Unexpected portable render output closure.');const input=parsed(RenderInput,task.input);if(canonical(input)!==canonical(task.input))fail('Stored render input changed.');if(task.result!.inputFingerprint!==id||task.result!.mediaType!=='application/json'||task.result!.producingStage!=='PUBLISH')fail('Render result artifact binding differs.');const store=new ArtifactStore(data);await store.verify(task.result!);const saved=parsed(RenderResult,decode(await boundedFile(store.path(task.result!),64_000)));const prepared=await prepareRender(data,input.importTaskId,input.edit,signal);if(saved.planTaskId!==prepared.planTaskId||saved.executionPacketHash!==prepared.packet.packetHash||input.executionPacketHash!==prepared.packet.packetHash)fail('Local execution mapping changed.');const voice=await readPresentation(data,saved.voiceTaskId,'voice',signal),preview=await readPresentation(data,saved.previewTaskId,'narrated',signal);if(!voice.files||!preview.files||!voice.files.get('bindings.json')?.equals(json(prepared.voiceSpec)))fail('Local narration mapping changed.');const previewTask=await readTask(data,saved.previewTaskId,null);if((previewTask.input as {planTaskId:string}).planTaskId!==saved.planTaskId||(previewTask.input as {voiceTaskId:string}).voiceTaskId!==saved.voiceTaskId||canonical((previewTask.input as {environment:unknown}).environment)!==canonical(input.environment))fail('Preview environment differs.');const files=new Map(preview.files);files.set('portable/current-fact-review-packet.json',json(prepared.packet));files.set('portable/historical-review-receipt.json',json(prepared.imported.input.manifest.historicalReview));files.set('portable/original-manifest.json',json(prepared.imported.input.manifest));files.set('portable/edit.json',json(input.edit));const status={schemaVersion:'portable-render-status/1.0',taskId:id,importTaskId:input.importTaskId,packageDigest:prepared.imported.input.packageDigest,previewTaskId:saved.previewTaskId,executionPacketHash:prepared.packet.packetHash,status:'PROPOSED_LOCAL_EDIT_NOT_AUTOMATICALLY_APPROVED',historicalReviewScope:'original-authored-data-only; not inherited by current execution',currentReview:'pending',semanticTruth:'not-machine-verified',approval:'none',ownerListening:'pending',ownerAcceptance:'pending'};files.set('portable/status.json',json(status));return {files,status};}
export async function renderPortableExplanation(data:string,id:string,path:string,out:string,signal:AbortSignal){
 disjoint(data,out);
 const edit=parsed(PortableEdit,decode(await boundedFile(resolve(path),175_000)));data=await preflightPresentationState(data);const prepared=await prepareRender(data,id,edit,signal),input=RenderInput.parse({importTaskId:id,edit,executionPacketHash:prepared.packet.packetHash,environment:await environment()}),taskId=fingerprint(RENDER,input),runner=new TaskRunner(data);
 try{const run=await runner.run(RENDER,input,async(_dir,child)=>{const voice=await bindPresentationVoiceFromSpec(data,prepared.voiceSpec,child);const preview=await renderPresentation(data,prepared.planTaskId,child,undefined,voice.taskId,undefined,ZH_VISUAL_PROFILE);return {value:RenderResult.parse({planTaskId:prepared.planTaskId,voiceTaskId:voice.taskId,previewTaskId:preview.taskId,executionPacketHash:prepared.packet.packetHash}),outputs:[]};},signal,{attempts:3,timeoutMs:3_180_000});const checked=await checkedRender(data,taskId,signal);return {...checked.status,cached:run.cached,output:await publishAssetFiles(data,taskId,out,checked.files,signal,RECEIPT_PUBLICATION)};}finally{runner.close();}
}
export async function portableCommand(positionals:string[],values:Record<string,unknown>,signal:AbortSignal){const action=positionals[1];const keys=action==='portable-export'?['data','task','out']:action==='portable-import'?['data','root','expected','out']:action==='portable-render'?['data','task','spec','out']:[];if(positionals.length!==2||!keys.length||keys.some(k=>typeof values[k]!=='string'||!String(values[k]).trim())||Object.entries(values).some(([k,v])=>v!==undefined&&!keys.includes(k)))throw new EngineError('USAGE','explanation portable-export --task <reviewed-preview> --data <state> --out <new-output> | portable-import --root <data-bundle> --expected <manifest-sha256> --data <new-state> --out <edit-handoff> | portable-render --task <import-checkpoint> --spec <edit.json> --data <state> --out <new-output>');if(action==='portable-export')return exportPortableExplanation(String(values.data),String(values.task),String(values.out),signal);if(action==='portable-import')return importPortableExplanation(String(values.data),String(values.root),String(values.expected),String(values.out),signal);return renderPortableExplanation(String(values.data),String(values.task),String(values.spec),String(values.out),signal);}
