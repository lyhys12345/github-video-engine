import {lstat, mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {StoryProposal} from '../contracts/authoring.js';
import {PresentationPlan} from '../contracts/presentation.js';
import {ArtifactSchema} from '../contracts/runtime.js';
import {Hash, Id} from '../contracts/video.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {cleanupOwnedRuntimeTmp, createOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {environment, ffmpegPath, ffprobePath, projectRoot} from '../providers/local.js';
import {publishAssetFiles, RECEIPT_PUBLICATION} from '../story-planner/asset-pack.js';
import {verifyMovie} from '../story-planner/preview.js';
import {ancestors, boundedFile, preflightStatePath, readTask} from '../story-planner/runtime.js';
import {loadAuthoringProposal} from '../workflow/agent-authoring.js';
import type {WorkflowStore} from '../workflow/store.js';
import {compilePresentation, type CompiledPresentation} from './compile.js';

export const PLAN_KIND = 'repository-presentation-plan-v1';
export const PREVIEW_KIND = 'repository-presentation-preview-v1';
const FONT_SHA = 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da';
const GEOMETRY = {width: 720, height: 1280};
const MAX_MOVIE_BYTES = 80_000_000;
const RETRIES = 3;
const review = {semanticReview: 'pending', editorialReview: 'pending', audiovisualReview: 'pending', voice: 'omitted-explicitly', ownerAcceptance: 'pending'} as const;
const Source = z.strictObject({id: Id, path: z.string().regex(/^source-[1-8]\.txt$/), url: z.string().max(600), sha256: Hash});
const PlanInput = z.strictObject({projectId: Id, proposal: StoryProposal, plan: PresentationPlan, evidenceSha256: Hash,
  sources: z.array(Source).min(1).max(8), compiler: z.array(z.strictObject({path: z.string(), sha256: Hash})).min(1).max(20)});
type PlanInput = z.infer<typeof PlanInput>;
const PreviewInput = z.strictObject({planTaskId: Hash, planManifestSha256: Hash, mode: z.literal('silent'),
  fontSha256: z.literal(FONT_SHA), environment: z.record(z.string(), z.string())});
const Result = z.strictObject({kind: z.enum([PLAN_KIND, PREVIEW_KIND]), files: z.array(z.strictObject({
  path: z.string().max(90), artifact: ArtifactSchema,
})).min(4).max(60)});
const json = (value: unknown) => Buffer.from(canonical(value));
const decode = (bytes: Buffer) => JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
const fail = (message: string): never => {throw new EngineError('PRESENTATION_INTEGRITY', message);};
const fingerprint = (kind: string, input: unknown) => sha256(canonical({version: 'production-task-v1', kind, input}));

async function preflight(data: string) {
  data = resolve(data);
  preflightStatePath(data);
  await ancestors(join(data, 'tmp'));
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const info = await lstat(join(data, 'tasks.sqlite' + suffix)).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
    if (info && (!info.isFile() || info.isSymbolicLink())) fail('Presentation task databases require ordinary files.');
  }
  return data;
}

async function readArtifacts(data: string, task: Awaited<ReturnType<typeof readTask>>, expected: string[], signal: AbortSignal) {
  if (task.state !== 'succeeded' || !task.result) throw new EngineError('PRESENTATION_NOT_READY', 'Presentation task has no committed successful result.');
  const store = new ArtifactStore(data);
  async function read(artifact: z.infer<typeof ArtifactSchema>, limit: number) {
    checkAbort(signal);
    if (artifact.inputFingerprint !== task.id) fail('Artifact belongs to a different task.');
    const bytes = await boundedFile(store.path(artifact), limit);
    if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) fail('Committed presentation artifact is damaged.');
    return bytes;
  }
  const result = Result.parse(decode(await read(task.result, 200_000)));
  if (result.kind !== task.kind || canonical(result.files.map(item => item.path).sort()) !== canonical(expected.slice().sort()) ||
      canonical(result.files.map(item => canonical(item.artifact)).sort()) !== canonical(task.outputs.map(item => canonical(item)).sort())) {
    fail('Presentation file or artifact closure differs.');
  }
  const files = new Map<string, Buffer>();
  for (const file of result.files) files.set(file.path, await read(file.artifact, file.path === 'preview.mp4' ? MAX_MOVIE_BYTES : 2_000_000));
  return files;
}

