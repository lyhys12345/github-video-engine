import {createHash} from 'node:crypto';
import {z} from 'zod';
import {RepositorySnapshotSchema, RepositoryUrl, type RepositorySnapshot} from '../contracts/planning.js';
import {checkAbort, EngineError} from '../core/errors.js';
import {sha256} from '../core/util.js';

export type ReadonlyTransport = (url: string, signal?: AbortSignal) => Promise<unknown>;
export async function githubGetJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const parsed = new URL(url);
  if (parsed.protocol!=='https:' || parsed.hostname!=='api.github.com' || parsed.port || parsed.username || parsed.password || !/^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/(?:commits\/[^/]+|readme|contents\/[A-Za-z0-9_.%/-]+|git\/(?:commits|trees|blobs)\/[a-f0-9]{40}))?$/.test(parsed.pathname) || [...parsed.searchParams.keys()].some((key)=>key!=='ref')) throw new EngineError('SOURCE_URL','Only constructed public GitHub repository API requests are allowed');
  let response:Response;
  try {response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(15_000),...(signal?[signal]:[])]),headers:{Accept:'application/vnd.github+json','User-Agent':'github-video-engine-readonly/0.1','X-GitHub-Api-Version':'2022-11-28'}});}
  catch(error){throw signal?.aborted?new EngineError('CANCELLED','Source request cancelled','cancelled'):new EngineError('SOURCE_NETWORK',`GitHub request failed: ${String(error)}`,'retryable');}
  if (!response.ok) {
    await response.body?.cancel().catch(()=>{});
    if (response.status===429 || (response.status===403 &&
        (response.headers.get('x-ratelimit-remaining')==='0' || response.headers.has('retry-after')))) {
      throw new EngineError('SOURCE_RATE_LIMIT','Public GitHub API rate limit reached. Retry after the limit resets','retryable');
    }
    throw new EngineError('SOURCE_HTTP',`GitHub returned ${response.status} for ${parsed.pathname}`,response.status>=500?'retryable':'permanent');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new EngineError('SOURCE_EMPTY','GitHub returned no response body');
  const chunks: Uint8Array[]=[]; let bytes=0;
  try { while(true) { const chunk=await reader.read(); if(chunk.done)break; bytes+=chunk.value.length; if(bytes>1_200_000)throw new EngineError('SOURCE_SIZE','GitHub response exceeds 1.2 MB limit'); chunks.push(chunk.value); } }
  catch(error) { await reader.cancel().catch(()=>{}); if(error instanceof EngineError)throw error;throw signal?.aborted?new EngineError('CANCELLED','Source request cancelled','cancelled'):new EngineError('SOURCE_NETWORK',`GitHub response stream failed: ${String(error)}`,'retryable'); }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new EngineError('SOURCE_FORMAT','GitHub did not return valid JSON'); }
}

export const TextCaptureLimits = {filesPerRequest: 3, totalFiles: 8, pathComponents: 4, fileBytes: 200_000, totalBytes: 1_200_000} as const;
export const TextCapturePath = z.string().max(160)
  .regex(/^[A-Za-z0-9_.\/-]+\.(?:md|txt|js|mjs|cjs|ts|tsx|jsx|py|rs|go|json)$/i)
  .refine(path => {
    const parts = path.split('/');
    return parts.length <= TextCaptureLimits.pathComponents && parts.every(part => part && part !== '.' && part !== '..');
  });
export const DeepTextCaptureLimits={...TextCaptureLimits,pathComponents:8} as const;
export const DeepTextCapturePath=z.string().max(160)
 .regex(/^[A-Za-z0-9_.\/-]+\.(?:md|txt|js|mjs|cjs|ts|tsx|jsx|py|rs|go|json)$/i)
 .refine(path=>{const parts=path.split('/');return parts.length<=DeepTextCaptureLimits.pathComponents&&parts.every(part=>part&&part!=='.'&&part!=='..');});
export const PinnedTextCaptureProfile=z.enum(['github-pinned-git-blob/1.0','github-pinned-git-blob/1.1']);

const gitHash = z.string().regex(/^[a-f0-9]{40}$/);
const gitCommit = z.object({sha: gitHash, tree: z.object({sha: gitHash})});
const gitTree = z.object({sha: gitHash, truncated: z.boolean(), tree: z.array(z.object({path: z.string(), mode: z.string(), type: z.string(), sha: gitHash}))});
const gitBlob = z.object({sha: gitHash, encoding: z.literal('base64'), size: z.number().int().min(1).max(TextCaptureLimits.fileBytes), content: z.string()});

