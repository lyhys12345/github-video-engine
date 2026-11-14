import {z} from 'zod';
import {estimatedReelCaptions} from './approved-reel.js';
import {sha256} from '../core/util.js';
const Hash=z.string().regex(/^[a-f0-9]{64}$/),Id=z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,50}$/),Asset=z.strictObject({path:z.string().min(1),sha256:Hash});
const Unit=z.number().min(0).max(1);
const Crop=z.strictObject({x:Unit,y:Unit,width:z.number().positive().max(1),height:z.number().positive().max(1)}).refine(c=>c.x+c.width<=1.001&&c.y+c.height<=1.001,'Crop exceeds real source bounds');
const Rect=z.strictObject({x:Unit,y:Unit,width:z.number().positive().max(1),height:z.number().positive().max(1)}).refine(c=>c.x+c.width<=1.001&&c.y+c.height<=1.001,'Panel exceeds stage bounds');
const Motion=z.strictObject({from:Rect,start:Unit,end:Unit}).refine(m=>m.end>m.start,'Motion interval must be positive');
const Panel=z.strictObject({crop:Crop,cropEnd:Crop.optional(),x:Unit,y:Unit,width:z.number().positive().max(1),height:z.number().positive().max(1),fit:z.enum(['contain','cover']).optional(),mediaId:Id.optional(),startFrame:z.number().int().min(0).optional(),endFrame:z.number().int().positive().optional(),motion:Motion.optional(),reveal:Unit.optional()}).refine(c=>c.x+c.width<=1.001&&c.y+c.height<=1.001,'Panel exceeds stage bounds');
const CaptionCue=z.strictObject({text:z.string().min(1).max(80),startFrame:z.number().int().min(0),endFrame:z.number().int().positive()}).refine(c=>c.endFrame>c.startFrame,'Caption interval must be positive');
const Overlay=z.strictObject({kind:z.enum(['label','arrow','ring']),text:z.string().min(1).max(55).optional(),x:Unit,y:Unit,width:z.number().positive().max(1),height:z.number().positive().max(1),start:Unit,end:Unit,fontSize:z.number().int().min(20).max(66).optional(),tone:z.enum(['accent','ink','soft']).optional()}).refine(o=>o.end>o.start&&o.x+o.width<=1.001&&o.y+o.height<=1.001,'Invalid overlay interval or bounds').refine(o=>o.kind!=='label'||!!o.text,'Label text required');
export const ShowcaseDraftManifest=z.strictObject({schemaVersion:z.literal('showcase-reel/1.0'),theme:z.enum(['paper','copper','classroom']),layout:z.enum(['standard','immersive','cinematic']).optional(),
  cinematic: z.strictObject({
    safeInset: z.number().int().min(48).max(140).optional(),
    captionSize: z.number().int().min(30).max(52).optional(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).optional(),
  preview: z.strictObject({
    shotMidpoints: z.boolean().optional(),
    actionFrames: z.boolean().optional(),
    frames: z.array(z.number().int().nonnegative()).max(80).optional(),
  }).optional(),projectLabel:z.string().min(1).max(80),script:Asset,font:Asset,narration:z.array(Asset.extend({id:Id,transcriptSha256:Hash,receipt:Asset,captionCues:z.array(CaptionCue).min(1).max(80).optional(),captionChunks:z.array(z.string().min(1).max(80)).min(1).max(80).optional()})).min(1).max(20),media:z.array(Asset.extend({id:Id,type:z.enum(['image','video']),width:z.number().int().positive(),height:z.number().int().positive(),frames:z.number().int().positive().optional(),fps:z.number().positive().optional()})).min(1).max(30),beats:z.array(z.strictObject({id:Id,shots:z.array(z.strictObject({mediaId:Id,
    startCue: z.number().int().nonnegative().optional(),
    actions: z.array(z.strictObject({
      cue: z.number().int().nonnegative(),
      sourceFrame: z.number().int().nonnegative(),
    })).min(1).max(20).optional(),
    weight:z.number().positive().max(1000),crop:Crop,cropEnd:Crop.optional(),label:z.string().max(80).optional(),startFrame:z.number().int().min(0).optional(),endFrame:z.number().int().positive().optional(),annotation:z.string().max(60).optional(),panels:z.array(Panel).min(1).max(4).optional(),overlays:z.array(Overlay).max(8).optional()})).min(1).max(10)})).min(1).max(20)});
export const ShowcaseManifest = ShowcaseDraftManifest.extend({approval: Asset, scriptReview: Asset.optional()});
export type ShowcasePanel=z.infer<typeof Panel>;
export type ShowcaseOverlay=z.infer<typeof Overlay>;
export function validateShowcase(bytes:Buffer,approval:any,raw:unknown){
 const manifest=ShowcaseManifest.parse(raw);
 if(sha256(bytes)!==manifest.script.sha256||approval.schemaVersion!=='script-owner-authorization/1.0'||approval.scriptSha256!==manifest.script.sha256||!approval.authority)throw Error('Exact owner approval required');
 return {manifest, script: validateShowcaseContent(manifest, JSON.parse(bytes.toString()))};
}

export function validateShowcaseContent(manifest: z.infer<typeof ShowcaseDraftManifest>, rawScript: unknown) {
 const script=z.object({lines:z.array(z.tuple([Id,z.string().min(1).max(300)])),shots:z.array(z.string())}).parse(rawScript);
 const ids=script.lines.map(l=>l[0]);if(new Set(ids).size!==ids.length||JSON.stringify(ids)!==JSON.stringify(manifest.narration.map(n=>n.id))||JSON.stringify(ids)!==JSON.stringify(manifest.beats.map(b=>b.id)))throw Error('Every approved line must occur once in order');
 const media=new Map(manifest.media.map(m=>[m.id,m]));if(media.size!==manifest.media.length)throw Error('Duplicate media id');
 for(const[i,n]of manifest.narration.entries()){const text=script.lines[i]![1];if(n.transcriptSha256!==sha256(text)||n.captionChunks&&(n.captionChunks.join('')!==text||n.captionChunks.some(c=>/^[，。！？：；]+$/u.test(c))))throw Error('Caption or transcript differs');if(n.captionCues&&(n.captionChunks||n.captionCues.map(c=>c.text).join('')!==text||n.captionCues[0]!.startFrame!==0||n.captionCues.some((c,j)=>j>0&&c.startFrame!==n.captionCues![j-1]!.endFrame)))throw Error('Authored caption partition differs');}
 function checkMedia(id:string,startFrame?:number,endFrame?:number){const m=media.get(id);if(!m)throw Error('Unknown visual asset');if(m.type==='video'&&(!m.frames||m.fps!==30||(endFrame??m.frames)>m.frames||(endFrame??m.frames)<=(startFrame??0)))throw Error('Video must be preflighted30fps with valid frame range');if(m.type==='image'&&(startFrame!==undefined||endFrame!==undefined))throw Error('Image cannot claim video frame range');}
 for(const beat of manifest.beats)for(const s of beat.shots){checkMedia(s.mediaId,s.startFrame,s.endFrame);for(const panel of s.panels??[])checkMedia(panel.mediaId??s.mediaId,panel.startFrame??(panel.mediaId?undefined:s.startFrame),panel.endFrame??(panel.mediaId?undefined:s.endFrame));}
 for (const [index, beat] of manifest.beats.entries()) {
   const cues = manifest.narration[index]!.captionCues;
   for (const shot of beat.shots) {
     if ((shot.actions || shot.startCue !== undefined) && !cues) {
       throw Error('Action alignment requires authored narration cues');
     }
     if (shot.actions && media.get(shot.mediaId)?.type !== 'video') {
       throw Error('Action alignment requires a video source');
     }
   }
 }
 return script;
}
export function distributeShots<T extends{weight:number}>(shots:T[],start:number,frames:number){const sum=shots.reduce((n,s)=>n+s.weight,0);let used=0;return shots.map((s,i)=>{const from=start+Math.round(frames*used/sum);used+=s.weight;const end=i===shots.length-1?start+frames:start+Math.round(frames*used/sum);if(end<=from)throw Error('Shot duration under one frame');return{...s,start:from,end};});}

export function showcaseCaptions(text:string,start:number,frames:number,n:{captionChunks?:string[];captionCues?:z.infer<typeof CaptionCue>[]}){if(!n.captionCues)return estimatedReelCaptions(text,start,start+frames,n.captionChunks);if(n.captionCues.at(-1)!.endFrame!==frames)throw Error('Authored captions must cover measured original audio frames');return n.captionCues.map(c=>({text:c.text,start:start+c.startFrame,end:start+c.endFrame}));}


export function scheduleShowcaseShots<T extends {weight: number; startCue?: number}>(
  shots: T[], start: number, frames: number, cues: {start: number}[],
) {
  if (shots.every(shot => shot.startCue === undefined)) return distributeShots(shots, start, frames);
  if (shots[0]?.startCue !== 0 || shots.some(shot => shot.startCue === undefined || !cues[shot.startCue])) {
    throw Error('Cue-based cuts require every shot to name a cue, beginning at cue zero');
  }
  return shots.map((shot, index) => {
    const from = cues[shot.startCue!]!.start;
    const next = shots[index + 1];
    const end = next ? cues[next.startCue!]!.start : start + frames;
    if (end <= from) throw Error('Shot cues must be strictly increasing');
    return {...shot, start: from, end};
  });
}