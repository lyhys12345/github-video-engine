import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkGateV2} from '../src/evaluation/judge-gate.mjs';
export {checkGateV2,evaluateGateV2} from '../src/evaluation/judge-gate.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const[candidate,rules]=process.argv.slice(2);
    if(!candidate||!rules)throw new Error('Usage: node reviews/check-gate-v2.mjs <candidate.json> <gate.json>');
    const result=checkGateV2(resolve(candidate),resolve(rules));console.log(JSON.stringify(result,null,2));process.exitCode=result.verdict==='PASS'?0:result.verdict==='FAIL'?1:2;
  }catch(error){console.error(JSON.stringify({verdict:'UNVERIFIED',error:String(error)}));process.exitCode=2;}
}
