import {dirname, resolve} from 'node:path';
import {ancestors} from '../src/story-planner/runtime.js';
import {publishMechanism, requireMechanismPublisher} from '../src/mechanism/publish.js';
import {prepareReaRulePilot} from '../examples/story-planner-v1/rea-rule-pilot.js';
import {prepareFillRulePilot} from '../examples/story-planner-v1/fill-rule-pilot.js';

const [data, output, sidecar, kind = 'rea'] = process.argv.slice(2);
if (!data || !output || !sidecar || process.argv.length > 6 || !['rea', 'fill'].includes(kind)) {
  throw new Error('Usage: tsx scripts/prepare-rea-rule-pilot.ts STORY_STATE NEW_STORY_DIR NEW_SIDECAR_JSON [rea|fill]');
}
const prepare = kind === 'fill' ? prepareFillRulePilot : prepareReaRulePilot;
requireMechanismPublisher();
await ancestors(dirname(resolve(sidecar)));
const plan = await prepare(process.cwd(), data, output);
await publishMechanism(sidecar, new Map([['sidecar.json', JSON.stringify(plan, null, 2)]]), false);
