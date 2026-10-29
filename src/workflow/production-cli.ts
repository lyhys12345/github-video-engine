import {resolve,join} from 'node:path';
import {ProductionStore} from './production.js';
import {readJson} from './cli.js';
import {EngineError} from '../core/errors.js';
export async function productionCommand(positionals:string[],options:{id?:string;data?:string;design?:string;repair?:string;out?:string;gate?:string;candidate?:string;rules?:string;delegation?:string},signal:AbortSignal){
  if(positionals.length!==2||!options.id)throw new EngineError('USAGE','production readthrough/import/revise/repairs/stills/animatic/motion/status/usage/export/approve --id <id> [--data <directory>]');
  if(['revise','repairs'].includes(positionals[1]!)&&(Object.entries(options).some(([key,value])=>value!==undefined&&!['id','data',...(positionals[1]==='revise'?['repair']:[])].includes(key))||(positionals[1]==='revise'&&!options.repair)))throw new EngineError('USAGE','production revise --id <id> --repair <request.json> [--data <directory>]; production repairs --id <id> [--data <directory>]');
  const store=new ProductionStore(join(resolve(options.data??process.env.GVE_DATA??'.gve'),'workflow'));
  try{const action=positionals[1],id=options.id;
    if(action==='readthrough')return await store.readthrough(id,signal);
    if(action==='import'&&options.design)return await store.import(id,await readJson(resolve(options.design)));
    if(action==='revise'&&options.repair)return await store.revise(id,await readJson(resolve(options.repair)));
    if(action==='repairs')return store.repairs(id);
    if(action==='stills')return await store.render(id,'style',signal);
    if(action==='animatic'||action==='motion')return await store.render(id,action,signal);
    if(action==='status')return await store.status(id);
    if(action==='usage')return store.usage(id);
    if(action==='export'&&options.out)return await store.export(id,resolve(options.out));
    if(action==='approve'&&options.gate&&options.candidate&&options.rules&&options.delegation)return await store.approve(id,options.gate,resolve(options.candidate),resolve(options.rules),resolve(options.delegation));
    throw new EngineError('USAGE','import needs --design; export needs --out; approve needs --gate --candidate --rules --delegation');
  }finally{store.close();}
}
