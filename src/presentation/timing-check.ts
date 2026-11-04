import {resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {PRESENTATION_MAX_FRAMES} from '../contracts/presentation.js';
import {Hash, Id} from '../contracts/video.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {publishAssetFiles, RECEIPT_PUBLICATION} from '../story-planner/asset-pack.js';
import {boundedFile, readTask} from '../story-planner/runtime.js';
import type {CompiledLegacy, CompiledPresentation} from './compile.js';
import {httpResponseArrived, imageResultPanels, presentationFrame} from './frame-state.js';
import {preflightPresentationState, readPresentation, taskCancellation} from './runtime.js';

export const TIMING_CHECK_KIND = 'repository-presentation-timing-check-v1';
const PROFILE = 'presentation-rendered-state/1';
const MAX_SPEC_BYTES = 32_000;
const MAX_REPORT_BYTES = 128_000;
const RETRIES = 3;
const json = (value: unknown) => Buffer.from(canonical(value));
const parse = (bytes: Buffer) => JSON.parse(new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes));
const fail = (code: string, message: string): never => {throw new EngineError('PRESENTATION_TIMING_' + code, message);};
const Ref = z.strictObject({beatId: Id, indexInBeat: z.number().int().min(0).max(39), sha256: Hash});
const State = z.enum(['image-cutout-full', 'image-mask-full', 'image-comparison-full', 'http-response-arrived']);
const Spec = z.strictObject({
  schemaVersion: z.literal('presentation-visual-cues/1.0'),
  planTaskId: Hash, planManifestSha256: Hash, traceSha256: Hash, voiceTaskId: Hash, voiceManifestSha256: Hash,
  checks: z.array(z.strictObject({id: Id, cue: Ref, event: Ref, state: State,
    minContinuousFrames: z.number().int().min(1).max(PRESENTATION_MAX_FRAMES)})).min(1).max(32),
});
const Input = z.strictObject({profile: z.literal(PROFILE), specText: z.string().min(1).max(MAX_SPEC_BYTES)});
type Input = z.infer<typeof Input>;
type Spec = z.infer<typeof Spec>;
type State = z.infer<typeof State>;
type Interval = {startFrame: number; endFrame: number};
const FrameIndex = z.number().int().min(0).max(PRESENTATION_MAX_FRAMES);
const SourceCue = z.object({beatId: Id, startFrame: FrameIndex, endFrame: FrameIndex}).passthrough();
const VoiceParent = z.object({spec: z.object({planTaskId: Hash, planManifestSha256: Hash})});
const CueLedger = z.discriminatedUnion('schemaVersion', [
  VoiceParent.extend({schemaVersion: z.literal('presentation-voice-ledger/1.0'), cues: z.array(SourceCue).max(20)}),
  VoiceParent.extend({schemaVersion: z.literal('presentation-voice-ledger/1.1'), captionCues: z.array(SourceCue).max(800)}),
]);
const target = {
  'image-cutout-full': {module: 'image-output-choice/1', event: 'show-cutout', forms: ['cutout']},
  'image-mask-full': {module: 'image-output-choice/1', event: 'show-mask', forms: ['mask']},
  'image-comparison-full': {module: 'image-output-choice/1', event: 'compare', forms: ['cutout', 'mask']},
  'http-response-arrived': {module: 'http-exchange/1', event: 'respond', forms: []},
} as const;

function specFrom(input: Input) {
  const bytes = Buffer.from(input.specText);
  if (bytes.length > MAX_SPEC_BYTES) return fail('SPEC', 'Timing specification exceeds its byte limit.');
  let value: unknown;
  try {value = parse(bytes);} catch {return fail('SPEC', 'Expected valid UTF-8 JSON timing specification.');}
  const result = Spec.safeParse(value);
  if (!result.success) return fail('SPEC', 'Expected a strict presentation-visual-cues/1.0 specification with supported states and bounded checks.');
  return result.data;
}

