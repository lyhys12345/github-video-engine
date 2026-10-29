import {test,expect} from 'vitest';
import {readFile,writeFile,mkdir,readdir,lstat,symlink,unlink} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {exportFinalDelivery,type FinalDeliveryContext} from '../src/workflow/final-delivery.js';
import {canonical,sha256} from '../src/core/util.js';
import {projectRoot} from '../src/providers/local.js';
import {finalizationFixture,mockFinalReview} from './finalization-support.js';
import {command} from '../src/core/process.js';

async function fixture(){
 const f=await finalizationFixture();try{const prepared=await f.store.prepare('demo'),result=await f.store.run('demo',prepared.id,new AbortController().signal),revision=await f.base.store.workflow.revision('demo'),readthrough=await f.base.store.readMeasured(f.base.design);
  const context:FinalDeliveryContext={prepared:prepared.value,final:result.value,design:f.base.design,readthrough,plan:f.base.plan,source:revision.snapshot,usage:f.store.tasks.usage('demo'),artifacts:f.store.tasks.artifacts,reviewBundle:{mock:true,note:'MOCK provider/media export mechanics; not actual independent final review'}};
  return{f,context,full:result,out:join(f.base.root,'delivery')};
 }catch(e){await f.close();throw e;}
}
const exists=async(path:string)=>{try{await lstat(path);return true;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e;}};
async function manifest(path:string){return JSON.parse(await readFile(join(path,'delivery-manifest.json'),'utf8')) as {files:Array<{path:string;sha256:string;bytes:number}>;status:string;finalHumanAcceptance:string;deferredAv:boolean};}

test('atomic delivery exports real source/relative assets and exact manifest; media/providers explicitly MOCK',async()=>{
 const x=await fixture();try{
  const approvals=x.f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r})),result=await exportFinalDelivery(x.context,x.out),m=await manifest(x.out);
  expect(result).toMatchObject({cached:false,status:'FINAL_OWNER_REVIEW_PENDING',deferredAv:true,finalHumanAcceptance:'pending'});expect(m.files.length).toBeGreaterThan(40);
  for(const entry of m.files){expect(entry.path.startsWith('/')).toBe(false);expect(entry.path.includes('..')).toBe(false);const bytes=await readFile(join(x.out,entry.path));expect(bytes.length).toBe(entry.bytes);expect(sha256(bytes)).toBe(entry.sha256);}
  expect(sha256(await readFile(join(x.out,'master.mp4')))).toBe(x.context.final.master.sha256);
  const input=JSON.parse(await readFile(join(result.editableProject,'render-input.json'),'utf8'));expect(input.font.path).toBe('assets/fonts/NotoSansSC-Variable.ttf');expect(input.browser).toBe('LOCAL_BROWSER_SELECTED_BY_RUNNER');expect(input.design).toEqual(x.context.design);
  const runner=await readFile(join(result.editableProject,'render.mjs'),'utf8');expect(runner).toContain("from './src/final-renderer/render.js'");expect(runner).not.toContain(projectRoot);expect(runner).toContain('PROPOSED_LOCAL_EDIT_NOT_AUTOMATICALLY_APPROVED');
  await expect(command(process.execPath,['--check',join(result.editableProject,'render.mjs')])).resolves.toBe('');
  expect(await readFile(join(result.editableProject,'pnpm-lock.yaml'),'utf8')).toBe(await readFile('pnpm-lock.yaml','utf8'));expect(await readFile(join(result.editableProject,'.npmrc'),'utf8')).not.toContain('store-dir');expect(await exists(join(result.editableProject,'node_modules'))).toBe(false);
  for(const line of x.context.readthrough.lines)expect(sha256(await readFile(join(result.editableProject,'assets/audio',line.id+'.wav')))).toBe(line.audio.sha256);
  expect(sha256(await readFile(join(result.editableProject,'assets/fonts/NotoSansSC-Variable.ttf')))).toBe(x.context.prepared.font.font.sha256);expect(await readFile(join(result.editableProject,'assets/fonts/OFL.txt'),'utf8')).toContain('MOCK license');
  expect(m).toMatchObject({status:'FINAL_OWNER_REVIEW_PENDING',deferredAv:true,finalHumanAcceptance:'pending'});expect(x.f.base.store.db.prepare('SELECT * FROM production_approvals ORDER BY rowid').all().map(r=>({...r}))).toEqual(approvals);
 }finally{await x.f.close();}
});

