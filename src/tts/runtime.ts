import {DatabaseSync} from 'node:sqlite';
import {mkdir,mkdtemp,writeFile,rm,readFile,lstat} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {ArtifactSchema,type Artifact} from '../contracts/runtime.js';
import {EngineError,checkAbort} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {command} from '../core/process.js';
import {ffmpegPath,ffprobePath} from '../providers/local.js';
import {ElevenLabsProvider,TtsSpecSchema,ttsFingerprint,ttsInput,type TtsSpec,type TtsProvider} from '../providers/tts.js';
import {ancestors,boundedFile,preflightStatePath} from '../story-planner/runtime.js';
import {StorySchema} from '../contracts/story.js';
import {buildVoiceHandoff} from '../story-planner/voice-handoff.js';

const hash=z.string().regex(/^[a-f0-9]{64}$/);
const ReceiptSchema=z.object({schemaVersion:z.literal('tts-receipt/1.0'),fingerprint:hash,input:z.unknown(),voiceLabel:z.string().min(1).max(100),createdAt:z.iso.datetime(),artifact:ArtifactSchema,durationSeconds:z.number().finite().positive().max(600),requestId:z.string().nullable(),estimatedMaxChargeMicros:z.number().int().nonnegative(),actualChargeMicros:z.null(),chargeBasis:z.enum(['local-import-no-provider-call','provider-invoice-unverified']),transcriptVerification:z.literal('caller-declared; recorded speech not verified'),review:z.literal('pending-owner-listening')}).strict();
export type TtsReceipt=z.infer<typeof ReceiptSchema>;
const json=(x:unknown)=>JSON.stringify(x,null,2)+'\n';
const fail=(code:string,message:string):never=>{throw new EngineError(code,message);};
const schema=`CREATE TABLE IF NOT EXISTS tts_requests(id TEXT PRIMARY KEY,input TEXT NOT NULL,estimate INTEGER NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tts_outcomes(id TEXT PRIMARY KEY REFERENCES tts_requests(id),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tts_policy(singleton INTEGER PRIMARY KEY CHECK(singleton=1),budget INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS tts_request_immutable BEFORE UPDATE ON tts_requests BEGIN SELECT RAISE(ABORT,'Immutable reservation');END;
CREATE TRIGGER IF NOT EXISTS tts_request_no_delete BEFORE DELETE ON tts_requests BEGIN SELECT RAISE(ABORT,'Immutable reservation');END;
CREATE TRIGGER IF NOT EXISTS tts_outcome_immutable BEFORE UPDATE ON tts_outcomes BEGIN SELECT RAISE(ABORT,'Immutable outcome');END;
CREATE TRIGGER IF NOT EXISTS tts_outcome_no_delete BEFORE DELETE ON tts_outcomes BEGIN SELECT RAISE(ABORT,'Immutable outcome');END;
CREATE TRIGGER IF NOT EXISTS tts_policy_immutable BEFORE UPDATE ON tts_policy BEGIN SELECT RAISE(ABORT,'Immutable budget');END;
CREATE TRIGGER IF NOT EXISTS tts_policy_no_delete BEFORE DELETE ON tts_policy BEGIN SELECT RAISE(ABORT,'Immutable budget');END;`;

