import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import {performance} from 'node:perf_hooks';
import {join, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const [mode, stateArg, repeatCount = '5'] = process.argv.slice(2);
const state = resolve(stateArg);
const profile = JSON.parse(await readFile(process.env.GVE_QWEN_PUBLIC_PROFILE, 'utf8'));
const modelPath = resolve(profile.modelPath) + sep;
const nativeRead = fs.createReadStream;
let modelStreamCount, modelBytes, modelHashWindowMs, firstModelStreamAt;
fs.createReadStream = function (path, ...args) {
  const stream = nativeRead.call(this, path, ...args);
  if (typeof path === 'string' && resolve(path).startsWith(modelPath)) {
    modelStreamCount++;
    firstModelStreamAt ??= performance.now();
    stream.on('end', () => {
      modelBytes += stream.bytesRead;
      modelHashWindowMs = performance.now() - firstModelStreamAt;
    });
  }
  return stream;
};
syncBuiltinESMExports();
const {generatePublicVoice, readPublicVoiceGeneration} = await import(pathToFileURL(join(process.cwd(), 'src/tts/qwen-public.ts')).href);
const {sha256} = await import(pathToFileURL(join(process.cwd(), 'src/core/util.ts')).href);
console.log(JSON.stringify({benchmark: mode, count: Number(repeatCount), state, node: process.version,
  measuredAdapterSha256: sha256(await readFile(join(process.cwd(), 'src/tts/qwen-public.ts')))}));
const id = '48f1df1174dc5b435703864f41a117d716503d84714ad7c1afc492a1561f304f';
const wavSha256 = '76f55f68788a26b5417600b144bf7c46c0c0383bad8e568b30482534b9326408';
const manifestSha256 = '83aca4afb1a9e9323a145f104e73cd64bb290c1d604236a3bc8a3dfd4dd8ed70';
const repeats = [];
for (let i = 0; i < Number(repeatCount); i++) {
  modelStreamCount = modelBytes = modelHashWindowMs = 0;
  firstModelStreamAt = undefined;
  const started = performance.now();
  const signal = AbortSignal.timeout(60000);
  const {generation} = await generatePublicVoice('A request arrives.', 'en-US', state, signal);
  const elapsedMs = performance.now() - started;
  assert.equal(generation.taskId, id);
  assert.equal(generation.cached, true);
  assert.equal(generation.manifest.audio.sha256, wavSha256);
  const checkedStarted = performance.now();
  const checked = await readPublicVoiceGeneration(state, generation.taskId, signal);
  const standaloneReceiptCheckMs = performance.now() - checkedStarted;
  assert.equal(sha256(checked.wav), wavSha256);
  assert.equal(checked.manifestSha256, manifestSha256);
  const data = {iteration: i + 1, elapsedMs, modelStreamCount, modelBytes, modelHashWindowMs,
    standaloneReceiptCheckMs, taskId: generation.taskId, cached: generation.cached, wavSha256, manifestSha256,
    samples: generation.manifest.audio.samples};
  repeats.push(data);
  console.log(JSON.stringify(data));
}
function median(key) {
  const values = repeats.map(data => data[key]).toSorted((left, right) => left - right);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}
if (repeats.length >= 1) console.log(JSON.stringify({summary: mode, medianElapsedMs: median('elapsedMs'),
  medianModelHashWindowMs: median('modelHashWindowMs'), medianStandaloneReceiptCheckMs: median('standaloneReceiptCheckMs')}));
