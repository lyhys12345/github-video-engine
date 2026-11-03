import {expect, it} from 'vitest';
import {StoryProposal} from '../src/contracts/authoring.js';
import type {QueueEvent} from '../src/contracts/concurrency-queue.js';
import {PresentationPlan, type QueuePlan} from '../src/contracts/presentation.js';
import {canonical, sha256} from '../src/core/util.js';
import {compilePresentation} from '../src/presentation/compile.js';
import {queueFrame, queueTitle} from '../src/presentation/queue-frame.js';

const ids = ['first', 'second', 'third', 'fourth', 'fifth'];
const start = (taskId: string, slotId: number, atFrame: number): QueueEvent =>
  ({kind: 'start', atFrame, taskId, slotId, motionFrames: 12, claimIds: ['limit', 'admit'], mechanismId: 'schedule'});
const settle = (taskId: string, outcome: 'fulfilled' | 'rejected', atFrame: number): QueueEvent =>
  ({kind: 'settle', atFrame, taskId, outcome, motionFrames: 12, claimIds: ['release'], mechanismId: 'schedule'});
const enqueue = (taskIds: string[], atFrame: number): QueueEvent =>
  ({kind: 'enqueue', atFrame, taskIds, motionFrames: 12, claimIds: ['wait'], mechanismId: 'schedule'});

function fixture(capacity = 2) {
  const claims = ['limit', 'admit', 'wait', 'release'];
  const taskIds = ids.slice(0, capacity === 3 ? 5 : 4);
  const entities = {waiting: 'pending', slots: 'active', results: 'finished'};
  const entityIds = [...Object.values(entities), ...taskIds];
  const ref = (claimId: string) => ({claimId, citationIndex: 0});
  const binding = {projectId: 'synthetic-queue', repository: 'https://github.com/example/fictional-fixture',
    commit: 'a'.repeat(40), snapshotHash: 'b'.repeat(64), evidenceFingerprint: 'c'.repeat(64)};
  const scheduled = capacity === 1 ?
    [[], [enqueue(taskIds, 2), start('first', 0, 18)], [settle('first', 'fulfilled', 2), start('second', 0, 3)], []] :
    [[], [enqueue(taskIds, 2), start('first', 0, 18), start('second', 1, 23)],
      [...(capacity === 3 ? [start('third', 2, 0)] : []), settle('second', 'rejected', 12),
        start(capacity === 3 ? 'fourth' : 'third', 1, 13)],
      [settle('first', 'fulfilled', 2)]];
  const proposal = StoryProposal.parse({schemaVersion: '1.1', kind: 'session-story-proposal', binding,
    authoringRequestId: 'd'.repeat(64), authorship: {kind: 'session-agent'},
    useCase: {title: 'Fixture', audience: 'Test readers', question: 'What waits?', scope: 'Synthetic example',
      exclusions: ['Actual run'], goalClaimIds: ['limit'], inputClaimIds: ['wait'], processClaimIds: ['admit'],
      outputClaimIds: ['release'], limitationClaimIds: []},
    claims: claims.map(id => ({id, statement: 'Synthetic fixture rule ' + id, basis: {kind: 'documented'},
      citations: [{sourceId: 'source-1', sourceSha256: 'e'.repeat(64), startLine: 1, endLine: 1, quote: 'Fixture only'}]})),
    entities: entityIds.map(id => ({id, label: 'Label ' + id, role: 'Fixture entity', claimIds: claims})),
    mechanisms: [{id: 'schedule', adapterCandidate: 'concurrency-queue', explanation: 'Synthetic rules', inputEntityIds: entityIds,
      outputEntityIds: [entities.results], claimIds: claims, assumptions: ['Example tasks and order', 'Sample timings', 'Example outcomes', 'Sample limit'],
      visualIntent: 'Move cards'}],
    beats: scheduled.map((_, index) => ({id: 'step-' + index, purpose: 'Fixture stage ' + index, narration: 'Text ' + index,
      narrationClaimIds: claims, entityIds, mechanismIds: ['schedule'], timingIntent: 'Fixture intervals',
      visual: {description: 'Synthetic animation', depiction: 'illustrative', claimIds: claims}})), openQuestions: []});
  const plan: QueuePlan = {schemaVersion: '1.2', kind: 'session-presentation-plan', proposalHash: sha256(canonical(proposal)),
    authoringRequestId: proposal.authoringRequestId, binding, authorship: proposal.authorship,
    module: {id: 'concurrency-queue/1', unit: 'in-flight-tasks', entities, taskIds, mechanismId: 'schedule',
      capacity: {value: capacity, evidence: ref('limit'), basis: 'illustrative', assumptionIndex: 3},
      rules: {admitUnderCapacity: ref('admit'), releaseOnFulfilledOrRejected: ref('release'), waitingFunctionNotCalled: ref('wait')},
      scenario: {basis: 'illustrative', taskAndOrderAssumptionIndex: 0, timingAssumptionIndex: 1,
        outcomeAssumptionIndex: 2, ending: 'paused'}},
    beats: scheduled.map((events, index) => ({beatId: proposal.beats[index]!.id, frames: index === 1 ? 32 : 160, events}))};
  return {proposal, plan};
}

