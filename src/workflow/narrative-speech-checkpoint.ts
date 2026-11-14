import {narrativeCaptionTiming,captionSafeLines} from './narrative-caption-timing.js';
import {EngineError} from '../core/errors.js';
import {NARRATIVE_DEFAULT_LEAD_FRAMES} from '../contracts/narrative.js';
import {prepareNarrativeRecording,type NarrationSource} from './narration-voice.js';
import {fontBytes} from './narrative-preview.js';
import {PORTRAIT_STYLE,portraitCaptionLines} from './narrative-portrait.js';
import {requireNarrationVoice} from './narration-voice-policy.js';

type Selection={kind:string;sceneId:string;frames?:number;slices?:{shotId:string;startFrame:number;endFrame:number}[]};
type Measurement={sceneId:string;samples:number;generationTaskId:string|null;receiptFingerprint:string;generation:boolean;import:boolean;source?:'generated'|'imported'};
type RhythmPolicy={maxUnnarratedTailFrames:number;leadFrames?:number};
const FPS=30,SAMPLE_RATE=48000,SAMPLES_PER_FRAME=SAMPLE_RATE/FPS;

/** Arithmetic over measured whole recordings. Never edits the author's timing. */
export function narrativeSpeechTiming(selection:Selection[],measurements:Measurement[],rhythmPolicy?:RhythmPolicy){
 const ids=measurements.map(m=>m.sceneId);
 if(new Set(ids).size!==ids.length)throw new EngineError('NARRATIVE_SPEECH','Duplicate recording measurement.');
 const produced=selection.filter(s=>s.kind==='story-slice');
 if(produced.length!==ids.length||produced.some(s=>!ids.includes(s.sceneId)))throw new EngineError('NARRATIVE_SPEECH','Every produced scene needs one exact measurement; gaps cannot have speech.');
 const allocated=(s:Selection)=>s.kind==='placeholder'?s.frames!:s.slices!.reduce((n,x)=>n+x.endFrame-x.startFrame,0);
 const leadFrames=rhythmPolicy?.leadFrames??NARRATIVE_DEFAULT_LEAD_FRAMES;
 let totalFrames=leadFrames;
 const intentionalSilence:({kind:'lead'|'placeholder';sceneId?:string;startFrame:number;endFrame:number})[]=[];
 if(leadFrames>0)intentionalSilence.push({kind:'lead',startFrame:0,endFrame:leadFrames});
 const scenes=[];
 for(const s of selection){
  const startFrame=totalFrames,allocatedFrames=allocated(s),endFrame=startFrame+allocatedFrames;
  totalFrames=endFrame;
  if(s.kind==='placeholder'){
   intentionalSilence.push({kind:'placeholder',sceneId:s.sceneId,startFrame,endFrame});
   continue;
  }
  const m=measurements.find(m=>m.sceneId===s.sceneId)!;
  if(!Number.isSafeInteger(m.samples)||m.samples<=0)throw new EngineError('NARRATIVE_SPEECH','Invalid measured recording sample count.');
  const minimumRecordingFrames=Math.ceil(m.samples/SAMPLES_PER_FRAME);
  const additionalFramesNeeded=Math.max(0,minimumRecordingFrames-allocatedFrames);
  const unnarratedTailSamples=Math.max(0,allocatedFrames*SAMPLES_PER_FRAME-m.samples);
  scenes.push({...m,sampleRate:SAMPLE_RATE,seconds:m.samples/SAMPLE_RATE,allocatedFrames,minimumRecordingFrames,
   additionalFramesNeeded,fits:additionalFramesNeeded===0,shotIds:s.slices!.map(x=>x.shotId),startFrame,endFrame,
   recordingEndSample:startFrame*SAMPLES_PER_FRAME+m.samples,unnarratedTailSamples});
 }
 const minimumFramesIfOnlyExtending=totalFrames+scenes.reduce((n,s)=>n+s.additionalFramesNeeded,0);
 const violations=rhythmPolicy?scenes.flatMap(scene=>{
  const excessSamples=scene.unnarratedTailSamples-rhythmPolicy.maxUnnarratedTailFrames*SAMPLES_PER_FRAME;
  return excessSamples>0?[{sceneId:scene.sceneId,excessSamples,framesToRemove:Math.ceil(excessSamples/SAMPLES_PER_FRAME)}]:[];
 }):[];
 return{schemaVersion:'repository-narrative-speech-timing/1.0',fps:FPS,totalFrames,seconds:totalFrames/FPS,allRecordingsFit:scenes.every(s=>s.fits),minimumFramesIfOnlyExtending,extensionFitsBudget:minimumFramesIfOnlyExtending<=9000,scenes,
  rhythm:{schemaVersion:'repository-narrative-rhythm/1.0',status:rhythmPolicy?(violations.length?'needs-author-revision':'within-limit'):'diagnostics-only',
   leadFrames,maxUnnarratedTailFrames:rhythmPolicy?.maxUnnarratedTailFrames??null,violations,intentionalSilence,
   scope:'Half-open timeline frames. Scene tails count timeline samples after the complete recording ends. Silence within a recording, speech alignment and listening are unchecked.'},
  policy:'Measured complete original-speed recordings; no animation rendered, no automatic timing edits, padding, trimming or stretching. Caption alignment and listening remain unverified.',
  owningFiles:['story.json: shot visualSeconds/holdSeconds/transitionSeconds','run.json: exact whole-shot selection ranges','narrative.json: explicit estimatedSeconds if revised'],
  nextAction:'The session Agent explicitly revises timing or shortens its script, preserves this candidate and reruns. Do not ask the user to edit JSON. No model was dispatched or approval granted.'};
}

