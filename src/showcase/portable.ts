import {lstat, mkdir, mkdtemp, readdir, rename, rm, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {z} from 'zod';
import {canonical, sha256} from '../core/util.js';
import {checkAbort} from '../core/errors.js';
import {RECEIPT_PUBLICATION, publishAssetFiles} from '../story-planner/asset-pack.js';
import {ancestors, boundedFile, preflightStatePath} from '../story-planner/runtime.js';
import {candidateReviewDecision} from '../workflow/candidate-review.js';
import {Hash, MAX_JSON, SOURCE_KIND, SourceInput, captureShowcase, fail, json, loadShowcase, openShowcase, taskId, validateSource} from './inputs.js';
import {Verification, loadShowcaseRender, loadShowcaseReviews, validateShowcaseOutput} from './runtime.js';

const INDEX = 'showcase-package.json';
const IMPORT_KIND = 'showcase-portable-import-v1';
const MAX = 768_000_000;
const safePath = z.string().regex(/^(?:source|output|reviews)\/[a-z0-9./-]{1,160}$/)
  .refine(path => !path.split('/').some(part => !part || part === '.' || part === '..'));
const Portable = z.strictObject({schemaVersion: z.literal('portable-showcase/1.0'),
  source: SourceInput, verification: Verification,
  files: z.array(z.strictObject({path: safePath, sha256: Hash, bytes: z.number().int().positive().max(256_000_000)})).min(14).max(420),
});
type Portable = z.infer<typeof Portable>;
const relativeFrom = (root: string, path: string) => {
  const local = relative(root, path);
  return !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep);
};

function assertClosure(manifest: Portable, files: ReadonlyMap<string, Buffer>) {
  const {verification, source} = manifest;
  const select = (prefix: string) => new Map([...files].filter(([path]) => path.startsWith(prefix))
    .map(([path, bytes]) => [path.slice(prefix.length), bytes]));
  const sources = select('source/');
  const outputs = select('output/');
  const reviews = select('reviews/');
  const authoredManifest = sources.get('manifest.json');
  sources.delete('manifest.json');
  const {manifest: normalized} = validateSource(source, sources);
  validateShowcaseOutput(verification, outputs);
  if (taskId(SOURCE_KIND, source) !== verification.sourceTaskId ||
      source.sourceManifestSha256 !== verification.sourceManifestSha256 ||
      sha256(canonical(normalized)) !== verification.manifestSha256 || !authoredManifest?.equals(outputs.get('manifest.json')!) ||
      canonical(source.provenance ?? null) !== canonical(verification.provenance ?? null) ||
      !sources.get(normalized.script.path)!.equals(outputs.get('approved-script.json')!) ||
      !sources.get(normalized.approval.path)!.equals(outputs.get('owner-approval.json')!)) {
    fail('Portable render differs from its input closure.', 'SHOWCASE_PORTABLE');
  }
  for (const [path, bytes] of reviews) {
    if (path !== sha256(bytes) + '.json' || !verification.candidateSha256 || bytes.length > MAX_JSON) {
      fail('Portable review digest or candidate differs.', 'SHOWCASE_PORTABLE');
    }
    candidateReviewDecision(json(bytes), verification.candidateSha256, 'video');
  }
  return {sources, outputs, reviews};
}

export async function exportShowcase(data: string, id: string, out: string, signal: AbortSignal) {
  const runner = await openShowcase(data);
  try {
    const rendered = await loadShowcaseRender(runner, id, signal);
    const {verification} = rendered.result;
    const source = await loadShowcase(runner, verification.sourceTaskId, signal);
    const reviews = await loadShowcaseReviews(runner, id, verification.candidateSha256, signal);
    const files = new Map<string, Buffer>([
      ...[...source.assets].map(([path, bytes]) => ['source/' + path, bytes] as const),
      ['source/manifest.json', rendered.files.get('manifest.json')!],
      ...[...rendered.files].map(([path, bytes]) => ['output/' + path, bytes] as const),
      ...reviews,
    ]);
    let total = 0;
    const entries = [...files].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([path, bytes]) => {
      total += bytes.length;
      return {path, sha256: sha256(bytes), bytes: bytes.length};
    });
    if (total > MAX) fail('Showcase package exceeds the 768 MB limit.', 'SHOWCASE_PORTABLE');
    const manifest = Portable.parse({schemaVersion: 'portable-showcase/1.0', source: source.input, verification, files: entries});
    assertClosure(manifest, files);
    const bytes = Buffer.from(canonical(manifest));
    files.set(INDEX, bytes);
    const output = await publishAssetFiles(runner.root, id, out, files, signal, RECEIPT_PUBLICATION);
    return {...output, schemaVersion: 'portable-showcase-export/1.0', digest: sha256(bytes),
      candidateSha256: verification.candidateSha256, reviews: reviews.size, ownerAcceptance: 'pending'};
  } finally { runner.close(); }
}

