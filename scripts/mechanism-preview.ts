import {resolve} from 'node:path';
import {boundedFile} from '../src/story-planner/runtime.js';
import {sha256} from '../src/core/util.js';
import {loadMechanism} from '../src/mechanism/plan.js';
import {evaluateMechanism} from '../src/mechanism/state.js';
import {mechanismSvg} from '../src/mechanism/visual.js';
import {publishMechanism, publisherScript} from '../src/mechanism/publish.js';

const [data, input, output] = process.argv.slice(2);
if (!data || !input || !output || process.argv.length !== 5) {
  throw new Error('Usage: tsx scripts/mechanism-preview.ts STORY_STATE SIDECAR_JSON NEW_OUTPUT_DIR');
}
const sidecar = await boundedFile(resolve(input), 256000);
const {plan, sidecarHash, sourceOrigin} = await loadMechanism(data, sidecar);
const evaluation = evaluateMechanism(plan);
const compilerPaths = ['scripts/mechanism-preview.ts', publisherScript, 'src/mechanism/publish.ts',
  'src/mechanism/plan.ts', 'src/mechanism/state.ts', 'src/mechanism/visual.ts', 'src/mechanism/xml.ts'];
const compiler = await Promise.all(compilerPaths.map(async path => ({
  path, sha256: sha256(await boundedFile(resolve(import.meta.dirname, '..', path))),
})));
const payloads = new Map<string, Buffer | string>();
payloads.set('sidecar.json', sidecar);
payloads.set('trace.json', JSON.stringify(evaluation, null, 2));
for (const [index, beat] of evaluation.timeline.entries()) {
  const frames: [string, number][] = [['start', beat.start], ['end', beat.end - 1]];
  if (beat.event.kind === 'conditional-add' && beat.event.count > 1) {
    frames.push(['first-check', beat.start + beat.event.atMs]);
  }
  for (const [label, time] of frames) {
    payloads.set(`beat-${String(index + 1).padStart(3, '0')}-${label}.svg`, mechanismSvg(plan, evaluation, time));
  }
}
const files = [...payloads].map(([name, bytes]) => ({name, sha256: sha256(bytes)}));
payloads.set('manifest.json', JSON.stringify({sidecarHash, binding: plan.binding,
  sourceOrigin, compiler, files, scope: 'silent mechanism SVG preview; pending review', fixedPointScale: 10000}, null, 2),
);
await publishMechanism(output, payloads);
