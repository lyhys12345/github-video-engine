import {EngineError} from '../core/errors.js';
import {generateHuihui} from '../tts/huihui.js';
import {importHuihuiTts} from '../tts/runtime.js';

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
 const measurements:Measurement[]=[];
 for(const speech of config.speech){
  const scene=plan.scenes.find((s:any)=>s.id===speech.sceneId);
  if(!scene||scene.execution.kind!=='supported-story')throw new EngineError('NARRATIVE_SPEECH','Cannot measure speech for an unproduced evidence/adapter scene.');
  const generation=await generateHuihui({schemaVersion:'tts-huihui/1.0',text:scene.narration},data,signal);
  const imported=await importHuihuiTts(data,generation.taskId,signal);
  measurements.push({sceneId:scene.id,samples:generation.manifest.audio.samples*3,generationTaskId:generation.taskId,receiptFingerprint:imported.fingerprint,generation:generation.cached,import:imported.cached});
 }
 return narrativeSpeechTiming(config.selection,measurements);
}
