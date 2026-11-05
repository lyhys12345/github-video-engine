import {lstat,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,sep} from 'node:path';
import {z} from 'zod';
import {EngineError,checkAbort} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {ancestors,boundedFile} from '../story-planner/runtime.js';
import type {ReadonlyTransport} from '../providers/github-readonly.js';
import {captureNarrativeStart} from './explanation-session.js';
import {Request} from './explanation-contract.js';
import {runNarrativeWorkspace} from './narrative-run.js';
const Hash=z.string().regex(/^[a-f0-9]{64}$/);
const Source=z.strictObject({schemaVersion:z.literal('repository-narrative-run-source/1.0'),taskId:Hash,bindingSha256:Hash});
const read=async(p:string)=>JSON.parse((await boundedFile(p,1_000_000)).toString('utf8').replace(/^\uFEFF/,''));
const fail=(message:string):never=>{throw new EngineError('NARRATIVE_SOURCE_EXPAND',message);};
const contains=(a:string,b:string)=>{const r=relative(a,b);return !r||!isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);};

/** A new immutable capture at the already verified full commit, never a HEAD refresh or author rebind. */
export async function expandNarrativeSource(workspace:string,out:string,documents:string[],sourcePaths:string[],signal:AbortSignal,transport?:ReadonlyTransport){
 workspace=resolve(workspace);out=resolve(out);
 if(contains(workspace,out)||contains(out,workspace))fail('The expanded workspace must be separate from the original; original state is never rewritten.');
 if(!documents.length&&!sourcePaths.length)fail('Request at least one additional document or source path.');
 await ancestors(workspace);checkAbort(signal);
 const owner=await read(join(workspace,'workspace.json')),source=Source.parse(await read(join(workspace,'source.json'))),request=Request.parse(await read(join(workspace,'request.json')));
 if(owner.schemaVersion!=='repository-narrative-workspace/1.0'||owner.repository!==request.repository||request.voiceMode!=='silent'||!['explanation-session-request/1.0','explanation-session-request/1.2'].includes(request.schemaVersion))fail('Expected an existing ordinary source-bound narrative workspace.');
 const captured=await captureNarrativeStart(join(workspace,'state'),source.taskId,signal);
 if(canonical(captured.manifest.request)!==canonical(request)||captured.manifest.binding.repository!==owner.repository||sha256(canonical(captured.manifest.binding))!==source.bindingSha256)fail('Original immutable request/source binding differs.');
 const docs=[...new Set([...request.documents,...documents])],paths=[...new Set([...('sourcePaths'in request?request.sourcePaths:[]),...sourcePaths])];
 if(docs.length===request.documents.length&&paths.length===('sourcePaths'in request?request.sourcePaths.length:0))fail('No additional source was requested.');
 const commit=captured.manifest.binding.commit;
 // Reuse the bounded capture schemas before creating a destination or fetching.
 Request.parse({...request,schemaVersion:paths.length?'explanation-session-request/1.2':'explanation-session-request/1.0',ref:commit,documents:docs,...(paths.length?{sourcePaths:paths}:{})});
 // Ordinary run capture currently has fixed editorial defaults. Refuse a custom
 // imported request rather than silently changing its owner's intent.
 if(request.language!=='zh-CN'||request.maxSeconds!==60||request.audience!=='普通观众；具体叙事由会话Agent填写')fail('Custom capture preferences require an explicit new request; this ordinary-run expansion does not reset them.');
 const result=await runNarrativeWorkspace(owner.repository,out,undefined,'planning',signal,transport,{ref:commit,documents:docs,sourcePaths:paths});
 const link={schemaVersion:'repository-narrative-source-expansion/1.0',parentWorkspace:workspace,parentSource:source,parentRequestSha256:sha256(canonical(request)),repository:owner.repository,commit,documents:docs,sourcePaths:paths,source:result.source,authorPolicy:'Fresh source-bound packet; prior author claims and review are not copied or rebound.',approval:'none'};
 const linkPath=join(out,'source-parent.json'),bytes=Buffer.from(canonical(link));
 try{await writeFile(linkPath,bytes,{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;const info=await lstat(linkPath);if(!info.isFile()||info.isSymbolicLink()||!(await boundedFile(linkPath,1_000_000)).equals(bytes))fail('Expanded-source provenance differs; preserve it and choose a new destination.');}
 return{...result,sourceExpansion:{...link,provenance:linkPath},modelCalls:0,approval:'none'};
}

export async function narrativeSourceExpandCommand(pos:string[],values:Record<string,unknown>,signal:AbortSignal){
 const keys=['workspace','out','doc','source-path'];
 if(pos.length!==2||pos[1]!=='source-expand'||typeof values.workspace!=='string'||typeof values.out!=='string'||['doc','source-path'].some(k=>values[k]!==undefined&&(!Array.isArray(values[k])||!(values[k] as unknown[]).every(x=>typeof x==='string')))||Object.entries(values).some(([k,v])=>v!==undefined&&!keys.includes(k)))throw new EngineError('USAGE','explanation source-expand --workspace <captured workspace> --out <separate new workspace> [--doc <path>] [--source-path <path>]');
 return expandNarrativeSource(values.workspace,values.out,(values.doc??[]) as string[],(values['source-path']??[]) as string[],signal);
}
