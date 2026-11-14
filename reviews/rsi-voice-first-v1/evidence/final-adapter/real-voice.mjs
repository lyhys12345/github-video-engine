import {strict as assert} from 'node:assert';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, readdir, stat, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {ArtifactStore} from 'file:///D:/gve-flagship-publish/src/assets/store.ts';
import {TaskRunner} from 'file:///D:/gve-flagship-publish/src/orchestrator/tasks.ts';
import {EngineError} from 'file:///D:/gve-flagship-publish/src/core/errors.ts';
import {generatePublicVoice, readPublicVoiceGeneration} from 'file:///D:/gve-flagship-publish/src/tts/qwen-public.ts';
import {generateLocalChen} from 'file:///D:/gve-flagship-publish/src/tts/local-chen.ts';
import {readLocalTts} from 'file:///D:/gve-flagship-publish/src/tts/runtime.ts';

const root = dirname(fileURLToPath(import.meta.url));
const runtime = join(root, 'runtime');
const publicProfile = 'D:/gve-anna-render-temp/public-voice-20261113/qwen-public-profile.json';
const annaProfile = 'D:/gve-flagship-publish/work/local-anna-profile.json';
const publicText = '新的请求已经到达。我们先核对输入，再检查处理结果，最后把确认的信息交给下一步。';
const originalPublicSha = 'fcafb9ae49253debc8a45385ce3d837a68f744e9f66f82cdf7ae196eadc495ae';
const auditions = [
  {name: 'anna-a', text: '把项目链接发给它，先看看脚本。确认没问题，再生成视频。'},
  {name: 'anna-b', text: '把项目链接发给它，先看看脚本，确认没问题再生成视频。'},
];
const ffmpeg = process.env.GVE_EVIDENCE_FFMPEG;
const ffprobe = process.env.GVE_EVIDENCE_FFPROBE;
assert(ffmpeg && ffprobe);
process.env.TEMP = runtime;
process.env.TMP = runtime;
process.env.GVE_QWEN_PUBLIC_PROFILE = resolve(publicProfile);
process.env.GVE_ANNA_PROFILE = resolve(annaProfile);
delete process.env.PROCESSOR_ARCHITECTURE;

