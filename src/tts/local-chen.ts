import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {lstat,readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {z} from 'zod';
import {EngineError,checkAbort} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {command} from '../core/process.js';
import {projectRoot} from '../providers/local.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {boundedFile,preflightStatePath} from '../story-planner/runtime.js';
import {measureHuihuiWav} from './huihui.js';
import {produceTts} from './runtime.js';

const Hash=z.string().regex(/^[a-f0-9]{64}$/);
const Profile=z.strictObject({schemaVersion:z.literal('local-chen-windows/1.0'),pythonPath:z.string().refine(isAbsolute),modelPath:z.string().refine(isAbsolute),referencePath:z.string().refine(isAbsolute),referenceSha256:Hash,referenceText:z.string().min(1).max(3000),modelFiles:z.array(z.strictObject({path:z.string().regex(/^[A-Za-z0-9_.\/-]+$/).refine(p=>!p.split('/').some(s=>!s||s==='.'||s==='..')),sha256:Hash,bytes:z.number().int().positive()})).min(10).max(20)});
const voiceLabel='Local Chen-style approximation / Qwen3-TTS 0.6B / pending listening';
const kind='local-chen-windows-generation-v1';
const requiredModelFiles=['config.json','generation_config.json','merges.txt','model.safetensors','preprocessor_config.json','tokenizer_config.json','vocab.json','speech_tokenizer/config.json','speech_tokenizer/configuration.json','speech_tokenizer/model.safetensors','speech_tokenizer/preprocessor_config.json'];
async function fileHash(path:string){let info;try{info=await lstat(path);}catch{throw new EngineError('CHEN_LOCAL_UNAVAILABLE','A configured local voice file is unavailable; no replacement voice or paid provider was used.');}if(!info.isFile()||info.isSymbolicLink())throw new EngineError('CHEN_PROFILE','Voice input must be a regular file');const h=createHash('sha256');for await(const b of createReadStream(path))h.update(b as Buffer);const after=await lstat(path);if(after.size!==info.size||after.mtimeMs!==info.mtimeMs)throw new EngineError('CHEN_PROFILE','Voice input changed while hashing.');return{sha256:h.digest('hex'),bytes:info.size};}
export async function loadLocalChenProfile(path=process.env.GVE_CHEN_PROFILE??join(projectRoot,'work','local-chen-profile.json')){
 let profile:z.infer<typeof Profile>;try{profile=Profile.parse(JSON.parse((await boundedFile(resolve(path),32_000)).toString('utf8').replace(/^\uFEFF/,'')));}catch{throw new EngineError('CHEN_LOCAL_UNAVAILABLE','Local Chen profile missing or invalid. No paid provider or replacement voice was used.');}
 const ref=await fileHash(profile.referencePath);if(ref.sha256!==profile.referenceSha256)throw new EngineError('CHEN_PROFILE','Reference audio hash changed.');
 if(canonical(profile.modelFiles.map(f=>f.path).sort())!==canonical([...requiredModelFiles].sort()))throw new EngineError('CHEN_PROFILE','Voice model lock must contain the exact supported file set.');
 if(profile.modelFiles.find(f=>f.path==='model.safetensors')?.sha256!=='180b3b10eb1c9f1b4db7806d5475bae3071c0243c299d49926bab1da3b6946f6'||profile.modelFiles.find(f=>f.path==='speech_tokenizer/model.safetensors')?.sha256!=='836b7b357f5ea43e889936a3709af68dfe3751881acefe4ecf0dbd30ba571258')throw new EngineError('CHEN_PROFILE','Voice model weights differ from the approved fixed model revision.');
 for(const file of profile.modelFiles){const actual=await fileHash(join(profile.modelPath,...file.path.split('/')));if(actual.sha256!==file.sha256||actual.bytes!==file.bytes)throw new EngineError('CHEN_PROFILE','Local model file differs from its lock: '+file.path);}
 const python=await fileHash(profile.pythonPath),worker=await boundedFile(join(projectRoot,'scripts','windows-local-chen.py'),32_000);
 return{profile,identity:{schemaVersion:profile.schemaVersion,modelRevision:'Qwen3-TTS-12Hz-0.6B-Base@5d83992436eae1d760afd27aff78a71d676296fc',modelFiles:profile.modelFiles,referenceSha256:profile.referenceSha256,referenceTextSha256:sha256(profile.referenceText),pythonSha256:python.sha256,workerSha256:sha256(worker),runtime:'qwen-tts-0.1.1 / torch-2.8.0+cu128 / Windows CUDA',voiceLabel},worker};
}
export async function generateLocalChen(text:string,data:string,signal:AbortSignal){
 checkAbort(signal);if(process.platform!=='win32')throw new EngineError('CHEN_LOCAL_UNAVAILABLE','The local Chen adapter currently supports Windows CUDA only.');
 if(!text.trim()||[...text].length>120||/[\p{C}\p{Zl}\p{Zp}]/u.test(text))throw new EngineError('CHEN_INPUT','Use one line of at most 120 Unicode characters.');
 const prepared=await loadLocalChenProfile(),input={text,voice:prepared.identity};preflightStatePath(resolve(data));const runner=new TaskRunner(resolve(data));
 try{const task=await runner.run(kind,input,async(directory,active)=>{
   const systemRoot=process.env.SystemRoot;if(!systemRoot)throw new EngineError('CHEN_LOCAL_UNAVAILABLE','Windows system root unavailable.');
   await writeFile(join(directory,'worker.py'),prepared.worker,{flag:'wx'});
   await writeFile(join(directory,'request.json'),canonical({text,modelPath:prepared.profile.modelPath,referencePath:prepared.profile.referencePath,referenceText:prepared.profile.referenceText}),{flag:'wx'});
   const output=await command(prepared.profile.pythonPath,['-u','worker.py'],{cwd:directory,signal:active,timeout:300_000,inheritEnv:false,env:{SystemRoot:systemRoot,WINDIR:systemRoot,PATH:join(systemRoot,'System32'),TEMP:directory,TMP:directory,NUMBA_CACHE_DIR:directory,PYTHONDONTWRITEBYTECODE:'1',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'}});
   let metadata:any;try{metadata=JSON.parse(output.trim().split(/\r?\n/).at(-1)!);}catch{throw new EngineError('CHEN_MEDIA','Invalid local voice worker metadata.');}
   const wav=await boundedFile(join(directory,'speech.wav'),2_000_000),audio=measureHuihuiWav(wav);if(metadata.samples!==audio.samples||metadata.sampleRate!==audio.sampleRate)throw new EngineError('CHEN_MEDIA','Voice sample metadata differs from output.');
   const artifact=await runner.artifacts.commit(wav,'audio/wav','RESOLVE_ASSETS',sha256(canonical({version:'production-task-v1',kind,input})));
   return{value:{schemaVersion:'local-chen-generation/1.0',input,audio,voiceLabel,review:'pending-owner-listening',network:'Python audit hook and offline flags; not OS-level isolation'},outputs:[artifact]};
  },signal,{attempts:2,timeoutMs:330_000});
  const artifact=task.outputs[0];if(!artifact)throw new EngineError('CHEN_MEDIA','Local voice artifact missing.');const wav=await boundedFile(runner.artifacts.path(artifact),2_000_000);if(sha256(wav)!==artifact.sha256)throw new EngineError('CHEN_MEDIA','Local voice artifact integrity failure.');
  const dir=await mkdtemp(join(tmpdir(),'gve-chen-import-'));try{const path=join(dir,'speech.wav');await writeFile(path,wav,{flag:'wx'});const imported=await produceTts({schemaVersion:'1.0',provider:'local-import',text,voiceLabel,sourceSha256:artifact.sha256,mediaType:'audio/wav'},data,signal,{audioPath:path});return{generation:{taskId:task.id,cached:task.cached,manifest:task.value},imported};}finally{await rm(dir,{recursive:true,force:true});}
 }finally{runner.close();}
}
