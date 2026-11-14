import {z} from 'zod';
import {createHash, randomUUID} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {mkdir, readFile, writeFile, rename, lstat, readdir, rm} from 'node:fs/promises';
import {dirname, basename, extname, join, resolve} from 'node:path';
import {ancestors, boundedFile} from '../story-planner/runtime.js';
import {canonical, sha256} from '../core/util.js';
import {freezeExperiment, verifyFrozenPacket, nextExperiment, reviewDecision, type ExperimentValue} from './rsi-experiment.js';
import {startRepair, repairStatus, applyRepair, recordRepairReview} from './rsi-repair.js';

const Hash=z.string().regex(/^[a-f0-9]{64}$/);
const Role=z.enum(['script','brief','source','video','audio','frame']);
const Modality=z.enum(['script','frames','audio','continuous-av']);
const Asset=z.strictObject({
 role:Role, path:z.string().min(1), sha256:Hash,
 rightsConfirmed:z.literal(true).optional(), atSeconds:z.number().nonnegative().optional()
});
const Candidate=z.strictObject({assets:z.array(Asset).min(3).max(200)});
export const MediaExperimentInput=z.strictObject({
 schemaVersion:z.literal('rsi-media-input/1.0'), id:z.string().min(1).max(120),
 repository:z.string().url(), category:z.string().min(1).max(120), split:z.enum(['calibration','holdout']),
 baseline:Candidate,candidate:Candidate,requirements:z.string().min(1),rubric:z.string().min(1),
 requiredModalities:z.array(Modality).min(1).max(4)
});
const Entry=z.strictObject({role:Role,path:z.string().regex(/^assets\/[0-9]{3}\.[a-z0-9]{1,5}$/),sha256:Hash,bytes:z.number().int().positive().max(512*1024*1024),atSeconds:z.number().nonnegative().optional()});
const Manifest=z.strictObject({schemaVersion:z.literal('rsi-media-candidate/1.0'),assets:z.array(Entry).min(3).max(200)});
const Binding=z.strictObject({schemaVersion:z.literal('rsi-media-binding/1.0'),experimentSha256:Hash,repository:z.string().url(),category:z.string(),split:z.enum(['calibration','holdout']),labels:z.strictObject({A:Hash,B:Hash})});
type Input=z.infer<typeof MediaExperimentInput>;
type CandidateInput=z.infer<typeof Candidate>;
const digest=(x:unknown)=>sha256(canonical(x));
const json=async(p:string)=>JSON.parse((await boundedFile(p,1_000_000)).toString('utf8').replace(/^\uFEFF/,''));
const suffixes:Record<z.infer<typeof Role>,string[]>={script:['.txt','.md','.json'],brief:['.json','.md','.txt'],source:['.json','.md','.txt','.ts','.py','.js','.go','.rs'],video:['.mp4'],audio:['.wav','.mp3','.flac'],frame:['.png','.jpg','.jpeg','.webp']};
async function fileHash(p:string){
 await ancestors(dirname(resolve(p)));const st=await lstat(p);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>512*1024*1024)throw Error('Expected bounded regular media file');
 const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);
 return {sha256:h.digest('hex'),bytes:st.size};
}
async function absent(p:string){try{await lstat(p);throw Error('Output exists; preserve frozen packet');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
function checkRoles(manifest:z.infer<typeof Manifest>,modalities:string[]){
 for(const role of ['script','brief','source'])if(!manifest.assets.some(a=>a.role===role))throw Error('Missing '+role+' evidence');
 for(const m of modalities){
  const role=m==='script'?'script':m==='frames'?'frame':m==='audio'?'audio':'video';
  if(!manifest.assets.some(a=>a.role===role))throw Error('Required modality has no '+role+' artifact');
 }
}
function orderedAssets(c:CandidateInput){return [...c.assets].sort((a,b)=>a.role.localeCompare(b.role)||a.sha256.localeCompare(b.sha256));}
async function describeCandidate(c:CandidateInput,modalities:string[]){
 const assets:z.infer<typeof Entry>[]=[];let total=0;
 for(const [i,a]of orderedAssets(c).entries()){
  const ext=extname(a.path).toLowerCase();
  if(!suffixes[a.role].includes(ext))throw Error('Unsupported artifact extension for '+a.role);
  if(['video','audio','frame'].includes(a.role)&&a.rightsConfirmed!==true)throw Error('Media usage rights must be explicitly confirmed');
  const before=await fileHash(resolve(a.path));if(before.sha256!==a.sha256)throw Error('Source media hash mismatch');
  total+=before.bytes;if(total>2*1024*1024*1024)throw Error('Media candidate exceeds 2 GiB');
  assets.push({role:a.role,path:'assets/'+String(i).padStart(3,'0')+ext,sha256:a.sha256,bytes:before.bytes,...(a.atSeconds===undefined?{}:{atSeconds:a.atSeconds})});
 }
 const manifest=Manifest.parse({schemaVersion:'rsi-media-candidate/1.0',assets});checkRoles(manifest,modalities);return manifest;
}
async function candidatePacket(c:CandidateInput,dir:string,modalities:string[]){
 const manifest=await describeCandidate(c,modalities),originals=orderedAssets(c);
 await mkdir(join(dir,'assets'),{recursive:true});
 for(const [i,a]of manifest.assets.entries()){
  await pipeline(createReadStream(resolve(originals[i]!.path)),createWriteStream(join(dir,a.path),{flags:'wx'}));
  const copied=await fileHash(join(dir,a.path));if(copied.sha256!==a.sha256||copied.bytes!==a.bytes)throw Error('Media changed during freeze');
 }
 await writeFile(join(dir,'manifest.json'),canonical(manifest),{flag:'wx'});return manifest;
}
async function verifyCandidate(dir:string,expected:Buffer,modalities:string[]){
 const manifest=Manifest.parse(await json(join(dir,'manifest.json')));
 if(canonical(manifest)!==expected.toString('utf8'))throw Error('Candidate manifest changed');
 checkRoles(manifest,modalities);
 const names=await readdir(join(dir,'assets'));
 if(names.length!==manifest.assets.length||new Set(manifest.assets.map(a=>a.path)).size!==manifest.assets.length)throw Error('Unexpected or duplicate media assets');
 for(const a of manifest.assets){const actual=await fileHash(join(dir,a.path));if(actual.sha256!==a.sha256||actual.bytes!==a.bytes)throw Error('Frozen media integrity failed');}
 return manifest;
}
export async function freezeMediaExperiment(raw:unknown,out:string,previous?:ExperimentValue){
 const input=MediaExperimentInput.parse(raw);out=resolve(out);await ancestors(dirname(out),true);await absent(out);
 const scratch=join(dirname(out),'.media-input-'+randomUUID()),stage=join(dirname(out),'.media-pending-'+randomUUID());
 await mkdir(scratch);
 const base=await candidatePacket(input.baseline,join(scratch,'base'),input.requiredModalities);
 const next=await candidatePacket(input.candidate,join(scratch,'next'),input.requiredModalities);
 await writeFile(join(scratch,'requirements'),input.requirements);await writeFile(join(scratch,'rubric'),input.rubric);
 await freezeExperiment({id:input.id,baseline:join(scratch,'base','manifest.json'),candidate:join(scratch,'next','manifest.json'),requirements:join(scratch,'requirements'),rubric:join(scratch,'rubric'),requiredModalities:input.requiredModalities,out:stage});
 const op=await json(join(stage,'operator-manifest.json'));
 if(previous){
  if(previous.id!==input.id||previous.baselineSha256!==digest(base)||previous.requirements!==input.requirements||previous.rubric!==input.rubric||canonical(previous.requiredModalities)!==canonical(input.requiredModalities))throw Error('Changed fixed experiment inputs');
  op.experiment=nextExperiment(previous,Buffer.from(canonical(next)));op.experimentSha256=digest(op.experiment);
  await writeFile(join(stage,'operator-manifest.json'),canonical(op));
  const assignment=await json(join(stage,'reviewer','assignment.json'));assignment.experimentSha256=op.experimentSha256;
  await writeFile(join(stage,'reviewer','assignment.json'),canonical(assignment));
 }
 await rename(join(scratch,'base'),join(stage,'reviewer',op.baselineLabel));
 await rename(join(scratch,'next'),join(stage,'reviewer',op.candidateLabel));
 const binding=Binding.parse({schemaVersion:'rsi-media-binding/1.0',experimentSha256:op.experimentSha256,repository:input.repository,category:input.category,split:input.split,labels:{[op.baselineLabel]:digest(base),[op.candidateLabel]:digest(next)}});
 await writeFile(join(stage,'media-binding.json'),canonical(binding),{flag:'wx'});
 await verifyMediaExperiment(stage);await rename(stage,out);
 // Only delete the generated scratch we created, never an input or published directory.
 if(dirname(resolve(scratch))!==dirname(out)||!basename(scratch).startsWith('.media-input-'))throw Error('Unexpected scratch path');
 await ancestors(scratch);await rm(scratch,{recursive:true});
 return {packet:join(out,'reviewer'),operator:join(out,'operator-manifest.json'),bindingSha256:digest(binding),experimentSha256:op.experimentSha256};
}
export async function verifyMediaExperiment(root:string){
 root=resolve(root);await ancestors(root);const experiment=await verifyFrozenPacket(join(root,'operator-manifest.json')),binding=Binding.parse(await json(join(root,'media-binding.json')));
 if(binding.experimentSha256!==digest(experiment))throw Error('Media experiment binding changed');
 const manifests={} as Record<'A'|'B',z.infer<typeof Manifest>>;
 for(const label of ['A','B'] as const){
  const bytes=await boundedFile(join(root,'reviewer',label+'.txt'),1_000_000);
  if(sha256(bytes)!==binding.labels[label])throw Error('Media label binding changed');
  manifests[label]=await verifyCandidate(join(root,'reviewer',label),bytes,experiment.requiredModalities);
 }
 return {experiment,binding,manifests};
}
const Observation=z.strictObject({
 label:z.enum(['A','B']),modality:Modality,artifactSha256:Hash,
 method:z.enum(['read','viewed','listened','watched-and-listened']),complete:z.boolean(),notes:z.string().min(1).max(4000)
});
export const MediaReview=z.strictObject({
 schemaVersion:z.literal('rsi-media-review/1.0'),bindingSha256:Hash,
 report:z.strictObject({experimentSha256:Hash,reviewer:z.string().min(1),verdict:z.enum(['PASS','REVISE','UNVERIFIED']),coverage:z.array(Modality),findings:z.array(z.string().min(1)),preferred:z.enum(['A','B','tie','neither'])}),
 observations:z.array(Observation).max(400)
});
export async function mediaReviewDecision(root:string,raw:unknown){
 const state=await verifyMediaExperiment(root),review=MediaReview.parse(raw);
 if(review.bindingSha256!==digest(state.binding))throw Error('Review binds different media');
 const method={script:'read',frames:'viewed',audio:'listened','continuous-av':'watched-and-listened'};
 const role={script:'script',frames:'frame',audio:'audio','continuous-av':'video'};
 for(const o of review.observations){
  if(o.method!==method[o.modality]||!state.manifests[o.label].assets.some(a=>a.sha256===o.artifactSha256&&a.role===role[o.modality]))throw Error('Observation does not bind its modality artifact');
 }
 for(const m of review.report.coverage){
  for(const label of ['A','B'] as const){
   const required=state.manifests[label].assets.filter(a=>a.role===role[m]);
   if(!required.length||required.some(a=>!review.observations.some(o=>o.label===label&&o.modality===m&&o.artifactSha256===a.sha256&&o.complete)))throw Error('Claimed coverage lacks complete observations for both candidates');
  }
 }
 const decision=reviewDecision(review.report,state.experiment),op=await json(join(root,'operator-manifest.json'));
 const comparison=decision.preferred==='tie'?'tie':decision.preferred==='neither'?'neither':decision.preferred===op.candidateLabel?'candidate-preferred':decision.preferred===op.baselineLabel?'baseline-preferred':'unverified';
 return {decision,comparison,review,binding:state.binding,limitation:'Declared exact-artifact observations, not authenticated viewing/listening or measured audience retention.'};
}
function packetRoot(root:string,attempt:number){return join(root,'media','attempt-'+attempt);}
async function candidateFromFrozen(root:string,label:string):Promise<CandidateInput>{
 const manifest=Manifest.parse(await json(join(root,'reviewer',label,'manifest.json')));
 return {assets:manifest.assets.map(a=>({role:a.role,path:join(root,'reviewer',label,a.path),sha256:a.sha256,rightsConfirmed:true as const,...(a.atSeconds===undefined?{}:{atSeconds:a.atSeconds})}))};
}
export async function startMediaRepair(root:string,raw:unknown){
 root=resolve(root);await ancestors(root,true);await mkdir(join(root,'media'),{recursive:true});
 const packet=packetRoot(root,1),input=MediaExperimentInput.parse(raw);
 try{await lstat(packet);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await freezeMediaExperiment(input,packet);}
 const verified=await verifyMediaExperiment(packet);
 // Reusing an initialization must not silently accept a different project/requirements.
 const base=await describeCandidate(input.baseline,input.requiredModalities),candidate=await describeCandidate(input.candidate,input.requiredModalities),e=verified.experiment;
 if(e.id!==input.id||e.baselineSha256!==digest(base)||e.candidateSha256!==digest(candidate)||e.requirements!==input.requirements||e.rubric!==input.rubric||canonical(e.requiredModalities)!==canonical(input.requiredModalities)||verified.binding.repository!==input.repository||verified.binding.category!==input.category||verified.binding.split!==input.split)throw Error('Chain initialized with different inputs');
 await startRepair(join(root,'chain'),join(packet,'operator-manifest.json'));return mediaRepairStatus(root);
}
export async function mediaRepairStatus(root:string){
 const state=await repairStatus(join(resolve(root),'chain'));
 let identity:string|undefined;
 for(const attempt of state.attempts){
  const packet=packetRoot(root,attempt.experiment.attempt),verified=await verifyMediaExperiment(packet);
  if(canonical(verified.experiment)!==canonical(attempt.experiment))throw Error('Repair/media experiment mismatch');
  const currentIdentity=canonical({repository:verified.binding.repository,category:verified.binding.category,split:verified.binding.split});
  if(identity&&identity!==currentIdentity)throw Error('Changed media experiment identity');identity??=currentIdentity;
  const saved=state.reviews.find(r=>r.attempt===attempt.experiment.attempt);
  if(saved){
   const accepted=z.strictObject({schemaVersion:z.literal('rsi-media-accepted-review/1.0'),recordSha256:Hash,reportSha256:Hash,rawReviewSha256:Hash}).parse(await json(join(packet,'accepted-media-review.json')));
   if(accepted.recordSha256!==attempt.recordSha256||accepted.reportSha256!==saved.reviewSha256||saved.report.evidenceSha256!==accepted.rawReviewSha256)throw Error('Accepted media review binding changed');
   const raw=await json(join(packet,'raw-review-'+accepted.rawReviewSha256+'.json'));
   if(digest(raw)!==accepted.rawReviewSha256||digest({...raw.report,evidenceSha256:accepted.rawReviewSha256})!==saved.reviewSha256)throw Error('Exact raw multimodal review changed');
   await mediaReviewDecision(packet,raw);
  }
 }
 const currentPacket=state.current?packetRoot(root,state.current.experiment.attempt):undefined;
 return {...state,currentPacket,mediaIntegrity:'verified'};
}
export async function recordMediaReview(root:string,expected:string,raw:unknown){
 const state=await mediaRepairStatus(root);if(!state.current||state.current.recordSha256!==expected)throw Error('Stale media review target');
 const result=await mediaReviewDecision(state.currentPacket!,raw),dir=state.currentPacket!;
 const chainReport={...result.review.report,evidenceSha256:digest(result.review)};
 const expectedReviewer=state.reviews[0]?.report.reviewer??state.current.record.reviewer;
 if(expectedReviewer&&result.review.report.reviewer!==expectedReviewer)throw Error('Reviewer changed');
 if(state.currentReview&&state.currentReview.reviewSha256!==digest(chainReport))throw Error('Conflicting saved review; preserve original');
 const accepted={schemaVersion:'rsi-media-accepted-review/1.0',recordSha256:expected,reportSha256:digest(chainReport),rawReviewSha256:digest(result.review)};
 const acceptedPath=join(dir,'accepted-media-review.json');
 try{await writeFile(acceptedPath,canonical(accepted),{flag:'wx'});}catch(e){
  if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
  if(canonical(await json(acceptedPath))!==canonical(accepted))throw Error('Conflicting exact raw media review; preserve original');
 }
 const rawPath=join(dir,'raw-review-'+digest(result.review)+'.json'),reportPath=join(dir,'chain-review-'+digest(chainReport)+'.json');
 for(const [path,value]of [[rawPath,result.review],[reportPath,chainReport]] as const){
  try{await writeFile(path,canonical(value),{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||canonical(await json(path))!==canonical(value))throw e;}
 }
 await recordRepairReview(join(root,'chain'),expected,reportPath);return {...await mediaRepairStatus(root),comparison:result.comparison};
}
export async function applyMediaRepair(root:string,expected:string,candidateRaw:unknown){
 const state=await mediaRepairStatus(root),current=state.current,candidate=Candidate.parse(candidateRaw);
 if(!current)throw Error('Missing media repair target');
 if(current.recordSha256!==expected){
  const old=state.attempts.find(a=>a.recordSha256===expected),following=old&&state.attempts.find(a=>a.record.previousRecordSha256===expected);
  if(old&&following&&digest(await describeCandidate(candidate,old.experiment.requiredModalities))===following.experiment.candidateSha256)return {...state,reusedAttempt:following.experiment.attempt};
  throw Error('Stale media repair target');
 }
 if(!state.currentReview||state.currentReview.decision.status!=='REVISE'||state.remaining<1)throw Error('Media repair requires covered REVISE and available attempt');
 const previous=await verifyMediaExperiment(state.currentPacket!);
 const op=await json(join(state.currentPacket!,'operator-manifest.json'));
 const input:Input={schemaVersion:'rsi-media-input/1.0',id:current.experiment.id,repository:previous.binding.repository,category:previous.binding.category,split:previous.binding.split,
  baseline:await candidateFromFrozen(state.currentPacket!,op.baselineLabel),candidate,requirements:current.experiment.requirements,rubric:current.experiment.rubric,requiredModalities:current.experiment.requiredModalities};
 const prepared=join(root,'media','.prepared-'+randomUUID());await freezeMediaExperiment(input,prepared,current.experiment);
 const nextPacket=packetRoot(root,current.experiment.attempt+1);
 try{await rename(prepared,nextPacket);}catch(e){
  const existing=await verifyMediaExperiment(nextPacket),newPacket=await verifyMediaExperiment(prepared);
  if(canonical(existing.experiment)!==canonical(newPacket.experiment))throw Error('A different repair candidate is already prepared');
 }
 const nextOp=await json(join(nextPacket,'operator-manifest.json'));
 const reportPath=join(root,'chain','attempt-'+current.experiment.attempt,'review.json');
 const saved=await json(reportPath),tempReport=join(nextPacket,'predecessor-review.json');
 try{await writeFile(tempReport,canonical(saved.report),{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||canonical(await json(tempReport))!==canonical(saved.report))throw e;}
 await applyRepair(join(root,'chain'),expected,tempReport,join(nextPacket,'reviewer',nextOp.candidateLabel+'.txt'));
 return mediaRepairStatus(root);
}
export async function mediaBenchmarkSummary(roots:string[]){
 const rows=[];
 for(const root of roots){
  const state=await mediaRepairStatus(root),verified=await verifyMediaExperiment(state.currentPacket!);
  const review=state.currentReview;
  const op=await json(join(state.currentPacket!,'operator-manifest.json'));
  rows.push({repository:verified.binding.repository,category:verified.binding.category,split:verified.binding.split,attempt:state.current!.experiment.attempt,
   status:review?.decision.status??'UNVERIFIED',comparison:!review?'unverified':review.report.preferred==='tie'?'tie':review.report.preferred==='neither'?'neither':review.report.preferred===op.candidateLabel?'candidate-preferred':'baseline-preferred'});
 }
 const calibration=rows.filter(r=>r.split==='calibration'),holdout=rows.filter(r=>r.split==='holdout');
 const distinct=new Set(rows.map(r=>r.repository)).size===rows.length;
 return {rows,coverageReady:distinct&&new Set(calibration.map(r=>r.category)).size>=2&&holdout.length>=1,
  improved:rows.filter(r=>r.status==='PASS'&&r.comparison==='candidate-preferred').length,
  regressions:rows.filter(r=>r.comparison==='baseline-preferred').length,
  pending:rows.filter(r=>r.status!=='PASS').length,
  limitation:'Reviewer preference is not platform retention or star conversion. Holdout designation is declared, not proof of training isolation.'};
}
export async function rsiMediaCommand(pos:string[],values:Record<string,unknown>){
 const action=pos[1],load=async(k:string)=>{if(typeof values[k]!=='string')throw Error('Missing --'+k);return json(resolve(values[k] as string));};
 const need=(k:string)=>{if(typeof values[k]!=='string')throw Error('Missing --'+k);return resolve(values[k] as string);};
 const allowed:Record<string,string[]>={freeze:['spec','out'],verify:['root'],start:['root','spec'],status:['root'],review:['root','expected','review'],apply:['root','expected','spec'],summary:['spec']};
 if(Object.entries(values).some(([k,v])=>v!==undefined&&!allowed[action??'']?.includes(k)))throw Error('Unexpected rsi-media option');
 if(pos.length!==2)throw Error('Usage: rsi-media freeze|verify|start|status|review|apply|summary');
 if(action==='freeze')return freezeMediaExperiment(await load('spec'),need('out'));
 if(action==='verify')return verifyMediaExperiment(need('root'));
 if(action==='start')return startMediaRepair(need('root'),await load('spec'));
 if(action==='status')return mediaRepairStatus(need('root'));
 if(action==='review'){if(typeof values.expected!=='string')throw Error('Missing --expected record hash');return recordMediaReview(need('root'),values.expected,await load('review'));}
 if(action==='apply'){if(typeof values.expected!=='string')throw Error('Missing --expected record hash');return applyMediaRepair(need('root'),values.expected,await load('spec'));}
 if(action==='summary'){const spec=await load('spec');return mediaBenchmarkSummary(z.array(z.string()).min(1).max(50).parse(spec));}
 throw Error('Unknown rsi-media command');
}