it.each([1, 2, 3])('preserves every submitted task and capacity %i on every frame', capacity => {
  const {proposal, plan} = fixture(capacity);
  const compiled = compilePresentation(proposal, plan);
  expect(compiled.beats.map(beat => beat.narration)).toEqual(proposal.beats.map(beat => beat.narration));
  let maxActive = 0;
  for (let frame = 0; frame < compiled.timeline.totalFrames; frame++) {
    const {state, cards, active} = queueFrame(compiled, frame);
    maxActive = Math.max(active, maxActive);
    const tasks = [...state.pending, ...state.activeSlots.filter(id => id !== null), ...state.settled.map(task => task.taskId)];
    expect(new Set(tasks).size).toBe(tasks.length);
    expect(active).toBeLessThanOrEqual(capacity);
    expect(tasks.every(id => plan.module.taskIds.includes(id))).toBe(true);
    expect(tasks.length).toBe(frame < compiled.trace[0]!.frame ? 0 : plan.module.taskIds.length);
    expect(cards.every(card => Number.isFinite(card.x) && Number.isFinite(card.y))).toBe(true);
  }
  expect(maxActive).toBe(capacity);
  expect(queueFrame(compiled, compiled.timeline.totalFrames - 1).ended).toBe(true);
  const result = compiled.trace.find(row => row.kind === 'settle')!;
  expect(result.after.activeSlots[result.slotId!]).toBeNull();
  expect(result.after.settled[0]).toEqual(capacity === 1 ? {taskId: 'first', outcome: 'fulfilled'} : {taskId: 'second', outcome: 'rejected'});
});

it('keeps independent motions across a beat boundary and preserves the stationary running card during slot reuse', () => {
  const {proposal, plan} = fixture();
  const compiled = compilePresentation(proposal, plan);
  const card = (id: string, frame: number) => queueFrame(compiled, frame).cards.find(row => row.id === id)!;
  const boundary = compiled.beats[2]!.start;
  expect(card('second', boundary - 1).phase).toBe('entering');
  expect(card('second', boundary).x).toBeGreaterThan(card('second', boundary - 1).x);
  expect(card('first', boundary + 11)).toEqual(card('first', boundary + 18));
  expect(card('second', boundary + 18).phase).toBe('leaving');
  expect(card('third', boundary + 18).phase).toBe('entering');
  expect(compiled.trace[4]).toMatchObject({slotId: 1, after: {activeSlots: ['first', 'third']}});
});

it.each([
  ['start before enqueue', (plan: QueuePlan) => {plan.beats[0]!.events = [start('first', 0, 1)];}],
  ['duplicate enqueue', (plan: QueuePlan) => {plan.beats[1]!.events[0] = enqueue(['first', 'first'], 2);}],
  ['duplicate start', (plan: QueuePlan) => {plan.beats[2]!.events.push(start('first', 1, 30));}],
  ['duplicate settle', (plan: QueuePlan) => {plan.beats[3]!.events.push(settle('second', 'rejected', 30));}],
  ['full slot', (plan: QueuePlan) => {plan.beats[2]!.events.unshift(start('third', 1, 1));}],
  ['out-of-capacity slot', (plan: QueuePlan) => {plan.beats[1]!.events[1] = start('first', 2, 18);}],
  ['task motion overlap', (plan: QueuePlan) => {plan.beats[1]!.events[1] = start('first', 0, 6);}],
  ['same frame', (plan: QueuePlan) => {plan.beats[1]!.events[2] = start('second', 1, 18);}],
  ['wrong ending', (plan: QueuePlan) => {plan.module.scenario.ending = 'all-completed';}],
  ['missing rule quote', (plan: QueuePlan) => {plan.module.rules.releaseOnFulfilledOrRejected.citationIndex = 2;}],
  ['missing assumption', (plan: QueuePlan) => {plan.module.scenario.timingAssumptionIndex = 8;}],
  ['missing event claim', (plan: QueuePlan) => {plan.beats[1]!.events[1]!.claimIds = ['limit'];}],
  ['wrong evidence revision', (plan: QueuePlan) => {plan.binding = {...plan.binding, evidenceFingerprint: '1'.repeat(64)};}],
] as const)('fails closed for %s', (_name, change) => {
  const {proposal, plan} = fixture();
  change(plan);
  for (const schemaVersion of ['1.2', '1.3'] as const) {
    expect(() => compilePresentation(proposal, {...plan, schemaVersion})).toThrow();
  }
});