function visibleIntervals(plan: CompiledLegacy, state: State, eventIndex: number, signal: AbortSignal) {
  const expected = target[state];
  const event = plan.trace[eventIndex]!;
  if (plan.moduleId !== expected.module || event.kind !== expected.event) {
    return fail('STATE', 'Selected visual state does not apply to the exact module and event.');
  }
  const end = plan.trace[eventIndex + 1]?.frame ?? plan.timeline.totalFrames;
  const intervals: Interval[] = [];
  let start: number | undefined;
  for (let index = event.frame; index < end; index++) {
    checkAbort(signal);
    const frame = presentationFrame(plan, index);
    const panels = imageResultPanels(frame);
    const visible = state === 'http-response-arrived' ? httpResponseArrived(frame) :
      panels.opacity === 1 && panels.forms.length === expected.forms.length &&
        expected.forms.every((form, formIndex) => form === panels.forms[formIndex]);
    if (visible) start ??= index;
    else if (start !== undefined) {
      intervals.push({startFrame: start, endFrame: index});
      start = undefined;
    }
  }
  if (start !== undefined) intervals.push({startFrame: start, endFrame: end});
  return intervals;
}

function longestOverlap(cue: Interval, visual: Interval[]) {
  let best: Interval | null = null;
  let frames = 0;
  for (const interval of visual) {
    const startFrame = Math.max(cue.startFrame, interval.startFrame);
    const endFrame = Math.min(cue.endFrame, interval.endFrame);
    if (endFrame - startFrame > frames) {
      frames = endFrame - startFrame;
      best = {startFrame, endFrame};
    }
  }
  return {frames, interval: best};
}

async function derive(data: string, input: Input, spec: Spec, taskId: string, signal: AbortSignal) {
  const plan = await readPresentation(data, spec.planTaskId, 'plan', signal);
  const voice = await readPresentation(data, spec.voiceTaskId, 'voice', signal);
  if (!plan.files || !voice.files) return fail('PARENT', 'Timing check requires completed and verified plan and voice tasks.');
  const planManifest = plan.files.get('plan-manifest.json')!;
  const voiceManifest = voice.files.get('voice-manifest.json')!;
  const trace = plan.files.get('trace.json')!;
  if (sha256(planManifest) !== spec.planManifestSha256 || sha256(voiceManifest) !== spec.voiceManifestSha256 ||
      sha256(trace) !== spec.traceSha256) return fail('PARENT', 'Plan, voice or trace digest differs.');
  const ledger = CueLedger.parse(parse(voiceManifest));
  if (ledger.spec.planTaskId !== spec.planTaskId || ledger.spec.planManifestSha256 !== spec.planManifestSha256) {
    return fail('PARENT', 'Voice binds a different plan.');
  }
  const compiled = parse(trace) as CompiledPresentation;
  if (compiled.moduleId === 'concurrency-queue/1') return fail('STATE', 'This profile supports HTTP exchange and image output choice only.');
  const cues = ledger.schemaVersion === 'presentation-voice-ledger/1.0' ? ledger.cues : ledger.captionCues;
  const ids = new Set<string>();
  const relationships = new Set<string>();
  const checkedCues = new Set<string>();
  const visualCache = new Map<string, Interval[]>();
  const checks = spec.checks.map(({id, cue, event, state, minContinuousFrames}) => {
    const cueKey = cue.beatId + '/' + cue.indexInBeat;
    const eventKey = event.beatId + '/' + event.indexInBeat;
    const visualKey = eventKey + '/' + state;
    const relation = cueKey + '/' + visualKey;
    if (ids.has(id) || relationships.has(relation)) return fail('SPEC', 'Duplicate check ID or cue/event/state relationship.');
    ids.add(id);
    relationships.add(relation);
    const sourceCue = cues.filter(row => row.beatId === cue.beatId)[cue.indexInBeat];
    const sourceEvent = compiled.trace.filter(row => row.beatId === event.beatId)[event.indexInBeat];
    if (!sourceCue || !sourceEvent || sha256(canonical(sourceCue)) !== cue.sha256 ||
        sha256(canonical(sourceEvent)) !== event.sha256) {
      return fail('REFERENCE', 'Cue or event reference is absent or differs from its exact digest: ' + id);
    }
    checkedCues.add(cueKey);
    let visual = visualCache.get(visualKey);
    if (!visual) {
      visual = visibleIntervals(compiled, state, compiled.trace.indexOf(sourceEvent), signal);
      visualCache.set(visualKey, visual);
    }
    const cueInterval = {startFrame: sourceCue.startFrame, endFrame: sourceCue.endFrame};
    const overlap = longestOverlap(cueInterval, visual);
    return {id, cue, event: {...event, kind: sourceEvent.kind, frame: sourceEvent.frame}, state,
      minContinuousFrames, cueInterval, visualIntervals: visual, longestOverlap: overlap,
      verdict: overlap.frames >= minContinuousFrames ? 'passed' as const : 'failed' as const};
  });
  const report = {
    schemaVersion: 'presentation-timing-report/1.0', taskId, profile: input.profile, specSha256: sha256(input.specText),
    planTaskId: spec.planTaskId, planManifestSha256: spec.planManifestSha256, traceSha256: spec.traceSha256,
    voiceTaskId: spec.voiceTaskId, voiceManifestSha256: spec.voiceManifestSha256, moduleId: compiled.moduleId,
    timeline: compiled.timeline, intervalConvention: 'half-open-frames', relationshipSource: 'caller-declared',
    declaredTemporalChecks: checks.every(check => check.verdict === 'passed') ? 'passed' as const : 'failed' as const,
    uncheckedCueCount: cues.length - checkedCues.size, undeclaredRelationships: 'unchecked', speechAlignment: 'unverified', checks,
  } as const;
  return {report, parents: new Map([['trace.json', trace], ['plan-manifest.json', planManifest], ['voice-manifest.json', voiceManifest]])};
}

