import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdtemp, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {cleanupOwnedRuntimeTmp, createOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import {UsageTaskSchema} from '../operations/usage.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {projectRoot} from '../providers/local.js';
import {ancestors, boundedFile, preflightStatePath, readTask} from '../story-planner/runtime.js';
import {compositionLanguages, publicVoicePresets, type CompositionLanguage} from '../workflow/narration-voice-policy.js';
import {measureHuihuiWav} from './huihui.js';

const KIND = 'qwen-public-generation-v1';
const REPOSITORY = 'Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice';
const REVISION = '85e237c12c027371202489a0ec509ded67b5e4b5';
const CONFIG = join(projectRoot, 'config', 'public-voice-v1');
const MAX_WAV = 2_000_000;
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Language = z.enum(compositionLanguages);
const Speaker = z.enum(['Serena', 'Ryan']);
const localWindowsPath = (path: string) => /^[A-Za-z]:\\/.test(path) && resolve(path) === path && !/[\u0000-\u001f]/.test(path);
const AbsolutePath = z.string().refine(localWindowsPath);
const Profile = z.strictObject({
  schemaVersion: z.literal('qwen-public-local/1.0'), pythonPath: AbsolutePath, modelPath: AbsolutePath,
});
const ModelLock = z.strictObject({
  schemaVersion: z.literal('qwen-public-model-lock/1.0'), repository: z.literal(REPOSITORY),
  revision: z.literal(REVISION), license: z.literal('Apache-2.0'),
  files: z.array(z.strictObject({
    path: z.string().regex(/^(?:speech_tokenizer\/)?[a-z_.]+\.(?:json|safetensors|txt)$/).refine(path => !path.includes('..')),
    bytes: z.number().int().positive(), sha256: Hash,
  })).length(11),
}).refine(lock => new Set(lock.files.map(file => file.path)).size === lock.files.length);
const Input = z.strictObject({
  text: z.string().refine(text => text.trim() && [...text].length <= 120 && !/[\p{C}\p{Zl}\p{Zp}]/u.test(text)),
  language: Language, speaker: Speaker,
  repository: z.literal(REPOSITORY), revision: z.literal(REVISION), license: z.literal('Apache-2.0'),
  modelLockSha256: Hash, requirementsSha256: Hash, workerSha256: Hash, pythonSha256: Hash,
}).refine(input => publicVoicePresets[input.language] === input.speaker);
type Input = z.infer<typeof Input>;
const Probe = z.strictObject({
  status: z.literal('ready'), python: z.string().regex(/^3\.12\.\d+$/), gpu: z.string().min(1).max(200),
  capability: z.tuple([z.number().int().positive(), z.number().int().nonnegative()]), cuda: z.literal('12.8'),
});
const WorkerOutput = z.strictObject({
  speaker: Speaker, sampleRate: z.literal(16_000), samples: z.number().int().positive(),
});
const fail = (code: string, message: string): never => {throw new EngineError(code, message);};

function matchingEntries(actual: string[], expected: string[]) {
  return canonical(actual.sort()) === canonical(expected.sort());
}

async function hashFile(path: string, signal: AbortSignal, expectedBytes?: number) {
  await ancestors(dirname(path));
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size < 1 ||
      (expectedBytes !== undefined ? before.size !== expectedBytes : before.size > 32_000_000)) {
    return fail('PUBLIC_VOICE_MODEL', 'A public voice input is missing, linked, or has an unexpected byte length.');
  }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path, {signal})) hash.update(chunk);
  const after = await lstat(path);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino || after.isSymbolicLink()) {
    return fail('PUBLIC_VOICE_MODEL', 'A public voice input changed during verification.');
  }
  return hash.digest('hex');
}

