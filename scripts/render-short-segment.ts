import {renderShortSegment} from '../src/short-segment/render.js';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Usage: tsx scripts/render-short-segment.ts <input.json> <new-output-directory>');
const control=new AbortController();process.once('SIGINT',()=>control.abort(Error('Cancelled')));process.once('SIGTERM',()=>control.abort(Error('Cancelled')));
try{const result=await renderShortSegment(input,out,control.signal);console.log(JSON.stringify({success:true,out:result.out,frames:result.evaluation.timeline.totalFrames,measuredVoiceSeconds:result.evaluation.timeline.measuredVoiceSeconds}));}catch(error){await writeFile(join(out,'failure.json'),JSON.stringify({success:false,error:String(error),at:new Date().toISOString()},null,2),{flag:'wx'}).catch(()=>{});throw error;}
