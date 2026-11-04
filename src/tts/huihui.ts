import {lstat, writeFile} from 'node:fs/promises';
import {release} from 'node:os';
import {isAbsolute, join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {cleanupOwnedRuntimeTmp, createOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {projectRoot} from '../providers/local.js';
import {publishAssetFiles, RECEIPT_PUBLICATION} from '../story-planner/asset-pack.js';
import {ancestors, boundedFile, preflightStatePath, readTask} from '../story-planner/runtime.js';

const KIND = 'windows-winrt-huihui-generation-v1';
const PROVIDER = 'windows-winrt-huihui';
const ATTEMPTS = 3;
const MAX_WAV = 2_000_000;
const SAMPLE_RATE = 16_000;
const MAX_SAMPLES = 30 * SAMPLE_RATE;
const voiceId = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens\\MSTTS_V110_zhCN_HuihuiM';
const voice = {voiceId, language: 'zh-CN'} as const;
export const HUIHUI_VOICE_LABEL = 'Microsoft Huihui / Windows WinRT / zh-CN / technical fixture';
const Text = z.string().min(1).max(240).refine(text =>
  [...text].length <= 120 && /\p{Script=Han}/u.test(text) && !/[\p{C}\p{Zl}\p{Zp}]/u.test(text),
'Use one line of Chinese text of at most 120 Unicode code points.');
export const HuihuiSpec = z.strictObject({schemaVersion: z.literal('tts-huihui/1.0'), text: Text});
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Input = HuihuiSpec.extend({
  provider: z.literal(PROVIDER), voiceId: z.literal(voiceId), language: z.literal('zh-CN'),
  workerSha256: Hash, windowsRelease: z.string().min(1).max(64), arch: z.string().min(1).max(16),
});
type Input = z.infer<typeof Input>;
type Task = Awaited<ReturnType<typeof readTask>>;
const fail = (code: string, message: string): never => {throw new EngineError(code, message);};
const json = (value: unknown) => Buffer.from(canonical(value));

export function measureHuihuiWav(wav: Buffer) {
  const invalid = () => fail('HUIHUI_MEDIA', 'Expected bounded non-silent 16 kHz mono PCM WAV from the fixed WinRT profile.');
  if (wav.length < 44 || wav.length > MAX_WAV || wav.toString('ascii', 0, 4) !== 'RIFF' ||
      wav.readUInt32LE(4) !== wav.length - 8 || wav.toString('ascii', 8, 12) !== 'WAVE' ||
      wav.toString('ascii', 12, 16) !== 'fmt ') return invalid();
  const fmt = wav.readUInt32LE(16);
  if ((fmt !== 16 && fmt !== 18) || wav.readUInt16LE(20) !== 1 || wav.readUInt16LE(22) !== 1 ||
      wav.readUInt32LE(24) !== SAMPLE_RATE || wav.readUInt32LE(28) !== SAMPLE_RATE * 2 ||
      wav.readUInt16LE(32) !== 2 || wav.readUInt16LE(34) !== 16 || (fmt === 18 && wav.readUInt16LE(36) !== 0)) return invalid();
  const data = 20 + fmt;
  if (wav.length < data + 8 || wav.toString('ascii', data, data + 4) !== 'data') return invalid();
  const bytes = wav.readUInt32LE(data + 4), samples = bytes / 2;
  if (bytes !== wav.length - data - 8 || bytes % 2 || samples < 1 || samples > MAX_SAMPLES ||
      !wav.subarray(data + 8).some(byte => byte !== 0)) return invalid();
  return {sampleRate: SAMPLE_RATE, channels: 1, sampleFormat: 's16le' as const, samples, durationSeconds: samples / SAMPLE_RATE};
}

function manifestFor(input: Input, id: string, wav: Buffer) {
  return {schemaVersion: 'tts-huihui-generation/1.0', taskId: id, input, textSha256: sha256(input.text),
    voiceLabel: HUIHUI_VOICE_LABEL, audio: {mediaType: 'audio/wav', sha256: sha256(wav), bytes: wav.length, ...measureHuihuiWav(wav)},
    origin: 'installed Windows WinRT SpeechSynthesizer', engineRemoteDispatch: 'none',
    review: {speechContent: 'unverified', ownerListening: 'pending'}};
}

async function verifyGeneration(data: string, task: Task, signal: AbortSignal) {
  checkAbort(signal);
  const input = Input.parse(task.input);
  const artifact = task.outputs[0], result = task.result;
  if (task.state !== 'succeeded' || !result || !artifact || task.outputs.length !== 1) {
    return fail('HUIHUI_NOT_READY', 'Expected a completed Huihui generation.');
  }
  if (artifact.mediaType !== 'audio/wav' || result.mediaType !== 'application/json' ||
      artifact.inputFingerprint !== task.id || result.inputFingerprint !== task.id) {
    return fail('HUIHUI_INTEGRITY', 'Generation artifacts do not bind the task.');
  }
  const store = new ArtifactStore(data);
  const [wav, manifestBytes] = await Promise.all([
    boundedFile(store.path(artifact), MAX_WAV), boundedFile(store.path(result), 16_000),
  ]);
  if (wav.length !== artifact.bytes || sha256(wav) !== artifact.sha256 ||
      manifestBytes.length !== result.bytes || sha256(manifestBytes) !== result.sha256) {
    return fail('HUIHUI_INTEGRITY', 'Generation artifact bytes are damaged.');
  }
  const manifest = manifestFor(input, task.id, wav);
  if (!json(manifest).equals(manifestBytes)) return fail('HUIHUI_INTEGRITY', 'Generation manifest differs from its input or audio.');
  checkAbort(signal);
  return {manifest, manifestBytes, manifestSha256: result.sha256, wav};
}

export async function readHuihuiGeneration(data: string, id: string, signal: AbortSignal) {
  return verifyGeneration(data, await readTask(data, Hash.parse(id), KIND), signal);
}

export async function statusHuihui(data: string, id: string, signal: AbortSignal) {
  const task = await readTask(data, Hash.parse(id), KIND);
  const expired = task.state === 'running' && task.leaseUntil <= Date.now();
  if (task.state === 'succeeded') {
    const {manifest, manifestSha256} = await verifyGeneration(data, task, signal);
    return {taskId: id, state: task.state, attempt: task.attempt, integrity: 'verified', manifest, manifestSha256};
  }
  return {taskId: id, state: expired ? 'interrupted' : task.state, attempt: task.attempt,
    retryable: task.attempt < ATTEMPTS && (expired || (task.state !== 'running' && task.error?.classification !== 'permanent')),
    error: task.error};
}

export async function exportHuihui(data: string, id: string, out: string, signal: AbortSignal) {
  const {wav, manifestBytes} = await readHuihuiGeneration(data, id, signal);
  return publishAssetFiles(data, id, out, new Map([['speech.wav', wav], ['generation-manifest.json', manifestBytes]]),
    signal, RECEIPT_PUBLICATION);
}

async function generationState(data: string) {
  preflightStatePath(data);
  await ancestors(join(data, 'tmp'));
  await ancestors(join(data, 'artifacts'));
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const info = await lstat(join(data, 'tasks.sqlite' + suffix)).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (info && (!info.isFile() || info.isSymbolicLink())) fail('HUIHUI_STATE', 'Expected ordinary task database files.');
  }
}

async function runWorker(work: string, worker: Buffer, text: string, signal: AbortSignal) {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !isAbsolute(systemRoot)) return fail('HUIHUI_PLATFORM', 'Windows PowerShell is required for Huihui.');
  await writeFile(join(work, 'worker.ps1'), worker, {flag: 'wx'});
  await writeFile(join(work, 'request.json'), json({...voice, text}), {flag: 'wx'});
  let output: string;
  try {
    output = await command(join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', './worker.ps1'], {
        cwd: work, signal, timeout: 30_000, inheritEnv: false,
        env: {SystemRoot: systemRoot, WINDIR: systemRoot, PATH: join(systemRoot, 'System32'), TEMP: work, TMP: work},
      });
  } catch (error) {
    checkAbort(signal);
    if (error instanceof EngineError && error.code === 'TIMEOUT') throw error;
    if (error instanceof EngineError && error.message.includes('HUIHUI_VOICE_UNAVAILABLE')) {
      throw new EngineError('HUIHUI_VOICE_UNAVAILABLE', 'The exact installed WinRT Huihui zh-CN token is unavailable.', 'retryable');
    }
    if (error instanceof EngineError && error.message.includes('HUIHUI_WAV_LIMIT')) {
      return fail('HUIHUI_MEDIA', 'WinRT output exceeded the 2 MB WAV limit.');
    }
    throw new EngineError('HUIHUI_WORKER', 'Local WinRT synthesis failed.', 'retryable');
  }
  let reported: unknown;
  try {reported = JSON.parse(output);} catch {return fail('HUIHUI_WORKER', 'Expected fixed voice metadata from WinRT.');}
  if (canonical(reported) !== canonical(voice)) return fail('HUIHUI_WORKER', 'WinRT reported an unexpected voice or language.');
  return boundedFile(join(work, 'speech.wav'), MAX_WAV);
}

