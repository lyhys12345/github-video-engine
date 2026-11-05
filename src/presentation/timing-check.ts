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
import type {CompiledQueue} from './concurrency-queue.js';
import {httpResponseArrived, imageResultPanels, presentationFrame} from './frame-state.js';
import {queueCardAtRest, queueEventAffectsCard, queueEventSubjects, queueFrame} from './queue-frame.js';
import {preflightPresentationState, readPresentation, taskCancellation} from './runtime.js';

export const TIMING_CHECK_KIND = 'repository-presentation-timing-check-v1';
const LEGACY_PROFILE = 'presentation-rendered-state/1';
const HISTORICAL_QUEUE_PROFILE = 'presentation-rendered-state/2';
const QUEUE_PROFILE = 'presentation-rendered-state/3';
const MAX_SPEC_BYTES = 32_000;
const MAX_REPORT_BYTES = 128_000;
const RETRIES = 3;
const json = (value: unknown) => Buffer.from(canonical(value));
const parse = (bytes: Buffer) => JSON.parse(new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes));
const fail = (code: string, message: string): never => {throw new EngineError('PRESENTATION_TIMING_' + code, message);};
const Ref = z.strictObject({beatId: Id, indexInBeat: z.number().int().min(0).max(39), sha256: Hash});
const State = z.enum(['image-cutout-full', 'image-mask-full', 'image-comparison-full', 'http-response-arrived']);
const QueueState = z.enum(['queue-waiting-rest', 'queue-running-rest', 'queue-fulfilled-rest', 'queue-rejected-rest']);
const Check = z.strictObject({id: Id, cue: Ref, event: Ref,
  minContinuousFrames: z.number().int().min(1).max(PRESENTATION_MAX_FRAMES)});
const QueueCheck = Check.extend({state: QueueState, subject: z.strictObject({id: Id, sha256: Hash})});
const Parents = z.strictObject({
  planTaskId: Hash, planManifestSha256: Hash, traceSha256: Hash, voiceTaskId: Hash, voiceManifestSha256: Hash,
});
const Spec = z.discriminatedUnion('schemaVersion', [
  Parents.extend({schemaVersion: z.literal('presentation-visual-cues/1.0'),
    checks: z.array(Check.extend({state: State})).min(1).max(32)}),
  Parents.extend({schemaVersion: z.literal('presentation-visual-cues/1.1'), checks: z.array(QueueCheck).min(1).max(32)}),
]);
const Input = z.strictObject({profile: z.enum([LEGACY_PROFILE, HISTORICAL_QUEUE_PROFILE, QUEUE_PROFILE]),
  specText: z.string().min(1).max(MAX_SPEC_BYTES)});
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

const profileFor = (spec: Spec) => spec.schemaVersion === 'presentation-visual-cues/1.1' ? QUEUE_PROFILE : LEGACY_PROFILE;

function parseSpec(specText: string) {
  const bytes = Buffer.from(specText);
  if (bytes.length > MAX_SPEC_BYTES) return fail('SPEC', 'Timing specification exceeds its byte limit.');
  let value: unknown;
  try {value = parse(bytes);} catch {return fail('SPEC', 'Expected valid UTF-8 JSON timing specification.');}
  const result = Spec.safeParse(value);
  if (!result.success) return fail('SPEC', 'Expected a strict presentation-visual-cues/1.0 or 1.1 specification with supported states and bounded checks.');
  return result.data;
}

function visibleIntervals(window: Interval, visibleAt: (frame: number) => boolean, signal: AbortSignal) {
  const intervals: Interval[] = [];
  let start: number | undefined;
  for (let index = window.startFrame; index < window.endFrame; index++) {
    checkAbort(signal);
    if (visibleAt(index)) start ??= index;
    else if (start !== undefined) {
      intervals.push({startFrame: start, endFrame: index});
      start = undefined;
    }
  }
  if (start !== undefined) intervals.push({startFrame: start, endFrame: window.endFrame});
  return intervals;
}

function legacyIntervals(plan: CompiledLegacy, state: State, eventIndex: number, signal: AbortSignal) {
  const expected = target[state];
  const event = plan.trace[eventIndex]!;
  if (plan.moduleId !== expected.module || event.kind !== expected.event) {
    return fail('STATE', 'Selected visual state does not apply to the exact module and event.');
  }
  return visibleIntervals({startFrame: event.frame, endFrame: plan.trace[eventIndex + 1]?.frame ?? plan.timeline.totalFrames}, index => {
    const frame = presentationFrame(plan, index);
    if (state === 'http-response-arrived') return httpResponseArrived(frame);
    const panels = imageResultPanels(frame);
    return panels.opacity === 1 && panels.forms.length === expected.forms.length &&
      expected.forms.every((form, formIndex) => form === panels.forms[formIndex]);
  }, signal);
}

