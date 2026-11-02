import {z} from 'zod';
import type {Story} from '../contracts/story.js';

export const VisualPlanSchema=z.object({
 schemaVersion:z.literal('1.0'),id:z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),title:z.string().min(1).max(50),kind:z.enum(['rule-build','mask-apply']),
 presentation:z.literal('continuous-explainer').optional(),
 styleAssetPath:z.string().max(200).optional(),
 durationBounds:z.object({minSeconds:z.number().min(1).max(60),maxSeconds:z.number().min(1).max(60)}).strict().optional(),
 sourceShotIds:z.array(z.string()).min(1).max(8),claimIds:z.array(z.string()).min(1),
 phases:z.array(z.object({label:z.string().min(1).max(45),captionText:z.string().min(1).max(100),scene:z.enum(['hook','inspect','connect','execute','test','resolve']).optional()}).strict()).min(2).max(32),
 labels:z.object({source:z.string().max(45),result:z.string().max(45),disclosure:z.string().max(100)}).strict(),
 rule:z.object({from:z.number().finite(),to:z.number().finite(),conditionMax:z.number().finite().optional(),acceleration:z.number().positive(),basis:z.string().max(200)}).strict().optional(),
}).strict();
export type VisualPlan=z.infer<typeof VisualPlanSchema>;
export const VisualStyleSchema=z.object({schemaVersion:z.literal('1.0'),subjectColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),backdropColor:z.string().regex(/^#[a-fA-F0-9]{6}$/)}).strict();
export type VisualStyle=z.infer<typeof VisualStyleSchema>;
export const SegmentInputSchema=z.object({schemaVersion:z.literal('1.0'),bundlePath:z.string(),visualPlanPath:z.string(),generationReceiptPath:z.string().optional(),cueTimingPath:z.string().optional(),previousOutputPath:z.string().optional(),voice:z.object({path:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/),transcript:z.string().min(1),provider:z.string().min(1),voiceLabel:z.string().min(1),approvalBasis:z.string().min(1)}).strict()}).strict();
export type SegmentInput=z.infer<typeof SegmentInputSchema>;
export const SegmentCueTimingSchema=z.object({schemaVersion:z.literal('1.0'),voiceSha256:z.string().regex(/^[a-f0-9]{64}$/),transcriptSha256:z.string().regex(/^[a-f0-9]{64}$/),measuredVoiceSeconds:z.number().positive().max(600),method:z.enum(['manual-listening','forced-alignment-reviewed']),boundariesSeconds:z.array(z.number().nonnegative().finite()).min(3).max(33),reviewBasis:z.string().min(1).max(500)}).strict();
export type SegmentCueTiming=z.infer<typeof SegmentCueTimingSchema>;
export type SegmentCue={index:number;label:string;text:string;startFrame:number;endFrame:number;startSeconds:number;endSeconds:number;sourceStartSeconds:number;sourceEndSeconds:number;confidence:'estimated-unverified-by-listening'|'reviewed-timing-pending-owner-acceptance'};
export type SegmentTimeline={fps:number;totalFrames:number;measuredVoiceSeconds:number;voiceStartFrame:number;voiceEndFrame:number;cueMethod:'text-weighted-within-measured-continuous-audio-not-forced-aligned'|'manual-listening-reviewed-boundaries'|'forced-alignment-reviewed-boundaries';cues:SegmentCue[]};
export function validateSegmentNarration(story:Story,plan:VisualPlan,transcript:string){
 if(new Set(plan.sourceShotIds).size!==plan.sourceShotIds.length)throw Error('Duplicate selected shot');
 const selected=plan.sourceShotIds.map(id=>{const shot=story.shots.find(s=>s.id===id);if(!shot)throw Error('Unknown selected shot');return shot;});
 const narration=selected.map(s=>s.narration).join('');
 if(transcript!==narration||plan.phases.map(p=>p.captionText).join('')!==narration)throw Error('Exact current selected narration and caption concatenation required');
 const claims=new Set(selected.flatMap(s=>s.claimIds));if(plan.claimIds.some(id=>!claims.has(id)))throw Error('Visual claim must belong to selected narration shots');
 if(plan.kind==='rule-build'&&(!plan.rule||plan.rule.to<=plan.rule.from))throw Error('Rule animation needs a positive explicit authored range');
 if(plan.presentation==='continuous-explainer'&&(!plan.durationBounds||plan.phases.some(p=>!p.scene)))throw Error('Continuous explainer requires measured duration bounds and an authored scene per caption');
 if(plan.presentation==='continuous-explainer'){
  const stages=['hook','inspect','connect','execute','test','resolve'],sequence=plan.phases.map(p=>stages.indexOf(p.scene!));
  if(stages.some(s=>!plan.phases.some(p=>p.scene===s))||sequence.some((s,i)=>i>0&&s<sequence[i-1]!))throw Error('Continuous scenes must preserve all six ordered operation stages');
 }
 if(plan.durationBounds&&plan.durationBounds.minSeconds>plan.durationBounds.maxSeconds)throw Error('Invalid duration bounds');
 return narration;
}
/** Verifies submitted generation declarations and captured bytes; this is not speech transcription. */
export function validateSegmentGeneration(plan:VisualPlan,receipt:unknown,voiceHash:string,transcript:string,provider:string,voiceLabel:string){
 if(plan.presentation!=='continuous-explainer')return;
 const parsed=z.object({provider:z.string(),voiceLabel:z.string(),recordings:z.array(z.object({sha256:z.string(),text:z.string()}).passthrough()).max(100)}).passthrough().safeParse(receipt);
 if(!parsed.success||parsed.data.provider!==provider||parsed.data.voiceLabel!==voiceLabel||!parsed.data.recordings.some(r=>r.sha256===voiceHash&&r.text===transcript))throw Error('Current generation receipt must bind exact submitted text and captured audio bytes');
}
function weight(text:string){return Math.max(1,(text.match(/\p{Script=Han}/gu)||[]).length+(text.replace(/\p{Script=Han}/gu,' ').match(/[\p{L}\p{N}]+/gu)||[]).length*1.6);}
export function buildSegmentTimeline(plan:VisualPlan,measuredVoiceSeconds:number,timing?:SegmentCueTiming,binding?:{voiceSha256:string;transcriptSha256:string}):SegmentTimeline{
 if(!Number.isFinite(measuredVoiceSeconds)||measuredVoiceSeconds<=0||measuredVoiceSeconds>(plan.presentation==='continuous-explainer'?59:40))throw Error('Bounded short clip audio exceeds its declared scope');
 const fps=30,voiceStartFrame=12,voiceFrames=Math.ceil(measuredVoiceSeconds*fps),voiceEndFrame=voiceStartFrame+voiceFrames,totalFrames=voiceEndFrame+18;
 if(plan.durationBounds&&(totalFrames/fps<plan.durationBounds.minSeconds||totalFrames/fps>plan.durationBounds.maxSeconds))throw Error('Measured continuous output falls outside authored duration bounds; regenerate or revise narration without retiming');
 let boundaries:number[],cueMethod:SegmentTimeline['cueMethod'],confidence:SegmentCue['confidence'];
 if(timing){
  if(!binding||timing.voiceSha256!==binding.voiceSha256||timing.transcriptSha256!==binding.transcriptSha256)throw Error('Cue timing must bind exact current voice and transcript');
  if(Math.abs(timing.measuredVoiceSeconds-measuredVoiceSeconds)>.005)throw Error('Cue timing measured duration does not match current audio');
  if(timing.boundariesSeconds.length!==plan.phases.length+1||Math.abs(timing.boundariesSeconds[0]!)>.001||Math.abs(timing.boundariesSeconds.at(-1)!-measuredVoiceSeconds)>.005||timing.boundariesSeconds.some((value,index)=>index>0&&value<=timing.boundariesSeconds[index-1]!))throw Error('Cue timing boundaries must cover the exact audio monotonically');
  boundaries=timing.boundariesSeconds;cueMethod=timing.method==='manual-listening'?'manual-listening-reviewed-boundaries':'forced-alignment-reviewed-boundaries';confidence='reviewed-timing-pending-owner-acceptance';
 }else{
  const weights=plan.phases.map(p=>weight(p.captionText)),sum=weights.reduce((a,b)=>a+b,0);let consumed=0;boundaries=[0];for(const value of weights){consumed+=value;boundaries.push(measuredVoiceSeconds*consumed/sum);}
  cueMethod='text-weighted-within-measured-continuous-audio-not-forced-aligned';confidence='estimated-unverified-by-listening';
 }
 const cues=plan.phases.map((p,index)=>{const sourceStartSeconds=boundaries[index]!,sourceEndSeconds=boundaries[index+1]!,startFrame=voiceStartFrame+Math.round(sourceStartSeconds*fps),endFrame=index===plan.phases.length-1?voiceEndFrame:voiceStartFrame+Math.round(sourceEndSeconds*fps);if(endFrame-startFrame<4)throw Error('Measured clip is too short for bounded caption phases');return {index,label:p.label,text:p.captionText,startFrame,endFrame,startSeconds:startFrame/fps,endSeconds:endFrame/fps,sourceStartSeconds,sourceEndSeconds,confidence};});
 return {fps,totalFrames,measuredVoiceSeconds,voiceStartFrame,voiceEndFrame,cueMethod,cues};
}
function stamp(seconds:number){const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
export function segmentSrt(timeline:SegmentTimeline){return timeline.cues.map(c=>`${c.index+1}\n${stamp(c.startSeconds)} --> ${stamp(c.endSeconds)}\n${c.text}\n`).join('\n');}