test('same exact delivery is idempotent and verifies existing immutable files (MOCK media)',async()=>{
 const x=await fixture();try{const first=await exportFinalDelivery(x.context,x.out),before=await readFile(join(x.out,'delivery-manifest.json'));const second=await exportFinalDelivery(x.context,x.out);expect(second.cached).toBe(true);expect(second.manifestSha256).toBe(first.manifestSha256);expect(await readFile(join(x.out,'delivery-manifest.json'))).toEqual(before);expect((await readdir(x.f.base.root)).some(s=>s.startsWith('.gve-delivery-'))).toBe(false);}finally{await x.f.close();}
});

test('edited exported source or media is never overwritten on re-export (MOCK media)',async()=>{
 const x=await fixture();try{await exportFinalDelivery(x.context,x.out);const edited=join(x.out,'editable-project/render-input.json');await writeFile(edited,'USER EDIT; keep this file');await expect(exportFinalDelivery(x.context,x.out)).rejects.toMatchObject({code:'FINAL_EXPORT_CONFLICT'});expect(await readFile(edited,'utf8')).toBe('USER EDIT; keep this file');expect(sha256(await readFile(join(x.out,'master.mp4')))).toBe(x.context.final.master.sha256);}finally{await x.f.close();}
});

test('existing unrelated or partial output directories are preserved byte for byte',async()=>{
 const x=await fixture();try{await mkdir(x.out);await writeFile(join(x.out,'KEEP'),'unrelated user file');await expect(exportFinalDelivery(x.context,x.out)).rejects.toMatchObject({code:'FINAL_EXPORT_CONFLICT'});expect(await readdir(x.out)).toEqual(['KEEP']);expect(await readFile(join(x.out,'KEEP'),'utf8')).toBe('unrelated user file');}finally{await x.f.close();}
});

test('missing/corrupt CAS assets fail before output publication (MOCK media)',async()=>{
 const x=await fixture();try{const path=x.context.artifacts.path(x.context.final.master),before=await readFile(path);await writeFile(path,'MOCK corrupt committed bytes');try{await expect(exportFinalDelivery(x.context,x.out)).rejects.toThrow();expect(await exists(x.out)).toBe(false);expect((await readdir(x.f.base.root)).some(s=>s.startsWith('.gve-delivery-'))).toBe(false);}finally{await writeFile(path,before);}}finally{await x.f.close();}
});

test('inconsistent source/plan/diff-independent valid-hash evaluation targets fail binding',async()=>{
 const x=await fixture();try{
  const plan=structuredClone(x.context.plan);plan.brief.objective='Different unapproved objective';await expect(exportFinalDelivery({...x.context,plan},x.out)).rejects.toMatchObject({code:'FINAL_EXPORT_BINDING'});
  const old=await x.context.artifacts.readJson<any>(x.context.final.evaluation),wrong=await x.context.artifacts.commit(canonical({...old,targets:{...old.targets,master:'f'.repeat(64)}}),'application/json','VERIFY_MEDIA',x.context.final.packageHash);
  await expect(exportFinalDelivery({...x.context,final:{...x.context.final,evaluation:wrong}},x.out)).rejects.toMatchObject({code:'FINAL_EXPORT_BINDING'});expect(await exists(x.out)).toBe(false);
 }finally{await x.f.close();}
});

test('missing allowlisted source closure fails without a partial delivery (MOCK media)',async()=>{
 const x=await fixture();try{const sourceRoot=join(x.f.base.root,'empty-source');await mkdir(sourceRoot);await expect(exportFinalDelivery(x.context,x.out,{sourceRoot})).rejects.toThrow();expect(await exists(x.out)).toBe(false);expect((await readdir(x.f.base.root)).some(s=>s.startsWith('.gve-delivery-'))).toBe(false);}finally{await x.f.close();}
});

