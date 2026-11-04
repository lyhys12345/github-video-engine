import {join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {PRESENTATION_FPS, PresentationPlan} from '../contracts/presentation.js';
import type {Artifact} from '../contracts/runtime.js';
import {Hash} from '../contracts/video.js';
import {checkAbort, EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner, type TaskRecord} from '../orchestrator/tasks.js';
import {compilePresentation} from '../presentation/compile.js';
import {createPresentationFromPlan, preflightPresentationState, readPresentation, renderPresentation, taskCancellation} from '../presentation/runtime.js';
import {researchRepository, type ReadonlyTransport} from '../providers/github-readonly.js';
import {environment} from '../providers/local.js';
import {publishAssetFiles, RECEIPT_PUBLICATION} from '../story-planner/asset-pack.js';
import {ancestors, boundedFile, readTask} from '../story-planner/runtime.js';
import {authoringPacket, loadAuthoringProposal, submitParsedAuthoringProposal, verifyProposal} from './agent-authoring.js';
import {checkDatabaseFiles} from './cli.js';
import {AuthorInput, AuthorReceipt, ExplanationAuthorPacketProfile, RenderInput, RenderReceipt, Request, StartInput, StartReceipt, Submission} from './explanation-contract.js';
import {explanationAuthorPacket} from './explanation-author-packet.js';
import {evidenceWorkspace} from './project-evidence.js';
import {sourceFingerprint, validateSnapshot, WorkflowStore} from './store.js';

const START = 'repository-explanation-start-v1';
const AUTHOR = 'repository-explanation-author-v1';
const RENDER = 'repository-explanation-render-v1';
const PROFILE = 'explanation-session/1.0';
const RETRIES = 3;
const SNAPSHOT_LIMIT = 4_000_000;
type Announce = (id: string) => void;
const fail = (code: string, message: string): never => {throw new EngineError('EXPLANATION_' + code, message);};
const json = (value: unknown) => Buffer.from(canonical(value));
const fingerprint = (kind: string, input: unknown) => sha256(canonical({version: 'production-task-v1', kind, input}));
const projectFor = (id: string) => 'explain-' + id.slice(0, 48);
const digestFiles = (files: Map<string, Buffer>) =>
  sha256(canonical([...files].map(([name, bytes]) => [name, sha256(bytes)]).sort((a, b) => a[0]!.localeCompare(b[0]!, 'en'))));
const review = {semantic: 'pending', editorial: 'pending', audiovisual: 'pending', ownerAcceptance: 'pending'} as const;

function decode(bytes: Buffer): unknown {
  try {return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));}
  catch {return fail('JSON', 'Expected valid UTF-8 explanation JSON.');}
}
function parse<T>(schema: z.ZodType<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return fail('SCHEMA', parsed.error.issues.slice(0, 6).map(issue =>
    issue.path.join('.') + ' ' + issue.message).join(', '));
  return parsed.data;
}
const spec = async <T>(schema: z.ZodType<T>, path: string, limit: number) =>
  parse(schema, decode(await boundedFile(resolve(path), limit)));
function storedInput<T>(schema: z.ZodType<T>, task: TaskRecord) {
  const input = parse(schema, task.input);
  if (canonical(input) !== canonical(task.input)) return fail('INTEGRITY', 'Stored input is not canonical for its stage.');
  return input;
}

async function withWorkflow<T>(data: string, create: boolean, work: (store: WorkflowStore) => Promise<T>) {
  const path = join(resolve(data), 'workflow');
  await ancestors(path);
  if (!await checkDatabaseFiles(join(path, 'workflow.sqlite')) && !create) return fail('PARENT', 'Verified workflow state is required.');
  const store = new WorkflowStore(path, {authoring: create});
  try {return await work(store);} finally {store.close();}
}