const trial = process.argv[2];
assert(['public', 'anna', 'abort'].includes(trial));
let phase = 'preflight';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = async path => hash(await readFile(path));
const now = () => new Date().toISOString();
const check = (condition, message) => { if (!condition) throw new Error(message); };
const exists = async path => stat(path).then(() => true, error => error.code === 'ENOENT' ? false : Promise.reject(error));
const writeEvidence = (name, value) => writeFile(join(root, name + '.json'), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const say = (name, message) => console.log(JSON.stringify({at: now(), name, message}));
const freshSignal = () => new AbortController().signal;

async function timed(operation) {
  const start = performance.now();
  const value = await operation();
  return {value, wallSeconds: (performance.now() - start) / 1000};
}

function verifyAudio(path) {
  const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,channels,sample_rate,duration', '-of', 'json', path], {
    encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  check(probe.status === 0, 'FFprobe failed');
  const [stream] = JSON.parse(probe.stdout).streams;
  check(stream.codec_name === 'pcm_s16le' && stream.channels === 1 && stream.sample_rate === '16000', 'Unexpected WAV format');
  const decode = spawnSync(ffmpeg, ['-v', 'error', '-xerror', '-nostdin', '-i', path, '-f', 'null', '-'], {
    encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  check(decode.status === 0, 'FFmpeg full decode failed');
  return {format: stream.codec_name, channels: stream.channels, sampleRate: Number(stream.sample_rate),
    durationSeconds: Number(stream.duration), fullDecodeExit: decode.status};
}

async function taskProof(data, id) {
  const reader = new TaskRunner(data, {readOnly: true});
  try {
    const task = reader.get(id);
    check(task?.state === 'succeeded' && task.outputs.length === 1 && task.result, 'Incomplete task');
    const usage = reader.db.prepare('SELECT phase, attempt FROM usage_events WHERE task_id=? ORDER BY seq').all(id);
    const [audio] = task.outputs;
    await reader.artifacts.verify(audio);
    await reader.artifacts.verify(task.result);
    const wavPath = reader.artifacts.path(audio);
    return {kind: task.kind, attempt: task.attempt, usage, audioSha256: audio.sha256, resultSha256: task.result.sha256, wavPath,
      audio: verifyAudio(wavPath), workerSha256: task.input.workerSha256 ?? task.input.voice?.workerSha256, endedAt: task.finishedAt};
  } finally {
    reader.close();
  }
}

async function cleanupProof(data) {
  const tmp = join(data, 'tmp');
  return {taskTmpEntries: await exists(tmp) ? await readdir(tmp) : [], ownedRuntimeEntries: await readdir(runtime)};
}

async function publicRun() {
  phase = 'public-generation';
  const data = join(root, 'p');
  if (!process.argv.includes('--retry')) check(!await exists(data), 'Public state already exists');
  say('public', 'Starting real public Qwen first generation with the scrubbed worker environment');
  const generated = await timed(() => generatePublicVoice(publicText, 'zh-CN', data, freshSignal()));
  const {generation} = generated.value;
  check(generation.cached === false, 'Expected public cache miss');
  phase = 'public-cache-repeat';
  const repeat = await timed(() => generatePublicVoice(publicText, 'zh-CN', data, freshSignal()));
  check(repeat.value.generation.cached === true && repeat.value.generation.taskId === generation.taskId, 'Expected exact public cache replay');
  const checked = await readPublicVoiceGeneration(data, generation.taskId, freshSignal());
  const proof = await taskProof(data, generation.taskId);
  check(proof.resultSha256 === checked.manifestSha256 && proof.audioSha256 === hash(checked.wav), 'Public task output disagrees with verified readback');
  const phases = proof.usage.map(entry => entry.phase).join(',');
  const expectedPhases = 'started,terminal,'.repeat(proof.attempt) + 'cache_hit';
  check(phases === expectedPhases && proof.attempt <= 2, 'Unexpected public run/cache count');
  const cleanup = await cleanupProof(data);
  check(cleanup.taskTmpEntries.length === 0 && cleanup.ownedRuntimeEntries.length === 0, 'Public runtime residue');
  await writeEvidence('public-adapter', {
    taskId: generation.taskId, language: 'zh-CN', textSha256: hash(publicText), engineWorkerEnvironmentIncludesProcessorArchitecture: false,
    firstCached: false, firstWallSeconds: generated.wallSeconds, repeatCached: true, repeatWallSeconds: repeat.wallSeconds,
    sameWavAsOriginalProfiledWorker: proof.audioSha256 === originalPublicSha, cleanup, ...proof,
  });
  say('public', 'Generation, exact cache replay, full media decode and cleanup verified');
}

async function annaRun() {
  const data = join(root, process.argv.includes('--new-anna-state') ? 'a-normal' : 'a');
  if (!process.argv.includes('--retry')) check(!await exists(data), 'Anna state already exists');
  const profileBefore = await fileHash(annaProfile);
  const withoutPunctuation = text => text.replace(/\p{P}/gu, '');
  check(withoutPunctuation(auditions[0].text) === withoutPunctuation(auditions[1].text), 'Auditions do not use identical words');
  const summary = [];
  for (const item of auditions) {
    phase = item.name;
    say(item.name, 'Starting local Anna audition');
    const generated = await timed(() => generateLocalChen(item.text, data, freshSignal(), 'anna-local'));
    const {generation, imported} = generated.value;
    check(generation.cached === false && imported.cached === false, 'Expected new generation and import receipt');
    const proof = await taskProof(data, generation.taskId);
    const receipt = await readLocalTts(data, imported.fingerprint);
    const store = new ArtifactStore(data);
    await store.verify(receipt.receiptArtifact);
    const cleanup = await cleanupProof(data);
    check(cleanup.taskTmpEntries.length === 0 && cleanup.ownedRuntimeEntries.length === 0, 'Anna runtime residue');
    const result = {name: item.name, text: item.text, testOnly: true, listenerReview: 'pending', playbackRate: 1,
      taskId: generation.taskId, generationWallSeconds: generated.wallSeconds, ttsFingerprint: imported.fingerprint,
      ttsReceiptSha256: receipt.receiptArtifact.sha256, publishedArtifactMatchesGeneration: receipt.receipt.artifact.sha256 === proof.audioSha256,
      modelRevision: generation.manifest.input.voice.modelRevision, profileSha256: profileBefore, cleanup, ...proof};
    check(result.publishedArtifactMatchesGeneration, 'Anna import audio does not match generation');
    await writeEvidence(item.name, result);
    summary.push(result);
    say(item.name, 'Generation, local receipt, full media decode and cleanup verified');
  }
  check(await fileHash(annaProfile) === profileBefore, 'Anna profile changed on disk');
  check(summary[0].workerSha256 === summary[1].workerSha256 && summary[0].modelRevision === summary[1].modelRevision,
    'Anna audition generation identity mismatch');
  const [a, b] = summary;
  await writeEvidence('anna-comparison', {testOnly: true, playbackRate: 1, sameWords: true, seed: 42, profileUnchanged: true,
    shortenedByPunctuationSeconds: a.audio.durationSeconds - b.audio.durationSeconds, review: 'pending',
    samples: summary.map(item => ({name: item.name, text: item.text, durationSeconds: item.audio.durationSeconds, wavPath: item.wavPath,
      taskId: item.taskId, wavSha256: item.audioSha256, receiptSha256: item.ttsReceiptSha256}))});
}

async function abortRun() {
  phase = 'public-cancellation';
  const data = join(root, 'c');
  check(!await exists(data), 'Cancellation state already exists');
  const control = new AbortController();
  const reason = new EngineError('CANCELLED', 'Test-only active public worker cancellation', 'cancelled');
  let handle;
  let workerDetected = false;
  let abortStarted = 0;
  let monitorError;
  async function watch() {
    try {
      for (const name of await readdir(runtime)) {
        if (!name.startsWith('gve-final-') || name.endsWith('.owner')) continue;
        if (await exists(join(runtime, name, 'request.json')) && !workerDetected) {
          workerDetected = true;
          clearInterval(handle);
          setTimeout(() => { abortStarted = performance.now(); control.abort(reason); }, 300);
        }
      }
    } catch (error) {
      monitorError = error;
      clearInterval(handle);
      control.abort(reason);
    }
  }
  handle = setInterval(() => { void watch(); }, 75);
  try {
    await assert.rejects(generatePublicVoice(publicText, 'zh-CN', data, control.signal), error => error === reason);
  } finally {
    clearInterval(handle);
  }
  check(!monitorError && workerDetected && abortStarted > 0, 'Did not observe active public worker');
  const cleanup = await cleanupProof(data);
  check(cleanup.taskTmpEntries.length === 0 && cleanup.ownedRuntimeEntries.length === 0, 'Cancellation left runtime residue');
  const reader = new TaskRunner(data, {readOnly: true});
  try {
    const [task] = reader.list();
    check(task?.state === 'cancelled' && task.outputs.length === 0 && !task.result, 'Cancelled task unexpectedly has a result');
    await writeEvidence('public-cancellation', {taskId: task.id, state: task.state, observedWorkerRequest: workerDetected,
      abortToRejectionMs: performance.now() - abortStarted, cleanup, outputCount: task.outputs.length});
  } finally {
    reader.close();
  }
  say('public-cancellation', 'Cancellation and cleanup verified');
}

try {
  if (trial === 'public') await publicRun();
  if (trial === 'anna') await annaRun();
  if (trial === 'abort') await abortRun();
} catch (error) {
  const failure = {failedAt: now(), trial, phase, type: error.name, code: error.code ?? 'EVIDENCE_ASSERTION',
    message: trial === 'anna' ? 'See local task status for diagnostic details' : error.message};
  await writeEvidence(trial + (process.argv.includes('--retry') ? '-retry-failure' : '-failure'), failure);
  console.error(JSON.stringify(failure));
  process.exitCode = 1;
}
