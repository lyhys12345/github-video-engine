import {copyFile, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {ArtifactSchema, type Artifact} from '../contracts/runtime.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import type {TaskRunner} from '../orchestrator/tasks.js';
import {ffmpegPath, ffprobePath, localAudioInput} from '../providers/local.js';
import {alignReelPcm} from '../renderer/approved-reel.js';
import {RECEIPT_PUBLICATION, publishAssetFiles} from '../story-planner/asset-pack.js';
import {boundedFile} from '../story-planner/runtime.js';
import {candidateReviewDecision} from '../workflow/candidate-review.js';
import {Hash, MAX_JSON, SOURCE_KIND, captureShowcase, fail, json, loadShowcase, openShowcase, readShowcaseSpec, taskId} from './inputs.js';
import {LocalShowcaseRender, showcaseEnvironment} from './local-render.js';
import {showcaseShotInputs, showcaseTimeline} from './timeline.js';
import {workspaceReviewName, workspaceSourceName} from './workspace.js';

export const RENDER_KIND = 'showcase-render-v1';
export const REVIEW_KIND = 'showcase-video-review-v1';
export const SHOT_KIND = 'showcase-shot-v1';
const STILL_KIND = 'showcase-still-v1';
const AUDIO_KIND = 'showcase-audio-v1';
const PROBE_KIND = 'showcase-source-probe-v1';
const LEASE = 15_000;
const artifactLimit = 256_000_000;
const allowedResult = /^(?:review\.mp4|picture\.mp4|frame-[0-9]{1,4}\.png|(?:manifest|approved-script|owner-approval|probe|timeline|props|verification)\.json|sequence\.pcm)$/;
export const PreviewOptions = z.strictObject({mode: z.enum(['movie', 'frames-only']),
  stills: z.union([z.literal('default'), z.array(z.number().int().min(0).max(8999)).max(300)])});
export type PreviewOptions = z.infer<typeof PreviewOptions>;
const RenderInput = z.strictObject({schemaVersion: z.literal('showcase-render/1.0'),
  sourceTaskId: Hash, options: PreviewOptions,
  fingerprint: z.strictObject({renderer: Hash, platform: z.string(), arch: z.string(), node: z.string(),
    icu: z.string(), browser: Hash, ffmpeg: Hash, ffprobe: Hash})});
type RenderInput = z.infer<typeof RenderInput>;
export const Verification = z.strictObject({
  schemaVersion: z.literal('showcase-output/1.1'), taskId: Hash,
  sourceTaskId: Hash, sourceManifestSha256: Hash, manifestSha256: Hash, scriptSha256: Hash, approvalSha256: Hash,
  provenance: z.strictObject({sourceSha256: Hash, reviewSha256: Hash}).optional(),
  candidateSha256: Hash.nullable(), pcmSha256: Hash, frames: z.number().int().positive().max(9000),
  fullDecodePassed: z.boolean(), sourceFacts: z.literal('unverified'),
  narration: z.literal('complete original speed; frame rounding only'),
  captionTiming: z.literal('estimated; authored cues where supplied, otherwise character proportions'),
  perceptualReview: z.literal('pending'), ownerAcceptance: z.literal('pending'),
});
const RenderResult = z.strictObject({verification: Verification,
  files: z.array(z.strictObject({path: z.string().regex(allowedResult), artifact: ArtifactSchema})).min(7).max(320),
  shotTaskIds: z.array(Hash).max(200), stillTaskIds: z.array(Hash).max(300),
});
type Loaded = Awaited<ReturnType<typeof loadShowcase>>;
const ffmpeg = (args: string[], signal: AbortSignal) => command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-n', ...args], {signal, timeout: 600_000});
type Probe = {streams: {codec_type: string; codec_name: string; width?: number; height?: number;
  avg_frame_rate?: string; nb_read_frames?: string; sample_rate?: string; channels?: number}[];
  format: {filename?: string; duration?: string}};
async function probe(path: string, signal: AbortSignal, formats: string) {
  return JSON.parse(await command(ffprobePath(), ['-v', 'error', '-protocol_whitelist', 'file',
    '-format_whitelist', formats, '-count_frames', '-show_streams', '-show_format', '-of', 'json', path],
  {signal, timeout: 120_000})) as Probe;
}
function validateVideo(info: Probe, frames: number, audio: boolean) {
  const video = info.streams.find(stream => stream.codec_type === 'video');
  const voice = info.streams.find(stream => stream.codec_type === 'audio');
  if (info.streams.length !== (audio ? 2 : 1) || video?.width !== 1080 || video.height !== 1920 ||
      video.codec_name !== 'h264' || Number(video.nb_read_frames) !== frames ||
      (audio && (voice?.codec_name !== 'aac' || voice.sample_rate !== '24000' || voice.channels !== 1)) ||
      !Number.isFinite(Number(info.format.duration)) || Math.abs(Number(info.format.duration) - frames / 30) > .06) {
    fail('Encoded showcase geometry, streams, duration or frame count differ.', 'SHOWCASE_MEDIA');
  }
}

async function mediaSource(runner: TaskRunner, loaded: Loaded, signal: AbortSignal, fingerprint: RenderInput['fingerprint']) {
  const {manifest, assets} = loaded;
  for (const visual of manifest.media) {
    const {path, id, ...declaration} = visual;
    const extension = path.slice(path.lastIndexOf('.'));
    await runner.run(PROBE_KIND, {extension, declaration, ffprobe: fingerprint.ffprobe}, async (dir, child) => {
      const source = join(dir, 'source' + extension);
      await writeFile(source, assets.get(path)!, {flag: 'wx'});
      const result = await probe(source, child, visual.type === 'image' ? 'image2,png_pipe,jpeg_pipe,webp_pipe' : 'mov,matroska,webm');
      const stream = result.streams.find(entry => entry.codec_type === 'video');
      if (!stream || stream.width !== visual.width || stream.height !== visual.height ||
          (visual.type === 'video' && (Number(stream.nb_read_frames) !== visual.frames || stream.avg_frame_rate !== '30/1'))) {
        fail(`Real source media metadata differs: ${id}`, 'SHOWCASE_MEDIA');
      }
      return {value: {width: stream.width, height: stream.height, frames: stream.nb_read_frames ?? null}, outputs: []};
    }, signal, {attempts: 3});
  }
  const measurements = [];
  for (const line of manifest.narration) {
    const extension = line.path.slice(line.path.lastIndexOf('.'));
    const input = {extension, sha256: line.sha256, ffmpeg: fingerprint.ffmpeg, sampleRate: 24_000, channels: 1};
    const id = taskId(AUDIO_KIND, input);
    const result = await runner.run(AUDIO_KIND, input, async (dir, child) => {
      const source = join(dir, 'narration' + extension);
      const pcm = join(dir, 'audio.pcm');
      await writeFile(source, assets.get(line.path)!, {flag: 'wx'});
      await ffmpeg([...localAudioInput, '-i', source, '-f', 's16le', '-ar', '24000', '-ac', '1', '-fs', '14400001', pcm], child);
      const bytes = await boundedFile(pcm, 14_400_000);
      if (!bytes.length || bytes.length >= 14_400_000) fail('Narration must contain audio shorter than five minutes.', 'SHOWCASE_MEDIA');
      const aligned = alignReelPcm(bytes, 0);
      const artifact = await runner.artifacts.commit(aligned.padded, 'application/octet-stream', 'RESOLVE_ASSETS', id);
      return {value: {frames: aligned.frames, samples: aligned.samples, artifact}, outputs: [artifact]};
    }, signal, {attempts: 3});
    const {frames, samples, artifact} = result.value;
    if (artifact.inputFingerprint !== id || frames !== Math.ceil(samples / 800) || artifact.bytes !== frames * 1600 ||
        !Number.isSafeInteger(samples) || samples <= 0 || canonical(result.outputs) !== canonical([artifact])) {
      fail('Stored showcase audio timing differs from its task.', 'SHOWCASE_INTEGRITY');
    }
    const pcm = await readFile(runner.artifacts.path(artifact));
    if (sha256(pcm) !== artifact.sha256) fail('Stored PCM hash differs.', 'SHOWCASE_INTEGRITY');
    measurements.push({frames, samples, pcm});
  }
  return measurements;
}

function selectedStills(options: PreviewOptions, loaded: Loaded, result: ReturnType<typeof showcaseTimeline>) {
  const {manifest: {preview}} = loaded;
  const raw = options.stills === 'default' ? [
    ...(preview?.frames ?? [Math.min(30, result.props.frames - 1)]),
    ...(preview?.shotMidpoints === false ? [] : result.props.shots.map(shot => Math.floor((shot.start + shot.end) / 2))),
    ...(preview?.actionFrames ? result.actionFrames : []),
  ] : options.stills;
  const frames = [...new Set(raw)].sort((a, b) => a - b);
  if (frames.length > 300 || frames.some(frame => frame >= result.props.frames) || (options.mode === 'frames-only' && !frames.length)) {
    fail('Select one to 300 valid preview frames within the measured timeline.');
  }
  return frames;
}

function visualFiles(loaded: Loaded) {
  return new Map([
    ['font.ttf', loaded.assets.get(loaded.manifest.font.path)!],
    ...loaded.manifest.media.map(visual => {
      const extension = visual.path.slice(visual.path.lastIndexOf('.'));
      return [`assets/${visual.sha256}${extension}`, loaded.assets.get(visual.path)!] as const;
    }),
  ]);
}

async function runRender(runner: TaskRunner, input: RenderInput, browser: string, loaded: Loaded, signal: AbortSignal) {
  const id = taskId(RENDER_KIND, input);
  const stats = {shotsReused: 0, shotsRendered: 0, stillsReused: 0, stillsRendered: 0};
  const run = await runner.run(RENDER_KIND, input, async (dir, child) => {
    const measured = await mediaSource(runner, loaded, child, input.fingerprint);
    const {manifest, script, assets} = loaded;
    const result = showcaseTimeline(manifest, script.lines, measured);
    const {props, timeline} = result;
    const stills = selectedStills(input.options, loaded, result);
    const pcm = Buffer.concat(measured.map(line => line.pcm));
    const files: {path: string; artifact: Artifact}[] = [];
    const put = async (path: string, bytes: Buffer | string, mediaType = 'application/json') => {
      checkAbort(child);
      const artifact = await runner.artifacts.commit(bytes, mediaType, 'PUBLISH', id);
      files.push({path, artifact});
      return artifact;
    };
    const indexes = new Map(manifest.media.map(visual => [visual.path, visual.sha256]));
    const local = new LocalShowcaseRender(dir, browser, visualFiles(loaded));
    const renderPart = async (kind: 'shot' | 'still', payload: ReturnType<typeof showcaseShotInputs>[number]) => {
      const kindName = kind === 'shot' ? SHOT_KIND : STILL_KIND;
      const partInput = {...payload, fingerprint: input.fingerprint};
      const partId = taskId(kindName, partInput);
      const type = kind === 'shot' ? 'video/mp4' : 'image/png';
      const part = await runner.run(kindName, partInput, async (_partDir, partSignal) => {
        const output = await local.render({id: partId, props: payload.props, from: payload.from, to: payload.to, kind}, partSignal);
        if (kind === 'shot') validateVideo(await probe(output.output, partSignal, 'mov'), payload.to - payload.from, false);
        const artifact = await runner.artifacts.commit(output.bytes, type, 'RENDER', partId);
        return {value: {artifact}, outputs: [artifact]};
      }, child, {attempts: 3, leaseMs: LEASE, timeoutMs: 600_000});
      const {artifact} = part.value;
      if (part.id !== partId || artifact.inputFingerprint !== partId || artifact.mediaType !== type ||
          canonical(part.outputs) !== canonical([artifact])) fail('Stored shot artifact binding differs.', 'SHOWCASE_INTEGRITY');
      if (kind === 'shot') {
        if (part.cached) stats.shotsReused++; else stats.shotsRendered++;
      } else {
        if (part.cached) stats.stillsReused++; else stats.stillsRendered++;
      }
      return {id: partId, artifact};
    };

    const shotTaskIds: string[] = [], stillTaskIds: string[] = [];
    const parts: {file: string; frames: number}[] = [];
    try {
      if (input.options.mode === 'movie') for (const shot of showcaseShotInputs(props, indexes, manifest.font.sha256)) {
        const part = await renderPart('shot', shot);
        shotTaskIds.push(part.id);
        const file = `part-${parts.length}.mp4`;
        await copyFile(runner.artifacts.path(part.artifact), join(dir, file));
        parts.push({file, frames: shot.to - shot.from});
      }
      for (const frame of stills) {
        const still = await renderPart('still', showcaseShotInputs(props, indexes, manifest.font.sha256, frame)[0]!);
        stillTaskIds.push(still.id);
        await put(`frame-${frame}.png`, await readFile(runner.artifacts.path(still.artifact)), 'image/png');
      }
    } finally { await local.close(); }

    await put('approved-script.json', assets.get(manifest.script.path)!);
    await put('owner-approval.json', assets.get(manifest.approval.path)!);
    const manifestArtifact = await put('manifest.json', canonical(manifest));
    await put('timeline.json', canonical(timeline));
    await put('props.json', canonical(props));
    await put('sequence.pcm', pcm, 'application/octet-stream');

    let candidateSha256: string | null = null;
    if (input.options.mode === 'movie') {
      const list = join(dir, 'concat.txt');
      const picture = join(dir, 'picture.mp4');
      const movie = join(dir, 'review.mp4');
      await writeFile(list, ['ffconcat version 1.0', ...parts.flatMap(part => [
        'file ' + part.file, 'duration ' + (part.frames / 30).toFixed(8),
      ])].join('\n') + '\n', {flag: 'wx'});
      await ffmpeg(['-f', 'concat', '-safe', '1', '-i', list, '-c', 'copy', picture], child);
      const pcmPath = join(dir, 'sequence.pcm');
      await writeFile(pcmPath, pcm, {flag: 'wx'});
      await ffmpeg(['-i', picture, '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', pcmPath,
        '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', movie], child);
      const info = await probe(movie, child, 'mov');
      validateVideo(info, props.frames, true);
      await ffmpeg(['-i', movie, '-f', 'null', '-'], child);
      if (info.format.filename !== undefined) info.format.filename = 'review.mp4';
      await put('probe.json', canonical(info));
      await put('picture.mp4', await boundedFile(picture, artifactLimit), 'video/mp4');
      candidateSha256 = (await put('review.mp4', await boundedFile(movie, artifactLimit), 'video/mp4')).sha256;
    }
    if (canonical((await showcaseEnvironment(child)).fingerprint) !== canonical(input.fingerprint)) {
      fail('Renderer dependencies changed during the task. Submit the source under the current runtime.', 'SHOWCASE_ENVIRONMENT');
    }
    const verification = Verification.parse({
      schemaVersion: 'showcase-output/1.1', taskId: id, sourceTaskId: input.sourceTaskId,
      sourceManifestSha256: loaded.input.sourceManifestSha256, manifestSha256: manifestArtifact.sha256,
      scriptSha256: manifest.script.sha256, approvalSha256: manifest.approval.sha256, candidateSha256,
      ...(loaded.input.provenance ? {provenance: loaded.input.provenance} : {}),
      frames: props.frames, pcmSha256: sha256(pcm), fullDecodePassed: candidateSha256 !== null,
      sourceFacts: 'unverified', narration: 'complete original speed; frame rounding only',
      captionTiming: 'estimated; authored cues where supplied, otherwise character proportions',
      perceptualReview: 'pending', ownerAcceptance: 'pending',
    });
    await put('verification.json', canonical(verification));
    const value = RenderResult.parse({verification, files, shotTaskIds, stillTaskIds});
    return {value, outputs: files.map(file => file.artifact)};
  }, signal, {attempts: 3, leaseMs: LEASE, timeoutMs: 3_600_000, beforeDiscardTemporary: cleanupOwnedRuntimeTmp});
  return {...run, ...(run.cached ? {} : stats)};
}

export async function loadShowcaseRender(runner: TaskRunner, id: string, signal: AbortSignal) {
  const task = runner.get(Hash.parse(id));
  if (!task || task.kind !== RENDER_KIND || task.state !== 'succeeded' || !task.result) {
    fail('A complete showcase render task is required.', 'SHOWCASE_TASK');
  }
  const input = RenderInput.parse(task.input);
  if (taskId(RENDER_KIND, input) !== id || task.result.inputFingerprint !== id) fail('Showcase render fingerprint differs.', 'SHOWCASE_INTEGRITY');
  const result = RenderResult.parse(await runner.artifacts.readJson(task.result));
  if (result.verification.taskId !== id || result.verification.sourceTaskId !== input.sourceTaskId ||
      canonical(task.outputs) !== canonical(result.files.map(file => file.artifact))) {
    fail('Showcase render artifact list differs.', 'SHOWCASE_INTEGRITY');
  }
  const files = new Map<string, Buffer>();
  for (const {path, artifact} of result.files) {
    checkAbort(signal);
    if (files.has(path) || artifact.inputFingerprint !== id || artifact.bytes > artifactLimit) fail('Showcase output artifact binding differs.', 'SHOWCASE_INTEGRITY');
    await runner.artifacts.verify(artifact);
    const bytes = await boundedFile(runner.artifacts.path(artifact), artifactLimit);
    if (sha256(bytes) !== artifact.sha256) fail('Showcase output hash differs.', 'SHOWCASE_INTEGRITY');
    files.set(path, bytes);
  }
  validateShowcaseOutput(result.verification, files);
  return {input, result, files};
}

export function validateShowcaseOutput(verification: z.infer<typeof Verification>, files: ReadonlyMap<string, Buffer>) {
  const fixed = new Map<string, string>([
    ['manifest.json', verification.manifestSha256], ['approved-script.json', verification.scriptSha256],
    ['owner-approval.json', verification.approvalSha256], ['sequence.pcm', verification.pcmSha256],
    ['verification.json', sha256(canonical(verification))],
  ]);
  const bindings = verification.candidateSha256 === null ? !files.has('review.mp4') && !files.has('picture.mp4') && !files.has('probe.json') :
    Boolean(files.get('review.mp4') && files.get('picture.mp4') && files.get('probe.json'));
  if (verification.fullDecodePassed !== (verification.candidateSha256 !== null) || !bindings ||
      !files.has('timeline.json') || !files.has('props.json') || [...files.keys()].some(path => !allowedResult.test(path))) {
    fail('Showcase output inventory differs.', 'SHOWCASE_INTEGRITY');
  }
  if (verification.candidateSha256 !== null) fixed.set('review.mp4', verification.candidateSha256);
  for (const [path, hash] of fixed) {
    const bytes = files.get(path);
    if (!bytes || sha256(bytes) !== hash) fail(`Showcase output digest differs: ${path}`, 'SHOWCASE_INTEGRITY');
  }
  if (files.get('sequence.pcm')!.length !== verification.frames * 1600) fail('Showcase PCM extent differs.', 'SHOWCASE_INTEGRITY');
}

async function renderExisting(runner: TaskRunner, sourceTaskId: string, options: PreviewOptions, signal: AbortSignal, requested?: string, out?: string) {
  const loaded = await loadShowcase(runner, sourceTaskId, signal);
  const environment = await showcaseEnvironment(signal);
  const input = RenderInput.parse({schemaVersion: 'showcase-render/1.0', sourceTaskId, options, fingerprint: environment.fingerprint});
  const known = taskId(RENDER_KIND, input);
  if (requested && known !== requested) {
    fail('The environment differs from the saved render; use the source checkpoint ID to start a render in this environment.', 'SHOWCASE_ENVIRONMENT');
  }
  const result = await runRender(runner, input, environment.browser, loaded, signal);
  const output = out ? await outputShowcase(runner, result.id, out, signal) : undefined;
  return {state: 'succeeded', cached: result.cached, ...result.value.verification,
    shots: result.value.shotTaskIds, stills: result.value.stillTaskIds,
    ...(result.cached ? {} : {reuse: {shotsRendered: result.shotsRendered, shotsReused: result.shotsReused,
      stillsRendered: result.stillsRendered, stillsReused: result.stillsReused}}), ...(output ? {output} : {})};
}

export async function outputShowcase(runner: TaskRunner, id: string, out: string, signal: AbortSignal) {
  const {files} = await loadShowcaseRender(runner, id, signal);
  return publishAssetFiles(runner.root, id, out, files, signal, RECEIPT_PUBLICATION);
}

export async function renderShowcase(data: string, spec: string, options: PreviewOptions, signal: AbortSignal, out?: string,
  provenance?: {source: Buffer; review: Buffer}) {
  const {input, assets} = await readShowcaseSpec(spec, signal);
  if (provenance) {
    assets.set(workspaceSourceName, provenance.source);
    assets.set(workspaceReviewName, provenance.review);
    input.provenance = {sourceSha256: sha256(provenance.source), reviewSha256: sha256(provenance.review)};
  }
  const runner = await openShowcase(data, true);
  try {
    const sourceTaskId = await captureShowcase(runner, input, assets, signal);
    return await renderExisting(runner, sourceTaskId, PreviewOptions.parse(options), signal, undefined, out);
  } finally { runner.close(); }
}

export async function resumeShowcase(data: string, id: string, signal: AbortSignal, out?: string, sourceOptions?: PreviewOptions) {
  const runner = await openShowcase(data);
  try {
    const task = runner.get(Hash.parse(id));
    if (task?.kind === SOURCE_KIND) {
      return await renderExisting(runner, id, sourceOptions ?? {mode: 'movie', stills: 'default'}, signal, undefined, out);
    }
    if (!task || task.kind !== RENDER_KIND || sourceOptions) fail('Use a render task ID, or a source ID with optional preview settings.', 'SHOWCASE_TASK');
    const input = RenderInput.parse(task.input);
    if (task.state === 'succeeded') {
      const {result} = await loadShowcaseRender(runner, task.id, signal);
      return {...result.verification, state: 'succeeded', cached: true, shots: result.shotTaskIds, stills: result.stillTaskIds,
        ...(out ? {output: await outputShowcase(runner, task.id, out, signal)} : {})};
    }
    return await renderExisting(runner, input.sourceTaskId, input.options, signal, task.id, out);
  } finally { runner.close(); }
}

export async function showcaseStatus(data: string, id?: string) {
  const runner = await openShowcase(data);
  try {
    const summary = (task: ReturnType<TaskRunner['list']>[number]) => {
      const {id, kind, state, attempt, leaseUntil, startedAt, finishedAt, error, outputs} = task;
      return {id, kind, state, attempt, leaseUntil, startedAt, finishedAt, error, outputs};
    };
    if (!id) return runner.list().filter(task => task.kind.startsWith('showcase-')).map(summary);
    const task = runner.get(Hash.parse(id));
    if (!task || !task.kind.startsWith('showcase-')) fail('Showcase task not found.', 'SHOWCASE_TASK');
    const events = runner.db.prepare('SELECT at,type,data FROM task_events WHERE task_id=? ORDER BY seq').all(id)
      .map(row => ({at: row.at, type: row.type, data: JSON.parse(String(row.data))}));
    return {...summary(task), input: task.input, result: task.result, events};
  } finally { runner.close(); }
}

const ReviewInput = z.strictObject({schemaVersion: z.literal('showcase-video-review/1.0'),
  renderTaskId: Hash, candidateSha256: Hash, rawReviewSha256: Hash});
const ReviewResult = z.strictObject({
  report: ArtifactSchema, candidateSha256: Hash,
  decision: z.object({status: z.enum(['revise-and-resubmit', 'unverified', 'awaiting-owner-approval', 'passed']),
    findings: z.array(z.string())}).strict(),
  ownerAcceptance: z.literal('pending'),
});
export async function reviewShowcase(data: string, id: string, path: string, signal: AbortSignal) {
  const runner = await openShowcase(data);
  try {
    const candidate = await loadShowcaseRender(runner, id, signal);
    const candidateSha256 = candidate.result.verification.candidateSha256;
    if (candidateSha256 === null) fail('A rendered MP4 is required for video review.', 'SHOWCASE_REVIEW');
    const bytes = await boundedFile(path, MAX_JSON);
    const decision = candidateReviewDecision(json(bytes), candidateSha256, 'video');
    const input = ReviewInput.parse({schemaVersion: 'showcase-video-review/1.0', renderTaskId: id, candidateSha256, rawReviewSha256: sha256(bytes)});
    const reviewId = taskId(REVIEW_KIND, input);
    const result = await runner.run(REVIEW_KIND, input, async () => {
      const report = await runner.artifacts.commit(bytes, 'application/json', 'PUBLISH', reviewId);
      return {value: ReviewResult.parse({report, candidateSha256, decision, ownerAcceptance: 'pending'}), outputs: [report]};
    }, signal, {attempts: 3});
    return {taskId: result.id, cached: result.cached, ...result.value};
  } finally { runner.close(); }
}

export async function loadShowcaseReviews(runner: TaskRunner, id: string, candidateSha256: string | null, signal: AbortSignal) {
  const reports = new Map<string, Buffer>();
  for (const task of runner.list()) {
    if (task.kind !== REVIEW_KIND || task.state !== 'succeeded' || !task.result || (task.input as {renderTaskId?: string}).renderTaskId !== id) continue;
    checkAbort(signal);
    const input = ReviewInput.parse(task.input);
    const result = ReviewResult.parse(await runner.artifacts.readJson(task.result));
    if (candidateSha256 === null || input.candidateSha256 !== candidateSha256 || result.candidateSha256 !== candidateSha256 ||
        taskId(REVIEW_KIND, input) !== task.id || task.result.inputFingerprint !== task.id || result.report.inputFingerprint !== task.id ||
        result.report.sha256 !== input.rawReviewSha256 || canonical(task.outputs) !== canonical([result.report])) {
      fail('Stored showcase video review binding differs.', 'SHOWCASE_INTEGRITY');
    }
    await runner.artifacts.verify(result.report);
    const bytes = await boundedFile(runner.artifacts.path(result.report), MAX_JSON);
    if (sha256(bytes) !== input.rawReviewSha256 ||
        canonical(candidateReviewDecision(json(bytes), candidateSha256, 'video')) !== canonical(result.decision)) {
      fail('Stored showcase video review decision differs.', 'SHOWCASE_INTEGRITY');
    }
    reports.set(`reviews/${input.rawReviewSha256}.json`, bytes);
  }
  return reports;
}