async function run<T>(data: string, kind: string, input: unknown, signal: AbortSignal, onTask: Announce | undefined,
  work: (runner: TaskRunner, id: string, signal: AbortSignal) => Promise<{value: T; outputs: Artifact[]}>, timeoutMs: number) {
  data = await preflightPresentationState(data);
  checkAbort(signal);
  const id = fingerprint(kind, input);
  onTask?.(id);
  const runner = new TaskRunner(data);
  const cancellation = taskCancellation(signal);
  try {
    if (runner.get(id)?.state === 'succeeded') await checkedStage(data, await readTask(data, id, kind), signal);
    return await runner.run(kind, input, (_dir, child) => work(runner, id, child), cancellation.signal, {attempts: RETRIES, timeoutMs});
  }
  finally {cancellation.dispose(); runner.close();}
}

async function readArtifact(data: string, task: TaskRecord, artifact: Artifact, limit: number, signal: AbortSignal) {
  checkAbort(signal);
  if (artifact.inputFingerprint !== task.id || artifact.mediaType !== 'application/json' ||
      artifact.producingStage !== 'PUBLISH' || artifact.bytes > limit) return fail('INTEGRITY', 'Invalid stage artifact binding.');
  const store = new ArtifactStore(data);
  await store.verify(artifact);
  const bytes = await boundedFile(store.path(artifact), limit);
  if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) return fail('INTEGRITY', 'Stage artifact changed while reading.');
  return bytes;
}

async function receipt<T>(schema: z.ZodType<T>, data: string, task: TaskRecord, signal: AbortSignal) {
  if (task.state !== 'succeeded' || !task.result) return fail('NOT_READY', 'This explanation stage has no committed result.');
  const bytes = await readArtifact(data, task, task.result, 64_000, signal);
  const value = parse(schema, decode(bytes));
  if (!json(value).equals(bytes)) return fail('INTEGRITY', 'Stage receipt does not match its canonical bytes.');
  return value;
}

function packet(id: string, input: StartInput, snapshot: ReturnType<typeof validateSnapshot>) {
  if (snapshot.repository !== input.request.repository ||
      (/^[a-f0-9]{40}$/i.test(input.request.ref) && snapshot.commit !== input.request.ref.toLowerCase()) ||
      input.request.documents.some(path => !snapshot.documents.some(file => file.path === path))) {
    return fail('INTEGRITY', 'Pinned snapshot differs from the requested repository, commit or documents.');
  }
  const workspace = evidenceWorkspace(projectFor(id), sourceFingerprint(snapshot), snapshot);
  const author = authoringPacket(workspace);
  author.files.set('session-request.json', json({sessionTaskId: id, request: input.request, ...author.request}));
  if (input.packetProfile) explanationAuthorPacket(id, input, author);
  return {workspace, author, packetSha256: digestFiles(author.files)};
}

async function verifiedStart(data: string, task: TaskRecord, signal: AbortSignal) {
  const input = storedInput(StartInput, task);
  const saved = await receipt(StartReceipt, data, task, signal);
  if (canonical(task.outputs) !== canonical([saved.snapshot])) return fail('INTEGRITY', 'Start output closure differs.');
  const bytes = await readArtifact(data, task, saved.snapshot, SNAPSHOT_LIMIT, signal);
  const snapshot = validateSnapshot(decode(bytes));
  const material = packet(task.id, input, snapshot);
  if (!json(snapshot).equals(bytes) || material.packetSha256 !== saved.packetSha256 ||
      canonical(material.author.request) !== canonical({binding: saved.binding, authoringRequestId: saved.authoringRequestId})) {
    return fail('INTEGRITY', 'Pinned source or authoring packet differs.');
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.0', taskId: task.id, stage: 'awaiting-author',
    profile: input.profile, request: input.request, binding: saved.binding, authoringRequestId: saved.authoringRequestId,
    ...(input.packetProfile ? {packetProfile: input.packetProfile} : {}),
    packetSha256: saved.packetSha256, review} as const;
  const files = new Map(material.author.files);
  files.set('session-manifest.json', json(manifest));
  return {manifest, files, snapshot, workspace: material.workspace, input};
}

