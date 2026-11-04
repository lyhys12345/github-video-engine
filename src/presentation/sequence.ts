import {lstat, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {AuthoringBinding} from '../contracts/authoring.js';
import {PRESENTATION_FPS, PRESENTATION_MAX_FRAMES} from '../contracts/presentation.js';
import {Hash, Id} from '../contracts/video.js';
import {checkAbort, EngineError} from '../core/errors.js';
import {cleanupOwnedRuntimeTmp, createOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {ffmpegPath, ffprobePath} from '../providers/local.js';
import {publishAssetFiles, RECEIPT_PUBLICATION} from '../story-planner/asset-pack.js';
import {verifyMovie} from '../story-planner/preview.js';
import {ancestors, boundedFile, readTask} from '../story-planner/runtime.js';
import {WorkflowStore} from '../workflow/store.js';
import {MAX_MOVIE_BYTES} from './duration.js';
import {preflightPresentationState, readPresentation, taskCancellation} from './runtime.js';

const KIND = 'repository-presentation-sequence-v1';
const ATTEMPTS = 3;
const MAX_CHILD_BYTES = 160_000_000;
const MAX_METADATA = 32_000;
const DEADLINE = 900_000;
const CARD_FRAMES = 36;
const CARD_ASSETS = resolve(import.meta.dirname, '../../assets/fonts/noto-sans-sc');
const CARD_FONT_SHA256 = 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da';
const CARD_LICENSE_SHA256 = '1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9';
const REVIEW = {semantic: 'pending', editorial: 'pending', audiovisual: 'pending', ownerAcceptance: 'pending'} as const;
const Scope = 'Independent illustrative scenes with hard cuts. Scene order is caller-declared.';
const CardScope = 'Independent illustrative scenes with caller-authored opening cards between examples. Scene order is caller-declared.';
const Scene = z.strictObject({sceneId: Id, previewTaskId: Hash, expectedPreviewManifestSha256: Hash});
const EnglishTitle = z.string().min(1).max(21).regex(/^[A-Za-z0-9][A-Za-z0-9 .,()-]*$/)
  .refine(text => text === text.trim() && !/[\r\n]/.test(text));
const ChineseTitle = z.string().regex(/^[\p{Script=Han}A-Za-z0-9][\p{Script=Han}A-Za-z0-9 .,()，。！？、（）·《》-]*$/u)
  .refine(text => [...text].length <= 12 && /\p{Script=Han}/u.test(text) && text === text.trim() && !/[\r\n]/.test(text));
const CardTitle = z.union([EnglishTitle, ChineseTitle]);
const Locale = z.enum(['en', 'zh-CN']);
const LabeledScene = Scene.extend({openingCard: z.strictObject({title: EnglishTitle})});
const LegacySequence = z.strictObject({
  schemaVersion: z.literal('presentation-sequence/1.0'),
  authorship: z.strictObject({kind: z.literal('caller-authored')}),
  mode: z.enum(['silent', 'narrated']),
  scenes: z.array(Scene).min(2).max(4),
});
const LabeledSequence = LegacySequence.extend({
  schemaVersion: z.literal('presentation-sequence/1.1'),
  scenes: z.array(LabeledScene).min(2).max(4),
});
const LocalizedSequence = LegacySequence.extend({
  schemaVersion: z.literal('presentation-sequence/1.2'),
  locale: Locale,
  scenes: z.array(Scene.extend({openingCard: z.strictObject({title: CardTitle})})).min(2).max(4),
}).superRefine((spec, ctx) => {
  const titleSchema = spec.locale === 'en' ? EnglishTitle : ChineseTitle;
  for (const [index, scene] of spec.scenes.entries()) {
    if (!titleSchema.safeParse(scene.openingCard.title).success) {
      ctx.addIssue({code: 'custom', path: ['scenes', index, 'openingCard', 'title'], message: 'Title does not match the locale and length rules.'});
    }
  }
});
const Sequence = z.discriminatedUnion('schemaVersion', [LegacySequence, LabeledSequence, LocalizedSequence]);
const SceneRecord = Scene.extend({
  planTaskId: Hash,
  planSha256: Hash,
  proposalHash: Hash,
  movieSha256: Hash,
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  openingCard: z.strictObject({
    title: CardTitle, startFrame: z.number().int().nonnegative(), endFrame: z.number().int().positive(),
  }).optional(),
});
const Input = z.strictObject({
  spec: Sequence,
  binding: AuthoringBinding,
  scenes: z.array(SceneRecord).min(2).max(4),
  toolchain: z.strictObject({
    implementationSha256: Hash, ffmpeg: z.string(), ffprobe: z.string(),
    ffmpegVersionSha256: Hash, ffprobeVersionSha256: Hash,
    cardFontSha256: Hash.optional(),
    cardFontLicenseSha256: Hash.optional(),
  }),
});
const Result = z.strictObject({
  schemaVersion: z.enum(['presentation-sequence-manifest/1.0', 'presentation-sequence-manifest/1.1', 'presentation-sequence-manifest/1.2']),
  taskId: Hash,
  input: Input,
  timeline: z.strictObject({fps: z.literal(PRESENTATION_FPS), totalFrames: z.number().int().min(1).max(PRESENTATION_MAX_FRAMES)}),
  media: z.strictObject({
    sha256: Hash, bytes: z.number().int().min(1).max(MAX_MOVIE_BYTES),
    fullDecodeExit: z.literal(0), audioStreams: z.literal(0),
  }),
  review: z.strictObject({semantic: z.literal('pending'), editorial: z.literal('pending'),
    audiovisual: z.literal('pending'), ownerAcceptance: z.literal('pending')}),
  scope: z.enum([Scope, CardScope]),
});
type Sequence = z.infer<typeof Sequence>;
type LocalizedSequence = z.infer<typeof LocalizedSequence>;
type Input = z.infer<typeof Input>;
type Result = z.infer<typeof Result>;

const fail = (code: string, message: string): never => {throw new EngineError('PRESENTATION_SEQUENCE_' + code, message);};
const identity = (input: Input) => sha256(canonical({version: 'production-task-v1', kind: KIND, input}));
const json = (value: unknown) => Buffer.from(canonical(value));
function parse(bytes: Buffer): unknown {
  try { return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); }
  catch { return fail('JSON', 'Expected UTF-8 sequence JSON.'); }
}

async function inspectScenes(data: string, spec: Sequence, signal: AbortSignal,
  collect?: (scene: Sequence['scenes'][number], files: ReadonlyMap<string, Buffer>, index: number) => Promise<void>) {
  if (spec.mode !== 'silent') fail('MODE', 'Sequences support silent previews only.');
  if (new Set(spec.scenes.map(scene => scene.sceneId)).size !== spec.scenes.length ||
      new Set(spec.scenes.map(scene => scene.previewTaskId)).size !== spec.scenes.length) {
    fail('DUPLICATE', 'Use distinct scene IDs and distinct preview task IDs.');
  }
  let binding: z.infer<typeof AuthoringBinding> | undefined;
  let totalFrames = 0;
  let bytes = 0;
  const scenes: Input['scenes'] = [];
  for (const [index, scene] of spec.scenes.entries()) {
    checkAbort(signal);
    const preview = await readPresentation(data, scene.previewTaskId, undefined, signal);
    const status = preview.status;
    if (status.kind !== 'preview') fail('MODE', 'Every sequence scene must reference a silent preview task.');
    if (status.state !== 'succeeded' || !preview.files || !('integrity' in status) || !('binding' in status) ||
        !('planTaskId' in status) || !('timeline' in status) || !('planSha256' in status) || !('proposalHash' in status)) {
      fail('NOT_READY', 'Every scene needs a successful verified preview.');
    }
    const files = preview.files!;
    const manifest = files.get('preview-manifest.json')!;
    if (sha256(manifest) !== scene.expectedPreviewManifestSha256) fail('MANIFEST', 'Preview manifest differs for ' + scene.sceneId);
    const sceneBinding = AuthoringBinding.parse(status.binding);
    binding ??= sceneBinding;
    if (canonical(sceneBinding) !== canonical(binding)) fail('SOURCE', 'Sequence scenes must share the exact project and evidence binding.');
    const timeline = status.timeline as {fps: number; totalFrames: number};
    if (timeline.fps !== PRESENTATION_FPS) fail('MEDIA', 'Expected 24 fps in each source preview.');
    const openingCard = spec.schemaVersion !== 'presentation-sequence/1.0' && index > 0
      ? {title: spec.scenes[index]!.openingCard.title, startFrame: totalFrames, endFrame: totalFrames + CARD_FRAMES}
      : undefined;
    const startFrame = openingCard?.endFrame ?? totalFrames;
    totalFrames = startFrame;
    totalFrames += timeline.totalFrames;
    for (const payload of files.values()) bytes += payload.length;
    if (totalFrames > PRESENTATION_MAX_FRAMES || bytes > MAX_CHILD_BYTES) fail('BUDGET', 'Sequence exceeds its frame or child byte budget.');
    scenes.push(SceneRecord.parse({sceneId: scene.sceneId, previewTaskId: scene.previewTaskId,
      expectedPreviewManifestSha256: scene.expectedPreviewManifestSha256, ...(openingCard && {openingCard}),
      planTaskId: status.planTaskId, planSha256: status.planSha256,
      proposalHash: status.proposalHash, movieSha256: sha256(files.get('preview.mp4')!), startFrame, endFrame: totalFrames}));
    if (collect) await collect(scene, files, index);
  }
  return {binding: binding!, scenes, totalFrames};
}

async function requireCurrent(data: string, binding: Input['binding']) {
  const workflow = join(data, 'workflow');
  await ancestors(workflow);
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const info = await lstat(join(workflow, 'workflow.sqlite' + suffix)).catch(error => {
      if (error.code !== 'ENOENT' || !suffix) throw error;
    });
    if (info && (!info.isFile() || info.isSymbolicLink())) fail('SOURCE', 'Expected regular workflow database files.');
  }
  const store = new WorkflowStore(workflow, {authoring: true});
  try {
    if (store.project(binding.projectId).snapshotHash !== binding.snapshotHash) {
      fail('STALE', 'Create new previews for the current project snapshot.');
    }
  } finally { store.close(); }
}

