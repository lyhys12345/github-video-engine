import {lstat,open,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {EngineError} from '../core/errors.js';
import {DIFF_LIMITS,diffRevisions} from '../operations/revision-diff.js';
type Options={kind?:string;before?:string;after?:string;out?:string};
async function input(file:string):Promise<unknown>{
 const path=resolve(file);let handle:Awaited<ReturnType<typeof open>>|undefined;
 try{
  if(!(await lstat(path)).isFile())throw new EngineError('DIFF_INPUT','Revision inputs must be regular files, not directories or links');
  handle=await open(path,'r');const first=await handle.stat();if(!first.isFile()||first.size>DIFF_LIMITS.inputBytes)throw new EngineError('DIFF_LIMIT','Revision JSON files must be at most 4 MB');
  const chunks:Buffer[]=[];let total=0;for(;;){const chunk=Buffer.alloc(65536),n=(await handle.read(chunk,0,chunk.length,null)).bytesRead;if(!n)break;total+=n;if(total>DIFF_LIMITS.inputBytes)throw new EngineError('DIFF_LIMIT','Revision JSON file grew beyond 4 MB');chunks.push(chunk.subarray(0,n));}
  const last=await handle.stat();if(total!==first.size||last.size!==first.size||last.mtimeMs!==first.mtimeMs)throw new EngineError('DIFF_INPUT','Revision JSON file changed while reading');
  return JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/,'')) as unknown;
 }catch(e){if(e instanceof EngineError)throw e;throw new EngineError('DIFF_INPUT',`Cannot read revision JSON ${path}: ${String(e)}`);}finally{await handle?.close();}
}
/** Does not open/migrate a runtime store. Optional report creation is exclusive. */
export async function diffCommand(positionals:string[],options:Options){
 if(positionals.length!==1||positionals[0]!=='diff'||!['plan','production'].includes(options.kind??'')||!options.before||!options.after||Object.entries(options).some(([k,v])=>v!==undefined&&!['kind','before','after','out'].includes(k)))throw new EngineError('USAGE','diff --kind plan|production --before file --after file [--out new.json]');
 const before=await input(options.before),after=await input(options.after),result=diffRevisions(options.kind as 'plan'|'production',before,after);
 if(options.out){try{await writeFile(resolve(options.out),JSON.stringify(result,null,2)+'\n',{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')throw new EngineError('DIFF_EXPORT_EXISTS','Refusing to replace an existing diff report; choose a new output file');throw new EngineError('DIFF_EXPORT',`Cannot create diff report: ${String(e)}`);}}
 return result;
}