async function prepareHuihuiGeneration(raw: unknown) {
  const spec = HuihuiSpec.parse(raw);
  if (process.platform !== 'win32') return fail('HUIHUI_PLATFORM', 'Huihui generation requires Windows and an installed local WinRT voice.');
  const worker = await boundedFile(join(projectRoot, 'scripts', 'winrt-huihui.ps1'), 32_000);
  const input = Input.parse({...spec, ...voice, provider: PROVIDER, workerSha256: sha256(worker), windowsRelease: release(), arch: process.arch});
  const id = sha256(canonical({version: 'production-task-v1', kind: KIND, input}));
  return {input, worker, id};
}

export async function huihuiGenerationId(raw: unknown) {
  return (await prepareHuihuiGeneration(raw)).id;
}

export async function generateHuihui(raw: unknown, data: string, signal: AbortSignal, onTask?: (id: string) => void) {
  checkAbort(signal);
  const {input, worker, id} = await prepareHuihuiGeneration(raw);
  data = resolve(data);
  await generationState(data);
  const cancellation = new AbortController();
  const abort = () => cancellation.abort(signal.reason instanceof DOMException && signal.reason.name === 'AbortError'
    ? new EngineError('CANCELLED', 'Huihui generation cancelled.', 'cancelled') : signal.reason);
  const runner = new TaskRunner(data);
  signal.addEventListener('abort', abort, {once: true});
  if (signal.aborted) abort();
  try {
    onTask?.(id);
    const task = await runner.run(KIND, input, async (directory, active) => {
      const {directory: work} = await createOwnedRuntimeTmp(directory);
      const wav = await runWorker(work, worker, input.text, active);
      const value = manifestFor(input, id, wav);
      checkAbort(active);
      const artifact = await runner.artifacts.commit(wav, 'audio/wav', 'RESOLVE_ASSETS', id);
      return {value, outputs: [artifact]};
    }, cancellation.signal, {attempts: ATTEMPTS, timeoutMs: 45_000, beforeDiscardTemporary: cleanupOwnedRuntimeTmp,
      accounting: {provider: PROVIDER, ratePolicy: 'local-zero-v1'}});
    const {manifest, manifestSha256} = await readHuihuiGeneration(data, id, signal);
    return {taskId: id, cached: task.cached, state: 'succeeded', manifest, manifestSha256};
  } finally {signal.removeEventListener('abort', abort); runner.close();}
}
