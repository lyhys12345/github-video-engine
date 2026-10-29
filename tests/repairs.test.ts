import {test,expect} from 'vitest';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ProductionStore} from '../src/workflow/production.js';
import {repairFixture,repairRequest,mockStyle,mockG3,cleanupRepairRoot} from './repair-support.js';

const snapshot=(store:ProductionStore)=>Object.fromEntries(['packages','selected','production_approvals','repair_scopes','repair_rounds'].map(t=>[t,store.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().map(r=>({...r}))]));
const histories=(store:ProductionStore)=>({packages:store.db.prepare('SELECT hash,data FROM packages ORDER BY hash').all().map(r=>({...r})),approvals:store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r})),tasks:store.tasks.db.prepare('SELECT * FROM tasks ORDER BY id').all().map(r=>({...r}))});

test('real SQLite repair keeps all other fields/history, immutable ledger and changed-package approval invalidation (MOCK media/judges)',async()=>{
 const f=await repairFixture();try{
  const before=histories(f.store),request=repairRequest(f.design,f.row.hash,f.image),first=await f.store.revise('demo',request);
  expect(first).toMatchObject({cached:false,selected:true,repair:{round:1,parentHash:f.row.hash,nextHash:first.package.hash}});
  expect(first.package.hash).not.toBe(f.row.hash);const current=await f.store.current('demo');
  const expected=structuredClone(f.design);Object.assign(expected.scenes[1]!,request.replacement);expect(current.design).toEqual(expected);
  expect(await f.store.approval('demo',first.package.hash,'G3')).toBeNull();expect(await f.store.approval('demo',first.package.hash,'G4')).toBeNull();
  expect(await f.store.approval('demo',f.row.hash,'G3')).toEqual(f.approval);
  for(const old of before.packages)expect(histories(f.store).packages).toContainEqual(old);expect(histories(f.store).approvals).toEqual(before.approvals);expect(histories(f.store).tasks).toEqual(before.tasks);
  const history=f.store.repairs('demo');expect(history.scopes).toHaveLength(1);expect(history.rounds).toHaveLength(1);expect(history.scopes[0]).toMatchObject({baselinePackageHash:f.row.hash,maxRounds:2});
  expect(()=>f.store.db.exec('UPDATE repair_scopes SET data=data')).toThrow('immutable');expect(()=>f.store.db.exec('DELETE FROM repair_rounds')).toThrow('immutable');
  await expect(f.store.render('demo','animatic',new AbortController().signal)).rejects.toMatchObject({code:'GATE_ORDER'});
 }finally{f.store.close();await cleanupRepairRoot(f.root);}
});

test('strict repair edits reject no-op, stale parent and wrong/absent/corrupt evidence without consuming rounds (MOCK media)',async()=>{
 const f=await repairFixture();try{
  const base=repairRequest(f.design,f.row.hash,f.image),before=snapshot(f.store);
  for(const request of [{...base,schemaVersion:'2.0'},{...base,replacement:{...base.replacement,layout:'closing'}},{...base,replacement:{...base.replacement,claimIds:[]}},{...base,replacement:{...base.replacement,labels:['bad count']}}])await expect(f.store.revise('demo',request)).rejects.toThrow();
  await expect(f.store.revise('demo',{...base,expectedPackageHash:'f'.repeat(64)})).rejects.toMatchObject({code:'REPAIR_STALE'});
  await expect(f.store.revise('demo',{...base,replacement:{...base.replacement,title:f.design.scenes[1]!.title}})).rejects.toMatchObject({code:'REPAIR_NO_CHANGE'});
  const unrelated=await f.store.tasks.artifacts.commit('MOCK unassociated image','image/png','RENDER',f.row.hash);
  await expect(f.store.revise('demo',{...base,issue:{...base.issue,evidence:unrelated}})).rejects.toMatchObject({code:'REPAIR_EVIDENCE'});
  await expect(f.store.revise('demo',{...base,issue:{...base.issue,evidence:{...f.image,inputFingerprint:'f'.repeat(64)}}})).rejects.toMatchObject({code:'REPAIR_EVIDENCE'});
  const p=f.store.tasks.artifacts.path(f.image),original=await readFile(p);await writeFile(p,'MOCK corrupt fixture');
  try{await expect(f.store.revise('demo',base)).rejects.toThrow();}finally{await writeFile(p,original);}
  expect(snapshot(f.store)).toEqual(before);
 }finally{f.store.close();await cleanupRepairRoot(f.root);}
});

