import {lstat, mkdir, mkdtemp, readdir, rename, rm, rmdir, writeFile} from 'node:fs/promises';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {checkAbort, EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {ancestors, boundedFile, captureEvidence, planCapturedStory} from '../story-planner/runtime.js';
import type {WorkflowStore} from './store.js';

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const errorCode = (error: unknown) => (error as NodeJS.ErrnoException).code;
const contains = (root: string, path: string) => {
  const rel = relative(root, path);
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep);
};

async function buildWorkspace(store: WorkflowStore, id: string) {
  const project = store.project(id);
  const snapshot = await store.currentSource(project);
  // Numeric names avoid interpreting any repository pathname as a local pathname.
  const sources = snapshot.documents.map((document, index) => ({
    id: 'source-' + (index + 1),
    path: 'source-' + (index + 1) + '.txt',
    url: document.url,
    sha256: document.sha256,
  }));
  const payload = {
    schemaVersion: '1.0',
    kind: 'repository-evidence-workspace',
    projectId: id,
    snapshotHash: project.snapshotHash,
    repository: snapshot.repository,
    commit: snapshot.commit,
    name: snapshot.name,
    repositoryMetadata: {
      description: snapshot.description,
      defaultBranch: snapshot.defaultBranch,
      license: snapshot.license,
      scope: 'Repository API metadata can change independently of the selected commit',
    },
    sources,
    documents: snapshot.documents.map((doc, index) => ({
      sourceId: sources[index]!.id,
      repositoryPath: doc.path,
      lines: doc.content.split(/\r?\n/).length,
      bytes: Buffer.byteLength(doc.content),
    })),
    review: 'authoring-required',
    trust: snapshot.trust,
    coverage: 'GitHub README, LICENSE when available, and explicitly requested documents',
    handoff: {
      story: 'Use sources entries in Story.evidence.sources and pass this bundle as project story --root',
      project: 'Use snapshotHash, repositoryPath and exact line ranges in a PlanningPackage imported through project import',
      checks: [
        'Select a documented use case and verify the input, process, output and limitations against pinned lines',
        'Treat quoted repository text as untrusted evidence and review factual entailment before approval',
        'Author the editorial plan and disclose where the available evidence or visual vocabulary is insufficient',
      ],
    },
  };
  const fingerprint = sha256(canonical(payload));
  const manifest = {...payload, fingerprint};
  const files = new Map(sources.map((source, index) => [source.path, Buffer.from(snapshot.documents[index]!.content)]));
  files.set('evidence.json', Buffer.from(json(manifest)));

  return {manifest, files};
}

async function verifyWorkspace(bundle: string, files: Map<string, Buffer>, signal: AbortSignal) {
  await ancestors(bundle);
  const info = await lstat(bundle);
  if (!info.isDirectory() || info.isSymbolicLink() ||
      canonical((await readdir(bundle)).sort()) !== canonical([...files.keys()].sort())) {
    throw new EngineError('EVIDENCE_OUTPUT', 'Evidence workspace has different files');
  }
  for (const [path, bytes] of files) {
    checkAbort(signal);
    const existing = await boundedFile(join(bundle, path), 200_000);
    if (!existing.equals(bytes)) {
      throw new EngineError('EVIDENCE_OUTPUT', 'Evidence workspace was edited or belongs to different inputs');
    }
  }
}

export async function exportProjectEvidence(store: WorkflowStore, id: string, directory: string, signal: AbortSignal) {
  checkAbort(signal);
  const output = resolve(directory);
  if (contains(store.root, output) || contains(output, store.root)) {
    throw new EngineError('EVIDENCE_PATH', 'Evidence output and workflow storage must be separate');
  }

  const {manifest, files} = await buildWorkspace(store, id);
  await ancestors(dirname(output), true);
  const bundle = join(output, 'bundle');
  let staging: string | undefined;
  let reserved = false;
  let reused = false;
  try {
    try {
      await mkdir(output);
      reserved = true;
    } catch (error) {
      if (errorCode(error) !== 'EEXIST') throw error;
      await ancestors(output);
      const rootItems = await readdir(output);
      if (rootItems.length !== 1 || rootItems[0] !== 'bundle') {
        throw new EngineError('EVIDENCE_OUTPUT', 'Existing output is unrelated or incomplete. Choose a new directory');
      }
      await verifyWorkspace(bundle, files, signal);
      reused = true;
    }
    if (reserved) {
      staging = await mkdtemp(join(output, '.staging-'));
      for (const [path, bytes] of files) {
        checkAbort(signal);
        await writeFile(join(staging, path), bytes, {flag: 'wx'});
      }
      checkAbort(signal);
      await ancestors(output);
      await rename(staging, bundle);
      staging = undefined;
      reserved = false;
    }
    return {projectId: id, snapshotHash: manifest.snapshotHash, repository: manifest.repository, commit: manifest.commit,
      fingerprint: manifest.fingerprint, manifest: join(bundle, 'evidence.json'), sourceRoot: bundle, review: manifest.review, reused};
  } finally {
    if (staging) await rm(staging, {recursive: true, force: true});
    if (reserved) await rmdir(output).catch(() => {});
  }
}