async function toolchain(signal: AbortSignal) {
  const configured = ffmpegPath();
  const ffmpeg = /[\\/]/.test(configured) ? resolve(configured) : configured;
  const ffprobe = ffprobePath();
  const [encode, probe, source, font, license] = await Promise.all([
    command(ffmpeg, ['-version'], {signal}), command(ffprobe, ['-version'], {signal}),
    boundedFile(resolve(import.meta.dirname, 'sequence.ts')),
    boundedFile(join(CARD_ASSETS, 'NotoSansSC-Variable.ttf'), 20_000_000),
    boundedFile(join(CARD_ASSETS, 'OFL.txt'), 20_000),
  ]);
  if (sha256(font) !== CARD_FONT_SHA256 || sha256(license) !== CARD_LICENSE_SHA256) {
    fail('FONT', 'Expected the bundled, unmodified Noto Sans SC font and its OFL license.');
  }
  return {font, identity: {implementationSha256: sha256(source), ffmpeg, ffprobe, ffmpegVersionSha256: sha256(encode),
    ffprobeVersionSha256: sha256(probe), cardFontSha256: CARD_FONT_SHA256, cardFontLicenseSha256: CARD_LICENSE_SHA256}};
}

async function taskRecord(data: string, id: string, signal: AbortSignal) {
  checkAbort(signal);
  if (!Hash.safeParse(id).success) fail('TASK_ID', 'Use a 64-character lowercase hexadecimal sequence task ID.');
  return readTask(data, id, KIND);
}

