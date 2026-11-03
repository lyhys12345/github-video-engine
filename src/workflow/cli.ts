import {readFile,mkdir,writeFile,stat,lstat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {checkAbort,EngineError} from '../core/errors.js';
import {researchRepository} from '../providers/github-readonly.js';
import {WorkflowStore} from './store.js';
import {Id} from '../contracts/video.js';
import {exportProjectEvidence,exportProjectResearch,planProjectStory} from './project-evidence.js';
import {ancestors} from '../story-planner/runtime.js';
import {captureAuthoringText, exportAuthoringProposal, openAuthoring, statusAuthoringProposal, submitAuthoringProposal} from './agent-authoring.js';
import {adaptAuthoringProposal} from './adapt-proposal.js';
type Options={root?:string;spec?:string;data?:string;repo?:string;ref?:string;doc?:string[];out?:string;id?:string;snapshot?:string;plan?:string;gate?:string;candidate?:string;rules?:string;delegation?:string;proposal?:string};
export async function readJson(path:string){try{const info=await stat(path);if(!info.isFile()||info.size>4_000_000)throw new EngineError('WORKFLOW_SIZE','Workflow inputs must be regular JSON files up to 4 MB');return JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,'')) as unknown;}catch(error){if(error instanceof EngineError)throw error;throw new EngineError('INVALID_JSON',`Cannot read JSON ${path}: ${String(error)}`);}}
async function checkDatabaseFiles(database:string) {
  const entries = await Promise.all(['','-wal','-shm','-journal'].map(async suffix => {
    const info=await lstat(database+suffix).catch(error=>{
      if((error as NodeJS.ErrnoException).code==='ENOENT')return null;
      throw error;
    });
    if(info&&(!info.isFile()||info.isSymbolicLink())) {
      throw new EngineError('WORKFLOW_PATH','Workflow databases and sidecars must be regular files');
    }
    return info;
  }));
  return entries[0] !== null;
}
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
  const data=resolve(options.data??process.env.GVE_DATA??'.gve');
  const workflow=join(data,'workflow');
  if(action==='author'||action==='capture-text'||action==='submit-proposal'||action==='proposal-status'||action==='export-proposal'||action==='adapt-proposal'){
    const required = action==='author'?['out']:action==='proposal-status'?['proposal']:action==='export-proposal'?['proposal','out']:action==='adapt-proposal'?['proposal','spec']:['spec'];
    if(!Id.safeParse(options.id).success || required.some(key=>!String(options[key as keyof Options]??'').trim()) ||
        Object.entries(options).some(([key,value])=>value!==undefined&&!['id','data',...required].includes(key))){
      throw new EngineError('USAGE','project author --id <id> --out <directory> | project capture-text|submit-proposal --id <id> --spec <json> | project proposal-status|export-proposal --id <id> --proposal <hash> [--out <directory>] | project adapt-proposal --id <id> --proposal <hash> --spec <mapping.json>');
    }
    checkAbort(signal);
    await ancestors(workflow);
    if(!await checkDatabaseFiles(join(workflow,'workflow.sqlite')))throw new EngineError('WORKFLOW_NOT_FOUND','Existing workflow state is required');
    if(action==='adapt-proposal'){
      await checkDatabaseFiles(join(data,'tasks.sqlite'));
      await ancestors(join(data,'tmp'));
    }
    const store=new WorkflowStore(workflow,{authoring:true});
    try{
      if(action==='author')return await openAuthoring(store,options.id!,options.out!,signal);
      if(action==='capture-text')return await captureAuthoringText(store,options.id!,options.spec!,signal);
      if(action==='submit-proposal')return await submitAuthoringProposal(store,options.id!,options.spec!,signal);
      if(action==='proposal-status')return await statusAuthoringProposal(store,options.id!,options.proposal!,signal);
      if(action==='adapt-proposal')return await adaptAuthoringProposal(store,options.id!,options.proposal!,options.spec!,data,signal);
      return await exportAuthoringProposal(store,options.id!,options.proposal!,options.out!,signal);
    }finally{store.close();}
  }
  if(action==='intake'||action==='evidence'||action==='research'||action==='story'){
    const common=['data','id'];
    const allowed=action==='intake'?[...common,'repo','ref','doc']:action==='evidence'||action==='research'?[...common,'out']:[...common,'spec','root','out'];
    const required=action==='intake'?['repo']:action==='evidence'||action==='research'?['out']:['spec','root','out'];
    if(!Id.safeParse(options.id).success||Object.entries(options).some(([key,value])=>value!==undefined&&!allowed.includes(key))||
        required.some(key=>!String(options[key as keyof Options]??'').trim())){
      throw new EngineError('USAGE','project intake --repo <url> --id <id> | project evidence --id <id> --out <directory> | project research --id <id> --out <directory> | project story --id <id> --spec <story.json> --root <evidence-bundle> --out <directory>');
    }
    checkAbort(signal);
    await ancestors(workflow);
    const db=await checkDatabaseFiles(join(workflow,'workflow.sqlite'));
    if(action==='intake'){
      const snapshot=await researchRepository(options.repo!,options.ref??'HEAD',options.doc??[],undefined,signal);
      checkAbort(signal);
      await ancestors(workflow);
      await checkDatabaseFiles(join(workflow,'workflow.sqlite'));
      const store=new WorkflowStore(workflow);
      try{
        const project=await store.create(options.id!,snapshot,{preserveExistingSource:true});
        return{project,commit:snapshot.commit,state:'EVIDENCE_CAPTURED',next:'Open a pinned session authoring work package with project author'};
      }finally{store.close();}
    }
    if(!db)throw new EngineError('WORKFLOW_NOT_FOUND','Existing workflow state is required');
    if(action==='story'){
      await checkDatabaseFiles(join(data,'tasks.sqlite'));
      await ancestors(join(data,'tmp'));
    }
    const store=new WorkflowStore(workflow);
    try{
      if(action==='evidence')return await exportProjectEvidence(store,options.id!,options.out!,signal);
      if(action==='research')return await exportProjectResearch(store,options.id!,options.out!,signal);
      return await planProjectStory(store,options.id!,options.spec!,options.root!,data,options.out!,signal);
    }finally{store.close();}
  }
  if(action==='export')checkAbort(signal);
  await ancestors(workflow);
  await checkDatabaseFiles(join(workflow,'workflow.sqlite'));
  const store=new WorkflowStore(workflow);
  try{
    if(action==='list')return store.list();
    if(!options.id)throw new EngineError('USAGE','project <create|import|status|export|approve> --id <project-id>');
    if(action==='create'&&options.snapshot)return await store.create(options.id,await readJson(resolve(options.snapshot)));
    if(action==='import'&&options.plan)return await store.importPlan(options.id,await readJson(resolve(options.plan)));
    if(action==='status')return await store.status(options.id);
    if(action==='export'&&options.out)return await store.export(options.id,options.out,signal);
    if(action==='approve'&&options.gate&&options.candidate&&options.rules&&options.delegation)return await store.approve(options.id,options.gate,resolve(options.candidate),resolve(options.rules),resolve(options.delegation));
    throw new EngineError('USAGE','create needs --snapshot; import needs --plan; export needs --out; approve needs --gate --candidate --rules --delegation');
  }finally{store.close();}
}
