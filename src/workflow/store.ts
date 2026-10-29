import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {z} from 'zod';
import {RepositorySnapshotSchema,PlanningPackageSchema,DelegationSchema,GATES,type RepositorySnapshot,type PlanningPackage} from '../contracts/planning.js';
import {Hash,Id} from '../contracts/video.js';
import {ArtifactStore} from '../assets/store.js';
import {ArtifactSchema,type Artifact} from '../contracts/runtime.js';
import {canonical,sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';
import {projectRoot} from '../providers/local.js';
import {checkGateV2} from '../evaluation/judge-gate.mjs';

const ProjectRow=z.object({id:Id,repository:z.string(),snapshotHash:Hash,currentRevision:Hash.nullable(),createdAt:z.string(),updatedAt:z.string()}).strict();
const SnapshotRow=z.object({hash:Hash,artifact:ArtifactSchema,createdAt:z.string()}).strict();
const RevisionRow=z.object({hash:Hash,projectId:Id,snapshotHash:Hash,artifact:ArtifactSchema,createdAt:z.string()}).strict();
const ApprovalRow=z.object({projectId:Id,revisionHash:Hash,gate:z.enum(GATES),artifact:ArtifactSchema,recordedAt:z.string(),actor:z.literal('delegated-judge'),candidateHash:Hash,activeRoles:z.array(z.string()).min(3)}).strict();
type Revision=z.infer<typeof RevisionRow>;
const ReviewBinding=z.object({projectId:Id,revisionHash:Hash,gates:z.array(z.enum(GATES)).min(1)}).strict();
const parse=<T>(schema:z.ZodType<T>,value:unknown,label:string):T=>{
  const result=schema.safeParse(value);if(!result.success)throw new EngineError('INVALID_WORKFLOW',`${label}: ${result.error.issues.map((i)=>`${i.path.join('.')}: ${i.message}`).join('; ')}`);return result.data;
};
const jsonFile=(path:string)=>{try{return JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')) as unknown;}catch(error){throw new EngineError('WORKFLOW_FILE',`Cannot read JSON ${path}: ${String(error)}`);}};
const escapeMd=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/[\\`*_[\]|]/g,'\\$&').replace(/\r?\n/g,' ');
export function sourceFingerprint(snapshot:RepositorySnapshot){const{fetchedAt,...content}=snapshot;void fetchedAt;return sha256(canonical(content));}

export function validateSnapshot(value:unknown):RepositorySnapshot{
  const snapshot=parse(RepositorySnapshotSchema,value,'source snapshot');
  if(new Set(snapshot.documents.map((d)=>d.path)).size!==snapshot.documents.length)throw new EngineError('SOURCE_DUPLICATE','Document paths must be unique');
  for(const doc of snapshot.documents){
    if(!/^[A-Za-z0-9_.\/-]{1,200}$/.test(doc.path)||doc.path.split('/').some((p)=>!p||p==='.'||p==='..'))throw new EngineError('SOURCE_PATH','Snapshot document path is unsafe');
    const expected=`${snapshot.repository}/blob/${snapshot.commit}/${doc.path.split('/').map(encodeURIComponent).join('/')}`;
    if(doc.url!==expected||doc.sha256!==sha256(doc.content)||Buffer.byteLength(doc.content)>200_000)throw new EngineError('SOURCE_INTEGRITY',`Invalid pinned URL, hash or byte size for ${doc.path}`);
  }
  return snapshot;
}
export function validatePlan(value:unknown,snapshot:RepositorySnapshot,snapshotHash:string):PlanningPackage{
  const plan=parse(PlanningPackageSchema,value,'planning package');
  if(plan.snapshotHash!==snapshotHash)throw new EngineError('SOURCE_MISMATCH','Planning package does not match the project source snapshot');
  for(const fact of plan.facts)for(const ref of fact.evidence){
    const doc=snapshot.documents.find((d)=>d.path===ref.document);if(!doc)throw new EngineError('EVIDENCE_DOCUMENT',`Unknown evidence document ${ref.document}`);
    const lines=doc.content.split(/\r?\n/);
    if(ref.endLine>lines.length||!lines.slice(ref.startLine-1,ref.endLine).join('\n').includes(ref.quote))throw new EngineError('EVIDENCE_QUOTE',`Fact ${fact.id} quote does not exist in its declared line range`);
  }
  return plan;
}

export class WorkflowStore{
  readonly db:DatabaseSync;readonly artifacts:ArtifactStore;readonly root:string;readonly reviewRoot:string;
  constructor(root:string,options:{reviewRoot?:string}={}){
    this.root=resolve(root);this.reviewRoot=resolve(options.reviewRoot??projectRoot);mkdirSync(this.root,{recursive:true});
    this.artifacts=new ArtifactStore(this.root);this.db=new DatabaseSync(join(this.root,'workflow.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
    const version=this.db.prepare('PRAGMA user_version').get() as {user_version:number};
    if(version.user_version>1){this.db.close();throw new EngineError('WORKFLOW_DB_VERSION','Workflow database is newer than this engine');}
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sources(hash TEXT PRIMARY KEY,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS revisions(hash TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS approvals(project_id TEXT NOT NULL REFERENCES projects(id),revision_hash TEXT NOT NULL REFERENCES revisions(hash),gate TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(project_id,revision_hash,gate));
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,project_id TEXT NOT NULL,at TEXT NOT NULL,type TEXT NOT NULL,data TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS no_source_update BEFORE UPDATE ON sources BEGIN SELECT RAISE(ABORT,'Source snapshots are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS no_source_delete BEFORE DELETE ON sources BEGIN SELECT RAISE(ABORT,'Source snapshots are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS no_revision_update BEFORE UPDATE ON revisions BEGIN SELECT RAISE(ABORT,'Plan revisions are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS no_revision_delete BEFORE DELETE ON revisions BEGIN SELECT RAISE(ABORT,'Plan revisions are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS no_approval_update BEFORE UPDATE ON approvals BEGIN SELECT RAISE(ABORT,'Approval history is immutable'); END;
      CREATE TRIGGER IF NOT EXISTS no_approval_delete BEFORE DELETE ON approvals BEGIN SELECT RAISE(ABORT,'Approval history is immutable'); END;
      PRAGMA user_version=1;
    `);
  }
  close(){this.db.close();}
  private tx<T>(fn:()=>T):T{this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  private event(projectId:string,type:string,data:unknown){this.db.prepare('INSERT INTO events(project_id,at,type,data) VALUES(?,?,?,?)').run(projectId,new Date().toISOString(),type,canonical(data));}
  project(id:string){parse(Id,id,'project ID');const row=this.db.prepare('SELECT data FROM projects WHERE id=?').get(id);if(!row)throw new EngineError('PROJECT_NOT_FOUND',`No workflow project ${id}`);const value=parse(ProjectRow,JSON.parse(row.data as string),'stored project');if(value.id!==id)throw new EngineError('PROJECT_INTEGRITY','Stored project identity mismatch');return value;}
  list(){return this.db.prepare('SELECT data FROM projects ORDER BY rowid DESC').all().map((r)=>parse(ProjectRow,JSON.parse(r.data as string),'stored project'));}
  async source(hash:string){parse(Hash,hash,'source hash');const row=this.db.prepare('SELECT data FROM sources WHERE hash=?').get(hash);if(!row)throw new EngineError('SOURCE_NOT_FOUND','Source snapshot not found');const stored=parse(SnapshotRow,JSON.parse(row.data as string),'stored snapshot');
    const value=validateSnapshot(await this.artifacts.readJson(stored.artifact));if(stored.hash!==hash||sourceFingerprint(value)!==hash)throw new EngineError('SOURCE_INTEGRITY','Stored source fingerprint mismatch');return value;}
  async create(id:string,value:unknown){
    parse(Id,id,'project ID');const snapshot=validateSnapshot(value),hash=sourceFingerprint(snapshot);
    const artifact=await this.artifacts.commit(canonical(snapshot),'application/json','VALIDATE',hash);
    return this.tx(()=>{
      const now=new Date().toISOString();this.db.prepare('INSERT OR IGNORE INTO sources(hash,data) VALUES(?,?)').run(hash,canonical({hash,artifact,createdAt:now}));
      const existing=this.db.prepare('SELECT data FROM projects WHERE id=?').get(id);
      if(existing){const prior=parse(ProjectRow,JSON.parse(existing.data as string),'stored project');if(prior.repository!==snapshot.repository)throw new EngineError('PROJECT_REPOSITORY','Existing project ID belongs to another repository');
        if(prior.snapshotHash===hash)return prior;prior.snapshotHash=hash;prior.currentRevision=null;prior.updatedAt=now;
        this.db.prepare('UPDATE projects SET data=? WHERE id=?').run(canonical(prior),id);this.event(id,'source_changed_approvals_inactive',{snapshotHash:hash});return prior;}
      const project={id,repository:snapshot.repository,snapshotHash:hash,currentRevision:null,createdAt:now,updatedAt:now};
      this.db.prepare('INSERT INTO projects(id,data) VALUES(?,?)').run(id,canonical(project));this.event(id,'project_created',{snapshotHash:hash});return project;
    });
  }
  private revisionRecord(id:string,hash:string):Revision{parse(Hash,hash,'revision hash');const row=this.db.prepare('SELECT data FROM revisions WHERE hash=? AND project_id=?').get(hash,id);if(!row)throw new EngineError('REVISION_NOT_FOUND','Plan revision not found');const value=parse(RevisionRow,JSON.parse(row.data as string),'stored revision');if(value.hash!==hash||value.projectId!==id)throw new EngineError('PLAN_INTEGRITY','Stored revision identity mismatch');return value;}
  async revision(id:string,hash?:string){const project=this.project(id);const target=hash??project.currentRevision;if(!target)throw new EngineError('PLAN_REQUIRED','Import a planning package first');const record=this.revisionRecord(id,target);
    const payload=await this.artifacts.readJson<{snapshotHash:string;plan:unknown}>(record.artifact);if(sha256(canonical(payload))!==target||payload.snapshotHash!==record.snapshotHash)throw new EngineError('PLAN_INTEGRITY','Plan revision fingerprint mismatch');
    const snapshot=await this.source(record.snapshotHash);const plan=validatePlan(payload.plan,snapshot,record.snapshotHash);if(plan.projectId!==id)throw new EngineError('PLAN_PROJECT','Stored plan belongs to another project');return{record,plan,snapshot,payload};}
  async importPlan(id:string,value:unknown){const project=this.project(id),snapshot=await this.source(project.snapshotHash);const plan=validatePlan(value,snapshot,project.snapshotHash);
    if(plan.projectId!==id)throw new EngineError('PLAN_PROJECT','Plan projectId differs from requested project');const payload={snapshotHash:project.snapshotHash,plan},hash=sha256(canonical(payload));
    const artifact=await this.artifacts.commit(canonical(payload),'application/json','VALIDATE',hash);
    return this.tx(()=>{const current=this.project(id);if(current.snapshotHash!==project.snapshotHash)throw new EngineError('WORKFLOW_CHANGED','Source changed during import; retry against current source');
      const now=new Date().toISOString();this.db.prepare('INSERT OR IGNORE INTO revisions(hash,project_id,data) VALUES(?,?,?)').run(hash,id,canonical({hash,projectId:id,snapshotHash:project.snapshotHash,artifact,createdAt:now}));
      if(current.currentRevision!==hash){current.currentRevision=hash;current.updatedAt=now;this.db.prepare('UPDATE projects SET data=? WHERE id=?').run(canonical(current),id);this.event(id,'plan_revision_selected',{revisionHash:hash});}
      return this.revisionRecord(id,hash);
    });
  }
  async status(id:string){const project=this.project(id);await this.source(project.snapshotHash);
    const revisions=this.db.prepare('SELECT data FROM revisions WHERE project_id=? ORDER BY rowid').all(id).map((r)=>parse(RevisionRow,JSON.parse(r.data as string),'stored revision'));
    const allApprovals=this.db.prepare('SELECT data FROM approvals WHERE project_id=? ORDER BY rowid').all(id).map((r)=>parse(ApprovalRow,JSON.parse(r.data as string),'stored approval'));
    const approvals=allApprovals.filter((r)=>r.revisionHash===project.currentRevision);const gates=new Set(approvals.map((a)=>a.gate));
    for(const approval of approvals){const receipt=await this.artifacts.readJson<{projectId:string;revisionHash:string;gate:string;candidateHash:string}>(approval.artifact);if(receipt.projectId!==id||receipt.revisionHash!==project.currentRevision||receipt.gate!==approval.gate||receipt.candidateHash!==approval.candidateHash)throw new EngineError('APPROVAL_INTEGRITY','Approval receipt does not match its stored binding');}
    if(project.currentRevision)await this.revision(id);
    return{project,revisions,approvals,approvalHistory:allApprovals,state:!project.currentRevision?'NEEDS_PLAN':gates.has('G2')?'SCRIPT_APPROVED':gates.has('G1')?'BRIEF_APPROVED':'BRIEF_REVIEW',nextGate:gates.has('G2')?'G3':gates.has('G1')?'G2':'G1',finalHumanAcceptance:'pending',events:this.db.prepare('SELECT * FROM events WHERE project_id=? ORDER BY seq').all(id)};
  }
  async export(id:string,directory:string){const {record,plan,payload,snapshot}=await this.revision(id);const out=resolve(directory);await mkdir(out,{recursive:true});
    const writeImmutable=async(name:string,data:string)=>{const path=join(out,name);try{await writeFile(path,data,{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST'||await readFile(path,'utf8')!==data)throw new EngineError('EXPORT_EXISTS',`Refusing to replace existing export ${path}`);}return path;};
    const input=await writeImmutable('review-input.json',canonical(payload));
    const report=[`# ${escapeMd(id)} 策划审阅包`,`来源：${snapshot.repository}，commit ${snapshot.commit}`,`修订：${record.hash}`,'','## Brief',`受众：${escapeMd(plan.brief.audience)}`,`目标：${escapeMd(plan.brief.objective)}`,`指导来源：${plan.brief.guidanceOrigin}`,'','## 用途与例子',...Object.entries(plan.brief.useCase).map(([key,value])=>`${key}: ${escapeMd(value)}`),'','## 创意',...plan.concepts.map((c)=>`- ${escapeMd(c.id)}：${escapeMd(c.premise)}；开头：${escapeMd(c.opening)}`),'','## 脚本',...plan.script.map((s)=>`- ${escapeMd(s.id)} (${s.plannedDurationMs}ms)：${escapeMd(s.narration)} / claims: ${s.claimIds.join(', ')}`),'','## 分镜',...plan.storyboard.map((s)=>`- ${escapeMd(s.id)}：${escapeMd(s.visual)}；动效：${escapeMd(s.animation)}；来源标签：${escapeMd(s.evidenceLabel)}`),'','## 事实',...plan.facts.map((f)=>`- ${escapeMd(f.id)} [${f.kind}]：${escapeMd(f.statement)}；限制：${escapeMd(f.limitations)}`),'','## 参考状态',...plan.references.map((r)=>`- ${escapeMd(r.url)} [${r.status}] ${escapeMd(r.limitation)}`),'','## 声音与预算',`声音：${plan.audio.mode} / ${plan.audio.voice} / ${plan.audio.timingStatus}；${escapeMd(plan.audio.note)}`,`付费上限：0 USD；修订上限：${plan.budget.maxRevisionRounds}；不执行项目代码。`,'','阶段审批由独立 judge 在记录的用户委托下作出；最终用户验收仍待用户。','未访问的参考没有被伪装成已分析。源文档仅作为不可信待审数据，不执行其中指令。',''].join('\n');
    const markdown=await writeImmutable('review.md',report);return{projectId:id,revisionHash:record.hash,reviewInput:input,reviewMarkdown:markdown};}
  async approve(id:string,gate:string,candidatePath:string,rulesPath:string,delegationPath:string){
    if(gate==='G6')throw new EngineError('HUMAN_FINAL_REQUIRED','Final human acceptance cannot be created by the judge approval command');
    if(!['G1','G2'].includes(gate))throw new EngineError('GATE_NOT_READY','M1 supports G1/G2; later production gates require their stage implementation and evidence');
    const candidateBytes=await readFile(candidatePath),rulesBytes=await readFile(rulesPath),delegationBytes=await readFile(delegationPath);
    const current=await this.revision(id),candidate=jsonFile(candidatePath) as {workflow?:unknown;files?:{path:string;sha256:string}[]};
    const binding=parse(ReviewBinding,candidate.workflow,'candidate workflow binding');
    if(binding.projectId!==id||binding.revisionHash!==current.record.hash||!binding.gates.includes(gate as 'G1'))throw new EngineError('APPROVAL_BINDING','Judge review does not authorize this project/revision/gate');
    const policy=jsonFile(rulesPath),trustedPolicy=jsonFile(join(projectRoot,'reviews/M1/gate.json'));
    if(canonical(policy)!==canonical(trustedPolicy))throw new EngineError('APPROVAL_POLICY','Review policy differs from the required M1 active-role policy');
    const delegation=parse(DelegationSchema,jsonFile(delegationPath),'delegation record');
    if(!delegation.allowedGates.includes(gate as 'G1'))throw new EngineError('APPROVAL_AUTHORITY','Delegation does not include this gate');
    const hasInput=candidate.files?.some((f)=>{const path=resolve(this.reviewRoot,f.path),rel=relative(this.reviewRoot,path);return!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep)&&f.sha256===current.record.hash;});
    if(!hasInput)throw new EngineError('APPROVAL_INPUT','Candidate does not freeze the canonical current planning input');
    const policyRoles=(policy as {activeRoles?:unknown}).activeRoles;
    if(!Array.isArray(policyRoles)||['product','reliability','evidence','content_facts','security'].some((r)=>!policyRoles.includes(r)))throw new EngineError('APPROVAL_POLICY','M1 requires all three core judges plus content facts and security');
    const reports=Object.fromEntries<string>(await Promise.all((policyRoles as string[]).map(async(role)=>{
      try{return[role,await readFile(join(resolve(candidatePath,'..'),role+'.json'),'utf8')] as const;}
      catch{throw new EngineError('REVIEW_MISSING',`Missing or unreadable ${role} judge report`);}
    })));
    const result=checkGateV2(resolve(candidatePath),resolve(rulesPath),this.reviewRoot);
    if(result.verdict!=='PASS')throw new EngineError('REVIEW_NOT_PASSED',JSON.stringify(result));
    if(sha256(await readFile(candidatePath))!==sha256(candidateBytes)||sha256(await readFile(rulesPath))!==sha256(rulesBytes)||sha256(await readFile(delegationPath))!==sha256(delegationBytes))throw new EngineError('REVIEW_CHANGED','Review or authority changed during approval');
    for(const[role,content]of Object.entries(reports))if(await readFile(join(resolve(candidatePath,'..'),role+'.json'),'utf8')!==content)throw new EngineError('REVIEW_CHANGED','Judge report changed during approval');
    const receipt={schemaVersion:'1.0',projectId:id,revisionHash:current.record.hash,snapshotHash:current.record.snapshotHash,gate,actor:'delegated-judge',humanIdentityAuthenticated:false,
      delegation,delegationHash:sha256(delegationBytes),candidateHash:sha256(candidateBytes),rulesHash:sha256(rulesBytes),activeRoles:result.activeRoles,
      reviewBundle:{candidate:JSON.parse(candidateBytes.toString('utf8').replace(/^\uFEFF/,'')),rules:policy,reports:Object.fromEntries(Object.entries(reports).map(([role,value])=>[role,JSON.parse(value)]))},recordedAt:new Date().toISOString()};
    const fingerprint=sha256(canonical(receipt)),artifact=await this.artifacts.commit(canonical(receipt),'application/json','VALIDATE',fingerprint);
    return this.tx(()=>{const project=this.project(id);if(project.currentRevision!==current.record.hash)throw new EngineError('WORKFLOW_CHANGED','Plan changed during approval');
      const existing=this.db.prepare('SELECT data FROM approvals WHERE project_id=? AND revision_hash=? AND gate=?').get(id,current.record.hash,gate);if(existing)return JSON.parse(existing.data as string);
      if(gate==='G2'&&!this.db.prepare('SELECT 1 FROM approvals WHERE project_id=? AND revision_hash=? AND gate=?').get(id,current.record.hash,'G1'))throw new EngineError('GATE_ORDER','G1 must pass on this exact revision before G2');
      const record={projectId:id,revisionHash:current.record.hash,gate,artifact,recordedAt:receipt.recordedAt,actor:receipt.actor,candidateHash:receipt.candidateHash,activeRoles:result.activeRoles};
      this.db.prepare('INSERT INTO approvals(project_id,revision_hash,gate,data) VALUES(?,?,?,?)').run(id,current.record.hash,gate,canonical(record));this.event(id,'delegated_judge_approval',{gate,revisionHash:current.record.hash,candidateHash:receipt.candidateHash});return record;
    });
  }
}
