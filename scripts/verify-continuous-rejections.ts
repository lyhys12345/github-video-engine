import {readFile,writeFile,stat} from 'node:fs/promises';
import {renderShortSegment} from '../src/short-segment/render.js';
import {sha256} from '../src/core/util.js';
const root='work/continuous-explainer-v1/revisions',results=[];
const reportName=process.argv[2]??'actual-rejections.json';
for(const [name,input,expected] of [['stale-voice','narration/stale-voice-input.json','generation receipt must bind exact'],['asset-tamper','tamper/input.json','Source asset closure hash mismatch']] as const){
 const path=`${root}/${input}`,out=`${root}/${name}-rejected-output`;let error='';
 try{await renderShortSegment(path,out,new AbortController().signal);}catch(e){error=String(e);}
 let outputExists=true;try{await stat(out);}catch{outputExists=false;}
 if(!error.includes(expected)||outputExists)throw Error('Expected input rejection before output creation: '+name+' '+error);
 results.push({name,input,sha256:sha256(await readFile(path)),actualError:error,expected,outputCreated:false,passed:true});
}
await writeFile(`${root}/${reportName}`,JSON.stringify({schemaVersion:'1.0',executedAt:new Date().toISOString(),results,paidCalls:0,browserLaunches:0},null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,results}));
