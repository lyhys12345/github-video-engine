import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {z} from 'zod';
import {Hash} from '../contracts/video.js';
import {EngineError} from '../core/errors.js';
import {sha256} from '../core/util.js';
import {decodeClipSamples} from '../presentation/narration.js';
import {generateHuihui} from '../tts/huihui.js';
import {importHuihuiTts, readLocalTts} from '../tts/runtime.js';
import {generateLocalChen} from '../tts/local-chen.js';
import {requireNarrationVoice, type LocalNarrationVoice} from './narration-voice-policy.js';

export const ImportedRecording = z.strictObject({
 receiptFingerprint:Hash, receiptSha256:Hash, sourceAudioSha256:Hash, transcriptSha256:Hash,
});
type RecordingBinding = z.infer<typeof ImportedRecording>;
export type NarrationSource = {mode:'local'; profile:LocalNarrationVoice} | {mode:'imported'; voiceLabel:string};

export async function synthesizeNarration(text:string,data:string,signal:AbortSignal,selected=requireNarrationVoice()){
 if(selected==='anna-local')return generateLocalChen(text,data,signal,'anna-local');
 if(selected==='chen-local')return generateLocalChen(text,data,signal);
 const generation=await generateHuihui({schemaVersion:'tts-huihui/1.0',text},data,signal);
 const imported=await importHuihuiTts(data,generation.taskId,signal);
 return{generation,imported};
}

/** Receipts attest to the caller's declared exact text and voice label; appearance and enunciation require human review. */
export async function verifyImportedRecording(data:string,transcript:string,voiceLabel:string,raw:RecordingBinding,signal:AbortSignal):Promise<Awaited<ReturnType<typeof readLocalTts>>>{
 const binding=ImportedRecording.parse(raw);
 if(binding.transcriptSha256!==sha256(transcript))throw new EngineError('NARRATION_IMPORT_TRANSCRIPT','The finished recording transcript hash differs from the current authored scene.');
 const source=await readLocalTts(data,binding.receiptFingerprint,signal);
 const input=source.receipt.input as {adapterVersion?:string};
 if(input.adapterVersion!=='local-import-v1'||source.input.mediaType!=='audio/wav'||source.input.text!==transcript||
  source.input.voiceLabel!==voiceLabel||source.receiptArtifact.sha256!==binding.receiptSha256||source.receipt.artifact.sha256!==binding.sourceAudioSha256){
  throw new EngineError('NARRATION_IMPORT_RECEIPT','Expected the declared finished WAV, voice label, exact text and original receipt hashes for this scene.');
 }
 return source;
}

export async function prepareNarrativeRecording(scene:{id:string;narration:string},binding:RecordingBinding|undefined,data:string,signal:AbortSignal,voice:NarrationSource){
 const transcript=scene.narration,transcriptSha256=sha256(transcript);
 if(voice.mode==='imported'){
  if(!binding)throw new EngineError('NARRATION_IMPORT_RECEIPT','Every produced scene needs an exact finished WAV receipt.');
  const source=await verifyImportedRecording(data,transcript,voice.voiceLabel,binding,signal);
  const work=await mkdtemp(join(tmpdir(),'gve-narration-import-'));
  try{
   const pcm=await decodeClipSamples(source,work,0,300*48000,signal);
   if(!pcm.length||pcm.length%2||!pcm.some(byte=>byte!==0)){
    throw new EngineError('NARRATION_IMPORT_MEDIA','The finished WAV must decode to nonempty audio with a nonzero sample.');
   }
   return {samples:pcm.length/2,generationTaskId:null, generation:false, import:true, source:'imported' as const,
    clip:{beatId:scene.id,...binding,transcript,startOffsetFrames:0}};
  }finally{await rm(work,{recursive:true,force:true});}
 }
 if(binding)throw new EngineError('NARRATION_IMPORT_RECEIPT','Finished WAV receipt bindings require the approved imported narration mode.');
 const {generation,imported}=await synthesizeNarration(transcript,data,signal,voice.profile);
 return {samples:generation.manifest.audio.samples*3,generationTaskId:generation.taskId,generation:generation.cached,
  import:imported.cached,source:'generated' as const,
  clip:{beatId:scene.id,receiptFingerprint:imported.fingerprint,receiptSha256:imported.receiptArtifact.sha256,
   sourceAudioSha256:imported.receipt.artifact.sha256,transcript,transcriptSha256,startOffsetFrames:0}};
}