test('restart and exact request replay are idempotent; conflicting and historical requests cannot reselect (MOCK media/judges)',async()=>{
 const f=await repairFixture();let peer:ProductionStore|undefined;try{
  const firstRequest=repairRequest(f.design,f.row.hash,f.image),first=await f.store.revise('demo',firstRequest),before=snapshot(f.store);
  peer=new ProductionStore(f.store.root,f.root);const repeated=await peer.revise('demo',firstRequest);expect(repeated).toMatchObject({cached:true,selected:true,repair:first.repair});expect(snapshot(peer)).toEqual(before);
  await expect(peer.revise('demo',{...firstRequest,replacement:{...firstRequest.replacement,title:'Conflicting title'}})).rejects.toMatchObject({code:'REPAIR_REQUEST_CONFLICT'});
  const current=await peer.current('demo'),image=await mockStyle(peer,first.package.hash),secondRequest=repairRequest(current.design,current.record.hash,image.image,'fix-2','Second title');
  const second=await peer.revise('demo',secondRequest),historical=await peer.revise('demo',firstRequest);
  expect(historical).toMatchObject({cached:true,selected:false,repair:first.repair});expect((await peer.current('demo')).record.hash).toBe(second.package.hash);expect(peer.repairs('demo').rounds).toHaveLength(2);
 }finally{peer?.close();f.store.close();await cleanupRepairRoot(f.root);}
});

test.each(['diff','historical-package'] as const)('cached request replay verifies its committed %s artifact before reporting success (MOCK media)',async(target)=>{
 const f=await repairFixture();try{
  const request=repairRequest(f.design,f.row.hash,f.image),first=await f.store.revise('demo',request);
  if(target==='historical-package'){
   const current=await f.store.current('demo'),image=(await mockStyle(f.store,current.record.hash)).image;
   await f.store.revise('demo',repairRequest(current.design,current.record.hash,image,'fix-2','Second title'));
   expect(await f.store.revise('demo',request)).toMatchObject({cached:true,selected:false});
  }
  const before=snapshot(f.store),artifact=target==='diff'?first.repair.diff:first.package.artifact,path=f.store.tasks.artifacts.path(artifact),original=await readFile(path);
  await writeFile(path,'MOCK corrupted committed repair artifact');
  try{await expect(f.store.revise('demo',request)).rejects.toThrow();expect(snapshot(f.store)).toEqual(before);}finally{await writeFile(path,original);}
 }finally{f.store.close();await cleanupRepairRoot(f.root);}
});

test('approved baseline budget cannot reset through import, old package, newer G3, changed request or restart (MOCK media/judges)',async()=>{
 const f=await repairFixture(1);let peer:ProductionStore|undefined;try{
  const first=await f.store.revise('demo',repairRequest(f.design,f.row.hash,f.image)),current=await f.store.current('demo');
  await mockG3(f,'revised',current.design,current.record.hash);const image=(await mockStyle(f.store,current.record.hash)).image;
  const before=snapshot(f.store);
  await expect(f.store.import('demo',f.design)).rejects.toMatchObject({code:'REPAIR_REQUIRED'});
  const bypass=structuredClone(current.design);bypass.scenes[1]!.title='Import bypass';await expect(f.store.import('demo',bypass)).rejects.toMatchObject({code:'REPAIR_REQUIRED'});
  peer=new ProductionStore(f.store.root,f.root);await expect(peer.revise('demo',repairRequest(current.design,first.package.hash,image,'new-id','One more title'))).rejects.toMatchObject({code:'REPAIR_BUDGET'});
  expect(snapshot(peer)).toEqual(before);expect(peer.repairs('demo').scopes[0]!.baselinePackageHash).toBe(f.row.hash);
 }finally{peer?.close();f.store.close();await cleanupRepairRoot(f.root);}
});

test('ordinary import cannot change a G3-approved selected package before the first correction (MOCK judges)',async()=>{
 const f=await repairFixture();try{const changed=structuredClone(f.design);changed.scenes[1]!.title='Untracked change';await expect(f.store.import('demo',changed)).rejects.toMatchObject({code:'REPAIR_REQUIRED'});expect((await f.store.current('demo')).record.hash).toBe(f.row.hash);expect(f.store.repairs('demo').rounds).toHaveLength(0);}finally{f.store.close();await cleanupRepairRoot(f.root);}
});

test('corrections require the current G2 plan and a real stored G3 baseline, not merely rendered artifacts (MOCK judges)',async()=>{
 const f=await repairFixture(2,false);try{
  await expect(f.store.revise('demo',repairRequest(f.design,f.row.hash,f.image))).rejects.toMatchObject({code:'GATE_ORDER'});
  expect(f.store.repairs('demo').rounds).toHaveLength(0);await mockG3(f,'authorized',f.design,f.row.hash);
  const plan=structuredClone(f.plan);plan.brief.objective='A new unapproved plan';await f.store.workflow.importPlan('demo',plan);
  await expect(f.store.revise('demo',repairRequest(f.design,f.row.hash,f.image))).rejects.toMatchObject({code:'GATE_ORDER'});
  expect(f.store.repairs('demo').rounds).toHaveLength(0);
 }finally{f.store.close();await cleanupRepairRoot(f.root);}
});

