import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {z} from 'zod';
import {WorkflowStore} from './store.js';
import {TaskRunner,type TaskRecord} from '../orchestrator/tasks.js';
import {ArtifactSchema,type Artifact} from '../contracts/runtime.js';
import {ProductionPackageSchema,ReadthroughSchema,type ProductionPackage} from '../contracts/production.js';
import {DelegationSchema} from '../contracts/planning.js';
import {Hash,Id} from '../contracts/video.js';
import {EngineError} from '../core/errors.js';
import {canonical,sha256,fileHash} from '../core/util.js';
import {environment,projectRoot} from '../providers/local.js';
import {measureReadthrough} from '../providers/sapi.js';
import {renderProduction} from '../renderer/production.js';
import {cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {checkGateV2} from '../evaluation/judge-gate.mjs';
import {migrateProduction} from './repair-db.js';
import {RepairRequestSchema,validateRepairRows,repairScopeId,repairRequestId,type RepairScope,type RepairRound} from '../contracts/revision.js';
import {diffRevisions} from '../operations/revision-diff.js';
type PackageRow={hash:string;projectId:string;planRevision:string;artifact:Artifact};
const Binding=z.object({projectId:Id,planRevision:Hash,packageHash:Hash,gate:z.enum(['G3','G4']),evidenceHashes:z.array(Hash).min(1)}).strict();
export class ProductionStore{
  readonly workflow:WorkflowStore;readonly tasks:TaskRunner;readonly db:DatabaseSync;
  constructor(readonly root:string,readonly reviewRoot=projectRoot){
    this.workflow=new WorkflowStore(root);
    try{this.tasks=new TaskRunner(root);try{this.db=new DatabaseSync(join(resolve(root),'production.sqlite'));try{migrateProduction(this.db);}catch(e){this.db.close();throw e;}}catch(e){this.tasks.close();throw e;}}catch(e){this.workflow.close();throw e;}
  }
  close(){this.db.close();this.tasks.close();this.workflow.close();}
  private tx<T>(fn:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  async script(id:string){const status=await this.workflow.status(id),approved=status.project.currentRevision;if(!approved||!status.approvals.some(a=>a.gate==='G2'&&a.revisionHash===approved))throw new EngineError('GATE_ORDER','Current script needs its real G2 approval before readthrough or preparation');
    // Pin the checked revision across awaits. Never re-read a new, unapproved current revision.
    const revision=await this.workflow.revision(id,approved);if(this.workflow.project(id).currentRevision!==approved)throw new EngineError('WORKFLOW_CHANGED','Script changed while checking G2; recheck the new revision');return revision;}
  async readthrough(id:string,signal:AbortSignal){const current=await this.script(id);const env=await environment(),scriptHash=await fileHash(join(projectRoot,'scripts/sapi-readthrough.ps1'));
    const result=await this.tasks.run('readthrough',{projectId:id,planRevision:current.record.hash,environment:env,scriptHash},async(directory,signal)=>{const value=await measureReadthrough(current.plan,current.record.hash,directory,this.tasks.artifacts,signal);return{value,outputs:value.lines.map(l=>l.audio)};},signal,{attempts:2,timeoutMs:120000,accounting:{provider:'windows-sapi-offline',ratePolicy:'local-zero-v1'}});
    return{...result,artifact:this.tasks.get(result.id)!.result};
  }
  private matchingTasks(kind:string,packageHash:string){return this.tasks.list().filter(t=>t.kind===kind&&(t.input as {packageHash?:string}).packageHash===packageHash);}
  private repairRows(){
    let bytes=0;const read=(table:string)=>{const size=this.db.prepare(`SELECT COUNT(*) AS n,COALESCE(SUM(length(CAST(data AS BLOB))),0) AS bytes FROM ${table}`).get()!;bytes+=Number(size.bytes);if(Number(size.n)>10000||bytes>32000000)throw new EngineError('REPAIR_INVALID','Repair ledger coverage limit exceeded');return this.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map(row=>{const value=JSON.parse(row.data as string);if(row.id!==value.id||(table==='repair_scopes'?(row.project_id!==value.projectId||row.plan_revision!==value.planRevision):(row.scope_id!==value.scopeId||row.request_id!==value.requestId||row.round!==value.round)))throw new EngineError('REPAIR_INVALID','Repair SQL/JSON identity mismatch');return value;});};
    return validateRepairRows(read('repair_scopes'),read('repair_rounds'));
  }
  repairs(id:string){this.workflow.project(id);const {scopes,rounds}=this.repairRows();return{projectId:id,scopes:scopes.filter(s=>s.projectId===id),rounds:rounds.filter(r=>r.projectId===id),revisionCoverage:'recorded new corrections only; historical unrecorded corrections are unknown',renderGranularity:'whole-package; scene media cache reuse is not inferred',productionAuthorizationGranted:false,finalHumanAcceptance:'pending'};}
  private async cachedRepair(repair:RepairRound){
    const packageRow=(hash:string)=>{const row=this.db.prepare('SELECT data FROM packages WHERE hash=?').get(hash);if(!row)throw new EngineError('REPAIR_INVALID','Recorded correction package is missing');const parsed=JSON.parse(row.data as string) as PackageRow;if(parsed.hash!==hash||parsed.projectId!==repair.projectId||parsed.planRevision!==repair.planRevision)throw new EngineError('REPAIR_INVALID','Recorded correction package binding mismatch');return parsed;};
    const parent=packageRow(repair.parentHash),next=packageRow(repair.nextHash),before=ProductionPackageSchema.parse(await this.tasks.artifacts.readJson(parent.artifact)),after=ProductionPackageSchema.parse(await this.tasks.artifacts.readJson(next.artifact));
    if(sha256(canonical(before))!==repair.parentHash||sha256(canonical(after))!==repair.nextHash)throw new EngineError('REPAIR_INVALID','Cached correction content fingerprint mismatch');
    const proposed=structuredClone(before),scene=proposed.scenes.find(s=>s.id===repair.request.sceneId);if(!scene)throw new EngineError('REPAIR_INVALID','Cached correction scene is missing');Object.assign(scene,repair.request.replacement);
    if(canonical(proposed)!==canonical(after)||repair.diff.mediaType!=='application/json'||repair.diff.producingStage!=='VALIDATE'||repair.diff.inputFingerprint!==repair.nextHash||canonical(await this.tasks.artifacts.readJson(repair.diff))!==canonical(diffRevisions('production',before,after)))throw new EngineError('REPAIR_INVALID','Cached correction diff or supported edit binding mismatch');
    await this.tasks.artifacts.verify(repair.request.issue.evidence);
    return{package:next,repair,cached:true,selected:this.db.prepare('SELECT hash FROM selected WHERE project_id=?').get(repair.projectId)?.hash===repair.nextHash};
  }
  async import(id:string,value:unknown){const current=await this.script(id),design=ProductionPackageSchema.parse(value);
    if(design.projectId!==id||design.planRevision!==current.record.hash)throw new EngineError('PRODUCTION_BINDING','Production package does not match current approved script');
    const readthrough=await this.readMeasured(design);
    if(design.scenes.length!==current.plan.script.length||design.scenes.some((s,i)=>s.scriptId!==current.plan.script[i]!.id||canonical(s.claimIds)!==canonical(current.plan.script[i]!.claimIds)))throw new EngineError('PRODUCTION_SCRIPT','Scenes must cover the approved script exactly and preserve claim IDs');
    const motionIndex=design.scenes.findIndex(s=>s.id===design.authorization.motionScene);
    if(readthrough.lines[motionIndex]!.allocatedFrames/readthrough.fps<design.authorization.motionSeconds)throw new EngineError('MOTION_RANGE','Representative motion range extends beyond its scene');
    const motionVoice=readthrough.lines.find(l=>l.id===design.authorization.motionAudioScriptId);
    if(!motionVoice||motionVoice.durationMs+250>design.authorization.motionSeconds*1000)throw new EngineError('MOTION_AUDIO','Motion audio must be one complete approved script line that fits naturally with at least250ms pause; never crop or speed speech to fit');
    const hash=sha256(canonical(design)),artifact=await this.tasks.artifacts.commit(canonical(design),'application/json','VALIDATE',hash);
    return this.tx(()=>{if(this.workflow.project(id).currentRevision!==current.record.hash)throw new EngineError('WORKFLOW_CHANGED','Plan changed during preparation');
      const {scopes,rounds}=this.repairRows(),scope=scopes.find(s=>s.projectId===id&&s.planRevision===current.record.hash),selected=this.db.prepare('SELECT hash FROM selected WHERE project_id=?').get(id)?.hash as string|undefined;
      if(scope){const last=rounds.filter(r=>r.scopeId===scope.id).sort((a,b)=>b.round-a.round)[0]!;if(selected!==last.nextHash)throw new EngineError('REPAIR_INVALID','Selected package conflicts with its repair history');if(hash!==selected)throw new EngineError('REPAIR_REQUIRED','Use production revise for changes within the existing correction scope; imports cannot reset its budget');}
      else if(selected&&selected!==hash){const old=this.db.prepare('SELECT data FROM packages WHERE hash=?').get(selected);const prior=old?JSON.parse(old.data as string) as PackageRow:null;if(prior?.planRevision===current.record.hash&&this.db.prepare("SELECT 1 FROM production_approvals WHERE project_id=? AND package_hash=? AND gate IN ('G3','G4')").get(id,selected))throw new EngineError('REPAIR_REQUIRED','An approved package must be changed through production revise with an observed issue and bounded rounds');}
      const row:PackageRow={hash,projectId:id,planRevision:current.record.hash,artifact};this.db.prepare('INSERT OR IGNORE INTO packages(hash,data) VALUES(?,?)').run(hash,canonical(row));
      this.db.prepare('INSERT INTO selected(project_id,hash) VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET hash=excluded.hash').run(id,hash);return JSON.parse(this.db.prepare('SELECT data FROM packages WHERE hash=?').get(hash)!.data as string) as PackageRow;});
  }
  async revise(id:string,value:unknown){
    const parsed=RepairRequestSchema.safeParse(value);if(!parsed.success)throw new EngineError('REPAIR_INPUT',parsed.error.message);const request=parsed.data,current=await this.current(id),scopeId=repairScopeId(id,current.record.planRevision),requestId=repairRequestId(scopeId,request.requestId);
    const previous=this.repairRows(),existing=previous.rounds.find(r=>r.id===requestId);
    if(existing){if(canonical(existing.request)!==canonical(request))throw new EngineError('REPAIR_REQUEST_CONFLICT','This requestId already identifies different correction input');return this.cachedRepair(existing);}
    if(request.expectedPackageHash!==current.record.hash)throw new EngineError('REPAIR_STALE','Correction expectedPackageHash is not the selected package');
    const knownScope=previous.scopes.find(s=>s.id===scopeId),priorRounds=previous.rounds.filter(r=>r.scopeId===scopeId).sort((a,b)=>a.round-b.round);
    if(knownScope&&priorRounds.at(-1)!.nextHash!==current.record.hash)throw new EngineError('REPAIR_INVALID','Selected package conflicts with correction history');
    const baselineHash=knownScope?.baselinePackageHash??current.record.hash,approval=await this.approval(id,baselineHash,'G3');
    if(!approval)throw new EngineError('GATE_ORDER','Local correction requires an actually recorded G3 baseline');
    const receipt=await this.tasks.artifacts.readJson<any>(approval.artifact);if(receipt.planRevision!==current.record.planRevision)throw new EngineError('REPAIR_INVALID','Baseline approval does not bind this approved plan');
    if(knownScope&&(knownScope.maxRounds!==current.plan.budget.maxRevisionRounds||canonical(knownScope.baselineApproval)!==canonical(approval.artifact)))throw new EngineError('REPAIR_INVALID','Correction scope budget or baseline approval conflicts with its source');
    const maxRounds=knownScope?.maxRounds??current.plan.budget.maxRevisionRounds;if(priorRounds.length>=maxRounds)throw new EngineError('REPAIR_BUDGET',`Approved correction scope used all ${maxRounds} rounds; changing inputs or requestId cannot reset it`);
    const evidence=request.issue.evidence;
    if(!['image/png','video/mp4'].includes(evidence.mediaType))throw new EngineError('REPAIR_EVIDENCE','Observed issue needs a committed image/video output of this package');
    const task=this.tasks.list().find(t=>t.state==='succeeded'&&['style','animatic','motion'].includes(t.kind)&&typeof t.input==='object'&&t.input!==null&&(t.input as any).projectId===id&&(t.input as any).packageHash===current.record.hash&&t.outputs.some(a=>canonical(a)===canonical(evidence)));
    if(!task)throw new EngineError('REPAIR_EVIDENCE','Issue evidence is not an output of a successful task for the selected package');await this.tasks.artifacts.verify(evidence);await this.tasks.artifacts.verify(task.result!);
    const next=structuredClone(current.design),scene=next.scenes.find(s=>s.id===request.sceneId);if(!scene)throw new EngineError('REPAIR_INPUT','Correction sceneId is not in the selected package');Object.assign(scene,request.replacement);const design=ProductionPackageSchema.parse(next),hash=sha256(canonical(design));
    if(hash===current.record.hash)throw new EngineError('REPAIR_NO_CHANGE','Correction makes no canonical change');
    const difference=diffRevisions('production',current.design,design),artifact=await this.tasks.artifacts.commit(canonical(design),'application/json','VALIDATE',hash),diff=await this.tasks.artifacts.commit(canonical(difference),'application/json','VALIDATE',hash);
    const result=this.tx(()=>{
      if(this.workflow.project(id).currentRevision!==current.record.planRevision)throw new EngineError('WORKFLOW_CHANGED','Plan changed during correction');
      const ledger=this.repairRows(),duplicate=ledger.rounds.find(r=>r.id===requestId),selected=this.db.prepare('SELECT hash FROM selected WHERE project_id=?').get(id)?.hash;
      if(duplicate){if(canonical(duplicate.request)!==canonical(request))throw new EngineError('REPAIR_REQUEST_CONFLICT','Concurrent requestId has conflicting input');if(duplicate.nextHash!==hash||duplicate.diff.sha256!==diff.sha256)throw new EngineError('REPAIR_INVALID','Concurrent correction output binding mismatch');const kept=this.db.prepare('SELECT data FROM packages WHERE hash=?').get(duplicate.nextHash)!;return{package:JSON.parse(kept.data as string) as PackageRow,repair:duplicate,cached:true,selected:selected===duplicate.nextHash};}
      if(selected!==current.record.hash)throw new EngineError('REPAIR_STALE','Another correction selected a newer package');
      const storedScope=ledger.scopes.find(s=>s.id===scopeId),rs=ledger.rounds.filter(r=>r.scopeId===scopeId).sort((a,b)=>a.round-b.round);if(storedScope&&rs.at(-1)!.nextHash!==current.record.hash)throw new EngineError('REPAIR_INVALID','Correction history changed during preparation');if(rs.length>=maxRounds)throw new EngineError('REPAIR_BUDGET','Approved correction rounds exhausted');
      const now=new Date().toISOString(),scope:RepairScope=storedScope??{schemaVersion:'1.0',id:scopeId,projectId:id,planRevision:current.record.planRevision,baselinePackageHash:baselineHash,baselineApproval:approval.artifact,maxRounds,createdAt:now};
      if(!storedScope)this.db.prepare('INSERT INTO repair_scopes(id,project_id,plan_revision,data) VALUES(?,?,?,?)').run(scope.id,id,scope.planRevision,canonical(scope));
      const row:PackageRow={hash,projectId:id,planRevision:current.record.planRevision,artifact},repair:RepairRound={schemaVersion:'1.0',id:requestId,scopeId,requestId:request.requestId,round:rs.length+1,projectId:id,planRevision:current.record.planRevision,parentHash:current.record.hash,nextHash:hash,request,diff,createdAt:now};
      this.db.prepare('INSERT OR IGNORE INTO packages(hash,data) VALUES(?,?)').run(hash,canonical(row));this.db.prepare('INSERT INTO repair_rounds(id,scope_id,request_id,round,data) VALUES(?,?,?,?,?)').run(repair.id,scopeId,request.requestId,repair.round,canonical(repair));this.db.prepare('UPDATE selected SET hash=? WHERE project_id=?').run(hash,id);
      return{package:row,repair,cached:false,selected:true};
    });
    return result.cached?this.cachedRepair(result.repair):result;
  }
  async readMeasured(design:ProductionPackage){const artifact=ArtifactSchema.parse(design.readthrough),value=ReadthroughSchema.parse(await this.tasks.artifacts.readJson(artifact));
    const records=this.tasks.list();if(!records.some(t=>t.state==='succeeded'&&t.kind==='readthrough'&&t.result?.sha256===artifact.sha256))throw new EngineError('READTHROUGH_PROVENANCE','Readthrough must be a committed successful local measurement task');
    const current=await this.workflow.revision(design.projectId,design.planRevision);
    if(value.projectId!==design.projectId||value.planRevision!==design.planRevision||value.fps!==current.plan.brief.fps||value.lines.length!==current.plan.script.length||value.lines.some((l,i)=>l.id!==current.plan.script[i]!.id||l.text!==current.plan.script[i]!.narration))throw new EngineError('READTHROUGH_BINDING','Measured readthrough does not match approved script');
    for(const line of value.lines)await this.tasks.artifacts.verify(line.audio);return value;
  }
  async current(id:string){const current=await this.script(id);const selected=this.db.prepare('SELECT hash FROM selected WHERE project_id=?').get(id);if(!selected)throw new EngineError('PREPARATION_REQUIRED','Import a production package first');
    const row=this.db.prepare('SELECT data FROM packages WHERE hash=?').get(selected.hash as string);const record=JSON.parse(row!.data as string) as PackageRow;
    const design=ProductionPackageSchema.parse(await this.tasks.artifacts.readJson(record.artifact));
    if(record.hash!==sha256(canonical(design))||design.projectId!==id||record.planRevision!==current.record.hash||design.planRevision!==current.record.hash)throw new EngineError('PREPARATION_STALE','Source/script changed; import a fresh production package. Historical artifacts are retained.');
    return{record,design,readthrough:await this.readMeasured(design),plan:current.plan};
  }
  async approval(id:string,packageHash:string,gate:string){const row=this.db.prepare('SELECT data FROM production_approvals WHERE project_id=? AND package_hash=? AND gate=?').get(id,packageHash,gate);if(!row)return null;
    const record=JSON.parse(row.data as string);const receipt=await this.tasks.artifacts.readJson<any>(record.artifact);if(receipt.packageHash!==packageHash||receipt.projectId!==id||receipt.gate!==gate)throw new EngineError('APPROVAL_INTEGRITY','Production approval receipt binding mismatch');return record;
  }
  async render(id:string,mode:'style'|'animatic'|'motion',signal:AbortSignal){const current=await this.current(id);if(mode!=='style'&&!await this.approval(id,current.record.hash,'G3'))throw new EngineError('GATE_ORDER','G3 on this exact package is required before dynamic previews');
    const env=await environment(),input={projectId:id,packageHash:current.record.hash,environment:env};
    const result=await this.tasks.run<Awaited<ReturnType<typeof renderProduction>>['value']>(mode,input,async(directory,signal)=>renderProduction(mode,current.design,current.readthrough,current.plan,directory,this.tasks.artifacts,current.record.hash,signal),signal,{beforeDiscardTemporary:directory=>cleanupOwnedRuntimeTmp(directory),attempts:current.design.authorization.maxPreviewAttempts,timeoutMs:360000,accounting:{provider:'remotion-local',ratePolicy:'local-zero-v1'},...(mode==='style'?{}:{scopeKey:`${mode}:${current.record.hash}`,maxScopeAttempts:current.design.authorization.maxPreviewAttempts})});
    if(this.workflow.project(id).currentRevision!==current.record.planRevision)throw new EngineError('WORKFLOW_CHANGED','Script changed during render; output remains historical and cannot be approved for the current script');
    return{...result,artifact:this.tasks.get(result.id)!.result};
  }
  usage(id:string){this.workflow.project(id);return{projectId:id,...this.tasks.usage(id),currency:'USD',actualPaidUsd:null,totalProjectCostUsd:null,cacheReadCoverage:'recorded receipts only; missing historical cache reads are not inferred',productionAuthorizationGranted:false,finalHumanAcceptance:'pending'};}
  async status(id:string){const c=await this.current(id),approvals=[];for(const gate of ['G3','G4']){const a=await this.approval(id,c.record.hash,gate);if(a)approvals.push(a);}
    const tasks=this.tasks.list().filter(t=>(t.input as any).projectId===id);for(const t of tasks)if(t.state==='succeeded')for(const a of [t.result!,...t.outputs])await this.tasks.artifacts.verify(a);
    return{projectId:id,packageHash:c.record.hash,planRevision:c.record.planRevision,durationSeconds:c.readthrough.totalFrames/c.readthrough.fps,approvals,tasks,state:approvals.some(a=>a.gate==='G4')?'PREVIEW_APPROVED':approvals.some(a=>a.gate==='G3')?'PREVIEW_AUTHORIZED':'STATIC_REVIEW',finalHumanAcceptance:'pending',referenceCoverage:c.design.references};
  }
  async export(id:string,out:string){const current=await this.current(id);await mkdir(out,{recursive:true});const write=async(name:string,data:Buffer|string)=>{const path=join(resolve(out),name);try{await writeFile(path,data,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||sha256(await readFile(path))!==sha256(data))throw new EngineError('EXPORT_EXISTS',`Refusing to replace ${path}`);}return path;};
    const input=await write('production-input.json',canonical(current.design));await write('readthrough.json',canonical(current.readthrough));
    for(const l of current.readthrough.lines)await write(`${l.id}.wav`,await readFile(this.tasks.artifacts.path(l.audio)));
    const allTasks=this.tasks.list().filter(t=>t.state==='succeeded'&&(t.input as any).packageHash===current.record.hash);
    const tasks=allTasks.filter((t,i)=>allTasks.findIndex(other=>other.kind===t.kind)===i);
    for(const task of tasks){await write(`${task.kind}-manifest.json`,await readFile(this.tasks.artifacts.path(task.result!)));for(let i=0;i<task.outputs.length;i++){const a=task.outputs[i]!;await this.tasks.artifacts.verify(a);await write(task.kind==='style'?(i===task.outputs.length-1?'contact-sheet.png':`scene-${i+1}.png`):a.mediaType==='video/mp4'?`${task.kind}.mp4`:`${task.kind}-evaluation.json`,await readFile(this.tasks.artifacts.path(a)));}}
    return{projectId:id,packageHash:current.record.hash,directory:resolve(out),productionInput:input,tasks:tasks.map(t=>t.id)};
  }
  async approve(id:string,gate:string,candidatePath:string,rulesPath:string,delegationPath:string){
    if(gate==='G6')throw new EngineError('HUMAN_FINAL_REQUIRED','G6 remains direct final user review');if(!['G3','G4'].includes(gate))throw new EngineError('GATE_NOT_READY','M2 supports scoped G3 and G4 only');
    const current=await this.current(id),paths=[candidatePath,rulesPath,delegationPath];const before=await Promise.all(paths.map(p=>readFile(p)));const candidate=JSON.parse(before[0]!.toString('utf8').replace(/^\uFEFF/,''));const binding=Binding.parse(candidate.production);
    if(binding.projectId!==id||binding.planRevision!==current.record.planRevision||binding.packageHash!==current.record.hash||binding.gate!==gate)throw new EngineError('APPROVAL_BINDING','Review does not bind current exact production package and gate');
    const policy=JSON.parse(before[1]!.toString('utf8').replace(/^\uFEFF/,'')),required=JSON.parse(await readFile(join(projectRoot,gate==='G3'?'reviews/M2/preflight-gate.json':'reviews/M2/gate.json'),'utf8'));
    if(canonical(policy)!==canonical(required))throw new EngineError('APPROVAL_POLICY','Required specialist policy may not be weakened');
    const delegation=DelegationSchema.parse(JSON.parse(before[2]!.toString('utf8').replace(/^\uFEFF/,'')));if(!delegation.allowedGates.includes(gate as 'G3'))throw new EngineError('APPROVAL_AUTHORITY','Delegation does not include this gate');
    if(gate==='G4'&&!await this.approval(id,current.record.hash,'G3'))throw new EngineError('GATE_ORDER','G4 requires exact current package G3');
    const neededKinds=gate==='G3'?['style']:['style','animatic','motion'];const requiredHashes=[current.record.hash];
    for(const kind of neededKinds){const t=this.matchingTasks(kind,current.record.hash).find(t=>t.state==='succeeded');if(!t)throw new EngineError('PREVIEW_REQUIRED',`Missing actual successful ${kind} task`);for(const a of [t.result!,...t.outputs]){await this.tasks.artifacts.verify(a);requiredHashes.push(a.sha256);}}
    if(requiredHashes.some(h=>!candidate.files?.some((f:any)=>f.sha256===h))||requiredHashes.slice(1).some(h=>!binding.evidenceHashes.includes(h)))throw new EngineError('APPROVAL_INPUT','Candidate must freeze every actual required stage manifest and output');
    const reportPaths=(policy.activeRoles as string[]).map(r=>join(resolve(candidatePath,'..'),`${r}.json`)),reports=await Promise.all(reportPaths.map(p=>readFile(p)));
    const result=checkGateV2(resolve(candidatePath),resolve(rulesPath),this.reviewRoot);if(result.verdict!=='PASS')throw new EngineError('REVIEW_NOT_PASSED',JSON.stringify(result));
    for(const[p,i]of paths.map((p,i)=>[p,i] as const))if(sha256(await readFile(p))!==sha256(before[i]!))throw new EngineError('REVIEW_CHANGED','Review inputs changed during decision');
    for(let i=0;i<reportPaths.length;i++)if(sha256(await readFile(reportPaths[i]!))!==sha256(reports[i]!))throw new EngineError('REVIEW_CHANGED','Judge report changed during decision');
    const receipt={schemaVersion:'1.0',projectId:id,packageHash:current.record.hash,planRevision:current.record.planRevision,gate,actor:'delegated-judge',humanIdentityAuthenticated:false,delegation,candidateHash:sha256(before[0]!),rules:policy,candidate,reports:reports.map(b=>JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''))),recordedAt:new Date().toISOString()};
    const hash=sha256(canonical(receipt)),artifact=await this.tasks.artifacts.commit(canonical(receipt),'application/json','VALIDATE',hash);
    return this.tx(()=>{const selected=this.db.prepare('SELECT hash FROM selected WHERE project_id=?').get(id);if(selected?.hash!==current.record.hash||this.workflow.project(id).currentRevision!==current.record.planRevision)throw new EngineError('WORKFLOW_CHANGED','Workflow changed during approval');
      const existing=this.db.prepare('SELECT data FROM production_approvals WHERE project_id=? AND package_hash=? AND gate=?').get(id,current.record.hash,gate);if(existing)return JSON.parse(existing.data as string);
      const record={projectId:id,packageHash:current.record.hash,gate,artifact,actor:'delegated-judge',recordedAt:receipt.recordedAt,candidateHash:receipt.candidateHash};this.db.prepare('INSERT INTO production_approvals(project_id,package_hash,gate,data) VALUES(?,?,?,?)').run(id,current.record.hash,gate,canonical(record));return record;});
  }
}
