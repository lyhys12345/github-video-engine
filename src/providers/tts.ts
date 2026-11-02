import {z} from 'zod';
import {EngineError,checkAbort} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';

export const TTS_ADAPTER_VERSION='elevenlabs-http-v1';
const id=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const text=z.string().min(1).max(5000).refine(s=>s.trim().length>0,'Narration must not be blank');
export const VoiceSettingsSchema=z.object({stability:z.number().min(0).max(1),similarity_boost:z.number().min(0).max(1),style:z.number().min(0).max(1),use_speaker_boost:z.boolean(),speed:z.number().min(.7).max(1.2)}).strict();
export const RemoteTtsSchema=z.object({schemaVersion:z.literal('1.0'),provider:z.literal('elevenlabs'),text,voiceId:id,voiceLabel:z.string().min(1).max(100),modelId:id,voiceSettings:VoiceSettingsSchema,outputFormat:z.literal('mp3_44100_128'),entitlement:z.enum(['unverified','confirmed-api-access']).default('unverified'),estimatedMaxChargeMicros:z.number().int().positive().max(1_000_000_000)}).strict();
export const ImportTtsSchema=z.object({schemaVersion:z.literal('1.0'),provider:z.literal('local-import'),text,voiceLabel:z.string().min(1).max(100),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/),mediaType:z.enum(['audio/mpeg','audio/wav','audio/flac'])}).strict();
export const TtsSpecSchema=z.discriminatedUnion('provider',[RemoteTtsSchema,ImportTtsSchema]);
export type RemoteTtsSpec=z.infer<typeof RemoteTtsSchema>;
export type TtsSpec=z.infer<typeof TtsSpecSchema>;
/** Secrets, entitlement assertions and spend caps do not enter the synthesis cache identity. */
export function ttsInput(spec:TtsSpec){return spec.provider==='elevenlabs'?{provider:spec.provider,adapterVersion:TTS_ADAPTER_VERSION,text:spec.text,voiceId:spec.voiceId,modelId:spec.modelId,voiceSettings:spec.voiceSettings,outputFormat:spec.outputFormat}:{provider:spec.provider,adapterVersion:'local-import-v1',text:spec.text,voiceLabel:spec.voiceLabel,sourceSha256:spec.sourceSha256,mediaType:spec.mediaType};}
export function ttsFingerprint(spec:TtsSpec){return sha256(canonical(ttsInput(spec)));}
export type TtsAudio={bytes:Buffer;mediaType:'audio/mpeg';requestId:string|null};
export interface TtsProvider {synthesize(spec:RemoteTtsSpec,key:string,signal:AbortSignal):Promise<TtsAudio>}
export type TtsTransport=(url:string,init:RequestInit)=>Promise<Response>;
async function abortable<T>(work:Promise<T>,signal:AbortSignal):Promise<T>{
 checkAbort(signal);let onAbort!:()=>void;const cancelled=new Promise<never>((_r,reject)=>{onAbort=()=>reject(new EngineError('TTS_TIMEOUT','Speech request cancelled or timed out'));signal.addEventListener('abort',onAbort,{once:true});});
 try{return await Promise.race([work,cancelled]);}finally{signal.removeEventListener('abort',onAbort);}
}
/** Official endpoint only. No retries: dispatch failures may already have consumed credits. */
export class ElevenLabsProvider implements TtsProvider {
 constructor(private transport:TtsTransport=fetch){}
 async synthesize(spec:RemoteTtsSpec,key:string,signal:AbortSignal):Promise<TtsAudio>{
  checkAbort(signal);const bounded=AbortSignal.any([signal,AbortSignal.timeout(60_000)]);
  const url=`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(spec.voiceId)}?output_format=${spec.outputFormat}`;
  let response:Response;
  try{response=await abortable(this.transport(url,{method:'POST',redirect:'error',signal:bounded,headers:{'xi-api-key':key,'Content-Type':'application/json',Accept:'audio/mpeg'},body:JSON.stringify({text:spec.text,model_id:spec.modelId,voice_settings:spec.voiceSettings})}),bounded);}
  catch{throw new EngineError('TTS_NETWORK','Speech dispatch failed or timed out; provider charge is unknown. No automatic replay.');}
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw new EngineError('TTS_HTTP',`Speech provider returned HTTP ${response.status}; charge remains unknown. No automatic replay.`);}
  if(response.headers.get('content-type')?.split(';')[0]?.trim()!=='audio/mpeg'){void response.body?.cancel().catch(()=>{});throw new EngineError('TTS_MEDIA','Speech provider returned an unexpected media type');}
  const declared=response.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>25_000_000)){void response.body?.cancel().catch(()=>{});throw new EngineError('TTS_SIZE','Speech audio declares an invalid or excessive size');}
  const reader=response.body?.getReader();if(!reader)throw new EngineError('TTS_EMPTY','Speech provider returned no audio body');
  const parts:Uint8Array[]=[];let size=0;
  try{for(;;){checkAbort(bounded);const chunk=await abortable(reader.read(),bounded);if(chunk.done)break;size+=chunk.value.length;if(size>25_000_000)throw new EngineError('TTS_SIZE','Speech audio exceeds 25 MB');parts.push(chunk.value);}checkAbort(bounded);}
  catch(e){void reader.cancel().catch(()=>{});if(e instanceof EngineError)throw e;throw new EngineError('TTS_NETWORK','Speech body interrupted; provider charge is unknown. No automatic replay.');}
  finally{reader.releaseLock();}
  if(!size)throw new EngineError('TTS_EMPTY','Speech provider returned empty audio');
  const raw=response.headers.get('request-id')??response.headers.get('x-request-id');
  return{bytes:Buffer.concat(parts),mediaType:'audio/mpeg',requestId:raw&&/^[A-Za-z0-9_.:-]{1,200}$/.test(raw)?raw:null};
 }
}
