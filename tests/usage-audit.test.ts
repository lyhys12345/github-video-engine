import {test,expect,afterEach} from 'vitest';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {TaskRunner} from '../src/orchestrator/tasks.js';
import {auditRuntime} from '../src/operations/audit.js';
import {sha256} from '../src/core/util.js';
const area=resolve('work/usage-audit-tests'),directories:string[]=[];
async function temp(){const {mkdir}=await import('node:fs/promises');await mkdir(area,{recursive:true});const p=await mkdtemp(join(area,'case-'));directories.push(p);return p;}
afterEach(async()=>{for(const dir of directories.splice(0)){const rel=relative(area,dir);if(isAbsolute(rel)||rel.startsWith('..'))throw Error('Unsafe test cleanup');await rm(dir,{recursive:true,force:true,maxRetries:3});}});
async function hashes(root:string){const result:Record<string,string>={};async function visit(dir:string){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await visit(p);else if(e.isFile())result[relative(root,p)]=sha256(await readFile(p));}}await visit(root);return result;}
const local={provider:'remotion-local',ratePolicy:'local-zero-v1'} as const;
const signal=()=>new AbortController().signal;
test('readonly audit distinguishes recorded local fees, unknown generic charges and cache receipts without changing source',async()=>{
 const root=await temp(),r=new TaskRunner(join(root,'workflow'));
 try{const work=async()=>({value:{simulated:'no provider/media execution'},outputs:[]});await r.run('local',{fixture:'standalone-local'},work,signal(),{accounting:local});await r.run('local',{fixture:'standalone-local'},work,signal(),{accounting:local});await r.run('unknown',{fixture:'standalone-local'},work,signal());}finally{r.close();}
 const before=await hashes(root),report=await auditRuntime(root);expect(report.ok,JSON.stringify(report.checks.filter(c=>!c.passed))).toBe(true);expect(report.schemaVersion).toBe('operations-audit/1.3');expect(report.costs).toMatchObject({ledgerAvailable:true,actualPaidUsd:null,status:'usage-ledger-partial',calculatedProviderFeesUsd:null,knownCalculatedProviderFeesUsd:0,usage:{totalAttempts:2,recordedAttempts:2,knownChargeAttempts:1,cacheHits:1,totalProviderChargeMicros:null}});expect(await hashes(root)).toEqual(before);
});
test('audit rejects forged ledger SQL keys and missing accounting immutability guards',async()=>{
 const root=await temp(),r=new TaskRunner(join(root,'workflow'));await r.run('test',{n:1},async()=>({value:'SIMULATED',outputs:[]}),signal(),{accounting:local});r.db.exec('DROP TRIGGER usage_update_forbidden');r.db.prepare('UPDATE usage_events SET id=? WHERE phase=?').run('forged-sql-key','started');r.close();
 const report=await auditRuntime(root);expect(report.ok).toBe(false);expect(report.checks.some(c=>!c.passed&&c.explanation.includes('usage_update_forbidden'))).toBe(true);
 const db=new DatabaseSync(join(root,'workflow','tasks.sqlite'));db.exec("CREATE TRIGGER usage_update_forbidden BEFORE UPDATE ON usage_events BEGIN SELECT RAISE(ABORT,'Usage history is immutable');END;");db.close();
 const keys=await auditRuntime(root);expect(keys.ok).toBe(false);expect(keys.checks.some(c=>!c.passed&&c.explanation.includes('Usage receipt SQL/JSON identity mismatch'))).toBe(true);
});
test('legacy task rows retain unknown costs after migration and do not gain invented old receipts',async()=>{
 // Self-contained legacy-schema fixture; actual eight-row historical data is
 // exercised separately by the recorded approved-state integration run.
 const root=await temp(),seed=new TaskRunner(join(root,'workflow'));
 await seed.run('legacy-simulated',{fixture:'legacy migration; no provider execution'},async()=>({value:'SIMULATED legacy callback',outputs:[]}),signal());
 seed.db.exec('DROP TABLE usage_events;PRAGMA user_version=0');seed.close();
 const original=await hashes(root),readOnly=await auditRuntime(root);expect(readOnly.ok).toBe(true);expect((readOnly.costs as any).ledgerAvailable).toBe(false);expect(await hashes(root)).toEqual(original);
 const runner=new TaskRunner(join(root,'workflow'));const oldCount=runner.list().length;const beforeJson=runner.db.prepare('SELECT id,data FROM tasks ORDER BY id').all().map(r=>[r.id,r.data]);expect(runner.usage().missingAttempts.length).toBeGreaterThan(0);expect(runner.db.prepare('SELECT COUNT(*) AS n FROM usage_events').get()!.n).toBe(0);runner.close();
 const report=await auditRuntime(root);expect(report.ok,JSON.stringify(report.checks.filter(c=>!c.passed))).toBe(true);expect((report.costs as any).usage).toMatchObject({totalAttempts:oldCount,recordedAttempts:0,totalProviderChargeMicros:null});expect((report.costs as any).usage.missingAttempts).toHaveLength(oldCount);
 const reopened=new TaskRunner(join(root,'workflow'));try{expect(reopened.db.prepare('SELECT id,data FROM tasks ORDER BY id').all().map(r=>[r.id,r.data])).toEqual(beforeJson);}finally{reopened.close();}
});
