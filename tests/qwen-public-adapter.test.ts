import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, readdir, unlink, utimes, writeFile} from 'node:fs/promises';
import {dirname, join, resolve, sep} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {EngineError} from '../src/core/errors.js';
import {canonical, sha256} from '../src/core/util.js';
import {TASK_SCHEMA_SQL, USAGE_SCHEMA_SQL} from '../src/operations/usage.js';
import {TaskRunner} from '../src/orchestrator/tasks.js';
import {readTask} from '../src/story-planner/runtime.js';
import {generatePublicVoice, probePublicVoice, readPublicVoiceGeneration} from '../src/tts/qwen-public.js';
import {type CompositionLanguage} from '../src/workflow/narration-voice-policy.js';
import {workflowRoot} from './workflow-support.js';

const mocks = vi.hoisted(() => ({worker: vi.fn(), checkout: {root: ''}}));
vi.mock('../src/core/process.js', () => ({command: mocks.worker}));
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {...actual, createReadStream: vi.fn(actual.createReadStream)};
});
vi.mock('../src/story-planner/runtime.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/story-planner/runtime.js')>();
  return {...actual, readTask: vi.fn(actual.readTask), boundedFile(path: string, max?: number) {
    const config = path.replaceAll('\\', '/').match(/(?:^|\/)(config\/public-voice-v1\/[^/]+|scripts\/qwen-public-voice\.py)$/);
    return actual.boundedFile(config ? join(mocks.checkout.root, config[1]!) : path, max);
  }};
});

const repository = 'Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice';
const revision = '85e237c12c027371202489a0ec509ded67b5e4b5';
const modelFiles = [
  'config.json', 'generation_config.json', 'merges.txt', 'model.safetensors', 'preprocessor_config.json',
  'speech_tokenizer/config.json', 'speech_tokenizer/configuration.json', 'speech_tokenizer/model.safetensors',
  'speech_tokenizer/preprocessor_config.json', 'tokenizer_config.json', 'vocab.json',
];
const workerPaths: string[] = [];
const english = 'A request arrives.';
const freshSignal = () => new AbortController().signal;

function speechWav(sample = 1) {
  const wav = Buffer.alloc(44 + 16001 * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16_000, 24);
  wav.writeUInt32LE(32_000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  wav.writeInt16LE(sample, 44);
  return wav;
}

async function write(path: string, bytes: string | Buffer) {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, bytes);
}

async function publicVoiceFixture() {
  const root = await workflowRoot('qwen-adapter');
  const model = join(root, 'model');
  const lock = await Promise.all(modelFiles.map(async path => {
    const bytes = Buffer.from('locked bytes for ' + path);
    await write(join(model, ...path.split('/')), bytes);
    return {path, bytes: bytes.length, sha256: sha256(bytes)};
  }));
  await write(join(root, 'config', 'public-voice-v1', 'model-lock.json'), canonical({
    schemaVersion: 'qwen-public-model-lock/1.0', repository, revision, license: 'Apache-2.0', files: lock,
  }));
  await write(join(root, 'config', 'public-voice-v1', 'requirements-windows.txt'), 'Synthetic requirements fixture');
  await write(join(root, 'scripts', 'qwen-public-voice.py'), 'Synthetic worker fixture');
  const pythonPath = join(root, 'fake-python.exe');
  await write(pythonPath, 'Synthetic executable fixture, intercepted by the worker mock');
  const profilePath = join(root, 'qwen-profile.json');
  await write(profilePath, canonical({schemaVersion: 'qwen-public-local/1.0', pythonPath, modelPath: model}));
  vi.stubEnv('GVE_QWEN_PUBLIC_PROFILE', profilePath);
  mocks.checkout.root = root;
  return {root, model, pythonPath, data: join(root, 'state')};
}

function inspectTasks(data: string) {
  const runner = new TaskRunner(data, {readOnly: true});
  try {return runner.list();} finally {runner.close();}
}

