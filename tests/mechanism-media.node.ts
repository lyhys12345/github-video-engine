import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {prepareFillRulePilot} from '../examples/story-planner-v1/fill-rule-pilot.js';
import {ArtifactStore} from '../src/assets/store.js';
import {EngineError} from '../src/core/errors.js';
import {sha256} from '../src/core/util.js';
import {exportMechanismTask, renderMechanismTask, resumeMechanismTask, statusMechanismTask} from '../src/mechanism/media-task.js';
import {readTask} from '../src/story-planner/runtime.js';

test('real mechanism media resumes, reuses CAS, and exports offline with corruption refusal',
  {skip: process.env.GVE_TEST_MECHANISM_MEDIA !== '1', timeout: 240_000}, async () => {
    const root = await mkdtemp(join(tmpdir(), 'gve-media-'));
    const data = join(root, 'data');
    try {
      const plan = await prepareFillRulePilot(process.cwd(), data, join(root, 'story'));
      const sidecar = Buffer.from(JSON.stringify(plan));
      const stop = new AbortController();
      let id = '';
      let timer: ReturnType<typeof setTimeout> | undefined;
      await assert.rejects(renderMechanismTask(data, sidecar, stop.signal, found => {
        id = found;
        timer = setTimeout(() => stop.abort(new EngineError('CANCELLED', 'Test interruption', 'cancelled')), 150);
      }), /Test interruption/);
      clearTimeout(timer);
      assert.equal((await statusMechanismTask(data, id)).state, 'cancelled');
      await assert.rejects(exportMechanismTask(data, id, join(root, 'premature')), /no committed media/);
      const signal = new AbortController().signal;
      const result = await resumeMechanismTask(data, id, signal);
      assert.equal(result.taskId, id);
      assert.equal(result.cached, false);
      const status = await statusMechanismTask(data, id);
      assert.equal(status.attempt, 2);
      assert.equal((await renderMechanismTask(data, sidecar, signal)).cached, true);
      const output = join(root, 'export');
      const previous = process.env.GVE_BROWSER;
      process.env.GVE_BROWSER = join(root, 'missing-browser.exe');
      try {
        await exportMechanismTask(data, id, output);
      } finally {
        if (previous === undefined) delete process.env.GVE_BROWSER;
        else process.env.GVE_BROWSER = previous;
      }
      const files = await readdir(output);
      assert.ok(files.includes('source-authored-model.txt') && files.includes('preview.mp4'));
      const probe = JSON.parse(await readFile(join(output, 'probe.json'), 'utf8'));
      assert.equal(probe.streams[0].nb_read_frames, '192');
      assert.equal(probe.streams.length, 1);
      const trace = JSON.parse(await readFile(join(output, 'trace.json'), 'utf8'));
      assert.deepEqual(trace.evaluation.trace.map((point: {value: number}) => point.value),
        [50000, 80000, 110000, 110000, 20000]);
      assert.ok(trace.frames.some((frame: {state: {result: string}}) => frame.state.result === 'threshold'));
      const task = await readTask(data, id, 'mechanism-media-preview-v1');
      const media = task.outputs.find(artifact => artifact.mediaType === 'video/mp4')!;
      const bytes = await readFile(join(output, 'preview.mp4'));
      assert.equal(sha256(bytes), media.sha256);
      await assert.rejects(exportMechanismTask(data, id, output), /safe publication failed/);
      assert.equal(sha256(await readFile(join(output, 'preview.mp4'))), media.sha256);
      await writeFile(new ArtifactStore(data).path(media), 'corrupt fixture');
      await assert.rejects(statusMechanismTask(data, id), /corrupt committed artifact/);
      await assert.rejects(exportMechanismTask(data, id, join(root, 'corrupt')), /corrupt committed artifact/);
    } finally {
      await rm(root, {recursive: true, force: true});
    }
  });