test('destination ancestor junction and source-closure junction are rejected without following writes',async()=>{
 const x=await fixture();let destinationLink:string|undefined,sourceLink:string|undefined;try{
  const outside=join(x.f.base.root,'owned-outside');await mkdir(outside);await writeFile(join(outside,'KEEP'),'retain');const destinationCandidate=join(x.f.base.root,'destination-junction');await symlink(outside,destinationCandidate,'junction');destinationLink=destinationCandidate;
  await expect(exportFinalDelivery(x.context,join(destinationLink,'delivery'))).rejects.toMatchObject({code:'FINAL_EXPORT_PATH'});expect(await readdir(outside)).toEqual(['KEEP']);
  const sourceRoot=join(x.f.base.root,'linked-source');await mkdir(join(sourceRoot,'src'),{recursive:true});const sourceCandidate=join(sourceRoot,'src/final-renderer');await symlink(join(projectRoot,'src/final-renderer'),sourceCandidate,'junction');sourceLink=sourceCandidate;
  await expect(exportFinalDelivery(x.context,x.out,{sourceRoot})).rejects.toMatchObject({code:'FINAL_EXPORT_PATH'});expect(await exists(x.out)).toBe(false);
 }finally{try{if(destinationLink)await unlink(destinationLink);if(sourceLink)await unlink(sourceLink);}finally{await x.f.close();}}
});

test('concurrent identical exports publish one complete directory and clean owned staging only (MOCK media)',async()=>{
 const x=await fixture();try{const results=await Promise.all([exportFinalDelivery(x.context,x.out),exportFinalDelivery(x.context,x.out)]);expect(results.map(r=>r.cached).sort()).toEqual([false,true]);expect(results[0]!.manifestSha256).toBe(results[1]!.manifestSha256);const m=await manifest(x.out);for(const e of m.files)expect(sha256(await readFile(join(x.out,e.path)))).toBe(e.sha256);expect((await readdir(x.f.base.root)).filter(p=>p.startsWith('.gve-delivery-'))).toEqual([]);}finally{await x.f.close();}
});

test('engineering lock requires exact full-render task provenance and records it in delivered manifests (MOCK Judge/media)',async()=>{
 const x=await fixture();try{
  const reviews=await mockFinalReview(x.f,x.full),lock=await x.f.store.lock('demo',x.full.id,reviews.candidatePath,reviews.rulesPath,reviews.delegationPath);
  const locked={...x.context,engineeringLock:lock.value,reviewBundle:lock.value.reviewBundle};
  await expect(exportFinalDelivery(locked,x.out)).rejects.toMatchObject({code:'FINAL_EXPORT_BINDING'});
  await expect(exportFinalDelivery({...locked,fullTaskId:'f'.repeat(64)},x.out)).rejects.toMatchObject({code:'FINAL_EXPORT_BINDING'});
  await expect(exportFinalDelivery({...locked,fullTaskId:'not-a-task-hash'},x.out)).rejects.toMatchObject({code:'FINAL_EXPORT_BINDING'});
  expect(await exists(x.out)).toBe(false);
  const delivered=await exportFinalDelivery({...locked,fullTaskId:x.full.id},x.out),m=await manifest(x.out),versions=JSON.parse(await readFile(join(x.out,'versions.json'),'utf8'));
  expect(m).toMatchObject({fullTaskId:x.full.id,engineeringLock:true,finalHumanAcceptance:'pending'});expect(versions.fullTaskId).toBe(x.full.id);
  expect(JSON.parse(await readFile(join(x.out,'authority/engineering-picture-lock.json'),'utf8')).fullTaskId).toBe(x.full.id);
  expect((await exportFinalDelivery({...locked,fullTaskId:x.full.id},x.out)).manifestSha256).toBe(delivered.manifestSha256);
 }finally{await x.f.close();}
});
