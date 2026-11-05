import {createHash} from 'node:crypto';
import {it,expect,vi} from 'vitest';
import {captureRepositoryText,DeepTextCapturePath,TextCapturePath} from '../src/providers/github-readonly.js';
import {Request,StartInput} from '../src/workflow/explanation-contract.js';
import {sourceFixture} from './workflow-support.js';
const signal=new AbortController().signal;
function fixture(depth=8){
 const snapshot=sourceFixture(),content=Buffer.from('export const inert = true;\n'),blobSha=createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
 const parts=[...Array.from({length:depth-1},(_,i)=>'p'+i),'index.ts'],trees=parts.map((_,i)=>(i+1).toString(16).padStart(40,'0'));
 const responses:any={['commits/'+snapshot.commit]:{sha:snapshot.commit,tree:{sha:trees[0]}}};
 parts.forEach((part,i)=>responses['trees/'+trees[i]]={sha:trees[i],truncated:false,tree:[{path:part,mode:i===parts.length-1?'100644':'040000',type:i===parts.length-1?'blob':'tree',sha:i===parts.length-1?blobSha:trees[i+1]}]});
 responses['blobs/'+blobSha]={sha:blobSha,encoding:'base64',size:content.length,content:content.toString('base64')};
 const transport=vi.fn(async(url:string)=>responses[url.split('/git/')[1]!]);
 return{snapshot,parts,path:parts.join('/'),trees,blobSha,responses,transport};
}
it('deep capture is an explicit new request/profile; old requests and default transport still reject depth five',async()=>{
 const f=fixture(5),base={repository:f.snapshot.repository,ref:f.snapshot.commit,documents:[],audience:'TEST ONLY',language:'zh-CN',maxSeconds:60,voiceMode:'silent',sourcePaths:[f.path]};
 expect(TextCapturePath.safeParse(f.path).success).toBe(false);expect(DeepTextCapturePath.safeParse(f.path).success).toBe(true);
 expect(Request.safeParse({...base,schemaVersion:'explanation-session-request/1.2'}).success).toBe(false);
 const request=Request.parse({...base,schemaVersion:'explanation-session-request/1.5',sourceDepth:'deep'});
 expect(StartInput.safeParse({profile:'explanation-session/1.0',request,packetProfile:'explanation-author-packet/1.3',sourceCaptureProfile:'github-pinned-git-blob/1.0'}).success).toBe(false);
 expect(StartInput.safeParse({profile:'explanation-session/1.0',request,packetProfile:'explanation-author-packet/1.3',sourceCaptureProfile:'github-pinned-git-blob/1.1'}).success).toBe(true);
 await expect(captureRepositoryText(f.snapshot,[f.path],signal,f.transport)).rejects.toMatchObject({code:'SOURCE_PATH'});expect(f.transport).not.toHaveBeenCalled();
});
it('resolves all eight ordinary Git components and verifies exact blob bytes at the fixed commit',async()=>{
 const f=fixture();const r=await captureRepositoryText(f.snapshot,[f.path],signal,f.transport,'github-pinned-git-blob/1.1');
 expect(r.commit).toBe(f.snapshot.commit);expect(r.documents.at(-1)).toMatchObject({path:f.path,content:'export const inert = true;\n'});
 expect(f.transport).toHaveBeenCalledTimes(10);expect(f.transport.mock.calls.every(([u])=>/\/git\/(commits|trees|blobs)\/[a-f0-9]{40}$/.test(u))).toBe(true);
});
it('deep policy still refuses unsafe/nine-component paths, too many files and duplicates before network',async()=>{
 const f=fixture(9);for(const paths of [[f.path],['../x.ts'],['a/%2e%2e/x.ts'],['a\\b.ts'],['a/b.exe'],['x.ts','x.ts'],['a.ts','b.ts','c.ts','d.ts']])await expect(captureRepositoryText(f.snapshot,paths,signal,f.transport,'github-pinned-git-blob/1.1')).rejects.toMatchObject({code:'SOURCE_PATH'});
 expect(f.transport).not.toHaveBeenCalled();
});
it('deep traversal retains symlink/submodule, truncated-tree and blob-integrity refusals',async()=>{
 const f=fixture();const entry=f.responses['trees/'+f.trees[4]].tree[0];
 for(const [mode,type]of [['120000','blob'],['160000','commit']]){entry.mode=mode;entry.type=type;await expect(captureRepositoryText(f.snapshot,[f.path],signal,f.transport,'github-pinned-git-blob/1.1')).rejects.toMatchObject({code:'SOURCE_ENTRY'});}
 entry.mode='040000';entry.type='tree';f.responses['trees/'+f.trees[5]].truncated=true;
 await expect(captureRepositoryText(f.snapshot,[f.path],signal,f.transport,'github-pinned-git-blob/1.1')).rejects.toMatchObject({code:'SOURCE_TREE_TRUNCATED'});
 f.responses['trees/'+f.trees[5]].truncated=false;f.responses['blobs/'+f.blobSha].content=Buffer.from('wrong').toString('base64');
 await expect(captureRepositoryText(f.snapshot,[f.path],signal,f.transport,'github-pinned-git-blob/1.1')).rejects.toMatchObject({code:'SOURCE_INTEGRITY'});
});
it('deep policy keeps the existing per-file and total source byte budgets',async()=>{
 const f=fixture();f.responses['blobs/'+f.blobSha].size=200001;
 await expect(captureRepositoryText(f.snapshot,[f.path],signal,f.transport,'github-pinned-git-blob/1.1')).rejects.toMatchObject({code:'SOURCE_FORMAT'});
 const full={...f.snapshot,documents:[{...f.snapshot.documents[0]!,content:'x'.repeat(1200000)}]};f.transport.mockClear();
 await expect(captureRepositoryText(full,[f.path],signal,f.transport,'github-pinned-git-blob/1.1')).rejects.toMatchObject({code:'SOURCE_BUDGET'});expect(f.transport).not.toHaveBeenCalled();
});
