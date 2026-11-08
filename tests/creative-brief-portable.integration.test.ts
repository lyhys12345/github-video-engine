import {it,expect} from 'vitest';
import {cp,mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {exportNarrativeProject,importNarrativeProject} from '../src/workflow/project-portable.js';
import {readNarrativeAuthorData} from '../src/workflow/narrative-run.js';
import {canonical,sha256} from '../src/core/util.js';
// Opt-in: reuse a real completed local narrated workspace. This test creates no media.
it.skipIf(!process.env.GVE_PORTABLE_FIXTURE)('exports and imports a real preview with brief bytes and author identity intact',async()=>{
 const original=resolve(process.env.GVE_PORTABLE_FIXTURE!),pointer=JSON.parse(await readFile(join(original,'current-run.json'),'utf8')),result=JSON.parse(await readFile(join(original,pointer.result),'utf8'));
 expect(result.status).toBe('editable-preview-complete');
 const originalPointer=await readFile(join(original,'current-run.json')),root=await mkdtemp(join(tmpdir(),'gve-bp-')),workspace=join(root,'w'),pack=join(root,'p'),restored=join(root,'r');await mkdir(workspace);
 for(const file of ['workspace.json','request.json','source.json'])await cp(join(original,file),join(workspace,file));
 await cp(join(original,'state'),join(workspace,'state'),{recursive:true});await cp(pointer.authorDirectory,join(workspace,'author'),{recursive:true});
 // A newly proposed brief is a test input, never retroactive media approval.
 const brief={schemaVersion:'creative-brief/1.0',duration:{mode:'max',maxSeconds:300},style:'TEST ONLY preservation check',audience:'TEST ONLY',platforms:['TikTok'],language:'zh-CN',voice:{mode:'undecided'},decision:'proposed',notes:['No approval, voice or creative quality claim']};
 await writeFile(join(workspace,'author/creative-brief.json'),canonical(brief));await writeFile(join(workspace,'project.json'),canonical({currentTask:result.tasks.narratedPreview,author:'author'}));
 const before=await readNarrativeAuthorData(join(workspace,'author')),signal=new AbortController().signal;
 const exported=await exportNarrativeProject(workspace,pack,signal);const manifest=JSON.parse(await readFile(join(pack,'portable-project.json'),'utf8'));expect(manifest.authorSha256).toBe(before.hash);expect(manifest.files.some((f:any)=>f.path==='author/creative-brief.json')).toBe(true);
 const imported=await importNarrativeProject(pack,exported.digest,restored,signal);expect(imported.resumable).toBe(true);const after=await readNarrativeAuthorData(join(restored,'author'));expect(after.hash).toBe(before.hash);expect(after.files.get('creative-brief.json')).toEqual(before.files.get('creative-brief.json'));
 expect(imported.previewTaskId).toBe(result.tasks.narratedPreview);expect(await readFile(join(original,'current-run.json'))).toEqual(originalPointer);
 const report={schemaVersion:'creative-brief-portable-check/1.0',source:original,originalPointerSha256:sha256(originalPointer),workspace,package:pack,restored,digest:exported.digest,authorSha256:before.hash,previewTaskId:imported.previewTaskId,files:exported.files,mediaGenerated:false,voiceSynthesized:false,approval:'none'};await writeFile(join(root,'result.json'),canonical(report));console.log('Portable brief evidence: '+join(root,'result.json'));
},120000);
