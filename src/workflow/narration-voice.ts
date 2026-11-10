import {generateHuihui} from '../tts/huihui.js';
import {importHuihuiTts} from '../tts/runtime.js';
import {generateLocalChen} from '../tts/local-chen.js';
import {requireNarrationVoice} from './narration-voice-policy.js';

/** Default is the owner's approved local voice; no remote or implicit fallback. */
export async function synthesizeNarration(text:string,data:string,signal:AbortSignal){
 const selected=requireNarrationVoice();
 if(selected==='anna-local')return generateLocalChen(text,data,signal,'anna-local');
 if(selected==='chen-local')return generateLocalChen(text,data,signal);
 const generation=await generateHuihui({schemaVersion:'tts-huihui/1.0',text},data,signal);
 const imported=await importHuihuiTts(data,generation.taskId,signal);
 return{generation,imported};
}
