import {lstat} from 'node:fs/promises';
import {dirname, extname, join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactSchema} from '../contracts/runtime.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner} from '../orchestrator/tasks.js';
import {ImportTtsSchema, ttsInput} from '../providers/tts.js';
import {validateReelNarrationReceipt} from '../renderer/approved-reel.js';
import {ShowcaseDraftManifest, ShowcaseManifest, validateShowcase} from '../renderer/showcase-reel-contract.js';
import {ancestors, boundedFile, preflightStatePath} from '../story-planner/runtime.js';
import {candidateReviewDecision} from '../workflow/candidate-review.js';
import {MAX_WORKSPACE_SOURCE, validateWorkspaceSource, workspaceReviewName, workspaceSourceName} from './workspace.js';

export const SOURCE_KIND = 'showcase-source-v1';
export const Hash = z.string().regex(/^[a-f0-9]{64}$/);
export const MAX_JSON = 2_000_000;
const MAX_SOURCE_BYTES = 512_000_000;
const normal = (bytes: Buffer) => new TextDecoder('utf-8', {fatal: true}).decode(bytes);
export function json(bytes: Buffer): unknown {
  return JSON.parse(normal(bytes));
}
export function taskId(kind: string, input: unknown) {
  return sha256(canonical({version: 'production-task-v1', kind, input}));
}
export function fail(message: string, code = 'SHOWCASE_INPUT'): never {
  throw new EngineError(code, message);
}

export const ShowcaseOwnerApproval = z.strictObject({
  schemaVersion: z.literal('script-owner-authorization/1.0'),
  scriptSha256: Hash,
  authority: z.string().trim().min(1).max(4000),
  approvedDocumentSha256: Hash.optional(),
  identityAuthentication: z.string().max(4000).optional(),
  historicalNote: z.string().max(4000).optional(),
  scope: z.string().max(4000).optional(),
});
const Receipt = z.strictObject({
  schemaVersion: z.literal('tts-receipt/1.0'),
  fingerprint: Hash,
  input: z.strictObject({
    provider: z.literal('local-import'), adapterVersion: z.literal('local-import-v1'),
    text: z.string(), voiceLabel: z.string(), sourceSha256: Hash,
    mediaType: z.enum(['audio/wav', 'audio/mpeg', 'audio/flac']),
  }),
  voiceLabel: z.string(), artifact: ArtifactSchema,
  createdAt: z.iso.datetime(), durationSeconds: z.number().positive().max(600),
  requestId: z.null(), estimatedMaxChargeMicros: z.literal(0), actualChargeMicros: z.null(),
  chargeBasis: z.literal('local-import-no-provider-call'),
  transcriptVerification: z.literal('caller-declared; recorded speech not verified'),
  review: z.literal('pending-owner-listening'),
});
export const ShowcaseScript = z.strictObject({
  sourceBindingSha256: Hash.optional(),
  storyboardSha256: Hash.optional(),
  reviewPolicy: z.literal('independent-script-review-required').optional(),
  lines: z.array(z.tuple([z.string(), z.string()])),
  shots: z.array(z.string()),
});
export type Manifest = z.infer<typeof ShowcaseManifest>;
type Asset = {path: string; sha256: string};
type Entry = Asset & {mediaType: string; limit: number};
const image = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'} as const;
const video = {'.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm'} as const;
const audio = {'.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.flac': 'audio/flac'} as const;
const sourceFormat = (path: string, formats: Readonly<Record<string, string>>) => {
  const extension = extname(path).toLowerCase();
  const mediaType = formats[extension];
  if (typeof mediaType !== 'string') fail(`Unsupported showcase asset extension: ${extension}`);
  return {extension, mediaType};
};

