import {test,expect,afterEach} from 'vitest';
import {readFile,readdir} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {auditRuntime} from '../src/operations/audit.js';
import {canonical,sha256} from '../src/core/util.js';
import {migrateProduction,REPAIR_SCHEMA_SQL} from '../src/workflow/repair-db.js';
import {repairFixture,repairRequest,mockStyle,cleanupRepairRoot} from './repair-support.js';
import type {RepairRound,RepairScope} from '../src/contracts/revision.js';
type Fixture=Awaited<ReturnType<typeof repairFixture>>;
const fixtures:Fixture[]=[];
async function setup(){const f=await repairFixture();fixtures.push(f);return f;}
afterEach(async()=>{for(const f of fixtures.splice(0)){try{f.store.close();}catch{}await cleanupRepairRoot(f.root);}});
async function hashes(root:string){const result:Record<string,string>={};async function visit(dir:string){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await visit(p);else if(e.isFile())result[relative(root,p)]=sha256(await readFile(p));}}await visit(root);return result;}
async function corrected(){const f=await setup(),request=repairRequest(f.design,f.baseline.hash,f.evidence),result=await f.store.revise('demo',request);return{f,request,result};}
function rewrite(db:DatabaseSync,table:'repair_scopes'|'repair_rounds',change:(data:any)=>any){
 const trigger=table==='repair_scopes'?'repair_scope_no_update':'repair_round_no_update';
 const definition=REPAIR_SCHEMA_SQL.match(new RegExp('CREATE TRIGGER '+trigger+'[\\s\\S]*?END;'))?.[0];if(!definition)throw Error('Missing fixture guard');
 db.exec('DROP TRIGGER '+trigger);try{const row=db.prepare('SELECT id,data FROM '+table+' LIMIT 1').get()!;db.prepare('UPDATE '+table+' SET data=? WHERE id=?').run(canonical(change(JSON.parse(row.data as string))),row.id as string);}finally{db.exec(definition);}
}
async function rejected(f:Fixture,pattern:string){f.store.close();const before=await hashes(f.root),r=await auditRuntime(f.store.root);expect(r.ok).toBe(false);expect(r.checks.some(c=>!c.passed&&c.explanation.includes(pattern)),JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);expect(await hashes(f.root)).toEqual(before);return r;}

test('readonly repair audit supports exact legacy0 and migrated1 without inventing old rounds (MOCK media/judges)',async()=>{
 const f=await setup();const original=f.store.db.prepare('SELECT hash,data FROM packages ORDER BY hash').all();
 f.store.db.exec('DROP TABLE repair_rounds;DROP TABLE repair_scopes;PRAGMA user_version=0');f.store.close();
 let before=await hashes(f.root),r=await auditRuntime(f.store.root);expect(r.ok,JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);expect(r.repairs).toMatchObject({ledgerAvailable:false,unrecordedHistoricalCorrections:null});expect(await hashes(f.root)).toEqual(before);
 const db=new DatabaseSync(join(f.store.root,'production.sqlite'));try{migrateProduction(db);expect(db.prepare('SELECT hash,data FROM packages ORDER BY hash').all()).toEqual(original);expect(db.prepare('SELECT COUNT(*) AS n FROM repair_rounds').get()!.n).toBe(0);}finally{db.close();}
 before=await hashes(f.root);r=await auditRuntime(f.store.root);expect(r.ok).toBe(true);expect(r.schemaVersion).toBe('operations-audit/1.3');expect(r.repairs).toMatchObject({ledgerAvailable:true,status:'recorded-scopes-validated',recordedScopes:0,recordedRounds:0,unrecordedHistoricalCorrections:null});expect(await hashes(f.root)).toEqual(before);
});

test('actual selected correction and bound diff/evidence audit without source changes (MOCK media/judges)',async()=>{
 const {f,result}=await corrected();expect(result.package.hash).not.toBe(f.baseline.hash);f.store.close();const before=await hashes(f.root),r=await auditRuntime(f.store.root);
 expect(r.ok,JSON.stringify(r.checks.filter(c=>!c.passed))).toBe(true);expect(r.repairs).toMatchObject({ledgerAvailable:true,recordedScopes:1,recordedRounds:1,unrecordedHistoricalCorrections:null,scopes:[{baselinePackageHash:f.baseline.hash,consumedRounds:1,maxRounds:2,remaining:1,latestPackageHash:result.package.hash}]});expect(r.productionAuthorizationGranted).toBe(false);expect(await hashes(f.root)).toEqual(before);
});

