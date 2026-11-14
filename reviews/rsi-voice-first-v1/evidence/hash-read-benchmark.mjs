import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, readFile, readdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {performance} from 'node:perf_hooks';

const lockPath = 'D:/gve-flagship-publish/config/public-voice-v1/model-lock.json';
const profilePath = 'D:/gve-anna-render-temp/public-voice-20261113/qwen-public-profile.json';
const expectedLockHash = '4951f1df7f2581651052e740594dbabf8c1c20af0cec1c731db5909e173a572a';
const rawLock = await readFile(lockPath);
const lockHash = createHash('sha256').update(rawLock).digest('hex');
if (lockHash !== expectedLockHash) throw new Error('Unexpected model lock');
const lock = JSON.parse(rawLock);
const profile = JSON.parse(await readFile(profilePath, 'utf8'));
const model = profile.modelPath;
const allBytes = lock.files.reduce((size, file) => size + file.bytes, 0);

async function ancestors(path) {
  const current = await lstat(path);
  if (!current.isDirectory() || current.isSymbolicLink()) throw new Error('Invalid model ancestor');
  const parent = dirname(path);
  if (parent !== path) await ancestors(parent);
}

async function hashFile(path, expectedBytes, signal, highWaterMark, state) {
  await ancestors(dirname(path));
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size !== expectedBytes) {
    throw new Error('Unexpected model file metadata');
  }
  const hash = createHash('sha256');
  const options = highWaterMark === undefined ? {signal} : {signal, highWaterMark};
  for await (const chunk of createReadStream(path, options)) {
    hash.update(chunk);
    state.bytes += chunk.length;
    state.chunks += 1;
    state.largestChunk = Math.max(state.largestChunk, chunk.length);
  }
  const after = await lstat(path);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino || after.isSymbolicLink()) {
    throw new Error('Model file changed during verification');
  }
  return hash.digest('hex');
}

function assertNames(actual, expected) {
  if (JSON.stringify(actual.sort()) !== JSON.stringify(expected.sort())) {
    throw new Error('Unexpected names in locked model directory');
  }
}

async function benchmark(name, highWaterMark) {
  const signal = new AbortController().signal;
  const state = {bytes: 0, chunks: 0, largestChunk: 0};
  const begin = performance.now();
  const tokenizer = join(model, 'speech_tokenizer');
  await ancestors(tokenizer);
  assertNames(await readdir(model), [...new Set(lock.files.map(file => file.path.split('/')[0]))]);
  assertNames(await readdir(tokenizer), lock.files.flatMap(file => file.path.includes('/') ? [file.path.split('/')[1]] : []));
  const digests = [];
  for (const file of lock.files) {
    signal.throwIfAborted();
    const sha256 = await hashFile(join(model, ...file.path.split('/')), file.bytes, signal, highWaterMark, state);
    if (sha256 !== file.sha256) throw new Error('Model file digest mismatch: ' + file.path);
    digests.push({file: file.path, sha256});
  }
  const elapsedSeconds = (performance.now() - begin) / 1000;
  const result = {name, ...state, files: digests.length, elapsedSeconds, miBPerSecond: state.bytes / 2**20 / elapsedSeconds, digests};
  console.log(JSON.stringify({...result, digests: undefined}));
  return result;
}

async function verifyAbort(highWaterMark) {
  const state = {bytes: 0, chunks: 0, largestChunk: 0};
  const file = lock.files.find(file => file.path === 'model.safetensors');
  const controller = new AbortController();
  const start = performance.now();
  let abortedAt;
  const timer = setTimeout(() => {
    abortedAt = performance.now();
    controller.abort();
  }, 100);
  try {
    await hashFile(join(model, file.path), file.bytes, controller.signal, highWaterMark, state);
    throw new Error('Cancellation did not stop the read');
  } catch (error) {
    if (error.name !== 'AbortError' || state.bytes >= file.bytes || abortedAt === undefined) throw error;
    return {highWaterMark: highWaterMark ?? 65536, abortCode: error.code, limitMs: 100, elapsedMs: performance.now() - start,
      abortToRejectionMs: performance.now() - abortedAt, ...state};
  } finally {
    clearTimeout(timer);
  }
}

const runs = [];
for (const [name, block] of [
  ['default-1', undefined], ['1MiB-1', 2**20],
  ['default-2', undefined], ['1MiB-2', 2**20],
  ['default-3', undefined], ['1MiB-3', 2**20],
]) {
  runs.push(await benchmark(name, block));
}
const cancellation = [await verifyAbort(undefined), await verifyAbort(2**20)];
console.log(JSON.stringify({cancellation}));
const results = {node: process.version, model: lock.repository, revision: lock.revision, lockHash, allBytes,
  osCache: 'not purged; model recently verified in voice profile and each subsequent run', runs, cancellation};
await writeFile('hash-read-benchmark.json', JSON.stringify(results, null, 2) + '\n', {flag: 'wx'});