async function readOutput(store: ArtifactStore, artifact: Parameters<ArtifactStore['path']>[0], id: string, max: number) {
  if (artifact.inputFingerprint !== id) fail('INTEGRITY', 'Artifact belongs to a different task.');
  const bytes = await boundedFile(store.path(artifact), max);
  if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) fail('INTEGRITY', 'Sequence artifact is damaged.');
  return bytes;
}

async function checkedResult(data: string, id: string, signal: AbortSignal, includeChildren = false) {
  const task = await taskRecord(data, id, signal);
  const status = {taskId: id, kind: 'sequence', attempt: task.attempt};
  if (task.state !== 'succeeded') {
    const expired = task.state === 'running' && task.leaseUntil <= Date.now();
    return {status: {...status, state: expired ? 'interrupted' : task.state, error: task.error,
      retryable: task.attempt < ATTEMPTS && (expired || (task.state !== 'running' && task.error?.classification !== 'permanent'))}};
  }
  const input = Input.parse(task.input);
  const files = new Map<string, Buffer>();
  const children = await inspectScenes(data, input.spec, signal, includeChildren ? async (scene, child) => {
    for (const [path, bytes] of child) if (!path.startsWith('samples/')) files.set('scenes/scene-' + scene.sceneId + '/' + path, bytes);
  } : undefined);
  if (canonical(children.binding) !== canonical(input.binding) || canonical(children.scenes) !== canonical(input.scenes)) {
    fail('INTEGRITY', 'Sequence parents differ from the committed input.');
  }
  const store = new ArtifactStore(data);
  const artifact = task.outputs[0];
  if (task.outputs.length !== 1 || !artifact || artifact.mediaType !== 'video/mp4' || !task.result) {
    return fail('INTEGRITY', 'Sequence artifact closure differs.');
  }
  const movie = await readOutput(store, artifact, id, MAX_MOVIE_BYTES);
  const bytes = await readOutput(store, task.result, id, MAX_METADATA);
  const manifest = Result.parse(parse(bytes));
  const expected = makeResult(input, id, children.totalFrames, movie);
  if (!json(expected).equals(bytes)) fail('INTEGRITY', 'Sequence manifest differs from its inputs and movie.');
  files.set('sequence.mp4', movie);
  files.set('sequence.json', json(input.spec));
  files.set('sequence-manifest.json', bytes);
  return {status: {...status, state: task.state, integrity: 'verified', timeline: manifest.timeline, review: REVIEW}, files};
}

