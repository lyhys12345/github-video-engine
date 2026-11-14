import {z} from 'zod';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {EngineError} from '../core/errors.js';
import {localNarrationVoices,narrationAdapterBlocker} from './narration-voice-policy.js';
import {canonical,sha256} from '../core/util.js';
import {ancestors,boundedFile} from '../story-planner/runtime.js';
const Text=z.string().trim().min(1).max(2000);
export const CreativeBrief=z.strictObject({
 schemaVersion:z.literal('creative-brief/1.0'),
 duration:z.discriminatedUnion('mode',[
  z.strictObject({mode:z.literal('auto'),maxSeconds:z.number().positive().max(300).default(300)}),
  z.strictObject({mode:z.literal('max'),maxSeconds:z.number().positive().max(300)}),
  z.strictObject({mode:z.literal('range'),minSeconds:z.number().positive().max(300),maxSeconds:z.number().positive().max(300)})
 ]).refine(d=>d.mode!=='range'||d.minSeconds<=d.maxSeconds,'Minimum exceeds maximum'),
 style:Text, audience:Text, platforms:z.array(Text).min(1).max(5), language:Text,
 voice:z.discriminatedUnion('mode',[
  z.strictObject({mode:z.literal('local'),profile:z.enum(localNarrationVoices)}),
  z.strictObject({mode:z.literal('reference'),reference:Text,rightsConfirmed:z.boolean()}),
  z.strictObject({mode:z.literal('imported'),voiceLabel:z.string().trim().min(1).max(100),rightsConfirmed:z.boolean()}),
  z.strictObject({mode:z.literal('none')}),
  z.strictObject({mode:z.literal('byo-api'),provider:Text,paidAuthorized:z.boolean()}),
  z.strictObject({mode:z.literal('undecided')})
 ]),
 decision:z.enum(['proposed','user-specified','delegated']),
 notes:z.array(Text).max(20).default([])
});
export type CreativeBriefValue=z.infer<typeof CreativeBrief>;
export function assessCreativeBrief(raw:unknown){
 const brief=CreativeBrief.parse(raw),clarifications:string[]=[];
 if(brief.decision==='proposed')clarifications.push('Confirm these preferences or explicitly delegate selection; this is not script approval.');
 if(brief.voice.mode==='undecided')clarifications.push('Choose a configured local voice, authorized finished WAV, or no narration.');
 if(brief.voice.mode==='imported'&&!brief.voice.rightsConfirmed)clarifications.push('Confirm rights to use the finished narration.');
 if(brief.voice.mode==='reference'&&!brief.voice.rightsConfirmed)clarifications.push('Confirm rights to use the reference audio.');
 if(brief.voice.mode==='byo-api'&&!brief.voice.paidAuthorized)clarifications.push('Paid API use is not authorized; do not call the provider.');
 return {brief,briefSha256:sha256(canonical(brief)),status:clarifications.length?'needs-clarification':'ready-for-planning',clarifications,scriptApproval:'pending',voiceAvailability:'not-tested'};
}
export function checkBriefDuration(brief:CreativeBriefValue,seconds:number){
 if(!Number.isFinite(seconds)||seconds<=0||seconds>brief.duration.maxSeconds||(brief.duration.mode==='range'&&seconds<brief.duration.minSeconds))throw new EngineError('CREATIVE_DURATION','Authored duration violates the creative brief; revise content or obtain a changed brief, never silently trim or pad.');
}
export function creativeMediaBlockers(brief:CreativeBriefValue,selectedVoice?:string){
 const blockers=assessCreativeBrief(brief).clarifications;
 const adapter=narrationAdapterBlocker(brief.voice.mode,brief.language,brief.voice.mode==='local'?brief.voice.profile:undefined);
 if(adapter)blockers.push(adapter);
 if(brief.voice.mode==='local'&&selectedVoice!==undefined&&brief.voice.profile!==selectedVoice)blockers.push('Configured runtime voice differs from the approved brief. Explicitly configure the requested local voice.');
 return blockers;
}
export async function creativeBriefCommand(pos:string[],values:Record<string,unknown>){
 if(pos.length!==2||typeof values.spec!=='string'||values.out!==undefined&&typeof values.out!=='string'||Object.entries(values).some(([k,v])=>v!==undefined&&!['spec','out'].includes(k)))throw new EngineError('USAGE','explanation brief-check --spec <agent-authored brief.json> [--out <new creative-brief.json>]');
 const result=assessCreativeBrief(JSON.parse((await boundedFile(resolve(values.spec),100000)).toString('utf8').replace(/^\uFEFF/,'')));
 if(typeof values.out==='string'){await ancestors(resolve(values.out,'..'),true);await writeFile(resolve(values.out),canonical(result.brief),{flag:'wx'});}
 return result;
}
