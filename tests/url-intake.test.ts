import {expect, it, vi} from 'vitest';
import {mkdir, readFile, readdir, rename, symlink, writeFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {workflowCommand} from '../src/workflow/cli.js';
import {StorySchema} from '../src/contracts/story.js';
import {statusStory, exportStory} from '../src/story-planner/runtime.js';
import {ArtifactStore} from '../src/assets/store.js';
import {sha256} from '../src/core/util.js';
import {workflowRoot} from './workflow-support.js';

const signal = new AbortController().signal;
const commit = 'a'.repeat(40);
const repository = 'https://github.com/example/demo';
const readme = '# Demo\r\n\r\nUse the flag to return a mask.\r\n';

it('links URL intake to a reusable workspace and a durable authored story without network after intake', async () => {
  const root = await workflowRoot('url');
  const data = join(root, 'db');
  const id = 'url-project';
  const requests: string[] = [];
  let head = commit;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requests.push(url);
    const payload = url.includes('/commits/') ? {sha: head} :
      url.includes('/readme?') ? {type: 'file', path: 'README.md', encoding: 'base64', size: Buffer.byteLength(readme), content: Buffer.from(readme).toString('base64')} :
      {full_name: 'example/demo', name: 'demo', default_branch: 'main', license: null};
    return Response.json(payload);
  }));

  const run = (action: string, options: Parameters<typeof workflowCommand>[1] = {}) =>
    workflowCommand(['project', action], {data, id, ...options}, signal);
  try {
    const captured = await run('intake', {repo: repository + '.git/'});
    expect(captured).toMatchObject({commit, state: 'EVIDENCE_CAPTURED', project: {repository}});
    expect(requests[2]).toBe('https://api.github.com/repos/example/demo/readme?ref=' + commit);
    await expect(run('intake', {repo: repository})).resolves.toEqual(captured);
    head = 'b'.repeat(40);
    await expect(run('intake', {repo: repository})).rejects.toMatchObject({code: 'PROJECT_SOURCE_EXISTS'});
    await expect(run('status')).resolves.toMatchObject({state: 'NEEDS_PLAN', project: {currentRevision: null}});
    vi.stubGlobal('fetch', () => { throw new Error('unexpected network use'); });

    const out = join(root, 'evidence');
    const sourceRoot = join(out, 'bundle');
    const manifestPath = join(sourceRoot, 'evidence.json');
    const workspace = await run('evidence', {out});
    expect(workspace).toMatchObject({sourceRoot, commit, reused: false, review: 'authoring-required'});
    await expect(run('evidence', {out})).resolves.toMatchObject({reused: true});
    const bytes = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(bytes);
    expect(manifest.documents[0]).toMatchObject({repositoryPath: 'README.md', lines: 4});
    expect(await readFile(join(sourceRoot, 'source-1.txt'), 'utf8')).toBe(readme);
    expect(manifest.sources[0]).toEqual({id: 'source-1', path: 'source-1.txt',
      sha256: sha256(readme), url: repository + '/blob/' + commit + '/README.md'});

    const workbookPath = join(root, 'research');
    const workbookResult = await run('research', {out: workbookPath});
    expect(workbookResult).toMatchObject({review: 'pending', binding: {commit, evidenceFingerprint: manifest.fingerprint}});
    const workbook = JSON.parse(await readFile(join(workbookPath, 'bundle', 'workbook.json'), 'utf8'));
    expect(workbook.evidence[0].lines).toEqual(readme.split(/\r?\n/).map((text, i) => ({line: i + 1, text})));
    expect(workbook.evidence[0].source).toEqual(manifest.sources[0]);
    expect(workbook.proposal).toMatchObject({claims: [], shots: [], review: 'pending'});
    await expect(run('research', {out: workbookPath})).rejects.toMatchObject({code: 'EVIDENCE_OUTPUT'});
    await expect(run('research', {out: join(data, 'workflow', 'research.json')})).rejects.toMatchObject({code: 'EVIDENCE_PATH'});

    const story = StorySchema.parse(JSON.parse(await readFile('examples/url-intake-v1/rembg-story.json', 'utf8')));
    story.evidence.sources = manifest.sources;
    story.evidence.claims = [story.evidence.claims[1]!];
    story.evidence.claims[0]!.citations = [{document: 'source-1', startLine: 3, endLine: 3, quote: 'Use the flag to return a mask.'}];
    story.shots = [story.shots[2]!];
    story.shots[0]!.claimIds = ['mask-only'];
    const spec = join(root, 'story.json');
    const plan = {spec, root: sourceRoot, out: join(root, 'plan')};

    await writeFile(spec, JSON.stringify({...story, evidence: {...story.evidence, sources: [{...manifest.sources[0], url: 'https://example.com/other-commit'}]}}));
    await expect(run('story', plan)).rejects.toMatchObject({code: 'EVIDENCE_BINDING'});
    await writeFile(spec, JSON.stringify(story));
    await writeFile(manifestPath, bytes + ' ');
    await expect(run('story', plan)).rejects.toMatchObject({code: 'EVIDENCE_OUTPUT'});
    await expect(run('evidence', {out})).rejects.toMatchObject({code: 'EVIDENCE_OUTPUT'});
    await writeFile(manifestPath, bytes);
    await writeFile(join(sourceRoot, 'source-1.txt'), 'tampered');
    await expect(run('story', plan)).rejects.toMatchObject({code: 'EVIDENCE_OUTPUT'});
    await writeFile(join(sourceRoot, 'source-1.txt'), readme);
    await expect(run('story', {...plan, out: join(sourceRoot, 'nested')})).rejects.toMatchObject({code: 'EVIDENCE_PATH'});

    const planned = await run('story', plan) as {taskId: string; binding: {commit: string}};
    expect(planned).toMatchObject({review: 'pending', binding: {commit, projectId: id, repository}});
    expect(await statusStory(data, planned.taskId)).toMatchObject({state: 'succeeded', repositoryBinding: planned.binding});
    const copy = await exportStory(data, planned.taskId, join(root, 'copy'), signal);
    expect(await readFile(join(copy.output.bundle, 'manifest.json'))).toEqual(await readFile(join(plan.out, 'bundle', 'manifest.json')));
    story.shots[0]!.narration = 'The mask flag changes the requested output.';
    await writeFile(spec, JSON.stringify(story));
    const revised = await run('story', {...plan, out: join(root, 'revised')}) as {taskId: string};
    expect(revised.taskId).not.toBe(planned.taskId);
    expect(await statusStory(data, planned.taskId)).toMatchObject({state: 'succeeded'});
    expect(await statusStory(data, revised.taskId)).toMatchObject({state: 'succeeded', repositoryBinding: planned.binding});
    const occupied = join(root, 'occupied');
    await mkdir(occupied);
    await expect(run('evidence', {out: occupied})).rejects.toMatchObject({code: 'EVIDENCE_OUTPUT'});
  } finally {
    vi.unstubAllGlobals();
  }
});

