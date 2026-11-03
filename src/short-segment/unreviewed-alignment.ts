import {z} from 'zod';
import {sha256,canonical} from '../core/util.js';
import type {VisualPlan,SegmentTimeline} from './plan.js';

const hash=z.string().regex(/^[a-f0-9]{64}$/),finite=z.number().finite(),seconds=finite.nonnegative().max(60),index=z.number().int().nonnegative().max(10000);
const Offset=z.object({text:z.string().min(1).max(5000),codepointStart:index,codepointEnd:index,utf8Start:z.number().int().nonnegative().max(20000),utf8End:z.number().int().nonnegative().max(20000)}).strict();
const Phase=z.object({index:index,label:z.string().max(45),text:z.string().min(1).max(5000),captionTextSha256:hash,codepointStart:index,codepointEnd:index,firstToken:index,lastToken:index}).strict();
const Item=z.object({text:z.string().min(1).max(5000),startSeconds:seconds,endSeconds:seconds}).strict();
const Gap=z.object({leftItem:index,rightItem:index,startSeconds:seconds,endSeconds:seconds,durationSeconds:seconds}).strict();
const Cut=z.object({afterPhase:index,leftItem:index,rightItem:index,leftEndSeconds:seconds,rightStartSeconds:seconds,cutSeconds:seconds,policy:z.literal('midpoint of [last-left-token end, first-right-token start]'),gapSeconds:seconds}).strict();
const Flag=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('zero-duration-item'),itemIndex:index,seconds}).strict(),
 z.object({kind:z.literal('prospective-cue-under-four-frames'),phaseIndex:index,fps:z.literal(30),durationFrames:z.number().int().max(3)}).strict(),
]);
const Repair=z.object({index,rawMilliseconds:finite.nonnegative().max(600000),repairedMilliseconds:finite.nonnegative().max(600000),deltaMilliseconds:finite.min(-600000).max(600000)}).strict();
const Pcm=z.object({path:z.literal('decoded.wav'),sha256:hash,pcmSha256:hash,frames:z.number().int().positive().max(960000),sampleRate:z.literal(16000),channels:z.literal(1),sampleWidthBytes:z.literal(2),durationSeconds:seconds,fullDecode:z.literal('PASS'),trimmed:z.literal(false),retimed:z.literal(false)}).strict();
const Resolution=z.object({modelTimestampSegmentTimeMilliseconds:z.literal(80),rawClassifierResolutionSeconds:z.literal(.08),upstreamRepairOutputUnit:z.literal('integer milliseconds'),returnedItemsDisplayDecimalPlaces:z.literal(3),note:z.string().min(1).max(500)}).strict();
const Tool=z.object({path:z.string().min(1).max(4096),sha256:hash}).strict();
/** Full proposal input, deliberately separate from reviewed timing schema 1.1. */
export const UnreviewedAlignmentDraftSchema=z.object({
 bindings:z.object({model_lockSha256:hash,runtime_lockSha256:hash,receiptSha256:hash,audioSha256:hash,planSha256:hash,scriptSha256:hash,helperSha256:hash,textSha256:hash,captionTextSha256:z.array(hash).min(2).max(32),audioBytes:z.number().int().positive().max(50000000),canonicalMeasuredSeconds:seconds,modelRepository:z.literal('mlx-community/Qwen3-ForcedAligner-0.6B-8bit'),modelRevision:z.literal('0e1a68e91d815300c7c9754b2a7639378b23db15'),recording:z.enum(['rea','rembg'])}).strict(),
 sourceAudio:z.object({path:z.literal('source-original.mp3'),sha256:hash,bytes:z.number().int().positive().max(50000000),containerDurationSeconds:seconds}).strict(),
 decodedAudio:Pcm,containerMinusPcmSeconds:finite.min(-.005).max(.005),
 commands:z.object({probe:z.array(z.string().max(4096)).min(1).max(40),decode:z.array(z.string().max(4096)).min(1).max(40)}).strict(),tools:z.object({ffprobe:Tool,ffmpeg:Tool}).strict(),
 schemaVersion:z.literal('local-forced-alignment-draft/1.0'),status:z.literal('PROPOSED_UNREVIEWED'),renderable:z.literal(false),independentTimingReview:z.literal('UNVERIFIED'),speechContentReview:z.literal('UNVERIFIED'),ownerAcceptance:z.literal('pending'),method:z.literal('local-forced-alignment-proposal'),language:z.literal('Chinese'),remoteProviderCalls:z.literal(0),providerChargeUsd:z.literal(0),modelSynthesizedAudio:z.literal(false),
 networkIsolation:z.object({os:z.literal('macOS sandbox-exec deny network*'),probe:z.literal('local bind rejected'),workerGuard:z.literal('current-process bind rejected before audit/preflight/import'),pythonAudit:z.literal('supplemental')}).strict(),
 tokenLedger:z.object({tokens:z.array(Offset).min(1).max(5000),discardedSeparators:z.array(Offset).max(5000),normalization:z.literal('none; exact case, Unicode and number spelling retained')}).strict(),phases:z.array(Phase).min(2).max(32),postprocessedItems:z.array(Item).min(1).max(5000),
 assessment:z.object({errors:z.array(z.string().max(500)).max(0),flags:z.array(Flag).max(5032),gaps:z.array(Gap).max(4999),cuts:z.array(Cut).min(1).max(31),boundariesSeconds:z.array(seconds).min(3).max(33),prospectiveCueFramesAt30Fps:z.array(z.object({phaseIndex:index,fps:z.literal(30),roundedSourceStartFrame:index,roundedSourceEndFrame:index,durationFrames:index}).strict()).min(2).max(32),prospectiveFramePolicy:z.string().min(1).max(300),coverageEndpoints:z.string().min(1).max(300),tokenMatchMeaning:z.string().min(1).max(300),timestampRepairs:z.array(Repair).max(10000)}).strict(),
 boundaryAuditions:z.array(z.object({path:z.string().regex(/^auditions\/boundary-\d{2}\.wav$/),sha256:hash,sourceClipStartFrame:z.number().int().nonnegative().max(960000),sourceClipEndFrame:z.number().int().nonnegative().max(960000),sourceClipStartSeconds:seconds,sourceClipEndSeconds:seconds,cutRelativeSample:z.number().int().nonnegative().max(48000),proposedCutSeconds:seconds,quantizedCutSeconds:seconds,leftText:z.string().max(5000),rightText:z.string().max(5000)}).strict()).min(1).max(31),
 processorFileSha256:hash,timestampResolution:Resolution,elapsedSeconds:finite.nonnegative().max(1200),technicalValidationOnly:z.string().min(1).max(1000),
}).strict();
export type AlignmentPcmIdentity={sha256:string;pcmSha256:string;frames:number;sampleRate:16000;channels:1;sampleWidthBytes:2;durationSeconds:number};
export type UnreviewedAlignmentBinding={voiceSha256:string;voiceBytes:number;planSha256:string;transcriptSha256:string;generationReceiptSha256:string;decodedAudio:AlignmentPcmIdentity};
function requireValue(ok:unknown,message:string):asserts ok{if(!ok)throw Error('Unreviewed alignment preview: '+message);}
function close(a:number,b:number){return Math.abs(a-b)<=1e-9;}
function same(actual:unknown,expected:unknown,message:string){requireValue(canonical(actual)===canonical(expected),message);}
function numericSame(actual:unknown,expected:unknown,message:string):void{
 if(typeof actual==='number'&&typeof expected==='number'){requireValue(close(actual,expected),message);return;}
 if(Array.isArray(actual)&&Array.isArray(expected)){requireValue(actual.length===expected.length,message);actual.forEach((v,i)=>numericSame(v,expected[i],message));return;}
 if(actual&&expected&&typeof actual==='object'&&typeof expected==='object'){
  const a=actual as Record<string,unknown>,b=expected as Record<string,unknown>;same(Object.keys(a).sort(),Object.keys(b).sort(),message);for(const key of Object.keys(a))numericSame(a[key],b[key],message);return;
 }
 same(actual,expected,message);
}
function cjk(ch:string){const c=ch.codePointAt(0)!;return [[0x4e00,0x9fff],[0x3400,0x4dbf],[0x20000,0x2a6df],[0x2a700,0x2b73f],[0x2b740,0x2b81f],[0x2b820,0x2ceaf],[0xf900,0xfaff]].some(([a,b])=>c>=a!&&c<=b!);}
/** Exact codepoint clock, not JS UTF-16 indices; no text normalization. */
export function alignmentTokenLedger(text:string){
 const chars=Array.from(text),bytes=[0],tokens:z.infer<typeof Offset>[]=[],discardedSeparators:z.infer<typeof Offset>[]=[];let run:number[]=[];
 for(const ch of chars)bytes.push(bytes.at(-1)!+Buffer.byteLength(ch));
 const offset=(a:number,b:number)=>({text:chars.slice(a,b).join(''),codepointStart:a,codepointEnd:b,utf8Start:bytes[a]!,utf8End:bytes[b]!});
 const flush=()=>{if(run.length){tokens.push(offset(run[0]!,run.at(-1)!+1));run=[];}};
 chars.forEach((ch,i)=>{if(cjk(ch)){flush();tokens.push(offset(i,i+1));}else if(/[\p{L}\p{N}]/u.test(ch)||ch==="'")run.push(i);else if(/[\p{White_Space}\p{P}\u001c-\u001f]/u.test(ch)){flush();discardedSeparators.push(offset(i,i+1));}else throw Error('Unreviewed alignment preview: unsupported character at codepoint '+i);});flush();
 return {tokens,discardedSeparators,normalization:'none; exact case, Unicode and number spelling retained' as const};
}
/** Read the actual sibling WAV without a tool or model; unknown/truncated/extra-data formats fail closed. */
export function inspectAlignmentPcm(bytes:Buffer):AlignmentPcmIdentity{
 requireValue(bytes.length>=44&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE'&&bytes.readUInt32LE(4)+8===bytes.length,'invalid complete PCM RIFF');
 let format=false,payload:Buffer|undefined;
 for(let offset=12;offset<bytes.length;){requireValue(offset+8<=bytes.length,'truncated RIFF chunk');const size=bytes.readUInt32LE(offset+4),end=offset+8+size;requireValue(end<=bytes.length,'truncated PCM chunk');const kind=bytes.toString('ascii',offset,offset+4);
  if(kind==='fmt '){requireValue(!format&&size>=16&&bytes.readUInt16LE(offset+8)===1&&bytes.readUInt16LE(offset+10)===1&&bytes.readUInt32LE(offset+12)===16000&&bytes.readUInt32LE(offset+16)===32000&&bytes.readUInt16LE(offset+20)===2&&bytes.readUInt16LE(offset+22)===16,'PCM must be signed16 mono16k');format=true;}
  if(kind==='data'){requireValue(!payload&&size>0&&size%2===0,'invalid/duplicate PCM payload');payload=bytes.subarray(offset+8,end);}
  offset=end+(size%2);requireValue(offset<=bytes.length,'missing RIFF padding');
 }
 requireValue(format&&payload&&payload.length<=1920000,'missing/bounded PCM payload');
 const frames=payload.length/2;return{sha256:sha256(bytes),pcmSha256:sha256(payload),frames,sampleRate:16000,channels:1,sampleWidthBytes:2,durationSeconds:frames/16000};
}

/** Consume a raw proposal solely for a visibly unreviewed owner hearing preview. */
export function buildUnreviewedPreviewTimeline(plan:VisualPlan,measuredVoiceSeconds:number,rawDraft:unknown,binding:UnreviewedAlignmentBinding,draftSha256:string):SegmentTimeline{
 requireValue(plan.presentation==='continuous-explainer','continuous-explainer plan required');
 const draft=UnreviewedAlignmentDraftSchema.parse(rawDraft),text=plan.phases.map(p=>p.captionText).join(''),ledger=alignmentTokenLedger(text);
 requireValue(Array.from(text).length<=5000&&text.length>0,'bounded transcript required');
 requireValue(Number.isFinite(measuredVoiceSeconds)&&measuredVoiceSeconds>0&&measuredVoiceSeconds<=59,'source duration out of bounds');
 requireValue(hash.safeParse(draftSha256).success,'raw draft hash required');
 requireValue(draft.bindings.audioSha256===binding.voiceSha256&&draft.sourceAudio.sha256===binding.voiceSha256&&draft.bindings.audioBytes===binding.voiceBytes&&draft.sourceAudio.bytes===binding.voiceBytes,'exact voice hash/bytes required');
 requireValue(draft.bindings.planSha256===binding.planSha256,'exact plan bytes required');
 requireValue(draft.bindings.textSha256===binding.transcriptSha256&&sha256(text)===binding.transcriptSha256,'exact transcript hash required');
 requireValue(draft.bindings.receiptSha256===binding.generationReceiptSha256,'exact generation receipt required');
 same(draft.bindings.captionTextSha256,plan.phases.map(p=>sha256(p.captionText)),'ordered raw caption hashes required');
 requireValue(Math.abs(draft.sourceAudio.containerDurationSeconds-measuredVoiceSeconds)<=.005&&Math.abs(draft.bindings.canonicalMeasuredSeconds-measuredVoiceSeconds)<=.005,'probed source container duration mismatch');
 // Preserve the exact source clock rather than deriving it from a rounded display value.
 const sourceSeconds=draft.sourceAudio.containerDurationSeconds;
 const {path:_path,fullDecode:_decode,trimmed:_trimmed,retimed:_retimed,...recordedPcm}=draft.decodedAudio;
 numericSame(recordedPcm,binding.decodedAudio,'actual decoded PCM identity mismatch');
 requireValue(close(draft.decodedAudio.durationSeconds,draft.decodedAudio.frames/16000)&&close(draft.containerMinusPcmSeconds,sourceSeconds-draft.decodedAudio.durationSeconds),'container/PCM clock mismatch');
 same(draft.tokenLedger,ledger,'exact ordered token ledger/offsets required');
 let consumed=0;
 const phases=plan.phases.map((phase,i)=>{const start=consumed,end=start+Array.from(phase.captionText).length;consumed=end;requireValue(!ledger.tokens.some(t=>t.codepointStart<end&&end<t.codepointEnd),'phase boundary inside token');const indices=ledger.tokens.flatMap((t,n)=>t.codepointStart>=start&&t.codepointEnd<=end?[n]:[]);requireValue(indices.length,'phase without tokens');return{index:i,label:phase.label,text:phase.captionText,captionTextSha256:sha256(phase.captionText),codepointStart:start,codepointEnd:end,firstToken:indices[0]!,lastToken:indices.at(-1)!};});
 same(draft.phases,phases,'exact phase text/hash/index/offset mapping required');
 same(draft.postprocessedItems.map(i=>i.text),ledger.tokens.map(t=>t.text),'ordered postprocessed token texts required');
 const flags:z.infer<typeof Flag>[]=[],gaps:z.infer<typeof Gap>[]=[];
 draft.postprocessedItems.forEach((item,n)=>{requireValue(item.startSeconds<=item.endSeconds&&item.endSeconds<=Math.min(sourceSeconds,draft.decodedAudio.durationSeconds),'reversed/out-of-range span');if(item.startSeconds===item.endSeconds)flags.push({kind:'zero-duration-item',itemIndex:n,seconds:item.startSeconds});if(n){const previous=draft.postprocessedItems[n-1]!;requireValue(item.startSeconds>=previous.endSeconds,'overlap/reordered spans');if(item.startSeconds>previous.endSeconds)gaps.push({leftItem:n-1,rightItem:n,startSeconds:previous.endSeconds,endSeconds:item.startSeconds,durationSeconds:item.startSeconds-previous.endSeconds});}});
 const cuts=phases.slice(0,-1).map(p=>{const left=draft.postprocessedItems[p.lastToken]!,right=draft.postprocessedItems[p.lastToken+1]!;return{afterPhase:p.index,leftItem:p.lastToken,rightItem:p.lastToken+1,leftEndSeconds:left.endSeconds,rightStartSeconds:right.startSeconds,cutSeconds:(left.endSeconds+right.startSeconds)/2,policy:'midpoint of [last-left-token end, first-right-token start]' as const,gapSeconds:right.startSeconds-left.endSeconds};});
 const boundaries=[0,...cuts.map(c=>c.cutSeconds),sourceSeconds];
 requireValue(boundaries.every((b,i)=>Number.isFinite(b)&&(i===0||b>boundaries[i-1]!)),'strictly increasing finite midpoint cuts required');
 numericSame(draft.assessment.cuts,cuts,'cut anchor/midpoint/gap mismatch');numericSame(draft.assessment.boundariesSeconds,boundaries,'assessment boundaries mismatch');numericSame(draft.assessment.gaps,gaps,'gap evidence mismatch');
 const fps=30,voiceStartFrame=12,voiceEndFrame=voiceStartFrame+Math.ceil(measuredVoiceSeconds*fps),totalFrames=voiceEndFrame+18;
 requireValue(!plan.durationBounds||(totalFrames/fps>=plan.durationBounds.minSeconds&&totalFrames/fps<=plan.durationBounds.maxSeconds),'outside authored duration bounds');
 const prospective=phases.map((p,i)=>{const start=Math.round(boundaries[i]!*fps),end=i===phases.length-1?Math.ceil(sourceSeconds*fps):Math.round(boundaries[i+1]!*fps);if(end-start<4)flags.push({kind:'prospective-cue-under-four-frames',phaseIndex:i,fps:30,durationFrames:end-start});return{phaseIndex:i,fps:30 as const,roundedSourceStartFrame:start,roundedSourceEndFrame:end,durationFrames:end-start};});
 numericSame(draft.assessment.flags,flags,'zero-duration/short-cue flags mismatch');numericSame(draft.assessment.prospectiveCueFramesAt30Fps,prospective,'prospective frame evidence mismatch');
 let previousRepair=-1;
 for(const repair of draft.assessment.timestampRepairs){
  const item=draft.postprocessedItems[Math.floor(repair.index/2)],returned=item?(repair.index%2?item.endSeconds:item.startSeconds):NaN;
  requireValue(repair.index>previousRepair&&repair.index<ledger.tokens.length*2&&close(repair.repairedMilliseconds-repair.rawMilliseconds,repair.deltaMilliseconds)&&repair.deltaMilliseconds!==0&&close(repair.repairedMilliseconds,returned*1000),'invalid timestamp repair evidence');previousRepair=repair.index;
 }
 requireValue(draft.boundaryAuditions.length===cuts.length,'boundary audition coverage mismatch');
 for(const [i,clip] of draft.boundaryAuditions.entries()){const cut=cuts[i]!,sample=Math.round(cut.cutSeconds*16000),start=Math.max(0,sample-24000),end=Math.min(draft.decodedAudio.frames,sample+24000);requireValue(clip.path===`auditions/boundary-${String(i+1).padStart(2,'0')}.wav`&&clip.sourceClipStartFrame===start&&clip.sourceClipEndFrame===end&&clip.cutRelativeSample===sample-start&&close(clip.sourceClipStartSeconds,start/16000)&&close(clip.sourceClipEndSeconds,end/16000)&&close(clip.proposedCutSeconds,cut.cutSeconds)&&close(clip.quantizedCutSeconds,sample/16000)&&clip.leftText===phases[i]!.text&&clip.rightText===phases[i+1]!.text,'audition source clock mismatch');}
 const confidence='forced-alignment-proposal-unverified-by-listening' as const;
 const cues=plan.phases.map((p,i)=>{const startFrame=voiceStartFrame+Math.round(boundaries[i]!*fps),endFrame=i===phases.length-1?voiceEndFrame:voiceStartFrame+Math.round(boundaries[i+1]!*fps);requireValue(endFrame-startFrame>=4,'cue under four frames');return{index:i,label:p.label,text:p.captionText,startFrame,endFrame,startSeconds:startFrame/fps,endSeconds:endFrame/fps,sourceStartSeconds:boundaries[i]!,sourceEndSeconds:boundaries[i+1]!,confidence};});
 return{fps,totalFrames,measuredVoiceSeconds,voiceStartFrame,voiceEndFrame,cueMethod:'local-forced-alignment-proposal-unreviewed-preview',purpose:'owner-review-preview',independentTimingReview:'UNVERIFIED',speechContentReview:'UNVERIFIED',ownerAcceptance:'pending',cues,unreviewedAlignment:{draftSha256,status:draft.status,renderable:draft.renderable,flags:draft.assessment.flags,timestampRepairs:draft.assessment.timestampRepairs,timestampResolution:draft.timestampResolution,sourceAudio:draft.sourceAudio,decodedAudio:draft.decodedAudio,containerMinusPcmSeconds:draft.containerMinusPcmSeconds,coverageEndpoints:draft.assessment.coverageEndpoints,tokenMatchMeaning:draft.assessment.tokenMatchMeaning}};
}