async function prepareIdentity(signal: AbortSignal) {
  checkAbort(signal);
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    return fail('PUBLIC_VOICE_PLATFORM', 'The public Qwen adapter currently needs Windows x64 and NVIDIA CUDA.');
  }
  let profile: z.infer<typeof Profile>;
  try {
    const profilePath = resolve(process.env.GVE_QWEN_PUBLIC_PROFILE ?? join(projectRoot, 'work', 'qwen-public-profile.json'));
    if (!localWindowsPath(profilePath)) throw new Error('Expected a local Windows profile path.');
    profile = Profile.parse(JSON.parse((await boundedFile(profilePath, 8_000)).toString('utf8')));
  } catch {
    return fail('PUBLIC_VOICE_PROFILE', 'Prepare the public voice profile with scripts/prepare-public-voice.py.');
  }
  const [modelLock, requirements, worker] = await Promise.all([
    boundedFile(join(CONFIG, 'model-lock.json'), 8_000),
    boundedFile(join(CONFIG, 'requirements-windows.txt'), 64_000),
    boundedFile(join(projectRoot, 'scripts', 'qwen-public-voice.py'), 32_000),
  ]);
  const lock = ModelLock.parse(JSON.parse(modelLock.toString('utf8')));
  let pythonSha256: string;
  try {
    pythonSha256 = await hashFile(profile.pythonPath, signal);
  } catch {
    checkAbort(signal);
    return fail('PUBLIC_VOICE_PROFILE', 'The prepared public voice Python executable is missing, linked, or invalid.');
  }
  return {profile, worker, requirements, lock, identity: {
    repository: lock.repository, revision: lock.revision, license: lock.license,
    modelLockSha256: sha256(modelLock), requirementsSha256: sha256(requirements), workerSha256: sha256(worker), pythonSha256,
  }};
}

type Prepared = Awaited<ReturnType<typeof prepareIdentity>>;

async function verifyModel({profile, lock}: Prepared, signal: AbortSignal) {
  checkAbort(signal);
  try {
    const tokenizer = join(profile.modelPath, 'speech_tokenizer');
    await ancestors(tokenizer);
    if (!matchingEntries(await readdir(profile.modelPath), [...new Set(lock.files.map(file => file.path.split('/')[0]!))]) ||
        !matchingEntries(await readdir(tokenizer), lock.files.flatMap(file => file.path.includes('/') ? [file.path.split('/')[1]!] : []))) {
      return fail('PUBLIC_VOICE_MODEL', 'The public model directory must contain exactly the locked model data files.');
    }
    for (const file of lock.files) {
      if (await hashFile(join(profile.modelPath, ...file.path.split('/')), signal, file.bytes) !== file.sha256) {
        return fail('PUBLIC_VOICE_MODEL', 'The public model SHA-256 does not match the locked revision.');
      }
    }
  } catch (error) {
    checkAbort(signal);
    if (error instanceof EngineError && error.code === 'PUBLIC_VOICE_MODEL') throw error;
    return fail('PUBLIC_VOICE_MODEL', 'The public model directory is missing, linked, or unreadable.');
  }
}

