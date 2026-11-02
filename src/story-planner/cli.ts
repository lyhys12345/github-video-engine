import {resolve} from 'node:path';
import {EngineError} from '../core/errors.js';
import {readFile,writeFile} from 'node:fs/promises';
import {compileAnimation} from './animation.js';
import {planAnimationTask,inspectAnimationTask,exportAnimationTask} from './animation-task.js';
import {planStory,statusStory,exportStory,diffStory,writeStoryDiff} from './runtime.js';
import {buildResearchHandoff} from './research-handoff.js';
import {canonical,sha256} from '../core/util.js';
import {planAssetPack,statusAssetPack,exportAssetPack} from './asset-pack.js';
const usage='story plan --spec <graph.json> --root <source-root> --data <state> --out <new-directory> | story status --task <id> --data <state> | story export --task <id> --data <state> --out <new-directory> | story diff --before <task-id> --after <task-id> --data <state> [--out <new-report.json>]';
export async function storyCommand(positionals:string[],values:Record<string,unknown>,signal:AbortSignal){
 if(positionals.length===2&&['asset-plan','asset-status','asset-export'].includes(positionals[1]!)){
  const action=positionals[1],allowed=action==='asset-plan'?['spec','root','plan','voice','data']:action==='asset-status'?['task','data']:['task','data','out'];
  if(Object.entries(values).some(([k,v])=>v!==undefined&&!allowed.includes(k))||allowed.some(k=>typeof values[k]!=='string'||!String(values[k]).trim()))throw new EngineError('USAGE',`story ${action} requires ${allowed.map(k=>'--'+k).join(' ')}`);
  const v=(k:string)=>String(values[k]);
  if(action==='asset-plan')return planAssetPack(v('spec'),v('root'),v('plan'),v('voice'),v('data'),signal);
  if(action==='asset-status')return statusAssetPack(v('data'),v('task'));
  return exportAssetPack(v('data'),v('task'),v('out'),signal);
 }
 if(positionals.length===2&&positionals[1]==='research-plan'){
  const keys=['spec','root','data','out'];
  if(Object.entries(values).some(([k,v])=>v!==undefined&&!keys.includes(k))||keys.some(k=>typeof values[k]!=='string'||!String(values[k]).trim()))throw new EngineError('USAGE','story research-plan --spec <story> --root <sources> --data <state> --out <new-directory>');
  const v=(k:string)=>resolve(String(values[k]));
  const handoff=await buildResearchHandoff(v('spec'),v('root'));
  const task=await planStory(v('spec'),v('root'),v('data'),v('out'),signal);
  const status=await statusStory(v('data'),task.taskId);
  if(!('graphHash' in status)||status.graphHash!==sha256(canonical(handoff.story)))throw new EngineError('RESEARCH_INPUT_CHANGED','Research inputs changed during planning; committed task remains preserved, retry to a new export path');
  return {task,handoff,scope:'curated-source-to-story-handoff; no automatic repository understanding or semantic approval'};
 }
 if(positionals.length===2&&['animation-plan','animation-status','animation-export'].includes(positionals[1]!)){
  const action=positionals[1], allowed=action==='animation-plan'?['spec','root','plan','data']:action==='animation-status'?['task','data']:['task','data','out'];
  if(Object.entries(values).some(([k,v])=>v!==undefined&&!allowed.includes(k))||allowed.some(k=>typeof values[k]!=='string'||!String(values[k]).trim()))throw new EngineError('USAGE',`story ${action} requires ${allowed.map(k=>'--'+k).join(' ')}`);
  const v=(k:string)=>String(values[k]);
  if(action==='animation-plan')return planAnimationTask(v('spec'),v('root'),v('plan'),v('data'),signal);
  if(action==='animation-status')return inspectAnimationTask(v('data'),v('task'));
  return exportAnimationTask(v('data'),v('task'),v('out'));
 }
 if(positionals.length===2&&positionals[1]==='animate'){
  if(Object.entries(values).some(([k,v])=>v!==undefined&&!['spec','plan','out'].includes(k))||!values.spec||!values.plan||!values.out)throw new EngineError('USAGE','story animate --spec <story> --plan <animation> --out <new.json>');
  const read=async(p:unknown)=>JSON.parse((await readFile(resolve(String(p)),'utf8')).replace(/^\uFEFF/,''));
  const result=compileAnimation(await read(values.spec),await read(values.plan));
  if(signal.aborted)throw new EngineError('CANCELLED','Animation compilation cancelled','cancelled');
  await writeFile(resolve(String(values.out)),JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
 }
 const action=positionals[1],allowed=action==='plan'?['spec','root','data','out']:action==='status'?['task','data']:action==='export'?['task','data','out']:action==='diff'?['before','after','data','out']:[];
 if(positionals.length!==2||!allowed.length||Object.entries(values).some(([k,v])=>v!==undefined&&!allowed.includes(k)))throw new EngineError('USAGE',usage);
 const take=(key:string)=>{const value=values[key];if(typeof value!=='string'||!value.trim())throw new EngineError('USAGE',usage);return value;};
 const data=resolve(take('data'));
 if(action==='plan')return planStory(resolve(take('spec')),resolve(take('root')),data,resolve(take('out')),signal);
 if(action==='status')return statusStory(data,take('task'));
 if(action==='export')return exportStory(data,take('task'),resolve(take('out')),signal);
 const result=await diffStory(data,take('before'),take('after'));
 if(values.out!==undefined)await writeStoryDiff(resolve(take('out')),result);
 return result;
}
