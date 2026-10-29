import {RepositorySnapshotSchema, RepositoryUrl, type RepositorySnapshot} from '../contracts/planning.js';
import {EngineError} from '../core/errors.js';
import {sha256} from '../core/util.js';

export type ReadonlyTransport = (url: string, signal?: AbortSignal) => Promise<unknown>;
export async function githubGetJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.protocol!=='https:' || parsed.hostname!=='api.github.com' || parsed.port || parsed.username || parsed.password || !/^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/(?:commits\/[^/]+|readme|contents\/[A-Za-z0-9_.%/-]+))?$/.test(parsed.pathname) || [...parsed.searchParams.keys()].some((key)=>key!=='ref')) throw new EngineError('SOURCE_URL','Only constructed public GitHub repository API requests are allowed');
  let response:Response;
  try {response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(15_000),...(signal?[signal]:[])]),headers:{Accept:'application/vnd.github+json','User-Agent':'github-video-engine-readonly/0.1','X-GitHub-Api-Version':'2022-11-28'}});}
  catch(error){throw signal?.aborted?new EngineError('CANCELLED','Source request cancelled','cancelled'):new EngineError('SOURCE_NETWORK',`GitHub request failed: ${String(error)}`,'retryable');}
  if (!response.ok) {await response.body?.cancel().catch(()=>{});throw new EngineError('SOURCE_HTTP',`GitHub returned ${response.status} for ${parsed.pathname}`,response.status===429||response.status>=500?'retryable':'permanent');}
  const reader = response.body?.getReader();
  if (!reader) throw new EngineError('SOURCE_EMPTY','GitHub returned no response body');
  const chunks: Uint8Array[]=[]; let bytes=0;
  try { while(true) { const chunk=await reader.read(); if(chunk.done)break; bytes+=chunk.value.length; if(bytes>1_200_000)throw new EngineError('SOURCE_SIZE','GitHub response exceeds 1.2 MB limit'); chunks.push(chunk.value); } }
  catch(error) { await reader.cancel().catch(()=>{}); if(error instanceof EngineError)throw error;throw signal?.aborted?new EngineError('CANCELLED','Source request cancelled','cancelled'):new EngineError('SOURCE_NETWORK',`GitHub response stream failed: ${String(error)}`,'retryable'); }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new EngineError('SOURCE_FORMAT','GitHub did not return valid JSON'); }
}

export async function researchRepository(repository: string, requestedRef='HEAD', extraDocuments: string[]=[], transport: ReadonlyTransport=githubGetJson, signal?: AbortSignal): Promise<RepositorySnapshot> {
  const parsed=RepositoryUrl.safeParse(repository.replace(/\.git$/,''));
  if(!parsed.success)throw new EngineError('REPOSITORY_URL','Expected https://github.com/owner/repository with no credentials, query or fragment');
  if(!/^[A-Za-z0-9_./-]{1,160}$/.test(requestedRef)||requestedRef.includes('..'))throw new EngineError('SOURCE_REF','Invalid repository ref');
  if(extraDocuments.length>6)throw new EngineError('SOURCE_COUNT','At most six extra documents are allowed');
  for(const path of extraDocuments) if(!/^[A-Za-z0-9_.\/-]{1,160}\.(md|txt)$/i.test(path)||path.split('/').some((p)=>!p||p==='.'||p==='..'))throw new EngineError('SOURCE_PATH','Only safe relative Markdown/text document paths are allowed');
  const [,owner,name]=new URL(parsed.data).pathname.split('/');
  const base=`https://api.github.com/repos/${owner}/${name}`;
  const meta=await transport(base,signal) as {full_name?:unknown;name?:unknown;description?:unknown;default_branch?:unknown;license?:{spdx_id?:unknown}|null};
  if(typeof meta?.full_name!=='string'||meta.full_name.toLowerCase()!==`${owner}/${name}`.toLowerCase()||typeof meta.default_branch!=='string')throw new EngineError('SOURCE_FORMAT','Repository metadata identity or branch is invalid');
  const commitResult=await transport(base+'/commits/'+encodeURIComponent(requestedRef),signal) as {sha?:unknown};
  if(typeof commitResult?.sha!=='string'||!/^[a-f0-9]{40}$/.test(commitResult.sha))throw new EngineError('SOURCE_FORMAT','GitHub did not resolve a full commit SHA');
  const commit=commitResult.sha;
  const documents: RepositorySnapshot['documents']=[];
  const addDocument=(value:unknown)=>{
    const doc=value as {type?:unknown;path?:unknown;encoding?:unknown;content?:unknown;size?:unknown};
    if(!doc||doc.type!=='file'||typeof doc.path!=='string'||!/^[A-Za-z0-9_.\/-]{1,200}$/.test(doc.path)||doc.path.split('/').some((p)=>!p||p==='.'||p==='..')||doc.encoding!=='base64'||typeof doc.content!=='string'||typeof doc.size!=='number'||doc.size<1||doc.size>200_000)throw new EngineError('SOURCE_DOCUMENT','Expected a bounded, nonempty UTF-8 document file');
    const bytes=Buffer.from(doc.content.replace(/\s/g,''),'base64');
    if(bytes.length!==doc.size||bytes.length>200_000)throw new EngineError('SOURCE_SIZE','Document bytes do not match declared size');
    let content: string;
    try {content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);} catch {throw new EngineError('SOURCE_ENCODING','Source document is not UTF-8 text');}
    if(!documents.some((d)=>d.path===doc.path))documents.push({path:doc.path,url:`${parsed.data}/blob/${commit}/${doc.path.split('/').map(encodeURIComponent).join('/')}`,sha256:sha256(bytes),content});
  };
  addDocument(await transport(base+'/readme?ref='+commit,signal));
  if(meta.license) {
    try {addDocument(await transport(base+'/contents/LICENSE?ref='+commit,signal));}
    catch(error) {if(!(error instanceof EngineError&&error.code==='SOURCE_HTTP'&&error.message.includes(' 404 ')))throw error;}
  }
  for(const path of [...new Set(extraDocuments)])addDocument(await transport(base+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+commit,signal));
  return RepositorySnapshotSchema.parse({schemaVersion:'1.0',repository:parsed.data,commit,name:typeof meta.name==='string'?meta.name:name!,description:typeof meta.description==='string'?meta.description:'',defaultBranch:meta.default_branch,license:typeof meta.license?.spdx_id==='string'?meta.license.spdx_id:null,fetchedAt:new Date().toISOString(),documents,trust:'untrusted-data-never-executed'});
}