async function writeArtifacts(runner: TaskRunner, kind: typeof PLAN_KIND | typeof PREVIEW_KIND, id: string, files: Map<string, Buffer>, signal: AbortSignal) {
  const entries: z.infer<typeof Result>['files'] = [];
  for (const [path, bytes] of files) {
    checkAbort(signal);
    const type = path.endsWith('.mp4') ? 'video/mp4' : path.endsWith('.png') ? 'image/png' : path.endsWith('.json') ? 'application/json' : 'text/plain';
    entries.push({path, artifact: await runner.artifacts.commit(bytes, type, 'PUBLISH', id)});
  }
  return {value: Result.parse({kind, files: entries}), outputs: entries.map(entry => entry.artifact)};
}

function verifySources(input: PlanInput, evidence: Buffer, files: Map<string, Buffer>) {
  if (sha256(evidence) !== input.evidenceSha256) fail('Evidence manifest bytes differ.');
  const manifest = decode(evidence);
  const {binding} = input.proposal;
  if (manifest.projectId !== binding.projectId || input.projectId !== binding.projectId || manifest.snapshotHash !== binding.snapshotHash ||
      manifest.repository !== binding.repository || manifest.commit !== binding.commit || manifest.fingerprint !== binding.evidenceFingerprint ||
      canonical(manifest.sources) !== canonical(input.sources)) fail('Pinned evidence identity differs.');
  const {fingerprint: recorded, ...payload} = manifest;
  if (sha256(canonical(payload)) !== recorded) fail('Pinned evidence fingerprint differs from its manifest.');
  const prefix = binding.repository + '/blob/' + binding.commit + '/';
  const sourceLines = new Map<string, {sha256: string; lines: string[]}>();
  for (const [index, source] of input.sources.entries()) {
    const bytes = files.get(source.path);
    if (!bytes || source.id !== 'source-' + (index + 1) || source.path !== source.id + '.txt' ||
        !source.url.startsWith(prefix) || sha256(bytes) !== source.sha256) fail('Exact source bytes or pinned source descriptor differ.');
    sourceLines.set(source.id, {sha256: source.sha256, lines: bytes!.toString('utf8').split(/\r?\n/)});
  }
  for (const claim of input.proposal.claims) for (const citation of claim.citations) {
    const source = sourceLines.get(citation.sourceId);
    if (!source || source.sha256 !== citation.sourceSha256 || citation.startLine > citation.endLine || citation.endLine > source.lines.length ||
        source.lines.slice(citation.startLine - 1, citation.endLine).join('\n') !== citation.quote) fail('Proposal citation differs from its pinned source.');
  }
}

function planFiles(input: PlanInput, compiled: CompiledPresentation, id: string, sources: Map<string, Buffer>) {
  const evidence = sources.get('evidence.json')!;
  verifySources(input, evidence, sources);
  const files = new Map<string, Buffer>([
    ['proposal.json', json(input.proposal)], ['presentation.json', json(input.plan)], ['trace.json', json(compiled)],
    ['evidence.json', evidence], ...input.sources.map(source => [source.path, sources.get(source.path)!] as [string, Buffer]),
  ]);
  if (compiled.asset) files.set('illustrative-asset.json', json(compiled.asset.content));
  files.set('plan-manifest.json', json({kind: PLAN_KIND, taskId: id, binding: compiled.binding, proposalHash: compiled.proposalHash,
    planSha256: compiled.planSha256, moduleId: compiled.moduleId, timeline: compiled.timeline, review,
    files: [...files].map(([path, bytes]) => ({path, bytes: bytes.length, sha256: sha256(bytes)}))}));
  return files;
}