function validateSubmission(submission: Submission, parent: Awaited<ReturnType<typeof verifiedStart>>) {
  const {manifest, workspace} = parent;
  if (submission.sessionTaskId !== manifest.taskId || submission.snapshotHash !== manifest.binding.snapshotHash ||
      submission.authoringRequestId !== manifest.authoringRequestId || submission.language !== manifest.request.language) {
    return fail('BINDING', 'Submission differs from the pinned authoring request or language.');
  }
  if ('proposal' in submission) {
    if (submission.proposal.authorship.kind !== 'session-agent' ||
        submission.proposal.useCase.audience !== manifest.request.audience) {
      return fail('AUTHORSHIP', 'Proposal must declare session-agent authorship and the exact requested audience.');
    }
    verifyProposal(submission.proposal, workspace);
    if (json(submission.proposal).length > 300_000) return fail('LIMIT', 'Session proposals are limited to 300 kB.');
  }
  if ('reason' in submission) for (const item of submission.reason.citations) {
    const source = workspace.manifest.sources.find(row => row.id === item.sourceId);
    if (!source || source.sha256 !== item.sourceSha256) return fail('CITATION', 'Disposition source identity differs.');
    const lines = workspace.files.get(source.path)!.toString('utf8').split(/\r?\n/);
    if (item.startLine > item.endLine || item.endLine > lines.length ||
        lines.slice(item.startLine - 1, item.endLine).join('\n') !== item.quote) {
      return fail('CITATION', 'Disposition requires the exact pinned source lines.');
    }
  }
  if (submission.disposition === 'unsupported' && submission.reason.code === 'unsupported-mechanism' &&
      submission.proposal.mechanisms.every(mechanism => ['http', 'image-mask', 'concurrency-queue'].includes(mechanism.adapterCandidate))) {
    return fail('DISPOSITION', 'The proposal declares only supported mechanism families. Use a specific unsupported operation or evidence gap.');
  }
}

async function verifiedAuthor(data: string, task: TaskRecord, signal: AbortSignal) {
  const {submission} = storedInput(AuthorInput, task);
  const saved = await receipt(AuthorReceipt, data, task, signal);
  const parent = await verifiedStart(data, await readTask(data, submission.sessionTaskId, START), signal);
  validateSubmission(submission, parent);
  const expectedProposal = 'proposal' in submission ? sha256(json(submission.proposal)) : null;
  if (task.outputs.length || saved.proposalHash !== expectedProposal ||
      saved.startManifestSha256 !== sha256(json(parent.manifest))) {
    return fail('INTEGRITY', 'Author checkpoint differs from its exact submission and start stage.');
  }
  if (saved.proposalHash) {
    const proposal = await withWorkflow(data, false, store => loadAuthoringProposal(store, parent.manifest.binding.projectId,
      saved.proposalHash!, signal));
    if (!proposal.bytes.equals(json('proposal' in submission ? submission.proposal : null))) {
      return fail('INTEGRITY', 'Committed author proposal differs from the session.');
    }
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.0', taskId: task.id, sessionTaskId: parent.manifest.taskId,
    stage: submission.disposition === 'proposal' ? 'awaiting-plan' : submission.disposition,
    binding: parent.manifest.binding, authoringRequestId: parent.manifest.authoringRequestId,
    request: parent.manifest.request, proposalHash: saved.proposalHash, startManifestSha256: saved.startManifestSha256,
    submissionSha256: sha256(json(submission)), ...('reason' in submission ? {reason: submission.reason} : {}), review} as const;
  const files = new Map(parent.files);
  files.set('start-manifest.json', json(parent.manifest));
  files.set('authoring-submission.json', json(submission));
  files.set('session-manifest.json', json(manifest));
  return {manifest, files, parent, submission};
}

