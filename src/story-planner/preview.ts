import {AUDIENCE_RENDER_STATE_PROFILE} from './audience-render-state.js';
import {lstat, mkdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {ArtifactSchema} from '../contracts/runtime.js';
import {checkAbort, EngineError} from '../core/errors.js';
import {cleanupOwnedRuntimeTmp, createOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {environment, ffmpegPath, ffprobePath, localAudioInput, projectRoot} from '../providers/local.js';
import {checkedPack, publishAssetFiles, RECEIPT_PUBLICATION, type Publication} from './asset-pack.js';
import {compileAnimation} from './animation.js';
import {AUDIENCE_PRESENTATION, compileAudience} from './audience-plan.js';
import type {PreviewProps} from './preview-composition.js';
import {ancestors, boundedFile, preflightStatePath, readTask} from './runtime.js';

const KIND = 'repository-story-preview-v1';
const GEOMETRY = {width: 720, height: 1280};
const RATE = 48_000;
const MAX_VIDEO = 80_000_000;
const MAX_ATTEMPTS = 3;
const FONT_HASH = 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da';
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const Mode = z.enum(['silent', 'narrated']);
const Presentation = z.literal(AUDIENCE_PRESENTATION).optional();
type Pack = Awaited<ReturnType<typeof checkedPack>>;
const Input = z.object({
  assetTaskId: hash, assetManifestSha256: hash, mode: Mode,
  presentation: Presentation,
  renderStateProfile:z.literal(AUDIENCE_RENDER_STATE_PROFILE).optional(),
  fontSha256: z.literal(FONT_HASH), environment: z.record(z.string(), z.string()),
}).strict();
type Input = z.infer<typeof Input>;
const Result = z.object({
  kind: z.literal(KIND), files: z.array(z.object({
    path: z.string().regex(/^(preview\.mp4|preview\.json|captions\.vtt|index\.html|samples\/[0-9]{1,4}\.png)$/),
    artifact: ArtifactSchema,
  }).strict()).min(5).max(40),
}).strict();
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

function planPreview(pack: Pack, mode: z.infer<typeof Mode>, presentation?: z.infer<typeof Presentation>) {
  if (!pack.input.sourceStory) throw new EngineError('PREVIEW_STORY_BINDING', 'Preview requires a repository-bound asset task.');
  if (pack.input.sourceStory.adaptation && (mode !== 'silent' || presentation !== AUDIENCE_PRESENTATION)) {
    throw new EngineError('PREVIEW_ADAPTATION', 'Mapped previews require --mode silent --presentation audience-v1.');
  }
  const animation = compileAnimation(pack.input.story, pack.input.animation);
  const {fps, totalFrames} = animation;
  if (totalFrames < 1 || totalFrames > fps * 60 || animation.shots.length > 12 ||
      animation.shots.some(shot => shot.startFrame >= shot.endFrame)) {
    throw new EngineError('PREVIEW_SCOPE', 'Preview requires up to 12 nonempty shots and a total duration at most 60 seconds.');
  }
  if (mode === 'narrated' && (pack.voice.pendingShots.length || pack.voice.clips.some(clip => !clip.fits))) {
    throw new EngineError('PREVIEW_NARRATION', 'Narrated preview requires exact current recordings that fit every shot. Edit the story timing or supply a shorter recording.');
  }
  const audience = presentation && compileAudience(animation);
  const props: PreviewProps = {
    animation, context: {story: pack.input.story, provenanceSha256: sha256(pack.files.get('provenance.json')!)},
    mode, timeline: {fps, totalFrames}, ...(audience ? {audience} : {}),
  };
  const checkpoints = audience ? [
    0, totalFrames - 1,
    ...audience.cuts.flatMap(frame => [frame - 1, frame, frame + 1]),
    ...audience.intervals.flatMap(({start, end}) => [start - 1, start, start + 1, Math.floor((start + end) / 2), end - 1, end, end + 1]),
  ].filter(frame => frame >= 0 && frame < totalFrames) : pack.samples.map(sample => sample.frame);
  const samples = [...new Set(checkpoints)].sort((a, b) => a - b);
  return {props, samples, sourceStory: pack.input.sourceStory};
}

const sampleAt = (frame: number, fps: number) => Math.round(frame * RATE / fps);

async function prepareNarration(pack: Pack, props: PreviewProps, directory: string, signal: AbortSignal) {
  const {fps, totalFrames} = props.timeline;
  const pcm = Buffer.alloc(sampleAt(totalFrames, fps) * 2);
  const placements = [];
  for (const shot of props.animation.shots) {
    checkAbort(signal);
    const bytes = pack.audio.get(shot.shotId)!;
    const input = join(directory, 'clip-' + shot.shotId + '.bin');
    const output = join(directory, 'clip-' + shot.shotId + '.pcm');
    await writeFile(input, bytes, {flag: 'wx'});
    await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-n',
      ...localAudioInput,
      '-i', input, '-map', '0:a:0', '-ac', '1', '-ar', String(RATE),
      '-t', '61', '-c:a', 'pcm_s16le', '-f', 's16le', output], {signal});
    const audio = await boundedFile(output, 61 * RATE * 2);
    const startSample = sampleAt(shot.startFrame, fps);
    const available = sampleAt(shot.endFrame, fps) - startSample;
    if (!audio.length || audio.length % 2 || audio.length > available * 2) {
      throw new EngineError('PREVIEW_NARRATION', `Decoded audio cannot fit shot ${shot.shotId} at original speed.`);
    }
    audio.copy(pcm, startSample * 2);
    placements.push({shotId: shot.shotId, sourceSha256: sha256(bytes), startSample, samples: audio.length / 2});
  }
  const path = join(directory, 'narration.pcm');
  await writeFile(path, pcm, {flag: 'wx'});
  return {path, placements, pcmSha256: sha256(pcm)};
}