function inspectUsage(data: string) {
  const runner = new TaskRunner(data, {readOnly: true});
  try {return runner.usage();} finally {runner.close();}
}

function modelReads(model: string) {
  return vi.mocked(createReadStream).mock.calls.filter(([path]) => String(path).startsWith(model + sep));
}

type Invocation = {cwd: string; signal: AbortSignal; timeout: number; inheritEnv: boolean; env: NodeJS.ProcessEnv};
function mockWorker(handle: (options: Invocation) => Promise<string>) {
  mocks.worker.mockImplementation(async (_exe: string, _args: string[], options: Invocation) => {
    workerPaths.push(options.cwd);
    return handle(options);
  });
}

function mockSuccessfulWorker() {
  mockWorker(async options => {
    await writeFile(join(options.cwd, 'speech.wav'), speechWav());
    return canonical({speaker: 'Ryan', samples: 16001, sampleRate: 16000});
  });
}

async function assertOwnedCleanup(data: string) {
  expect(await readdir(join(data, 'tmp'))).toEqual([]);
  for (const path of workerPaths) {
    await expect(lstat(path)).rejects.toMatchObject({code: 'ENOENT'});
    await expect(lstat(path + '.owner')).rejects.toMatchObject({code: 'ENOENT'});
  }
}

async function assertNoSpeech(data: string) {
  const rows = inspectTasks(data);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({kind: 'qwen-public-generation-v1', result: null, outputs: []});
  await assertOwnedCleanup(data);
  await expect(lstat(join(data, 'artifacts'))).rejects.toMatchObject({code: 'ENOENT'});
  return rows[0]!;
}

