import {z} from 'zod';
import {Hash, Id} from './video.js';
const text = (max = 500) => z.string().trim().min(1).max(max);
export const RepositoryUrl = z.string().regex(/^https:\/\/github\.com\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/);
export const SourceDocumentSchema = z.object({path: text(200), url: z.string().url(), sha256: Hash, content: z.string().max(200_000)}).strict();
export const RepositorySnapshotSchema = z.object({
  schemaVersion: z.literal('1.0'), repository: RepositoryUrl, commit: z.string().regex(/^[a-f0-9]{40}$/),
  name: text(160), description: z.string().max(1000), defaultBranch: text(160),
  license: z.string().max(120).nullable(), fetchedAt: z.string().datetime(),
  documents: z.array(SourceDocumentSchema).min(1).max(8),
  trust: z.literal('untrusted-data-never-executed'),
}).strict();
export type RepositorySnapshot = z.infer<typeof RepositorySnapshotSchema>;
const EvidenceRef = z.object({document: text(200), startLine: z.number().int().positive(), endLine: z.number().int().positive(), quote: text(1200)}).strict();
export const PlanningPackageSchema = z.object({
  schemaVersion: z.literal('1.0'), projectId: Id, snapshotHash: Hash,
  facts: z.array(z.object({id: Id, statement: text(600), kind: z.enum(['documented','inference','synthetic']), evidence: z.array(EvidenceRef).max(8), limitations: z.string().max(600)}).strict()).min(1).max(60),
  brief: z.object({audience: text(), objective: text(), language: z.enum(['zh-CN','en-US']), width: z.union([z.literal(720),z.literal(1080)]), height: z.union([z.literal(1280),z.literal(1920)]), fps: z.union([z.literal(24),z.literal(30)]), durationSeconds: z.number().int().min(30).max(60),
    useCase: z.object({who: text(), situation: text(), input: text(), output: text(), value: text(), evidenceKind: z.enum(['documented-example','synthetic-example'])}).strict(),
    guidanceOrigin: z.enum(['user-provided','agent-proposed-defaults']), styleDirection: text(1000),
  }).strict(),
  concepts: z.array(z.object({id: Id, premise: text(), opening: text(), rationale: text()}).strict()).length(2), selectedConcept: Id,
  script: z.array(z.object({id: Id, narration: text(500), caption: text(200), claimIds: z.array(Id).max(12), plannedDurationMs: z.number().int().min(500).max(20_000)}).strict()).min(3).max(16),
  storyboard: z.array(z.object({id: Id, scriptIds: z.array(Id).min(1).max(8), visual: text(1200), animation: text(600), evidenceLabel: text(160)}).strict()).min(3).max(16),
  references: z.array(z.object({url: z.string().url(), status: z.enum(['observed','unavailable','not-requested']), observations: z.array(text()).max(30), limitation: z.string().max(1000)}).strict()).max(8),
  audio: z.object({mode: z.enum(['local-tts','provided-recording','preview-silent']), voice: text(120), timingStatus: z.enum(['estimated','measured']), note: text(1000)}).strict(),
  budget: z.object({maxPaidUsd: z.literal(0), maxRevisionRounds: z.number().int().min(1).max(5), execution: z.literal('no-untrusted-repository-execution')}).strict(),
  origin: z.literal('agent-authored-not-an-automatic-model-api-call'),
}).strict().superRefine((plan, ctx) => {
  const issue = (message: string) => ctx.addIssue({code:'custom',message});
  for (const [name, rows] of [['facts',plan.facts],['concepts',plan.concepts],['script',plan.script],['storyboard',plan.storyboard]] as const) if (new Set(rows.map((r)=>r.id)).size !== rows.length) issue(`Duplicate ${name} IDs`);
  if (!plan.concepts.some((c)=>c.id===plan.selectedConcept)) issue('Selected concept is missing');
  if (plan.brief.width*16!==plan.brief.height*9) issue('M1 requires a consistent 9:16 video format');
  const total = plan.script.reduce((n,line)=>n+line.plannedDurationMs,0);
  if (total !== plan.brief.durationSeconds*1000) issue('Script planned durations must sum to the brief duration');
  for (const line of plan.script) for (const id of line.claimIds) if (!plan.facts.some((f)=>f.id===id)) issue(`Unknown fact ${id}`);
  for (const scene of plan.storyboard) for (const id of scene.scriptIds) if (!plan.script.some((line)=>line.id===id)) issue(`Unknown script line ${id}`);
  for (const line of plan.script) if (!plan.storyboard.some((s)=>s.scriptIds.includes(line.id))) issue(`Script line ${line.id} is not storyboarded`);
  for (const fact of plan.facts) {
    if (fact.kind==='documented' && !fact.evidence.length) issue(`Documented fact ${fact.id} requires source evidence`);
    for (const ref of fact.evidence) if (ref.endLine<ref.startLine) issue(`Invalid source lines for ${fact.id}`);
  }
  for (const ref of plan.references) if (ref.status!=='observed' && ref.observations.length) issue('Unobserved references cannot contain invented observations');
});
export type PlanningPackage = z.infer<typeof PlanningPackageSchema>;
export const GATES = ['G1','G2','G3','G4','G5','G6'] as const;
export const DelegationSchema=z.object({
  schemaVersion:z.literal('1.0'),id:Id,authorityText:z.string().min(20).max(4000),
  authoritySource:z.literal('current-chat-user-instruction'),recordedBy:z.literal('trusted-local-operator'),
  humanIdentityAuthenticated:z.literal(false),allowedGates:z.array(z.enum(['G1','G2','G3','G4','G5'])).min(1),
  finalHumanRequired:z.literal(true),limits:z.object({maxPaidUsd:z.literal(0),deployment:z.literal(false),untrustedRepositoryExecution:z.literal(false)}).strict(),
}).strict();