/** Validates immutable captured bytes, decodes every audio packet, and measures one audio-only stream. */
export async function measureTtsAudio(bytes:Buffer,signal:AbortSignal,mediaType:string){
 if(!bytes.length||bytes.length>25_000_000)fail('TTS_SIZE','Expected audio bytes in (0,25 MB]');
 const dir=await mkdtemp(join(tmpdir(),'gve-tts-media-'));const path=join(dir,'audio.bin');
 try{checkAbort(signal);await writeFile(path,bytes,{flag:'wx'});
  let probe:{streams?:{codec_type?:string}[];format?:{duration?:string;format_name?:string}};
  try{probe=JSON.parse(await command(ffprobePath(),['-v','error','-show_streams','-show_format','-of','json',path],{signal,timeout:30000}));}catch{checkAbort(signal);return fail('TTS_MEDIA','Audio could not be probed');}
  const streams=probe.streams??[],seconds=Number(probe.format?.duration);
  if(streams.length!==1||streams[0]?.codec_type!=='audio'||!Number.isFinite(seconds)||seconds<=0||seconds>600)fail('TTS_MEDIA','Expected one audio-only stream with duration in (0,600] seconds');
  const format=({'audio/mpeg':'mp3','audio/wav':'wav','audio/flac':'flac'} as Record<string,string>)[mediaType];if(!format||!probe.format?.format_name?.split(',').includes(format))fail('TTS_MEDIA','Declared audio type does not match measured container');
  try{await command(ffmpegPath(),['-v','error','-xerror','-i',path,'-map','0:a:0','-f','null','-'],{signal,timeout:30000});}catch{checkAbort(signal);return fail('TTS_MEDIA','Audio failed full decode');}
  return seconds;
 }finally{await rm(dir,{recursive:true,force:true});}
}
export function dryRunTts(raw:unknown){const spec=TtsSpecSchema.parse(raw);return{schemaVersion:'tts-preflight/1.0',fingerprint:ttsFingerprint(spec),input:ttsInput(spec),voiceLabel:spec.voiceLabel,characters:[...spec.text].length,estimatedMaxChargeMicros:spec.provider==='elevenlabs'?spec.estimatedMaxChargeMicros:0,estimateBasis:'caller-supplied upper bound; not provider price or invoice',entitlement:spec.provider==='elevenlabs'?spec.entitlement:'local-import',remoteDispatch:false,requirements:spec.provider==='elevenlabs'?['explicit --allow-paid','positive immutable state budget','ELEVENLABS_API_KEY environment variable','confirmed exact voice/model API entitlement']:[],review:'pending-owner-listening'};}

