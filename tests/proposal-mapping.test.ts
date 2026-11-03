import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect, it, vi} from 'vitest';
import type {StoryProposal} from '../src/contracts/authoring.js';
import type {AdaptationMaterial} from '../src/contracts/proposal-mapping.js';
import {canonical, sha256} from '../src/core/util.js';
import {ASSET_PACK_KIND, checkedPack, exportAssetPack, statusAssetPack} from '../src/story-planner/asset-pack.js';
import {EngineError} from '../src/core/errors.js';
import {TaskRunner} from '../src/orchestrator/tasks.js';
import {compileProposalMapping} from '../src/story-planner/proposal-mapping.js';
import {renderStoryPreview} from '../src/story-planner/preview.js';
import {loadBoundStory, statusStory} from '../src/story-planner/runtime.js';
import {workflowCommand} from '../src/workflow/cli.js';
import {WorkflowStore} from '../src/workflow/store.js';
import {sourceFixture, workflowRoot} from './workflow-support.js';

const route = "app.get('/', (req, res) => { res.send('Hello World') })";
const listen = 'app.listen(3000)';
const signal = new AbortController().signal;
const fixtureSource = sourceFixture();
fixtureSource.documents[0]!.content = `${listen}\n${route}\n`;
fixtureSource.documents[0]!.sha256 = sha256(fixtureSource.documents[0]!.content);
const sources = [{id: 'source-1', path: 'source-1.txt', url: fixtureSource.documents[0]!.url, sha256: fixtureSource.documents[0]!.sha256}];

function material(binding: StoryProposal['binding'], authoringRequestId: string): AdaptationMaterial {
  const entities = ['request', 'server', 'handler', 'body', 'tool'];
  const labels = ['GET /', listen, 'Root handler', 'Hello World', 'Example tool'];
  const claimIds = ['listen', 'route', 'body'];
  const claims = claimIds.map((id, index) => ({id, statement: `Fixture documents ${id}.`, basis: {kind: 'documented' as const}, citations: [{
    sourceId: 'source-1', sourceSha256: sources[0]!.sha256, startLine: index === 0 ? 1 : 2, endLine: index === 0 ? 1 : 2, quote: index === 0 ? listen : route,
  }]}));
  const proposal: StoryProposal = {schemaVersion: '1.0', kind: 'session-story-proposal', binding, authoringRequestId,
    authorship: {kind: 'session-agent'}, useCase: {title: 'Test route', audience: 'Fixture readers', question: 'How?', scope: 'Fixture only', exclusions: [],
      goalClaimIds: ['body'], inputClaimIds: ['route'], processClaimIds: ['listen', 'route'], outputClaimIds: ['body'], limitationClaimIds: []},
    claims, entities: entities.map((id, index) => ({id, label: labels[index]!, role: 'Fixture entity', claimIds})),
    mechanisms: [
      {id: 'match', explanation: 'Find the route', inputEntityIds: ['request'], outputEntityIds: ['handler'], claimIds: ['listen', 'route'], assumptions: [], visualIntent: 'Show route', adapterCandidate: 'http'},
      {id: 'send', explanation: 'Send body', inputEntityIds: ['handler'], outputEntityIds: ['body'], claimIds: ['body'], assumptions: [], visualIntent: 'Show body', adapterCandidate: 'http'},
    ],
    beats: [['request', 'server'], ['request', 'handler'], ['handler', 'body']].map((ids, index) => ({
      id: 'shot-' + index, purpose: 'One fixture cue', narration: `See the ${claimIds[index]}.`, narrationClaimIds: [claimIds[index]!],
      entityIds: [...ids, 'tool'], mechanismIds: [index === 2 ? 'send' : 'match'], timingIntent: 'Hold',
      visual: {description: `Illustrate ${claimIds[index]}.`, depiction: 'illustrative', claimIds: [claimIds[index]!]},
    })), openQuestions: [],
  };
  const kinds = ['http-request', 'code', 'route-handler', 'http-response'] as const;
  const visuals = {request: 'request', server: 'code', handler: 'route', body: 'response'} as const;
  return {proposal, mapping: {schemaVersion: '1.0', kind: 'session-proposal-mapping', proposalHash: sha256(canonical(proposal)),
    binding, authoringRequestId, authorship: {kind: 'session-agent'}, profile: 'audience-http-v1',
    objects: kinds.map((kind, index) => ({id: entities[index]!, entityId: entities[index]!, kind})), actors: [{id: 'tool', entityId: 'tool', role: 'tool'}],
    operations: [
      {id: 'route', kind: 'match-route', input: 'request', output: 'handler', mechanismId: 'match', claimIds: ['route'], actorIds: ['tool'], dependsOn: [], parameters: {}},
      {id: 'response', kind: 'send-response', input: 'handler', output: 'body', mechanismId: 'send', claimIds: ['body'], actorIds: ['tool'], dependsOn: ['route'], parameters: {}},
    ], shots: proposal.beats.map(beat => ({beatId: beat.id, beat: 'mechanism', visualSeconds: 3,
      objects: beat.entityIds.slice(0, 2).map(id => ({id, entityId: id, kind: 'state', visual: visuals[id as keyof typeof visuals]})),
      actions: [{kind: 'transfer', source: beat.entityIds[0]!, target: beat.entityIds[1]!, start: 0.15, end: 0.85, claimIds: beat.visual.claimIds}],
    })),
  }};
}

