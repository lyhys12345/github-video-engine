import {test,expect} from 'vitest';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {OwnerAvDeferralSchema,FinalPreparedSchema,FinalResultSchema,FinalLockSchema,FinalDeliverySchema} from '../src/contracts/finalization.js';
import {canonical,sha256} from '../src/core/util.js';
import {EngineError} from '../src/core/errors.js';
import {FinalizationStore} from '../src/workflow/finalization.js';
import {repairRequest} from './repair-support.js';
import {finalizationFixture,finalTaskRows,mockFinalReview} from './finalization-support.js';
const signal=()=>new AbortController().signal;

test('explicit conditional preparation binds exact inputs/owner bytes and deduplicates without G4 (MOCK media/providers)',async()=>{
 const f=await finalizationFixture();try{
  const approvals=f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r})),first=await f.store.prepare('demo'),repeat=await f.store.prepare('demo');
  expect(first.cached).toBe(false);expect(repeat).toMatchObject({id:first.id,cached:true,value:first.value});expect(f.counts.inspect).toBe(2);expect(f.counts.render).toBe(0);
  expect(first.value).toMatchObject({kind:'conditional-full-production',project:{id:'demo'},packageHash:f.base.row.hash,ownerDeferralHash:sha256(f.authorityBytes),scope:{key:'full-render:'+f.base.row.hash,maxAttempts:2,maxPaidUsd:0},deferredAv:true,finalHumanAcceptance:'pending'});
  expect(first.value.package).toEqual(f.base.row.artifact);expect(first.value.g3).toEqual(f.base.approval!.artifact);expect(first.value.previews.animatic.inspection.inputFingerprint).toBe(first.value.previews.animatic.video.sha256);
  expect(await f.base.store.approval('demo',f.base.row.hash,'G4')).toBeNull();expect(f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r}))).toEqual(approvals);
  expect(f.store.status('demo')).toMatchObject({deferredAv:true,finalHumanAcceptance:'pending'});
 }finally{await f.close();}
});

test('strict authority/full contracts cannot turn AV deferral into a paid, G4, final-human or extra-attempt approval (MOCK data)',async()=>{
 const f=await finalizationFixture();try{
  const owner=JSON.parse(f.authorityBytes.toString('utf8'));expect(OwnerAvDeferralSchema.parse(owner)).toEqual(owner);
  for(const bad of [{...owner,createsG4Pass:true},{...owner,finalHumanRequired:false},{...owner,limits:{...owner.limits,maxPaidUsd:1}},{...owner,allowedEngineeringMilestones:['M3']},{...owner,schemaVersion:'2.0'}])expect(OwnerAvDeferralSchema.safeParse(bad).success).toBe(false);
  const prepared=(await f.store.prepare('demo')).value;
  for(const bad of [{...prepared,schemaVersion:'2.0'},{...prepared,deferredAv:false},{...prepared,scope:{...prepared.scope,maxAttempts:3}},{...prepared,scope:{...prepared.scope,key:'unbounded'}},{...prepared,finalHumanAcceptance:'approved'},{...prepared,approvalMeaning:'G4 PASS'}])expect(FinalPreparedSchema.safeParse(bad).success).toBe(false);
  const altered=join(f.base.root,'altered-authority.json');await writeFile(altered,canonical({...owner,recordedAt:'2026-10-26T14:00:00Z'}));await expect(f.store.prepare('demo',altered)).rejects.toMatchObject({code:'FINAL_AUTHORITY'});
  const same=join(f.base.root,'same-authority.json');await writeFile(same,canonical(owner));expect((await f.store.prepare('demo',same)).value.ownerDeferralHash).toBe(sha256(f.authorityBytes));
 }finally{await f.close();}
});

