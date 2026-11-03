import {writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {ArtifactSchema, type Artifact} from '../contracts/runtime.js';
import {checkAbort} from '../core/errors.js';
import {createOwnedRuntimeTmp, cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, fileHash, sha256} from '../core/util.js';
import {TaskRunner, type TaskRecord} from '../orchestrator/tasks.js';
import {browserPath, ffmpegPath, ffprobePath, projectRoot} from '../providers/local.js';
import {ancestors, boundedFile, preflightStatePath, readTask} from '../story-planner/runtime.js';
import {geometry, prepareMechanismMedia} from './media-spec.js';
import {loadMechanism} from './plan.js';
import {publishMechanism} from './publish.js';

const kind = 'mechanism-media-preview-v1';
const cap = 16_000_000;
const implementation = [
  'media-task.ts', 'media-spec.ts', 'media-worker.ts', 'media-composition.tsx', 'plan.ts', 'state.ts', 'visual.ts', 'xml.ts',
].map(name => 'src/mechanism/' + name).concat(['package.json', 'pnpm-lock.yaml']);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const Result = z.object({
  version: z.literal(kind),
  storyTaskId: hash,
  sidecarHash: hash,
  samples: z.array(z.number().int().min(0).max(geometry.durationInFrames - 1)).min(2).max(geometry.durationInFrames),
  files: z.array(z.object({name: z.string().regex(/^(sidecar\.json|story\.json|trace\.json|probe\.json|preview\.mp4|sample-\d+\.png|source-[a-z][a-z0-9-]{0,63}\.txt)$/),
    artifact: ArtifactSchema}).strict()).min(8).max(210),
}).strict();
type Result = z.infer<typeof Result>;

async function identifyImplementation() {
  return Promise.all(implementation.map(async path => ({path, sha256: sha256(await boundedFile(join(projectRoot, path)))})));
}

export async function renderMechanismTask(data: string, sidecar: Buffer, signal: AbortSignal, onIdentity?: (id: string) => void) {
  data = resolve(data);
  preflightStatePath(data);
  const {plan, snapshot, sidecarHash, sourceOrigin} = await loadMechanism(data, sidecar);
  const model = prepareMechanismMedia(plan);
  const browser = await browserPath();
  const [code, browserHash, ffmpeg, ffprobe] = await Promise.all([
    identifyImplementation(), fileHash(browser), command(ffmpegPath(), ['-version'], {signal}),
    command(ffprobePath(), ['-version'], {signal}),
  ]);
  const input = {version: kind, projectId: snapshot.graph.id, binding: plan.binding, sidecarHash,
    sidecarBase64: sidecar.toString('base64'), sourceOrigin,
    geometry, code, engine: {node: process.version, platform: process.platform, arch: process.arch, browserHash,
      ffmpeg: ffmpeg.split(/\r?\n/)[0], ffprobe: ffprobe.split(/\r?\n/)[0]}};
  const id = sha256(canonical({version: 'production-task-v1', kind, input}));
  onIdentity?.(id);
  const runner = new TaskRunner(data);
  try {
    const completed = await runner.run(kind, input, async (directory, signal) => {
      const workerInput = join(directory, 'worker.json');
      await writeFile(workerInput, canonical({entry: join(projectRoot, 'src/mechanism/media-composition.tsx'),
        browser, props: model.props, samples: model.samples}), {flag: 'wx'});
      const temp = await createOwnedRuntimeTmp(directory);
      try {
        await command(process.execPath, ['--import', 'tsx', join(projectRoot, 'src/mechanism/media-worker.ts'), workerInput],
          {cwd: projectRoot, signal, timeout: 180_000, env: {TEMP: temp.directory, TMP: temp.directory, TMPDIR: temp.directory}});
      } finally {
        await cleanupOwnedRuntimeTmp(directory);
      }
      const raw = join(directory, 'raw.mp4');
      const rawProbe = JSON.parse(await command(ffprobePath(), ['-v', 'error', '-show_streams', '-of', 'json', raw],
        {signal, timeout: 30_000}));
      const rawVideo = rawProbe.streams[0];
      if (rawProbe.streams.length !== 1 || rawVideo.codec_type !== 'video' || rawVideo.codec_name !== 'h264') {
        throw new Error('MECHANISM: expected a silent raw H.264 stream');
      }
      const full = rawVideo.color_range === 'pc' || String(rawVideo.pix_fmt).startsWith('yuvj');
      const media = join(directory, 'preview.mp4');
      await command(ffmpegPath(), ['-v', 'error', '-nostdin', '-n', '-i', raw, '-map', '0:v:0',
        '-vf', full ? 'scale=in_range=pc:out_range=tv,format=yuv420p' : 'format=yuv420p',
        '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
        '-movflags', '+faststart', media], {signal, timeout: 45_000});
      const probe = await command(ffprobePath(), ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', media],
        {signal, timeout: 30_000});
      const {streams, format} = JSON.parse(probe);
      const video = streams[0];
      if (streams.length !== 1 || video.codec_type !== 'video' || video.codec_name !== 'h264' ||
        video.width !== geometry.width || video.height !== geometry.height || video.pix_fmt !== 'yuv420p' ||
        video.avg_frame_rate !== '24/1' || Number(video.nb_read_frames) !== geometry.durationInFrames ||
        Math.abs(Number(format.duration) - 8) > 0.05) {
        throw new Error('MECHANISM: media geometry or silent stream mismatch: ' +
          canonical({codec: video?.codec_name, format: video?.pix_fmt, fps: video?.avg_frame_rate,
            frames: video?.nb_read_frames, seconds: format?.duration, streams: streams.length}));
      }
      await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-i', media, '-f', 'null', '-'], {signal, timeout: 30_000});
      if (canonical(code) !== canonical(await identifyImplementation())) throw new Error('MECHANISM: renderer changed during task');
      const files: Result['files'] = [];
      const commit = async (name: string, bytes: Buffer | string, mediaType: string) => {
        checkAbort(signal);
        files.push({name, artifact: await runner.artifacts.commit(bytes, mediaType, 'PUBLISH', id)});
      };
      await commit('sidecar.json', sidecar, 'application/json');
      await commit('story.json', canonical(snapshot.graph), 'application/json');
      for (const source of snapshot.sources) await commit('source-' + source.id + '.txt', source.bytes, 'text/plain');
      await commit('trace.json', canonical({evaluation: model.evaluation, frames: model.frameMap}), 'application/json');
      await commit('probe.json', probe, 'application/json');
      await commit('preview.mp4', await boundedFile(media, cap), 'video/mp4');
      for (const frame of model.samples) {
        const name = 'sample-' + frame + '.png';
        await commit(name, await boundedFile(join(directory, name)), 'image/png');
      }
      const value = Result.parse({version: kind, storyTaskId: plan.binding.storyTaskId, sidecarHash, files, samples: model.samples});
      return {value, outputs: files.map(file => file.artifact)};
    }, signal, {attempts: 3, timeoutMs: 230_000, beforeDiscardTemporary: cleanupOwnedRuntimeTmp,
      accounting: {provider: 'remotion-local', ratePolicy: 'local-zero-v1'}});
    return {taskId: completed.id, cached: completed.cached, state: 'succeeded', samples: completed.value.samples};
  } finally {
    runner.close();
  }
}

export async function resumeMechanismTask(data: string, id: string, signal: AbortSignal) {
  const task = await readTask(data, id, kind);
  if (task.state === 'succeeded') return {...await statusMechanismTask(data, id), cached: true};
  const input = task.input as {sidecarBase64?: unknown; sidecarHash?: string};
  if (typeof input.sidecarBase64 !== 'string' || input.sidecarBase64.length > 344_000) {
    throw new Error('MECHANISM: task lacks replayable sidecar bytes');
  }
  const sidecar = Buffer.from(input.sidecarBase64, 'base64');
  if (sidecar.toString('base64') !== input.sidecarBase64 || sha256(sidecar) !== input.sidecarHash) {
    throw new Error('MECHANISM: replayable sidecar integrity mismatch');
  }
  return renderMechanismTask(data, sidecar, signal, current => {
    if (current !== id) throw new Error('MECHANISM: renderer environment changed; start a new task with the original sidecar');
  });
}

async function verifyOutputs(data: string, task: TaskRecord) {
  if (task.state !== 'succeeded' || !task.result) throw new Error('MECHANISM: no committed media preview');
  const store = new ArtifactStore(data);
  async function read(artifact: Artifact) {
    if (artifact.inputFingerprint !== task.id) throw new Error('MECHANISM: artifact task binding mismatch');
    const path = store.path(artifact);
    await ancestors(dirname(path));
    const bytes = await boundedFile(path, cap);
    if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) throw new Error('MECHANISM: corrupt committed artifact');
    return bytes;
  }
  const result = Result.parse(JSON.parse((await read(task.result)).toString('utf8')));
  if (result.files.reduce((bytes, file) => bytes + file.artifact.bytes, 0) > 48_000_000) {
    throw new Error('MECHANISM: committed output exceeds bundle limit');
  }
  const input = task.input as {sidecarHash?: string; binding?: {storyTaskId?: string; graphHash?: string}};
  if (result.sidecarHash !== input.sidecarHash || result.storyTaskId !== input.binding?.storyTaskId ||
      canonical(result.files.map(file => file.artifact)) !== canonical(task.outputs)) throw new Error('MECHANISM: result task binding mismatch');
  const payloads = new Map<string, Buffer | string>();
  for (const file of result.files) {
    if (payloads.has(file.name)) throw new Error('MECHANISM: duplicate artifact name');
    payloads.set(file.name, await read(file.artifact));
  }
  if (sha256(payloads.get('sidecar.json')!) !== result.sidecarHash ||
      sha256(payloads.get('story.json')!) !== input.binding?.graphHash) throw new Error('MECHANISM: committed input mismatch');
  const sources = JSON.parse(payloads.get('story.json')!.toString()).evidence.sources as {id: string; sha256: string}[];
  const names = ['sidecar.json', 'story.json', 'trace.json', 'probe.json', 'preview.mp4',
    ...sources.map(source => 'source-' + source.id + '.txt'), ...result.samples.map(frame => 'sample-' + frame + '.png')];
  if (canonical(names.sort()) !== canonical([...payloads.keys()].sort()) ||
    sources.some(source => sha256(payloads.get('source-' + source.id + '.txt')!) !== source.sha256)) {
    throw new Error('MECHANISM: artifact closure mismatch');
  }
  return {result, payloads};
}

export async function statusMechanismTask(data: string, id: string) {
  const task = await readTask(data, id, kind);
  if (task.state !== 'succeeded') return {taskId: id, state: task.state, attempt: task.attempt, error: task.error};
  const {result} = await verifyOutputs(data, task);
  return {taskId: id, state: task.state, attempt: task.attempt, integrity: 'verified',
    samples: result.samples, outputCount: result.files.length};
}

export async function exportMechanismTask(data: string, id: string, output: string) {
  const task = await readTask(data, id, kind);
  const {result, payloads} = await verifyOutputs(data, task);
  const {sidecarBase64: _capturedInFiles, ...input} = task.input as Record<string, unknown>;
  payloads.set('manifest.json', canonical({version: kind, taskId: task.id, input,
    scope: 'eight-second silent mechanism preview; model time compressed; owner review pending',
    review: 'pending', samples: result.samples,
    files: result.files.map(({name, artifact}) => ({name, sha256: artifact.sha256, bytes: artifact.bytes}))}));
  await publishMechanism(output, payloads);
  return {taskId: id, output: resolve(output)};
}