// Use actual model/profile files and TaskRunner/CAS. The locked miniature data and
// mocked process stand in for the trusted worker, local GPU, and substantive speech.
describe.skipIf(process.platform !== 'win32' || process.arch !== 'x64')('public Qwen adapter (mocked Python process)', () => {
  beforeEach(() => {
    mocks.worker.mockReset();
    vi.mocked(createReadStream).mockClear();
    workerPaths.length = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects missing, altered and foreign model data before invoking Python or creating state', async () => {
    const fixture = await publicVoiceFixture();
    const weights = join(fixture.model, 'model.safetensors');
    const original = await readFile(weights);
    await unlink(weights);
    await expect(probePublicVoice(freshSignal())).rejects.toMatchObject({code: 'PUBLIC_VOICE_MODEL'});
    await write(weights, original);
    const config = join(fixture.model, 'config.json');
    const originalConfig = await readFile(config);
    await write(config, Buffer.alloc(originalConfig.length, 65));
    await expect(generatePublicVoice(english, 'en-US', fixture.data, freshSignal()))
      .rejects.toMatchObject({code: 'PUBLIC_VOICE_MODEL'});
    await write(config, originalConfig);
    const foreign = join(fixture.model, 'plugin.py');
    await write(foreign, 'Unexpected file');
    await expect(probePublicVoice(freshSignal())).rejects.toMatchObject({code: 'PUBLIC_VOICE_MODEL'});
    await unlink(foreign);
    await expect(generatePublicVoice(english, 'ja-JP' as CompositionLanguage, fixture.data, freshSignal())).rejects.toBeDefined();
    expect(mocks.worker).not.toHaveBeenCalled();
    await expect(lstat(fixture.data)).rejects.toMatchObject({code: 'ENOENT'});
  });

  it('propagates the bounded process timeout and leaves only a retryable failed task', async () => {
    const fixture = await publicVoiceFixture();
    mockWorker(async () => {throw new EngineError('TIMEOUT', 'Synthetic process timeout', 'retryable');});
    await expect(generatePublicVoice(english, 'en-US', fixture.data, freshSignal()))
      .rejects.toMatchObject({code: 'PUBLIC_VOICE_TIMEOUT', classification: 'retryable'});
    expect(mocks.worker).toHaveBeenCalledWith(fixture.pythonPath, ['-B', '-I', 'worker.py'],
      expect.objectContaining({timeout: 300_000, inheritEnv: false}));
    expect(await assertNoSpeech(fixture.data)).toMatchObject({state: 'failed', error: {code: 'PUBLIC_VOICE_TIMEOUT'}});
  });

  it('cancels in-flight synthesis, deletes partial audio, and records a cancelled task', async () => {
    const fixture = await publicVoiceFixture();
    const control = new AbortController();
    const cancellation = new EngineError('CANCELLED', 'Synthetic user cancellation', 'cancelled');
    mockWorker(async options => {
      await writeFile(join(options.cwd, 'speech.wav'), speechWav());
      control.abort(cancellation);
      expect(options.signal.aborted).toBe(true);
      throw options.signal.reason;
    });
    await expect(generatePublicVoice(english, 'en-US', fixture.data, control.signal)).rejects.toBe(cancellation);
    expect(await assertNoSpeech(fixture.data)).toMatchObject({state: 'cancelled', error: {code: 'CANCELLED'}});
  });

  it.each([
    {label: 'wrong speaker', speaker: 'Serena', samples: 16001, sample: 1},
    {label: 'wrong samples', speaker: 'Ryan', samples: 16002, sample: 1},
    {label: 'silent WAV', speaker: 'Ryan', samples: 16001, sample: 0},
  ])('rejects $label before committing audio', async ({speaker, samples, sample}) => {
    const fixture = await publicVoiceFixture();
    mockWorker(async options => {
      await writeFile(join(options.cwd, 'speech.wav'), speechWav(sample));
      return canonical({speaker, samples, sampleRate: 16000});
    });
    await expect(generatePublicVoice(english, 'en-US', fixture.data, freshSignal()))
      .rejects.toMatchObject({code: 'PUBLIC_VOICE_AUDIO'});
    expect(await assertNoSpeech(fixture.data)).toMatchObject({state: 'failed', error: {code: 'PUBLIC_VOICE_AUDIO'}});
  });

  it('separates exact text and language/preset identities and reuses equal generations', async () => {
    const fixture = await publicVoiceFixture();
    mockWorker(async options => {
      const request = JSON.parse(await readFile(join(options.cwd, 'request.json'), 'utf8'));
      expect(resolve(request.modelPath)).toBe(fixture.model);
      expect(options.env).toMatchObject({HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1'});
      expect(options.env).not.toHaveProperty('ELEVENLABS_API_KEY');
      await writeFile(join(options.cwd, 'speech.wav'), speechWav());
      return canonical({speaker: request.language === 'en-US' ? 'Ryan' : 'Serena', samples: 16001, sampleRate: 16000});
    });
    const first = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    const repeat = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    const changedVoice = (await generatePublicVoice(english, 'zh-CN', fixture.data, freshSignal())).generation;
    const changedText = (await generatePublicVoice('A second request arrives.', 'en-US', fixture.data, freshSignal())).generation;
    expect(first.cached).toBe(false);
    expect(repeat).toEqual({...first, cached: true});
    expect(changedVoice.manifest.input).toMatchObject({speaker: 'Serena', language: 'zh-CN'});
    expect(new Set([first.taskId, changedVoice.taskId, changedText.taskId]).size).toBe(3);
    expect(mocks.worker).toHaveBeenCalledTimes(3);
    await assertOwnedCleanup(fixture.data);
  });

  it('replays the exact committed WAV with no model reads and records a cache receipt', async () => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    const signal = freshSignal();
    const first = (await generatePublicVoice(english, 'en-US', fixture.data, signal)).generation;
    const initial = await readPublicVoiceGeneration(fixture.data, first.taskId, freshSignal());
    const reads = modelReads(fixture.model);
    expect(reads).toHaveLength(modelFiles.length);
    for (const [, options] of reads) {
      expect(options).toHaveProperty('highWaterMark', 1024 * 1024);
      expect(options).toHaveProperty('signal', signal);
    }
    vi.mocked(createReadStream).mockClear();
    await unlink(join(fixture.model, 'model.safetensors'));

    const repeat = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    const checked = await readPublicVoiceGeneration(fixture.data, repeat.taskId, freshSignal());
    expect(repeat).toEqual({...first, cached: true});
    expect(checked.wav.equals(initial.wav)).toBe(true);
    expect(checked.manifestBytes.equals(initial.manifestBytes)).toBe(true);
    expect(modelReads(fixture.model)).toEqual([]);
    expect(mocks.worker).toHaveBeenCalledTimes(1);
    expect(inspectUsage(fixture.data)).toMatchObject({totalAttempts: 1, cacheHits: 1, cacheFailures: 0});
  });

  it('checks same-size and same-mtime model tampering for doctor and new text', async () => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    const first = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    const weights = join(fixture.model, 'model.safetensors');
    const original = await readFile(weights);
    const stamp = new Date('2025-01-01T00:00:00Z');
    await utimes(weights, stamp, stamp);
    const before = await lstat(weights);
    await writeFile(weights, Buffer.alloc(original.length, 65));
    await utimes(weights, stamp, stamp);
    expect(await lstat(weights)).toMatchObject({size: before.size, mtimeMs: before.mtimeMs});

    const repeat = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    expect(repeat).toEqual({...first, cached: true});
    await expect(probePublicVoice(freshSignal())).rejects.toMatchObject({code: 'PUBLIC_VOICE_MODEL'});
    const changed = 'A different request arrives.';
    await expect(generatePublicVoice(changed, 'en-US', fixture.data, freshSignal()))
      .rejects.toMatchObject({code: 'PUBLIC_VOICE_MODEL'});
    expect(mocks.worker).toHaveBeenCalledTimes(1);
    expect(inspectUsage(fixture.data)).toMatchObject({totalAttempts: 1, cacheHits: 1});
    await writeFile(weights, original);
    const repaired = (await generatePublicVoice(changed, 'en-US', fixture.data, freshSignal())).generation;
    expect(repaired.cached).toBe(false);
    expect(inspectTasks(fixture.data).find(task => task.id === repaired.taskId)).toMatchObject({attempt: 1});
  });

  it('retries a missing-model miss after repair without consuming an attempt', async () => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    const weights = join(fixture.model, 'model.safetensors');
    const original = await readFile(weights);
    await unlink(weights);
    await expect(generatePublicVoice(english, 'en-US', fixture.data, freshSignal()))
      .rejects.toMatchObject({code: 'PUBLIC_VOICE_MODEL'});
    await expect(lstat(fixture.data)).rejects.toMatchObject({code: 'ENOENT'});
    expect(mocks.worker).not.toHaveBeenCalled();

    await writeFile(weights, original);
    const repaired = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    expect(repaired.cached).toBe(false);
    expect(inspectTasks(fixture.data)).toMatchObject([{id: repaired.taskId, attempt: 1}]);
  });

  it.each(['audio', 'manifest'] as const)('fails closed on corrupted cached %s', async artifactType => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    await generatePublicVoice(english, 'en-US', fixture.data, freshSignal());
    const task = inspectTasks(fixture.data)[0]!;
    const artifact = artifactType === 'audio' ? task.outputs[0]! : task.result!;
    const blobPath = join(fixture.data, 'artifacts', artifact.storage);
    const damaged = await readFile(blobPath);
    damaged[damaged.length - 1] = damaged[damaged.length - 1]! ^ 1;
    await writeFile(blobPath, damaged);

    await expect(generatePublicVoice(english, 'en-US', fixture.data, freshSignal()))
      .rejects.toMatchObject({code: 'INTEGRITY'});
    expect(mocks.worker).toHaveBeenCalledTimes(1);
    expect(inspectTasks(fixture.data)).toEqual([task]);
    expect(inspectUsage(fixture.data)).toMatchObject({totalAttempts: 1, cacheHits: 0, cacheFailures: 1});
  });

  it('does not start work when a lookup observes a success that the runner cannot find', async () => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    await generatePublicVoice(english, 'en-US', fixture.data, freshSignal());
    const [success] = inspectTasks(fixture.data);
    const empty = join(fixture.root, 'changed-state');
    new TaskRunner(empty).close();
    vi.mocked(readTask).mockResolvedValueOnce(success!);
    vi.mocked(createReadStream).mockClear();

    await expect(generatePublicVoice(english, 'en-US', empty, freshSignal())).rejects.toMatchObject({code: 'RETRY_EXHAUSTED'});
    expect(inspectTasks(empty)).toEqual([]);
    expect(inspectUsage(empty)).toMatchObject({totalAttempts: 0, cacheHits: 0});
    expect(modelReads(fixture.model)).toEqual([]);
    expect(mocks.worker).toHaveBeenCalledTimes(1);
  });

  it('requires a fresh verified generation after the Python executable identity changes', async () => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    const first = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    await writeFile(fixture.pythonPath, 'A different synthetic executable');
    vi.mocked(createReadStream).mockClear();
    const second = (await generatePublicVoice(english, 'en-US', fixture.data, freshSignal())).generation;
    expect(second.cached).toBe(false);
    expect(second.taskId).not.toBe(first.taskId);
    expect(second.manifest.input.pythonSha256).not.toBe(first.manifest.input.pythonSha256);
    expect(modelReads(fixture.model)).toHaveLength(modelFiles.length);
    expect(inspectUsage(fixture.data)).toMatchObject({totalAttempts: 2, cacheHits: 0});
  });

  it('honors cancellation on an exact hit before accounting for replay', async () => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    await generatePublicVoice(english, 'en-US', fixture.data, freshSignal());
    const control = new AbortController();
    const cancellation = new EngineError('CANCELLED', 'Synthetic replay cancellation', 'cancelled');
    const actual = vi.mocked(readTask).getMockImplementation()!;
    vi.mocked(readTask).mockImplementationOnce(async (...args) => {
      const task = await actual(...args);
      control.abort(cancellation);
      return task;
    });

    await expect(generatePublicVoice(english, 'en-US', fixture.data, control.signal)).rejects.toBe(cancellation);
    expect(mocks.worker).toHaveBeenCalledTimes(1);
    expect(inspectUsage(fixture.data)).toMatchObject({totalAttempts: 1, cacheHits: 0});
  });

  it.each([
    {label: 'valid legacy', version: 0, extraSchema: '', accepted: true},
    {label: 'malformed legacy', version: 0, extraSchema: 'CREATE TABLE unexpected(x TEXT);', accepted: false, code: 'USAGE_DB_SCHEMA'},
    {label: 'future version', version: 2, extraSchema: '', accepted: false, code: 'USAGE_DB_VERSION'},
    {label: 'malformed current version', version: 1, extraSchema: 'CREATE TABLE unexpected(x TEXT);', accepted: false, code: 'EXPLAIN_STATE'},
  ])('preserves state version and schema validation for $label', async ({version, extraSchema, accepted, code}) => {
    const fixture = await publicVoiceFixture();
    mockSuccessfulWorker();
    await mkdir(fixture.data);
    const db = new DatabaseSync(join(fixture.data, 'tasks.sqlite'));
    try {
      db.exec(`${TASK_SCHEMA_SQL} ${version === 0 ? '' : USAGE_SCHEMA_SQL} ${extraSchema} PRAGMA user_version=${version}`);
    } finally {
      db.close();
    }
    const generation = generatePublicVoice(english, 'en-US', fixture.data, freshSignal());
    if (accepted) {
      await expect(generation).resolves.toMatchObject({generation: {cached: false}});
      expect(inspectUsage(fixture.data)).toMatchObject({totalAttempts: 1, cacheHits: 0});
      expect(mocks.worker).toHaveBeenCalledTimes(1);
    } else {
      await expect(generation).rejects.toMatchObject({code});
      expect(mocks.worker).not.toHaveBeenCalled();
    }
  });

});