test('missing G2/G3, actual-preview references and trusted owner record fail before rendering (MOCK providers)',async()=>{
 const noG3=await finalizationFixture({g3:false});try{await expect(noG3.store.prepare('demo')).rejects.toMatchObject({code:'GATE_ORDER'});expect(noG3.counts.render).toBe(0);}finally{await noG3.close();}
 const noPreview=await finalizationFixture({previews:['animatic']});try{await expect(noPreview.store.prepare('demo')).rejects.toMatchObject({code:'FINAL_PREVIEW'});expect(noPreview.store.tasks.list().some(t=>t.kind==='final-authorize')).toBe(false);}finally{await noPreview.close();}
 const noG2=await finalizationFixture();try{const plan=structuredClone(noG2.base.plan);plan.brief.objective='MOCK changed plan, no G2';await noG2.base.store.workflow.importPlan('demo',plan);await expect(noG2.store.prepare('demo')).rejects.toMatchObject({code:'GATE_ORDER'});}finally{await noG2.close();}
 const noOwner=await finalizationFixture();try{noOwner.injected.authorityPath=join(noOwner.base.root,'missing-owner.json');await expect(noOwner.store.prepare('demo')).rejects.toThrow();expect(noOwner.store.tasks.list().some(t=>t.kind==='final-authorize')).toBe(false);}finally{await noOwner.close();}
});

test('full task publishes bound artifacts, persists across restart and reuses cache without rendering again (MOCK render/finish)',async()=>{
 const f=await finalizationFixture();let peer:FinalizationStore|undefined;try{
  await expect(f.store.run('demo','f'.repeat(64),signal())).rejects.toMatchObject({code:'FINAL_AUTHORITY'});
  const auth=await f.store.prepare('demo'),first=await f.store.run('demo',auth.id,signal());expect(first.cached).toBe(false);expect(f.counts).toMatchObject({render:1,finish:1});expect(first.value).toMatchObject({authorizationTaskId:auth.id,status:'ENGINEERING_CANDIDATE_OWNER_REVIEW_PENDING',deferredAv:true,finalHumanAcceptance:'pending'});
  expect(FinalResultSchema.safeParse({...first.value,status:'DELIVERED'}).success).toBe(false);
  const evaluated=await f.store.tasks.artifacts.readJson<any>(first.value.evaluation);expect(evaluated.targets).toEqual({master:first.value.master.sha256,captioned:first.value.captioned.sha256,narration:first.value.narration.sha256,srt:first.value.subtitles.srt.sha256,vtt:first.value.subtitles.vtt.sha256});expect(evaluated.technical.mock).toBe(true);
  peer=new FinalizationStore(f.store.root,f.injected);const before=finalTaskRows(peer),repeated=await peer.run('demo',auth.id,signal());expect(repeated).toMatchObject({id:first.id,cached:true,value:first.value});expect(finalTaskRows(peer)).toEqual(before);expect(f.counts.render).toBe(1);expect((await peer.result('demo',first.id)).value).toEqual(first.value);
  expect(await peer.production.approval('demo',f.base.row.hash,'G4')).toBeNull();
 }finally{peer?.close();await f.close();}
});

test('corrupt committed preparation inspection or final media cannot be returned as valid cached output (MOCK media)',async()=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),inspection=auth.value.previews.motion.inspection,p=f.store.tasks.artifacts.path(inspection),original=await readFile(p);await writeFile(p,'MOCK corrupt inspection');
  await expect(f.store.run('demo',auth.id,signal())).rejects.toMatchObject({code:'INTEGRITY'});expect(f.counts.render).toBe(0);await writeFile(p,original);
  const first=await f.store.run('demo',auth.id,signal()),masterPath=f.store.tasks.artifacts.path(first.value.master);await writeFile(masterPath,'MOCK corrupt master');
  await expect(f.store.run('demo',auth.id,signal())).rejects.toMatchObject({code:'INTEGRITY'});await expect(f.store.result('demo',first.id)).rejects.toMatchObject({code:'INTEGRITY'});expect(f.counts.render).toBe(1);expect(f.store.tasks.get(first.id)!.attempt).toBe(1);
 }finally{await f.close();}
});

