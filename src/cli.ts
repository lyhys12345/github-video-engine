import {showcaseCommand} from './showcase/cli.js';
import {capabilityReport,capabilityPhases,type CapabilityPhase} from './providers/capabilities.js';
import {firstOwnerCommand, firstOwnerUsage} from './providers/first-owner.js';
import {speechAlignmentCommand} from './speech-alignment/report.js';
import {rsiMediaCommand} from './workflow/rsi-media.js';
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
import {storyCommand} from './story-planner/cli.js';
import {explainCommand} from './evidence-planner/cli.js';
import {ttsCommand} from './tts/cli.js';
import {presentationCommand} from './presentation/cli.js';
import {explanationCommand} from './workflow/explanation-cli.js';
const help = 'Usage: pnpm gve ' + firstOwnerUsage + ' | explanation showcase --workspace W --spec MANIFEST --review SCRIPT_REVIEW | showcase render/status/resume/review/export/import/quality/feedback-context/revision-impact/revision-prepare/revision-finalize | showcase audience-audit --request JSON --out NEW_DIR | doctor --capabilities [--phase planning|speech|animation|voice|preview] | alignment cues --spec JSON --request JSON --out JSON | alignment report --request JSON --audio WAV --approval JSON [--script JSON] [--timings JSON|--windows-speech] --out JSON | rsi-media freeze/verify/start/status/review/apply/summary | tts dry-run/generate/import/status/export/huihui-generate/huihui-status/huihui-import/huihui-export | presentation voice-bind/render/status/resume/export/assemble/sequence-status/sequence-resume/sequence-export/timing-check/timing-check-status/timing-check-export | doctor | render --spec <file> | jobs status/resume/cancel | research --repo <url> --out <snapshot> | explanation api-author/project-export/project-import/run/next/start/proposal/voice-prepare/render/narrated-render/revise/status/resume/export/fact-review/portable-export/portable-import/portable-render/narrative-packet/narrative-story/narrative-plan/narrative-status/narrative-export/narrative-preview/narrative-preview-status/narrative-preview-export | explain plan --spec <graph> --root <source-root> --data <state> --out <new-directory> | explain status/export --task <id> --data <state> [--out <new-directory>] | explain diff --before <task-id> --after <task-id> --data <state> [--out <new-report.json>] | project intake/author/capture-text/submit-proposal/proposal-status/export-proposal/adapt-proposal/presentation-plan/evidence/story/create/import/status/approve --id <id> | production readthrough/import/revise/repairs/status/usage/stills/animatic/motion/export/approve --id <id> | final prepare/render/status/inspect/export/lock --id <id> | diff --kind plan|production --before <json> --after <json> [--out <new.json>] | audit --data <existing-directory> [--out <new-report.json>]';
let engine: Engine | undefined;
const abort = new AbortController();
const signalHandler = () => abort.abort(new EngineError('CANCELLED', 'Interrupted by user', 'cancelled'));
process.once('SIGINT', signalHandler); process.once('SIGTERM', signalHandler);
try {
  const {values, positionals} = parseArgs({allowPositionals: true, options: {capabilities:{type:'boolean'},'first-owner':{type:'boolean'},phase:{type:'string'},language:{type:'string'},request:{type:'string'},approval:{type:'string'},script:{type:'string'},timings:{type:'string'},'windows-speech':{type:'boolean'},'frames-only':{type:'boolean'},'skip-stills':{type:'boolean'},'still-frames':{type:'string'},feedback:{type:'string'},'enable-api':{type:'boolean'},package:{type:'string'},digest:{type:'string'},workspace:{type:'string'},'source-depth':{type:'string'},'source-path':{type:'string',multiple:true},author:{type:'string'},through:{type:'string'},spec: {type: 'string'}, root:{type:'string'}, data: {type: 'string'}, help: {type: 'boolean'}, repo:{type:'string'},ref:{type:'string'},doc:{type:'string',multiple:true},out:{type:'string'},id:{type:'string'},snapshot:{type:'string'},plan:{type:'string'},proposal:{type:'string'},voice:{type:'string'},mode:{type:'string'},presentation:{type:'string'},review:{type:'string'},expected:{type:'string'},publication:{type:'string'},gate:{type:'string'},candidate:{type:'string'},rules:{type:'string'},delegation:{type:'string'},design:{type:'string'},repair:{type:'string'},kind:{type:'string'},before:{type:'string'},after:{type:'string'},authorization:{type:'string'},'owner-record':{type:'string'},task:{type:'string'},audio:{type:'string'},story:{type:'string'},shot:{type:'string'},'allow-paid':{type:'boolean'},'budget-micros':{type:'string'}}});
  const [command, action, id] = positionals;
  if (values.help || !command) { console.log(help); }
  else if(command==='showcase'){console.log(JSON.stringify(await showcaseCommand(positionals,values,abort.signal),null,2));}
  else if(command==='explanation'&&action==='showcase'){if(positionals.length!==2||!values.workspace||values.data)throw new EngineError('USAGE','explanation showcase requires --workspace and exactly two command words; use showcase render --data for historical standalone material.');console.log(JSON.stringify(await showcaseCommand(['showcase','render'],values,abort.signal),null,2));}
  else if(command==='alignment'){console.log(JSON.stringify(await speechAlignmentCommand(positionals,values,abort.signal),null,2));}
  else if(command==='rsi-media'){console.log(JSON.stringify(await rsiMediaCommand(positionals,values),null,2));}
  else if(command==='tts'){console.log(JSON.stringify(await ttsCommand(positionals,values,abort.signal),null,2));}
  else if(command==='story'){console.log(JSON.stringify(await storyCommand(positionals,values,abort.signal),null,2));}
  else if (command === 'presentation') {
    const result = await presentationCommand(positionals, values, abort.signal);
    console.log(JSON.stringify(result, null, 2));
    if (action === 'timing-check' && 'declaredTemporalChecks' in result && result.declaredTemporalChecks === 'failed') {
      process.exitCode = 2;
    }
  }
  else if(command==='explain'){console.log(JSON.stringify(await explainCommand(positionals,values,abort.signal),null,2));}
  else if (command === 'explanation') {console.log(JSON.stringify(await explanationCommand(positionals, values, abort.signal), null, 2));}
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
  else if (command === 'doctor' && values['first-owner']) {
    const report = await firstOwnerCommand(positionals, values, abort.signal);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
  else if (command === 'doctor' && values.capabilities) {
    const allowed=['capabilities','phase','data','voice','language'];
    if(positionals.length!==1||Object.entries(values).some(([k,v])=>v!==undefined&&!allowed.includes(k)))throw new EngineError('USAGE','doctor --capabilities [--phase planning|speech|animation|voice|preview] [--data state] [--voice profile] [--language tag]');
    if(values.phase&&!capabilityPhases.includes(values.phase as CapabilityPhase))throw new EngineError('USAGE','Unknown capability phase');
    const report=await capabilityReport({phase:values.phase as CapabilityPhase|undefined,data:values.data,voice:values.voice,language:values.language,signal:abort.signal});
    console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
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