/** Stable across file moves. Policy excludes generated audio, receipts, and still sampling. */
export function showcaseStoryboardSha256(raw: unknown) {
  const manifest = z.union([ShowcaseDraftManifest, ShowcaseManifest]).parse(raw);
  const {theme, layout, cinematic, projectLabel, beats, font, media, narration} = manifest;
  return sha256(canonical({schemaVersion: 'showcase-storyboard/1.0', theme, layout: layout ?? 'standard',
    cinematic: cinematic ?? {}, projectLabel, beats, fontSha256: font.sha256,
    media: media.map(({path, ...visual}) => ({...visual, extension: extname(path).toLowerCase()})),
    captionLayout: narration.map(({id, captionChunks, captionCues}) => ({
      id, ...(captionChunks ? {captionChunks} : {}), ...(captionCues ? {captionCues} : {}),
    })),
  }));
}

function sourceEntries(manifest: Manifest) {
  const entries = new Map<string, {entry: Entry; local: string}>();
  const put = (asset: Asset, path: string, mediaType: string, limit: number) => {
    const entry = {path, sha256: asset.sha256, mediaType, limit};
    entries.set(path, {entry, local: asset.path});
    return {path, sha256: asset.sha256};
  };
  const normalized: Manifest = {
    ...manifest,
    script: put(manifest.script, 'approved-script.json', 'application/json', MAX_JSON),
    approval: put(manifest.approval, 'owner-approval.json', 'application/json', MAX_JSON),
    font: put(manifest.font, 'assets/font.ttf', 'font/ttf', 20_000_000),
    media: manifest.media.map(visual => {
      const {extension, mediaType} = sourceFormat(visual.path, visual.type === 'image' ? image : video);
      // Prefixes and indices avoid collisions on case-insensitive hosts and reserved file names.
      return {...visual, ...put(visual, `assets/visual-${entries.size}${extension}`, mediaType, 256_000_000)};
    }),
    narration: manifest.narration.map((line, index) => {
      const {extension, mediaType} = sourceFormat(line.path, audio);
      return {
        ...line,
        ...put(line, `assets/narration-${index}${extension}`, mediaType, 25_000_000),
        receipt: put(line.receipt, `receipts/narration-${index}.json`, 'application/json', MAX_JSON),
      };
    }),
  };
  if (manifest.scriptReview) {
    normalized.scriptReview = put(manifest.scriptReview, workspaceReviewName, 'application/json', MAX_JSON);
  }
  return {manifest: normalized, entries};
}
export const SourceInput = z.strictObject({
  schemaVersion: z.literal('showcase-source/1.0'),
  sourceManifestSha256: Hash,
  manifest: ShowcaseManifest,
  provenance: z.strictObject({sourceSha256: Hash, reviewSha256: Hash}).optional(),
  standaloneReviewSha256: Hash.optional(),
});
export type SourceInput = z.infer<typeof SourceInput>;
function inputEntries(input: SourceInput) {
  const material = sourceEntries(input.manifest);
  if (input.provenance) {
    const {sourceSha256, reviewSha256} = input.provenance;
    for (const [path, hash, limit] of [[workspaceSourceName, sourceSha256, MAX_WORKSPACE_SOURCE], [workspaceReviewName, reviewSha256, MAX_JSON]] as const) {
      material.entries.set(path, {entry: {path, sha256: hash, limit, mediaType: 'application/json'}, local: path});
    }
  }
  if ((input.manifest.scriptReview?.sha256 ?? null) !== (input.standaloneReviewSha256 ?? null) ||
      (input.provenance && input.standaloneReviewSha256)) {
    fail('Expected one exact source-derived script review binding.');
  }
  return material;
}
const SourceResult = z.strictObject({files: z.array(z.strictObject({
  path: z.string(), artifact: ArtifactSchema,
})).min(6).max(75)});

