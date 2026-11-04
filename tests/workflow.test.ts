import {it,expect} from 'vitest';
import {mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {WorkflowStore,validateSnapshot,validatePlan,sourceFingerprint} from '../src/workflow/store.js';
import {canonical,sha256} from '../src/core/util.js';
import {PlanningPackageSchema} from '../src/contracts/planning.js';
import {command} from '../src/core/process.js';
import {sourceFixture,planFixture,workflowRoot,reviewFixture} from './workflow-support.js';
import {readJson} from '../src/workflow/cli.js';
import {publishReviewExport} from '../src/workflow/review-export.js';

it('validates source URL/hash/version and exact evidence quote locations',()=>{
  const snapshot=sourceFixture(),hash=sourceFingerprint(snapshot),plan=planFixture(snapshot);expect(validateSnapshot(snapshot)).toEqual(snapshot);expect(validatePlan(plan,snapshot,hash)).toEqual(plan);
  for(const change of [{sha256:'b'.repeat(64)},{url:'https://evil.test/readme'},{path:'../outside.md'}])expect(()=>validateSnapshot({...snapshot,documents:[{...snapshot.documents[0]!,...change}]})).toThrow();
  const wrong=structuredClone(plan);wrong.facts[0]!.evidence[0]!.quote='Invented result';expect(()=>validatePlan(wrong,snapshot,hash)).toThrow('quote');
  wrong.facts[0]!.evidence[0]!.quote=plan.facts[0]!.evidence[0]!.quote;wrong.facts[0]!.evidence[0]!.startLine=1;wrong.facts[0]!.evidence[0]!.endLine=1;expect(()=>validatePlan(wrong,snapshot,hash)).toThrow('quote');
  expect(()=>validatePlan(plan,snapshot,'b'.repeat(64))).toThrow('snapshot');
});
it('rejects unsupported plan versions, missing references, unsupported measured claims and invented reference observations',()=>{
  const plan=planFixture();
  for(const value of [{...plan,schemaVersion:'2.0'},{...plan,selectedConcept:'missing'},{...plan,facts:[{...plan.facts[0],kind:'measured'}]},{...plan,references:[{...plan.references[0],observations:['Pretend we saw the clip']}]}])expect(()=>PlanningPackageSchema.parse(value)).toThrow();
  const wrong=structuredClone(plan);wrong.script[0]!.claimIds=['missing'];expect(()=>PlanningPackageSchema.parse(wrong)).toThrow('Unknown fact');
  const timing=structuredClone(plan);timing.script[0]!.plannedDurationMs=500;expect(()=>PlanningPackageSchema.parse(timing)).toThrow('durations');
});
it('persists source and immutable plan revisions, deduplicates imports and same-content refetches',async()=>{
  const root=await workflowRoot('persist');let store=new WorkflowStore(root);const source=sourceFixture();
  const project=await store.create('demo',source);const first=await store.importPlan('demo',planFixture());const duplicate=await store.importPlan('demo',planFixture());expect(duplicate).toEqual(first);
  const refetched=await store.create('demo',{...source,fetchedAt:'2026-10-27T00:00:00.000Z'});expect(refetched.currentRevision).toBe(first.hash);expect(refetched.snapshotHash).toBe(project.snapshotHash);
  const updated=planFixture();updated.brief.objective='A revised objective';const second=await store.importPlan('demo',updated);expect(second.hash).not.toBe(first.hash);
  expect((await store.revision('demo',first.hash)).plan.brief.objective).not.toBe(updated.brief.objective);
  expect(()=>store.db.prepare('UPDATE revisions SET data=data').run()).toThrow('immutable');expect(()=>store.db.prepare('DELETE FROM sources').run()).toThrow('immutable');store.close();
  store=new WorkflowStore(root);expect((await store.status('demo')).project.currentRevision).toBe(second.hash);expect((await store.status('demo')).revisions).toHaveLength(2);store.close();
});
it('refuses default review publication without creating a destination parent',async()=>{
  const root=await workflowRoot('export-helper'),output=join(root,'missing','export');
  const signal=new AbortController().signal;
  const files: [string, Buffer][]=[['review.md',Buffer.from('fixture')]];
  await expect(publishReviewExport(output,files,signal)).rejects.toMatchObject({code:'LEGACY_EXPORT_DISABLED'});
  await expect(publishReviewExport(output,files,signal,{exactFiles:false})).rejects.toMatchObject({code:'LEGACY_EXPORT_DISABLED'});
  expect(await readdir(root)).toEqual([]);
});
it('refuses Store export before revision access and preserves an existing review directory',async()=>{
  const root=await workflowRoot('export-store'),store=new WorkflowStore(join(root,'state'));
  try {
    await store.create('demo',sourceFixture());
    const revision=await store.importPlan('demo',planFixture());
    const output=join(root,'existing'),reviewInput=join(output,'review-input.json');
    const {payload}=await store.revision('demo');
    await mkdir(output);
    await writeFile(reviewInput,canonical(payload));
    await writeFile(join(output,'review.md'),'existing owner review');
    await expect(store.export('missing',output)).rejects.toMatchObject({code:'LEGACY_EXPORT_DISABLED'});
    await expect(store.export('demo',output)).rejects.toMatchObject({code:'LEGACY_EXPORT_DISABLED'});
    expect((await readdir(output)).sort()).toEqual(['review-input.json','review.md']);
    expect(sha256(await readFile(reviewInput))).toBe(revision.hash);
    expect(await readFile(join(output,'review.md'),'utf8')).toBe('existing owner review');
    expect((await store.status('demo')).project.currentRevision).toBe(revision.hash);
  } finally {store.close();}
});
it('refuses CLI export before opening fresh state or creating an output parent',async()=>{
  const root=await workflowRoot('export-cli-empty'),data=join(root,'data'),out=join(root,'missing','out');
  const args=['--import','tsx',resolve('src/cli.ts'),'project','export','--data',data,'--id','demo','--out',out];
  await expect(command(process.execPath,args)).rejects.toThrow('LEGACY_EXPORT_DISABLED');
  expect(await readdir(root)).toEqual([]);
});
it('binds delegated G1/G2 approvals, rejects skipped stages and never creates direct-human final approval',async()=>{
  const root=await workflowRoot('approve');const store=new WorkflowStore(join(root,'data'),{reviewRoot:root});await store.create('demo',sourceFixture());await store.importPlan('demo',planFixture());const r=await reviewFixture(root,store);
  const approve=(gate:string)=>store.approve('demo',gate,r.candidatePath,r.rulesPath,r.delegationPath);
  await expect(approve('G2')).rejects.toMatchObject({code:'GATE_ORDER'});expect((await store.status('demo')).approvals).toEqual([]);
  const g1=await approve('G1');expect(g1.actor).toBe('delegated-judge');expect(await approve('G1')).toEqual(g1);await approve('G2');
  const status=await store.status('demo');expect(status.state).toBe('SCRIPT_APPROVED');expect(status.finalHumanAcceptance).toBe('pending');expect(status.approvals).toHaveLength(2);
  const receipt=await store.artifacts.readJson<Record<string,unknown>>(status.approvals[0]!.artifact);expect(receipt.humanIdentityAuthenticated).toBe(false);expect(receipt.reviewBundle).toBeTruthy();
  await expect(approve('G6')).rejects.toMatchObject({code:'HUMAN_FINAL_REQUIRED'});await expect(approve('G3')).rejects.toMatchObject({code:'GATE_NOT_READY'});
  expect(()=>store.db.prepare('DELETE FROM approvals').run()).toThrow('immutable');store.close();
});
it('does not let core PASS override a missing, failing or stale specialist',async()=>{
  for(const fault of ['missing','failed','stale']){
    const root=await workflowRoot(fault);const store=new WorkflowStore(join(root,'data'),{reviewRoot:root});await store.create('demo',sourceFixture());await store.importPlan('demo',planFixture());const r=await reviewFixture(root,store);const path=join(root,'content_facts.json');
    if(fault==='missing')await rm(path);else{const report=JSON.parse(await readFile(path,'utf8'));if(fault==='failed')report.verdict='FAIL';else report.candidateSha256='f'.repeat(64);await writeFile(path,JSON.stringify(report));}
    await expect(store.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath)).rejects.toThrow();expect((await store.status('demo')).approvals).toEqual([]);store.close();
  }
});
it('invalidates old approvals on input edits without deleting history; restored exact input can reuse valid approval',async()=>{
  const root=await workflowRoot('invalidate');const store=new WorkflowStore(join(root,'data'),{reviewRoot:root});await store.create('demo',sourceFixture());const original=planFixture();const first=await store.importPlan('demo',original);const r=await reviewFixture(root,store);await store.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath);
  const changed=structuredClone(original);changed.script[0]!.narration='A different narrative.';await store.importPlan('demo',changed);const current=await store.status('demo');expect(current.approvals).toEqual([]);expect(current.approvalHistory).toHaveLength(1);
  await expect(store.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath)).rejects.toMatchObject({code:'APPROVAL_BINDING'});
  await store.importPlan('demo',original);expect((await store.status('demo')).project.currentRevision).toBe(first.hash);expect((await store.status('demo')).approvals).toHaveLength(1);store.close();
});
it('detects changed review inputs, weakened policy, unauthorized delegation and damaged approval receipts',async()=>{
  const root=await workflowRoot('tamper');const store=new WorkflowStore(join(root,'data'),{reviewRoot:root});await store.create('demo',sourceFixture());await store.importPlan('demo',planFixture());const r=await reviewFixture(root,store);
  await writeFile(join(root,'proof.log'),'changed');await expect(store.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath)).rejects.toMatchObject({code:'REVIEW_NOT_PASSED'});await writeFile(join(root,'proof.log'),'FIXTURE records only; not an actual independent judge run.\n');
  const policy=JSON.parse(await readFile(r.rulesPath,'utf8'));await writeFile(r.rulesPath,JSON.stringify({...policy,activeRoles:['product','reliability','evidence']}));await expect(store.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath)).rejects.toMatchObject({code:'APPROVAL_POLICY'});await writeFile(r.rulesPath,JSON.stringify(policy));
  const delegation=JSON.parse(await readFile(r.delegationPath,'utf8'));await writeFile(r.delegationPath,JSON.stringify({...delegation,allowedGates:['G2']}));await expect(store.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath)).rejects.toMatchObject({code:'APPROVAL_AUTHORITY'});await writeFile(r.delegationPath,JSON.stringify(delegation));
  const record=await store.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath);await writeFile(store.artifacts.path(record.artifact),'damaged');await expect(store.status('demo')).rejects.toMatchObject({code:'INTEGRITY'});store.close();
});
it('public project CLI reads existing history after refusing legacy export',async()=>{
  const root=await workflowRoot('cli'),data=join(root,'data'),snapshot=join(root,'snapshot.json'),plan=join(root,'plan.json');await writeFile(snapshot,JSON.stringify(sourceFixture()));await writeFile(plan,JSON.stringify(planFixture()));
  const run=(args:string[])=>command(process.execPath,['--import','tsx',resolve('src/cli.ts'),...args,'--data',data]);
  const created=JSON.parse(await run(['project','create','--id','demo','--snapshot',snapshot]));expect(created.id).toBe('demo');await run(['project','import','--id','demo','--plan',plan]);
  const before=JSON.parse(await run(['project','status','--id','demo']));
  expect(before.state).toBe('BRIEF_REVIEW');
  const dataFiles=async()=>{
    const entries=await readdir(data,{recursive:true,withFileTypes:true});
    const files=entries.filter(entry=>entry.isFile()).map(entry=>join(entry.parentPath,entry.name)).sort();
    return Promise.all(files.map(async path=>[path,sha256(await readFile(path))]));
  };
  const stateBytes=await dataFiles();
  await expect(run(['project','export','--id','demo','--out',join(root,'new','export')])).rejects.toThrow('LEGACY_EXPORT_DISABLED');
  expect(await dataFiles()).toEqual(stateBytes);
  expect((await readdir(root)).sort()).toEqual(['data','plan.json','snapshot.json']);
  expect(JSON.parse(await run(['project','status','--id','demo']))).toEqual(before);
  const store=new WorkflowStore(join(data,'workflow'));const reviews=await reviewFixture(root,store,resolve('.'));store.close();
  const approve=(gate:string)=>run(['project','approve','--id','demo','--gate',gate,'--candidate',reviews.candidatePath,'--rules',reviews.rulesPath,'--delegation',reviews.delegationPath]);
  await expect(approve('G2')).rejects.toThrow('GATE_ORDER');await approve('G1');await approve('G2');expect(JSON.parse(await run(['project','status','--id','demo'])).state).toBe('SCRIPT_APPROVED');await expect(approve('G6')).rejects.toThrow('HUMAN_FINAL_REQUIRED');
  await expect(run(['project','status','unexpected','--id','demo'])).rejects.toThrow('USAGE');
  await writeFile(plan,canonical({...planFixture(),snapshotHash:'b'.repeat(64)}));await expect(run(['project','import','--id','demo','--plan',plan])).rejects.toThrow('SOURCE_MISMATCH');
});
it('bounds local workflow JSON imports before parsing',async()=>{
  const root=await workflowRoot('input-size'),path=join(root,'large.json');await writeFile(path,' '.repeat(4_000_001));await expect(readJson(path)).rejects.toMatchObject({code:'WORKFLOW_SIZE'});await expect(readJson(root)).rejects.toMatchObject({code:'WORKFLOW_SIZE'});
});