test.each(['wrong-target','outside-output'] as const)('valid CAS hashes cannot hide %s final metadata on result/cache reads (MOCK persisted corruption)',async(kind)=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),first=await f.store.run('demo',auth.id,signal()),task=f.store.tasks.get(first.id)!,value=structuredClone(first.value),evaluation=await f.store.tasks.artifacts.readJson<any>(value.evaluation);
  if(kind==='outside-output')value.master=await f.store.tasks.artifacts.commit('MOCK unrelated complete CAS video; deliberately not in task outputs','video/mp4','RENDER',value.packageHash);
  evaluation.targets.master=kind==='wrong-target'?'f'.repeat(64):value.master.sha256;
  value.evaluation=await f.store.tasks.artifacts.commit(canonical(evaluation),'application/json','VERIFY_MEDIA',value.packageHash);
  const outputs=task.outputs.map(a=>a.sha256===first.value.evaluation.sha256?value.evaluation:a),result=await f.store.tasks.artifacts.commit(canonical(value),'application/json','PUBLISH',first.id),corrupt={...task,result,outputs};
  // Simulate semantically corrupt restored metadata in an owned test database.
  // Every CAS object is complete/hash-valid and normal preservation guards are
  // restored before invoking the reader, so rejection cannot rely on a guard gap.
  f.store.tasks.db.exec('BEGIN IMMEDIATE');try{
   f.store.tasks.db.exec('DROP TRIGGER completed_task_immutable');f.store.tasks.db.prepare('UPDATE tasks SET data=? WHERE id=?').run(canonical(corrupt),first.id);
   f.store.tasks.db.exec("CREATE TRIGGER completed_task_immutable BEFORE UPDATE ON tasks WHEN json_extract(OLD.data,'$.state')='succeeded' BEGIN SELECT RAISE(ABORT,'Successful tasks are immutable');END;");f.store.tasks.db.exec('COMMIT');
  }catch(e){f.store.tasks.db.exec('ROLLBACK');throw e;}
  expect(()=>f.store.tasks.db.prepare('UPDATE tasks SET data=data WHERE id=?').run(first.id)).toThrow('immutable');
  for(const a of [...outputs,result,value.master])await f.store.tasks.artifacts.verify(a);
  const before=finalTaskRows(f.store),receipts=f.store.tasks.db.prepare('SELECT * FROM usage_events ORDER BY seq').all().map(r=>({...r})),message=kind==='wrong-target'?'target binding mismatch':'output outside its committed task';
  await expect(f.store.result('demo',first.id)).rejects.toMatchObject({code:'FINAL_RESULT',message:expect.stringContaining(message)});
  await expect(f.store.run('demo',auth.id,signal())).rejects.toMatchObject({code:'FINAL_RESULT',message:expect.stringContaining(message)});
  expect(finalTaskRows(f.store)).toEqual(before);expect(f.store.tasks.db.prepare('SELECT * FROM usage_events ORDER BY seq').all().map(r=>({...r}))).toEqual(receipts);expect(f.counts.render).toBe(1);expect(f.store.tasks.get(first.id)!.attempt).toBe(1);
 }finally{await f.close();}
});

test('changed exact owner record or selected package invalidates old preparation before work (MOCK media)',async()=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),owner=JSON.parse(f.authorityBytes.toString('utf8'));await writeFile(f.ownerPath,JSON.stringify({...owner,recordedAt:'2026-10-26T14:00:00Z'}));
  await expect(f.store.run('demo',auth.id,signal())).rejects.toMatchObject({code:'FINAL_STALE'});expect(f.counts.render).toBe(0);await writeFile(f.ownerPath,f.authorityBytes);
  await f.base.store.revise('demo',repairRequest(f.base.design,f.base.row.hash,f.base.image));await expect(f.store.run('demo',auth.id,signal())).rejects.toMatchObject({code:'FINAL_STALE'});expect(f.counts.render).toBe(0);
 }finally{await f.close();}
});

test('failed full attempts share the two-attempt ceiling across new owner-bound preparations and restarts (MOCK failures)',async()=>{
 const f=await finalizationFixture();let peer:FinalizationStore|undefined;try{
  f.controls.onRender=async()=>{throw new EngineError('MOCK_RENDER_RETRY','MOCK retryable renderer failure','retryable');};const owner=JSON.parse(f.authorityBytes.toString('utf8')),auth1=await f.store.prepare('demo');
  await expect(f.store.run('demo',auth1.id,signal())).rejects.toMatchObject({code:'MOCK_RENDER_RETRY'});
  await writeFile(f.ownerPath,canonical({...owner,recordedAt:'2026-10-26T14:00:00Z'}));const auth2=await f.store.prepare('demo');expect(auth2.id).not.toBe(auth1.id);await expect(f.store.run('demo',auth2.id,signal())).rejects.toMatchObject({code:'MOCK_RENDER_RETRY'});
  await writeFile(f.ownerPath,canonical({...owner,recordedAt:'2026-10-26T14:01:00Z'}));peer=new FinalizationStore(f.store.root,f.injected);const auth3=await peer.prepare('demo');await expect(peer.run('demo',auth3.id,signal())).rejects.toThrow(/used its 2 total attempts|exhaust/i);
  expect(f.counts.render).toBe(2);const full=peer.tasks.list().filter(t=>t.kind==='full-render');expect(full).toHaveLength(2);expect(full.reduce((n,t)=>n+t.attempt,0)).toBe(2);expect(full.every(t=>t.scopeKey==='full-render:'+f.base.row.hash&&t.state==='failed'&&t.result===null)).toBe(true);
 }finally{peer?.close();await f.close();}
});