/** Explicit bounded text reads at the existing commit. Each path is resolved through ordinary Git tree entries. */
export async function captureRepositoryText(snapshot: RepositorySnapshot, requested: string[], signal: AbortSignal, transport: ReadonlyTransport = githubGetJson, profile:z.infer<typeof PinnedTextCaptureProfile>='github-pinned-git-blob/1.0') {
  PinnedTextCaptureProfile.parse(profile);
  const pathSchema=profile==='github-pinned-git-blob/1.1'?DeepTextCapturePath:TextCapturePath;
  const {filesPerRequest, totalFiles, fileBytes, totalBytes} = TextCaptureLimits;
  if (requested.length < 1 || requested.length > filesPerRequest || new Set(requested).size !== requested.length ||
      requested.some(path => !pathSchema.safeParse(path).success || snapshot.documents.some(document => document.path === path))) {
    throw new EngineError('SOURCE_PATH', 'Request one to three unique, safe, uncaptured repository text paths');
  }
  const documents = [...snapshot.documents];
  let size = documents.reduce((sum, document) => sum + Buffer.byteLength(document.content), 0);
  if (documents.length + requested.length > totalFiles || size >= totalBytes) {
    throw new EngineError('SOURCE_BUDGET', 'Text capture would exceed the total source budget');
  }
  const base = 'https://api.github.com/repos' + new URL(RepositoryUrl.parse(snapshot.repository)).pathname + '/git/';
  const get = async <T>(schema: z.ZodType<T>, path: string) => {
    checkAbort(signal);
    const result = schema.safeParse(await transport(base + path, signal));
    if (!result.success) throw new EngineError('SOURCE_FORMAT', 'GitHub returned invalid Git data for ' + path);
    return result.data;
  };
  const commit = await get(gitCommit, 'commits/' + gitHash.parse(snapshot.commit));
  if (commit.sha !== snapshot.commit) throw new EngineError('SOURCE_FORMAT', 'Git commit identity differs from the frozen commit');
  const trees = new Map<string, z.infer<typeof gitTree>>();
  for (const path of requested) {
    const parts = path.split('/');
    let sha = commit.tree.sha;
    for (const [index, name] of parts.entries()) {
      let tree = trees.get(sha);
      if (!tree) {
        tree = await get(gitTree, 'trees/' + sha);
        if (tree.sha !== sha) throw new EngineError('SOURCE_FORMAT', 'Git tree identity mismatch');
        if (tree.truncated) throw new EngineError('SOURCE_TREE_TRUNCATED', 'GitHub did not return a complete tree for ' + path);
        trees.set(sha, tree);
      }
      const entries = tree.tree.filter(entry => entry.path === name);
      const entry = entries[0];
      const last = index === parts.length - 1;
      if (entries.length !== 1 || !entry || (last
        ? entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)
        : entry.type !== 'tree' || entry.mode !== '040000')) {
        throw new EngineError('SOURCE_ENTRY', 'Expected an ordinary Git file without symlinks or submodules: ' + path);
      }
      sha = entry.sha;
    }
    const blob = await get(gitBlob, 'blobs/' + sha);
    const encoded = blob.content.replace(/[\r\n]/g, '');
    if (encoded.length > Math.ceil(fileBytes / 3) * 4) throw new EngineError('SOURCE_SIZE', 'Git blob exceeds byte limit: ' + path);
    const bytes = Buffer.from(encoded, 'base64');
    const gitDigest = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (blob.sha !== sha || gitDigest !== sha || blob.size !== bytes.length || bytes.toString('base64') !== encoded) {
      throw new EngineError('SOURCE_INTEGRITY', 'Git blob bytes do not match the tree entry: ' + path);
    }
    size += bytes.length;
    if (size > totalBytes) throw new EngineError('SOURCE_BUDGET', 'Text capture exceeds the total byte budget: ' + path);
    let content: string;
    try {
      content = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
      if (content.includes('\0')) throw new Error('NUL byte');
    } catch {
      throw new EngineError('SOURCE_ENCODING', 'Git blob must be inert UTF-8 text: ' + path);
    }
    documents.push({path, url: `${snapshot.repository}/blob/${snapshot.commit}/${path}`, sha256: sha256(bytes), content});
  }
  return {...snapshot, documents};
}

