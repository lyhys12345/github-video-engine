import {EngineError} from '../core/errors.js';
import {assembleSequence, exportSequence, resumeSequence, statusSequence} from './sequence.js';
import {bindPresentationVoice, exportPresentation, readPresentation, renderPresentation, resumePresentation} from './runtime.js';
import {checkPresentationTiming, exportPresentationTiming, statusPresentationTiming} from './timing-check.js';

export async function presentationCommand(positionals: string[], options: Record<string, unknown>, signal: AbortSignal) {
  const action = positionals[1];
  if (action === 'timing-check' || action === 'timing-check-status' || action === 'timing-check-export') {
    const required = ['data', action === 'timing-check' ? 'spec' : 'task', ...(action === 'timing-check-export' ? ['out'] : [])];
    if (positionals.length !== 2 || required.some(key => typeof options[key] !== 'string' || !String(options[key]).trim()) ||
        Object.entries(options).some(([key, value]) => value !== undefined && !required.includes(key))) {
      throw new EngineError('USAGE', 'presentation timing-check --spec <spec> --data <state> | presentation timing-check-status --task <timing-task> --data <state> | presentation timing-check-export --task <timing-task> --data <state> --out <directory>');
    }
    const data = String(options.data);
    if (action === 'timing-check') return checkPresentationTiming(data, String(options.spec), signal,
      taskId => console.error(JSON.stringify({taskId, stage: 'presentation-timing-check'})));
    if (action === 'timing-check-export') return exportPresentationTiming(data, String(options.task), String(options.out), signal);
    return statusPresentationTiming(data, String(options.task), signal);
  }
  if (action === 'assemble' || action === 'sequence-status' || action === 'sequence-resume' || action === 'sequence-export') {
    const required = ['data', action === 'assemble' ? 'spec' : 'task', ...(action === 'sequence-export' ? ['out'] : [])];
    if (positionals.length !== 2 || required.some(key => typeof options[key] !== 'string' || !String(options[key]).trim()) ||
        Object.entries(options).some(([key, value]) => value !== undefined && !required.includes(key))) {
      throw new EngineError('USAGE', 'presentation assemble --spec <sequence> --data <state> | presentation sequence-status/sequence-resume/sequence-export --task <sequence-task> --data <state> [--out <directory>]');
    }
    const data = String(options.data), id = String(options.task);
    const announce = (taskId: string) => console.error(JSON.stringify({taskId, stage: 'presentation-sequence'}));
    if (action === 'assemble') return assembleSequence(data, String(options.spec), signal, announce);
    if (action === 'sequence-resume') return resumeSequence(data, id, signal, announce);
    if (action === 'sequence-export') return exportSequence(data, id, String(options.out), signal);
    return statusSequence(data, id, signal);
  }
  const narrated = action === 'render' && options.mode === 'narrated';
  const required = action === 'voice-bind' ? ['data', 'spec'] :
    action === 'render' ? ['data', 'task', 'mode', ...(narrated ? ['voice'] : [])] :
      action === 'export' ? ['data', 'task', 'out'] : ['data', 'task'];
  const allowed = action === 'status' || action === 'export' || action === 'resume' ? [...required, 'kind'] : required;
  const kind = options.kind;
  if (positionals.length !== 2 || !['render', 'status', 'export', 'resume', 'voice-bind'].includes(action ?? '') ||
      required.some(key => typeof options[key] !== 'string' || !String(options[key]).trim()) ||
      Object.entries(options).some(([key, value]) => value !== undefined && !allowed.includes(key)) ||
      (action === 'render' && options.mode !== 'silent' && !narrated) ||
      (kind !== undefined && kind !== 'plan' && kind !== 'preview' && kind !== 'voice' && kind !== 'narrated')) {
    throw new EngineError('USAGE', 'presentation voice-bind --spec <bindings> --data <state> | presentation render --task <plan-task> --data <state> --mode silent|narrated [--voice <voice-task>] | presentation status/resume/export --task <task> --data <state> [--kind plan|preview|voice|narrated] [--out <directory>]');
  }
  const data = String(options.data), task = String(options.task);
  const announce = (stage: string) => (taskId: string) => console.error(JSON.stringify({taskId, stage}));
  if (action === 'voice-bind') return bindPresentationVoice(data, String(options.spec), signal, announce('presentation-voice'));
  if (action === 'render') return renderPresentation(data, task, signal, announce(narrated ? 'presentation-narrated-preview' : 'presentation-preview'),
    narrated ? String(options.voice) : undefined);
  if (action === 'resume') return resumePresentation(data, task, kind, signal, announce('presentation-resume'));
  if (action === 'export') return exportPresentation(data, task, kind, String(options.out), signal);
  const result = await readPresentation(data, task, kind, signal);
  return {...result.status, ...('voiceLedgerProfile' in result && {voiceLedgerProfile: result.voiceLedgerProfile})};
}