test('cancellation records a terminal receipt and permits one bounded resumed attempt (MOCK renderer callback)',async()=>{
 const f=await finalizationFixture();try{
  let ready!:()=>void;const started=new Promise<void>(resolve=>ready=resolve);f.controls.onRender=async(_input,s)=>{ready();await new Promise<void>((_done,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));};
  const auth=await f.store.prepare('demo'),control=new AbortController(),pending=f.store.run('demo',auth.id,control.signal);await started;control.abort(new EngineError('CANCELLED','MOCK explicit cancellation','cancelled'));await expect(pending).rejects.toMatchObject({code:'CANCELLED'});
  const cancelled=f.store.tasks.list().find(t=>t.kind==='full-render')!;expect(cancelled).toMatchObject({state:'cancelled',attempt:1,result:null});const receipts=f.store.tasks.db.prepare('SELECT data FROM usage_events WHERE task_id=? ORDER BY seq').all(cancelled.id).map(r=>JSON.parse(r.data as string));expect(receipts.at(-1)).toMatchObject({phase:'terminal',outcome:'cancelled'});
  f.controls.onRender=undefined;const resumed=await f.store.run('demo',auth.id,signal());expect(resumed.cached).toBe(false);expect(f.store.tasks.get(resumed.id)).toMatchObject({state:'succeeded',attempt:2});expect(f.counts.render).toBe(2);
 }finally{await f.close();}
});

test('six-role MOCK G5 lock binds exact output/authority bytes and raw review CAS without fabricating G4/G6',async()=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),full=await f.store.run('demo',auth.id,signal()),review=await mockFinalReview(f,full),before=f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r}));
  const lock=await f.store.lock('demo',full.id,review.candidatePath,review.rulesPath,review.delegationPath);expect(lock.cached).toBe(false);
  expect(FinalLockSchema.parse(lock.value)).toMatchObject({kind:'engineering-picture-lock',fullTaskId:full.id,authorizationTaskId:auth.id,masterHash:full.value.master.sha256,captionedHash:full.value.captioned.sha256,narrationHash:full.value.narration.sha256,srtHash:full.value.subtitles.srt.sha256,vttHash:full.value.subtitles.vtt.sha256,ownerDeferralHash:sha256(f.authorityBytes),actor:'delegated-judges-under-owner-av-deferral',historicalG4PassCreated:false,deferredAv:true,finalHumanAcceptance:'pending'});
  expect(Object.keys(lock.value.reviewFiles.reports).sort()).toEqual(['content_facts','evidence','product','reliability','security','video_quality']);
  const bindings=[[review.candidatePath,lock.value.reviewFiles.candidate],[review.rulesPath,lock.value.reviewFiles.rules],[review.delegationPath,lock.value.reviewFiles.delegation],...Object.entries(lock.value.reviewFiles.reports).map(([role,a])=>[join(review.folder,role+'.json'),a])] as Array<[string,typeof lock.value.reviewFiles.candidate]>;
  for(const[path,artifact]of bindings){const raw=await readFile(path);expect(artifact.sha256).toBe(sha256(raw));expect(await readFile(f.store.tasks.artifacts.path(artifact))).toEqual(raw);expect(f.store.tasks.get(lock.id)!.outputs).toContainEqual(artifact);}
  expect(lock.value.reviewBundle.reports).toEqual(review.reports);expect(lock.value.candidateHash).toBe(sha256(await readFile(review.candidatePath)));expect(lock.value.rulesHash).toBe(sha256(await readFile(review.rulesPath)));expect(lock.value.delegationHash).toBe(sha256(await readFile(review.delegationPath)));
  const tasks=finalTaskRows(f.store),again=await f.store.lock('demo',full.id,review.candidatePath,review.rulesPath,review.delegationPath);expect(again).toMatchObject({id:lock.id,cached:true,value:lock.value});expect(finalTaskRows(f.store)).toEqual(tasks);
  for(const invalid of [{...lock.value,historicalG4PassCreated:true},{...lock.value,finalHumanAcceptance:'approved'},{...lock.value,actor:'human'},{...lock.value,candidateHash:'f'.repeat(64)}])expect(FinalLockSchema.safeParse(invalid).success).toBe(false);
  expect(f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r}))).toEqual(before);expect(await f.base.store.approval('demo',f.base.row.hash,'G4')).toBeNull();
 }finally{await f.close();}
});