export async function researchRepository(repository: string, requestedRef='HEAD', extraDocuments: string[]=[], transport: ReadonlyTransport=githubGetJson, signal?: AbortSignal): Promise<RepositorySnapshot> {
  const parsed=RepositoryUrl.safeParse(repository.replace(/\/$/,'').replace(/\.git$/,''));
  if(!parsed.success)throw new EngineError('REPOSITORY_URL','Expected https://github.com/owner/repository with no credentials, query or fragment');
  if(!/^[A-Za-z0-9_./-]{1,160}$/.test(requestedRef)||requestedRef.includes('..'))throw new EngineError('SOURCE_REF','Invalid repository ref');
  if(extraDocuments.length>6)throw new EngineError('SOURCE_COUNT','At most six extra documents are allowed');
  for(const path of extraDocuments) if(!/^[A-Za-z0-9_.\/-]{1,160}\.(md|txt)$/i.test(path)||path.split('/').some((p)=>!p||p==='.'||p==='..'))throw new EngineError('SOURCE_PATH','Only safe relative Markdown/text document paths are allowed');
  const [,owner,name]=new URL(parsed.data).pathname.split('/');
  const base=`https://api.github.com/repos/${owner}/${name}`;
  const meta=await transport(base,signal) as {full_name?:unknown;name?:unknown;description?:unknown;default_branch?:unknown;private?:unknown;license?:{spdx_id?:unknown}|null};
  if(typeof meta?.full_name!=='string'||meta.full_name.toLowerCase()!==`${owner}/${name}`.toLowerCase()||typeof meta.default_branch!=='string')throw new EngineError('SOURCE_FORMAT','Repository metadata identity or branch is invalid');
  if(meta.private===true)throw new EngineError('SOURCE_PRIVATE','Only public repositories are supported');
  const commitResult=await transport(base+'/commits/'+encodeURIComponent(requestedRef),signal) as {sha?:unknown};
  if(typeof commitResult?.sha!=='string'||!/^[a-f0-9]{40}$/.test(commitResult.sha))throw new EngineError('SOURCE_FORMAT','GitHub did not resolve a full commit SHA');
  const commit=commitResult.sha;
  if(/^[a-f0-9]{40}$/i.test(requestedRef)&&commit!==requestedRef.toLowerCase())throw new EngineError('SOURCE_FORMAT','Resolved commit does not match the requested SHA');
  const documents: RepositorySnapshot['documents']=[];
  const addDocument=(value:unknown,expectedPath?:string)=>{
    const doc=value as {type?:unknown;path?:unknown;encoding?:unknown;content?:unknown;size?:unknown};
    if(!doc||doc.type!=='file'||typeof doc.path!=='string'||!/^[A-Za-z0-9_.\/-]{1,200}$/.test(doc.path)||doc.path.split('/').some((p)=>!p||p==='.'||p==='..')||doc.encoding!=='base64'||typeof doc.content!=='string'||typeof doc.size!=='number'||doc.size<1||doc.size>200_000)throw new EngineError('SOURCE_DOCUMENT','Expected a bounded, nonempty UTF-8 document file');
    if(expectedPath!==undefined&&doc.path!==expectedPath)throw new EngineError('SOURCE_DOCUMENT','GitHub returned a different document path than requested');
    const encoded=doc.content.replace(/[\r\n]/g,'');
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.toString('base64')!==encoded)throw new EngineError('SOURCE_ENCODING','Source document is not canonical base64');
    if(bytes.length!==doc.size||bytes.length>200_000)throw new EngineError('SOURCE_SIZE','Document bytes do not match declared size');
    let content: string;
    try {content=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);} catch {throw new EngineError('SOURCE_ENCODING','Source document is not UTF-8 text');}
    if(!documents.some((d)=>d.path===doc.path))documents.push({path:doc.path,url:`${parsed.data}/blob/${commit}/${doc.path.split('/').map(encodeURIComponent).join('/')}`,sha256:sha256(bytes),content});
  };
  addDocument(await transport(base+'/readme?ref='+commit,signal));
  if(meta.license) {
    try {addDocument(await transport(base+'/contents/LICENSE?ref='+commit,signal),'LICENSE');}
    catch(error) {if(!(error instanceof EngineError&&error.code==='SOURCE_HTTP'&&error.message.includes(' 404 ')))throw error;}
  }
  for(const path of [...new Set(extraDocuments)])addDocument(await transport(base+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+commit,signal),path);
  return RepositorySnapshotSchema.parse({schemaVersion:'1.0',repository:parsed.data,commit,name:typeof meta.name==='string'?meta.name:name!,description:typeof meta.description==='string'?meta.description:'',defaultBranch:meta.default_branch,license:typeof meta.license?.spdx_id==='string'?meta.license.spdx_id:null,fetchedAt:new Date().toISOString(),documents,trust:'untrusted-data-never-executed'});
}
