import {EngineError} from '../core/errors.js';
import {exportPresentation, readPresentation, renderPresentation} from './runtime.js';

export async function presentationCommand(positionals: string[], options: Record<string, unknown>, signal: AbortSignal) {
  const action = positionals[1];
  const required = action === 'render' ? ['data', 'task', 'mode'] : action === 'export' ? ['data', 'task', 'out'] : ['data', 'task'];
  const allowed = action === 'render' ? required : [...required, 'kind'];
  if (positionals.length !== 2 || !['render', 'status', 'export'].includes(action ?? '') ||
      required.some(key => typeof options[key] !== 'string' || !String(options[key]).trim()) ||
      Object.entries(options).some(([key, value]) => value !== undefined && !allowed.includes(key)) ||
      (action === 'render' && options.mode !== 'silent') ||
      (options.kind !== undefined && options.kind !== 'plan' && options.kind !== 'preview')) {
    throw new EngineError('USAGE', 'presentation render --task <plan-task> --data <state> --mode silent | presentation status/export --task <task> --data <state> [--kind plan|preview] [--out <directory>]');
  }
  const data = String(options.data), task = String(options.task);
  const kind = options.kind === 'plan' ? 'plan' : 'preview';
  if (action === 'render') return renderPresentation(data, task, signal, taskId => console.error(JSON.stringify({taskId, stage: 'presentation-preview'})));
  if (action === 'export') return exportPresentation(data, task, kind, String(options.out), signal);
  return (await readPresentation(data, task, kind, signal)).status;
}