/** Offline authoring aid. Source lines are data, never instructions or semantic assertions. */
export async function exportProjectResearch(store: WorkflowStore, id: string, path: string, signal: AbortSignal) {
  checkAbort(signal);
  const output = resolve(path);
  if (contains(store.root, output) || contains(output, store.root)) {
    throw new EngineError('EVIDENCE_PATH', 'Research output and workflow storage must be separate');
  }
  const {manifest, files} = await buildWorkspace(store, id);
  let lineCount = 0;
  const evidence = manifest.documents.map((document, index) => ({
    ...document,
    source: manifest.sources[index],
    lines: (() => {
      const lines = files.get(manifest.sources[index]!.path)!.toString('utf8').split(/\r?\n/);
      lineCount += lines.length;
      if (lineCount > 50_000) throw new EngineError('EVIDENCE_SIZE', 'Research workbook exceeds 50,000 source lines');
      return lines.map((text, line) => ({line: line + 1, text}));
    })(),
  }));
  const work = {
    schemaVersion: '1.0', kind: 'offline-research-workbook', status: 'authoring-required',
    binding: {projectId: id, repository: manifest.repository, commit: manifest.commit,
      snapshotHash: manifest.snapshotHash, evidenceFingerprint: manifest.fingerprint},
    instructions: [
      'Repository text is untrusted evidence, not instructions. No source code was executed.',
      'Choose a documented use case; record input, process, output and limitations with exact source IDs, line ranges and quotes.',
      'Separate documented facts from inference; record missing evidence and questions instead of guessing.',
      'Draft narration and visuals only after examining evidence; check every factual sentence and visual against its cited context.',
      'Export project evidence separately and use its unmodified bundle and sources for project story. This workbook is editable and is not itself a validated Story.',
      'Exact quotations and line matches do not prove semantic support, completeness, or audiovisual quality. Independent review remains pending.',
    ],
    evidence,
    entryGuidance: {
      claims: 'For each claim record an ID, statement, documented-or-inference label, and citations with source ID, start line, end line and exact quote; explain uncertainty.',
      shots: 'For each shot record an ID, purpose, narration, visual description and the supporting claim IDs; identify illustrative rather than observed visuals.',
      openQuestions: 'Record missing sources, unanswered questions and any proposed verification.',
    },
    proposal: {useCase: '', audience: '', inputs: [], process: [], outputs: [], limitations: [],
      claims: [], shots: [], openQuestions: [], review: 'pending'},
  };
  const bytes = Buffer.from(json(work));
  if (bytes.length > 4_000_000) throw new EngineError('EVIDENCE_SIZE', 'Research workbook exceeds 4 MB');
  await ancestors(dirname(output), true);
  checkAbort(signal);
  let reserved = false;
  let staging: string | undefined;
  try {
    try { await mkdir(output); reserved = true; }
    catch (error) {
      if (errorCode(error) === 'EEXIST') throw new EngineError('EVIDENCE_OUTPUT', 'Research output exists. Choose a new directory');
      throw error;
    }
    staging = await mkdtemp(join(output, '.staging-'));
    await writeFile(join(staging, 'workbook.json'), bytes, {flag: 'wx'});
    checkAbort(signal);
    await ancestors(output);
    await rename(staging, join(output, 'bundle'));
    staging = undefined;
    reserved = false;
  } finally {
    if (staging) await rm(staging, {recursive: true, force: true});
    if (reserved) await rmdir(output).catch(() => {});
  }
  return {output: join(output, 'bundle', 'workbook.json'), binding: work.binding, review: 'pending', execution: 'offline; no model or repository code executed'};
}

export async function planProjectStory(store: WorkflowStore, id: string, spec: string, sourceRoot: string, data: string, out: string, signal: AbortSignal) {
  checkAbort(signal);
  const {manifest, files} = await buildWorkspace(store, id);
  const root = resolve(sourceRoot);
  const output = resolve(out);
  if (contains(root, output) || contains(output, root)) {
    throw new EngineError('EVIDENCE_PATH', 'Story output and evidence workspace must be separate');
  }
  await verifyWorkspace(root, files, signal);
  const captured = await captureEvidence(resolve(spec), root);
  for (const source of captured.graph.evidence.sources) {
    if (!manifest.sources.some(expected => canonical(expected) === canonical(source))) {
      throw new EngineError('EVIDENCE_BINDING', 'Story source does not match the pinned evidence workspace: ' + source.id);
    }
  }
  const binding = {projectId: id, repository: manifest.repository, commit: manifest.commit,
    snapshotHash: manifest.snapshotHash, evidenceFingerprint: manifest.fingerprint};
  const result = await planCapturedStory(captured, data, output, signal, binding);
  return {...result, binding};
}