function queueIntervals(plan: CompiledQueue, check: z.infer<typeof QueueCheck>, eventIndex: number,
  frames: Map<number, ReturnType<typeof queueFrame>>, signal: AbortSignal) {
  const {subject, state} = check;
  const anchor = plan.trace[eventIndex]!;
  const event = anchor.event;
  const task = plan.tasks.find(row => row.id === subject.id);
  if (!task || sha256(canonical(task)) !== subject.sha256 || !queueEventSubjects(event).includes(subject.id)) {
    return fail('REFERENCE', 'Queue subject digest or exact event ownership differs: ' + check.id);
  }
  const expected = event.kind === 'enqueue' ? 'queue-waiting-rest' : event.kind === 'start' ? 'queue-running-rest' :
    event.outcome === 'fulfilled' ? 'queue-fulfilled-rest' : 'queue-rejected-rest';
  if (state !== expected) return fail('STATE', 'Queue state does not match the selected event and outcome: ' + check.id);
  const interruption = plan.trace.slice(eventIndex + 1).find(row => queueEventAffectsCard(row, subject.id));
  const window = {startFrame: anchor.frame, endFrame: interruption?.frame ?? plan.timeline.totalFrames};
  const intervals = visibleIntervals(window, index => {
    let frame = frames.get(index);
    if (!frame) {
      frame = queueFrame(plan, index);
      frames.set(index, frame);
    }
    return queueCardAtRest(frame, subject.id, event);
  }, signal);
  return {intervals, queue: {subject, window,
    interruption: interruption ? {beatId: interruption.beatId, frame: interruption.frame, kind: interruption.kind,
      sha256: sha256(canonical(interruption))} : null}};
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
  if ('moduleId' in plan.status && plan.status.moduleId === 'hidden-file-policy/1') {
    return fail('STATE', 'Hidden-file policy does not support presentation timing checks.');
  }
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
  const queue = spec.schemaVersion === 'presentation-visual-cues/1.1';
  if (queue ? compiled.moduleId !== 'concurrency-queue/1' || parse(plan.files.get('presentation.json')!).schemaVersion !== '1.3' :
      compiled.moduleId === 'concurrency-queue/1') {
    return fail('STATE', 'Queue checks require a queue plan 1.3. HTTP and image checks use specification 1.0.');
  }
  const cues = ledger.schemaVersion === 'presentation-voice-ledger/1.0' ? ledger.cues : ledger.captionCues;
  const ids = new Set<string>();
  const relationships = new Set<string>();
  const checkedCues = new Set<string>();
  const visualCache = new Map<string, {intervals: Interval[]; queue?: ReturnType<typeof queueIntervals>['queue']}>();
  const frames = new Map<number, ReturnType<typeof queueFrame>>();
  const checks = spec.checks.map(check => {
    const {id, cue, event, state, minContinuousFrames} = check;
    const cueKey = cue.beatId + '/' + cue.indexInBeat;
    const eventKey = event.beatId + '/' + event.indexInBeat;
    const visualKey = eventKey + '/' + state + ('subject' in check ? '/' + check.subject.id + '/' + check.subject.sha256 : '');
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
    let measured = visualCache.get(visualKey);
    if (!measured) {
      const eventIndex = compiled.trace.findIndex(row => row.frame === sourceEvent.frame);
      if ('subject' in check) {
        if (compiled.moduleId !== 'concurrency-queue/1') return fail('STATE', 'Queue check requires a queue trace.');
        measured = queueIntervals(compiled, check, eventIndex, frames, signal);
      } else {
        if (compiled.moduleId !== 'http-exchange/1' && compiled.moduleId !== 'image-output-choice/1') {
          return fail('STATE', 'Legacy check requires an HTTP or image trace.');
        }
        measured = {intervals: legacyIntervals(compiled, check.state, eventIndex, signal)};
      }
      visualCache.set(visualKey, measured);
    }
    const cueInterval = {startFrame: sourceCue.startFrame, endFrame: sourceCue.endFrame};
    const overlap = longestOverlap(cueInterval, measured.intervals);
    return {id, cue, event: {...event, kind: sourceEvent.kind, frame: sourceEvent.frame}, state,
      minContinuousFrames, cueInterval, visualIntervals: measured.intervals, longestOverlap: overlap,
      ...(measured.queue ? {queue: measured.queue} : {}),
      verdict: overlap.frames >= minContinuousFrames ? 'passed' as const : 'failed' as const};
  });
  const recordsOcclusionScope = input.profile === QUEUE_PROFILE;
  const report = {
    schemaVersion: recordsOcclusionScope ? 'presentation-timing-report/1.2' :
      queue ? 'presentation-timing-report/1.1' : 'presentation-timing-report/1.0',
    taskId, profile: input.profile, specSha256: sha256(input.specText),
    planTaskId: spec.planTaskId, planManifestSha256: spec.planManifestSha256, traceSha256: spec.traceSha256,
    voiceTaskId: spec.voiceTaskId, voiceManifestSha256: spec.voiceManifestSha256, moduleId: compiled.moduleId,
    timeline: compiled.timeline, intervalConvention: 'half-open-frames', relationshipSource: 'caller-declared',
    declaredTemporalChecks: checks.every(check => check.verdict === 'passed') ? 'passed' as const : 'failed' as const,
    ...(recordsOcclusionScope ? {occlusion: 'unchecked' as const} : {}),
    uncheckedCueCount: cues.length - checkedCues.size, undeclaredRelationships: 'unchecked', speechAlignment: 'unverified', checks,
  } as const;
  return {report, parents: new Map([['trace.json', trace], ['plan-manifest.json', planManifest], ['voice-manifest.json', voiceManifest]])};
}

async function checked(data: string, id: string, signal: AbortSignal) {
  checkAbort(signal);
  if (!Hash.safeParse(id).success) return fail('TASK', 'Expected a lowercase hexadecimal timing-check task ID.');
  const task = await readTask(data, id, TIMING_CHECK_KIND);
  const input = Input.parse(task.input);
  const spec = parseSpec(input.specText);
  const currentProfile = profileFor(spec);
  const historicalQueue = input.profile === HISTORICAL_QUEUE_PROFILE && currentProfile === QUEUE_PROFILE;
  if (input.profile !== currentProfile && !historicalQueue) {
    return fail('INTEGRITY', 'Timing profile does not match the stored specification version.');
  }
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
  const spec = parseSpec(specText);
  const input = Input.parse({profile: profileFor(spec), specText});
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