export async function measureNarrativeSpeech(data:string,plan:any,config:any,signal:AbortSignal,
 voice:NarrationSource={mode:'local',profile:requireNarrationVoice()},recordings?:Map<string,Awaited<ReturnType<typeof prepareNarrativeRecording>>>){
 const measurements:Measurement[]=[],captionChecks:any[]=[];
 const requested=config.speech.map((s:any)=>s.sceneId),produced=config.selection.filter((s:any)=>s.kind==='story-slice').map((s:any)=>s.sceneId);
 for(const speech of config.speech){const scene=plan.scenes.find((s:any)=>s.id===speech.sceneId);if(!scene||scene.execution.kind!=='supported-story')throw new EngineError('NARRATIVE_SPEECH','Cannot measure speech for an unproduced evidence/adapter scene.');}
 if(new Set(requested).size!==requested.length||JSON.stringify(requested)!==JSON.stringify(produced))throw new EngineError('NARRATIVE_SPEECH','Supply each produced scene exactly once in selection order before generating speech.');
 const portraitFont=config.portraitStyle===PORTRAIT_STYLE?await fontBytes():undefined;
 for(const speech of config.speech){
  const scene=plan.scenes.find((s:any)=>s.id===speech.sceneId);
  if(!scene||scene.execution.kind!=='supported-story')throw new EngineError('NARRATIVE_SPEECH','Cannot measure speech for an unproduced evidence/adapter scene.');
  const recording=await prepareNarrativeRecording(scene,speech.recording,data,signal,voice);
  recordings?.set(scene.id,recording);
  const {samples,clip:base,generationTaskId,generation,import:imported,source}=recording;
  if(speech.captions){try{const clip={...base,captions:speech.captions.map((c:any)=>({...c,endSample:c.endSample==='$FULL_RECORDING_SAMPLES'?samples:c.endSample}))},validated=narrativeCaptionTiming(scene,{startFrame:0,endFrame:Math.ceil(samples/1600)},clip,samples);if(portraitFont)portraitCaptionLines(portraitFont,validated.captions.map(cue=>cue.transcript));else for(const cue of validated.captions)captionSafeLines(cue.transcript);captionChecks.push({sceneId:scene.id,status:'valid',transcriptSha256:clip.transcriptSha256,receiptFingerprint:base.receiptFingerprint,captionCount:validated.captions.length,cues:validated.captions,timing:'caller-authored clip-relative; not word alignment'});}catch(error){captionChecks.push({sceneId:scene.id,status:'invalid',transcriptSha256:base.transcriptSha256,receiptFingerprint:base.receiptFingerprint,error:String(error)});}}
  else captionChecks.push({sceneId:scene.id,status:'not-provided',error:'Exact caller-authored caption ranges are required before animation.'});
  measurements.push({sceneId:scene.id,samples,generationTaskId,receiptFingerprint:base.receiptFingerprint,generation,import:imported,source});
 }
 const timing=narrativeSpeechTiming(config.selection,measurements,config.rhythm),captionsValid=captionChecks.every(c=>c.status==='valid');
 return {...timing,schemaVersion:'repository-narrative-speech-timing/1.1',captionValidation:{status:captionsValid?'valid':'needs-author-revision',scenes:captionChecks,scope:'Existing30fps caption validators over measured complete recording samples; no resegmentation or alignment claim.'},readyForAnimation:timing.allRecordingsFit&&timing.rhythm.status!=='needs-author-revision'&&captionsValid};
}