async function checkedPlan(data: string, id: string, signal: AbortSignal) {
  const task = await readTask(data, id, PLAN_KIND);
  const input = PlanInput.parse(task.input);
  const compiled = compilePresentation(input.proposal, input.plan);
  const names = ['proposal.json', 'presentation.json', 'trace.json', 'evidence.json', 'plan-manifest.json', ...input.sources.map(source => source.path)];
  if (compiled.asset) names.push('illustrative-asset.json');
  const files = await readArtifacts(data, task, names, signal);
  const derived = planFiles(input, compiled, id, files);
  for (const [path, bytes] of derived) if (!bytes.equals(files.get(path)!)) fail('Presentation plan derivation differs: ' + path);
  return {files, compiled, task};
}

export async function createPresentation(store: WorkflowStore, id: string, proposalHash: string, spec: string, data: string, signal: AbortSignal) {
  checkAbort(signal);
  const specBytes = await boundedFile(resolve(spec), 160_000);
  let value: unknown;
  try {value = decode(specBytes);}
  catch {throw new EngineError('PRESENTATION_JSON', 'Expected valid UTF-8 presentation JSON.');}
  const plan = PresentationPlan.safeParse(value);
  if (!plan.success) throw new EngineError('PRESENTATION_SCHEMA', 'Expected a bounded presentation plan. ' +
    plan.error.issues.slice(0, 6).map(issue => issue.path.join('.') + ' ' + issue.message).join(', '));
  const {proposal, bytes, workspace} = await loadAuthoringProposal(store, id, proposalHash, signal);
  if (bytes.length > 300_000) throw new EngineError('PRESENTATION_SIZE', 'Presentation proposal exceeds 300 kB.');
  const assertCurrent = () => {
    if (store.project(id).snapshotHash !== proposal.binding.snapshotHash) throw new EngineError('AUTHORING_STALE', 'Select a proposal for the current source revision.');
  };
  const compiled = compilePresentation(proposal, plan.data);
  const compiler = await Promise.all(['src/contracts/presentation.ts', 'src/presentation/compile.ts', 'src/presentation/asset.ts', 'src/presentation/runtime.ts']
    .map(async path => ({path, sha256: sha256(await boundedFile(join(projectRoot, path)))})));
  const input = PlanInput.parse({projectId: id, proposal, plan: plan.data, sources: workspace.manifest.sources,
    evidenceSha256: sha256(workspace.files.get('evidence.json')!), compiler});
  const taskId = fingerprint(PLAN_KIND, input);
  const files = planFiles(input, compiled, taskId, workspace.files);
  data = await preflight(data);
  checkAbort(signal);
  assertCurrent();
  const runner = new TaskRunner(data);
  try {
    const task = await runner.run(PLAN_KIND, input, async (_dir, workSignal) => {
      const result = await writeArtifacts(runner, PLAN_KIND, taskId, files, workSignal);
      assertCurrent();
      return result;
    }, signal, {attempts: RETRIES, timeoutMs: 60_000});
    await checkedPlan(data, taskId, signal);
    assertCurrent();
    return {taskId, cached: task.cached, moduleId: compiled.moduleId, beats: compiled.beats.length, timeline: compiled.timeline,
      proposalHash, planSha256: compiled.planSha256, binding: compiled.binding, review};
  } finally {runner.close();}
}

function sampleFrames(plan: CompiledPresentation) {
  const frames = new Set([0, plan.timeline.totalFrames - 1, ...plan.beats.map(beat => beat.start)]);
  for (const [index, event] of plan.trace.entries()) {
    const next = plan.trace[index + 1]?.frame ?? plan.timeline.totalFrames;
    for (const frame of [event.frame - 1, event.frame, Math.min(event.frame + 24, next - 1)]) {
      if (frame >= 0 && frames.size < 48) frames.add(frame);
    }
  }
  return [...frames].sort((a, b) => a - b);
}

