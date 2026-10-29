import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {EngineError} from '../core/errors.js';
import {researchRepository} from '../providers/github-readonly.js';
import {WorkflowStore} from './store.js';
type Options={data?:string;repo?:string;ref?:string;doc?:string[];out?:string;id?:string;snapshot?:string;plan?:string;gate?:string;candidate?:string;rules?:string;delegation?:string};
export async function readJson(path:string){try{const info=await stat(path);if(!info.isFile()||info.size>4_000_000)throw new EngineError('WORKFLOW_SIZE','Workflow inputs must be regular JSON files up to 4 MB');return JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,'')) as unknown;}catch(error){if(error instanceof EngineError)throw error;throw new EngineError('INVALID_JSON',`Cannot read JSON ${path}: ${String(error)}`);}}
export async function workflowCommand(positionals:string[],options:Options,signal:AbortSignal){
  const[command,action]=positionals;
  if((command==='research'&&positionals.length!==1)||(command==='project'&&positionals.length!==2))throw new EngineError('USAGE','Unexpected positional arguments for workflow command');
  if(command==='research'){
    if(!options.repo||!options.out)throw new EngineError('USAGE','research --repo <https://github.com/owner/repo> --out <new-snapshot.json> [--ref <ref>] [--doc <path>]');
    const snapshot=await researchRepository(options.repo,options.ref??'HEAD',options.doc??[],undefined,signal);
    const path=resolve(options.out);await mkdir(dirname(path),{recursive:true});
    try{await writeFile(path,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});}catch{throw new EngineError('EXPORT_EXISTS',`Cannot create source snapshot ${path}; choose a new output path`);}
    return{output:path,repository:snapshot.repository,commit:snapshot.commit,documents:snapshot.documents.map((d)=>({path:d.path,sha256:d.sha256})),execution:'read-only; repository code was not executed'};
  }
  const store=new WorkflowStore(join(resolve(options.data??process.env.GVE_DATA??'.gve'),'workflow'));
  try{
    if(action==='list')return store.list();
    if(!options.id)throw new EngineError('USAGE','project <create|import|status|export|approve> --id <project-id>');
    if(action==='create'&&options.snapshot)return await store.create(options.id,await readJson(resolve(options.snapshot)));
    if(action==='import'&&options.plan)return await store.importPlan(options.id,await readJson(resolve(options.plan)));
    if(action==='status')return await store.status(options.id);
    if(action==='export'&&options.out)return await store.export(options.id,options.out);
    if(action==='approve'&&options.gate&&options.candidate&&options.rules&&options.delegation)return await store.approve(options.id,options.gate,resolve(options.candidate),resolve(options.rules),resolve(options.delegation));
    throw new EngineError('USAGE','create needs --snapshot; import needs --plan; export needs --out; approve needs --gate --candidate --rules --delegation');
  }finally{store.close();}
}
