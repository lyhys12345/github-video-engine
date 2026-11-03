import {fixed, type MechanismPlan} from './plan.js';

type Sample = {
  timeMs: number;
  beat: string | null;
  update: number;
  value: number;
  before: number;
  integrated: number;
  mode: 'automatic' | 'manual';
  result: 'initial' | 'added' | 'ineligible' | 'threshold' | 'assigned';
};

export function evaluateMechanism(plan: MechanismPlan) {
  const initial = fixed(plan.state.initial.decimal);
  let state: Sample = {
    timeMs: 0, beat: null, update: 0, value: initial, before: initial, integrated: 0,
    mode: 'automatic', result: 'initial',
  };
  const trace = [state];
  const rules = new Map(plan.rules.map(rule => [rule.id, {
    lessThan: fixed(rule.lessThan.decimal), increment: fixed(rule.addPerEligibleUpdate.decimal),
  }]));
  let end = 0;
  const timeline = plan.beats.map(beat => {
    const start = end;
    end += beat.durationMs;
    const event = beat.event;
    function apply(timeMs: number, value: number, result: Sample['result']) {
      const manual = result === 'assigned';
      state = {timeMs, beat: beat.id, update: state.update + Number(!manual),
        value, before: state.value, integrated: state.integrated + (timeMs - state.timeMs) * state.value,
        mode: manual ? 'manual' : 'automatic', result};
      trace.push(state);
    }
    if (event.kind === 'manual-assignment') {
      apply(start + event.atMs, fixed(event.value.decimal), 'assigned');
    }
    if (event.kind === 'conditional-add') {
      const rule = rules.get(event.rule)!;
      for (let i = 0; i < event.count; i++) {
        const timeMs = start + event.atMs + Math.floor(i * (beat.durationMs - event.atMs) / event.count);
        const result = !event.eligible ? 'ineligible' : state.value < rule.lessThan ? 'added' : 'threshold';
        apply(timeMs, state.value + (result === 'added' ? rule.increment : 0), result);
      }
    }
    return {...beat, start, end};
  });
  return {trace, timeline, durationMs: end};
}

type Evaluation = ReturnType<typeof evaluateMechanism>;

export function mechanismFrame(evaluation: Evaluation, timeMs: number) {
  if (!Number.isFinite(timeMs) || timeMs < 0 || timeMs >= evaluation.durationMs) {
    throw new Error('MECHANISM: frame time outside timeline');
  }
  const beat = evaluation.timeline.find(beat => timeMs < beat.end)!;
  let left = 0;
  let right = evaluation.trace.length;
  while (left + 1 < right) {
    const mid = Math.floor((left + right) / 2);
    if (evaluation.trace[mid]!.timeMs <= timeMs) left = mid;
    else right = mid;
  }
  const state = evaluation.trace[left]!;
  return {beat, state, value: state.value / 10000,
    integrated: (state.integrated + (timeMs - state.timeMs) * state.value) / 10_000_000};
}