export function validateSource(input: SourceInput, assets: ReadonlyMap<string, Buffer>) {
  const {manifest, entries} = inputEntries(input);
  if (canonical(manifest) !== canonical(input.manifest) || assets.size !== entries.size) {
    fail('Showcase source paths or file set differ from the portable layout.');
  }
  let total = 0;
  for (const {entry} of entries.values()) {
    const bytes = assets.get(entry.path);
    if (!bytes || !bytes.length || bytes.length > entry.limit || sha256(bytes) !== entry.sha256) {
      fail(`Showcase source bytes differ: ${entry.path}`, 'SHOWCASE_INTEGRITY');
    }
    total += bytes.length;
    if (total > MAX_SOURCE_BYTES) fail('Showcase source exceeds the 512 MB asset budget.');
  }
  if (!['00010000', '4f54544f'].includes(assets.get(manifest.font.path)!.subarray(0, 4).toString('hex'))) {
    fail('Font asset must be a local TrueType/OpenType font.');
  }
  const scriptBytes = assets.get(manifest.script.path)!;
  const approved = ShowcaseScript.parse(json(scriptBytes));
  if (input.provenance) {
    const source = validateWorkspaceSource(assets.get(workspaceSourceName)!);
    const decision = candidateReviewDecision(json(assets.get(workspaceReviewName)!), manifest.script.sha256, 'script');
    if (approved.sourceBindingSha256 !== source.source.bindingSha256 ||
        approved.storyboardSha256 !== showcaseStoryboardSha256(manifest) || decision.status !== 'passed') {
      fail('Workspace showcase requires an exact script/storyboard bound to the pinned source and a passing owner-authorized script review.', 'SHOWCASE_REVIEW');
    }
  } else {
    if (approved.reviewPolicy && !input.standaloneReviewSha256) {
      fail('This approved script requires its exact independent script review.', 'SHOWCASE_REVIEW');
    }
    if (input.standaloneReviewSha256 && (
        approved.storyboardSha256 === undefined ||
        candidateReviewDecision(json(assets.get(workspaceReviewName)!), manifest.script.sha256, 'script').status !== 'passed'
    )) {
      fail('Finalized showcase requires an exact storyboard and passing owner-authorized script review.', 'SHOWCASE_REVIEW');
    }
    if (approved.sourceBindingSha256 !== undefined) fail('Use the original URL workspace or a verified portable package for this source-bound script.');
    if (approved.storyboardSha256 !== undefined && approved.storyboardSha256 !== showcaseStoryboardSha256(manifest)) {
      fail('Authored showcase visuals differ from the exact approved storyboard.', 'SHOWCASE_REVIEW');
    }
  }
  const {script} = validateShowcase(scriptBytes, ShowcaseOwnerApproval.parse(json(assets.get(manifest.approval.path)!)), manifest);
  for (const [index, line] of manifest.narration.entries()) {
    const receipt = Receipt.parse(json(assets.get(line.receipt.path)!));
    const {adapterVersion: _adapterVersion, ...localImport} = receipt.input;
    const expectedInput = ttsInput(ImportTtsSchema.parse({...localImport, schemaVersion: '1.0'}));
    const mediaType = entries.get(line.path)!.entry.mediaType;
    if (canonical(receipt.input) !== canonical(expectedInput) || receipt.voiceLabel !== receipt.input.voiceLabel ||
        receipt.artifact.bytes !== assets.get(line.path)!.length ||
        receipt.artifact.mediaType !== mediaType || receipt.input.mediaType !== mediaType ||
        receipt.artifact.id !== line.sha256 || receipt.artifact.storage !== expectedAudioStorage(line.sha256, mediaType)) {
      fail('Local narration receipt metadata differs from the bound narration asset.');
    }
    validateReelNarrationReceipt(line, script.lines[index]![1], receipt);
  }
  return {manifest, script, entries};
}

function expectedAudioStorage(hash: string, mediaType: string) {
  const extension = Object.entries(audio).find(([, type]) => type === mediaType)![0];
  return hash.slice(0, 2) + '/' + hash + extension;
}