it('does not create workflow state for evidence export without an intake', async () => {
  const root = await workflowRoot('no-intake');
  const data = join(root, 'absent');
  await expect(workflowCommand(['project', 'evidence'], {id: 'missing', data, out: join(root, 'out')}, signal))
    .rejects.toMatchObject({code: 'WORKFLOW_NOT_FOUND'});
  await expect(readFile(join(data, 'workflow', 'workflow.sqlite'))).rejects.toMatchObject({code: 'ENOENT'});
});

const junctionType = process.platform === 'win32' ? 'junction' : 'dir';

it('refuses a preexisting artifacts junction during intake and leaves its target alone', async () => {
  const root = await workflowRoot('url-cas-root');
  const data = join(root, 'db');
  const outside = join(root, 'outside');
  await mkdir(outside);
  await writeFile(join(outside, 'KEEP'), 'retain');
  await mkdir(join(data, 'workflow'), {recursive: true});
  await symlink(outside, join(data, 'workflow', 'artifacts'), junctionType);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const payload = url.includes('/commits/') ? {sha: commit} :
      url.includes('/readme?') ? {type: 'file', path: 'README.md', encoding: 'base64',
        size: Buffer.byteLength(readme), content: Buffer.from(readme).toString('base64')} :
      {full_name: 'example/demo', name: 'demo', default_branch: 'main', license: null};
    return Response.json(payload);
  }));
  try {
    await expect(workflowCommand(['project', 'intake'], {id: 'escaped', repo: repository, data}, signal))
      .rejects.toMatchObject({code: 'ARTIFACT_PATH'});
    expect(await readdir(outside)).toEqual(['KEEP']);
    expect(await readFile(join(outside, 'KEEP'), 'utf8')).toBe('retain');
    expect(await workflowCommand(['project', 'list'], {data}, signal)).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('refuses a redirected hash shard even when its target contains the original artifact', async () => {
  const root = await workflowRoot('url-cas-shard');
  const artifacts = new ArtifactStore(root);
  const artifact = await artifacts.commit(readme, 'text/plain', 'VALIDATE', sha256('url-test'));
  const shard = join(artifacts.root, artifact.sha256.slice(0, 2));
  const outside = join(root, 'outside');
  await rename(shard, outside);
  await symlink(outside, shard, junctionType);
  const before = await readdir(outside);
  await expect(artifacts.verify(artifact)).rejects.toMatchObject({code: 'ARTIFACT_PATH'});
  await expect(artifacts.commit(readme, 'text/plain', 'VALIDATE', sha256('url-test')))
    .rejects.toMatchObject({code: 'ARTIFACT_PATH'});
  expect(await readdir(outside)).toEqual(before);
});

it('refuses evidence and status when persisted project repository differs from its snapshot', async () => {
  const root = await workflowRoot('url-repo-binding');
  const data = join(root, 'db');
  const snapshot = join(root, 'snapshot.json');
  const id = 'damaged';
  const out = join(root, 'evidence');
  await writeFile(snapshot, JSON.stringify({
    schemaVersion: '1.0', repository, commit, name: 'demo', description: '', defaultBranch: 'main',
    license: null, fetchedAt: new Date().toISOString(), trust: 'untrusted-data-never-executed',
    documents: [{path: 'README.md', url: repository + '/blob/' + commit + '/README.md', content: readme, sha256: sha256(readme)}],
  }));
  await workflowCommand(['project', 'create'], {data, id, snapshot}, signal);
  const db = new DatabaseSync(join(data, 'workflow', 'workflow.sqlite'));
  try {
    const stored = JSON.parse(String(db.prepare('SELECT data FROM projects WHERE id=?').get(id)!.data));
    db.prepare('UPDATE projects SET data=? WHERE id=?').run(JSON.stringify({...stored, repository: 'https://github.com/other/repo'}), id);
  } finally {
    db.close();
  }
  for (const action of ['evidence', 'status']) {
    await expect(workflowCommand(['project', action], {id, data, ...(action === 'evidence' ? {out} : {})}, signal))
      .rejects.toMatchObject({code: 'PROJECT_INTEGRITY'});
  }
  await expect(readdir(out)).rejects.toMatchObject({code: 'ENOENT'});
});