function makeResult(input: Input, id: string, totalFrames: number, movie: Buffer): Result {
  const version = input.spec.schemaVersion;
  const schemaVersion = version === 'presentation-sequence/1.0' ? 'presentation-sequence-manifest/1.0'
    : version === 'presentation-sequence/1.1' ? 'presentation-sequence-manifest/1.1' : 'presentation-sequence-manifest/1.2';
  return {schemaVersion,
    taskId: id, input,
    timeline: {fps: PRESENTATION_FPS, totalFrames}, media: {sha256: sha256(movie), bytes: movie.length,
      fullDecodeExit: 0, audioStreams: 0}, review: REVIEW, scope: version === 'presentation-sequence/1.0' ? Scope : CardScope};
}

function cardLines(spec: LocalizedSequence, index: number) {
  const title = spec.scenes[index]!.openingCard.title;
  const current = index + 1, total = spec.scenes.length;
  return spec.locale === 'zh-CN' ? ['示例 ' + current + ' / ' + total, '独立示例', title]
    : ['CASE ' + current + ' OF ' + total, 'Separate example', title];
}

function validateCardGlyphs(font: Buffer, spec: LocalizedSequence) {
  // The SHA-256-pinned font is an sfnt with a Windows full-Unicode format-12 cmap.
  let cmap = 0;
  for (let index = 0; index < font.readUInt16BE(4); index++) {
    const table = 12 + index * 16;
    if (font.toString('ascii', table, table + 4) === 'cmap') cmap = font.readUInt32BE(table + 8);
  }
  if (!cmap) return fail('FONT', 'Bundled card font has no character map.');
  let fullUnicode = 0;
  for (let index = 0; index < font.readUInt16BE(cmap + 2); index++) {
    const record = cmap + 4 + index * 8;
    if (font.readUInt16BE(record) === 3 && font.readUInt16BE(record + 2) === 10) {
      fullUnicode = cmap + font.readUInt32BE(record + 4);
    }
  }
  if (!fullUnicode || font.readUInt16BE(fullUnicode) !== 12) return fail('FONT', 'Expected the full-Unicode card font map.');
  const groups = font.readUInt32BE(fullUnicode + 12);
  const glyphFor = (codePoint: number) => {
    for (let index = 0; index < groups; index++) {
      const row = fullUnicode + 16 + index * 12;
      const start = font.readUInt32BE(row);
      if (codePoint < start) break;
      if (codePoint <= font.readUInt32BE(row + 4)) return font.readUInt32BE(row + 8) + codePoint - start;
    }
    return 0;
  };
  for (const index of spec.scenes.keys()) {
    for (const character of new Set(cardLines(spec, index).join(''))) {
      const codePoint = character.codePointAt(0)!;
      if (!glyphFor(codePoint)) fail('GLYPH', 'Scene ' + spec.scenes[index]!.sceneId +
        ' uses a character absent from the card font (U+' + codePoint.toString(16).toUpperCase() + ').');
    }
  }
}