async function checked(data: string, id: string, signal: AbortSignal) {
  checkAbort(signal);
  if (!Hash.safeParse(id).success) return fail('TASK', 'Expected a lowercase hexadecimal timing-check task ID.');
  const task = await readTask(data, id, TIMING_CHECK_KIND);
  const input = Input.parse(task.input);
  const spec = specFrom(input);
  if (task.state !== 'succeeded') return {status: {taskId: id, state: task.state, attempt: task.attempt,
    declaredTemporalChecks: 'unchecked' as const, error: task.error}};
  if (!task.result || task.result.inputFingerprint !== id || task.result.mediaType !== 'application/json' ||
      task.result.producingStage !== 'PUBLISH' || task.outputs.length !== 0 || task.result.bytes > MAX_REPORT_BYTES) {
    return fail('INTEGRITY', 'Timing report does not match its task artifact closure.');
  }
  const store = new ArtifactStore(data);
  await store.verify(task.result);
  const bytes = await boundedFile(store.path(task.result), MAX_REPORT_BYTES);
  const {report, parents} = await derive(data, input, spec, id, signal);
  if (!json(report).equals(bytes)) return fail('INTEGRITY', 'Timing report differs from its verified derivation.');
  return {status: {taskId: id, state: 'succeeded' as const, attempt: task.attempt, integrity: 'verified' as const,
    declaredTemporalChecks: report.declaredTemporalChecks, report},
    files: new Map([['timing-report.json', bytes], ['timing-spec.json', Buffer.from(input.specText)], ...parents])};
}

export async function checkPresentationTiming(data: string, path: string, signal: AbortSignal, onTask?: (id: string) => void) {
  checkAbort(signal);
  const bytes = await boundedFile(resolve(path), MAX_SPEC_BYTES);
  let specText: string;
  try {specText = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);} catch {
    return fail('SPEC', 'Expected valid UTF-8 timing specification.');
  }
  const input = Input.parse({profile: PROFILE, specText});
  const spec = specFrom(input);
  data = await preflightPresentationState(data);
  const id = sha256(canonical({version: 'production-task-v1', kind: TIMING_CHECK_KIND, input}));
  const {report} = await derive(data, input, spec, id, signal);
  if (json(report).length > MAX_REPORT_BYTES) return fail('LIMIT', 'Derived timing report exceeds its byte limit.');
  checkAbort(signal);
  onTask?.(id);
  const runner = new TaskRunner(data);
  const cancellation = taskCancellation(signal);
  try {
    if (runner.get(id)?.state === 'succeeded') await checked(data, id, signal);
    const result = await runner.run(TIMING_CHECK_KIND, input, async () => ({value: report, outputs: []}),
      cancellation.signal, {attempts: RETRIES, timeoutMs: 60_000});
    const committed = await checked(data, id, signal);
    return {...committed.status, cached: result.cached};
  } finally {cancellation.dispose(); runner.close();}
}

export async function statusPresentationTiming(data: string, id: string, signal: AbortSignal) {
  return (await checked(data, id, signal)).status;
}

export async function exportPresentationTiming(data: string, id: string, out: string, signal: AbortSignal) {
  const result = await checked(data, id, signal);
  if (!result.files) return fail('NOT_READY', 'Timing check has no committed report to export.');
  return {...await publishAssetFiles(data, id, out, result.files, signal, RECEIPT_PUBLICATION),
    declaredTemporalChecks: result.status.declaredTemporalChecks};
}
