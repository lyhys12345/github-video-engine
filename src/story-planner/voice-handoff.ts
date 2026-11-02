import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import {StorySchema} from '../contracts/story.js';
import {compileStory} from './compile.js';
import {sha256} from '../core/util.js';
import {boundedFile} from './runtime.js';
import {command} from '../core/process.js';
import {ffprobePath} from '../providers/local.js';
export const VoiceBindingSchema=z.object({schemaVersion:z.literal('1.0'),storyId:z.string(),voiceLabel:z.string().min(1),clips:z.array(z.object({shotId:z.string(),path:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/),transcript:z.string().min(1)}).strict()).max(100)}).strict();
/** A clip must match the current exact narration; names alone cannot approve a voice. */
export async function buildVoiceHandoff(rawStory:unknown,rawBindings:unknown,signal:AbortSignal){
 const story=StorySchema.parse(rawStory),bindings=VoiceBindingSchema.parse(rawBindings),plan=compileStory(story);
 if(bindings.storyId!==story.id||new Set(bindings.clips.map(c=>c.shotId)).size!==bindings.clips.length)throw new Error('Voice story/shot binding mismatch');
 const clips:(z.infer<typeof VoiceBindingSchema>['clips'][number]&{measuredSeconds:number;availableSeconds:number;fits:boolean})[]=[];
 for(const clip of bindings.clips){const shot=plan.shots.find(s=>s.id===clip.shotId);if(!shot||shot.narration!==clip.transcript)throw new Error('Voice transcript does not match exact current narration');
 const bytes=await boundedFile(clip.path,50_000_000);if(sha256(bytes)!==clip.sha256)throw new Error('Voice content hash mismatch');
 const probe=JSON.parse(await command(ffprobePath(),['-v','error','-show_streams','-show_format','-of','json',clip.path],{signal,timeout:30000}));
 const streams=probe.streams??[];const duration=Number(probe.format?.duration);if(streams.filter((s:{codec_type:string})=>s.codec_type==='audio').length!==1||streams.some((s:{codec_type:string})=>s.codec_type==='video')||!Number.isFinite(duration)||duration<=0)throw new Error('Expected one measurable audio stream');
 if(sha256(await readFile(clip.path))!==clip.sha256)throw new Error('Voice changed during measurement');
 clips.push({...clip,measuredSeconds:duration,availableSeconds:(shot.endFrame-shot.startFrame)/plan.fps,fits:duration<=(shot.endFrame-shot.startFrame)/plan.fps});}
 return {schemaVersion:'1.0',storyId:story.id,voiceLabel:bindings.voiceLabel,scope:'local-audio-technical-handoff-not-listening-approval',transcriptVerification:'caller-declared; recorded speech not verified',timingBasis:clips.length?'partial-measured-audio':'estimate-only',clips,pendingShots:story.shots.filter(s=>!clips.some(c=>c.shotId===s.id)).map(s=>s.id),review:'pending',retiming:'manual review required; never stretch or truncate automatically'};
}
