import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {join,relative,resolve,isAbsolute,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {ProductionStore} from '../src/workflow/production.js';
import {ProductionPackageSchema,ReadthroughSchema,type ProductionPackage} from '../src/contracts/production.js';
import {RepairRequestSchema,type RepairRequest} from '../src/contracts/revision.js';
import type {Artifact} from '../src/contracts/runtime.js';
import {canonical,sha256} from '../src/core/util.js';
import {sourceFixture,planFixture,reviewFixture} from './workflow-support.js';

/** Real SQLite/CAS and approval mechanics; every voice/image/judge output here is explicitly MOCK. */
export async function repairFixture(roundsOrName:number|string=2,withG3=true){
 const maxRounds=typeof roundsOrName==='number'?roundsOrName:2;
 const root=await mkdtemp(join(tmpdir(),'gve-rp-')),store=new ProductionStore(join(root,'data'),root);
 try{
  Object.defineProperty(store.workflow,'reviewRoot',{value:root});
  await store.workflow.create('demo',sourceFixture());const plan=planFixture();plan.budget.maxRevisionRounds=maxRounds;
  const revision=await store.workflow.importPlan('demo',plan),review=await reviewFixture(root,store.workflow);
  await store.workflow.approve('demo','G1',review.candidatePath,review.rulesPath,review.delegationPath);
  await store.workflow.approve('demo','G2',review.candidatePath,review.rulesPath,review.delegationPath);
  const measured=await store.tasks.run('readthrough',{projectId:'demo',planRevision:revision.hash,fixture:'MOCK AUDIO; no speech generated'},async()=>{
   const audio=await store.tasks.artifacts.commit('MOCK WAV; not an actual media stream','audio/wav','RENDER',revision.hash);
   return{value:ReadthroughSchema.parse({schemaVersion:'1.0',projectId:'demo',planRevision:revision.hash,provider:'windows-sapi-offline',voiceId:'MOCK-not-real-voice',rate:0,measuredAt:'2026-10-26T00:00:00.000Z',lines:plan.script.map(l=>({id:l.id,text:l.narration,audio,durationMs:6000,allocatedFrames:300,pronunciations:['MOCK']})),fps:30,totalFrames:900,status:'measured-not-yet-listened'}),outputs:plan.script.map(()=>audio)};
  },new AbortController().signal);
  const design=ProductionPackageSchema.parse({schemaVersion:'1.0',projectId:'demo',planRevision:revision.hash,readthrough:store.tasks.get(measured.id)!.result,style:{id:'fixture',fontFamily:'Microsoft YaHei',background:'#FFFFFF',foreground:'#111111',accent:'#007755',muted:'#555555',direction:'MOCK synthetic fixture; not an observed visual reference',captionSize:34,safeArea:'left54-right100-top100-bottom260'},scenes:plan.script.map((s,i)=>({id:'scene-'+(i+1),scriptId:s.id,layout:i===1?'path':i===0?'hook':'closing',title:'Original title',subtitle:'Mock subtitle',labels:i===1?['A','B','C','D']:[],sourceLabel:'MOCK source; no target execution',claimIds:s.claimIds})),references:[{url:'https://example.test/reference',status:'unavailable',observations:[],observedRange:'none',limitations:'Not observed; no claimed quality'}],authorization:{previewWidth:360,previewHeight:640,motionWidth:720,motionHeight:1280,motionScene:'scene-2',motionAudioScriptId:'line-1',motionSeconds:7,maxPreviewAttempts:2,maxPaidUsd:0,audio:'temporary-local-sapi',fullProduction:false},origin:'agent-authored-graphics-not-target-execution'});
  const row=await store.import('demo',design);
  const fixture={root,store,design,plan,revision,review,row};
  const prepared=withG3?await mockG3(fixture,'baseline',design,row.hash):{...await mockStyle(store,row.hash),approval:null,candidatePath:'',rulesPath:''};
  return{...fixture,...prepared,r:review,baseline:row,evidence:prepared.image};
 }catch(e){store.close();await cleanupRepairRoot(root);throw e;}
}

export async function approveG3(f:Awaited<ReturnType<typeof repairFixture>>,tag='next'){
 const current=await f.store.current('demo');return mockG3(f,tag,current.design,current.record.hash);
}

export async function mockStyle(store:ProductionStore,hash:string){
 const task=await store.tasks.run('style',{projectId:'demo',packageHash:hash,fixture:'MOCK PNG; not a real render'},async()=>{
  const image=await store.tasks.artifacts.commit('MOCK PNG '+hash+'; not decodable media','image/png','RENDER',hash);
  return{value:{mode:'style',frames:[image],contactSheet:image},outputs:[image,image]};
 },new AbortController().signal);
 return{task,image:task.outputs[0]!};
}

export async function mockG3(f:{root:string;store:ProductionStore;review:{delegationPath:string}},tag:string,design:ProductionPackage,hash:string){
 const {task,image}=await mockStyle(f.store,hash),folder=join(f.root,'g3-'+tag);await mkdir(folder,{recursive:true});
 const row=JSON.parse(f.store.db.prepare('SELECT data FROM packages WHERE hash=?').get(hash)!.data as string) as {artifact:Artifact};
 const required=[row.artifact,f.store.tasks.get(task.id)!.result!,...task.outputs],policy=JSON.parse(await readFile('reviews/M2/preflight-gate.json','utf8'));
 const rulesPath=join(folder,'gate.json');await writeFile(rulesPath,JSON.stringify(policy));
 const rel=(p:string)=>relative(f.root,p).replaceAll('\\','/'),proof=join(folder,'proof.log');
 await writeFile(proof,'MOCK G3 judge mechanics; no independent AV/content review or actual image generation.');
 const files=required.map(a=>({path:rel(f.store.tasks.artifacts.path(a)),sha256:a.sha256}));files.push({path:rel(rulesPath),sha256:sha256(await readFile(rulesPath))});
 const candidate={id:'MOCK-G3-'+tag,milestone:'M2',production:{projectId:'demo',planRevision:design.planRevision,packageHash:hash,gate:'G3',evidenceHashes:required.slice(1).map(a=>a.sha256)},files};
 const candidatePath=join(folder,'candidate.json');await writeFile(candidatePath,canonical(candidate));const candidateHash=sha256(await readFile(candidatePath));
 for(const role of policy.activeRoles)await writeFile(join(folder,role+'.json'),JSON.stringify({role,candidateId:candidate.id,candidateSha256:candidateHash,verdict:'PASS',criteria:policy.requiredCriteria[role].map((id:string)=>({id,status:'PASS',evidence:[rel(proof)]})),findings:[],executed:[{command:'MOCK G3 fixture, not real review',exitCode:0,evidencePath:rel(proof)}],limitations:['MOCK media and judge reports; gate behavior test only']}));
 const approval=await f.store.approve('demo','G3',candidatePath,rulesPath,f.review.delegationPath);
 return{task,image,approval,candidatePath,rulesPath};
}

export function repairRequest(design:ProductionPackage,hash:string,evidence:Artifact,requestId='fix-1',title='Revised title'):RepairRequest{
 const scene=design.scenes[1]!;
 return RepairRequestSchema.parse({schemaVersion:'1.0',requestId,expectedPackageHash:hash,sceneId:scene.id,issue:{id:'issue-'+requestId,requirement:'Readable title for the same technical scene',observation:'MOCK issue observed in a synthetic media fixture',evidence},replacement:{title,subtitle:scene.subtitle,labels:scene.labels,sourceLabel:scene.sourceLabel}});
}

export async function cleanupRepairRoot(root:string){
 const rel=relative(resolve(tmpdir()),resolve(root));if(isAbsolute(rel)||rel==='..'||rel.startsWith('..')||!basename(root).startsWith('gve-rp-'))throw Error('Unsafe repair fixture cleanup');
 await rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:50});
}
