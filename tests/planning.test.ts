import {it,expect,vi} from 'vitest';
import {researchRepository, githubGetJson, type ReadonlyTransport} from '../src/providers/github-readonly.js';
import {RepositorySnapshotSchema} from '../src/contracts/planning.js';
import {sha256} from '../src/core/util.js';
const commit='a'.repeat(40);
const document=(path:string,content:string)=>({type:'file',path,encoding:'base64',size:Buffer.byteLength(content),content:Buffer.from(content).toString('base64')});
const transport=(requests:string[]):ReadonlyTransport=>async(url)=>{
  requests.push(url);
  if(url.endsWith('/repos/example/demo'))return{full_name:'example/demo',name:'demo',default_branch:'main',description:'A test repository',license:null};
  if(url.includes('/commits/'))return{sha:commit};
  if(url.includes('/readme?'))return document('README.md','# Demo\nSafe test documentation.');
  return document('docs/usage.md','This is documented behavior.');
};
it('pins all source requests to the resolved commit and hashes exact UTF-8 bytes',async()=>{
  const requests:string[]=[];
  const snapshot=await researchRepository('https://github.com/example/demo','main',['docs/usage.md'],transport(requests));
  expect(RepositorySnapshotSchema.parse(snapshot)).toEqual(snapshot);
  expect(snapshot.commit).toBe(commit);expect(snapshot.documents).toHaveLength(2);
  expect(snapshot.documents[0]!.sha256).toBe(sha256(snapshot.documents[0]!.content));
  expect(requests.slice(2).every((url)=>url.endsWith('?ref='+commit))).toBe(true);
  expect(snapshot.documents.every((d)=>d.url.includes('/blob/'+commit+'/'))).toBe(true);
  expect(snapshot.trust).toBe('untrusted-data-never-executed');
});
it.each(['http://github.com/example/demo','https://github.com.evil.test/example/demo','https://user:secret@github.com/example/demo','https://github.com/example/demo?token=x'])('rejects unsafe repository URL %s before network',async(url)=>{
  const requests:string[]=[];await expect(researchRepository(url,'main',[],transport(requests))).rejects.toMatchObject({code:'REPOSITORY_URL'});expect(requests).toEqual([]);
});
it('rejects traversal/code paths and excessive document counts before network',async()=>{
  for(const paths of [['../private.md'],['docs/../secret.md'],['run.exe'],Array.from({length:7},(_,i)=>`doc${i}.md`)]){
    const requests:string[]=[];await expect(researchRepository('https://github.com/example/demo','main',paths,transport(requests))).rejects.toThrow();expect(requests).toEqual([]);
  }
});
it('rejects foreign metadata, invalid commits, directories, oversized and malformed documents',async()=>{
  const cases=[{meta:{full_name:'other/repo',default_branch:'main'}},{commit:{sha:'main'}},{doc:{type:'dir'}},{doc:document('README.md','x'.repeat(200001))},{doc:{...document('README.md','x'),size:2}},{doc:document('../outside.md','x')}];
  for(const value of cases){
    const base=transport([]);const read:ReadonlyTransport=async(url)=>url.endsWith('/repos/example/demo')?(value.meta??base(url)):url.includes('/commits/')?(value.commit??base(url)):(value.doc??base(url));
    await expect(researchRepository('https://github.com/example/demo','main',[],read)).rejects.toThrow();
  }
});
it('bounds the transport to GitHub API read resources and rejects other hosts before fetch',async()=>{
  for(const url of ['https://127.0.0.1/private','https://api.github.com/user','https://user:password@api.github.com/repos/example/demo','https://api.github.com/repos/example/demo?access_token=x'])await expect(githubGetJson(url)).rejects.toMatchObject({code:'SOURCE_URL'});
});
it('enforces real response size/JSON bounds with an injected fetch transport',async()=>{
  const url='https://api.github.com/repos/example/demo';
  try{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('x'.repeat(1_200_001),{status:200})));await expect(githubGetJson(url)).rejects.toMatchObject({code:'SOURCE_SIZE',classification:'permanent'});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('not JSON',{status:200})));await expect(githubGetJson(url)).rejects.toMatchObject({code:'SOURCE_FORMAT'});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:503})));await expect(githubGetJson(url)).rejects.toMatchObject({code:'SOURCE_HTTP',classification:'retryable'});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:404})));await expect(githubGetJson(url)).rejects.toMatchObject({code:'SOURCE_HTTP',classification:'permanent'});
  }finally{vi.unstubAllGlobals();}
});
it('classifies network failures and caller cancellation and sets read-only bounded fetch options',async()=>{
  const url='https://api.github.com/repos/example/demo';
  try{
    const fetcher=vi.fn(async()=>{throw new Error('injected connection failure');});vi.stubGlobal('fetch',fetcher);await expect(githubGetJson(url)).rejects.toMatchObject({code:'SOURCE_NETWORK',classification:'retryable'});
    const options=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(options[1]).toMatchObject({method:'GET',redirect:'error'});expect(options[1].signal).toBeInstanceOf(AbortSignal);
    const controller=new AbortController();controller.abort();await expect(githubGetJson(url,controller.signal)).rejects.toMatchObject({code:'CANCELLED',classification:'cancelled'});
  }finally{vi.unstubAllGlobals();}
});
