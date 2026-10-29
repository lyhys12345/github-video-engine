import {resolve} from 'node:path';
import {EngineError} from '../core/errors.js';
import {planExplanation,statusExplanation,exportExplanation,diffExplanation,writeExplanationDiff} from './runtime.js';
const usage='explain plan --spec <graph.json> --root <source-root> --data <state> --out <new-directory> | explain status --task <id> --data <state> | explain export --task <id> --data <state> --out <new-directory> | explain diff --before <task-id> --after <task-id> --data <state> [--out <new-report.json>]';
export async function explainCommand(positionals:string[],values:Record<string,unknown>,signal:AbortSignal){
 const action=positionals[1],allowed=action==='plan'?['spec','root','data','out']:action==='status'?['task','data']:action==='export'?['task','data','out']:action==='diff'?['before','after','data','out']:[];
 if(positionals.length!==2||!allowed.length||Object.entries(values).some(([k,v])=>v!==undefined&&!allowed.includes(k)))throw new EngineError('USAGE',usage);
 const take=(key:string)=>{const value=values[key];if(typeof value!=='string'||!value.trim())throw new EngineError('USAGE',usage);return value;};
 const data=resolve(take('data'));
 if(action==='plan')return planExplanation(resolve(take('spec')),resolve(take('root')),data,resolve(take('out')),signal);
 if(action==='status')return statusExplanation(data,take('task'));
 if(action==='export')return exportExplanation(data,take('task'),resolve(take('out')),signal);
 const result=await diffExplanation(data,take('before'),take('after'));
 if(values.out!==undefined)await writeExplanationDiff(resolve(take('out')),result);
 return result;
}
