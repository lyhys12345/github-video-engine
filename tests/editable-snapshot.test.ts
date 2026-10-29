import {test,expect} from 'vitest';
import {readFile,writeFile,mkdir,lstat,readdir} from 'node:fs/promises';
import {join,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {exportFinalDelivery,type FinalDeliveryContext} from '../src/workflow/final-delivery.js';
import {finalizationFixture} from './finalization-support.js';
import {sha256} from '../src/core/util.js';

async function fixture(){
 const f=await finalizationFixture();try{const prepared=await f.store.prepare('demo'),full=await f.store.run('demo',prepared.id,new AbortController().signal),revision=await f.base.store.workflow.revision('demo'),readthrough=await f.base.store.readMeasured(f.base.design);
  const context:FinalDeliveryContext={prepared:prepared.value,final:full.value,design:f.base.design,readthrough,plan:f.base.plan,source:revision.snapshot,usage:f.store.tasks.usage('demo'),artifacts:f.store.tasks.artifacts};
  const delivery=await exportFinalDelivery(context,join(f.base.root,'snapshot-delivery'));return{f,delivery};
 }catch(e){await f.close();throw e;}
}
// These replacements are explicit MOCK media/rendering only. The exported runner, Node process,
// mutable source files, hashes, binary snapshots and publication/cleanup are actual.
async function mockMediaModules(root:string){
 await writeFile(join(root,'src/providers/local.js'),"export async function browserPath(){return 'MOCK_BROWSER_NOT_EXECUTED';}\n");
 await writeFile(join(root,'src/final-renderer/owned-runtime.js'),"export async function cleanupOwnedRuntimeTmp(){/* MOCK renderer allocates no browser/runtime. */}\n");
 await writeFile(join(root,'src/final-renderer/render.js'),`import{readFile,writeFile,mkdir}from'node:fs/promises';import{join,resolve,dirname}from'node:path';import{fileURLToPath}from'node:url';
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
 export async function renderFinal(input,directory){const map=JSON.parse(await readFile(join(root,'assets-map.json'),'utf8'));for(const line of map.lines)await writeFile(join(root,line.path),'MUTATED AUDIO WHILE MOCK RENDER IS IN FLIGHT');await writeFile(join(root,'render-input.json'),JSON.stringify({changedWhileRendering:true}));await writeFile(join(root,'assets-map.json'),JSON.stringify({changedWhileRendering:true}));await mkdir(directory,{recursive:true});const clean=join(directory,'clean.mp4'),captioned=join(directory,'captioned.mp4'),cover=join(directory,'cover.png');for(const file of[clean,captioned,cover])await writeFile(file,'MOCK MEDIA: NOT A REAL VIDEO/IMAGE');return{clean,captioned,cover,fps:30,frames:900};}\n`);
 await writeFile(join(root,'src/renderer/final-finishing.js'),`import{readFile,writeFile,mkdir}from'node:fs/promises';import{join}from'node:path';import{createHash}from'node:crypto';
 export async function finishFinal(input,directory){await mkdir(directory,{recursive:true});const observed=[];for(const line of input.lines){const bytes=await readFile(line.audioPath);observed.push({id:line.id,path:line.audioPath,sha256:createHash('sha256').update(bytes).digest('hex'),text:bytes.toString('utf8')});}await writeFile(join(directory,'observed-audio.json'),JSON.stringify(observed));const result={evaluation:{mock:true,note:'MOCK finish; no media-quality claim'}};for(const[key,file]of[['masterPath','master.mp4'],['captionedPath','captioned.mp4'],['narrationPath','narration.wav'],['srtPath','captions.srt'],['vttPath','captions.vtt']]){result[key]=join(directory,file);await writeFile(result[key],'MOCK FINISH: NOT REAL MEDIA');}return result;}\n`);
}
test('exported runner binds initial input/map and immutable audio snapshot despite later editable-file changes (MOCK media; actual Node/files)',async()=>{
 const x=await fixture();try{const root=x.delivery.editableProject,input=await readFile(join(root,'render-input.json')),map=await readFile(join(root,'assets-map.json')),assets=JSON.parse(map.toString());await mockMediaModules(root);
  const run=spawnSync(process.execPath,[join(root,'render.mjs'),'--out','snapshot-proposal'],{cwd:root,encoding:'utf8',windowsHide:true});expect(run.status,run.stderr).toBe(0);const out=join(root,'snapshot-proposal'),provenance=JSON.parse(await readFile(join(out,'provenance.json'),'utf8')),audio=JSON.parse(await readFile(join(out,'finish/observed-audio.json'),'utf8'));
  const observation={mockedMedia:true,actualNodeProcess:true,code:run.status,sourceInputBefore:sha256(input),sourceInputAfter:sha256(await readFile(join(root,'render-input.json'))),sourceMapBefore:sha256(map),sourceMapAfter:sha256(await readFile(join(root,'assets-map.json'))),provenance,audio};
  await mkdir('work',{recursive:true});await writeFile('work/editable-snapshot-observation.json',JSON.stringify(observation,null,2));
  expect(provenance.sourceInputSha256).toBe(sha256(input));expect(provenance.assetsMapSha256).toBe(sha256(map));expect(await readFile(join(out,'render-input.snapshot.json'))).toEqual(input);expect(await readFile(join(out,'assets-map.snapshot.json'))).toEqual(map);
  expect(audio.map((a:any)=>a.sha256)).toEqual(assets.lines.map((a:any)=>a.sha256));for(const a of audio){expect(basename(dirname(a.path))).toBe('audio');expect(basename(dirname(dirname(a.path))).startsWith('.gve-proposal-')).toBe(true);expect(sha256(await readFile(join(out,'audio',basename(a.path))))).toBe(a.sha256);}
  expect(provenance).toMatchObject({status:'PROPOSED_LOCAL_EDIT_NOT_AUTOMATICALLY_APPROVED',deferredAv:true,finalHumanAcceptance:'pending'});
 }finally{await x.f.close();}
});
test('an edited voice asset is rejected before mocked rendering or output publication',async()=>{
 const x=await fixture();try{const root=x.delivery.editableProject,map=JSON.parse(await readFile(join(root,'assets-map.json'),'utf8'));await mockMediaModules(root);await writeFile(join(root,map.lines[0].path),'UNBOUND EDITED AUDIO');const run=spawnSync(process.execPath,[join(root,'render.mjs'),'--out','rejected-proposal'],{cwd:root,encoding:'utf8',windowsHide:true});expect(run.status).not.toBe(0);expect(run.stderr).toContain('Project asset hash mismatch');await expect(lstat(join(root,'rejected-proposal'))).rejects.toMatchObject({code:'ENOENT'});expect((await readdir(root)).some(p=>p.startsWith('.gve-proposal-'))).toBe(false);
 }finally{await x.f.close();}
});