async function runWorker(prepared: Prepared, work: string, signal: AbortSignal, input?: Input) {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !isAbsolute(systemRoot)) return fail('PUBLIC_VOICE_RUNTIME', 'Windows system root is unavailable.');
  await Promise.all([
    writeFile(join(work, 'worker.py'), prepared.worker, {flag: 'wx'}),
    writeFile(join(work, 'requirements.txt'), prepared.requirements, {flag: 'wx'}),
  ]);
  if (input) {
    await writeFile(join(work, 'request.json'), canonical({text: input.text, language: input.language,
      modelPath: prepared.profile.modelPath}), {flag: 'wx'});
  }
  let output: string;
  try {
    output = await command(prepared.profile.pythonPath, ['-B', '-I', 'worker.py', ...(input ? [] : ['--probe'])], {
      cwd: work, signal, timeout: input ? 300_000 : 120_000, inheritEnv: false,
      env: {SystemRoot: systemRoot, WINDIR: systemRoot, PATH: join(systemRoot, 'System32'),
        TEMP: work, TMP: work, HF_HOME: join(work, 'hf'), NUMBA_CACHE_DIR: work, HF_HUB_OFFLINE: '1',
        TRANSFORMERS_OFFLINE: '1', HF_HUB_DISABLE_TELEMETRY: '1'},
    });
  } catch (error) {
    checkAbort(signal);
    if (error instanceof EngineError && error.code === 'TIMEOUT') {
      throw new EngineError('PUBLIC_VOICE_TIMEOUT', 'Public voice worker exceeded its bounded deadline.', 'retryable');
    }
    throw new EngineError('PUBLIC_VOICE_RUNTIME', input
      ? 'Local public speech generation failed. Check the pinned Python/CUDA environment and scene text.'
      : 'The pinned Python/CUDA environment failed the public voice readiness probe.', 'retryable');
  }
  try {
    return JSON.parse(output.trim().split(/\r?\n/).at(-1)!);
  } catch {
    return fail('PUBLIC_VOICE_RUNTIME', 'The public voice worker returned invalid metadata.');
  }
}

export async function probePublicVoice(signal: AbortSignal) {
  const prepared = await prepareIdentity(signal);
  await verifyModel(prepared, signal);
  const work = await mkdtemp(join(tmpdir(), 'gve-public-voice-'));
  try {
    const worker = Probe.safeParse(await runWorker(prepared, work, signal));
    if (!worker.success) return fail('PUBLIC_VOICE_RUNTIME', 'The public voice runtime returned invalid readiness metadata.');
  } finally {
    await rm(work, {recursive: true, force: true});
  }
}

function manifestFor(input: Input, taskId: string, wav: Buffer) {
  let measured: ReturnType<typeof measureHuihuiWav>;
  try {measured = measureHuihuiWav(wav);} catch {
    return fail('PUBLIC_VOICE_AUDIO', 'Expected bounded non-silent 16 kHz mono PCM WAV from the public voice worker.');
  }
  return {
    schemaVersion: 'qwen-public-generation/1.0' as const, taskId, input, textSha256: sha256(input.text),
    voiceLabel: 'Qwen3-TTS 0.6B CustomVoice / ' + input.speaker + ' / ' + input.language,
    audio: {mediaType: 'audio/wav' as const, sha256: sha256(wav), bytes: wav.length, ...measured},
    origin: 'built-in public speaker preset; no reference audio',
    engineRemoteDispatch: 'none',
    networkControls: 'local model path, offline flags, Python socket audit hook',
    review: {speechContent: 'unverified', speechAlignment: 'unverified', ownerListening: 'pending'},
  };
}

export async function readPublicVoiceGeneration(data: string, id: string, signal: AbortSignal) {
  checkAbort(signal);
  const task = await readTask(data, Hash.parse(id), KIND);
  const input = Input.parse(task.input);
  const artifact = task.outputs[0], result = task.result;
  if (task.state !== 'succeeded' || !artifact || !result || task.outputs.length !== 1 ||
      artifact.mediaType !== 'audio/wav' || result.mediaType !== 'application/json' ||
      artifact.inputFingerprint !== id || result.inputFingerprint !== id) {
    return fail('PUBLIC_VOICE_INTEGRITY', 'Expected complete public voice generation bound to its task.');
  }
  const store = new ArtifactStore(data);
  const [wav, manifestBytes] = await Promise.all([
    boundedFile(store.path(artifact), MAX_WAV), boundedFile(store.path(result), 16_000),
  ]);
  const manifest = manifestFor(input, id, wav);
  if (manifest.audio.bytes !== artifact.bytes || manifest.audio.sha256 !== artifact.sha256 ||
      manifestBytes.length !== result.bytes || sha256(manifestBytes) !== result.sha256 ||
      canonical(manifest) !== manifestBytes.toString('utf8') ||
      sha256(canonical({version: 'production-task-v1', kind: KIND, input})) !== id) {
    return fail('PUBLIC_VOICE_INTEGRITY', 'Public generation input, manifest, or audio integrity check failed.');
  }
  checkAbort(signal);
  return {manifest, manifestBytes, manifestSha256: result.sha256, wav};
}

