import {resolve} from 'node:path';
import {EngineError} from '../core/errors.js';
import {boundedFile} from '../story-planner/runtime.js';
import {dryRunTts,produceTts,statusTts,exportTts,importHuihuiTts} from './runtime.js';
import {generateHuihui,statusHuihui,exportHuihui} from './huihui.js';
type Flags=Record<string,string|boolean|string[]|undefined>;
const usage='tts dry-run --spec <json> | tts generate --spec <json> --data <state> [--allow-paid --budget-micros <integer>] | tts import --spec <json> --audio <file> --data <state> | tts status --task <fingerprint> --data <state> | tts export --task <fingerprint> --data <state> --out <new-directory> --story <current-story.json> --shot <shot-id> | tts huihui-generate --spec <json> --data <state> | tts huihui-status/huihui-import --task <generation> --data <state> | tts huihui-export --task <generation> --data <state> --out <new-directory>';
export async function ttsCommand(args:string[],flags:Flags,signal:AbortSignal){
 const action=args[1],allowed:Record<string,string[]>={'dry-run':['spec'],generate:['spec','data','allow-paid','budget-micros'],import:['spec','audio','data'],status:['task','data'],export:['task','data','out','story','shot'],
  'huihui-generate':['spec','data'],'huihui-status':['task','data'],'huihui-import':['task','data'],'huihui-export':['task','data','out']};
 if(args.length!==2||!action||!allowed[action]||Object.entries(flags).some(([k,v])=>v!==undefined&&!allowed[action]!.includes(k)))throw new EngineError('USAGE',usage);
 const need=(key:string)=>{const x=flags[key];if(typeof x!=='string'||!x)throw new EngineError('USAGE',usage);return x;};
 const parse=async(path:string)=>JSON.parse((await boundedFile(resolve(path),100_000)).toString('utf8').replace(/^\uFEFF/,''));
 if(action==='huihui-generate')return generateHuihui(await parse(need('spec')),resolve(need('data')),signal,
  taskId=>console.error(JSON.stringify({taskId,stage:'huihui-generation'})));
 if(action==='huihui-status')return statusHuihui(resolve(need('data')),need('task'),signal);
 if(action==='huihui-import')return importHuihuiTts(resolve(need('data')),need('task'),signal);
 if(action==='huihui-export')return exportHuihui(resolve(need('data')),need('task'),resolve(need('out')),signal);
 if(action==='dry-run')return dryRunTts(await parse(need('spec')));
 if(action==='status')return statusTts(resolve(need('data')),need('task'),signal);
 if(action==='export')return exportTts(resolve(need('data')),need('task'),resolve(need('out')),signal,{story:await parse(need('story')),shotId:need('shot')});
 const spec=await parse(need('spec'));if(action==='import'&&spec.provider!=='local-import'||action==='generate'&&spec.provider!=='elevenlabs')throw new EngineError('USAGE','Use import for local-import and generate for elevenlabs');
 const budget=flags['budget-micros'];if(budget!==undefined&&(typeof budget!=='string'||!/^\d{1,10}$/.test(budget)))throw new EngineError('USAGE','Budget must be integer micro-USD');
 return produceTts(spec,resolve(need('data')),signal,{allowPaid:flags['allow-paid']===true,budgetMicros:typeof budget==='string'?Number(budget):undefined,audioPath:action==='import'?resolve(need('audio')):undefined});
}