function checkPlan(author: Awaited<ReturnType<typeof verifiedAuthor>>, plan: RenderInput['plan']) {
  if (author.submission.disposition !== 'proposal' || plan.proposalHash !== author.manifest.proposalHash ||
      plan.authorship.kind !== 'session-agent') return fail('BINDING', 'Rendering requires the accepted exact proposal and session-agent plan.');
  if (plan.schemaVersion === '1.2') return fail('SCHEMA', 'Use queue plan 1.3 for new sessions.');
  const compiled = compilePresentation(author.submission.proposal, plan);
  if (compiled.timeline.totalFrames > author.manifest.request.maxSeconds * PRESENTATION_FPS) {
    return fail('DURATION', 'Compiled timeline exceeds the requested maximum frame count.');
  }
}

async function verifiedPlan(data: string, author: Awaited<ReturnType<typeof verifiedAuthor>>, input: RenderInput, signal: AbortSignal) {
  checkPlan(author, input.plan);
  const result = await readPresentation(data, input.planTaskId, 'plan', signal);
  if (!result.files || !result.files.get('presentation.json')?.equals(json(input.plan)) ||
      sha256(result.files.get('plan-manifest.json')!) !== input.planManifestSha256) {
    return fail('INTEGRITY', 'Child plan differs from the exact authored plan or its committed manifest.');
  }
}

async function verifiedPreview(data: string, input: RenderInput, id: string, signal: AbortSignal) {
  const result = await readPresentation(data, id, 'preview', signal);
  if (!result.files) return fail('NOT_READY', 'Child preview has no verified completed output.');
  const bytes = result.files.get('preview-manifest.json')!;
  const metadata = parse(z.object({taskId: Hash, mode: z.literal('silent'), planTaskId: Hash, planManifestSha256: Hash,
    environment: z.record(z.string(), z.string()), timeline: z.object({fps: z.literal(PRESENTATION_FPS),
      totalFrames: z.number().int().positive().max(7200)})}), decode(bytes));
  if (metadata.taskId !== id || metadata.planTaskId !== input.planTaskId ||
      metadata.planManifestSha256 !== input.planManifestSha256 ||
      canonical(metadata.environment) !== canonical(input.rendererEnvironment)) {
    return fail('INTEGRITY', 'Child preview differs from the verified plan or recorded renderer environment.');
  }
  return {metadata, bytes, files: result.files};
}

async function verifiedRender(data: string, task: TaskRecord, signal: AbortSignal) {
  const input = storedInput(RenderInput, task);
  const saved = await receipt(RenderReceipt, data, task, signal);
  const author = await verifiedAuthor(data, await readTask(data, input.authorTaskId, AUTHOR), signal);
  await verifiedPlan(data, author, input, signal);
  const preview = await verifiedPreview(data, input, saved.previewTaskId, signal);
  if (task.outputs.length || saved.authorManifestSha256 !== sha256(json(author.manifest)) ||
      saved.previewManifestSha256 !== sha256(preview.bytes) ||
      preview.metadata.timeline.totalFrames > author.manifest.request.maxSeconds * PRESENTATION_FPS) {
    return fail('INTEGRITY', 'Rendered stage differs from the accepted authoring or duration closure.');
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.0', taskId: task.id, stage: 'preview-ready',
    sessionTaskId: author.manifest.sessionTaskId, authorTaskId: input.authorTaskId, binding: author.manifest.binding,
    request: author.manifest.request, proposalHash: author.manifest.proposalHash, planTaskId: input.planTaskId,
    planManifestSha256: input.planManifestSha256, previewTaskId: saved.previewTaskId,
    previewManifestSha256: saved.previewManifestSha256, authorManifestSha256: saved.authorManifestSha256,
    timeline: preview.metadata.timeline, review} as const;
  const files = new Map(preview.files);
  files.set('session-manifest.json', json(manifest));
  files.set('start-manifest.json', json(author.parent.manifest));
  files.set('author-manifest.json', json(author.manifest));
  files.set('authoring-submission.json', json(author.submission));
  return {manifest, files};
}

