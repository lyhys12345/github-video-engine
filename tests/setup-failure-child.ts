import {rm, writeFile} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import assert from 'node:assert/strict';
import {Engine} from '../src/orchestrator/engine.js';
import {mockOptions, fixture, fixtureDirectory} from './support.js';
const root = resolve(process.argv[2]!);
const engine = new Engine(root, {...mockOptions, afterStage: async (stage) => {
  if (stage !== 'VALIDATE') return;
  const tmp = join(root, 'tmp'); assert.equal(dirname(tmp), root);
  await rm(tmp, {recursive: true, force: true}); await writeFile(tmp, 'Obstruct the next stage setup');
}});
try {
  const job = await engine.submit(await fixture(), fixtureDirectory);
  try { await engine.run(job.id); throw new Error('Setup should have failed'); } catch { /* Inspect persistent state, not the thrown message alone. */ }
  console.log(JSON.stringify(await engine.status(job.id)));
} finally { engine.close(); }