export async function openShowcase(data: string, create = false) {
  data = resolve(data);
  preflightStatePath(data);
  await ancestors(data, create);
  for (const name of ['tasks.sqlite', 'tasks.sqlite-wal', 'tasks.sqlite-shm']) {
    try {
      const info = await lstat(join(data, name));
      if (!info.isFile() || info.isSymbolicLink()) fail('Showcase task state files must be regular files.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (!create && name === 'tasks.sqlite') fail('Existing showcase task state was not found.');
    }
  }
  return new TaskRunner(data);
}

export async function readShowcaseSpec(path: string, signal: AbortSignal) {
  path = resolve(path);
  const raw = await boundedFile(path, MAX_JSON);
  const normalized = sourceEntries(ShowcaseManifest.parse(json(raw)));
  const input = SourceInput.parse({
    schemaVersion: 'showcase-source/1.0',
    sourceManifestSha256: sha256(raw),
    manifest: normalized.manifest,
    ...(normalized.manifest.scriptReview ? {standaloneReviewSha256: normalized.manifest.scriptReview.sha256} : {}),
  });
  const assets = new Map<string, Buffer>();
  let total = 0;
  for (const {entry, local} of normalized.entries.values()) {
    checkAbort(signal);
    const bytes = await boundedFile(resolve(dirname(path), local), entry.limit);
    assets.set(entry.path, bytes);
    total += bytes.length;
    if (total > MAX_SOURCE_BYTES) fail('Showcase source exceeds the 512 MB asset budget.');
  }
  return {input, assets};
}

export async function captureShowcase(runner: TaskRunner, raw: SourceInput, assets: ReadonlyMap<string, Buffer>, signal: AbortSignal) {
  const input = SourceInput.parse(raw);
  const {entries} = validateSource(input, assets);
  const id = taskId(SOURCE_KIND, input);
  const result = await runner.run(SOURCE_KIND, input, async (_dir, child) => {
    const files = [];
    for (const {entry} of entries.values()) {
      checkAbort(child);
      const artifact = await runner.artifacts.commit(assets.get(entry.path)!, entry.mediaType, 'RESOLVE_ASSETS', id);
      files.push({path: entry.path, artifact});
    }
    return {value: {files}, outputs: files.map(file => file.artifact)};
  }, signal, {attempts: 3});
  return result.id;
}

export async function loadShowcase(runner: TaskRunner, id: string, signal: AbortSignal) {
  const task = runner.get(Hash.parse(id));
  if (!task || task.kind !== SOURCE_KIND || task.state !== 'succeeded' || !task.result) {
    fail('A complete showcase source checkpoint is required.', 'SHOWCASE_TASK');
  }
  const input = SourceInput.parse(task.input);
  const {entries} = inputEntries(input);
  if (taskId(SOURCE_KIND, input) !== id || task.result.inputFingerprint !== id) {
    fail('Showcase source task fingerprint differs.', 'SHOWCASE_INTEGRITY');
  }
  const result = SourceResult.parse(await runner.artifacts.readJson(task.result));
  if (canonical(task.outputs) !== canonical(result.files.map(file => file.artifact))) {
    fail('Showcase source task artifact list differs.', 'SHOWCASE_INTEGRITY');
  }
  const assets = new Map<string, Buffer>();
  let total = 0;
  for (const {path, artifact} of result.files) {
    checkAbort(signal);
    const entry = entries.get(path)?.entry;
    if (!entry || assets.has(path) || artifact.inputFingerprint !== id || artifact.sha256 !== entry.sha256 ||
        artifact.mediaType !== entry.mediaType || artifact.bytes > entry.limit) {
      fail('Showcase source artifact binding differs.', 'SHOWCASE_INTEGRITY');
    }
    await runner.artifacts.verify(artifact);
    const bytes = await boundedFile(runner.artifacts.path(artifact), entry.limit);
    assets.set(path, bytes);
    total += bytes.length;
    if (total > MAX_SOURCE_BYTES) fail('Showcase source exceeds the 512 MB asset budget.');
  }
  return {input, assets, ...validateSource(input, assets)};
}
