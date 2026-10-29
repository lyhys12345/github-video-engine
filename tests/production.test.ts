import {test,expect} from 'vitest';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {ProductionPackageSchema,ReadthroughSchema} from '../src/contracts/production.js';
import {ProductionStore} from '../src/workflow/production.js';
import {canonical,sha256} from '../src/core/util.js';
import {sourceFixture,planFixture,workflowRoot,reviewFixture} from './workflow-support.js';
async function fixture(name:string){
  const root=await workflowRoot('production-'+name),store=new ProductionStore(join(root,'data'),root);
  await store.workflow.create('demo',sourceFixture());const plan=planFixture(),revision=await store.workflow.importPlan('demo',plan);
  const r=await reviewFixture(root,store.workflow);store.workflow.reviewRoot; // approvals below use an isolated explicitly synthetic review root.
  const previous=store.workflow.reviewRoot;Object.defineProperty(store.workflow,'reviewRoot',{value:root});
  await store.workflow.approve('demo','G1',r.candidatePath,r.rulesPath,r.delegationPath);await store.workflow.approve('demo','G2',r.candidatePath,r.rulesPath,r.delegationPath);Object.defineProperty(store.workflow,'reviewRoot',{value:previous});
  const measured=await store.tasks.run('readthrough',{fixture:'MOCK AUDIO: not actual speech',planRevision:revision.hash},async()=>{
    const audio=await store.tasks.artifacts.commit('MOCK WAV bytes; not a real-media test','audio/wav','RENDER',revision.hash);
    return{value:ReadthroughSchema.parse({schemaVersion:'1.0',projectId:'demo',planRevision:revision.hash,provider:'windows-sapi-offline',voiceId:'fixture-not-real-voice',rate:0,measuredAt:'2026-10-26T00:00:00.000Z',lines:plan.script.map(l=>({id:l.id,text:l.narration,audio,durationMs:6000,allocatedFrames:300,pronunciations:['MOCK']})),fps:30,totalFrames:900,status:'measured-not-yet-listened'}),outputs:[audio]};
  },new AbortController().signal);
  const design=ProductionPackageSchema.parse({schemaVersion:'1.0',projectId:'demo',planRevision:revision.hash,readthrough:store.tasks.get(measured.id)!.result,style:{id:'fixture',fontFamily:'Microsoft YaHei',background:'#FFFFFF',foreground:'#111111',accent:'#007755',muted:'#555555',direction:'Mock fixture, not a real observed visual reference',captionSize:34,safeArea:'left54-right100-top100-bottom260'},scenes:plan.script.map((s,i)=>({id:'scene-'+(i+1),scriptId:s.id,layout:i===1?'path':i===0?'hook':'closing',title:'A title',subtitle:'A subtitle',labels:i===1?['A','B','C','D']:[],sourceLabel:'Fixture source, no target execution',claimIds:s.claimIds})),references:[{url:'https://example.test/reference',status:'unavailable',observations:[],observedRange:'none',limitations:'Not observed'}],authorization:{previewWidth:360,previewHeight:640,motionWidth:720,motionHeight:1280,motionScene:'scene-2',motionAudioScriptId:'line-1',motionSeconds:7,maxPreviewAttempts:2,maxPaidUsd:0,audio:'temporary-local-sapi',fullProduction:false},origin:'agent-authored-graphics-not-target-execution'});
  return{root,store,design,plan,r};
}
test('production schemas reject version, unsafe scope, missing path nodes and fabricated observations',async()=>{const f=await fixture('schema');try{
  expect(ProductionPackageSchema.parse(f.design)).toEqual(f.design);
  for(const edit of [{schemaVersion:'2.0'},{authorization:{...f.design.authorization,fullProduction:true}},{authorization:{...f.design.authorization,maxPaidUsd:1}},{references:[{...f.design.references[0],observations:['invented']}]}])expect(()=>ProductionPackageSchema.parse({...f.design,...edit})).toThrow();
  const bad=structuredClone(f.design);bad.scenes[1]!.labels=['A'];expect(()=>ProductionPackageSchema.parse(bad)).toThrow('four');
  const measured=await f.store.readMeasured(f.design);expect(()=>ReadthroughSchema.parse({...measured,totalFrames:901})).toThrow('sum');expect(()=>ReadthroughSchema.parse({...measured,status:'listened-and-approved'})).toThrow();
  expect(()=>ReadthroughSchema.parse({...measured,fps:24,totalFrames:1800,lines:measured.lines.map(l=>({...l,allocatedFrames:600}))})).toThrow('30–60');
}finally{f.store.close();}});
test('real SQLite package revisions deduplicate, retain history and reject stale script/measurement/claims',async()=>{const f=await fixture('revision');try{
  const first=await f.store.import('demo',f.design);expect(await f.store.import('demo',f.design)).toEqual(first);
  await expect(f.store.import('demo',{...f.design,planRevision:'f'.repeat(64)})).rejects.toMatchObject({code:'PRODUCTION_BINDING'});
  await expect(f.store.import('demo',{...f.design,authorization:{...f.design.authorization,motionAudioScriptId:'missing'}})).rejects.toMatchObject({code:'MOTION_AUDIO'});
  await expect(f.store.import('demo',{...f.design,authorization:{...f.design.authorization,motionSeconds:5}})).rejects.toMatchObject({code:'MOTION_AUDIO'});
  const wrong=structuredClone(f.design);wrong.scenes[0]!.claimIds=[];await expect(f.store.import('demo',wrong)).rejects.toMatchObject({code:'PRODUCTION_SCRIPT'});
  const changed=structuredClone(f.design);changed.style.accent='#007766';const second=await f.store.import('demo',changed);expect(second.hash).not.toBe(first.hash);
  expect(f.store.db.prepare('SELECT COUNT(*) AS n FROM packages').get()!.n).toBe(2);expect(()=>f.store.db.prepare('DELETE FROM packages').run()).toThrow('immutable');
  const p=structuredClone(f.plan);p.brief.objective='Changed plan';await f.store.workflow.importPlan('demo',p);await expect(f.store.current('demo')).rejects.toMatchObject({code:'GATE_ORDER'});
}finally{f.store.close();}});
test('G2 check pins exact approved revision and rejects a real peer import during its await',async()=>{const f=await fixture('g2-race');const peer=new ProductionStore(f.store.root,f.root);try{
  const original=f.store.workflow.status.bind(f.store.workflow);const changed=structuredClone(f.plan);changed.script[0]!.narration='An unapproved revised narrative.';
  f.store.workflow.status=async(id:string)=>{const old=await original(id);await peer.workflow.importPlan(id,changed);return old;};
  await expect(f.store.script('demo')).rejects.toMatchObject({code:'WORKFLOW_CHANGED'});
  expect((await peer.workflow.status('demo')).approvals).toEqual([]);
  expect(f.store.tasks.list().some(t=>t.kind==='style'||t.kind==='animatic')).toBe(false);
}finally{peer.close();f.store.close();}});
test('missing G3 blocks actual dynamic renderer; changed exports are never replaced',async()=>{const f=await fixture('boundary');try{await f.store.import('demo',f.design);
  await expect(f.store.render('demo','animatic',new AbortController().signal)).rejects.toMatchObject({code:'GATE_ORDER'});
  await expect(f.store.render('demo','motion',new AbortController().signal)).rejects.toMatchObject({code:'GATE_ORDER'});
  await expect(f.store.approve('demo','G6','','','')).rejects.toMatchObject({code:'HUMAN_FINAL_REQUIRED'});
  const out=join(f.root,'production-export');await f.store.export('demo',out);expect(sha256(await readFile(join(out,'production-input.json')))).toBe((await f.store.current('demo')).record.hash);
  await writeFile(join(out,'production-input.json'),'damaged');await expect(f.store.export('demo',out)).rejects.toMatchObject({code:'EXPORT_EXISTS'});
}finally{f.store.close();}});
test('G3 uses all specialist receipts, binds every static artifact, is idempotent, and changes invalidate only current selection (MOCK images/judge reports)',async()=>{
  const f=await fixture('approve');try{const row=await f.store.import('demo',f.design);
    const task=await f.store.tasks.run('style',{projectId:'demo',packageHash:row.hash},async()=>{const image=await f.store.tasks.artifacts.commit('MOCK image, not real PNG','image/png','RENDER',row.hash);return{value:{mode:'style',frames:[image],contactSheet:image},outputs:[image]};},new AbortController().signal);
    const policy=JSON.parse(await readFile('reviews/M2/preflight-gate.json','utf8')),rulesPath=join(f.root,'preflight-gate.json');await writeFile(rulesPath,JSON.stringify(policy));
    const out=join(f.root,'static-review');await f.store.export('demo',out);const rel=(p:string)=>relative(f.root,p).replaceAll('\\','/');
    const required=[row.artifact,f.store.tasks.get(task.id)!.result!,...task.outputs];const files=required.map(a=>({path:rel(f.store.tasks.artifacts.path(a)),sha256:a.sha256}));
    files.push({path:rel(rulesPath),sha256:sha256(await readFile(rulesPath))});
    const candidate={id:'MOCK-G3-candidate',milestone:'M2',production:{projectId:'demo',planRevision:f.design.planRevision,packageHash:row.hash,gate:'G3',evidenceHashes:required.slice(1).map(a=>a.sha256)},files};
    const path=join(f.root,'candidate-g3.json');await writeFile(path,JSON.stringify(candidate));const hash=sha256(await readFile(path)),proof=join(f.root,'g3-proof.log');await writeFile(proof,'MOCK judge receipt mechanics only; no actual independent/visual verification');
    for(const role of policy.activeRoles)await writeFile(join(f.root,role+'.json'),JSON.stringify({role,candidateId:candidate.id,candidateSha256:hash,verdict:'PASS',criteria:policy.requiredCriteria[role].map((id:string)=>({id,status:'PASS',evidence:[proof]})),findings:[],executed:[{command:'MOCK fixture only',exitCode:0,evidencePath:proof}],limitations:['MOCK image/voice/independent judge evidence']}));
    const args=[path,rulesPath,f.r.delegationPath] as const;const first=await f.store.approve('demo','G3',...args);expect(first.actor).toBe('delegated-judge');expect(await f.store.approve('demo','G3',...args)).toEqual(first);
    const specialist=JSON.parse(await readFile(join(f.root,'video_quality.json'),'utf8'));specialist.verdict='UNVERIFIED';await writeFile(join(f.root,'video_quality.json'),JSON.stringify(specialist));await expect(f.store.approve('demo','G3',...args)).rejects.toMatchObject({code:'REVIEW_NOT_PASSED'});
    specialist.verdict='PASS';await writeFile(join(f.root,'video_quality.json'),JSON.stringify(specialist));
    const changed=structuredClone(f.design);changed.style.accent='#007766';await expect(f.store.import('demo',changed)).rejects.toMatchObject({code:'REPAIR_REQUIRED'});
    const scene=f.design.scenes[0]!,correction=await f.store.revise('demo',{schemaVersion:'1.0',requestId:'mock-title-fix',expectedPackageHash:row.hash,sceneId:scene.id,issue:{id:'mock-layout',requirement:'MOCK title change fixture',observation:'MOCK image; not an actual visual finding',evidence:task.outputs[0]},replacement:{title:'Revised title',subtitle:scene.subtitle,labels:scene.labels,sourceLabel:scene.sourceLabel}});
    expect(await f.store.approval('demo',correction.package.hash,'G3')).toBeNull();await expect(f.store.approve('demo','G3',...args)).rejects.toMatchObject({code:'APPROVAL_BINDING'});
    expect(await f.store.approval('demo',row.hash,'G3')).toBeTruthy();await expect(f.store.import('demo',f.design)).rejects.toMatchObject({code:'REPAIR_REQUIRED'});
  }finally{f.store.close();}
});