test.each(['missing-role','wrong-output','missing-owner','weakened-policy','non-av-unverified','g6-binding'] as const)('MOCK G5 %s fails before any engineering lock or approval is recorded',async(kind)=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),full=await f.store.run('demo',auth.id,signal()),review=await mockFinalReview(f,full);
  if(kind==='missing-role')await unlink(join(review.folder,'security.json'));
  if(kind==='wrong-output'){review.candidate.finalization.masterHash='f'.repeat(64);await review.write();}
  if(kind==='missing-owner'){review.candidate.files=review.candidate.files.filter(v=>v.sha256!==sha256(f.authorityBytes));await review.write();}
  if(kind==='weakened-policy'){review.rules.activeRoles=review.rules.activeRoles.filter((r:string)=>r!=='security');delete review.rules.requiredCriteria.security;await writeFile(review.rulesPath,JSON.stringify(review.rules));const rel=relative(f.base.root,review.rulesPath).replaceAll('\\','/');review.candidate.files.find(v=>v.path===rel)!.sha256=sha256(await readFile(review.rulesPath));await review.write();}
  if(kind==='non-av-unverified'){const report=review.reports.security;report.verdict='UNVERIFIED';report.criteria[0].status='UNVERIFIED';report.limitations.push('MOCK unverified security criterion; not a deferred perceptual AV check');await writeFile(join(review.folder,'security.json'),JSON.stringify(report));}
  if(kind==='g6-binding'){review.candidate.finalization.gate='G6';await review.write();}
  const tasks=finalTaskRows(f.store),events=f.store.tasks.db.prepare('SELECT * FROM usage_events ORDER BY seq').all().map(r=>({...r})),approvals=f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r}));
  await expect(f.store.lock('demo',full.id,review.candidatePath,review.rulesPath,review.delegationPath)).rejects.toThrow();expect(finalTaskRows(f.store)).toEqual(tasks);expect(f.store.tasks.db.prepare('SELECT * FROM usage_events ORDER BY seq').all().map(r=>({...r}))).toEqual(events);expect(f.store.tasks.list().some(t=>t.kind==='final-picture-lock')).toBe(false);expect(f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r}))).toEqual(approvals);
 }finally{await f.close();}
});

test('changed valid MOCK Judge report bytes create a new exact engineering lock without changing old receipts',async()=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),full=await f.store.run('demo',auth.id,signal()),review=await mockFinalReview(f,full),first=await f.store.lock('demo',full.id,review.candidatePath,review.rulesPath,review.delegationPath),oldBytes=await readFile(f.store.tasks.artifacts.path(first.artifact!)),oldReport=await readFile(f.store.tasks.artifacts.path(first.value.reviewFiles.reports.security!));
  review.reports.security.limitations.push('MOCK additional security diagnostic recorded after initial fixture receipt; no actual Judge review');const path=join(review.folder,'security.json');await writeFile(path,JSON.stringify(review.reports.security,null,2)+'\n');
  const second=await f.store.lock('demo',full.id,review.candidatePath,review.rulesPath,review.delegationPath);expect(second.cached).toBe(false);expect(second.id).not.toBe(first.id);expect(second.value.candidateHash).toBe(first.value.candidateHash);expect(second.value.reviewFiles.reports.security!.sha256).toBe(sha256(await readFile(path)));expect(second.value.reviewFiles.reports.security!.sha256).not.toBe(first.value.reviewFiles.reports.security!.sha256);expect(await readFile(f.store.tasks.artifacts.path(first.artifact!))).toEqual(oldBytes);expect(await readFile(f.store.tasks.artifacts.path(first.value.reviewFiles.reports.security!))).toEqual(oldReport);expect(f.store.tasks.get(first.id)!.result).toEqual(first.artifact);expect(f.store.tasks.list().filter(t=>t.kind==='final-picture-lock')).toHaveLength(2);
 }finally{await f.close();}
});

