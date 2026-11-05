import {it,expect,vi,afterEach} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonical,sha256} from '../src/core/util.js';
const mocks=vi.hoisted(()=>({capture:vi.fn(),run:vi.fn()}));
vi.mock('../src/workflow/explanation-session.js',()=>({captureNarrativeStart:mocks.capture}));
vi.mock('../src/workflow/narrative-run.js',()=>({runNarrativeWorkspace:mocks.run}));
import {expandNarrativeSource} from '../src/workflow/narrative-source-expand.js';
const roots:string[]=[];
afterEach(async()=>{vi.resetAllMocks();for(const root of roots.splice(0))await rm(root,{recursive:true,force:true,maxRetries:3});});
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'gve-expand-'));roots.push(root);const old=join(root,'original'),out=join(root,'expanded');await mkdir(old);
 const binding={repository:'https://github.com/example/demo',commit:'a'.repeat(40)},request={schemaVersion:'explanation-session-request/1.0',repository:binding.repository,ref:'HEAD',documents:['guide.md'],audience:'普通观众；具体叙事由会话Agent填写',language:'zh-CN',maxSeconds:60,voiceMode:'silent'};
 const source={schemaVersion:'repository-narrative-run-source/1.0',taskId:'b'.repeat(64),bindingSha256:sha256(canonical(binding))};
 for(const[name,value]of Object.entries({'workspace.json':{schemaVersion:'repository-narrative-workspace/1.0',repository:binding.repository},'request.json':request,'source.json':source}))await writeFile(join(old,name),canonical(value));
 mocks.capture.mockResolvedValue({manifest:{binding,request}});
 mocks.run.mockImplementation(async(repo,target)=>{await mkdir(target,{recursive:true});return{status:'awaiting-session-agent',source:{...source,taskId:'c'.repeat(64)},agentHandoff:{automaticModelDispatch:false}};});
 return{root,old,out,binding,request};
}
it('uses the verified full commit, retains original documents and never copies/rebinds old author data',async()=>{
 const f=await fixture(),before=await readFile(join(f.old,'request.json'));
 await mkdir(join(f.old,'author'));await writeFile(join(f.old,'author','story.json'),'TEST ONLY old claims');
 const result=await expandNarrativeSource(f.old,f.out,['extra.md'],['src/one.js'],new AbortController().signal);
 expect(mocks.run.mock.calls[0]!.slice(0,4)).toEqual([f.binding.repository,f.out,undefined,'planning']);
 expect(mocks.run.mock.calls[0]![6]).toEqual({ref:'a'.repeat(40),documents:['guide.md','extra.md'],sourcePaths:['src/one.js']});
 expect(result).toMatchObject({status:'awaiting-session-agent',approval:'none',modelCalls:0,sourceExpansion:{commit:'a'.repeat(40)}});
 expect(await readFile(join(f.old,'request.json'))).toEqual(before);expect(await readdir(f.out)).toEqual(['source-parent.json']);
 await expandNarrativeSource(f.old,f.out,['extra.md'],['src/one.js'],new AbortController().signal);
});
it('refuses overlapping workspaces, unsafe/deep/duplicate source requests and no-op expansion before a destination or network run',async()=>{
 const f=await fixture();
 for(const [out,docs,paths]of [[f.old,[],['x.js']],[join(f.old,'nested'),[],['x.js']],[f.root,[],['x.js']],[f.out,[],[]],[f.out,[],['../secret.js']],[f.out,[],['a/b/c/d/e.js']],[f.out,['same.md'],['same.md']],[f.out,['guide.md'],[]]] as [string,string[],string[]][])
  await expect(expandNarrativeSource(f.old,out,docs,paths,new AbortController().signal)).rejects.toThrow();
 expect(mocks.run).not.toHaveBeenCalled();expect(await readdir(f.root)).toEqual(['original']);
});
it('preserves existing fixed source paths when a later expansion adds another file',async()=>{
 const f=await fixture(),request={...f.request,schemaVersion:'explanation-session-request/1.2',ref:f.binding.commit,sourcePaths:['src/old.js']};
 await writeFile(join(f.old,'request.json'),canonical(request));mocks.capture.mockResolvedValue({manifest:{binding:f.binding,request}});
 await expandNarrativeSource(f.old,f.out,[],['src/new.ts'],new AbortController().signal);
 expect(mocks.run.mock.calls[0]![6]).toEqual({ref:f.binding.commit,documents:['guide.md'],sourcePaths:['src/old.js','src/new.ts']});
});
it('requires explicit deep opt-in and retains it when expanding a deep parent',async()=>{
 const f=await fixture(),deepPath='pkgs/core/src/helper/index.ts';
 await expect(expandNarrativeSource(f.old,f.out,[],[deepPath],new AbortController().signal)).rejects.toThrow();
 await expandNarrativeSource(f.old,f.out,[],[deepPath],new AbortController().signal,undefined,'deep');
 expect(mocks.run.mock.calls[0]![6]).toMatchObject({sourceDepth:'deep',sourcePaths:[deepPath]});
 const request={...f.request,schemaVersion:'explanation-session-request/1.5',sourceDepth:'deep',ref:f.binding.commit,sourcePaths:[deepPath]};
 await writeFile(join(f.old,'request.json'),canonical(request));mocks.capture.mockResolvedValue({manifest:{binding:f.binding,request}});
 await expandNarrativeSource(f.old,join(f.root,'next'),[],['src/extra.ts'],new AbortController().signal);
 expect(mocks.run.mock.calls[1]![6]).toMatchObject({sourceDepth:'deep',sourcePaths:[deepPath,'src/extra.ts']});
});
it('refuses changed original request, custom preferences and mismatched provenance without overwriting history',async()=>{
 const f=await fixture();
 await writeFile(join(f.old,'request.json'),canonical({...f.request,ref:'new-head'}));await expect(expandNarrativeSource(f.old,f.out,[],['x.js'],new AbortController().signal)).rejects.toThrow('binding');
 const custom={...f.request,audience:'Custom owner intent'};await writeFile(join(f.old,'request.json'),canonical(custom));mocks.capture.mockResolvedValue({manifest:{binding:f.binding,request:custom}});
 await expect(expandNarrativeSource(f.old,f.out,[],['x.js'],new AbortController().signal)).rejects.toThrow('preferences');
 await writeFile(join(f.old,'request.json'),canonical(f.request));mocks.capture.mockResolvedValue({manifest:{binding:f.binding,request:f.request}});
 await expandNarrativeSource(f.old,f.out,[],['x.js'],new AbortController().signal);await writeFile(join(f.out,'source-parent.json'),'unrelated');
 await expect(expandNarrativeSource(f.old,f.out,[],['x.js'],new AbortController().signal)).rejects.toThrow('provenance');expect(await readFile(join(f.out,'source-parent.json'),'utf8')).toBe('unrelated');
});
