import {lstat,readFile,writeFile,rename,unlink,readdir} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {EngineError,checkAbort} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {ancestors,boundedFile} from '../story-planner/runtime.js';
import {candidateReviewDecision} from './candidate-review.js';
import {explanationNextActions} from './narrative-next-actions.js';
import {captureNarrativeStart} from './explanation-session.js';
import {RepositoryUrl} from '../contracts/planning.js';
const Hash=z.string().regex(/^[a-f0-9]{64}$/);
const Pointer=z.strictObject({schemaVersion:z.literal('repository-narrative-current-run/1.0'),result:z.string().min(1),resultSha256:Hash,authorDirectory:z.string().min(1)});
const AuthorManifest=z.object({authorSha256:Hash,source:z.unknown(),files:z.array(z.strictObject({name:z.enum(['story.json','narrative.json','animation.json','document-card.json','run.json','silent-voice.json','local-tts.json','narrated-excerpt.json','README.txt','creative-brief.json']),sha256:Hash,bytes:z.number().int().positive().max(1_000_000)})).min(4).max(10)});
const marker='<!doctype html>\n<!-- github-video-engine workspace-preview/1.0 -->\n';
const fail=(message:string):never=>{throw new EngineError('NARRATIVE_WORKSPACE',message);};
const json=async(path:string)=>JSON.parse((await boundedFile(path,4_000_000)).toString('utf8').replace(/^\uFEFF/,''));
async function exists(path:string){try{await lstat(path);return true;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e;}}
function owned(root:string,path:string){const r=relative(root,path);if(!r||isAbsolute(r)||r==='..'||r.startsWith('..'+sep))fail('Checkpoint must remain inside its owned workspace.');return r.replaceAll('\\','/');}
async function replaceOwned(path:string,bytes:string,check:(old:string)=>void){
 if(await exists(path)){const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink())fail('Current workspace output is not a regular file.');check((await boundedFile(path,4_000_000)).toString('utf8'));}
 const temp=path+'.'+randomUUID()+'.partial';
 try{await writeFile(temp,bytes,{flag:'wx'});await rename(temp,path);}finally{await unlink(temp).catch(()=>{});}
}
const html=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const href=(s:string)=>s.split('/').map(encodeURIComponent).join('/');

/** Called while the existing workspace run lock is held, after immutable result commit. */
export async function recordNarrativeWorkspace(workspace:string,authorDirectory:string,value:any){
 workspace=resolve(workspace);await ancestors(workspace);
 const resultPath=join(value.attempt,'result.json'),bytes=await boundedFile(resultPath,4_000_000);
 if(canonical(JSON.parse(bytes.toString('utf8')))!==canonical(value))fail('Committed run result differs.');
 const pointer=Pointer.parse({schemaVersion:'repository-narrative-current-run/1.0',result:owned(workspace,resultPath),resultSha256:sha256(bytes),authorDirectory:resolve(authorDirectory)});
 const bundle=value.details?.movie?.output?.bundle;
 let preview:string|undefined;
 if(value.status==='editable-preview-complete'&&typeof bundle==='string'){
  const movie=owned(workspace,join(bundle,'excerpt.mp4')),index=owned(workspace,join(bundle,'index.html'));
  await ancestors(bundle);await boundedFile(join(bundle,'excerpt.mp4'),200_000_000);
  preview=join(workspace,'workspace-preview.html');
  const silent=value.details?.narration==='none';
  const review=silent?'Silent preview without an audio track. Facts, visual review and owner acceptance are pending.':'Source interpretation, listening, alignment, continuous AV and owner acceptance remain pending.';
  const page=marker+'<meta charset="utf-8"><title>Experimental preview</title><h1>Experimental preview — review pending</h1><p>'+review+'</p><p>Exact task: '+html(value.tasks.silentPreview??value.tasks.narratedPreview)+'</p><video controls width="360" src="'+href(movie)+'"></video><p><a href="'+href(index)+'">Editable preview bundle</a> · <a href="current-run.json">Latest checkpoint pointer</a></p>';
  await replaceOwned(preview,page,old=>{if(!old.startsWith(marker))fail('Refusing to replace an unrelated workspace preview page.');});
 }
 await replaceOwned(join(workspace,'current-run.json'),canonical(pointer),old=>{Pointer.parse(JSON.parse(old));});
 return{current:join(workspace,'current-run.json'),...(preview?{preview}:{})};
}

