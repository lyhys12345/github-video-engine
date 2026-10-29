import {afterEach,expect,test} from 'vitest';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {auditRuntime} from '../src/operations/audit.js';
import {canonical,sha256} from '../src/core/util.js';
import {EngineError} from '../src/core/errors.js';
import {cleanupRepairRoot} from './repair-support.js';
import {finalizationFixture} from './finalization-support.js';

type Fixture=Awaited<ReturnType<typeof finalizationFixture>>;
const fixtures:{f:Fixture;closed:boolean}[]=[];
async function setup(){const f=await finalizationFixture();fixtures.push({f,closed:false});return f;}
function close(f:Fixture){const entry=fixtures.find(v=>v.f===f)!;if(!entry.closed){f.store.close();f.base.store.close();entry.closed=true;}}
afterEach(async()=>{for(const {f,closed}of fixtures.splice(0)){if(!closed){f.store.close();f.base.store.close();}await cleanupRepairRoot(f.base.root);}});
async function hashes(root:string){const result:Record<string,string>={};async function walk(dir:string){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.isFile())result[relative(root,p)]=sha256(await readFile(p));}}await walk(root);return result;}
const signal=()=>new AbortController().signal;
async function completed(){const f=await setup(),prepared=await f.store.prepare('demo'),rendered=await f.store.run('demo',prepared.id,signal());return{f,prepared,rendered};}
async function mockEngineeringLock(f:Fixture,prepared:Awaited<ReturnType<Fixture['store']['prepare']>>,rendered:Awaited<ReturnType<Fixture['store']['run']>>){
 const area=join(f.base.root,'MOCK-m3-review');await mkdir(area,{recursive:true});const rulesBytes=await readFile('reviews/M3/gate.json'),rules=JSON.parse(rulesBytes.toString('utf8')),rulesPath=join(area,'gate.json'),proof=join(f.base.root,'MOCK-proof.log');await writeFile(rulesPath,rulesBytes);await writeFile(proof,'MOCK review mechanics; not independent media/AV acceptance');
 const rel=(p:string)=>relative(f.base.root,p).replaceAll('\\','/'),artifacts=[f.store.tasks.get(rendered.id)!.result!,prepared.artifact!,prepared.value.ownerDeferral,...rendered.outputs],files=[...new Map(artifacts.map(a=>[a.sha256,{path:rel(f.store.tasks.artifacts.path(a)),sha256:a.sha256}])).values(),{path:rel(rulesPath),sha256:sha256(rulesBytes)}];
 const v=rendered.value,candidate={id:'MOCK-M3-engineering-review',milestone:rules.milestone,finalization:{projectId:'demo',packageHash:v.packageHash,authorizationTaskId:prepared.id,fullTaskId:rendered.id,masterHash:v.master.sha256,captionedHash:v.captioned.sha256,narrationHash:v.narration.sha256,srtHash:v.subtitles.srt.sha256,vttHash:v.subtitles.vtt.sha256,gate:'G5-engineering-owner-av-deferred'},files},candidatePath=join(area,'candidate.json'),candidateBytes=Buffer.from(JSON.stringify(candidate,null,2)+'\n');await writeFile(candidatePath,candidateBytes);
 for(const role of rules.activeRoles)await writeFile(join(area,role+'.json'),JSON.stringify({schemaVersion:'2.0',role,candidateId:candidate.id,candidateSha256:sha256(candidateBytes),verdict:'PASS',criteria:rules.requiredCriteria[role].map((id:string)=>({id,status:'PASS',evidence:[rel(proof)]})),findings:[],executed:[{command:'MOCK judge fixture, not actual independent execution',exitCode:0,evidencePath:rel(proof)}],limitations:['MOCK review; no actual AV/content acceptance']}));
 return f.store.lock('demo',rendered.id,candidatePath,rulesPath,f.base.r.delegationPath,signal());
}
function rewriteTask(f:Fixture,id:string,change:(t:any)=>any){
 const db=f.store.tasks.db,trigger=db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name='completed_task_immutable'").get()!.sql as string;
 db.exec('BEGIN IMMEDIATE');try{db.exec('DROP TRIGGER completed_task_immutable');const row=db.prepare('SELECT data FROM tasks WHERE id=?').get(id)!;db.prepare('UPDATE tasks SET data=? WHERE id=?').run(canonical(change(JSON.parse(row.data as string))),id);db.exec(trigger);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
async function audited(f:Fixture){close(f);const before=await hashes(f.base.root),report=await auditRuntime(f.store.root);expect(await hashes(f.base.root)).toEqual(before);return report;}
async function rejected(f:Fixture,message:string){const r=await audited(f);expect(r.ok).toBe(false);expect(r.checks.some(c=>!c.passed&&c.explanation.includes(message)),JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);return r;}

test('readonly final audit validates bound preparation/full outputs and preserves source (MOCK providers/media)',async()=>{
 const {f,prepared,rendered}=await completed(),r=await audited(f);
 expect(r.ok,JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);expect(r.schemaVersion).toBe('operations-audit/1.3');
 expect(r.finalization).toMatchObject({recordedAuthorizations:1,recordedFullTasks:1,successfulFullTasks:1,failedOrRunningFullTasks:0,deferredAv:true,finalHumanAcceptance:'pending',candidates:[{taskId:rendered.id,authorizationTaskId:prepared.id,masterHash:rendered.value.master.sha256}]});expect(r.productionAuthorizationGranted).toBe(false);
});

test('valid-hash final evaluation with a wrong target is rejected, not merely trusted as passed (MOCK media)',async()=>{
 const {f,rendered}=await completed(),value=structuredClone(rendered.value),old=await f.store.tasks.artifacts.readJson<any>(value.evaluation);
 const evaluation=await f.store.tasks.artifacts.commit(canonical({...old,targets:{...old.targets,master:'f'.repeat(64)}}),'application/json','VERIFY_MEDIA',value.packageHash);value.evaluation=evaluation;
 const result=await f.store.tasks.artifacts.commit(canonical(value),'application/json','PUBLISH',rendered.id);
 rewriteTask(f,rendered.id,t=>({...t,result,outputs:t.outputs.map((a:any)=>a.sha256===rendered.value.evaluation.sha256?evaluation:a)}));await rejected(f,'Final media evaluation target');
});

test('valid-hash final manifest cannot refer to media outside its exact committed output set (MOCK media)',async()=>{
 const {f,rendered}=await completed(),value=structuredClone(rendered.value),old=await f.store.tasks.artifacts.readJson<any>(value.evaluation);
 value.master=await f.store.tasks.artifacts.commit('MOCK unrelated master bytes','video/mp4','RENDER',value.packageHash);
 const evaluation=await f.store.tasks.artifacts.commit(canonical({...old,targets:{...old.targets,master:value.master.sha256}}),'application/json','VERIFY_MEDIA',value.packageHash);value.evaluation=evaluation;
 const result=await f.store.tasks.artifacts.commit(canonical(value),'application/json','PUBLISH',rendered.id);
 rewriteTask(f,rendered.id,t=>({...t,result,outputs:t.outputs.map((a:any)=>a.sha256===rendered.value.evaluation.sha256?evaluation:a)}));await rejected(f,'exact committed task outputs');
});

test('prepared preview inspection and font policy stay bound to their actual inputs (MOCK media)',async()=>{
 const {f,prepared}=await completed(),value=structuredClone(prepared.value),previous=value.previews.motion.inspection;
 const inspection=await f.store.tasks.artifacts.commit(canonical({schemaVersion:'1.0',evaluatorVersion:'conditional-preview-inspection-v1',artifact:'f'.repeat(64),passed:true,report:{passed:true,mock:true}}),'application/json','VERIFY_MEDIA',value.previews.motion.video.sha256);value.previews.motion.inspection=inspection;
 const result=await f.store.tasks.artifacts.commit(canonical(value),'application/json','PUBLISH',prepared.id);rewriteTask(f,prepared.id,t=>({...t,result,outputs:t.outputs.map((a:any)=>a.sha256===previous.sha256?inspection:a)}));await rejected(f,'preview inspection target');
 const other=await completed(),changed=structuredClone(other.prepared.value);changed.font.sourceCommit='b'.repeat(40);const changedResult=await other.f.store.tasks.artifacts.commit(canonical(changed),'application/json','PUBLISH',other.prepared.id);rewriteTask(other.f,other.prepared.id,t=>({...t,result:changedResult}));await rejected(other.f,'execution fingerprint');
});

test('failed full-render tasks remain unfinished; a split recorded scope is refused (MOCK media)',async()=>{
 const f=await setup();f.controls.onRender=async()=>{throw new EngineError('MOCK_FAILURE','Explicit simulated renderer failure','retryable');};const prepared=await f.store.prepare('demo');await expect(f.store.run('demo',prepared.id,signal())).rejects.toMatchObject({code:'MOCK_FAILURE'});
 let r=await audited(f);expect(r.ok,JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);expect(r.finalization).toMatchObject({successfulFullTasks:0,failedOrRunningFullTasks:1});
 const other=await completed();rewriteTask(other.f,other.rendered.id,t=>({...t,scopeKey:'full-render:invented-scope'}));r=await rejected(other.f,'cannot split/reset');expect((r.finalization as any).successfulFullTasks).toBe(0);
});

test('audit aggregates all authorization variants and rejects an injected third scoped attempt (MOCK history)',async()=>{
 const f=await setup();f.controls.onRender=async()=>{throw new EngineError('MOCK_FAILURE','Explicit simulated renderer failure','retryable');};
 for(let i=0;i<3;i++){
  if(i)await writeFile(f.ownerPath,Buffer.concat([f.authorityBytes,Buffer.from('\n'.repeat(i))]));
  const prepared=await f.store.prepare('demo');
  if(i<2){await expect(f.store.run('demo',prepared.id,signal())).rejects.toMatchObject({code:'MOCK_FAILURE'});continue;}
  // Deliberately inject a persisted policy violation through the trusted low-level
  // runner, not a claim that FinalizationStore permits a third attempt.
  const input={version:'final-render-v1',projectId:'demo',packageHash:prepared.value.packageHash,authorizationTaskId:prepared.id,authorizationHash:prepared.artifact!.sha256,ownerHash:prepared.value.ownerDeferralHash,environment:prepared.value.environment,fontSha256:prepared.value.font.font.sha256};
  await expect(f.store.tasks.run('full-render',input,async()=>{throw new EngineError('MOCK_FAILURE','Injected corrupt history','retryable');},signal(),{scopeKey:prepared.value.scope.key,maxScopeAttempts:99})).rejects.toMatchObject({code:'MOCK_FAILURE'});
 }
 await rejected(f,'exceeding its immutable limit2');
});

test('missing exact baseline approval and unsupported future finalization metadata are explicit coverage failures',async()=>{
 const {f}=await completed(),db=f.base.store.db,definition=db.prepare("SELECT sql FROM sqlite_master WHERE name='pa_no_delete'").get()!.sql as string;db.exec('DROP TRIGGER pa_no_delete');db.prepare("DELETE FROM production_approvals WHERE gate='G3'").run();db.exec(definition);await rejected(f,'requires exact recorded G2/G3');
 const other=await setup();await other.store.tasks.run('final-future-protocol',{projectId:'demo',packageHash:other.base.row.hash,fixture:'MOCK unsupported future protocol'},async()=>({value:{mock:true},outputs:[]}),signal());await rejected(other,'Unsupported finalization task kind final-future-protocol');
});

test('raw-CAS-bound engineering lock and durable local delivery audit as owner-review pending (MOCK media/reviews)',async()=>{
 const {f,prepared,rendered}=await completed(),lock=await mockEngineeringLock(f,prepared,rendered),delivery=await f.store.export('demo',rendered.id,join(f.base.root,'MOCK-delivery'),signal());
 const r=await audited(f);expect(r.ok,JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);expect(r.finalization).toMatchObject({successfulEngineeringLocks:1,successfulDeliveries:1,externalDeliveryDirectoriesInspected:false,finalHumanAcceptance:'pending'});
 expect((r.finalization as any).deliveries[0]).toMatchObject({taskId:delivery.id,fullTaskId:rendered.id,engineeringLockHash:lock.artifact!.sha256,manifestSha256:delivery.value.manifestSha256});
});

test('unlocked review-draft delivery is validated from CAS without following its external directory (MOCK media)',async()=>{
 const {f,rendered}=await completed(),out=join(f.base.root,'MOCK-review-draft'),delivery=await f.store.export('demo',rendered.id,out,signal());expect(delivery.value.engineeringLock).toBeNull();
 await writeFile(join(out,'README.md'),'USER EDIT OUTSIDE AUDITED DATA ROOT');const r=await audited(f);expect(r.ok,JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);expect(r.finalization).toMatchObject({successfulEngineeringLocks:0,successfulDeliveries:1,externalDeliveryDirectoriesInspected:false});
});

test('valid-hash lock report substitution and delivery manifest claims cannot bypass metadata bindings',async()=>{
 const {f,prepared,rendered}=await completed(),lock=await mockEngineeringLock(f,prepared,rendered),changed=structuredClone(lock.value) as any;
 changed.reviewFiles.reports.evidence=changed.reviewFiles.reports.product;changed.reviewBundle.reports.evidence=changed.reviewBundle.reports.product;
 const result=await f.store.tasks.artifacts.commit(canonical(changed),'application/json','PUBLISH',lock.id);
 rewriteTask(f,lock.id,t=>({...t,result,outputs:t.outputs.map((a:any)=>a.sha256===(lock.value as any).reviewFiles.reports.evidence.sha256?changed.reviewFiles.reports.evidence:a)}));await rejected(f,'review');
 const other=await completed(),delivery=await other.f.store.export('demo',other.rendered.id,join(other.f.base.root,'MOCK-conflicting-manifest'),signal()),value=structuredClone(delivery.value),original=await other.f.store.tasks.artifacts.readJson<any>(value.manifest);
 const manifest=await other.f.store.tasks.artifacts.commit(canonical({...original,status:'DELIVERED'}),'application/json','PUBLISH',value.packageHash);value.manifest=manifest;value.manifestSha256=manifest.sha256;const nextResult=await other.f.store.tasks.artifacts.commit(canonical(value),'application/json','PUBLISH',delivery.id);
 rewriteTask(other.f,delivery.id,t=>({...t,result:nextResult,outputs:t.outputs.map((a:any)=>a.sha256===delivery.value.manifest.sha256?manifest:a)}));await rejected(other.f,'Delivery manifest');
});
