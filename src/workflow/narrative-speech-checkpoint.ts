import {narrativeCaptionTiming,captionSafeLines} from './narrative-caption-timing.js';
import {sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';
import {generateHuihui} from '../tts/huihui.js';
import {importHuihuiTts} from '../tts/runtime.js';
import {requireNarrationVoice} from './narration-voice-policy.js';

type Selection={kind:string;sceneId:string;frames?:number;slices?:{shotId:string;startFrame:number;endFrame:number}[]};
type Measurement={sceneId:string;samples:number;generationTaskId:string;receiptFingerprint:string;generation:boolean;import:boolean};

/** Arithmetic over measured whole recordings. Never edits the author's timing. */
export function narrativeSpeechTiming(selection:Selection[],measurements:Measurement[]){
 const ids=measurements.map(m=>m.sceneId);
 if(new Set(ids).size!==ids.length)throw new EngineError('NARRATIVE_SPEECH','Duplicate recording measurement.');
 const produced=selection.filter(s=>s.kind==='story-slice');
 if(produced.length!==ids.length||produced.some(s=>!ids.includes(s.sceneId)))throw new EngineError('NARRATIVE_SPEECH','Every produced scene needs one exact measurement; gaps cannot have speech.');
 const allocated=(s:Selection)=>s.kind==='placeholder'?s.frames!:s.slices!.reduce((n,x)=>n+x.endFrame-x.startFrame,0);
 const totalFrames=60+selection.reduce((n,s)=>n+allocated(s),0);
 const scenes=produced.map(s=>{const m=measurements.find(m=>m.sceneId===s.sceneId)!;
  if(!Number.isSafeInteger(m.samples)||m.samples<=0)throw new EngineError('NARRATIVE_SPEECH','Invalid measured recording sample count.');
  const allocatedFrames=allocated(s),minimumRecordingFrames=Math.ceil(m.samples/1600),additionalFramesNeeded=Math.max(0,minimumRecordingFrames-allocatedFrames);
  return{...m,sampleRate:48000,seconds:m.samples/48000,allocatedFrames,minimumRecordingFrames,additionalFramesNeeded,fits:additionalFramesNeeded===0,shotIds:s.slices!.map(x=>x.shotId)};
 });
 const minimumFramesIfOnlyExtending=totalFrames+scenes.reduce((n,s)=>n+s.additionalFramesNeeded,0);
 return{schemaVersion:'repository-narrative-speech-timing/1.0',fps:30,totalFrames,seconds:totalFrames/30,allRecordingsFit:scenes.every(s=>s.fits),minimumFramesIfOnlyExtending,extensionFitsBudget:minimumFramesIfOnlyExtending<=9000,scenes,
  policy:'Measured complete original-speed local recordings; no animation rendered, no automatic timing edits, padding, trimming or stretching. Caption alignment and listening remain unverified.',
  owningFiles:['story.json: shot visualSeconds/holdSeconds/transitionSeconds','run.json: exact whole-shot selection ranges','narrative.json: explicit estimatedSeconds if revised'],
  nextAction:'The session Agent explicitly revises timing or shortens its script, preserves this candidate and reruns. Do not ask the user to edit JSON. No model was dispatched or approval granted.'};
}

export async function measureNarrativeSpeech(data:string,plan:any,config:any,signal:AbortSignal){
 requireNarrationVoice();
 const measurements:Measurement[]=[],captionChecks:any[]=[];
 const requested=config.speech.map((s:any)=>s.sceneId),produced=config.selection.filter((s:any)=>s.kind==='story-slice').map((s:any)=>s.sceneId);
 for(const speech of config.speech){const scene=plan.scenes.find((s:any)=>s.id===speech.sceneId);if(!scene||scene.execution.kind!=='supported-story')throw new EngineError('NARRATIVE_SPEECH','Cannot measure speech for an unproduced evidence/adapter scene.');}
 if(new Set(requested).size!==requested.length||JSON.stringify(requested)!==JSON.stringify(produced))throw new EngineError('NARRATIVE_SPEECH','Supply each produced scene exactly once in selection order before generating speech.');
 for(const speech of config.speech){
  const scene=plan.scenes.find((s:any)=>s.id===speech.sceneId);
  if(!scene||scene.execution.kind!=='supported-story')throw new EngineError('NARRATIVE_SPEECH','Cannot measure speech for an unproduced evidence/adapter scene.');
  const generation=await generateHuihui({schemaVersion:'tts-huihui/1.0',text:scene.narration},data,signal);
  const imported=await importHuihuiTts(data,generation.taskId,signal);
  const samples=generation.manifest.audio.samples*3;
  if(speech.captions){try{const clip={beatId:scene.id,receiptFingerprint:imported.fingerprint,receiptSha256:imported.receiptArtifact.sha256,sourceAudioSha256:imported.receipt.artifact.sha256,transcript:scene.narration,transcriptSha256:sha256(scene.narration),startOffsetFrames:0,captions:speech.captions.map((c:any)=>({...c,endSample:c.endSample==='$FULL_RECORDING_SAMPLES'?samples:c.endSample}))},validated=narrativeCaptionTiming(scene,{startFrame:0,endFrame:Math.ceil(samples/1600)},clip,samples);for(const cue of validated.captions)captionSafeLines(cue.transcript);captionChecks.push({sceneId:scene.id,status:'valid',transcriptSha256:clip.transcriptSha256,receiptFingerprint:imported.fingerprint,captionCount:validated.captions.length,cues:validated.captions,timing:'caller-authored clip-relative; not word alignment'});}catch(error){captionChecks.push({sceneId:scene.id,status:'invalid',transcriptSha256:sha256(scene.narration),receiptFingerprint:imported.fingerprint,error:String(error)});}}
  else captionChecks.push({sceneId:scene.id,status:'not-provided',error:'Exact caller-authored caption ranges are required before animation.'});
  measurements.push({sceneId:scene.id,samples:generation.manifest.audio.samples*3,generationTaskId:generation.taskId,receiptFingerprint:imported.fingerprint,generation:generation.cached,import:imported.cached});
 }
 const timing=narrativeSpeechTiming(config.selection,measurements),captionsValid=captionChecks.every(c=>c.status==='valid');
 return {...timing,schemaVersion:'repository-narrative-speech-timing/1.1',captionValidation:{status:captionsValid?'valid':'needs-author-revision',scenes:captionChecks,scope:'Existing30fps caption validators over measured complete recording samples; no resegmentation or alignment claim.'},readyForAnimation:timing.allRecordingsFit&&captionsValid};
}