/** Read-only recovery from an exact committed checkpoint, never a source-supplied command. */
export async function statusNarrativeWorkspace(workspace:string,signal:AbortSignal){
 workspace=resolve(workspace);await ancestors(workspace);checkAbort(signal);
 const owner=await json(join(workspace,'workspace.json')),source=await json(join(workspace,'source.json'));
 if(owner.schemaVersion!=='repository-narrative-workspace/1.0'||source.schemaVersion!=='repository-narrative-run-source/1.0')fail('Not an owned narrative workspace.');
 RepositoryUrl.parse(owner.repository);Hash.parse(source.taskId);Hash.parse(source.bindingSha256);
 const captured=await captureNarrativeStart(join(workspace,'state'),source.taskId,signal);
 if(captured.manifest.binding.repository!==owner.repository||sha256(canonical(captured.manifest.binding))!==source.bindingSha256)fail('Stored repository differs from its captured source.');
 const pointer=Pointer.parse(await json(join(workspace,'current-run.json')));
 if(isAbsolute(pointer.result)||pointer.result.includes('\\')||!/^runs\/[a-f0-9-]+\/attempts\/[a-f0-9-]+\/result\.json$/.test(pointer.result))fail('Invalid relative checkpoint path.');
 const resultPath=resolve(workspace,...pointer.result.split('/'));owned(workspace,resultPath);await ancestors(resolve(resultPath,'..'));
 const bytes=await boundedFile(resultPath,4_000_000);if(sha256(bytes)!==pointer.resultSha256)fail('Current checkpoint hash differs.');
 const value=JSON.parse(bytes.toString('utf8'));
 if(value.schemaVersion!=='repository-narrative-run/1.0'||value.workspace!==workspace||canonical(value.source)!==canonical(source))fail('Checkpoint workspace/source binding differs.');
 if(typeof value.candidate!=='string')fail('Missing candidate identity.');owned(workspace,value.candidate);await ancestors(value.candidate);
 const manifest=AuthorManifest.parse(await json(join(value.candidate,'author-manifest.json')));
 if(manifest.authorSha256!==value.authorSha256||canonical(manifest.source)!==canonical(source))fail('Checkpoint author/source manifest differs.');
 if(new Set(manifest.files.map(f=>f.name)).size!==manifest.files.length||['story.json','narrative.json','animation.json','run.json'].some(n=>!manifest.files.some(f=>f.name===n))||sha256(canonical(manifest.files.map(f=>[f.name,f.sha256]).sort((a,b)=>a[0]!.localeCompare(b[0]!))))!==manifest.authorSha256)fail('Author manifest identity differs.');
 for(const f of manifest.files){const b=await boundedFile(join(value.candidate,'author',f.name),1_000_000);if(sha256(b)!==f.sha256||b.length!==f.bytes)fail('Committed author snapshot differs.');}
 let authorState='unchanged';
 try{await ancestors(pointer.authorDirectory);const names=await readdir(pointer.authorDirectory);if(canonical(names.sort())!==canonical(manifest.files.map((f:any)=>f.name).sort()))authorState='changed';else for(const f of manifest.files)if(sha256(await boundedFile(join(pointer.authorDirectory,f.name),1_000_000))!==f.sha256)authorState='changed';}catch{authorState='unavailable';}
 const task=value.tasks.narratedPreview??value.tasks.silentPreview??value.tasks.narrative??source.taskId;
 const next=await explanationNextActions(join(workspace,'state'),task,signal);
 const resume=['explanation','run','--repo',owner.repository,'--workspace',workspace,'--author',pointer.authorDirectory,'--through','preview'];
 const reviewPath=resolve(resultPath,'..','script-review.json');
 if(authorState==='unchanged'&&await exists(reviewPath)){
  if(candidateReviewDecision(await json(reviewPath),manifest.authorSha256,'script').status==='passed')resume.push('--review',reviewPath);
 }
 return{schemaVersion:'repository-narrative-workspace-status/1.0',workspace,repository:owner.repository,status:value.status,source,task,authorDirectory:pointer.authorDirectory,authorState,currentResult:resultPath,currentResultSha256:pointer.resultSha256,next,resume,requiresSessionAgent:authorState!=='unchanged'||value.status!=='editable-preview-complete',...(value.status==='editable-preview-complete'?{preview:join(workspace,'workspace-preview.html'),bundle:value.details.movie.output.bundle}:{}),modelCalls:0,actionsExecuted:0,approval:'none',currentFacts:'pending',ownerListening:value.details?.narration==='none'?'not-applicable':'pending',ownerAcceptance:'pending'};
}

export async function narrativeWorkspaceCommand(pos:string[],values:Record<string,unknown>,signal:AbortSignal){
 if(pos.length!==2||pos[1]!=='workspace-status'||typeof values.workspace!=='string'||Object.entries(values).some(([k,v])=>v!==undefined&&k!=='workspace'))throw new EngineError('USAGE','explanation workspace-status --workspace <owned workspace>');
 return statusNarrativeWorkspace(values.workspace,signal);
}
