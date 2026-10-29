import {test,expect,afterEach} from 'vitest';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {join,relative,resolve,isAbsolute,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {diffRevisions,DIFF_LIMITS} from '../src/operations/revision-diff.js';
import {diffCommand} from '../src/workflow/diff-cli.js';
import {ProductionPackageSchema} from '../src/contracts/production.js';
import {canonical,sha256} from '../src/core/util.js';
import {planFixture} from './workflow-support.js';
const dirs:string[]=[];
async function area(){const p=await mkdtemp(join(tmpdir(),'gve-diff-'));dirs.push(p);return p;}
afterEach(async()=>{for(const p of dirs.splice(0)){const rel=relative(resolve(tmpdir()),resolve(p));if(isAbsolute(rel)||rel.startsWith('..')||!basename(p).startsWith('gve-diff-'))throw Error('Unsafe diff test cleanup');await rm(p,{recursive:true,force:true,maxRetries:3});}});
const plan=()=>{const p=planFixture();return{snapshotHash:p.snapshotHash,plan:p};};
function production(){const h='a'.repeat(64);return ProductionPackageSchema.parse({schemaVersion:'1.0',projectId:'demo',planRevision:'b'.repeat(64),readthrough:{schemaVersion:'1.0',id:h,sha256:h,bytes:123,mediaType:'application/json',storage:`aa/${h}.json`,producingStage:'PUBLISH',inputFingerprint:'c'.repeat(64),createdAt:'2026-10-26T00:00:00.000Z',integrity:'verified'},style:{id:'mock-style',fontFamily:'Microsoft YaHei',background:'#FFFFFF',foreground:'#111111',accent:'#007755',muted:'#555555',direction:'Synthetic fixture only; not visually approved',captionSize:34,safeArea:'left54-right100-top100-bottom260'},scenes:[{id:'opening',scriptId:'line-1',layout:'hook',title:'Opening',subtitle:'Synthetic fixture',labels:[],sourceLabel:'Fixture only',claimIds:[]},{id:'path',scriptId:'line-2',layout:'path',title:'Technical path',subtitle:'Synthetic fixture',labels:['A','B','C','D'],sourceLabel:'Fixture only',claimIds:[]},{id:'closing',scriptId:'line-3',layout:'closing',title:'Closing',subtitle:'Synthetic fixture',labels:[],sourceLabel:'Fixture only',claimIds:[]}],references:[],authorization:{previewWidth:360,previewHeight:640,motionWidth:720,motionHeight:1280,motionScene:'path',motionAudioScriptId:'line-1',motionSeconds:7,maxPreviewAttempts:2,maxPaidUsd:0,audio:'temporary-local-sapi',fullProduction:false},origin:'agent-authored-graphics-not-target-execution'});}

test('canonical equality ignores object key order, binds existing fingerprints and never mutates input',()=>{
 const a=plan(),b={plan:structuredClone(a.plan),snapshotHash:a.snapshotHash},before=JSON.stringify([a,b]),d=diffRevisions('plan',a,b);
 expect(d).toMatchObject({schemaVersion:'revision-diff/1.0',identical:true,fromHash:sha256(canonical(a)),toHash:sha256(canonical(b)),changes:[],invalidation:{approvalGates:[],work:[],requiresIndependentReview:false},productionAuthorizationGranted:false,finalHumanAcceptance:'pending'});
 expect(JSON.stringify([a,b])).toBe(before);expect(d.changedIds.script!.modified).toEqual([]);
});

test('scene-local text diff reports exact field path, stable identity and conservative approval/work invalidation',()=>{
 const a=production(),b=structuredClone(a);b.scenes[1]!.title='Path clarification';const d=diffRevisions('production',a,b);
 expect(d.fromHash).toBe(sha256(canonical(a)));expect(d.toHash).toBe(sha256(canonical(b)));expect(d.changes).toEqual([{path:'/scenes/1/title',beforePresent:true,afterPresent:true,before:'Technical path',after:'Path clarification'}]);expect(d.changedIds.scenes!.modified).toEqual(['path']);expect(d.invalidation.approvalGates).toEqual(['G3','G4','G5','G6']);expect(d.invalidation.work).toContain('style');expect(d.invalidation.mediaReuse).toBe('not-proven-by-structural-diff');expect(d.productionAuthorizationGranted).toBe(false);
});

test('array reorder/add/remove preserves semantic scene IDs without pretending unchanged positions are unchanged scenes',()=>{
 const a=production(),reordered=structuredClone(a);reordered.scenes.reverse();const first=diffRevisions('production',a,reordered);expect(first.identical).toBe(false);expect(first.changedIds.scenes).toMatchObject({added:[],removed:[],modified:[],moved:['closing','opening'],beforeOrder:['opening','path','closing'],afterOrder:['closing','path','opening']});
 const added=structuredClone(a);added.scenes.push({...added.scenes[2]!,id:'extra',scriptId:'line-4'});expect(diffRevisions('production',a,added).changedIds.scenes!.added).toEqual(['extra']);
 const removed=diffRevisions('production',added,a);expect(removed.changedIds.scenes!.removed).toEqual(['extra']);expect(removed.changes.some(c=>c.path==='/scenes/3'&&c.beforePresent&&!c.afterPresent)).toBe(true);
});

test('plan facts/script/storyboard changes and source revision changes invalidate the full dependent chain',()=>{
 const a=plan(),b=structuredClone(a);b.plan.facts[0]!.statement='A revised statement, still only a structural fixture.';b.plan.script[0]!.caption='Revised caption';b.plan.storyboard[0]!.visual='A revised synthetic scene';b.snapshotHash='d'.repeat(64);b.plan.snapshotHash=b.snapshotHash;
 const d=diffRevisions('plan',a,b);expect(d.changedIds.facts!.modified).toEqual(['purpose']);expect(d.changedIds.script!.modified).toEqual(['line-1']);expect(d.changedIds.storyboard!.modified).toEqual(['scene-1']);expect(d.invalidation.approvalGates).toEqual(['G1','G2','G3','G4','G5','G6']);expect(d.invalidation.work).toContain('readthrough');expect(d.changes.some(c=>c.path==='/snapshotHash')).toBe(true);
});

test('unsupported versions, unknown keys, inconsistent envelope, cross-project and identity-normalizing inputs fail',()=>{
 const a=plan(),b=production();
 for(const bad of [{...a,extra:'unsupported'},{...a,plan:{...a.plan,schemaVersion:'2.0'}},{...a,snapshotHash:'e'.repeat(64)}])expect(()=>diffRevisions('plan',a,bad)).toThrow();
 expect(()=>diffRevisions('production',b,{...b,schemaVersion:'9.0'})).toThrow();expect(()=>diffRevisions('production',b,{...b,projectId:'other'})).toThrow('different projects');
 const normalized=structuredClone(b);normalized.scenes[0]!.title=' Opening ';expect(()=>diffRevisions('production',b,normalized)).toThrow('normalization');expect(()=>diffRevisions('other' as never,a,a)).toThrow('kind');
});

test('JSON byte/depth/numeric/cycle/sparse/accessor bounds fail explicitly before schema recursion',()=>{
 const a=plan();expect(()=>diffRevisions('plan',a,{oversized:'x'.repeat(DIFF_LIMITS.inputBytes)})).toThrow('4 MB');
 let nested:unknown={};for(let i=0;i<45;i++)nested={nested};expect(()=>diffRevisions('plan',a,nested)).toThrow('traversal limit');
 const cycle:Record<string,unknown>={};cycle.self=cycle;expect(()=>diffRevisions('plan',a,cycle)).toThrow('cycle');expect(()=>diffRevisions('plan',a,{number:Infinity})).toThrow('finite');expect(()=>diffRevisions('plan',a,Array(3))).toThrow('dense');
 let accessed=false;const getter={get nested(){accessed=true;return a;}};expect(()=>diffRevisions('plan',a,getter)).toThrow('data values');expect(accessed).toBe(false);
});

test('too many valid structural changes fail instead of truncating a successful diff',()=>{
 const a=plan(),b=plan();
 a.plan.facts=Array.from({length:60},(_,i)=>({id:i?'fact-'+i:'purpose',statement:'Before',kind:'documented' as const,limitations:'Before',evidence:Array.from({length:8},()=>({document:'before.md',startLine:1,endLine:1,quote:'Before'}))}));
 b.plan.facts=Array.from({length:60},(_,i)=>({id:i?'fact-'+i:'purpose',statement:'After',kind:'inference' as const,limitations:'After',evidence:Array.from({length:8},()=>({document:'after.md',startLine:2,endLine:2,quote:'After'}))}));
 expect(()=>diffRevisions('plan',a,b)).toThrow('change limit');
});

test('CLI helper reads/exports actual files without input or runtime-store mutation and refuses overwriting reports',async()=>{
 const dir=await area(),a=plan(),b=structuredClone(a);b.plan.script[0]!.caption='A changed fixture caption';const before=join(dir,'before.json'),after=join(dir,'after.json'),out=join(dir,'diff.json');await writeFile(before,JSON.stringify(a));await writeFile(after,JSON.stringify(b));const original=[await readFile(before,'utf8'),await readFile(after,'utf8')],cwd=process.cwd();
 try{process.chdir(dir);const result=await diffCommand(['diff'],{kind:'plan',before,after,out});expect(JSON.parse(await readFile(out,'utf8'))).toEqual(result);expect((await readdir(dir)).sort()).toEqual(['after.json','before.json','diff.json']);await expect(diffCommand(['diff'],{kind:'plan',before,after,out})).rejects.toMatchObject({code:'DIFF_EXPORT_EXISTS'});expect([await readFile(before,'utf8'),await readFile(after,'utf8')]).toEqual(original);expect(result.productionAuthorizationGranted).toBe(false);}finally{process.chdir(cwd);}
});

test('CLI helper rejects malformed/oversized/nonregular JSON, invalid options and extra positionals without creating output',async()=>{
 const dir=await area(),valid=join(dir,'valid.json'),bad=join(dir,'bad.json'),large=join(dir,'large.json'),out=join(dir,'out.json');await writeFile(valid,JSON.stringify(production()));await writeFile(bad,'{broken');await writeFile(large,' '.repeat(DIFF_LIMITS.inputBytes+1));
 await expect(diffCommand(['diff'],{kind:'production',before:bad,after:valid,out})).rejects.toMatchObject({code:'DIFF_INPUT'});await expect(diffCommand(['diff'],{kind:'production',before:large,after:valid,out})).rejects.toMatchObject({code:'DIFF_LIMIT'});await expect(diffCommand(['diff'],{kind:'production',before:dir,after:valid,out})).rejects.toMatchObject({code:'DIFF_INPUT'});await expect(diffCommand(['diff','extra'],{kind:'production',before:valid,after:valid})).rejects.toMatchObject({code:'USAGE'});await expect(diffCommand(['diff'],{kind:'wrong',before:valid,after:valid})).rejects.toMatchObject({code:'USAGE'});await expect(diffCommand(['diff'],{kind:'production',before:valid,after:valid,data:dir} as never)).rejects.toMatchObject({code:'USAGE'});expect(await readdir(dir)).not.toContain('out.json');
});

test('public CLI dispatch actually compares revisions, refuses overwrite/irrelevant flags and creates no runtime state',async()=>{
 const dir=await area(),a=production(),b=structuredClone(a);b.scenes[0]!.title='Revised opening';const before=join(dir,'before.json'),after=join(dir,'after.json'),out=join(dir,'report.json');await writeFile(before,JSON.stringify(a));await writeFile(after,JSON.stringify(b));
 const script=resolve('src/cli.ts'),loader=pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href;
 const run=(extra:string[])=>spawnSync(process.execPath,['--import',loader,script,'diff','--kind','production','--before',before,'--after',after,...extra],{cwd:dir,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1_000_000,env:{...process.env,GVE_DATA:join(dir,'must-not-exist')}});
 const okay=run(['--out',out]);expect(okay.error).toBeUndefined();expect(okay.status,okay.stderr).toBe(0);expect(JSON.parse(okay.stdout)).toMatchObject({schemaVersion:'revision-diff/1.0',identical:false,projectId:'demo',productionAuthorizationGranted:false});const report=await readFile(out,'utf8');
 const overwrite=run(['--out',out]);expect(overwrite.status).toBe(1);expect(JSON.parse(overwrite.stderr).error.code).toBe('DIFF_EXPORT_EXISTS');expect(await readFile(out,'utf8')).toBe(report);
 const irrelevant=run(['--data',join(dir,'other-state')]);expect(irrelevant.status).toBe(1);expect(JSON.parse(irrelevant.stderr).error.code).toBe('USAGE');expect((await readdir(dir)).sort()).toEqual(['after.json','before.json','report.json']);
});