async function sequenceFilter(work: string, scenes: Input['scenes'], spec: LocalizedSequence, font: Buffer) {
  await writeFile(join(work, 'card-font.ttf'), font, {flag: 'wx'});
  const filters: string[] = [];
  const inputs: string[] = [];
  const draw = (file: string, y: number, size: number, color: string) =>
    'drawtext=fontfile=card-font.ttf:expansion=none:textfile=' + file +
    ':fontsize=' + size + ':fontcolor=' + color + ':borderw=1:bordercolor=' + color + ':x=(w-text_w)/2:y=' + y;
  for (const [index, scene] of scenes.entries()) {
    if (scene.openingCard) {
      const lines = cardLines(spec, index);
      const files = await Promise.all(lines.map(async (line, row) => {
        const file = 'card-' + index + '-' + row + '.txt';
        await writeFile(join(work, file), line, {flag: 'wx'});
        return file;
      }));
      const titleSize = Math.min(46, Math.floor(600 / [...scene.openingCard.title].length));
      const card = '[card' + index + ']';
      filters.push([
        'color=c=0x10182C:s=720x1280:r=' + PRESENTATION_FPS + ':d=' + CARD_FRAMES / PRESENTATION_FPS,
        draw(files[0]!, 493, 32, '0x7ADFD9'),
        draw(files[1]!, 568, 58, 'white'),
        draw(files[2]!, 655, titleSize, '0xC6D7EC'),
        'format=yuv420p' + card,
      ].join(','));
      inputs.push(card);
    }
    inputs.push('[' + index + ':v]');
  }
  filters.push(inputs.join('') + 'concat=n=' + inputs.length + ':v=1:a=0,setpts=N/(' + PRESENTATION_FPS + '*TB)[out]');
  return filters.join(';');
}

