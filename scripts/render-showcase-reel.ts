import {parseArgs} from 'node:util';
import {resolve} from 'node:path';
import {EngineError, errorInfo} from '../src/core/errors.js';
import {showcaseCommand} from '../src/showcase/cli.js';

const controller = new AbortController();
const stop = () => controller.abort(new EngineError('CANCELLED', 'Showcase render interrupted.', 'cancelled'));
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  const {values} = parseArgs({options: {spec: {type: 'string'}, out: {type: 'string'}, data: {type: 'string'},
    'frames-only': {type: 'boolean'}, 'skip-stills': {type: 'boolean'}, 'still-frames': {type: 'string'}}});
  if (!values.out || !values.spec) throw new EngineError('USAGE', 'render-showcase-reel --spec <manifest> --out <new-dir> [--data <state>]');
  const result = await showcaseCommand(['showcase', 'render'], {...values, data: values.data ?? resolve(values.out + '.state')}, controller.signal);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const info = errorInfo(error);
  console.error(JSON.stringify({error: info}, null, 2));
  process.exitCode = info.classification === 'cancelled' ? 130 : 1;
} finally {
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