it('derives an exact bounded Story and fails closed on dropped beats, changed bindings, visual or claim substitutions, and lossy text', () => {
  const binding = {projectId: 'demo', repository: fixtureSource.repository, commit: fixtureSource.commit, snapshotHash: '1'.repeat(64), evidenceFingerprint: '2'.repeat(64)};
  const base = material(binding, '3'.repeat(64));
  const mapped = compileProposalMapping(base, sources);
  expect(mapped.seconds).toBe(9);
  expect(mapped.story.shots.map(shot => shot.narration)).toEqual(base.proposal.beats.map(beat => beat.narration));
  expect(mapped.story.shots.map(shot => shot.visual)).toEqual(base.proposal.beats.map(beat => beat.visual.description));
  expect(mapped.story.evidence.claims.map(claim => claim.citations[0]!.quote)).toEqual(base.proposal.claims.map(claim => claim.citations[0]!.quote));
  const cases: [string, (next: AdaptationMaterial) => void][] = [
    ['MAPPING_BINDING', next => {next.mapping.binding = {...binding, commit: 'f'.repeat(40)};}],
    ['MAPPING_BINDING', next => {next.mapping.authoringRequestId = 'f'.repeat(64);}],
    ['MAPPING_UNSUPPORTED', next => {next.proposal.beats.push({...next.proposal.beats[0]!, id: 'extra'});}],
    ['MAPPING_REFERENCE', next => {next.mapping.shots.reverse();}],
    ['MAPPING_REFERENCE', next => {next.mapping.shots[0]!.actions[0]!.claimIds = ['body'];}],
    ['MAPPING_REFERENCE', next => {next.mapping.shots[1]!.objects[0]!.visual = 'response';}],
    ['MAPPING_TEXT_BUDGET', next => {next.proposal.claims[0]!.statement = 'x'.repeat(241);}],
    ['MAPPING_UNSUPPORTED', next => {next.proposal.mechanisms[0]!.adapterCandidate = 'unmapped';}],
    ['MAPPING_UNSUPPORTED', next => {next.proposal.claims[1]!.citations[0]!.quote = 'A queue with no HTTP route';}],
  ];
  for (const [code, change] of cases) {
    const next = structuredClone(base);
    change(next);
    next.mapping.proposalHash = sha256(canonical(next.proposal));
    expect(() => compileProposalMapping(next, sources)).toThrow(expect.objectContaining({code}));
  }
});

