import {readFile, rename, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {EvidenceGraphSchema} from '../src/contracts/evidence-plan.js';
import {StorySchema} from '../src/contracts/story.js';
import {sha256} from '../src/core/util.js';
import {storyCommand} from '../src/story-planner/cli.js';
import {planStory} from '../src/story-planner/runtime.js';
import {workflowCommand} from '../src/workflow/cli.js';
import {WorkflowStore} from '../src/workflow/store.js';
import {workflowRoot} from './workflow-support.js';

const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const examples = 'examples/http-story-v1';
const animation = join(examples, 'express-animation.json');
const voice = join(examples, 'express-voice.json');
const signal = new AbortController().signal;

it('accepts HTTP operations only in Story and enforces actor, type and dependency semantics', async () => {
  const story = StorySchema.parse(await readJson(join(examples, 'express-story.json')));
  expect(EvidenceGraphSchema.safeParse(story.evidence).success).toBe(false);
  for (const corrupt of [
    (value: typeof story) => { value.evidence.actors[0]!.role = 'user'; },
    (value: typeof story) => { value.evidence.objects[1]!.kind = 'http-response'; },
    (value: typeof story) => { value.evidence.operations[1]!.dependsOn = []; },
  ]) {
    const changed = structuredClone(story);
    corrupt(changed);
    expect(StorySchema.safeParse(changed).success).toBe(false);
  }
});

it('creates an editable asset pack from a repository-bound Story task after the workspace and spec are moved', async () => {
  const root = await workflowRoot('ha'), data = join(root, 'state');
  const story = StorySchema.parse(await readJson(join(examples, 'express-story.json')));
  const lines = Array.from({length: 50}, () => '');
  for (const claim of story.evidence.claims) for (const q of claim.citations) {
    q.quote.split('\n').forEach((line, index) => { lines[q.startLine - 1 + index] = line; });
  }
  const content = lines.join('\n');
  const source = story.evidence.sources[0]!;
  source.sha256 = sha256(content);
  const repository = 'https://github.com/expressjs/express';
  const commit = '43fca52d28a422c8be48fd489cbd4f2d6152bab6';
  const repositoryPath = source.url.split('/').at(-1)!;
  const snapshot = {schemaVersion: '1.0', repository, commit, name: 'express', description: '',
    defaultBranch: 'master', license: null, fetchedAt: new Date().toISOString(), trust: 'untrusted-data-never-executed',
    documents: [{path: repositoryPath, url: source.url, content, sha256: source.sha256}]};
  const store = new WorkflowStore(join(data, 'workflow'));
  try { await store.create('http-test', snapshot); } finally { store.close(); }

  const workspace = join(root, 'evidence');
  await workflowCommand(['project', 'evidence'], {data, id: 'http-test', out: workspace}, signal);
  const sourceRoot = join(workspace, 'bundle');
  const spec = join(root, 'story.json');
  await writeFile(spec, JSON.stringify(story));
  const unbound = await planStory(spec, sourceRoot, data, join(root, 'unbound'), signal);
  const plan = (task: string) => storyCommand(['story', 'asset-plan'], {task, data, plan: animation, voice}, signal);
  await expect(plan(unbound.taskId)).rejects.toMatchObject({code: 'STORY_REPOSITORY_REQUIRED'});
  const bound = await workflowCommand(['project', 'story'], {data, id: 'http-test', root: sourceRoot, spec, out: join(root, 'story')}, signal) as {taskId: string};
  await rename(workspace, join(root, 'moved-workspace'));
  await rename(spec, join(root, 'moved-spec.json'));

  const first = await plan(bound.taskId) as {taskId: string};
  await expect(plan(bound.taskId)).resolves.toMatchObject({taskId: first.taskId, cached: true});
  const taskStatus = await storyCommand(['story', 'asset-status'], {task: first.taskId, data}, signal);
  const sourceStory = {taskId: bound.taskId, repositoryBinding: {repository, commit, projectId: 'http-test'}};
  expect(taskStatus).toMatchObject({integrity: 'verified', review: 'pending', sourceStory,
    voice: {timingBasis: 'estimate-only', clips: []}});
  const out = join(root, 'asset');
  await storyCommand(['story', 'asset-export'], {task: first.taskId, data, out}, signal);
  const bundle = join(out, 'bundle');
  expect(await readJson(join(bundle, 'manifest.json'))).toMatchObject({sourceStory, previewFormat: '3', samples: expect.any(Array)});
  expect((await readJson(join(bundle, 'manifest.json'))).samples).toHaveLength(9);
  expect(await readJson(join(bundle, 'provenance.json'))).toMatchObject({sourceStory, claims: story.evidence.claims});
  expect(await readFile(join(bundle, 'sources', 'source-1.txt'), 'utf8')).toBe(content);
  expect(await readFile(join(bundle, 'frames', 'return-body-late.svg'), 'utf8')).toContain('Client receives Hello World');
});