async function openState(data:string,create:boolean){data=resolve(data);preflightStatePath(data);await ancestors(data,create);const path=join(data,'tts.sqlite');
 try{const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>64_000_000)fail('TTS_STATE','Expected bounded regular TTS database');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;if(!create)fail('TTS_STATE','Existing TTS state not found');}
 const db=new DatabaseSync(path,{readOnly:!create});if(create){db.exec('PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');db.exec(schema);}return db;
}
function outcome(db:DatabaseSync,id:string){const row=db.prepare('SELECT data FROM tts_outcomes WHERE id=?').get(id);return row?JSON.parse(String(row.data)) as {state:string;receipt?:Artifact;code?:string}:null;}
async function verifiedBytes(store:ArtifactStore,artifact:Artifact){const bytes=await boundedFile(store.path(artifact),25_000_000);if(artifact.id!==artifact.sha256||bytes.length!==artifact.bytes||sha256(bytes)!==artifact.sha256)fail('INTEGRITY','TTS artifact bytes do not match their immutable reference');return bytes;}
function validateRequest(db:DatabaseSync,id:string){const row=db.prepare('SELECT input,estimate FROM tts_requests WHERE id=?').get(id);if(!row)fail('TTS_NOT_FOUND','TTS request not found');const input=JSON.parse(String(row!.input));if(sha256(canonical(input))!==id||!Number.isSafeInteger(row!.estimate)||Number(row!.estimate)<0)fail('TTS_INTEGRITY','TTS reservation identity is invalid');return{input,estimate:Number(row!.estimate)};}
async function verifiedReceipt(store:ArtifactStore,db:DatabaseSync,id:string){const request=validateRequest(db,id),result=outcome(db,id);if(result?.state!=='succeeded'||!result.receipt)fail('TTS_HELD','Request has no successful receipt; reservation is held and cannot automatically replay');const ref=ArtifactSchema.parse(result!.receipt);if(ref.inputFingerprint!==id)fail('TTS_INTEGRITY','Receipt artifact fingerprint mismatch');const receipt=ReceiptSchema.parse(JSON.parse((await verifiedBytes(store,ref)).toString('utf8')));if(receipt.fingerprint!==id||canonical(receipt.input)!==canonical(request.input)||receipt.estimatedMaxChargeMicros!==request.estimate||receipt.artifact.inputFingerprint!==id)fail('TTS_INTEGRITY','Receipt/input binding mismatch');await verifiedBytes(store,receipt.artifact);return{receipt,receiptArtifact:ref};}
function reserve(db:DatabaseSync,id:string,spec:TtsSpec,budget:number){
 db.exec('BEGIN IMMEDIATE');try{if(db.prepare('SELECT id FROM tts_requests WHERE id=?').get(id))fail('TTS_HELD','A reservation already exists; inspect status. Automatic replay is forbidden');
  const estimate=spec.provider==='elevenlabs'?spec.estimatedMaxChargeMicros:0;
  if(estimate){const policy=db.prepare('SELECT budget FROM tts_policy WHERE singleton=1').get();if(policy&&policy.budget!==budget)fail('TTS_BUDGET','State budget is immutable; use its original cap');if(!policy)db.prepare('INSERT INTO tts_policy VALUES(1,?)').run(budget);const used=Number(db.prepare('SELECT COALESCE(SUM(estimate),0) AS used FROM tts_requests').get()!.used);if(!Number.isSafeInteger(used)||used+estimate>budget)fail('TTS_BUDGET','Aggregate reservations exceed the state budget; unknown and completed charges retain their reservation');}
  db.prepare('INSERT INTO tts_requests VALUES(?,?,?,?)').run(id,canonical(ttsInput(spec)),estimate,new Date().toISOString());db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export async function produceTts(raw:unknown,data:string,signal:AbortSignal,options:{allowPaid?:boolean;budgetMicros?:number;audioPath?:string;provider?:TtsProvider;key?:()=>string|undefined}={}){
 const spec=TtsSpecSchema.parse(raw),id=ttsFingerprint(spec);checkAbort(signal);
 // Cache inspection does not read credentials and cannot dispatch.
 let existing:DatabaseSync|undefined;try{existing=await openState(data,false);}catch(e){if(!(e instanceof EngineError&&e.code==='TTS_STATE'))throw e;}
 if(existing){try{if(existing.prepare('SELECT id FROM tts_requests WHERE id=?').get(id)){const result=await verifiedReceipt(new ArtifactStore(data),existing,id);return{fingerprint:id,cached:true,...result};}}finally{existing.close();}}
 let bytes:Buffer|undefined,key:string|undefined;
 if(spec.provider==='elevenlabs'){
  if(!options.allowPaid)fail('TTS_PAID_DISABLED','Remote synthesis requires explicit --allow-paid; default is offline');
  if(!Number.isSafeInteger(options.budgetMicros)||options.budgetMicros!<=0||options.budgetMicros!>1_000_000_000)fail('TTS_BUDGET','A positive bounded --budget-micros cap is required');
  if(spec.entitlement!=='confirmed-api-access')fail('TTS_ENTITLEMENT','Exact voice/model account entitlement is unverified; no request sent');
  key=(options.key??(()=>process.env.ELEVENLABS_API_KEY))();if(!key||!/^[\x21-\x7e]{1,512}$/.test(key))fail('TTS_KEY_MISSING','Set a valid ELEVENLABS_API_KEY environment variable; credentials are never accepted in config');
 }else{if(!options.audioPath)fail('TTS_IMPORT','Local import requires --audio');bytes=await boundedFile(resolve(options.audioPath!),25_000_000);if(sha256(bytes)!==spec.sourceSha256)fail('TTS_IMPORT','Imported audio hash does not match exact configured source');}
 await ancestors(join(resolve(data),'artifacts'),true);
 const db=await openState(data,true),store=new ArtifactStore(data);
 try{reserve(db,id,spec,options.budgetMicros??0);
  try{checkAbort(signal);let requestId:string|null=null,mediaType:string;
   if(spec.provider==='elevenlabs'){const result=await(options.provider??new ElevenLabsProvider()).synthesize(spec,key!,signal);bytes=result.bytes;requestId=result.requestId;mediaType=result.mediaType;}else mediaType=spec.mediaType;
   const durationSeconds=await measureTtsAudio(bytes!,signal,mediaType);checkAbort(signal);
   const artifact=await store.commit(bytes!,mediaType,'RESOLVE_ASSETS',id);
   const receipt=ReceiptSchema.parse({schemaVersion:'tts-receipt/1.0',fingerprint:id,input:ttsInput(spec),voiceLabel:spec.voiceLabel,createdAt:new Date().toISOString(),artifact,durationSeconds,requestId,estimatedMaxChargeMicros:spec.provider==='elevenlabs'?spec.estimatedMaxChargeMicros:0,actualChargeMicros:null,chargeBasis:spec.provider==='elevenlabs'?'provider-invoice-unverified':'local-import-no-provider-call',transcriptVerification:'caller-declared; recorded speech not verified',review:'pending-owner-listening'});
   const receiptArtifact=await store.commit(json(receipt),'application/json','PUBLISH',id);checkAbort(signal);
   db.prepare('INSERT INTO tts_outcomes VALUES(?,?)').run(id,json({state:'succeeded',receipt:receiptArtifact}));return{fingerprint:id,cached:false,receipt,receiptArtifact};
  }catch(e){const code=e instanceof EngineError?e.code:'TTS_FAILED';db.prepare('INSERT INTO tts_outcomes VALUES(?,?)').run(id,json({state:'held',code,actualChargeMicros:null}));if(e instanceof EngineError)throw e;throw new EngineError('TTS_FAILED','TTS attempt failed; reservation held. No automatic replay.');}
 }finally{db.close();}
}
export async function statusTts(data:string,id:string){hash.parse(id);const db=await openState(data,false);try{const request=validateRequest(db,id),result=outcome(db,id);if(result?.state==='succeeded'){const checked=await verifiedReceipt(new ArtifactStore(data),db,id);return{fingerprint:id,state:'succeeded',integrity:'verified',...checked};}return{fingerprint:id,state:'held',reservationMicros:request.estimate,actualChargeMicros:null,code:result?.code??'TTS_INTERRUPTED_OR_RUNNING',replay:'forbidden; inspect provider usage manually',review:'pending-owner-listening'};}finally{db.close();}}
export async function exportTts(data:string,id:string,out:string,signal:AbortSignal,binding:{story:unknown;shotId:string}){
 hash.parse(id);checkAbort(signal);const state=await statusTts(data,id);if(!('receipt' in state))return fail('TTS_HELD','Only successful verified audio can be exported');
 const receipt=state.receipt!,story=StorySchema.parse(binding.story),shot=story.shots.find(s=>s.id===binding.shotId),input=receipt.input as {text?:string};if(!shot||shot.narration!==input.text)return fail('TTS_TRANSCRIPT','Export requires exact current story shot narration');
 const store=new ArtifactStore(data),ext=receipt.artifact.mediaType==='audio/mpeg'?'mp3':receipt.artifact.mediaType==='audio/wav'?'wav':'flac';out=resolve(out);await ancestors(dirname(out),true);
 const audioPath=join(out,'audio.'+ext),bindings={schemaVersion:'1.0' as const,storyId:story.id,voiceLabel:receipt.voiceLabel,clips:[{shotId:shot.id,path:audioPath,sha256:receipt.artifact.sha256,transcript:shot.narration}]};
 // mkdir is an exclusive reservation; existing user output is never replaced.
 await mkdir(out);await writeFile(join(out,'receipt.json'),json(receipt),{flag:'wx'});checkAbort(signal);const bytes=await boundedFile(store.path(receipt.artifact),25_000_000);if(sha256(bytes)!==receipt.artifact.sha256)fail('TTS_INTEGRITY','Audio changed while exporting');await writeFile(audioPath,bytes,{flag:'wx'});
 await writeFile(join(out,'voice-bindings.json'),json(bindings),{flag:'wx'});await writeFile(join(out,'voice-handoff.json'),json(await buildVoiceHandoff(story,bindings,signal)),{flag:'wx'});
 return{fingerprint:id,directory:out,audioPath,receiptPath:join(out,'receipt.json'),review:'pending-owner-listening'};
}
