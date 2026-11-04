import {EngineError} from '../core/errors.js';
import {exportExplanation, prepareExplanationVoice, renderExplanation, renderNarratedExplanation,
  resumeExplanation, startExplanation, statusExplanation, submitExplanation} from './explanation-session.js';

const usage = 'explanation start --spec <request> --data <state> --out <packet> | explanation proposal/render/narrated-render --task <parent> --spec <json> --data <state> | explanation voice-prepare/status/resume --task <checkpoint> --data <state> | explanation export --task <checkpoint> --data <state> --out <directory>';

export async function explanationCommand(positionals: string[], values: Record<string, unknown>, signal: AbortSignal) {
  const action = positionals[1];
  const keys = ['data', action === 'start' ? 'spec' : 'task'];
  if (action === 'start' || action === 'export') keys.push('out');
  if (action === 'proposal' || action === 'render' || action === 'narrated-render') keys.push('spec');
  if (positionals.length !== 2 || !['start', 'proposal', 'render', 'voice-prepare', 'narrated-render', 'status', 'resume', 'export'].includes(action ?? '') ||
      keys.some(key => typeof values[key] !== 'string' || !String(values[key]).trim()) ||
      Object.entries(values).some(([key, value]) => value !== undefined && !keys.includes(key))) {
    throw new EngineError('USAGE', usage);
  }
  const data = String(values.data), id = String(values.task), spec = String(values.spec), out = String(values.out);
  const announce = (taskId: string) => console.error(JSON.stringify({taskId, stage: 'explanation-' + action}));
  if (action === 'start') return startExplanation(data, spec, out, signal, announce);
  if (action === 'proposal') return submitExplanation(data, id, spec, signal, announce);
  if (action === 'voice-prepare') return prepareExplanationVoice(data, id, signal, announce);
  if (action === 'narrated-render') return renderNarratedExplanation(data, id, spec, signal, announce);
  if (action === 'render') return renderExplanation(data, id, spec, signal, announce);
  if (action === 'resume') return resumeExplanation(data, id, signal, announce);
  if (action === 'export') return exportExplanation(data, id, out, signal);
  return statusExplanation(data, id, signal);
}
