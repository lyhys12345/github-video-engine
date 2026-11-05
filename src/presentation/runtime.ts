import {lstat, mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {StoredStoryProposal} from '../contracts/authoring.js';
import {HiddenFileCapability} from '../contracts/hidden-file-policy.js';
import {PRESENTATION_FPS, PRESENTATION_LEGACY_MAX_FRAMES, presentationMaxFrames, PresentationPlan} from '../contracts/presentation.js';
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
import {layoutCaptions} from './caption-layout.js';
import {CAPTION_LAYOUT_PROFILE, type CaptionLine} from './caption-layout-style.js';
import {compilePresentation, type CompiledPresentation} from './compile.js';
import {decodeClip, FRAME_SAMPLES, loadClip, matchVoice, MAX_PCM, mixClips, NARRATED_KIND, placement, projectCaptions, RATE,
  voiceCaptions, VOICE_KIND, voiceReview, VoiceSpec} from './narration.js';
import {EXTENDED_RENDER_PROFILE, EXTENDED_VERIFY_DEADLINE, EXTENDED_WORKER_DEADLINE, extendedRanges,
  MAX_MOVIE_BYTES, MAX_PART_BYTES, MAX_SAMPLE_BYTES, MAX_SAMPLES, requireExtendedDisk} from './duration.js';
import {checkZhVisualText} from './visual-locale-check.js';
import {HIDDEN_FILE_MOBILE_LAYOUT, HIDDEN_FILE_NARRATED_LAYOUT, LEGACY_HIDDEN_FILE_NARRATED_LAYOUT, hiddenFileLayout} from './hidden-file-layout.js';
import {ZH_VISUAL_PROFILE, type VisualLocaleProfile} from './visual-locale.js';

export const PLAN_KIND = 'repository-presentation-plan-v1';
export const PREVIEW_KIND = 'repository-presentation-preview-v1';
const FONT_SHA = 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da';
const GEOMETRY = {width: 720, height: 1280};
const RETRIES = 3;
const MEDIA_METADATA_PROFILE = 'ffprobe-no-location/1';
const EARLY_VOICE_IMPLEMENTATION = '5fcc6b1dde72b2ce7dd45894b11d547503e20988fbf219d9f6c7b4117c41ff2c';
const EARLY_VOICE_LEDGER = 'voice-ledger-1.0-early-event-trace';
const requireQueueMigration = (): never => {
  throw new EngineError('PRESENTATION_MIGRATION', 'Queue plan 1.2 is historical. Use schemaVersion 1.3 for new plans and previews. Existing tasks remain available through status, export and successful render-task resume.');
};
const review = {semanticReview: 'pending', editorialReview: 'pending', audiovisualReview: 'pending', voice: 'omitted-explicitly', ownerAcceptance: 'pending'} as const;
const Source = z.strictObject({id: Id, path: z.string().regex(/^source-[1-8]\.txt$/), url: z.string().max(600), sha256: Hash});
const PlanInput = z.strictObject({projectId: Id, proposal: StoredStoryProposal, plan: PresentationPlan, evidenceSha256: Hash,
  portableVoiceImportHash: Hash.optional(), hiddenVoicePreparationTaskId: Hash.optional(), sources: z.array(Source).min(1).max(8), compiler: z.array(z.strictObject({path: z.string(), sha256: Hash})).min(1).max(20)});
type PlanInput = z.infer<typeof PlanInput>;
const PreviewInput = z.strictObject({planTaskId: Hash, planManifestSha256: Hash, mode: z.literal('silent'),
  fontSha256: z.literal(FONT_SHA), environment: z.record(z.string(), z.string()),
  mediaMetadataProfile: z.literal(MEDIA_METADATA_PROFILE).optional(),
  renderProfile: z.literal(EXTENDED_RENDER_PROFILE).optional(), rendererSha256: Hash.optional(),
  capabilityProfile: z.literal(HiddenFileCapability).optional(),
  hiddenFileLayoutProfile: z.enum([HIDDEN_FILE_MOBILE_LAYOUT, LEGACY_HIDDEN_FILE_NARRATED_LAYOUT, HIDDEN_FILE_NARRATED_LAYOUT]).optional(), hiddenFileLayoutSha256: Hash.optional()});
const VoiceInput = z.strictObject({spec: VoiceSpec, decoder: z.record(z.string(), z.string()), implementationSha256: Hash});
const NarratedInput = PreviewInput.extend({mode: z.literal('narrated'), voiceTaskId: Hash, voiceManifestSha256: Hash,
  captionLayoutProfile: z.literal(CAPTION_LAYOUT_PROFILE).optional(),
  visualLocaleProfile: z.literal(ZH_VISUAL_PROFILE).optional()});
const Result = z.strictObject({kind: z.enum([PLAN_KIND, PREVIEW_KIND, VOICE_KIND, NARRATED_KIND]), files: z.array(z.strictObject({
  path: z.string().max(90), artifact: ArtifactSchema,
})).min(4).max(60)});
const json = (value: unknown) => Buffer.from(canonical(value));
const decode = (bytes: Buffer) => JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
const fail = (message: string): never => {throw new EngineError('PRESENTATION_INTEGRITY', message);};
const fingerprint = (kind: string, input: unknown) => sha256(canonical({version: 'production-task-v1', kind, input}));
const perFileLimit = (path: string) =>
  path === 'preview.mp4' ? MAX_MOVIE_BYTES : path.endsWith('.pcm') ? MAX_PCM : MAX_SAMPLE_BYTES;
const payloadLimits = {
  [PLAN_KIND]: 24_000_000,
  [PREVIEW_KIND]: MAX_MOVIE_BYTES + (MAX_SAMPLES + 2) * MAX_SAMPLE_BYTES,
  [NARRATED_KIND]: MAX_MOVIE_BYTES + (MAX_SAMPLES + 2) * MAX_SAMPLE_BYTES,
  [VOICE_KIND]: 2 * MAX_PCM + 3 * MAX_SAMPLE_BYTES,
} as const;

export function checkPresentationPayload(kind: z.infer<typeof Result>['kind'], files: Iterable<{path: string; bytes: number}>) {
  let total = 0, count = 0;
  for (const {path, bytes} of files) {
    total += bytes;
    count++;
    if (bytes < 1 || bytes > perFileLimit(path) || total > payloadLimits[kind] || count > 60) {
      throw new EngineError('PRESENTATION_PAYLOAD', 'Presentation files exceed the bounded artifact payload.');
    }
  }
}

export function taskCancellation(signal: AbortSignal) {
  const control = new AbortController();
  const forward = () => {
    const reason = signal.reason;
    control.abort(reason instanceof DOMException && reason.name === 'AbortError' ?
      new EngineError('CANCELLED', 'Presentation task cancelled.', 'cancelled') :
      reason instanceof DOMException && reason.name === 'TimeoutError' ?
        new EngineError('TIMEOUT', 'Presentation deadline exceeded.', 'retryable') : reason);
  };
  signal.addEventListener('abort', forward, {once: true});
  if (signal.aborted) forward();
  return {signal: control.signal, dispose: () => signal.removeEventListener('abort', forward)};
}

export async function preflightPresentationState(data: string) {
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
  checkPresentationPayload(result.kind, result.files.map(({path, artifact}) => ({path, bytes: artifact.bytes})));
  const files = new Map<string, Buffer>();
  for (const file of result.files) files.set(file.path, await read(file.artifact, perFileLimit(file.path)));
  return files;
}

async function writeArtifacts(runner: TaskRunner, kind: z.infer<typeof Result>['kind'], id: string, files: Map<string, Buffer>, signal: AbortSignal) {
  checkPresentationPayload(kind, [...files].map(([path, bytes]) => ({path, bytes: bytes.length})));
  const entries: z.infer<typeof Result>['files'] = [];
  for (const [path, bytes] of files) {
    checkAbort(signal);
    const type = path.endsWith('.mp4') ? 'video/mp4' : path.endsWith('.png') ? 'image/png' : path.endsWith('.json') ? 'application/json' :
      path.endsWith('.pcm') ? 'application/octet-stream' : 'text/plain';
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
    ...(compiled.moduleId === 'hidden-file-policy/1' ? {capabilityProfile: compiled.capabilityProfile, scope: compiled.scope} : {}),
    ...(input.hiddenVoicePreparationTaskId && {hiddenVoicePreparationTaskId: input.hiddenVoicePreparationTaskId}),
    ...(input.portableVoiceImportHash && {portableVoiceImportHash: input.portableVoiceImportHash}),
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
  return {files, compiled, task, hiddenVoicePreparationTaskId: input.hiddenVoicePreparationTaskId, portableVoiceImportHash:input.portableVoiceImportHash, maxFrames: presentationMaxFrames(input.plan.schemaVersion)};
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
  return createPresentationFromPlan(store, id, proposalHash, plan.data, data, signal);
}

export async function createPresentationFromPlan(store: WorkflowStore, id: string, proposalHash: string,
  plan: PresentationPlan, data: string, signal: AbortSignal, hiddenVoicePreparationTaskId?: string, portableVoiceImportHash?:string) {
  checkAbort(signal);
  if (plan.schemaVersion === '1.2') requireQueueMigration();
  const {proposal, bytes, workspace} = await loadAuthoringProposal(store, id, proposalHash, signal);
  if (bytes.length > 300_000) throw new EngineError('PRESENTATION_SIZE', 'Presentation proposal exceeds 300 kB.');
  const assertCurrent = () => {
    if (store.project(id).snapshotHash !== proposal.binding.snapshotHash) throw new EngineError('AUTHORING_STALE', 'Select a proposal for the current source revision.');
  };
  const compiled = compilePresentation(proposal, plan);
  if (portableVoiceImportHash && (hiddenVoicePreparationTaskId || compiled.moduleId !== 'hidden-file-policy/1' || compiled.language !== 'zh-CN')) throw new EngineError('VOICE_PARENT','Portable local voice requires a separate Chinese hidden-file import profile.');
  if (hiddenVoicePreparationTaskId && (compiled.moduleId !== 'hidden-file-policy/1' || compiled.language !== 'zh-CN')) {
    throw new EngineError('VOICE_PARENT', 'Hidden-file voice requires a Chinese hidden-file plan.');
  }
  const queueImplementation = compiled.moduleId === 'concurrency-queue/1' ? [
    'src/contracts/authoring.ts', 'src/contracts/concurrency-queue.ts', 'src/presentation/concurrency-queue.ts',
    'src/presentation/queue-frame.ts', 'src/presentation/queue-composition.tsx', 'src/presentation/composition.tsx',
  ] : [];
  const hiddenImplementation = compiled.moduleId === 'hidden-file-policy/1' ? [
    'src/contracts/authoring.ts', 'src/contracts/hidden-file-policy.ts', 'src/presentation/hidden-file-policy.ts',
  ] : [];
  const compiler = await Promise.all(['src/contracts/presentation.ts', 'src/presentation/compile.ts', 'src/presentation/asset.ts',
    'src/presentation/runtime.ts', ...queueImplementation, ...hiddenImplementation]
    .map(async path => ({path, sha256: sha256(await boundedFile(join(projectRoot, path)))})));
  const input = PlanInput.parse({projectId: id, proposal, plan, sources: workspace.manifest.sources,
    evidenceSha256: sha256(workspace.files.get('evidence.json')!), compiler,
    ...(hiddenVoicePreparationTaskId && {hiddenVoicePreparationTaskId}), ...(portableVoiceImportHash && {portableVoiceImportHash})});
  const taskId = fingerprint(PLAN_KIND, input);
  const files = planFiles(input, compiled, taskId, workspace.files);
  data = await preflightPresentationState(data);
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

function sampleFrames(plan: CompiledPresentation, cues: {startFrame: number; endFrame: number}[] = [], extended = false) {
  const frames = new Set([0, plan.timeline.totalFrames - 1, ...plan.beats.map(beat => beat.start)]);
  if (plan.moduleId === 'concurrency-queue/1' && plan.endingTitle) {
    const ending = plan.endingTitle.visibleFromFrame;
    for (const frame of [ending - 1, ending, ending + 1]) if (frame >= 0) frames.add(frame);
  }
  for (const cue of cues) if (frames.size < MAX_SAMPLES) frames.add(cue.startFrame);
  if (extended) for (const [first] of extendedRanges(plan.timeline.totalFrames)) {
    for (const frame of [first, first - 1]) if (frames.size < MAX_SAMPLES && frame >= 0) frames.add(frame);
  }
  for (const cue of cues) if (frames.size < MAX_SAMPLES && cue.endFrame < plan.timeline.totalFrames) frames.add(cue.endFrame);
  for (const [index, event] of plan.trace.entries()) {
    const next = plan.trace[index + 1]?.frame ?? plan.timeline.totalFrames;
    const anchors = 'motionFrames' in event ?
      [event.frame - 1, event.frame, event.frame + Math.floor(event.motionFrames / 2), event.frame + event.motionFrames] :
      [event.frame - 1, event.frame, Math.min(event.frame + 24, next - 1)];
    for (const frame of anchors) {
      if (frame >= 0 && frames.size < MAX_SAMPLES) frames.add(frame);
    }
  }
  return [...frames].sort((a, b) => a - b);
}

function captions(plan: CompiledPresentation) {
  const time = (frame: number) => new Date(Math.round(frame / plan.timeline.fps * 1000)).toISOString().slice(11, 23);
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/\s+/g, ' ');
  return Buffer.from('WEBVTT\n\n' + plan.beats.map(beat => `${time(beat.start)} --> ${time(beat.end)}\n${escape(beat.narration)}\n`).join('\n'));
}

async function voicePlan(data: string, spec: VoiceSpec, signal: AbortSignal) {
  const plan = await checkedPlan(data, spec.planTaskId, signal);
  if (plan.compiled.moduleId === 'hidden-file-policy/1' && !plan.hiddenVoicePreparationTaskId && !plan.portableVoiceImportHash) throw new EngineError('VOICE_PARENT', 'Hidden-file policy previews are silent in this profile.');
  if (sha256(plan.files.get('plan-manifest.json')!) !== spec.planManifestSha256) fail('Voice parent manifest differs.');
  return {plan, matches: matchVoice(plan.compiled, spec)};
}

async function voiceFiles(data: string, input: z.infer<typeof VoiceInput>, id: string, signal: AbortSignal,
  getPcm: (source: Awaited<ReturnType<typeof loadClip>>, index: number) => Promise<Buffer>) {
  const {plan, matches} = await voicePlan(data, input.spec, signal);
  const files = new Map<string, Buffer>();
  const sourceFiles = new Map<string, Buffer>();
  const placed = [];
  let originalBytes = 0;
  for (const [index, {beat, clip}] of matches.entries()) {
    const source = await loadClip(data, clip, input.spec.voicePolicy, signal);
    if (plan.hiddenVoicePreparationTaskId && !('generationManifestBytes' in source && source.generationManifestBytes)) {
      throw new EngineError('VOICE_RECEIPT', 'The hidden-file narrated plan requires verified Huihui source recordings.');
    }
    if (plan.portableVoiceImportHash && (source.receipt.input as {adapterVersion?:string}).adapterVersion!=='local-import-v1') throw new EngineError('VOICE_RECEIPT','Portable local voice requires a newly verified local audio import.');
    originalBytes += source.audio.length;
    if (originalBytes > 32_000_000) throw new EngineError('VOICE_SIZE', 'Combined original recordings exceed 32 MB.');
    const pcm = await getPcm(source, index);
    const cue = placement(beat, clip, pcm, source);
    files.set(`clips/${index}.pcm`, pcm);
    sourceFiles.set(`original/${index}.audio`, source.audio);
    sourceFiles.set(`original/${index}.receipt.json`, source.receiptBytes);
    if ('generationManifestBytes' in source && source.generationManifestBytes) {
      sourceFiles.set(`original/${index}.generation.json`, source.generationManifestBytes);
    }
    placed.push({pcm, cue, captions: projectCaptions(clip, cue)});
  }
  const cues = placed.map(item => item.cue);
  const captionCues = placed.flatMap(item => item.captions);
  const authoredCaptions = input.spec.schemaVersion === 'presentation-voice-bindings/1.1';
  const mix = mixClips(plan.compiled.timeline.totalFrames, placed);
  files.set('narration.pcm', mix);
  files.set('captions.vtt', voiceCaptions(captionCues, authoredCaptions));
  files.set('bindings.json', json(input.spec));
  const ledger = {schemaVersion: authoredCaptions ? 'presentation-voice-ledger/1.1' : 'presentation-voice-ledger/1.0', taskId: id, ...input,
    sampleRate: RATE, sampleFormat: 's16le-mono', playbackRate: 1, mixedPcmSha256: sha256(mix), cues,
    ...(authoredCaptions ? {captionTiming: 'caller-declared' as const, captionCues} : {}),
    events: plan.compiled.trace.map(event => ({frame: event.frame, beatId: event.beatId, kind: event.kind,
      claimIds: event.claimIds, sample: event.frame * FRAME_SAMPLES,
      relativeToClipStartSamples: event.frame * FRAME_SAMPLES - cues.find(cue => cue.beatId === event.beatId)!.startSample})),
    review: voiceReview};
  files.set('voice-manifest.json', json(ledger));
  return {files, sourceFiles, plan, captionCues, ledger};
}

async function checkedVoice(data: string, id: string, signal: AbortSignal, historicalRead = false) {
  const task = await readTask(data, id, VOICE_KIND);
  const input = VoiceInput.parse(task.input);
  const paths = [...input.spec.clips.map((_, index) => `clips/${index}.pcm`), 'narration.pcm', 'captions.vtt', 'bindings.json', 'voice-manifest.json'];
  const files = await readArtifacts(data, task, paths, signal);
  const derived = await voiceFiles(data, input, id, signal, async (_source, index) => files.get(`clips/${index}.pcm`)!);
  // The pinned early implementation used the same ledger version with a smaller event record.
  // Compare the complete historical projection, including the current verifier's plan-derived trace.
  const legacy = historicalRead && input.implementationSha256 === EARLY_VOICE_IMPLEMENTATION &&
      input.spec.schemaVersion === 'presentation-voice-bindings/1.0'
    ? {...derived.ledger, events: derived.ledger.events.map(({beatId, frame, sample}) => ({beatId, frame, sample}))}
    : undefined;
  const legacyMatches = legacy !== undefined && json(legacy).equals(files.get('voice-manifest.json')!);
  for (const [path, bytes] of derived.files) {
    if (!bytes.equals(files.get(path)!) && !(path === 'voice-manifest.json' && legacyMatches)) {
      fail('Voice derivation differs: ' + path);
    }
  }
  return {task, input, ...derived, files, ledger: legacyMatches ? legacy : derived.ledger,
    ...(legacyMatches && {voiceLedgerProfile: EARLY_VOICE_LEDGER})};
}

export async function bindPresentationVoice(data: string, path: string, signal: AbortSignal, onTask?: (id: string) => void) {
  const spec = VoiceSpec.parse(decode(await boundedFile(resolve(path), 256_000)));
  return bindPresentationVoiceFromSpec(data, spec, signal, onTask);
}

export const voiceDecoderVersions = async (signal: AbortSignal) => Object.fromEntries(await Promise.all(
  [ ['ffmpeg', ffmpegPath()], ['ffprobe', ffprobePath()] ].map(async ([name, executable]) =>
    [name, await command(executable!, ['-version'], {signal, timeout: 10_000})])));
const voiceImplementationSha256 = async () => sha256(canonical(await Promise.all(
  ['src/presentation/narration.ts', 'src/presentation/runtime.ts', 'src/tts/runtime.ts'].map(async path =>
    sha256(await boundedFile(join(projectRoot, path)))))));

async function prepareVoiceInput(spec: VoiceSpec, signal: AbortSignal) {
  return VoiceInput.parse({spec, decoder: await voiceDecoderVersions(signal), implementationSha256: await voiceImplementationSha256()});
}

export async function presentationVoiceId(spec: VoiceSpec, signal: AbortSignal) {
  return fingerprint(VOICE_KIND, await prepareVoiceInput(spec, signal));
}

export async function bindPresentationVoiceFromSpec(data: string, spec: VoiceSpec, signal: AbortSignal, onTask?: (id: string) => void) {
  data = await preflightPresentationState(data);
  const {plan} = await voicePlan(data, spec, signal);
  const input = await prepareVoiceInput(spec, signal);
  const taskId = fingerprint(VOICE_KIND, input);
  onTask?.(taskId);
  const runner = new TaskRunner(data);
  const cancellation = taskCancellation(signal);
  try {
    const task = await runner.run(VOICE_KIND, input, async (directory, workSignal) => {
      const runtime = await createOwnedRuntimeTmp(directory);
      const result = await voiceFiles(data, input, taskId, workSignal,
        (source, index) => decodeClip(source, runtime.directory, index, plan.maxFrames, workSignal));
      if (canonical(await voiceDecoderVersions(workSignal)) !== canonical(input.decoder) ||
          await voiceImplementationSha256() !== input.implementationSha256) fail('Audio toolchain changed during binding.');
      return writeArtifacts(runner, VOICE_KIND, taskId, result.files, workSignal);
    }, cancellation.signal, {attempts: RETRIES, timeoutMs: plan.maxFrames > PRESENTATION_LEGACY_MAX_FRAMES ? 900_000 : 240_000,
      beforeDiscardTemporary: cleanupOwnedRuntimeTmp});
    const result = await checkedVoice(data, taskId, signal);
    return {cached: task.cached, state: 'succeeded', ...result.ledger};
  } finally {cancellation.dispose(); runner.close();}
}

function previewManifest(input: z.infer<typeof PreviewInput> | z.infer<typeof NarratedInput>, id: string, plan: CompiledPresentation,
  samples: number[], movie: Buffer, probe: unknown, captionLines?: CaptionLine[][]) {
  return {kind: input.mode === 'silent' ? PREVIEW_KIND : NARRATED_KIND, taskId: id, ...input, binding: plan.binding,
    proposalHash: plan.proposalHash, planSha256: plan.planSha256, moduleId: plan.moduleId, timeline: plan.timeline, samples,
    ...(plan.moduleId === 'hidden-file-policy/1' ? {scope: plan.scope, language: plan.language} : {}),
    ...(captionLines ? {captionLines} : {}),
    ...(input.renderProfile ? {frameRanges: extendedRanges(plan.timeline.totalFrames)} : {}),
    media: {sha256: sha256(movie), probe, fullDecodeExit: 0}, review: input.mode === 'silent' ? review : voiceReview};
}

async function presentationFont() {
  const font = await boundedFile(join(projectRoot, 'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'), 30_000_000);
  if (sha256(font) !== FONT_SHA) fail('Pinned presentation font differs.');
  return font;
}

function probeWithoutLocation(probe: unknown) {
  if (!probe || typeof probe !== 'object' || !('format' in probe) || !probe.format ||
      typeof probe.format !== 'object' || Array.isArray(probe.format)) {
    return fail('Expected FFprobe format metadata.');
  }
  const format = {...probe.format} as Record<string, unknown>;
  delete format.filename;
  return {...probe, format};
}

async function videoInput(work: string, totalFrames: number, extended: boolean, signal: AbortSignal) {
  const ranges = extended ? extendedRanges(totalFrames) : [[0, totalFrames - 1]];
  let fullRange: boolean | undefined;
  const names = [];
  for (const [index, [first, last]] of ranges.entries()) {
    const name = extended ? 'part-' + index + '.mp4' : 'silent.mp4';
    const path = join(work, name);
    if (extended) {
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink() || !info.size || info.size > MAX_PART_BYTES) fail('Extended video part has invalid size or type.');
    }
    const probe = JSON.parse(await command(ffprobePath(), ['-v', 'error', ...(extended ? ['-count_frames'] : []),
      '-show_streams', '-of', 'json', path], {signal, timeout: 120_000}));
    const stream = probe.streams[0];
    const currentRange = stream?.color_range === 'pc' || String(stream?.pix_fmt).startsWith('yuvj');
    if (extended && (probe.streams.length !== 1 || stream?.codec_type !== 'video' || stream?.codec_name !== 'h264' ||
      stream?.width !== GEOMETRY.width || stream?.height !== GEOMETRY.height || stream?.avg_frame_rate !== PRESENTATION_FPS + '/1' ||
      Number(stream?.nb_read_frames) !== last! - first! + 1 || (fullRange !== undefined && fullRange !== currentRange))) {
      fail('Extended video part differs from its exact frame range.');
    }
    fullRange = currentRange;
    names.push(name);
  }
  if (!extended) return {args: ['-i', join(work, names[0]!)], fullRange};
  const concat = join(work, 'parts.ffconcat');
  await writeFile(concat, 'ffconcat version 1.0\n' + names.map(name => 'file ' + name + '\n').join(''), {flag: 'wx'});
  return {args: ['-protocol_whitelist', 'file', '-f', 'concat', '-safe', '1', '-i', concat], fullRange};
}

export async function renderPresentation(data: string, planTaskId: string, signal: AbortSignal, onTask?: (id: string) => void,
  voiceTaskId?: string, resumeTaskId?: string, visualLocaleProfile?: VisualLocaleProfile) {
  checkAbort(signal);
  data = await preflightPresentationState(data);
  const plan = await checkedPlan(data, planTaskId, signal);
  if (plan.compiled.moduleId === 'concurrency-queue/1' && !plan.compiled.endingTitle) requireQueueMigration();
  const hidden = plan.compiled.moduleId === 'hidden-file-policy/1' ? plan.compiled : null;
  if (hidden && (!!voiceTaskId !== !!(plan.hiddenVoicePreparationTaskId || plan.portableVoiceImportHash) || (voiceTaskId && visualLocaleProfile !== ZH_VISUAL_PROFILE))) {
    throw new EngineError('VOICE_PARENT', 'Select the mode and Chinese visual profile bound to this hidden-file plan.');
  }
  const voice = voiceTaskId === undefined ? undefined : await checkedVoice(data, voiceTaskId, signal);
  if (voice && voice.input.spec.planTaskId !== planTaskId) throw new EngineError('VOICE_PARENT', 'Bind the voice to this exact plan task.');
  const font = await presentationFont();
  if (hidden?.language === 'zh-CN' && !voice) checkZhVisualText(font, hidden);
  const fileLayout = hidden ? hiddenFileLayout(font, hidden, !!voice, !!voice) : undefined;
  if (visualLocaleProfile !== undefined) {
    if (!voice || visualLocaleProfile !== ZH_VISUAL_PROFILE) {
      throw new EngineError('PRESENTATION_VISUAL_LOCALE', 'The Chinese visual profile requires a narrated presentation.');
    }
    if (!hidden) checkZhVisualText(font, plan.compiled);
  }
  const captionLines = voice && layoutCaptions(font, voice.captionCues.map(cue => cue.transcript));
  const env = await environment();
  const extended = plan.compiled.timeline.totalFrames > PRESENTATION_LEGACY_MAX_FRAMES;
  const rendererSha256 = async () => sha256(canonical(await Promise.all([
    'src/presentation/composition.tsx', 'src/presentation/queue-composition.tsx', 'src/presentation/queue-frame.ts',
    'src/short-segment/worker.ts', 'src/presentation/runtime.ts', 'src/presentation/duration.ts',
    ...(hidden ? ['src/presentation/hidden-file-composition.tsx', 'src/presentation/hidden-file-policy.ts',
      'src/presentation/hidden-file-layout.ts', 'src/presentation/caption-layout.ts',
      'src/presentation/visual-locale.ts', 'src/presentation/visual-locale-check.ts'] : []),
  ].map(async path => sha256(await boundedFile(join(projectRoot, path)))))));
  const moduleRenderer = hidden || plan.compiled.moduleId === 'concurrency-queue/1' ? await rendererSha256() : undefined;
  const base = {planTaskId, planManifestSha256: sha256(plan.files.get('plan-manifest.json')!), fontSha256: FONT_SHA, environment: env,
    mediaMetadataProfile: MEDIA_METADATA_PROFILE,
    ...(extended ? {renderProfile: EXTENDED_RENDER_PROFILE} : {}),
    ...(moduleRenderer ? {rendererSha256: moduleRenderer} : {}),
    ...(hidden ? {capabilityProfile: hidden.capabilityProfile} : {}),
    ...(fileLayout ? {hiddenFileLayoutProfile: voice ? HIDDEN_FILE_NARRATED_LAYOUT : HIDDEN_FILE_MOBILE_LAYOUT,
      hiddenFileLayoutSha256: sha256(canonical(fileLayout))} : {})};
  const input = voice ? NarratedInput.parse({...base, mode: 'narrated', voiceTaskId,
    voiceManifestSha256: sha256(voice.files.get('voice-manifest.json')!),
    captionLayoutProfile: CAPTION_LAYOUT_PROFILE, ...(visualLocaleProfile && {visualLocaleProfile})}) :
    PreviewInput.parse({...base, mode: 'silent'});
  const kind = voice ? NARRATED_KIND : PREVIEW_KIND;
  const taskId = fingerprint(kind, input);
  if (resumeTaskId !== undefined && taskId !== resumeTaskId) {
    throw new EngineError('PRESENTATION_RESUME_INPUT', 'The current renderer or inputs differ from the recorded task. Repeat render explicitly to create a new task.');
  }
  const samples = sampleFrames(plan.compiled, voice?.captionCues, extended);
  checkAbort(signal);
  onTask?.(taskId);
  const runner = new TaskRunner(data);
  const cancellation = taskCancellation(signal);
  try {
    const task = await runner.run(kind, input, async (directory, workSignal) => {
      const runtime = await createOwnedRuntimeTmp(directory);
      const work = runtime.directory;
      if (extended) await requireExtendedDisk(work, data);
      await mkdir(join(work, 'public'));
      await writeFile(join(work, 'public', 'font.ttf'), font, {flag: 'wx'});
      const workerInput = join(work, 'input.json');
      await writeFile(workerInput, json({entry: join(projectRoot, 'src/presentation/composition.tsx'), browser: env.browser,
        props: {...plan.compiled, ...(fileLayout && {hiddenFileLayout: fileLayout}),
          ...(voice && {...(visualLocaleProfile && {visualLocaleProfile}),
            cues: voice.captionCues.map(({startFrame, endFrame, transcript}, index) =>
              ({startFrame, endFrame, transcript, lines: captionLines![index]}))})},
        sampleFrames: samples, geometry: {...GEOMETRY, fps: plan.compiled.timeline.fps},
        ...(extended ? {renderProfile: EXTENDED_RENDER_PROFILE} : {})}), {flag: 'wx'});
      await command(process.execPath, ['--import', 'tsx', join(projectRoot, 'src/short-segment/worker.ts'), workerInput], {
        signal: workSignal, timeout: extended ? EXTENDED_WORKER_DEADLINE + 60_000 : 660_000, cwd: projectRoot, env: {TEMP: work, TMP: work, TMPDIR: work},
      });
      const movie = join(work, 'preview.mp4');
      const {args: videoArgs, fullRange} = await videoInput(work, plan.compiled.timeline.totalFrames, extended, workSignal);
      const pcmPath = join(work, 'narration.pcm');
      if (voice) await writeFile(pcmPath, voice.files.get('narration.pcm')!, {flag: 'wx'});
      const filter = fullRange ? 'scale=in_range=pc:out_range=tv,format=yuv420p' : 'format=yuv420p';
      const timeout = extended ? EXTENDED_VERIFY_DEADLINE : 120_000;
      await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-n', ...videoArgs,
        ...(voice ? ['-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', pcmPath] : []), '-map', '0:v:0', '-vf',
        extended ? filter + ',setpts=N/(' + PRESENTATION_FPS + '*TB)' : filter,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-color_range', 'tv',
        ...(extended ? ['-fps_mode', 'passthrough', '-maxrate', '1700k', '-bufsize', '3400k', '-fs', String(MAX_MOVIE_BYTES)] : []),
        ...(voice ? ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '128k'] : []), '-movflags', '+faststart', movie],
      {signal: workSignal, timeout});
      const probe = await verifyMovie(movie, {mode: input.mode, timeline: plan.compiled.timeline}, workSignal, timeout);
      if (canonical(await environment()) !== canonical(env) || (moduleRenderer && moduleRenderer !== await rendererSha256())) {
        fail('Renderer environment or implementation changed during presentation.');
      }
      const video = await boundedFile(movie, MAX_MOVIE_BYTES);
      const files = new Map<string, Buffer>([['preview.mp4', video],
        ['captions.vtt', voice ? voice.files.get('captions.vtt')! : captions(plan.compiled)]]);
      for (const frame of samples) files.set('samples/' + frame + '.png', await boundedFile(join(work, 'samples', frame + '.png'), MAX_SAMPLE_BYTES));
      files.set('preview-manifest.json', json(previewManifest(input, taskId, plan.compiled, samples, video, probeWithoutLocation(probe), captionLines)));
      return writeArtifacts(runner, kind, taskId, files, workSignal);
    }, cancellation.signal, {attempts: RETRIES, timeoutMs: extended ? 3_000_000 : 900_000, beforeDiscardTemporary: cleanupOwnedRuntimeTmp,
      accounting: {provider: 'remotion-local', ratePolicy: 'local-zero-v1'}});
    await readPresentation(data, taskId, voice ? 'narrated' : 'preview', signal);
    return {taskId, planTaskId, cached: task.cached, state: 'succeeded', mode: input.mode, review: voice ? voiceReview : review};
  } finally {cancellation.dispose(); runner.close();}
}

