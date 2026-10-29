import {z} from 'zod';
import type {TaskRecord} from '../orchestrator/tasks.js';
import {canonical,sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';
import {ArtifactSchema,ErrorSchema} from '../contracts/runtime.js';

export const TASKS_DB_VERSION=1;
export const USAGE_LIMITS={rows:10_000,bytes:32*1024*1024,attempts:100_000} as const;
export const AccountingPolicySchema=z.object({provider:z.enum(['windows-sapi-offline','remotion-local']),ratePolicy:z.literal('local-zero-v1')}).strict();
export type AccountingPolicy=z.infer<typeof AccountingPolicySchema>;
const Hash=z.string().regex(/^[a-f0-9]{64}$/);
export const UsageTaskSchema=z.object({id:Hash,kind:z.string().min(1).max(100),input:z.unknown(),scopeKey:z.string().nullable().optional(),state:z.enum(['running','succeeded','failed','cancelled']),attempt:z.number().int().positive(),owner:z.string().min(1),leaseUntil:z.number().finite().nonnegative(),result:ArtifactSchema.nullable(),outputs:z.array(ArtifactSchema).max(10_000),error:ErrorSchema.nullable(),startedAt:z.iso.datetime(),finishedAt:z.iso.datetime().nullable()}).strict().superRefine((t,ctx)=>{
  if(t.state==='running'?t.result!==null||t.error!==null||t.finishedAt!==null||t.leaseUntil<=0:t.finishedAt===null||t.leaseUntil!==0)ctx.addIssue({code:'custom',message:'Task terminal/ownership state mismatch'});
  if(t.state==='succeeded'?t.result===null||t.error!==null:t.state!=='running'&&t.error===null)ctx.addIssue({code:'custom',message:'Task result/error state mismatch'});
  if(t.finishedAt!==null&&Date.parse(t.finishedAt)<Date.parse(t.startedAt))ctx.addIssue({code:'custom',message:'Task finishes before its start'});
});
export const UsageEventSchema=z.object({
  schemaVersion:z.literal('1.0'),id:z.string().uuid(),taskId:Hash,attempt:z.number().int().positive(),kind:z.string().min(1),
  inputFingerprint:Hash,inputVersion:z.literal('production-task-v1'),owner:z.string().min(1),at:z.iso.datetime(),
  phase:z.enum(['started','terminal','cache_hit','cache_failure']),policy:AccountingPolicySchema.nullable(),
  outcome:z.enum(['succeeded','failed','cancelled','interrupted']).nullable(),wallDurationMs:z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  providerChargeMicros:z.literal(0).nullable(),chargeBasis:z.enum(['unknown','calculated-local-provider-fee','cache-no-provider-work']),
}).strict().superRefine((e,ctx)=>{
  const bad=(message:string)=>ctx.addIssue({code:'custom',message});
  if(e.taskId!==e.inputFingerprint)bad('Input fingerprint must equal task identity');
  if(e.phase==='started'){
    if(e.outcome!==null||e.wallDurationMs!==null||e.providerChargeMicros!==null||e.chargeBasis!=='unknown')bad('Started receipts cannot claim completed work or fees');
  }else if(e.phase==='terminal'){
    if(e.outcome===null)bad('Terminal outcome is required');
    if((e.outcome==='interrupted')!==(e.wallDurationMs===null))bad('Only interrupted attempts have unknown wall duration');
    if(e.policy===null?(e.providerChargeMicros!==null||e.chargeBasis!=='unknown'):(e.providerChargeMicros!==0||e.chargeBasis!=='calculated-local-provider-fee'))bad('Terminal charge must follow the explicit offline policy');
  }else if(e.outcome!==null||e.wallDurationMs!==0||e.providerChargeMicros!==0||e.chargeBasis!=='cache-no-provider-work')bad('Cache receipts cannot claim provider work');
});
export type UsageEvent=z.infer<typeof UsageEventSchema>;
export const TASK_SCHEMA_SQL=`
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS task_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT,at TEXT,type TEXT,data TEXT);
CREATE TRIGGER IF NOT EXISTS completed_task_immutable BEFORE UPDATE ON tasks WHEN json_extract(OLD.data,'$.state')='succeeded' BEGIN SELECT RAISE(ABORT,'Successful tasks are immutable');END;
CREATE TRIGGER IF NOT EXISTS task_delete_forbidden BEFORE DELETE ON tasks BEGIN SELECT RAISE(ABORT,'Task history is immutable');END;`;
export const USAGE_SCHEMA_SQL=`
CREATE TABLE usage_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,task_id TEXT NOT NULL REFERENCES tasks(id),attempt INTEGER NOT NULL CHECK(attempt>0),phase TEXT NOT NULL CHECK(phase IN ('started','terminal','cache_hit','cache_failure')),data TEXT NOT NULL);
CREATE UNIQUE INDEX usage_one_start ON usage_events(task_id,attempt) WHERE phase='started';
CREATE UNIQUE INDEX usage_one_terminal ON usage_events(task_id,attempt) WHERE phase='terminal';
CREATE TRIGGER usage_update_forbidden BEFORE UPDATE ON usage_events BEGIN SELECT RAISE(ABORT,'Usage history is immutable');END;
CREATE TRIGGER usage_delete_forbidden BEFORE DELETE ON usage_events BEGIN SELECT RAISE(ABORT,'Usage history is immutable');END;`;

function invalid(message:string):never{throw new EngineError('USAGE_INVALID',`Usage accounting: ${message}`);}
function limit(message:string):never{throw new EngineError('USAGE_LIMIT',`Usage accounting: ${message}`);}
/** Pure, read-only validation and aggregation. Missing historical receipts stay missing. */
export function summarizeUsage(tasks:readonly TaskRecord[],inputEvents:readonly unknown[]){
  if(tasks.length>USAGE_LIMITS.rows||inputEvents.length>USAGE_LIMITS.rows)limit('row limit exceeded');
  let bytes=0,totalDeclaredAttempts=0;
  for(const row of [...tasks,...inputEvents]){bytes+=Buffer.byteLength(JSON.stringify(row)??'null');if(bytes>USAGE_LIMITS.bytes)limit('data byte limit exceeded');}
  for(const t of tasks){if(t===null||typeof t!=='object'||!Number.isSafeInteger(t.attempt)||t.attempt<1)invalid('invalid task attempt');totalDeclaredAttempts+=t.attempt;if(totalDeclaredAttempts>USAGE_LIMITS.attempts)limit('attempt coverage limit exceeded');}
  const records=new Map<string,TaskRecord>();
  for(const t of tasks){
    const parsed=UsageTaskSchema.safeParse(t);if(!parsed.success)invalid(parsed.error.message);
    if(records.has(t.id)||!Number.isSafeInteger(t.attempt)||t.attempt<1||t.id!==sha256(canonical({version:'production-task-v1',kind:t.kind,input:t.input})))invalid('invalid or duplicate task identity/attempt');
    records.set(t.id,t);
  }
  const events:UsageEvent[]=inputEvents.map(e=>{const parsed=UsageEventSchema.safeParse(e);if(!parsed.success)invalid(parsed.error.message);return parsed.data;});
  const seen=new Set<string>(),groups=new Map<string,UsageEvent[]>();
  for(const e of events){
    if(seen.has(e.id))invalid('duplicate receipt id');seen.add(e.id);
    const t=records.get(e.taskId);if(!t||e.attempt>t.attempt||e.kind!==t.kind)invalid('receipt references an absent or conflicting task/attempt');
    const key=`${e.taskId}:${e.attempt}`;const g=groups.get(key)??[];g.push(e);groups.set(key,g);
  }
  const missingAttempts:{taskId:string;attempt:number}[]=[],pendingAttempts:{taskId:string;attempt:number}[]=[],unknownChargeAttempts:{taskId:string;attempt:number}[]=[];
  let totalAttempts=0,recordedAttempts=0,terminalAttempts=0,knownChargeAttempts=0,unknownDurationAttempts=0,observedWallDurationMs=0,cacheHits=0,cacheFailures=0;
  for(const t of tasks)for(let attempt=1;attempt<=t.attempt;attempt++){
    totalAttempts++;const reference={taskId:t.id,attempt},g=groups.get(`${t.id}:${attempt}`)??[];
    const starts=g.filter(e=>e.phase==='started'),terminals=g.filter(e=>e.phase==='terminal');
    if(starts.length>1||terminals.length>1||(!starts.length&&terminals.length))invalid('duplicate or orphan attempt boundary');
    const start=starts[0],terminal=terminals[0];
    if(start){
      recordedAttempts++;
      for(const e of g)if(e.owner!==start.owner||canonical(e.policy)!==canonical(start.policy)||Date.parse(e.at)<Date.parse(start.at))invalid('receipt conflicts with its attempt owner, policy or start time');
      if(attempt===t.attempt&&(start.owner!==t.owner||start.at!==t.startedAt))invalid('latest receipt conflicts with task owner/start');
    }else missingAttempts.push(reference);
    if(terminal){
      terminalAttempts++;
      if(attempt<t.attempt&&terminal.outcome==='succeeded')invalid('successful attempt cannot be retried');
      if(attempt===t.attempt&&(t.state==='running'||terminal.outcome!==t.state||terminal.at!==t.finishedAt))invalid('latest terminal conflicts with task state/time');
      if(terminal.wallDurationMs===null)unknownDurationAttempts++;else observedWallDurationMs+=terminal.wallDurationMs;
      if(observedWallDurationMs>Number.MAX_SAFE_INTEGER)limit('observed duration aggregate exceeds numeric precision');
      if(terminal.providerChargeMicros===0)knownChargeAttempts++;else unknownChargeAttempts.push(reference);
    }else{
      unknownDurationAttempts++;unknownChargeAttempts.push(reference);if(start)pendingAttempts.push(reference);
      if(start&&(attempt!==t.attempt||t.state!=='running'))invalid('non-active attempt is missing its terminal receipt');
    }
    for(const e of g){if(e.phase==='cache_hit')cacheHits++;if(e.phase==='cache_failure')cacheFailures++;if(e.phase.startsWith('cache_')){
      if(t.state!=='succeeded'||attempt!==t.attempt||e.owner!==t.owner||(terminal&&e.at<terminal.at)||(!start&&e.policy!==null))invalid('cache receipt conflicts with original success');
    }}
  }
  return{schemaVersion:'1.0' as const,accountingMeaning:'calculated local provider fees; not invoices or a complete project total',
    totalAttempts,recordedAttempts,terminalAttempts,missingAttempts,pendingAttempts,knownChargeAttempts,unknownChargeAttempts,
    knownProviderChargeMicros:0,totalProviderChargeMicros:unknownChargeAttempts.length?null:0,observedWallDurationMs,unknownDurationAttempts,cacheHits,cacheFailures,
    excludedCosts:['hardware','model/app usage','human time','software licenses','paid invoices'],
  };
}
