import {resolve} from 'node:path';
import {EngineError} from '../src/core/errors.js';
import {boundedFile} from '../src/story-planner/runtime.js';
import {exportMechanismTask, renderMechanismTask, resumeMechanismTask, statusMechanismTask} from '../src/mechanism/media-task.js';

const [action, data, target, output, ...extra] = process.argv.slice(2);
const controller = new AbortController();
const stop = () => controller.abort(new EngineError('CANCELLED', 'Mechanism preview cancelled', 'cancelled'));
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  if (extra.length || !data || !target ||
      !((action === 'render' || action === 'status' || action === 'resume') && !output || action === 'export' && output)) {
    throw new Error('Usage: mechanism-media.ts render STATE SIDECAR | resume STATE TASK_ID | status STATE TASK_ID | export STATE TASK_ID NEW_DIR');
  }
  const result = action === 'render' ?
    await renderMechanismTask(data, await boundedFile(resolve(target), 256000), controller.signal,
      taskId => process.stderr.write(JSON.stringify({taskId}) + '\n')) :
    action === 'status' ? await statusMechanismTask(data, target) :
    action === 'resume' ? await resumeMechanismTask(data, target, controller.signal) : await exportMechanismTask(data, target, output!);
  console.log(JSON.stringify(result));
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