type PresentationKind = 'plan' | 'preview' | 'voice' | 'narrated';
const presentationKinds = {plan: PLAN_KIND, preview: PREVIEW_KIND, voice: VOICE_KIND, narrated: NARRATED_KIND} as const;
const presentationInputs = {plan: PlanInput, preview: PreviewInput, voice: VoiceInput, narrated: NarratedInput};
async function presentationTask(data: string, id: string, requested: PresentationKind | undefined, signal: AbortSignal) {
  checkAbort(signal);
  if (!Hash.safeParse(id).success) throw new EngineError('PRESENTATION_TASK_ID', 'Use a 64-character lowercase hexadecimal task ID.');
  const task = await readTask(data, id, null);
  const kind = (Object.keys(presentationKinds) as PresentationKind[]).find(key => presentationKinds[key] === task.kind);
  if (!kind || (requested !== undefined && requested !== kind)) {
    throw new EngineError('PRESENTATION_TASK_KIND', kind ?
      'This is a ' + kind + ' task. Omit --kind or use --kind ' + kind + '.' : 'This task does not belong to presentation.');
  }
  if (!presentationInputs[kind].safeParse(task.input).success) fail('Persisted presentation input does not match its task kind.');
  return {task, kind};
}

export async function readPresentation(data: string, id: string, requested: PresentationKind | undefined, signal: AbortSignal) {
  const {task, kind} = await presentationTask(data, id, requested, signal);
  const statusReview = kind === 'narrated' || kind === 'voice' ? voiceReview : review;
  if (task.state !== 'succeeded') {
    const expired = task.state === 'running' && task.leaseUntil <= Date.now();
    return {status: {taskId: id, kind, state: expired ? 'interrupted' : task.state, attempt: task.attempt,
      retryable: task.attempt < RETRIES && (expired || (task.state !== 'running' && task.error?.classification !== 'permanent')),
      error: task.error, review: statusReview}};
  }
  if (kind === 'plan') {
    const plan = await checkedPlan(data, id, signal);
    return {files: plan.files, status: {taskId: id, kind, state: task.state, attempt: task.attempt, integrity: 'verified',
      binding: plan.compiled.binding, proposalHash: plan.compiled.proposalHash, planSha256: plan.compiled.planSha256,
      moduleId: plan.compiled.moduleId, timeline: plan.compiled.timeline, review}};
  }
  if (kind === 'voice') {
    const voice = await checkedVoice(data, id, signal, true);
    return {files: new Map([...voice.files, ...voice.sourceFiles]), status: {taskId: id, kind, state: task.state,
      attempt: task.attempt, integrity: 'verified', ledger: voice.ledger, review: statusReview},
      ...(voice.voiceLedgerProfile && {voiceLedgerProfile: voice.voiceLedgerProfile})};
  }
  const input = kind === 'narrated' ? NarratedInput.parse(task.input) : PreviewInput.parse(task.input);
  const plan = await checkedPlan(data, input.planTaskId, signal);
  if (sha256(plan.files.get('plan-manifest.json')!) !== input.planManifestSha256) fail('Preview parent plan manifest differs.');
  const hidden = plan.compiled.moduleId === 'hidden-file-policy/1' ? plan.compiled : null;
  if ((!!hidden || plan.compiled.moduleId === 'concurrency-queue/1') !== !!input.rendererSha256 ||
      input.capabilityProfile !== hidden?.capabilityProfile || (hidden && (input.mode === 'narrated') !== !!(plan.hiddenVoicePreparationTaskId || plan.portableVoiceImportHash))) {
    fail('Preview renderer fingerprint or capability differs from its module.');
  }
  if (hidden?.language === 'zh-CN' && input.mode === 'silent') checkZhVisualText(await presentationFont(), hidden);
  const hiddenNarrated = !!hidden && input.mode === 'narrated';
  if (input.mode === 'narrated' && hiddenNarrated && input.visualLocaleProfile !== ZH_VISUAL_PROFILE) {
    fail('Hidden narration requires the Chinese visual profile.');
  }
  if (hiddenNarrated || input.hiddenFileLayoutProfile || input.hiddenFileLayoutSha256) {
    const currentNarratedLayout = input.hiddenFileLayoutProfile === HIDDEN_FILE_NARRATED_LAYOUT;
    const validProfile = hiddenNarrated
      ? currentNarratedLayout || input.hiddenFileLayoutProfile === LEGACY_HIDDEN_FILE_NARRATED_LAYOUT
      : input.hiddenFileLayoutProfile === HIDDEN_FILE_MOBILE_LAYOUT;
    if (!hidden || !validProfile ||
        input.hiddenFileLayoutSha256 !== sha256(canonical(hiddenFileLayout(await presentationFont(), hidden, hiddenNarrated, currentNarratedLayout)))) {
      fail('Preview mobile layout differs from the bound hidden-file presentation.');
    }
  }
  const voice = input.mode === 'narrated' ? await checkedVoice(data, input.voiceTaskId, signal, true) : undefined;
  if (input.mode === 'narrated' && (voice!.input.spec.planTaskId !== input.planTaskId ||
      sha256(voice!.files.get('voice-manifest.json')!) !== input.voiceManifestSha256)) fail('Preview voice binding differs.');
  if (input.mode === 'narrated' && input.visualLocaleProfile) {
    if (!input.captionLayoutProfile) fail('The localized preview requires the pinned caption layout.');
    if (!hidden) checkZhVisualText(await presentationFont(), plan.compiled);
  }
  const captionLines = input.mode === 'narrated' && input.captionLayoutProfile ?
    layoutCaptions(await presentationFont(), voice!.captionCues.map(cue => cue.transcript)) : undefined;
  const extended = plan.compiled.timeline.totalFrames > PRESENTATION_LEGACY_MAX_FRAMES;
  if (extended !== (input.renderProfile === EXTENDED_RENDER_PROFILE)) fail('Preview duration profile differs from its parent.');
  const samples = sampleFrames(plan.compiled, voice?.captionCues, extended);
  const files = await readArtifacts(data, task, ['preview.mp4', 'captions.vtt', 'preview-manifest.json', ...samples.map(frame => `samples/${frame}.png`)], signal);
  const manifest = decode(files.get('preview-manifest.json')!);
  const probe = manifest.media?.probe, stream = probe?.streams?.[0], audio = probe?.streams?.[1];
  if (input.mediaMetadataProfile && (!probe?.format || typeof probe.format !== 'object' ||
      Array.isArray(probe.format) || Object.hasOwn(probe.format, 'filename'))) {
    fail('Location-free preview metadata cannot contain a file name and requires a format record.');
  }
  if (probe?.streams?.length !== (voice ? 2 : 1) || stream?.codec_type !== 'video' || stream?.codec_name !== 'h264' || stream?.pix_fmt !== 'yuv420p' ||
      stream?.width !== GEOMETRY.width || stream?.height !== GEOMETRY.height || stream?.avg_frame_rate !== plan.compiled.timeline.fps + '/1' ||
      Number(stream?.nb_read_frames) !== plan.compiled.timeline.totalFrames ||
      (voice && (audio?.codec_type !== 'audio' || audio?.codec_name !== 'aac' || audio?.sample_rate !== String(RATE) ||
        audio?.channels !== 1 || !Number.isFinite(Number(audio.duration)) ||
        Math.abs(Number(audio.duration) - plan.compiled.timeline.totalFrames / plan.compiled.timeline.fps) > .01)) ||
      !json(previewManifest(input, id, plan.compiled, samples, files.get('preview.mp4')!, probe, captionLines)).equals(files.get('preview-manifest.json')!) ||
      !(voice ? voice.files.get('captions.vtt')! : captions(plan.compiled)).equals(files.get('captions.vtt')!)) fail('Preview media, captions or parent binding differs.');
  for (const [path, bytes] of plan.files) files.set('editable/' + path, bytes);
  if (voice) for (const [path, bytes] of [...voice.files, ...voice.sourceFiles]) files.set('voice/' + path, bytes);
  return {files, status: {taskId: id, kind, planTaskId: input.planTaskId, state: task.state, attempt: task.attempt, integrity: 'verified',
    binding: plan.compiled.binding, proposalHash: plan.compiled.proposalHash, planSha256: plan.compiled.planSha256,
    moduleId: plan.compiled.moduleId, timeline: plan.compiled.timeline, review: statusReview},
    ...(voice?.voiceLedgerProfile && {voiceLedgerProfile: voice.voiceLedgerProfile})};
}