test('a retained original image cannot justify the next selected package correction (MOCK media)',async()=>{
 const f=await repairFixture();try{
  await f.store.revise('demo',repairRequest(f.design,f.row.hash,f.image));const current=await f.store.current('demo');
  const before=snapshot(f.store);await expect(f.store.revise('demo',repairRequest(current.design,current.record.hash,f.image,'fix-next','Another title'))).rejects.toMatchObject({code:'REPAIR_EVIDENCE'});
  expect(snapshot(f.store)).toEqual(before);
 }finally{f.store.close();await cleanupRepairRoot(f.root);}
});

test('two real SQLite connections cannot commit competing corrections against the same selected parent (MOCK media)',async()=>{
 const f=await repairFixture(),peer=new ProductionStore(f.store.root,f.root);try{
  const a=repairRequest(f.design,f.row.hash,f.image,'concurrent-a','A corrected title'),b=repairRequest(f.design,f.row.hash,f.image,'concurrent-b','B corrected title');
  const results=await Promise.allSettled([f.store.revise('demo',a),peer.revise('demo',b)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const failed=results.find(r=>r.status==='rejected') as PromiseRejectedResult;expect(failed.reason).toMatchObject({code:'REPAIR_STALE'});expect(f.store.repairs('demo').rounds).toHaveLength(1);
  const chosen=(results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<ProductionStore['revise']>>>).value;
  expect((await peer.current('demo')).record.hash).toBe(chosen.package.hash);
 }finally{peer.close();f.store.close();await cleanupRepairRoot(f.root);}
});

test('identical concurrent requests share one committed correction round across two connections (MOCK media)',async()=>{
 const f=await repairFixture(),peer=new ProductionStore(f.store.root,f.root);try{
  const request=repairRequest(f.design,f.row.hash,f.image,'same-request');
  const results=await Promise.all([f.store.revise('demo',request),peer.revise('demo',request)]);
  expect(results.map(r=>r.cached).sort()).toEqual([false,true]);expect(results[0]!.repair).toEqual(results[1]!.repair);expect(results[0]!.package).toEqual(results[1]!.package);
  expect(results.every(r=>r.selected)).toBe(true);expect(peer.repairs('demo').rounds).toHaveLength(1);
 }finally{peer.close();f.store.close();await cleanupRepairRoot(f.root);}
});

test('injected round write failure rolls back scope, package and selection atomically (MOCK media)',async()=>{
 const f=await repairFixture();try{
  const before=snapshot(f.store);f.store.db.exec("CREATE TRIGGER injected_repair_failure BEFORE INSERT ON repair_rounds BEGIN SELECT RAISE(ABORT,'injected repair failure');END;");
  await expect(f.store.revise('demo',repairRequest(f.design,f.row.hash,f.image))).rejects.toThrow('injected repair failure');expect(snapshot(f.store)).toEqual(before);
  f.store.db.exec('DROP TRIGGER injected_repair_failure');const result=await f.store.revise('demo',repairRequest(f.design,f.row.hash,f.image));expect(result.repair.round).toBe(1);
 }finally{f.store.close();await cleanupRepairRoot(f.root);}
});

test('known legacy production migration preserves rows/approvals and future schemas fail without rewriting version (MOCK media/judges)',async()=>{
 const f=await repairFixture();let migrated:ProductionStore|undefined;try{
  const before=histories(f.store);f.store.db.exec('DROP TABLE repair_rounds;DROP TABLE repair_scopes;PRAGMA user_version=0');
  migrated=new ProductionStore(f.store.root,f.root);expect(migrated.db.prepare('PRAGMA user_version').get()!.user_version).toBe(1);expect(histories(migrated)).toEqual(before);expect(migrated.repairs('demo').rounds).toHaveLength(0);
  migrated.db.exec('PRAGMA user_version=9');expect(()=>new ProductionStore(f.store.root,f.root)).toThrow('version');expect(migrated.db.prepare('PRAGMA user_version').get()!.user_version).toBe(9);
 }finally{migrated?.close();f.store.close();await cleanupRepairRoot(f.root);}
});

test('unknown legacy production layouts fail atomically instead of silently installing a repair ledger',async()=>{
 const f=await repairFixture();try{
  const before=histories(f.store);f.store.db.exec('DROP TABLE repair_rounds;DROP TABLE repair_scopes;CREATE TABLE unexpected(data TEXT);PRAGMA user_version=0');
  expect(()=>new ProductionStore(f.store.root,f.root)).toThrow('schema');expect(f.store.db.prepare('PRAGMA user_version').get()!.user_version).toBe(0);
  expect(f.store.db.prepare("SELECT name FROM sqlite_master WHERE name IN ('repair_scopes','repair_rounds')").all()).toEqual([]);expect(histories(f.store)).toEqual(before);
 }finally{f.store.close();await cleanupRepairRoot(f.root);}
});