function captions(plan: CompiledPresentation) {
  const time = (frame: number) => new Date(Math.round(frame / plan.timeline.fps * 1000)).toISOString().slice(11, 23);
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/\s+/g, ' ');
  return Buffer.from('WEBVTT\n\n' + plan.beats.map(beat => `${time(beat.start)} --> ${time(beat.end)}\n${escape(beat.narration)}\n`).join('\n'));
}

function previewManifest(input: z.infer<typeof PreviewInput>, id: string, plan: CompiledPresentation, samples: number[], movie: Buffer, probe: unknown) {
  return {kind: PREVIEW_KIND, taskId: id, ...input, binding: plan.binding, proposalHash: plan.proposalHash, planSha256: plan.planSha256,
    moduleId: plan.moduleId, timeline: plan.timeline, samples, media: {sha256: sha256(movie), probe, fullDecodeExit: 0}, review};
}

export async function renderPresentation(data: string, planTaskId: string, signal: AbortSignal, onTask?: (id: string) => void) {
  checkAbort(signal);
  data = await preflight(data);
  const plan = await checkedPlan(data, planTaskId, signal);
  const font = await boundedFile(join(projectRoot, 'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'), 30_000_000);
  if (sha256(font) !== FONT_SHA) fail('Pinned presentation font differs.');
  const env = await environment();
  const input = PreviewInput.parse({planTaskId, planManifestSha256: sha256(plan.files.get('plan-manifest.json')!),
    mode: 'silent', fontSha256: FONT_SHA, environment: env});
  const taskId = fingerprint(PREVIEW_KIND, input);
  const samples = sampleFrames(plan.compiled);
  checkAbort(signal);
  onTask?.(taskId);
  const runner = new TaskRunner(data);
  try {
    const task = await runner.run(PREVIEW_KIND, input, async (directory, workSignal) => {
      const runtime = await createOwnedRuntimeTmp(directory);
      const work = runtime.directory;
      await mkdir(join(work, 'public'));
      await writeFile(join(work, 'public', 'font.ttf'), font, {flag: 'wx'});
      const workerInput = join(work, 'input.json');
      await writeFile(workerInput, json({entry: join(projectRoot, 'src/presentation/composition.tsx'), browser: env.browser,
        props: plan.compiled, sampleFrames: samples, geometry: {...GEOMETRY, fps: plan.compiled.timeline.fps}}), {flag: 'wx'});
      await command(process.execPath, ['--import', 'tsx', join(projectRoot, 'src/short-segment/worker.ts'), workerInput], {
        signal: workSignal, timeout: 660_000, cwd: projectRoot, env: {TEMP: work, TMP: work, TMPDIR: work},
      });
      const raw = join(work, 'silent.mp4'), movie = join(work, 'preview.mp4');
      const rawProbe = JSON.parse(await command(ffprobePath(), ['-v', 'error', '-show_streams', '-of', 'json', raw], {signal: workSignal, timeout: 120_000}));
      const stream = rawProbe.streams[0];
      const fullRange = stream?.color_range === 'pc' || String(stream?.pix_fmt).startsWith('yuvj');
      await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-n', '-i', raw, '-map', '0:v:0', '-vf',
        fullRange ? 'scale=in_range=pc:out_range=tv,format=yuv420p' : 'format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-color_range', 'tv', '-movflags', '+faststart', movie],
      {signal: workSignal, timeout: 120_000});
      const probe = await verifyMovie(movie, {mode: 'silent', timeline: plan.compiled.timeline}, workSignal);
      if (canonical(await environment()) !== canonical(env)) fail('Renderer environment changed during presentation.');
      const video = await boundedFile(movie, MAX_MOVIE_BYTES);
      const files = new Map<string, Buffer>([['preview.mp4', video], ['captions.vtt', captions(plan.compiled)]]);
      for (const frame of samples) files.set('samples/' + frame + '.png', await boundedFile(join(work, 'samples', frame + '.png')));
      files.set('preview-manifest.json', json(previewManifest(input, taskId, plan.compiled, samples, video, probe)));
      return writeArtifacts(runner, PREVIEW_KIND, taskId, files, workSignal);
    }, signal, {attempts: RETRIES, timeoutMs: 900_000, beforeDiscardTemporary: cleanupOwnedRuntimeTmp,
      accounting: {provider: 'remotion-local', ratePolicy: 'local-zero-v1'}});
    await readPresentation(data, taskId, 'preview', signal);
    return {taskId, planTaskId, cached: task.cached, state: 'succeeded', mode: 'silent', review};
  } finally {runner.close();}
}

