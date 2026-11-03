import type {CompiledPresentation} from './compile.js';

export function presentationFrame(plan: CompiledPresentation, frame: number) {
  const beat = plan.beats.find(row => frame >= row.start && frame < row.end);
  if (!beat) throw new Error('Frame outside presentation timeline');
  const events = plan.trace.filter(event => event.frame <= frame);
  const latest = events.at(-1);
  const progress = latest ? Math.min(1, (frame - latest.frame) / 24) : 1;
  return {beat, state: latest?.after ?? plan.initialState, events, progress: progress * progress * (3 - 2 * progress)};
}
