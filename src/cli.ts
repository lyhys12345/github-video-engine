import {parseArgs} from 'node:util';
import {readFile, mkdir, mkdtemp, writeFile, link, rm} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {Engine} from './orchestrator/engine.js';
import {environment} from './providers/local.js';
import {EngineError, errorInfo} from './core/errors.js';
import {workflowCommand} from './workflow/cli.js';
import {productionCommand} from './workflow/production-cli.js';
import {auditRuntime} from './operations/audit.js';
import {diffCommand} from './workflow/diff-cli.js';
import {finalCommand} from './workflow/final-cli.js';
import {explainCommand} from './evidence-planner/cli.js';
const help = 'Usage: pnpm gve doctor | render --spec <file> | jobs status/resume/cancel | research --repo <url> --out <snapshot> | explain plan --spec <graph> --root <source-root> --data <state> --out <new-directory> | explain status/export --task <id> --data <state> [--out <new-directory>] | explain diff --before <task-id> --after <task-id> --data <state> [--out <new-report.json>] | project create/import/status/export/approve --id <id> | production readthrough/import/revise/repairs/status/usage/stills/animatic/motion/export/approve --id <id> | final prepare/render/status/inspect/export/lock --id <id> | diff --kind plan|production --before <json> --after <json> [--out <new.json>] | audit --data <existing-directory> [--out <new-report.json>]';
let engine: Engine | undefined;
const abort = new AbortController();
const signalHandler = () => abort.abort(new EngineError('CANCELLED', 'Interrupted by user', 'cancelled'));
process.once('SIGINT', signalHandler); process.once('SIGTERM', signalHandler);
try {
  const {values, positionals} = parseArgs({allowPositionals: true, options: {spec: {type: 'string'}, root:{type:'string'}, data: {type: 'string'}, help: {type: 'boolean'}, repo:{type:'string'},ref:{type:'string'},doc:{type:'string',multiple:true},out:{type:'string'},id:{type:'string'},snapshot:{type:'string'},plan:{type:'string'},gate:{type:'string'},candidate:{type:'string'},rules:{type:'string'},delegation:{type:'string'},design:{type:'string'},repair:{type:'string'},kind:{type:'string'},before:{type:'string'},after:{type:'string'},authorization:{type:'string'},'owner-record':{type:'string'},task:{type:'string'}}});
  const [command, action, id] = positionals;
  if (values.help || !command) { console.log(help); }
  else if(command==='explain'){console.log(JSON.stringify(await explainCommand(positionals,values,abort.signal),null,2));}
  else if(command==='diff'){
    if(Object.entries(values).some(([key,value])=>value!==undefined&&!['kind','before','after','out'].includes(key)))throw new EngineError('USAGE','diff accepts only --kind, --before, --after and --out');
    console.log(JSON.stringify(await diffCommand(positionals,values),null,2));
  }
  else if(command==='audit'){
    if(positionals.length!==1||!values.data||Object.entries(values).some(([key,value])=>value!==undefined&&!['data','out'].includes(key)))throw new EngineError('USAGE','Usage: pnpm gve audit --data <existing-directory> [--out <new-report.json>]');
    const report=await auditRuntime(resolve(values.data));
    if(values.out){
      const path=resolve(values.out);
      try{await writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
      catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw new EngineError('AUDIT_EXPORT_EXISTS',`Refusing to replace existing report ${path}; choose a new output file`);throw error;}
    }
    console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
  }
  else if(command==='production'){console.log(JSON.stringify(await productionCommand(positionals,values,abort.signal),null,2));}
  else if(command==='final'){console.log(JSON.stringify(await finalCommand(positionals,values,abort.signal),null,2));}
  else if(command==='research'||command==='project'){
    console.log(JSON.stringify(await workflowCommand(positionals,values,abort.signal),null,2));
  }
  else if (command === 'doctor') {
    const env = await environment();
    engine = new Engine(resolve(values.data ?? process.env.GVE_DATA ?? '.gve'));
    await mkdir(join(engine.root, 'tmp'), {recursive: true}); const probe = await mkdtemp(join(engine.root, 'tmp', 'doctor-'));
    try { await writeFile(join(probe, 'source'), 'atomic-link-probe'); await link(join(probe, 'source'), join(probe, 'target')); }
    catch { throw new EngineError('ATOMIC_STORAGE_UNAVAILABLE', 'The data directory must allow same-volume hard links. Use a local NTFS/APFS/ext4 directory with write and link permissions.'); }
    finally { await rm(probe, {recursive: true, force: true}); }
    console.log(JSON.stringify({ok: true, environment: env, sqlite: 'opened; WAL enabled', artifactStorage: 'atomic hard link supported', browser: 'executable found; doctor does not launch the browser', network: 'no downloads or remote APIs used by doctor'}, null, 2));
  } else {
    engine = new Engine(resolve(values.data ?? process.env.GVE_DATA ?? '.gve'));
    if (command === 'render') {
      if (positionals.length > 2 || (!values.spec && !action)) throw new EngineError('USAGE', help);
      const path = resolve(values.spec ?? action!);
      const text = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '');
      let value: unknown;
      try { value = JSON.parse(text); }
      catch (error) { throw new EngineError('INVALID_JSON', `Invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`); }
      const job = await engine.submit(value, dirname(path));
      console.error(JSON.stringify({jobId: job.id, status: job.status}));
      await engine.run(job.id, abort.signal); console.log(JSON.stringify(await engine.status(job.id), null, 2));
    } else if (command === 'jobs' && action === 'status') {
      const status = id ? await engine.status(id) : engine.db.list(); console.log(JSON.stringify(status, null, 2));
      if (id && 'integrity' in status && status.integrity.some((i) => !i.valid)) process.exitCode = 1;
    } else if (command === 'jobs' && action === 'resume' && id) {
      await engine.run(id, abort.signal); console.log(JSON.stringify(await engine.status(id), null, 2));
    } else if (command === 'jobs' && action === 'cancel' && id) {
      engine.db.cancel(id); console.log(JSON.stringify({jobId: id, cancellationRequested: true}));
    } else throw new EngineError('USAGE', help);
  }
} catch (error) { const info = errorInfo(error); console.error(JSON.stringify({error: info}, null, 2)); process.exitCode = info.classification === 'cancelled' ? 130 : 1; }
finally { engine?.close(); process.removeListener('SIGINT', signalHandler); process.removeListener('SIGTERM', signalHandler); }
