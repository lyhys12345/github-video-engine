import {lstat,realpath,readFile,writeFile,mkdir,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {join,resolve,basename,dirname} from 'node:path';
import {EngineError} from './errors.js';
const recordName='runtime-owner.json';
type Ownership={schemaVersion:'1.0';kind:'gve-final-runtime';root:string;directory:string;ownerDirectory:string;token:string};
function fail(message:string):never{throw new EngineError('FINAL_TEMP_PATH',message);}
async function regularDirectory(path:string,missing=false){try{const info=await lstat(path);if(!info.isDirectory()||info.isSymbolicLink())fail('Refusing linked/non-directory runtime root');return await realpath(path);}catch(e){if(missing&&(e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
async function absent(path:string){try{await lstat(path);return false;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return true;throw e;}}
async function boundedFile(path:string){const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.size>4000)fail('Runtime ownership must be a bounded regular file');const bytes=await readFile(path);if(bytes.length!==info.size)fail('Runtime ownership changed during read');return bytes;}
export async function createOwnedRuntimeTmp(directory:string,knownRoot=tmpdir()):Promise<Ownership>{
 const ownerDirectory=await regularDirectory(resolve(directory)),root=await regularDirectory(resolve(knownRoot));if(!ownerDirectory||!root)fail('Missing runtime owner/root');
 const token=randomUUID(),value:Ownership={schemaVersion:'1.0',kind:'gve-final-runtime',root,directory:join(root,'gve-final-'+token),ownerDirectory,token},bytes=Buffer.from(JSON.stringify(value));
 // The exact sidecar is outside the payload tree, so a failed recursive deletion cannot erase ownership.
 // Planned record -> sidecar -> directory. A present payload without its sidecar is never a valid crash state.
 let recorded=false;try{await writeFile(join(ownerDirectory,recordName),bytes,{flag:'wx'});recorded=true;await writeFile(value.directory+'.owner',bytes,{flag:'wx'});await mkdir(value.directory);return value;}catch(error){if(recorded)try{await cleanupOwnedRuntimeTmp(ownerDirectory,root);}catch(cleanupError){throw new EngineError('FINAL_TEMP_CLEANUP',`Runtime creation failed (${String(error)}); cleanup failed (${String(cleanupError)})`,'retryable');}throw error;}
}
async function cleanupRuntime(directory:string,knownRoot:string):Promise<void>{
 const ownerDirectory=await regularDirectory(resolve(directory),true);if(!ownerDirectory)return;
 let bytes:Buffer;try{bytes=await boundedFile(join(ownerDirectory,recordName));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
 let parsed:unknown;try{parsed=JSON.parse(bytes.toString('utf8'));}catch{fail('Invalid runtime ownership JSON');}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail('Invalid runtime ownership record');const value=parsed as Ownership;
 const root=await regularDirectory(resolve(knownRoot));if(!root||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(['directory','kind','ownerDirectory','root','schemaVersion','token'])||value.schemaVersion!=='1.0'||value.kind!=='gve-final-runtime'||value.ownerDirectory!==ownerDirectory||value.root!==root||typeof value.token!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.token)||typeof value.directory!=='string'||dirname(value.directory)!==root||basename(value.directory)!=='gve-final-'+value.token||resolve(value.directory)!==value.directory)fail('Runtime ownership path/root/token binding mismatch');
 const target=await regularDirectory(value.directory,true);if(target&&target!==value.directory)fail('Runtime target resolves outside exact owned location');
 let marker:Buffer;try{marker=await boundedFile(value.directory+'.owner');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;if(await regularDirectory(value.directory,true))fail('Present runtime lacks its sidecar ownership marker');return;}
 if(!marker.equals(bytes))fail('Runtime ownership marker mismatch');
 if(target)await rm(target,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 if(await regularDirectory(value.directory,true))throw new EngineError('FINAL_TEMP_CLEANUP','Owned runtime still exists after cleanup','retryable');
 try{await unlink(value.directory+'.owner');}catch(e){const code=(e as NodeJS.ErrnoException).code;if(code==='ENOENT')return;if(code&&['EPERM','EACCES','EBUSY'].includes(code)){for(let i=0;i<5;i++){if(await absent(value.directory)&&await absent(value.directory+'.owner'))return;await new Promise(resolve=>setTimeout(resolve,25));}}throw e;}
}
export async function cleanupOwnedRuntimeTmp(directory:string,knownRoot=tmpdir()):Promise<void>{
 try{await cleanupRuntime(directory,knownRoot);}catch(error){if(error instanceof EngineError)throw error;const code=(error as NodeJS.ErrnoException)?.code;if(code&&['EPERM','EACCES','EBUSY','ENOTEMPTY','EMFILE','ENFILE','EIO'].includes(code))throw new EngineError('FINAL_TEMP_CLEANUP',`Owned runtime cleanup failed (${code}): ${String(error)}`,'retryable');throw error;}
}
