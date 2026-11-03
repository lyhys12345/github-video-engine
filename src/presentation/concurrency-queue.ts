import type {StoryProposal} from '../contracts/authoring.js';
import type {QueueEvent} from '../contracts/concurrency-queue.js';
import {PRESENTATION_FPS, PRESENTATION_MAX_FRAMES, type QueuePlan} from '../contracts/presentation.js';
import {EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';

type Outcome = Extract<QueueEvent, {kind: 'settle'}>['outcome'];
export type QueueState = {
  pending: string[];
  activeSlots: (string | null)[];
  settled: {taskId: string; outcome: Outcome}[];
};
type Rule = keyof QueuePlan['module']['rules'];
const ruleByEvent: Record<QueueEvent['kind'], Rule> = {
  enqueue: 'waitingFunctionNotCalled', start: 'admitUnderCapacity', settle: 'releaseOnFulfilledOrRejected',
};
type Trace = {
  frame: number; motionFrames: number; beatId: string; kind: QueueEvent['kind']; event: QueueEvent;
  claimIds: string[]; rule: Rule; before: QueueState; after: QueueState; slotId: number | null;
};

function fail(code: string, message: string): never {throw new EngineError('PRESENTATION_' + code, message);}
const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
const visibleLabel = (label: string, limit: number) =>
  [...label].length <= limit && /^[^\p{C}\p{Zl}\p{Zp}]+$/u.test(label);

function apply(state: QueueState, event: QueueEvent, taskIds: readonly string[]) {
  const next = structuredClone(state);
  let slotId: number | null = null;
  switch (event.kind) {
    case 'enqueue': {
      const submitted = [...state.pending, ...state.activeSlots, ...state.settled.map(task => task.taskId)];
      if (!unique(event.taskIds) || event.taskIds.some(id => !taskIds.includes(id) || submitted.includes(id))) {
        fail('EVENT', 'Enqueue requires distinct, declared, unsubmitted tasks.');
      }
      next.pending.push(...event.taskIds);
      break;
    }
    case 'start': {
      slotId = event.slotId;
      const index = state.pending.indexOf(event.taskId);
      if (index < 0 || state.activeSlots[slotId] !== null) fail('EVENT', 'Start requires a waiting task and a vacant declared slot.');
      next.pending.splice(index, 1);
      next.activeSlots[slotId] = event.taskId;
      break;
    }
    case 'settle':
      slotId = state.activeSlots.indexOf(event.taskId);
      if (slotId < 0) fail('EVENT', 'Settle requires an active task.');
      next.activeSlots[slotId] = null;
      next.settled.push({taskId: event.taskId, outcome: event.outcome});
      break;
  }
  return {next, slotId};
}

export function compileQueue(proposal: StoryProposal, plan: QueuePlan) {
  if (canonical(proposal.authorship) !== canonical(plan.authorship)) fail('BINDING', 'Queue plan authorship differs from its proposal.');
  const module = plan.module;
  const mechanism = proposal.mechanisms[0];
  if (proposal.schemaVersion !== '1.1' || proposal.mechanisms.length !== 1 ||
      !mechanism || mechanism.id !== module.mechanismId || mechanism.adapterCandidate !== 'concurrency-queue') {
    fail('UNSUPPORTED', 'Queue presentations require one explicitly mapped concurrency mechanism in a proposal 1.1.');
  }
  const {taskIds, entities, scenario} = module;
  const allIds = [...Object.values(entities), ...taskIds];
  if (!unique(allIds)) fail('ENTITY', 'Queue roles and tasks require distinct stable entity IDs.');
  const label = (id: string, limit: number) => {
    const row = proposal.entities.find(item => item.id === id);
    if (!row || !visibleLabel(row.label, limit) || ![...mechanism.inputEntityIds, ...mechanism.outputEntityIds].includes(id)) {
      return fail('ENTITY', 'Queue entity must belong to the mechanism and fit the label budget: ' + id);
    }
    return row.label;
  };
  const labels = {waiting: label(entities.waiting, 18), slots: label(entities.slots, 18), results: label(entities.results, 18)};
  const tasks = taskIds.map(id => ({id, label: label(id, 22)}));
  if (!unique(tasks.map(task => task.label))) fail('ENTITY', 'Queue tasks require distinguishable visible labels.');
  const resolve = (ref: QueuePlan['module']['rules'][Rule]) => {
    const claim = proposal.claims.find(item => item.id === ref.claimId);
    const citation = claim?.citations[ref.citationIndex];
    if (claim?.basis.kind !== 'documented' || !citation || !mechanism.claimIds.includes(ref.claimId)) {
      return fail('REFERENCE', 'A queue rule or capacity requires a documented mechanism claim with an exact citation index.');
    }
    return {...ref, citation};
  };
  const rules = {
    admitUnderCapacity: resolve(module.rules.admitUnderCapacity),
    releaseOnFulfilledOrRejected: resolve(module.rules.releaseOnFulfilledOrRejected),
    waitingFunctionNotCalled: resolve(module.rules.waitingFunctionNotCalled),
  };
  const assumption = (index: number) => {
    const text = mechanism.assumptions[index];
    if (!text) return fail('REFERENCE', 'Queue scenario requires an explicitly authored assumption: ' + index);
    return {mechanismId: mechanism.id, index, text};
  };
  const assumptions = {
    tasksAndOrder: assumption(scenario.taskAndOrderAssumptionIndex),
    timing: assumption(scenario.timingAssumptionIndex),
    outcomes: assumption(scenario.outcomeAssumptionIndex),
    ...(module.capacity.basis === 'illustrative' ? {capacity: assumption(module.capacity.assumptionIndex)} : {}),
  };
  const capacity = {...module.capacity, evidence: resolve(module.capacity.evidence)};
  const initialState: QueueState = {pending: [], activeSlots: Array.from({length: capacity.value}, () => null), settled: []};
  const trace: Trace[] = [];
  const movingUntil = new Map<string, number>();
  let state = initialState;
  let frame = 0;
  const beats = plan.beats.map((beat, index) => {
    const authored = proposal.beats[index]!;
    if (!visibleLabel(authored.purpose, 70)) fail('TITLE', 'Beat purpose exceeds the visible title budget: ' + beat.beatId);
    let previous = -1;
    for (const event of beat.events) {
      if (trace.length >= 24 || event.atFrame <= previous || event.atFrame >= beat.frames) {
        fail('EVENT', 'Queue events require strictly increasing in-beat frames and at most 24 events.');
      }
      const absoluteFrame = frame + event.atFrame;
      const moving = event.kind === 'enqueue' ? event.taskIds : [event.taskId];
      const rule = ruleByEvent[event.kind];
      const requiredClaims = [rules[rule].claimId, ...(event.kind === 'start' ? [capacity.evidence.claimId] : [])];
      const requiredEntities = event.kind === 'enqueue' ? [entities.waiting] : event.kind === 'start' ?
        [entities.waiting, entities.slots] : [entities.slots, entities.results];
      if (event.mechanismId !== mechanism.id || !authored.mechanismIds.includes(mechanism.id) ||
          authored.visual.depiction !== 'illustrative' ||
          !unique(event.claimIds) || requiredClaims.some(id => !event.claimIds.includes(id)) ||
          event.claimIds.some(id => !authored.visual.claimIds.includes(id) || !mechanism.claimIds.includes(id)) ||
          [...moving, ...requiredEntities].some(id => !authored.entityIds.includes(id))) {
        fail('REFERENCE', 'Queue event differs from the selected beat entities, evidence or mechanism: ' + beat.beatId);
      }
      if (moving.some(id => absoluteFrame < (movingUntil.get(id) ?? 0))) fail('EVENT', 'Task lifecycle motion overlaps a previous event.');
      const {next, slotId} = apply(state, event, taskIds);
      trace.push({frame: absoluteFrame, motionFrames: event.motionFrames, beatId: beat.beatId, kind: event.kind, event,
        claimIds: event.claimIds, rule, before: state, after: next, slotId});
      for (const id of moving) movingUntil.set(id, absoluteFrame + event.motionFrames);
      state = next;
      previous = event.atFrame;
    }
    const start = frame;
    frame += beat.frames;
    return {id: beat.beatId, start, end: frame, title: authored.purpose, narration: authored.narration,
      visualDescription: authored.visual.description, visualClaimIds: authored.visual.claimIds,
      narrationClaimIds: authored.narrationClaimIds};
  });
  if (frame > PRESENTATION_MAX_FRAMES || trace.length === 0 || trace.some(row => row.frame + row.motionFrames >= frame)) {
    fail('DURATION', 'Queue requires at least one event, at most 300 seconds, and space to complete each visual motion.');
  }
  if (movingUntil.size !== taskIds.length || (state.settled.length === taskIds.length) !== (scenario.ending === 'all-completed')) {
    fail('EVENT', 'Every declared task must be submitted, and the ending must agree with the final state.');
  }
  // Historical 1.2 traces keep their original bytes. For 1.3, the final
  // authored heading describes a terminal state and waits for its visual proof.
  let endingTitle: {beatId: string; visibleFromFrame: number} | undefined;
  if (plan.schemaVersion === '1.3') {
    const finalBeat = beats.at(-1)!;
    const visibleFromFrame = Math.max(finalBeat.start, ...trace.map(row => row.frame + row.motionFrames));
    if (frame - visibleFromFrame < PRESENTATION_FPS) {
      fail('DURATION', 'Leave at least one second after the last queue motion for the ending title.');
    }
    endingTitle = {beatId: finalBeat.id, visibleFromFrame};
  }
  return {schemaVersion: '1.0' as const, moduleId: module.id, proposalHash: plan.proposalHash,
    planSha256: sha256(canonical(plan)), binding: plan.binding, timeline: {fps: PRESENTATION_FPS, totalFrames: frame},
    entityIds: entities, labels, tasks, capacity, rules, assumptions, scenario, unit: module.unit,
    parameters: {}, beats, trace, initialState, asset: null,
    ...(endingTitle ? {endingTitle} : {}),
  };
}
export type CompiledQueue = ReturnType<typeof compileQueue>;
