import type {MechanismPlan} from './plan.js';
import {evaluateMechanism, mechanismFrame} from './state.js';
import {mechanismSvg} from './visual.js';

export const geometry = {width: 720, height: 1000, fps: 24, durationInFrames: 192} as const;
export const compositionId = 'MechanismPreview';
export type MechanismMediaProps = {frames: string[]};

export function prepareMechanismMedia(plan: MechanismPlan) {
  const evaluation = evaluateMechanism(plan);
  const {durationInFrames} = geometry;
  const time = (frame: number) => Math.floor(frame * evaluation.durationMs / durationInFrames);
  const candidates = new Set([0, durationInFrames - 1]);
  for (const beat of evaluation.timeline) {
    candidates.add(Math.ceil(beat.start * durationInFrames / evaluation.durationMs));
    candidates.add(Math.ceil(beat.end * durationInFrames / evaluation.durationMs) - 1);
    if (beat.event.kind !== 'context') {
      const event = Math.ceil((beat.start + beat.event.atMs) * durationInFrames / evaluation.durationMs);
      candidates.add(event - 1);
      candidates.add(event);
    }
  }
  const samples = [...candidates].filter(frame => frame >= 0 && frame < durationInFrames).sort((a, b) => a - b);
  const frameMap = Array.from({length: durationInFrames}, (_, frame) => {
    const {beat, state} = mechanismFrame(evaluation, time(frame));
    return {frame, modelMs: time(frame), beat: beat.id, state};
  });
  const props: MechanismMediaProps = {frames: frameMap.map(({modelMs}) =>
    Buffer.from(mechanismSvg(plan, evaluation, modelMs)).toString('base64'))};
  return {evaluation, frameMap, props, samples};
}