test('root delivery persists CAS file index/manifest and exact MOCK G5 receipt and reuses a complete export',async()=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),full=await f.store.run('demo',auth.id,signal()),review=await mockFinalReview(f,full),lock=await f.store.lock('demo',full.id,review.candidatePath,review.rulesPath,review.delegationPath),out=join(f.base.root,'root-delivery');
  const first=await f.store.export('demo',full.id,out);expect(first.cached).toBe(false);expect(FinalDeliverySchema.parse(first.value)).toMatchObject({projectId:'demo',fullTaskId:full.id,authorizationTaskId:auth.id,engineeringLock:lock.artifact,status:'FINAL_OWNER_REVIEW_PENDING',deferredAv:true,finalHumanAcceptance:'pending'});expect(first.value.files.length).toBeGreaterThan(40);
  const manifest=await readFile(join(out,'delivery-manifest.json'));expect(sha256(manifest)).toBe(first.value.manifestSha256);expect(await readFile(f.store.tasks.artifacts.path(first.value.manifest))).toEqual(manifest);const task=f.store.tasks.get(first.id)!;expect(task.outputs).toContainEqual(first.value.manifest);
  for(const entry of first.value.files){const bytes=await readFile(join(out,entry.path));expect(bytes.length).toBe(entry.bytes);expect(sha256(bytes)).toBe(entry.sha256);expect(entry.artifact.sha256).toBe(entry.sha256);expect(await readFile(f.store.tasks.artifacts.path(entry.artifact))).toEqual(bytes);expect(task.outputs).toContainEqual(entry.artifact);}
  expect(JSON.parse(await readFile(join(out,'authority/engineering-picture-lock.json'),'utf8'))).toEqual(lock.value);expect(JSON.parse(await readFile(join(out,'quality/engineering-reviews.json'),'utf8'))).toEqual(lock.value.reviewBundle);
  const tasks=finalTaskRows(f.store),again=await f.store.export('demo',full.id,out);expect(again).toMatchObject({id:first.id,cached:true,value:first.value});expect(finalTaskRows(f.store)).toEqual(tasks);expect(await readFile(join(out,'delivery-manifest.json'))).toEqual(manifest);expect(f.counts.render).toBe(1);
 }finally{await f.close();}
});

test('root cached delivery rejects edited folder before recording cache success and preserves history/user edit (MOCK media)',async()=>{
 const f=await finalizationFixture();try{
  const auth=await f.store.prepare('demo'),full=await f.store.run('demo',auth.id,signal()),out=join(f.base.root,'root-delivery'),first=await f.store.export('demo',full.id,out),input=join(out,'editable-project/render-input.json'),original=await readFile(input),manifest=await readFile(join(out,'delivery-manifest.json'));await writeFile(input,'OWNER EDIT; preserve this file');
  const tasks=finalTaskRows(f.store),events=f.store.tasks.db.prepare('SELECT * FROM usage_events ORDER BY seq').all().map(r=>({...r}));await expect(f.store.export('demo',full.id,out)).rejects.toMatchObject({code:'FINAL_EXPORT_CONFLICT'});expect(finalTaskRows(f.store)).toEqual(tasks);expect(f.store.tasks.db.prepare('SELECT * FROM usage_events ORDER BY seq').all().map(r=>({...r}))).toEqual(events);expect(await readFile(input,'utf8')).toBe('OWNER EDIT; preserve this file');expect(await readFile(join(out,'delivery-manifest.json'))).toEqual(manifest);expect(f.store.tasks.get(first.id)!.result).toEqual(first.artifact);await f.store.tasks.artifacts.verify(first.value.manifest);
  await writeFile(input,original);const again=await f.store.export('demo',full.id,out);expect(again).toMatchObject({id:first.id,cached:true,value:first.value});
 }finally{await f.close();}
});