async function hasCommittedGeneration(data: string, id: string) {
  try {
    const task = UsageTaskSchema.parse(await readTask(data, id, KIND));
    return task.state === 'succeeded';
  } catch (error) {
    if (error instanceof EngineError && error.code === 'EXPLAIN_TASK') return false;
    // Leave legacy state migration and version enforcement to TaskRunner after verification.
    if (error instanceof EngineError && error.code === 'EXPLAIN_STATE' &&
        error.message === 'Unsupported task state version') return false;
    throw error;
  }
}

export async function generatePublicVoice(text: string, language: CompositionLanguage, data: string, signal: AbortSignal) {
  checkAbort(signal);
  if (!text.trim() || [...text].length > 120 || /[\p{C}\p{Zl}\p{Zp}]/u.test(text)) {
    return fail('PUBLIC_VOICE_INPUT', 'Use one line of public narration with at most 120 Unicode code points.');
  }
  const prepared = await prepareIdentity(signal);
  const input = Input.parse({text, language, speaker: publicVoicePresets[language], ...prepared.identity});
  const id = sha256(canonical({version: 'production-task-v1', kind: KIND, input}));
  data = resolve(data);
  preflightStatePath(data);
  await ancestors(join(data, 'tmp'));
  await ancestors(join(data, 'artifacts'));
  let hasTaskDatabase = false;
  for (const name of ['tasks.sqlite', 'tasks.sqlite-wal', 'tasks.sqlite-shm', 'tasks.sqlite-journal']) {
    const stat = await lstat(join(data, name)).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (stat && (!stat.isFile() || stat.isSymbolicLink())) return fail('PUBLIC_VOICE_STATE', 'Expected ordinary task database files.');
    if (name === 'tasks.sqlite') hasTaskDatabase = stat !== undefined;
  }
  // TaskRunner checks success before the attempt limit, so a replay-only call
  // can refuse to claim work if the successful task disappears.
  const replayOnly = hasTaskDatabase && await hasCommittedGeneration(data, id);
  if (!replayOnly) await verifyModel(prepared, signal);
  checkAbort(signal);
  const runner = new TaskRunner(data);
  try {
    const task = await runner.run(KIND, input, async (directory, active) => {
      if (replayOnly) return fail('PUBLIC_VOICE_STATE', 'The committed public voice task changed before replay.');
      const work = (await createOwnedRuntimeTmp(directory)).directory;
      const output = WorkerOutput.safeParse(await runWorker(prepared, work, active, input));
      const wav = await boundedFile(join(work, 'speech.wav'), MAX_WAV);
      const manifest = manifestFor(input, id, wav);
      if (!output.success || output.data.speaker !== input.speaker ||
          output.data.samples !== manifest.audio.samples) {
        return fail('PUBLIC_VOICE_AUDIO', 'Public voice worker metadata differs from the selected preset or WAV bytes.');
      }
      checkAbort(active);
      const audio = await runner.artifacts.commit(wav, 'audio/wav', 'RESOLVE_ASSETS', id);
      return {value: manifest, outputs: [audio]};
    }, signal, {attempts: replayOnly ? 0 : 2, timeoutMs: 330_000, beforeDiscardTemporary: cleanupOwnedRuntimeTmp,
      accounting: {provider: 'qwen-public', ratePolicy: 'local-zero-v1'}});
    const checked = await readPublicVoiceGeneration(data, id, signal);
    return {generation: {taskId: id, cached: task.cached, manifest: checked.manifest}};
  } finally {
    runner.close();
  }
}