function captionFile(props: PreviewProps) {
  const timestamp = (frame: number) => new Date(Math.round(frame * 1000 / props.timeline.fps)).toISOString().slice(11, 23);
  const escape = (text: string) => text.replace(/\s+/gu, ' ').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return 'WEBVTT\n\nNOTE Shot-level script timing only. Speech alignment and listening review pending.\n\n' +
    props.animation.shots.map((shot, i) => `${shot.shotId}\n${timestamp(shot.startFrame)} --> ${timestamp(shot.endFrame)}\n${escape(props.context.story.shots[i]!.narration)}\n\n`).join('');
}

function reviewPage(mode: z.infer<typeof Mode>) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Repository story preview</title>
<body style="margin:2rem auto;padding:0 1rem;max-width:40rem;background:#101827;color:#f1f5fc;font:1rem system-ui">
<h1>Repository story preview</h1>
<p>${mode === 'silent' ? 'Silent preview.' : 'Narration review pending.'} Authored teaching illustration. The target repository was never run.</p>
<video controls playsinline preload="metadata" src="preview.mp4" style="width:min(100%,24rem)" aria-label="Repository story preview"></video>
<p><a style="color:#c3ddff" href="captions.vtt">Shot-level script timings</a> ·
<a style="color:#c3ddff" href="editable/index.html">Editable inputs and source references</a> ·
<a style="color:#c3ddff" href="preview.json">Technical receipt</a></p>
<p>Speech alignment, listening and continuous audiovisual review are pending.</p>
</body></html>\n`;
}

export async function verifyMovie(path: string, props: Pick<PreviewProps, 'mode' | 'timeline'>, signal: AbortSignal, timeout = 120_000) {
  const probe = JSON.parse(await command(ffprobePath(), [
    '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', path,
  ], {signal, timeout}));
  const video = probe.streams.find((stream: {codec_type: string}) => stream.codec_type === 'video');
  const audio = probe.streams.find((stream: {codec_type: string}) => stream.codec_type === 'audio');
  const {fps, totalFrames} = props.timeline;
  if (probe.streams.length !== (props.mode === 'silent' ? 1 : 2) ||
      video?.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' ||
      video.width !== GEOMETRY.width || video.height !== GEOMETRY.height ||
      video.avg_frame_rate !== fps + '/1' || Number(video.nb_read_frames) !== totalFrames ||
      !Number.isFinite(Number(probe.format.duration)) || Math.abs(Number(probe.format.duration) - totalFrames / fps) > .05 ||
      (props.mode === 'narrated' && (audio?.codec_name !== 'aac' || audio.sample_rate !== String(RATE) ||
        audio.channels !== 1 || !Number.isFinite(Number(audio.duration)) || Math.abs(Number(audio.duration) - totalFrames / fps) > .01))) {
    throw new EngineError('PREVIEW_MEDIA', 'Rendered preview failed verification: ' + json({
      video: {codec: video?.codec_name, pixels: video?.pix_fmt, width: video?.width, height: video?.height,
        fps: video?.avg_frame_rate, frames: video?.nb_read_frames},
      audio: {codec: audio?.codec_name, rate: audio?.sample_rate, channels: audio?.channels, duration: audio?.duration},
      seconds: probe.format.duration, expected: props.timeline,
    }));
  }
  await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-i', path, '-f', 'null', '-'], {signal, timeout});
  return probe;
}

export async function renderStoryPreview(data: string, assetTaskId: string, mode: z.infer<typeof Mode>, signal: AbortSignal,
  onTask?: (id: string) => void, presentation?: z.infer<typeof Presentation>) {
  checkAbort(signal);
  data = resolve(data);
  preflightStatePath(data);
  const pack = await checkedPack(data, assetTaskId);
  const {props, samples, sourceStory} = planPreview(pack, Mode.parse(mode), Presentation.parse(presentation));
  const font = await boundedFile(join(projectRoot, 'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'), 30_000_000);
  if (sha256(font) !== FONT_HASH) throw new EngineError('PREVIEW_FONT', 'Pinned preview font hash differs.');
  const env = await environment();
  const input = Input.parse({
    assetTaskId, assetManifestSha256: sha256(pack.files.get('manifest.json')!), mode,
    ...(props.audience?{renderStateProfile:AUDIENCE_RENDER_STATE_PROFILE}:{}),
    ...(presentation ? {presentation} : {}), fontSha256: FONT_HASH, environment: env,
  });
  const id = sha256(canonical({version: 'production-task-v1', kind: KIND, input}));
  await ancestors(join(data, 'tmp'));
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const info = await lstat(join(data, 'tasks.sqlite' + suffix)).catch(error => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    });
    if (info && (!info.isFile() || info.isSymbolicLink())) throw new EngineError('PREVIEW_STATE', 'Task database must use regular files.');
  }
  checkAbort(signal);
  onTask?.(id);
  const runner = new TaskRunner(data);
  try {
    const task = await runner.run(KIND, input, async (directory, workSignal) => {
      const runtime = await createOwnedRuntimeTmp(directory);
      const work = runtime.directory;
      const narration = mode === 'narrated' ? await prepareNarration(pack, props, work, workSignal) : undefined;
      const publicDir = join(work, 'public');
      await mkdir(publicDir);
      await writeFile(join(publicDir, 'font.ttf'), font, {flag: 'wx'});
      const workerInput = join(work, 'input.json');
      await writeFile(workerInput, json({
        entry: join(projectRoot, 'src/story-planner/preview-composition.tsx'), browser: env.browser,
        props, sampleFrames: samples, geometry: {...GEOMETRY, fps: props.timeline.fps},
      }), {flag: 'wx'});
      await command(process.execPath, ['--import', 'tsx', join(projectRoot, 'src/short-segment/worker.ts'), workerInput], {
        signal: workSignal, timeout: 660_000, cwd: projectRoot,
        env: {TEMP: work, TMP: work, TMPDIR: work},
      });
      const rawMovie = join(work, 'silent.mp4');
      const rawVideo = JSON.parse(await command(ffprobePath(), ['-v', 'error', '-show_streams', '-of', 'json', rawMovie],
        {signal: workSignal})).streams[0];
      const fullRange = rawVideo?.color_range === 'pc' || String(rawVideo?.pix_fmt).startsWith('yuvj');
      const movie = join(work, 'preview.mp4');
      await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-n', '-i', rawMovie,
        ...(narration ? ['-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', narration.path] : []),
        '-map', '0:v:0', ...(narration ? ['-map', '1:a:0', '-c:a', 'aac'] : []),
        '-vf', fullRange ? 'scale=in_range=pc:out_range=tv,format=yuv420p' : 'format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-color_range', 'tv', '-movflags', '+faststart', movie],
      {signal: workSignal, timeout: 120_000});
      const probe = await verifyMovie(movie, props, workSignal);
      if (canonical(await environment()) !== canonical(env)) {
        throw new EngineError('PREVIEW_INPUT_CHANGED', 'Engine or renderer environment changed during render. Retry with a new fingerprint.');
      }
      const files: z.infer<typeof Result>['files'] = [];
      async function commit(path: string, bytes: Buffer | string, mediaType: string) {
        checkAbort(workSignal);
        files.push({path, artifact: await runner.artifacts.commit(bytes, mediaType, 'PUBLISH', id)});
      }
      const video = await boundedFile(movie, MAX_VIDEO);
      await commit('preview.mp4', video, 'video/mp4');
      await commit('captions.vtt', captionFile(props), 'text/vtt');
      await commit('index.html', reviewPage(mode), 'text/html');
      for (const frame of samples) {
        await commit(`samples/${frame}.png`, await boundedFile(join(work, 'samples', frame + '.png')), 'image/png');
      }
      await commit('preview.json', json({
        schemaVersion: '1.0', kind: KIND, taskId: id, ...input, sourceStory,
        ...(props.audience ? {audience: props.audience} : {}),
        timeline: props.timeline, samples, media: {path: 'preview.mp4', sha256: sha256(video), probe, fullDecodeExit: 0},
        captions: 'Shot-level script timing; speech alignment UNVERIFIED.',
        voice: narration ? {label: pack.voice.voiceLabel, transcript: 'caller-declared', sampleRate: RATE,
          placements: narration.placements, pcmSha256: narration.pcmSha256} : {status: 'omitted-explicitly'},
        scope: 'Authored teaching illustration. No observed target execution.',
        listening: 'UNVERIFIED', continuousAv: 'UNVERIFIED', ownerAcceptance: 'pending',
        paidCalls: 0, targetExecution: false,
      }), 'application/json');
      return {value: Result.parse({kind: KIND, files}), outputs: files.map(file => file.artifact)};
    }, signal, {attempts: MAX_ATTEMPTS, timeoutMs: 900_000, beforeDiscardTemporary: cleanupOwnedRuntimeTmp,
      accounting: {provider: 'remotion-local', ratePolicy: 'local-zero-v1'}});
    return {taskId: task.id, cached: task.cached, state: 'succeeded', mode, ...(presentation ? {presentation} : {}), review: 'pending'};
  } finally {
    runner.close();
  }
}

async function checkedPreview(data: string, id: string, includeFiles: boolean) {
  const task = await readTask(data, id, KIND);
  const input = Input.parse(task.input);
  if (task.state !== 'succeeded') {
    const status = {taskId: id, state: task.state, mode: input.mode,
      ...(input.presentation ? {presentation: input.presentation} : {}),
      attempt: task.attempt, error: task.error, review: 'pending'};
    if (task.state !== 'running') return {status};
    const expired = task.leaseUntil <= Date.now();
    return {status: {...status, state: expired ? 'interrupted' : 'running',
      leaseExpiresAt: new Date(task.leaseUntil).toISOString(), retryable: expired && task.attempt < MAX_ATTEMPTS}};
  }
  const pack = await checkedPack(data, input.assetTaskId);
  const {props, samples, sourceStory} = planPreview(pack, input.mode, input.presentation);
  if (sha256(pack.files.get('manifest.json')!) !== input.assetManifestSha256) {
    throw new EngineError('PREVIEW_INTEGRITY', 'Asset manifest hash differs from committed preview input.');
  }
  const store = new ArtifactStore(data);
  const read = async (artifact: z.infer<typeof ArtifactSchema>) => {
    if (artifact.inputFingerprint !== id) throw new EngineError('PREVIEW_INTEGRITY', 'Artifact task fingerprint differs.');
    const bytes = await boundedFile(store.path(artifact), MAX_VIDEO);
    if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) {
      throw new EngineError('PREVIEW_INTEGRITY', 'Committed preview artifact is missing or damaged.');
    }
    return bytes;
  };
  if (!task.result) throw new EngineError('PREVIEW_INTEGRITY', 'Successful task lacks a committed result.');
  const result = Result.parse(JSON.parse((await read(task.result)).toString('utf8')));
  const expectedPaths = ['preview.mp4', 'preview.json', 'captions.vtt', 'index.html', ...samples.map(frame => `samples/${frame}.png`)].sort();
  if (canonical(result.files.map(file => file.path).sort()) !== canonical(expectedPaths) ||
      canonical(result.files.map(file => canonical(file.artifact)).sort()) !== canonical(task.outputs.map(artifact => canonical(artifact)).sort())) {
    throw new EngineError('PREVIEW_INTEGRITY', 'Committed preview output closure differs.');
  }
  const files = new Map<string, Buffer>();
  for (const file of result.files) {
    const bytes = await read(file.artifact);
    if (sourceStory.adaptation && file.path === 'preview.json') {
      const manifest = JSON.parse(bytes.toString('utf8'));
      const movie = result.files.find(item => item.path === 'preview.mp4')!;
      if (canonical(manifest.sourceStory) !== canonical(sourceStory) || manifest.taskId !== id ||
          manifest.assetTaskId !== input.assetTaskId || manifest.assetManifestSha256 !== input.assetManifestSha256 ||
          manifest.mode !== 'silent' || manifest.presentation !== AUDIENCE_PRESENTATION ||
          canonical(manifest.timeline) !== canonical(props.timeline) || canonical(manifest.audience) !== canonical(props.audience) ||
          canonical(manifest.samples) !== canonical(samples) || manifest.media?.sha256 !== movie.artifact.sha256 ||
          manifest.media.fullDecodeExit !== 0 || manifest.voice?.status !== 'omitted-explicitly' ||
          manifest.continuousAv !== 'UNVERIFIED' || manifest.listening !== 'UNVERIFIED' || manifest.ownerAcceptance !== 'pending') {
        throw new EngineError('PREVIEW_INTEGRITY', 'Mapped preview receipt differs from the committed asset, presentation or media.');
      }
    }
    if (sourceStory.adaptation && file.path === 'captions.vtt' && !bytes.equals(Buffer.from(captionFile(props)))) {
      throw new EngineError('PREVIEW_INTEGRITY', 'Mapped captions differ from the committed storyboard.');
    }
    if (includeFiles) files.set(file.path, bytes);
  }
  if (includeFiles) for (const [path, bytes] of pack.files) files.set('editable/' + path, bytes);
  return {files, status: {taskId: id, state: task.state, mode: input.mode, ...(input.presentation ? {presentation: input.presentation} : {}), sourceStory,
    assetTaskId: input.assetTaskId, integrity: 'verified', review: 'pending',
    files: result.files.map(file => ({path: file.path, bytes: file.artifact.bytes, sha256: file.artifact.sha256}))}};
}

export async function statusStoryPreview(data: string, id: string) {
  return (await checkedPreview(data, id, false)).status;
}

export async function exportStoryPreview(data: string, id: string, output: string, signal: AbortSignal, publication: Publication = RECEIPT_PUBLICATION) {
  checkAbort(signal);
  const preview = await checkedPreview(data, id, true);
  if (!preview.files) throw new EngineError('PREVIEW_EXPORT', 'Preview has no committed successful output.');
  if (preview.status.sourceStory.adaptation && publication !== RECEIPT_PUBLICATION) {
    throw new EngineError('PREVIEW_ADAPTATION', 'Mapped previews require receipt-v1 publication.');
  }
  return publishAssetFiles(data, id, output, preview.files, signal, publication);
}

/** Typed immutable Story preview loader for exact narrative shot slicing, never a presentation preview. */
export async function loadStoryPreviewForNarrative(data:string,id:string){
 const checked=await checkedPreview(data,id,true);
 if(!checked.files||!('sourceStory' in checked.status))throw new EngineError('PREVIEW_NOT_READY','Narrative excerpt needs a completed Story preview.');
 const task=await readTask(data,id,KIND),input=Input.parse(task.input),pack=await checkedPack(data,input.assetTaskId);
 const derived=planPreview(pack,input.mode,input.presentation),manifest=JSON.parse(checked.files.get('preview.json')!.toString('utf8'));
 if(!Object.entries(input).every(([key,value])=>canonical(manifest[key])===canonical(value))||canonical(manifest.audience??null)!==canonical(derived.props.audience??null)||input.mode!=='silent'||manifest.taskId!==id||manifest.assetTaskId!==input.assetTaskId||manifest.assetManifestSha256!==input.assetManifestSha256||
  canonical(manifest.sourceStory)!==canonical(derived.sourceStory)||canonical(manifest.timeline)!==canonical(derived.props.timeline)||canonical(manifest.samples)!==canonical(derived.samples)||
  manifest.media?.sha256!==sha256(checked.files.get('preview.mp4')!)||manifest.media.fullDecodeExit!==0||manifest.voice?.status!=='omitted-explicitly'||
  !checked.files.get('captions.vtt')!.equals(Buffer.from(captionFile(derived.props))))throw new EngineError('PREVIEW_INTEGRITY','Narrative source preview metadata, source Story, silence or captions differ.');
 return {...checked,task,input,pack,props:derived.props,manifest};
}
