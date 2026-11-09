import {z} from 'zod';
import {sha256,canonical} from '../core/util.js';
import {EngineError} from '../core/errors.js';
const Text=z.string().min(1).max(300),Id=z.string().regex(/^[a-z][a-z0-9-]{0,40}$/),Hash=z.string().regex(/^[a-f0-9]{64}$/);
const Asset=z.strictObject({path:z.string().min(1),sha256:Hash,source:z.string().optional()});
export const ApprovedReelManifest=z.strictObject({schemaVersion:z.literal('approved-script-reel/1.0'),projectLabel:Text,snapshotLabel:Text,samplesAfterLine:Id.optional(),script:Asset,approval:Asset,font:Asset,
 narration:z.array(Asset.extend({id:Id,transcriptSha256:Hash,receipt:Asset,captionChunks:z.array(Text).min(1).max(80).optional()})).min(1).max(40),
 samples:z.array(Asset.extend({label:Text,startSample:z.number().int().min(0),endSample:z.number().int().positive()})).min(1).max(2),
 images:z.array(Asset.extend({id:Id})).min(1).max(20),
 visuals:z.array(z.strictObject({id:Id,kind:z.enum(['screenshots','flow','timeline']),timelineMode:z.enum(['missing','pending']).optional(),images:z.array(Id),crops:z.array(z.strictObject({x:z.number().finite(),y:z.number().finite(),width:z.number().positive().max(4000),height:z.number().positive().max(4000)})).optional(),title:Text,disclosure:Text,inputs:z.array(Text).max(3).optional(),engine:Text.optional(),output:Text.optional()})).min(1).max(40)
});
export function validateReelBinding(scriptBytes:Buffer,approval:any,raw:unknown){
 const manifest=ApprovedReelManifest.parse(raw),script=z.object({lines:z.array(z.tuple([Id,Text])).min(1).max(40),shots:z.array(Text)}).parse(JSON.parse(scriptBytes.toString('utf8')));
 if(sha256(scriptBytes)!==manifest.script.sha256||approval.schemaVersion!=='script-owner-authorization/1.0'||approval.scriptSha256!==manifest.script.sha256||!approval.authority)throw new EngineError('REEL_APPROVAL','Exact approved script binding required.');
 const ids=script.lines.map(([id])=>id);if(new Set(ids).size!==ids.length||JSON.stringify(manifest.narration.map(n=>n.id))!==JSON.stringify(ids)||JSON.stringify(manifest.visuals.map(v=>v.id))!==JSON.stringify(ids))throw new EngineError('REEL_ORDER','Narration and visuals must cover every approved line once, in order.');
 for(const [i,n]of manifest.narration.entries())if(n.transcriptSha256!==sha256(script.lines[i]![1]))throw new EngineError('REEL_TRANSCRIPT','Narration transcript hash differs from approved line.');
 for(const [i,n]of manifest.narration.entries())if(n.captionChunks&&(n.captionChunks.join('')!==script.lines[i]![1]||n.captionChunks.some(c=>/^[，。！？：；]+$/u.test(c))))throw new EngineError('REEL_CAPTIONS','Caption chunks must preserve exact text and never isolate punctuation.');
 if(manifest.samplesAfterLine&&!ids.includes(manifest.samplesAfterLine))throw new EngineError('REEL_ORDER','Sample insertion line is not in the approved script.');
 const images=new Set(manifest.images.map(i=>i.id));if(images.size!==manifest.images.length)throw new EngineError('REEL_IMAGES','Duplicate image identity.');
 for(const v of manifest.visuals){if(v.crops&&v.crops.length!==v.images.length)throw new EngineError('REEL_VISUAL','Every image crop must correspond to an image.');if(v.images.some(i=>!images.has(i))||v.kind==='screenshots'&&!v.images.length||v.kind==='flow'&&(!v.inputs?.length||!v.engine||!v.output))throw new EngineError('REEL_VISUAL','Missing source image or complete flow configuration.');}
 for(const s of manifest.samples)if(s.endSample<=s.startSample)throw new EngineError('REEL_SAMPLE','Sample excerpt must have positive original-speed duration.');
 return{manifest,script};
}
/** Display-time estimates only; never claim these proportional cues are word alignment. */
export function estimatedReelCaptions(text:string,start:number,end:number,authored?:string[]){
 const chunks:string[]=[],chars=[...text];let chunk='',width=0;
 const words=[...new Intl.Segmenter('zh',{granularity:'word'}).segment(text)].flatMap(w=>[...w.segment].length>25?[...w.segment]:[w.segment]);
 for(const word of words){const w=[...word].reduce((n,c)=>n+(/[\x00-\x7F]/.test(c)?.55:1),0);if(width+w>18&&chunk&&!/^[，。！？：；]+$/u.test(word)){chunks.push(chunk);chunk='';width=0;}chunk+=word;width+=w;if(/[，。！？：；]$/u.test(word)){chunks.push(chunk);chunk='';width=0;}}

 if(chunk)chunks.push(chunk);if(authored){chunks.splice(0,chunks.length,...authored);}let used=0;return chunks.map((text,i)=>{const from=start+Math.floor((end-start)*used/chars.length);used+=[...text].length;return{text,start:from,end:i===chunks.length-1?end:start+Math.floor((end-start)*used/chars.length)};});
}
export function alignReelPcm(bytes:Buffer,padFrames=3){if(bytes.length%2)throw new EngineError('REEL_PCM','Expected mono signed16 PCM.');const samples=bytes.length/2,frames=Math.ceil(samples/800)+padFrames,padded=Buffer.alloc(frames*1600);bytes.copy(padded);return{samples,frames,padded};}

export function validateReelNarrationReceipt(n:{sha256:string;transcriptSha256:string},text:string,raw:unknown){const r=z.object({schemaVersion:z.literal('tts-receipt/1.0'),fingerprint:Hash,input:z.object({text:z.string(),sourceSha256:Hash}).passthrough(),artifact:z.object({sha256:Hash,inputFingerprint:Hash}),transcriptVerification:z.literal('caller-declared; recorded speech not verified')}).parse(raw);if(r.input.text!==text||sha256(text)!==n.transcriptSha256||r.input.sourceSha256!==n.sha256||r.artifact.sha256!==n.sha256||r.fingerprint!==sha256(canonical(r.input))||r.artifact.inputFingerprint!==r.fingerprint)throw new EngineError('REEL_TRANSCRIPT','Narration receipt/input/audio binding differs.');return{transcriptVerification:r.transcriptVerification,fingerprint:r.fingerprint};}



export function reelSegmentOrder(ids:string[],sampleCount:number,after?:string){if(after&&!ids.includes(after))throw new EngineError('REEL_ORDER','Unknown sample insertion line');const samples=Array.from({length:sampleCount},(_,index)=>({kind:'sample' as const,index})),result:({kind:'sample';index:number}|{kind:'narration';index:number})[]=[];if(!after)result.push(...samples);ids.forEach((id,index)=>{result.push({kind:'narration',index});if(id===after)result.push(...samples)});return result;}