export async function readShowcasePackage(root: string, digest: string, signal: AbortSignal) {
  root = resolve(root);
  Hash.parse(digest);
  const raw = await boundedFile(join(root, INDEX), MAX_JSON);
  if (sha256(raw) !== digest) fail('Showcase package index digest differs.', 'SHOWCASE_PORTABLE');
  const manifest = Portable.parse(json(raw));
  if (raw.toString('utf8') !== canonical(manifest)) fail('Expected a canonical showcase package index.', 'SHOWCASE_PORTABLE');
  const expected = new Set([INDEX, ...manifest.files.map(file => file.path)]);
  if (expected.size !== manifest.files.length + 1 || manifest.files.reduce((total, file) => total + file.bytes, 0) > MAX) {
    fail('Duplicate package paths or excessive package size.', 'SHOWCASE_PORTABLE');
  }
  const remaining = new Set(expected);
  async function inspect(dir: string, prefix = '') {
    for (const entry of await readdir(dir, {withFileTypes: true})) {
      checkAbort(signal);
      const path = prefix + entry.name;
      if (entry.isDirectory() && [...expected].some(file => file.startsWith(path + '/'))) {
        await inspect(join(dir, entry.name), path + '/');
      } else if (!entry.isFile() || !remaining.delete(path)) {
        fail(`Unexpected portable file or link: ${path}`, 'SHOWCASE_PORTABLE');
      }
    }
  }
  await inspect(root);
  if (remaining.size) fail('Showcase package files are missing.', 'SHOWCASE_PORTABLE');
  const files = new Map<string, Buffer>();
  for (const entry of manifest.files) {
    checkAbort(signal);
    const bytes = await boundedFile(join(root, ...entry.path.split('/')), entry.bytes);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
      fail(`Showcase package file digest differs: ${entry.path}`, 'SHOWCASE_PORTABLE');
    }
    files.set(entry.path, bytes);
  }
  return {manifest, raw, files, ...assertClosure(manifest, files)};
}

async function absent(path: string) {
  try { await lstat(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  fail('Showcase import workspace must be new.', 'SHOWCASE_PORTABLE');
}

export async function importShowcase(packageRoot: string, digest: string, workspace: string, signal: AbortSignal) {
  workspace = resolve(workspace);
  packageRoot = resolve(packageRoot);
  if (relativeFrom(workspace, packageRoot) || relativeFrom(packageRoot, workspace)) {
    fail('Portable package and import workspace must be disjoint.', 'SHOWCASE_PORTABLE');
  }
  const pkg = await readShowcasePackage(packageRoot, digest, signal);
  preflightStatePath(join(workspace, 'state'));
  await ancestors(dirname(workspace), true);
  await absent(workspace);
  const stage = await mkdtemp(join(dirname(workspace), '.gve-showcase-'));
  try {
    const runner = await openShowcase(join(stage, 'state'), true);
    let sourceTaskId: string;
    let importTaskId: string;
    try {
      sourceTaskId = await captureShowcase(runner, pkg.manifest.source, pkg.sources, signal);
      const request = {schemaVersion: 'showcase-portable-import/1.0', digest, sourceTaskId,
        historicalRenderTaskId: pkg.manifest.verification.taskId, candidateSha256: pkg.manifest.verification.candidateSha256};
      importTaskId = taskId(IMPORT_KIND, request);
      await runner.run(IMPORT_KIND, request, async (dir, child) => {
        const index = await runner.artifacts.commit(pkg.raw, 'application/json', 'PUBLISH', importTaskId);
        const outputs = [index];
        for (const [path, bytes] of [...pkg.outputs, ...pkg.reviews]) {
          checkAbort(child);
          const type = path.endsWith('.mp4') ? 'video/mp4' : path.endsWith('.png') ? 'image/png' :
            path.endsWith('.pcm') ? 'application/octet-stream' : 'application/json';
          outputs.push(await runner.artifacts.commit(bytes, type, 'PUBLISH', importTaskId));
        }
        return {value: {...request, ownerAcceptance: 'pending', reviews: 'historical', index}, outputs};
      }, signal, {attempts: 3});
    } finally { runner.close(); }
    for (const [path, bytes] of [[INDEX, pkg.raw] as const, ...pkg.files]) {
      checkAbort(signal);
      const file = join(stage, 'showcase', ...path.split('/'));
      await mkdir(dirname(file), {recursive: true});
      await writeFile(file, bytes, {flag: 'wx'});
    }
    // A local immutable byte inventory accompanies the rebuilt source checkpoint.
    await readShowcasePackage(join(stage, 'showcase'), digest, signal);
    await absent(workspace);
    checkAbort(signal);
    await rename(stage, workspace);
    return {schemaVersion: 'portable-showcase-import/1.0', workspace, digest,
      data: join(workspace, 'state'), bundle: join(workspace, 'showcase'),
      sourceTaskId, importTaskId, historicalRenderTaskId: pkg.manifest.verification.taskId,
      candidateSha256: pkg.manifest.verification.candidateSha256, reviews: 'historical', ownerAcceptance: 'pending', resumable: true};
  } finally { await rm(stage, {recursive: true, force: true}); }
}