async function executeStart(data: string, input: StartInput, signal: AbortSignal, onTask?: Announce, transport?: ReadonlyTransport) {
  const result = await run(data, START, input, signal, onTask, async (runner, id, child) => {
    const {request} = input;
    const snapshot = await researchRepository(request.repository, request.ref, request.documents, transport, child);
    const material = packet(id, input, snapshot);
    const artifact = await runner.artifacts.commit(json(snapshot), 'application/json', 'PUBLISH', id);
    return {value: StartReceipt.parse({...material.author.request, packetSha256: material.packetSha256, snapshot: artifact}),
      outputs: [artifact]};
  }, 180_000);
  const status = await statusExplanation(data, result.id, signal);
  return {...status, cached: result.cached};
}

async function executeAuthor(data: string, input: AuthorInput, signal: AbortSignal, onTask?: Announce) {
  const {submission} = input;
  const parent = await verifiedStart(data, await readTask(data, submission.sessionTaskId, START), signal);
  validateSubmission(submission, parent);
  const result = await run(data, AUTHOR, input, signal, onTask, async (_runner, _id, child) => {
    const proposalHash = 'proposal' in submission ? await withWorkflow(data, true, async store => {
      const projectId = parent.manifest.binding.projectId;
      const project = await store.create(projectId, parent.snapshot, {preserveExistingSource: true});
      if (project.snapshotHash !== parent.manifest.binding.snapshotHash) return fail('BINDING', 'Workflow source differs from the session.');
      const committed = await submitParsedAuthoringProposal(store, projectId, submission.proposal, child);
      return committed.hash;
    }) : null;
    return {value: AuthorReceipt.parse({startManifestSha256: sha256(json(parent.manifest)), proposalHash}), outputs: []};
  }, 60_000);
  const status = await statusExplanation(data, result.id, signal);
  return {...status, cached: result.cached};
}

async function executeRender(data: string, input: RenderInput, signal: AbortSignal, onTask?: Announce) {
  const author = await verifiedAuthor(data, await readTask(data, input.authorTaskId, AUTHOR), signal);
  await verifiedPlan(data, author, input, signal);
  const result = await run(data, RENDER, input, signal, onTask, async (_runner, _id, child) => {
    if (canonical(await environment()) !== canonical(input.rendererEnvironment)) {
      return fail('ENVIRONMENT', 'Renderer identity changed. Submit the authored plan again to create a new render checkpoint.');
    }
    const assertCurrent = () => withWorkflow(data, false, async store => {
      if (store.project(author.manifest.binding.projectId).snapshotHash !== author.manifest.binding.snapshotHash) {
        return fail('BINDING', 'Current workflow source changed. Use a new pinned session.');
      }
    });
    await assertCurrent();
    const preview = await renderPresentation(data, input.planTaskId, child);
    const checked = await verifiedPreview(data, input, preview.taskId, child);
    if (checked.metadata.timeline.totalFrames > author.manifest.request.maxSeconds * PRESENTATION_FPS) {
      return fail('DURATION', 'Verified preview exceeds the requested maximum frame count.');
    }
    await assertCurrent();
    return {value: RenderReceipt.parse({authorManifestSha256: sha256(json(author.manifest)),
      previewTaskId: preview.taskId, previewManifestSha256: sha256(checked.bytes)}), outputs: []};
  }, 3_120_000);
  const status = await statusExplanation(data, result.id, signal);
  return {...status, cached: result.cached};
}

async function sessionTask(data: string, id: string, signal: AbortSignal) {
  checkAbort(signal);
  if (!Hash.safeParse(id).success) return fail('TASK', 'Expected a lowercase hexadecimal explanation task ID.');
  const task = await readTask(data, id, null);
  if (task.kind !== START && task.kind !== AUTHOR && task.kind !== RENDER) {
    return fail('TASK', 'Task does not belong to an explanation session.');
  }
  return task;
}

