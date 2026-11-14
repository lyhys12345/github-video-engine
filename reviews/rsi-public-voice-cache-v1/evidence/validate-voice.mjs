import assert from 'node:assert/strict';
import {lstat, readdir, readFile, writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {DatabaseSync} from 'node:sqlite';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [mode, baseArg] = process.argv.slice(2);
const base = resolve(baseArg);
const label = process.argv[4] ?? 'candidate';
const state = join(base, label, 'state');
const originalProfilePath = process.env.GVE_QWEN_PUBLIC_PROFILE;
const {generatePublicVoice, probePublicVoice, readPublicVoiceGeneration} = await import(pathToFileURL(join(process.cwd(), 'src/tts/qwen-public.ts')).href);
const {sha256} = await import(pathToFileURL(join(process.cwd(), 'src/core/util.ts')).href);
const originalPath = 'D:/gve-anna-render-temp/public-voice-20261113/tmp/gve-pv-D9qgan/w/state/tasks.sqlite';
const id = '48f1df1174dc5b435703864f41a117d716503d84714ad7c1afc492a1561f304f';
const wavSha256 = '76f55f68788a26b5417600b144bf7c46c0c0383bad8e568b30482534b9326408';
const manifestSha256 = '83aca4afb1a9e9323a145f104e73cd64bb290c1d604236a3bc8a3dfd4dd8ed70';
const signal = () => AbortSignal.timeout(mode === 'fresh' ? 180000 : 60000);
const snapshot = (root = state) => {
  const db = new DatabaseSync(join(root, 'tasks.sqlite'), {readOnly: true});
  try {
    const task = db.prepare('SELECT data FROM tasks WHERE id=?').get(id);
    const counts = db.prepare('SELECT phase, count(*) AS count FROM usage_events WHERE task_id=? GROUP BY phase ORDER BY phase').all(id);
    return {task: task ? JSON.parse(task.data) : undefined, accounting: Object.fromEntries(counts.map(row => [row.phase,row.count])), totalTasks: db.prepare('SELECT count(*) AS count FROM tasks').get().count};
  } finally {db.close();}
};

if (mode === 'snapshot') {
  const current = snapshot();
  console.log(JSON.stringify({mode, ...current}, null, 2));
} else if (mode === 'unavailable') {
  const preRepeat = JSON.parse(await readFile(join(base, label, 'before-repeat.json'), 'utf8'));
  const before = snapshot();
  assert.deepEqual(before.task, preRepeat.task);
  assert.equal(before.totalTasks, preRepeat.totalTasks);
  assert.deepEqual(before.accounting, {...preRepeat.accounting, cache_hit: (preRepeat.accounting.cache_hit ?? 0) + 5});
  const profile = JSON.parse(await readFile(originalProfilePath, 'utf8'));
  const missing = join(base, 'owned-absent-model-for-test');
  await assert.rejects(lstat(missing), {code: 'ENOENT'});
  const invalidProfile = join(base, label, 'missing-model-profile.json');
  await writeFile(invalidProfile, JSON.stringify({...profile,modelPath:missing}), {flag: 'wx'});
  process.env.GVE_QWEN_PUBLIC_PROFILE = invalidProfile;
  try {
    const start = performance.now();
    const {generation} = await generatePublicVoice('A request arrives.', 'en-US', state, signal());
    const cachedElapsedMs = performance.now() - start;
    assert.equal(generation.taskId, id);
    assert.equal(generation.cached, true);
    assert.equal(generation.manifest.audio.sha256, wavSha256);
    const checked = await readPublicVoiceGeneration(state, id, signal());
    assert.equal(sha256(checked.wav), wavSha256);
    assert.equal(checked.manifestSha256, manifestSha256);
    const afterCached = snapshot();
    assert.deepEqual(afterCached.task, before.task);
    assert.deepEqual(afterCached.accounting, {...before.accounting, cache_hit: before.accounting.cache_hit + 1});
    assert.equal(afterCached.totalTasks, before.totalTasks);
    const rejected = [];
    async function rejectsModel(label, call) {
      await assert.rejects(call(), error => {
        if (error.code !== 'PUBLIC_VOICE_MODEL') return false;
        rejected.push({label, code: error.code});
        return true;
      });
    }
    const text = 'This is a test only. A route matches.';
    const emptyState = join(base, label, 'never-created-state');
    await rejectsModel('changed exact text with prior state', () => generatePublicVoice(text, 'en-US', state, signal()));
    await rejectsModel('changed exact text with fresh state', () => generatePublicVoice(text, 'en-US', emptyState, signal()));
    await rejectsModel('public doctor probe', () => probePublicVoice(signal()));
    await assert.rejects(lstat(emptyState), {code:'ENOENT'});
    assert.deepEqual(snapshot(), afterCached);
    console.log(JSON.stringify({mode, taskId: id, cached: true, cachedElapsedMs, wavSha256, manifestSha256,
      unchangedTask: true, attempt: before.task.attempt, accountingBefore: preRepeat.accounting,
      accountingAfterValidModelRepeats: before.accounting, accountingAfterUnavailableModelRepeat: afterCached.accounting,
      rejected, unchangedTotalTasks: before.totalTasks, freshStateCreated: false}, null, 2));
  } finally {process.env.GVE_QWEN_PUBLIC_PROFILE = originalProfilePath;}
} else if (mode === 'fresh') {
  const fresh = join(base, label, process.argv[5] ?? 'fresh-state');
  await assert.rejects(lstat(fresh), {code:'ENOENT'});
  const start = performance.now();
  const text = process.argv[6] ?? 'Test only.';
  const {generation} = await generatePublicVoice(text, 'en-US', fresh, signal());
  const elapsedMs = performance.now() - start;
  assert.equal(generation.cached, false);
  assert.equal(generation.manifest.input.speaker, 'Ryan');
  assert.equal(generation.manifest.input.text, text);
  const checked = await readPublicVoiceGeneration(fresh, generation.taskId, signal());
  const sha = generation.manifest.audio.sha256;
  assert.equal(sha256(checked.wav), sha);
  const tmp = join(fresh, 'tmp');
  assert.deepEqual(await readdir(tmp), []);
  const ownedWorkers = (await readdir(join(base, 'owned-runtime'))).filter(item => item.startsWith('gve-final-'));
  assert.deepEqual(ownedWorkers, []);
  const db = new DatabaseSync(join(fresh, 'tasks.sqlite'), {readOnly:true});
  try {
    const {state: taskState, attempt} = JSON.parse(db.prepare('SELECT data FROM tasks WHERE id=?').get(generation.taskId).data);
    assert.equal(taskState, 'succeeded');
    assert.equal(attempt, 1);
    const receipt = JSON.parse(db.prepare("SELECT data FROM usage_events WHERE task_id=? AND phase='terminal'").get(generation.taskId).data);
    assert.equal(receipt.providerChargeMicros, 0);
    const original = JSON.parse(await readFile(join(base, 'original-state-sha256.json'), 'utf8'));
    assert.equal(sha256(await readFile(originalPath)), original.sha256);
    console.log(JSON.stringify({mode, cached:false, elapsedMs, workerTaskDurationMs: receipt.wallDurationMs,
      measuredAdapterSha256: sha256(await readFile(join(process.cwd(), 'src/tts/qwen-public.ts'))),
      taskId: generation.taskId, mediaPath: join(fresh, 'artifacts', sha.slice(0,2), sha + '.wav'),
      attempt, providerChargeMicros: receipt.providerChargeMicros, manifestSha256: checked.manifestSha256,
      manifest: checked.manifest, originalStateUnchanged: true}, null, 2));
  } finally {db.close();}
} else throw new Error(`Unexpected mode ${mode}`);