test('future production versions and missing repair guards fail readonly with intact source',async()=>{
 const f=await setup();f.store.db.exec('PRAGMA user_version=7');await rejected(f,'Unsupported production user_version 7');
 const other=await setup();other.store.db.exec('DROP TRIGGER repair_round_no_delete');await rejected(other,'Unknown production schema');
});

test('scope SQL identity and approved budget cannot diverge from valid JSON (MOCK history)',async()=>{
 const {f}=await corrected();f.store.db.exec('DROP TRIGGER repair_scope_no_update');f.store.db.prepare('UPDATE repair_scopes SET project_id=?').run('other');f.store.db.exec(REPAIR_SCHEMA_SQL.match(/CREATE TRIGGER repair_scope_no_update[\s\S]*?END;/)![0]);await rejected(f,'Repair scope SQL/JSON identity mismatch');
 const next=await corrected();rewrite(next.f.store.db,'repair_scopes',(s:RepairScope)=>({...s,maxRounds:5}));await rejected(next.f,'budget differs');
});

test('missing G2 or mismatched G3 baseline receipt cannot authorize a repair scope',async()=>{
 const {f}=await corrected();f.store.workflow.db.exec('DROP TRIGGER no_approval_delete');f.store.workflow.db.prepare("DELETE FROM approvals WHERE gate='G2'").run();f.store.workflow.db.exec("CREATE TRIGGER no_approval_delete BEFORE DELETE ON approvals BEGIN SELECT RAISE(ABORT,'Approval history is immutable');END;");await rejected(f,'lacks exact approved G2');
 const other=await corrected();const g2=JSON.parse(other.f.store.workflow.db.prepare("SELECT data FROM approvals WHERE gate='G2'").get()!.data as string);rewrite(other.f.store.db,'repair_scopes',(s:RepairScope)=>({...s,baselineApproval:g2.artifact}));await rejected(other.f,'lacks exact immutable G3');
});

test('extra package changes cannot hide behind a valid single-scene request and valid CAS hashes',async()=>{
 const {f,result}=await corrected(),current=await f.store.current('demo'),changed=structuredClone(current.design);changed.style.accent='#112233';const hash=sha256(canonical(changed)),artifact=await f.store.tasks.artifacts.commit(canonical(changed),'application/json','VALIDATE',hash);
 f.store.db.prepare('INSERT INTO packages(hash,data) VALUES(?,?)').run(hash,canonical({hash,projectId:'demo',planRevision:changed.planRevision,artifact}));f.store.db.prepare('UPDATE selected SET hash=?').run(hash);rewrite(f.store.db,'repair_rounds',(r:RepairRound)=>({...r,nextHash:hash}));expect(result.package.hash).not.toBe(hash);await rejected(f,'outside its declared single-scene');
});

test('valid-hash but wrong diff payload and wrong-parent media evidence fail provenance',async()=>{
 const {f,result}=await corrected();const diff=await f.store.tasks.artifacts.commit(canonical({schemaVersion:'revision-diff/1.0',forged:'not the complete package diff'}),'application/json','VALIDATE',result.package.hash);rewrite(f.store.db,'repair_rounds',(r:RepairRound)=>({...r,diff}));await rejected(f,'diff payload differs');
 const other=await corrected(),media=await mockStyle(other.f.store,other.result.package.hash);rewrite(other.f.store.db,'repair_rounds',(r:RepairRound)=>({...r,request:{...r.request,issue:{...r.request.issue,evidence:media.image}}}));await rejected(other.f,'matching committed parent-package');
});

test('selection rollback, malformed rounds and discontinuous round numbering are explicit failures',async()=>{
 const {f}=await corrected();f.store.db.prepare('UPDATE selected SET hash=?').run(f.baseline.hash);await rejected(f,'bypasses the latest committed repair chain');
 const other=await corrected();rewrite(other.f.store.db,'repair_rounds',(r:RepairRound)=>({...r,round:2}));other.f.store.db.exec('DROP TRIGGER repair_round_no_update');other.f.store.db.exec('UPDATE repair_rounds SET round=2');other.f.store.db.exec(REPAIR_SCHEMA_SQL.match(/CREATE TRIGGER repair_round_no_update[\s\S]*?END;/)![0]);await rejected(other.f,'complete selected-version chain');
 const malformed=await corrected();malformed.f.store.db.exec('DROP TRIGGER repair_round_no_update');malformed.f.store.db.prepare('UPDATE repair_rounds SET data=?').run('{bad');malformed.f.store.db.exec(REPAIR_SCHEMA_SQL.match(/CREATE TRIGGER repair_round_no_update[\s\S]*?END;/)![0]);await rejected(malformed.f,'Malformed repair JSON');
});