async function assemble(data: string, spec: LocalizedSequence, signal: AbortSignal, onTask?: (id: string) => void, resumeId?: string) {
  data = await preflightPresentationState(data);
  const source = await inspectScenes(data, spec, signal);
  await requireCurrent(data, source.binding);
  const {font, identity: tools} = await toolchain(signal);
  validateCardGlyphs(font, spec);
  const input = Input.parse({spec, binding: source.binding, scenes: source.scenes, toolchain: tools});
  const id = identity(input);
  if (resumeId !== undefined && id !== resumeId) fail('RESUME_INPUT', 'Inputs or tools changed. Submit an explicit new sequence.');
  onTask?.(id);
  const runner = new TaskRunner(data);
  const cancellation = taskCancellation(signal);
  try {
    const task = await runner.run(KIND, input, async (directory, active) => {
      const {directory: work} = await createOwnedRuntimeTmp(directory);
      const paths: string[] = [];
      const checked = await inspectScenes(data, spec, active, async (_scene, child, index) => {
        const path = join(work, 'scene-' + index + '.mp4');
        await writeFile(path, child.get('preview.mp4')!, {flag: 'wx'});
        paths.push(path);
      });
      if (canonical(checked.scenes) !== canonical(input.scenes) || canonical(checked.binding) !== canonical(input.binding)) {
        fail('INTEGRITY', 'Sequence parents changed while staging.');
      }
      const movie = join(work, 'sequence.mp4');
      const filter = await sequenceFilter(work, checked.scenes, spec, font);
      await command(tools.ffmpeg, ['-v', 'error', '-xerror', '-nostdin', '-n',
        ...paths.flatMap(path => ['-protocol_whitelist', 'file', '-f', 'mov', '-i', path]),
        '-filter_complex', filter, '-map', '[out]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast',
        '-maxrate', '1700k', '-bufsize', '3400k', '-fs', String(MAX_MOVIE_BYTES), '-fps_mode', 'passthrough', '-movflags', '+faststart', movie],
      {cwd: work, signal: active, timeout: 300_000});
      await verifyMovie(movie, {mode: 'silent', timeline: {fps: PRESENTATION_FPS, totalFrames: checked.totalFrames}}, active, 300_000);
      if (canonical((await toolchain(active)).identity) !== canonical(tools)) fail('RESUME_INPUT', 'Sequence toolchain changed during assembly.');
      await requireCurrent(data, source.binding);
      const bytes = await boundedFile(movie, MAX_MOVIE_BYTES);
      const artifact = await runner.artifacts.commit(bytes, 'video/mp4', 'PUBLISH', id);
      return {value: makeResult(input, id, checked.totalFrames, bytes), outputs: [artifact]};
    }, cancellation.signal, {attempts: ATTEMPTS, timeoutMs: DEADLINE, beforeDiscardTemporary: cleanupOwnedRuntimeTmp});
    const {status} = await checkedResult(data, id, signal);
    return {...status, cached: task.cached};
  } finally {
    cancellation.dispose();
    runner.close();
  }
}

export async function assembleSequence(data: string, specPath: string, signal: AbortSignal, onTask?: (id: string) => void) {
  const raw = parse(await boundedFile(resolve(specPath), MAX_METADATA));
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw && raw.schemaVersion === 'presentation-sequence/1.2' &&
      !Locale.safeParse('locale' in raw ? raw.locale : undefined).success) {
    return fail('LOCALE', 'Set the sequence locale explicitly to en or zh-CN.');
  }
  const spec = Sequence.safeParse(raw);
  if (!spec.success) return fail('SCHEMA', 'Expected a strict sequence specification with two to four scenes and valid localized titles for 1.2.');
  if (spec.data.schemaVersion !== 'presentation-sequence/1.2') return fail('VERSION', 'New assembly requires localized sequence 1.2.');
  return assemble(data, spec.data, signal, onTask);
}

export async function statusSequence(data: string, id: string, signal: AbortSignal) {
  return (await checkedResult(data, id, signal)).status;
}

export async function resumeSequence(data: string, id: string, signal: AbortSignal, onTask?: (id: string) => void) {
  const task = await taskRecord(data, id, signal);
  if (task.state === 'succeeded') return {...await statusSequence(data, id, signal), cached: true};
  const {spec} = Input.parse(task.input);
  if (spec.schemaVersion !== 'presentation-sequence/1.2') return fail('VERSION', 'New assembly requires localized sequence 1.2.');
  return assemble(data, spec, signal, onTask, id);
}

export async function exportSequence(data: string, id: string, out: string, signal: AbortSignal) {
  const result = await checkedResult(data, id, signal, true);
  if (!result.files) return fail('NOT_READY', 'Sequence has no successful output to export.');
  return publishAssetFiles(data, id, out, result.files, signal, RECEIPT_PUBLICATION);
}
