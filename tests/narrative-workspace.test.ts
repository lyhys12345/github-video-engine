import {it,expect,vi,afterEach} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {canonical,sha256} from '../src/core/util.js';
const mocked=vi.hoisted(()=>({capture:vi.fn(),next:vi.fn()}));
vi.mock('../src/workflow/explanation-session.js',()=>({captureNarrativeStart:mocked.capture}));
vi.mock('../src/workflow/narrative-next-actions.js',()=>({explanationNextActions:mocked.next}));
import {recordNarrativeWorkspace,statusNarrativeWorkspace} from '../src/workflow/narrative-workspace.js';
const roots:string[]=[];
afterEach(async()=>{vi.resetAllMocks();for(const r of roots.splice(0))await rm(r,{recursive:true,force:true,maxRetries:3});});
async function fixture(movie=false){
 const root=await mkdtemp(join(tmpdir(),'gve-ws-'));roots.push(root);
 const binding={repository:'https://github.com/example/demo'},source={schemaVersion:'repository-narrative-run-source/1.0',taskId:'a'.repeat(64),bindingSha256:sha256(canonical(binding))};
 const candidate=join(root,'runs','b'.repeat(16)+'-'+ 'c'.repeat(12)),attempt=join(candidate,'attempts','d'.repeat(36)),author=join(root,'author-alternative');
 await mkdir(join(candidate,'author'),{recursive:true});await mkdir(attempt,{recursive:true});await mkdir(author);
 const files=[];for(const name of ['story.json','narrative.json','animation.json','run.json']){const b=Buffer.from(canonical({testOnly:name}));files.push({name,sha256:sha256(b),bytes:b.length});await writeFile(join(candidate,'author',name),b);await writeFile(join(author,name),b);}
 const authorSha256=sha256(canonical(files.map(f=>[f.name,f.sha256]).sort((a,b)=>a[0]!.localeCompare(b[0]!))));
 await writeFile(join(candidate,'author-manifest.json'),canonical({authorSha256,source,files}));
 await writeFile(join(root,'workspace.json'),canonical({schemaVersion:'repository-narrative-workspace/1.0',repository:binding.repository}));await writeFile(join(root,'source.json'),canonical(source));
 const bundle=join(candidate,'out','bundle');await mkdir(bundle,{recursive:true});await writeFile(join(bundle,'excerpt.mp4'),'TEST ONLY bytes, not a real movie');await writeFile(join(bundle,'index.html'),'TEST ONLY pending');
 const value={schemaVersion:'repository-narrative-run/1.0',status:movie?'editable-preview-complete':'checkpoint-complete',workspace:root,candidate,attempt,authorSha256,source,tasks:{narrative:'e'.repeat(64),...(movie?{narratedPreview:'f'.repeat(64)}:{})},details:movie?{movie:{output:{bundle}}}:{through:'planning'}};
 await writeFile(join(attempt,'result.json'),canonical(value));
 mocked.capture.mockResolvedValue({manifest:{binding}});mocked.next.mockResolvedValue({stage:'TEST ONLY verified checkpoint',approval:'none'});
 return{root,author,value,bundle};
}
it('records and recovers the actual nondefault author/checkpoint with exact trusted resume argv',async()=>{
 const f=await fixture();await recordNarrativeWorkspace(f.root,f.author,f.value);
 const s=await statusNarrativeWorkspace(f.root,new AbortController().signal);
 expect(s).toMatchObject({authorDirectory:f.author,authorState:'unchanged',task:'e'.repeat(64),modelCalls:0,actionsExecuted:0,approval:'none'});
 expect(s.resume).toEqual(['explanation','run','--repo','https://github.com/example/demo','--workspace',f.root,'--author',f.author,'--through','preview']);
 const approval=join(f.value.attempt,'script-review.json');
 await writeFile(approval,canonical({schemaVersion:'candidate-review/1.0',candidateSha256:f.value.authorSha256,stage:'script',
  ownerApprovedSha256:f.value.authorSha256,reviewer:'TEST ONLY',verdict:'PASS',coverage:'script',findings:[]}));
 expect((await statusNarrativeWorkspace(f.root,new AbortController().signal)).resume.slice(-2)).toEqual(['--review',approval]);
 await writeFile(join(f.author,'narrative.json'),'changed');
 const changed=await statusNarrativeWorkspace(f.root,new AbortController().signal);
 expect(changed.authorState).toBe('changed');expect(changed.resume).not.toContain('--review');
 await writeFile(join(f.value.candidate,'author','narrative.json'),'changed');await expect(statusNarrativeWorkspace(f.root,new AbortController().signal)).rejects.toThrow('snapshot');
});
it('publishes a stable last-completed-preview entry and refuses unrelated files',async()=>{
 const f=await fixture(true);const result=await recordNarrativeWorkspace(f.root,f.author,f.value);
 expect(result.preview).toBe(join(f.root,'workspace-preview.html'));
 const page=await readFile(result.preview!,'utf8');expect(page).toContain('Experimental preview');expect(page).toContain('pending');expect(page).toContain('excerpt.mp4');
 await writeFile(result.preview!,'user-owned page');await expect(recordNarrativeWorkspace(f.root,f.author,f.value)).rejects.toThrow('unrelated');expect(await readFile(result.preview!,'utf8')).toBe('user-owned page');
});
it('does not advance the current pointer when an unrelated preview entry blocks publication',async()=>{
 const f=await fixture(true);await writeFile(join(f.root,'workspace-preview.html'),'user-owned page');
 await expect(recordNarrativeWorkspace(f.root,f.author,f.value)).rejects.toThrow('unrelated');
 await expect(readFile(join(f.root,'current-run.json'))).rejects.toMatchObject({code:'ENOENT'});
});
it('rejects result tampering, path traversal and a repository/source mismatch',async()=>{
 const f=await fixture();await recordNarrativeWorkspace(f.root,f.author,f.value);const p=join(f.root,'current-run.json'),original=JSON.parse(await readFile(p,'utf8'));
 await writeFile(p,canonical({...original,result:'../secrets.json'}));await expect(statusNarrativeWorkspace(f.root,new AbortController().signal)).rejects.toThrow('relative checkpoint');
 await writeFile(p,canonical(original));await writeFile(join(f.value.attempt,'result.json'),'{}');await expect(statusNarrativeWorkspace(f.root,new AbortController().signal)).rejects.toThrow('hash');
 mocked.capture.mockResolvedValue({manifest:{binding:{repository:'https://github.com/other/repo'}}});await expect(statusNarrativeWorkspace(f.root,new AbortController().signal)).rejects.toThrow('captured source');
});
