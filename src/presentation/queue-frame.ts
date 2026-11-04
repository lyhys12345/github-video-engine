import type {CompiledQueue, QueueState} from './concurrency-queue.js';
import type {QueueEvent} from '../contracts/concurrency-queue.js';

export function queueTitle(plan: CompiledQueue, beat: CompiledQueue['beats'][number], frame: number,
  headings = {finalStage: 'Final stage in progress', illustrationInProgress: 'Illustration in progress'}) {
  const ending = plan.endingTitle;
  if (ending?.beatId === beat.id && frame < ending.visibleFromFrame) {
    return plan.scenario.ending === 'all-completed' ? headings.finalStage : headings.illustrationInProgress;
  }
  return beat.title;
}

type Position = {x: number; y: number; opacity: number};
type Movement = {from: Position; to: Position; start: number; duration: number;
  phase: 'submitting' | 'entering' | 'leaving' | 'shifting'; exitLane: boolean};
const rowY = (index: number) => 122 + index * 57;
export const queueSlotY = (index: number) => 122 + index * 106;
const hidden: Position = {x: -95, y: 122, opacity: 0};

function position(state: QueueState, id: string): Position {
  const slot = state.activeSlots.indexOf(id);
  if (slot >= 0) return {x: 218, y: queueSlotY(slot), opacity: 1};
  const pending = state.pending.indexOf(id);
  if (pending >= 0) return {x: 12, y: rowY(pending), opacity: 1};
  const result = state.settled.findIndex(task => task.taskId === id);
  if (result >= 0) return {x: 424, y: rowY(result), opacity: 1};
  return hidden;
}

const samePosition = (left: Position, right: Position) =>
  left.x === right.x && left.y === right.y && left.opacity === right.opacity;
const outcomeFor = (state: QueueState, id: string) => state.settled.find(row => row.taskId === id)?.outcome;

export const queueEventSubjects = (event: QueueEvent) => event.kind === 'enqueue' ? event.taskIds : [event.taskId];

export function queueEventAffectsCard(event: CompiledQueue['trace'][number], id: string) {
  return !samePosition(position(event.before, id), position(event.after, id)) ||
    outcomeFor(event.before, id) !== outcomeFor(event.after, id);
}

function interpolate(movement: Movement, frame: number) {
  const p = Math.min(1, (frame - movement.start) / movement.duration);
  const ease = (part: number) => part * part * (3 - 2 * part);
  const {from, to, exitLane} = movement;
  const mix = (a: number, b: number, part: number) => a + (b - a) * ease(part);
  // Leave the running column at slot height before moving up or down in results.
  const x = exitLane ? Math.min(1, p * 2) : p;
  const y = exitLane ? Math.max(0, p * 2 - 1) : p;
  return {x: mix(from.x, to.x, x), y: mix(from.y, to.y, y), opacity: mix(from.opacity, to.opacity, p)};
}

export function queueFrame(plan: CompiledQueue, frame: number) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= plan.timeline.totalFrames) throw new Error('Frame outside queue presentation timeline');
  const movements = new Map<string, Movement>();
  let state = plan.initialState;
  for (const row of plan.trace) {
    if (row.frame > frame) break;
    const phase = row.kind === 'enqueue' ? 'submitting' : row.kind === 'start' ? 'entering' : 'leaving';
    const event = row.event;
    const primary = queueEventSubjects(event);
    for (const task of plan.tasks) {
      const before = position(row.before, task.id);
      const to = position(row.after, task.id);
      if (samePosition(before, to)) continue;
      const previous = movements.get(task.id);
      const separatedLanes = !!plan.endingTitle;
      const from = previous ? interpolate(previous, row.frame) :
        separatedLanes && row.kind === 'enqueue' ? {...before, y: to.y} : before;
      movements.set(task.id, {from, to, start: row.frame, duration: row.motionFrames,
        phase: primary.includes(task.id) ? phase : 'shifting', exitLane: separatedLanes && row.kind === 'settle'});
    }
    state = row.after;
  }
  const cards = plan.tasks.map(task => {
    const movement = movements.get(task.id);
    const moving = movement && frame < movement.start + movement.duration;
    const outcome = outcomeFor(state, task.id);
    return {...task, ...(movement ? interpolate(movement, frame) : hidden), phase: moving ? movement.phase : undefined,
      active: state.activeSlots.includes(task.id), outcome};
  });
  const active = state.activeSlots.filter(id => id !== null).length;
  const ended = plan.endingTitle ? frame >= plan.endingTitle.visibleFromFrame :
    plan.trace.every(row => frame >= row.frame + row.motionFrames);
  return {state, active, cards, ended};
}

export function queueCardAtRest(frame: ReturnType<typeof queueFrame>, id: string, event: QueueEvent) {
  const card = frame.cards.find(item => item.id === id);
  if (!card || card.phase !== undefined || card.opacity !== 1 || !samePosition(card, position(frame.state, id))) {
    return false;
  }
  if (event.kind === 'enqueue') return frame.state.pending.includes(id);
  if (event.kind === 'start') return frame.state.activeSlots[event.slotId] === id;
  return card.outcome === event.outcome;
}