it('rejects rate units, dynamic capacity, cancellation, and queues under legacy schema versions', () => {
  const {proposal, plan} = fixture();
  expect(StoryProposal.safeParse({...proposal, schemaVersion: '1.0'}).success).toBe(false);
  for (const module of [{...plan.module, unit: 'per-second'}, {...plan.module, capacity: {value: Infinity}},
    {...plan.module, dynamicCapacity: true}]) {
    expect(PresentationPlan.safeParse({...plan, module}).success).toBe(false);
  }
  expect(PresentationPlan.safeParse({...plan, schemaVersion: '1.1'}).success).toBe(false);
  expect(PresentationPlan.safeParse({...plan, schemaVersion: '1.3', module: {...plan.module, unit: 'per-second'}}).success).toBe(false);
  const original = plan.beats[1]!.events[0]!;
  Object.assign(original, {kind: 'cancel'});
  expect(PresentationPlan.safeParse(plan).success).toBe(false);
});

it('waits for the last settlement animation before showing the authored ending heading', () => {
  const {proposal, plan} = fixture();
  proposal.beats.at(-1)!.purpose = 'All tasks settled';
  plan.proposalHash = sha256(canonical(proposal));
  plan.module.scenario.ending = 'all-completed';
  plan.beats[3]!.events.push(start('fourth', 0, 3), settle('third', 'fulfilled', 35), settle('fourth', 'fulfilled', 48));

  const legacy = compilePresentation(proposal, plan);
  expect(legacy.endingTitle).toBeUndefined();
  expect(queueTitle(legacy, legacy.beats.at(-1)!, 352)).toBe('All tasks settled');
  const revised = compilePresentation(proposal, PresentationPlan.parse({...plan, schemaVersion: '1.3'}));
  if (revised.moduleId !== 'concurrency-queue/1') throw new Error('Expected queue');
  const last = revised.beats.at(-1)!;
  const frame = last.start + 60;
  expect(revised.endingTitle).toEqual({beatId: last.id, visibleFromFrame: frame});
  expect(queueTitle(revised, last, last.start)).toBe('Final stage in progress');
  expect(queueFrame(revised, last.start + 47)).toMatchObject({active: 1, ended: false});
  expect(queueFrame(revised, frame - 1)).toMatchObject({active: 0, ended: false});
  expect(queueTitle(revised, last, frame - 1)).toBe('Final stage in progress');
  expect(queueFrame(revised, frame)).toMatchObject({active: 0, ended: true});
  expect(queueTitle(revised, last, frame)).toBe('All tasks settled');
  expect(revised.trace).toEqual(legacy.trace);
  expect(revised.beats).toEqual(legacy.beats);

  const short = structuredClone(plan);
  short.beats[3]!.frames = 83;
  expect(() => compilePresentation(proposal, {...short, schemaVersion: '1.3'})).toThrow(expect.objectContaining({code: 'PRESENTATION_DURATION'}));
});

it('a paused ending in 1.3 starts at its final beat and retains unfinished tasks', () => {
  const {proposal, plan} = fixture(3);
  plan.beats[3]!.events = [];
  const compiled = compilePresentation(proposal, {...plan, schemaVersion: '1.3'});
  const last = compiled.beats.at(-1)!;
  expect(compiled.endingTitle).toEqual({beatId: last.id, visibleFromFrame: last.start});
  expect(queueFrame(compiled, last.start - 1).ended).toBe(false);
  expect(queueFrame(compiled, last.start)).toMatchObject({ended: true, active: 3, state: {pending: ['fifth']}});
  expect(queueTitle(compiled, last, last.start)).toBe(last.title);
});

it('honors the exact 300-second total and absolute motion across a 480-frame range boundary', () => {
  const {proposal, plan} = fixture();
  plan.beats[0]!.frames = 450;
  plan.beats[3]!.frames = 7200 - 450 - 32 - 160;
  const compiled = compilePresentation(proposal, plan);
  expect(compiled.timeline.totalFrames).toBe(7200);
  const x = (frame: number) => queueFrame(compiled, frame).cards[1]!.x;
  expect(x(481)).toBeGreaterThan(x(480));
  expect(x(480)).toBeGreaterThan(x(479));
  plan.beats[3]!.frames++;
  expect(() => compilePresentation(proposal, plan)).toThrow(expect.objectContaining({code: 'PRESENTATION_DURATION'}));
});