export async function resumePresentation(data: string, id: string, requested: PresentationKind | undefined, signal: AbortSignal,
  onTask?: (id: string) => void) {
  const {task, kind} = await presentationTask(data, id, requested, signal);
  if (kind !== 'preview' && kind !== 'narrated') {
    throw new EngineError('PRESENTATION_RESUME_KIND', 'Resume accepts a preview or narrated render task. For plan or voice tasks, repeat the original command.');
  }
  if (task.state === 'succeeded') {
    const result = await readPresentation(data, id, kind, signal);
    return {...result.status, cached: true, ...('voiceLedgerProfile' in result && {voiceLedgerProfile: result.voiceLedgerProfile})};
  }
  const input = kind === 'narrated' ? NarratedInput.parse(task.input) : PreviewInput.parse(task.input);
  if (!input.mediaMetadataProfile) {
    throw new EngineError('PRESENTATION_RESUME_INPUT', 'This unfinished preview uses historical media metadata. Repeat render explicitly to create a new task.');
  }
  if (input.mode === 'narrated' && !input.captionLayoutProfile) {
    throw new EngineError('PRESENTATION_RESUME_INPUT', 'This unfinished preview uses historical caption layout. Repeat render explicitly to create a new task.');
  }
  return renderPresentation(data, input.planTaskId, signal, onTask, input.mode === 'narrated' ? input.voiceTaskId : undefined,
    id, input.mode === 'narrated' ? input.visualLocaleProfile : undefined);
}

export async function exportPresentation(data: string, id: string, kind: PresentationKind | undefined, output: string, signal: AbortSignal) {
  const result = await readPresentation(data, id, kind, signal);
  if (!result.files) throw new EngineError('PRESENTATION_NOT_READY', 'Presentation task has no successful output to export.');
  return publishAssetFiles(data, id, output, result.files, signal, RECEIPT_PUBLICATION);
}
