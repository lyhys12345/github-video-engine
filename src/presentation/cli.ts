import {EngineError} from '../core/errors.js';
import {bindPresentationVoice, exportPresentation, readPresentation, renderPresentation} from './runtime.js';

export async function presentationCommand(positionals: string[], options: Record<string, unknown>, signal: AbortSignal) {
  const action = positionals[1];
  const narrated = action === 'render' && options.mode === 'narrated';
  const required = action === 'voice-bind' ? ['data', 'spec'] :
    action === 'render' ? ['data', 'task', 'mode', ...(narrated ? ['voice'] : [])] :
      action === 'export' ? ['data', 'task', 'out'] : ['data', 'task'];
  const allowed = action === 'status' || action === 'export' ? [...required, 'kind'] : required;
  const kind = options.kind ?? 'preview';
  if (positionals.length !== 2 || !['render', 'status', 'export', 'voice-bind'].includes(action ?? '') ||
      required.some(key => typeof options[key] !== 'string' || !String(options[key]).trim()) ||
      Object.entries(options).some(([key, value]) => value !== undefined && !allowed.includes(key)) ||
      (action === 'render' && options.mode !== 'silent' && !narrated) ||
      (kind !== 'plan' && kind !== 'preview' && kind !== 'voice' && kind !== 'narrated')) {
    throw new EngineError('USAGE', 'presentation voice-bind --spec <bindings> --data <state> | presentation render --task <plan-task> --data <state> --mode silent|narrated [--voice <voice-task>] | presentation status/export --task <task> --data <state> [--kind plan|preview|voice|narrated] [--out <directory>]');
  }
  const data = String(options.data), task = String(options.task);
  const announce = (stage: string) => (taskId: string) => console.error(JSON.stringify({taskId, stage}));
  if (action === 'voice-bind') return bindPresentationVoice(data, String(options.spec), signal, announce('presentation-voice'));
  if (action === 'render') return renderPresentation(data, task, signal, announce(narrated ? 'presentation-narrated-preview' : 'presentation-preview'),
    narrated ? String(options.voice) : undefined);
  if (action === 'export') return exportPresentation(data, task, kind, String(options.out), signal);
  return (await readPresentation(data, task, kind, signal)).status;
}
