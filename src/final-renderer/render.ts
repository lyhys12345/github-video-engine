import {mkdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join,resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {EngineError,checkAbort} from '../../src/core/errors.js';
import {killTree} from '../../src/core/process.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from './owned-runtime.js';
export {cleanupOwnedRuntimeTmp} from './owned-runtime.js';
import {FinalInputSchema,type FinalRenderInput,type FinalRenderResult,type FrameProps} from './input.js';
const here=fileURLToPath(new URL('.',import.meta.url));
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
export async function renderFinal(raw:FinalRenderInput,directory:string,signal:AbortSignal):Promise<FinalRenderResult>{
 checkAbort(signal);const input=FinalInputSchema.parse(raw),out=resolve(directory);await mkdir(out,{recursive:true});
 for(const name of ['runtime-owner.json','worker-input.json','result.json','clean-silent.mp4','captioned-silent.mp4','raw-clean-fullrange.mp4','raw-captioned-fullrange.mp4','progress.json','progress.json.new','public','bundle','samples','cover.png','renderer-metadata.json','worker.stdout','worker.stderr'])try{await lstat(join(out,name));throw new EngineError('FINAL_OUTPUT_EXISTS',`Refusing to overwrite existing renderer output ${name}`);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const fontPath=resolve(input.font.path),fontStat=await lstat(fontPath);if(!fontStat.isFile()||fontStat.isSymbolicLink()||fontStat.size>20_000_000)throw new EngineError('FONT_INVALID','Locked font must be a regular local file <=20MB');const bytes=await readFile(fontPath);if(hash(bytes)!==input.font.sha256||!['00010000','4f54544f'].includes(bytes.subarray(0,4).toString('hex')))throw new EngineError('FONT_INTEGRITY','Local font bytes do not match the locked hash/format');
 await mkdir(join(out,'public'));await writeFile(join(out,'public/gve-noto.ttf'),bytes,{flag:'wx'});checkAbort(signal);
 const frameProps:FrameProps={project:input.project,design:input.design,readthrough:input.readthrough,captions:input.captions,variant:'clean',font:{family:'GVE Noto Sans SC',file:'gve-noto.ttf',sha256:input.font.sha256}};
 const runtime=await createOwnedRuntimeTmp(out);
 const inputPath=join(out,'worker-input.json');try{await writeFile(inputPath,JSON.stringify({frameProps,browser:input.browser,parentPid:process.pid,runtimeRoot:runtime.root}),{flag:'wx'});checkAbort(signal);}catch(error){await cleanupOwnedRuntimeTmp(out,runtime.root);throw error;}
 return new Promise<FinalRenderResult>((done,reject)=>{
  const child=spawn(process.execPath,['--import','tsx',join(here,'worker.ts'),inputPath],{cwd:here,env:{...process.env,TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory},windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe','ipc']});let stdout='',stderr='',failure:unknown,force:ReturnType<typeof setTimeout>|undefined,killing:Promise<void>|undefined;
  const kill=()=>{if(child.pid&&!killing)killing=killTree(child.pid);};
  const stop=(reason:unknown)=>{failure??=reason;try{if(child.connected)child.send({type:'cancel'});}catch{}force??=setTimeout(kill,12000);};
  const abort=()=>stop(signal.reason??new EngineError('CANCELLED','Final render cancelled','cancelled'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  const deadline=setTimeout(()=>stop(new EngineError('TIMEOUT','Final rendering exceeded15minute worker deadline','retryable')),900000);
  const clean=()=>{clearTimeout(deadline);if(force)clearTimeout(force);signal.removeEventListener('abort',abort);};
  child.stdout!.on('data',chunk=>stdout=(stdout+String(chunk)).slice(-2_000_000));child.stderr!.on('data',chunk=>stderr=(stderr+String(chunk)).slice(-64_000));
  child.once('error',error=>{failure??=new EngineError('FINAL_WORKER',error.message,'retryable');});
  child.once('close',async code=>{clean();await killing;await writeFile(join(out,'worker.stdout'),stdout,{flag:'wx'}).catch(()=>{});await writeFile(join(out,'worker.stderr'),stderr,{flag:'wx'}).catch(()=>{});try{await cleanupOwnedRuntimeTmp(out,runtime.root);}catch(error){reject(new EngineError('FINAL_TEMP_CLEANUP',String(error),'retryable'));return;}if(failure){reject(failure);return;}if(code!==0){reject(new EngineError('FINAL_WORKER',`Final worker exited${code}: ${stderr}`,'retryable'));return;}
   try{const result=JSON.parse(await readFile(join(out,'result.json'),'utf8')) as FinalRenderResult;if(result.workerPid!==child.pid||result.frames!==input.readthrough.totalFrames||!result.font.loaded||result.font.sha256!==input.font.sha256)throw new EngineError('FINAL_RESULT','Final worker result does not match its exact request');for(const file of [result.clean,result.captioned,result.cover,...result.samples.map(s=>s.path)]){const rel=relative(out,resolve(file));if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))throw new EngineError('FINAL_RESULT','Worker output escapes owned directory');const stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw new EngineError('FINAL_RESULT','Worker output missing/not regular');}done(result);}catch(e){reject(e);}
  });
 });
}
