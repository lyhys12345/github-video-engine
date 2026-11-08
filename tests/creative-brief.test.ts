import {expect,it} from 'vitest';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CreativeBrief,assessCreativeBrief,checkBriefDuration,creativeMediaBlockers} from '../src/workflow/creative-brief.js';
import {readNarrativeAuthorData} from '../src/workflow/narrative-run.js';
import {candidateReviewDecision} from '../src/workflow/candidate-review.js';
const brief={schemaVersion:'creative-brief/1.0',duration:{mode:'range',minSeconds:30,maxSeconds:90},style:'真实演示优先',audience:'普通观众',platforms:['小红书','TikTok'],language:'zh-CN',voice:{mode:'local',profile:'chen-local'},decision:'user-specified',notes:[]};
it('validates limits, unknown versions and contradictory duration instead of coercing preferences',()=>{
 expect(assessCreativeBrief(brief).status).toBe('ready-for-planning');
 for(const input of [{...brief,schemaVersion:'creative-brief/9.0'},{...brief,duration:{mode:'max',maxSeconds:301}},{...brief,duration:{mode:'range',minSeconds:91,maxSeconds:90}}])expect(CreativeBrief.safeParse(input).success).toBe(false);
 const parsed=CreativeBrief.parse(brief);expect(()=>checkBriefDuration(parsed,29)).toThrow('violates');expect(()=>checkBriefDuration(parsed,91)).toThrow('violates');expect(()=>checkBriefDuration(parsed,60)).not.toThrow();
});
it('separates clarification, capability and approval without silently substituting voices',()=>{
 expect(assessCreativeBrief({...brief,decision:'proposed'}).status).toBe('needs-clarification');
 expect(assessCreativeBrief({...brief,voice:{mode:'reference',reference:'owned.wav',rightsConfirmed:false}}).clarifications).toHaveLength(1);
 expect(assessCreativeBrief({...brief,voice:{mode:'byo-api',provider:'example',paidAuthorized:false}}).clarifications).toHaveLength(1);
 expect(creativeMediaBlockers(CreativeBrief.parse(brief),'chen-local')).toEqual([]);
 expect(creativeMediaBlockers(CreativeBrief.parse(brief),'windows-huihui').join()).toContain('differs');
 for(const voice of [{mode:'none'},{mode:'reference',reference:'owned.wav',rightsConfirmed:true},{mode:'byo-api',provider:'example',paidAuthorized:true}])expect(creativeMediaBlockers(CreativeBrief.parse({...brief,voice}),'chen-local').join()).toContain('needs an adapter');
});
it('persists canonical brief through real CLI and refuses overwriting saved choices',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gve-brief-')),input=join(root,'input.json'),output=join(root,'creative-brief.json');await writeFile(input,JSON.stringify(brief));
 const args=['--import','tsx','src/cli.ts','explanation','brief-check','--spec',input,'--out',output];
 const result=JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8'}));expect(result.status).toBe('ready-for-planning');expect(JSON.parse(await readFile(output,'utf8'))).toEqual(brief);
 expect(()=>execFileSync(process.execPath,args,{stdio:'pipe'})).toThrow();expect(JSON.parse(await readFile(output,'utf8'))).toEqual(brief);
});
it('brief changes invalidate exact script approval and removal cannot reuse the prior author hash',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gve-brief-hash-')),author=join(root,'author');await mkdir(author);
 for(const name of ['story.json','narrative.json','animation.json','run.json'])await writeFile(join(author,name),JSON.stringify(name==='run.json'?{schemaVersion:'repository-narrative-run-author/2.0'}:{}));
 const legacy=await readNarrativeAuthorData(author);await writeFile(join(author,'creative-brief.json'),JSON.stringify(brief));const first=await readNarrativeAuthorData(author);expect(first.hash).not.toBe(legacy.hash);
 const receipt={schemaVersion:'candidate-review/1.0',candidateSha256:first.hash,ownerApprovedSha256:first.hash,stage:'script',reviewer:'independent',verdict:'PASS',coverage:'script',findings:[]};
 await writeFile(join(author,'creative-brief.json'),JSON.stringify({...brief,style:'技术解析'}));const revised=await readNarrativeAuthorData(author);expect(()=>candidateReviewDecision(receipt,revised.hash!,'script')).toThrow('another candidate');
});

it('portable manifests preserve the optional brief while rejecting arbitrary author files',async()=>{
 const {PortableProjectManifest}=await import('../src/workflow/project-portable.js');
 const base={schemaVersion:'portable-narrative-project/1.0',trust:'controlled-engine-export-only; hashes are integrity, not publisher authentication',repository:'https://github.com/example/demo',sourceTaskId:'a'.repeat(64),bindingSha256:'b'.repeat(64),previewTaskId:'c'.repeat(64),authorSha256:'d'.repeat(64),profile:'complete-technical-preview/1.0',facts:'pending'};
 const paths=['workspace.json','request.json','source.json','author/story.json','author/narrative.json','author/animation.json','author/run.json','state/tasks-rows.json','state/tts-rows.json','author/creative-brief.json'];
 const files=paths.map(path=>({path,sha256:'e'.repeat(64),bytes:10}));expect(PortableProjectManifest.safeParse({...base,files}).success).toBe(true);
 expect(PortableProjectManifest.safeParse({...base,files:[...files,{path:'author/execute.js',sha256:'e'.repeat(64),bytes:10}]}).success).toBe(false);
});