export async function readPresentation(data: string, id: string, kind: 'plan' | 'preview', signal: AbortSignal) {
  const task = await readTask(data, id, kind === 'plan' ? PLAN_KIND : PREVIEW_KIND);
  if (task.state !== 'succeeded') {
    const expired = task.state === 'running' && task.leaseUntil <= Date.now();
    return {status: {taskId: id, state: expired ? 'interrupted' : task.state, attempt: task.attempt,
      retryable: task.attempt < RETRIES && (expired || task.state !== 'running'), error: task.error, review}};
  }
  if (kind === 'plan') {
    const plan = await checkedPlan(data, id, signal);
    return {files: plan.files, status: {taskId: id, state: task.state, attempt: task.attempt, integrity: 'verified',
      binding: plan.compiled.binding, proposalHash: plan.compiled.proposalHash, planSha256: plan.compiled.planSha256,
      moduleId: plan.compiled.moduleId, timeline: plan.compiled.timeline, review}};
  }
  const input = PreviewInput.parse(task.input);
  const plan = await checkedPlan(data, input.planTaskId, signal);
  if (sha256(plan.files.get('plan-manifest.json')!) !== input.planManifestSha256) fail('Preview parent plan manifest differs.');
  const samples = sampleFrames(plan.compiled);
  const files = await readArtifacts(data, task, ['preview.mp4', 'captions.vtt', 'preview-manifest.json', ...samples.map(frame => `samples/${frame}.png`)], signal);
  const manifest = decode(files.get('preview-manifest.json')!);
  const probe = manifest.media?.probe, stream = probe?.streams?.[0];
  if (probe?.streams?.length !== 1 || stream?.codec_type !== 'video' || stream?.codec_name !== 'h264' || stream?.pix_fmt !== 'yuv420p' ||
      stream?.width !== GEOMETRY.width || stream?.height !== GEOMETRY.height || stream?.avg_frame_rate !== plan.compiled.timeline.fps + '/1' ||
      Number(stream?.nb_read_frames) !== plan.compiled.timeline.totalFrames ||
      !json(previewManifest(input, id, plan.compiled, samples, files.get('preview.mp4')!, probe)).equals(files.get('preview-manifest.json')!) ||
      !captions(plan.compiled).equals(files.get('captions.vtt')!)) fail('Preview media, captions or parent binding differs.');
  for (const [path, bytes] of plan.files) files.set('editable/' + path, bytes);
  return {files, status: {taskId: id, planTaskId: input.planTaskId, state: task.state, attempt: task.attempt, integrity: 'verified',
    binding: plan.compiled.binding, proposalHash: plan.compiled.proposalHash, planSha256: plan.compiled.planSha256,
    moduleId: plan.compiled.moduleId, timeline: plan.compiled.timeline, review}};
}

export async function exportPresentation(data: string, id: string, kind: 'plan' | 'preview', output: string, signal: AbortSignal) {
  const result = await readPresentation(data, id, kind, signal);
  if (!result.files) throw new EngineError('PRESENTATION_NOT_READY', 'Presentation task has no successful output to export.');
  return publishAssetFiles(data, id, output, result.files, signal, RECEIPT_PUBLICATION);
}
