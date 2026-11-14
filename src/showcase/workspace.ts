import {lstat, writeFile, rename, unlink} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {AuthoringBinding} from '../contracts/authoring.js';
import {RepositorySnapshotSchema, RepositoryUrl} from '../contracts/planning.js';
import {canonical, sha256} from '../core/util.js';
import {boundedFile} from '../story-planner/runtime.js';
import {Request} from '../workflow/explanation-contract.js';
import {captureNarrativeStart} from '../workflow/explanation-session.js';
import {evidenceWorkspace} from '../workflow/project-evidence.js';
import {sourceFingerprint, validateSnapshot} from '../workflow/store.js';
import {acquireNarrativeWorkspaceLock} from '../workflow/narrative-run.js';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const Owner = z.strictObject({schemaVersion: z.literal('repository-narrative-workspace/1.0'), repository: RepositoryUrl});
const Source = z.strictObject({schemaVersion: z.literal('repository-narrative-run-source/1.0'), taskId: hash, bindingSha256: hash});
const WorkspaceSource = z.strictObject({
  schemaVersion: z.literal('showcase-workspace-source/1.0'),
  owner: Owner, source: Source, request: Request, binding: AuthoringBinding, snapshot: RepositorySnapshotSchema,
});
const Pointer = z.strictObject({schemaVersion: z.literal('showcase-workspace-pointer/1.0'), taskId: hash, sourceTaskId: hash,
  candidateSha256: hash});
export type Pointer = z.infer<typeof Pointer>;
export const workspaceSourceName = 'provenance/pinned-source.json';
export const workspaceReviewName = 'provenance/script-review.json';
export const MAX_WORKSPACE_SOURCE = 4_050_000;
const decode = (bytes: Buffer): unknown => JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));

export function validateWorkspaceSource(bytes: Buffer) {
  const value = WorkspaceSource.parse(decode(bytes));
  if (bytes.toString('utf8') !== canonical(value)) throw new Error('Expected canonical showcase source provenance.');
  const {owner, source, request, binding, snapshot} = value;
  validateSnapshot(snapshot);
  const snapshotHash = sourceFingerprint(snapshot);
  const evidence = evidenceWorkspace('explain-' + source.taskId.slice(0, 48), snapshotHash, snapshot).manifest;
  const {projectId, repository, commit} = evidence;
  const rebuilt = {projectId, repository, commit, snapshotHash, evidenceFingerprint: evidence.fingerprint};
  const extra = 'sourcePaths' in request ? request.sourcePaths : [];
  if (canonical(rebuilt) !== canonical(binding) || sha256(canonical(binding)) !== source.bindingSha256 ||
      request.repository !== repository || owner.repository !== repository || request.voiceMode !== 'silent' ||
      (/^[a-f0-9]{40}$/.test(request.ref) && request.ref !== commit) ||
      [...request.documents, ...extra].some(path => !snapshot.documents.some(doc => doc.path === path)) ||
      (extra.length > 0 && canonical(snapshot.documents.slice(-extra.length).map(doc => doc.path)) !== canonical(extra))) {
    throw new Error('Pinned showcase source provenance differs from the verified workspace capture.');
  }
  return value;
}

export async function workspaceShowcaseSource(workspace: string, signal: AbortSignal) {
  workspace = resolve(workspace);
  const owner = Owner.parse(decode(await boundedFile(join(workspace, 'workspace.json'))));
  const source = Source.parse(decode(await boundedFile(join(workspace, 'source.json'))));
  const request = Request.parse(decode(await boundedFile(join(workspace, 'request.json'))));
  const captured = await captureNarrativeStart(join(workspace, 'state'), source.taskId, signal);
  const {binding, request: capturedRequest} = captured.manifest;
  if (captured.manifest.taskId !== source.taskId || canonical(capturedRequest) !== canonical(request)) {
    throw new Error('Workspace source request differs from the verified URL capture.');
  }
  const bytes = Buffer.from(canonical({schemaVersion: 'showcase-workspace-source/1.0', owner, source, request, binding, snapshot: captured.snapshot}));
  validateWorkspaceSource(bytes);
  return bytes;
}

export const lockShowcaseWorkspace = acquireNarrativeWorkspaceLock;
export async function readShowcasePointer(workspace: string) {
  try {
    return Pointer.parse(decode(await boundedFile(join(resolve(workspace), 'current-showcase.json'))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return undefined;
  }
}

/** Called under the shared workspace lock. Every movie referenced here is an immutable TaskRunner result. */
export async function writeShowcasePointer(workspace: string, value: Omit<Pointer, 'schemaVersion'>) {
  const path = join(resolve(workspace), 'current-showcase.json');
  await readShowcasePointer(workspace);
  const candidate = Pointer.parse({schemaVersion: 'showcase-workspace-pointer/1.0', ...value});
  const temporary = path + '.' + randomUUID() + '.partial';
  try {
    await writeFile(temporary, canonical(candidate), {flag: 'wx'});
    // The existing destination, if present, was parsed as our own pointer.
    const info = await lstat(temporary);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Invalid showcase checkpoint staging.');
    await rename(temporary, path);
  } finally { await unlink(temporary).catch(() => {}); }
}