it.runIf(process.platform === 'win32' && !!process.env.SystemRoot)('commits mapping closure, reuses same inputs, preserves revisions and fails on source staleness or changed CAS bytes', async () => {
  const root = await workflowRoot('mapping');
  const data = join(root, 'db');
  const store = new WorkflowStore(join(data, 'workflow'));
  try {await store.create('demo', fixtureSource);} finally {store.close();}
  const run = (action: string, args: Parameters<typeof workflowCommand>[1]) =>
    workflowCommand(['project', action], {id: 'demo', data, ...args}, signal);
  const out = join(root, 'packet');
  const opened = await run('author', {out}) as {binding: StoryProposal['binding']; authoringRequestId: string};
  const draft = material(opened.binding, opened.authoringRequestId);
  const spec = join(root, 'proposal.json');
  await writeFile(spec, canonical(draft.proposal));
  const {hash} = await run('submit-proposal', {spec}) as {hash: string};
  const map = join(root, 'map.json');
  await writeFile(map, canonical(draft.mapping));
  const originalRun = TaskRunner.prototype.run;
  const interruption = vi.spyOn(TaskRunner.prototype, 'run').mockImplementation(function (this: TaskRunner, ...args: Parameters<typeof originalRun>) {
    if (args[0] === ASSET_PACK_KIND) return Promise.reject(new EngineError('CANCELLED', 'Fixture stopped between Story and asset commits', 'cancelled'));
    return originalRun.call(this, ...args);
  });
  try {await expect(run('adapt-proposal', {proposal: hash, spec: map})).rejects.toMatchObject({code: 'CANCELLED'});}
  finally {interruption.mockRestore();}
  const adapted = await run('adapt-proposal', {proposal: hash, spec: map}) as {storyTaskId: string; assetTaskId: string};
  expect(adapted).toMatchObject({storyCached: true, assetsCached: false});
  const repeated = await run('adapt-proposal', {proposal: hash, spec: map});
  expect(repeated).toMatchObject({...adapted, storyCached: true, assetsCached: true, audiovisualReview: 'pending'});
  const packed = await checkedPack(data, adapted.assetTaskId);
  expect(packed.files.get('proposal.json')?.toString()).toBe(canonical(draft.proposal));
  expect(packed.files.get('mapping.json')?.toString()).toBe(canonical(draft.mapping));
  expect((await loadBoundStory(data, adapted.storyTaskId)).material).toEqual(draft);
  await expect(renderStoryPreview(data, adapted.assetTaskId, 'narrated', signal)).rejects.toMatchObject({code: 'PREVIEW_ADAPTATION'});
  await expect(exportAssetPack(data, adapted.assetTaskId, join(root, 'legacy'), signal, 'legacy-v2')).rejects.toMatchObject({code: 'ASSET_ADAPTATION'});

  draft.mapping.shots[0]!.visualSeconds = 3.25;
  await writeFile(map, canonical(draft.mapping));
  const revised = await run('adapt-proposal', {proposal: hash, spec: map}) as {storyTaskId: string; assetTaskId: string};
  expect(revised.storyTaskId).not.toBe(adapted.storyTaskId);
  expect(revised.assetTaskId).not.toBe(adapted.assetTaskId);
  const updated = new WorkflowStore(join(data, 'workflow'));
  try {await updated.create('demo', {...fixtureSource, description: 'new snapshot metadata'});} finally {updated.close();}
  await expect(run('adapt-proposal', {proposal: hash, spec: map})).rejects.toMatchObject({code: 'AUTHORING_STALE'});
  await expect(statusStory(data, adapted.storyTaskId)).resolves.toMatchObject({integrity: 'verified', adaptation: {proposalHash: hash}});
  const digest = sha256(canonical(draft.mapping));
  const blob = join(data, 'artifacts', digest.slice(0, 2), digest + '.json');
  const original = await readFile(blob);
  await writeFile(blob, 'edited by test');
  await expect(statusAssetPack(data, revised.assetTaskId)).rejects.toMatchObject({code: 'EXPLAIN_INTEGRITY'});
  await writeFile(blob, original);
  await expect(statusAssetPack(data, revised.assetTaskId)).resolves.toMatchObject({integrity: 'verified'});
}, 60_000);