async function checkedStage(data: string, task: TaskRecord, signal: AbortSignal) {
  if (task.kind === START) return verifiedStart(data, task, signal);
  if (task.kind === AUTHOR) return verifiedAuthor(data, task, signal);
  return verifiedRender(data, task, signal);
}

export async function statusExplanation(data: string, id: string, signal: AbortSignal) {
  const task = await sessionTask(data, id, signal);
  if (task.state !== 'succeeded') {
    const expired = task.state === 'running' && task.leaseUntil <= Date.now();
    if (task.kind === START) storedInput(StartInput, task);
    else if (task.kind === AUTHOR) storedInput(AuthorInput, task);
    else storedInput(RenderInput, task);
    return {taskId: id, kind: task.kind, state: expired ? 'interrupted' : task.state, attempt: task.attempt,
      retryable: task.attempt < RETRIES && (expired || (task.state !== 'running' && task.error?.classification !== 'permanent')),
      error: task.error};
  }
  const stage = await checkedStage(data, task, signal);
  return {...stage.manifest, state: task.state, attempt: task.attempt, integrity: 'verified' as const};
}

export async function startExplanation(data: string, path: string, out: string, signal: AbortSignal, onTask?: Announce,
  transport?: ReadonlyTransport) {
  const request = await spec(Request, path, 12_000);
  const input = StartInput.parse({profile: PROFILE, request, packetProfile: ExplanationAuthorPacketProfile});
  const status = await executeStart(data, input, signal, onTask, transport);
  return {...status, packet: await exportExplanation(data, status.taskId, out, signal)};
}

export async function submitExplanation(data: string, id: string, path: string, signal: AbortSignal, onTask?: Announce) {
  const submission = await spec(Submission, path, 360_000);
  if (submission.sessionTaskId !== id) return fail('BINDING', 'Submission must name the exact start task.');
  return executeAuthor(data, AuthorInput.parse({profile: PROFILE, submission}), signal, onTask);
}

export async function renderExplanation(data: string, id: string, path: string, signal: AbortSignal, onTask?: Announce) {
  const plan = await spec(PresentationPlan, path, 160_000);
  const author = await verifiedAuthor(data, await readTask(data, id, AUTHOR), signal);
  checkPlan(author, plan);
  data = await preflightPresentationState(data);
  const created = await withWorkflow(data, false, store => createPresentationFromPlan(store, author.manifest.binding.projectId,
    plan.proposalHash, plan, data, signal));
  const verified = await readPresentation(data, created.taskId, 'plan', signal);
  if (!verified.files) return fail('NOT_READY', 'Child plan has no completed output.');
  const input = RenderInput.parse({profile: PROFILE, authorTaskId: id, plan, planTaskId: created.taskId,
    planManifestSha256: sha256(verified.files.get('plan-manifest.json')!), rendererEnvironment: await environment()});
  return executeRender(data, input, signal, onTask);
}

export async function resumeExplanation(data: string, id: string, signal: AbortSignal, onTask?: Announce) {
  const task = await sessionTask(data, id, signal);
  if (task.state === 'succeeded') return {...await statusExplanation(data, id, signal), cached: true};
  if (task.kind === START) return executeStart(data, storedInput(StartInput, task), signal, onTask);
  if (task.kind === AUTHOR) return executeAuthor(data, storedInput(AuthorInput, task), signal, onTask);
  return executeRender(data, storedInput(RenderInput, task), signal, onTask);
}

export async function exportExplanation(data: string, id: string, out: string, signal: AbortSignal) {
  const stage = await checkedStage(data, await sessionTask(data, id, signal), signal);
  return publishAssetFiles(data, id, out, stage.files, signal, RECEIPT_PUBLICATION);
}
