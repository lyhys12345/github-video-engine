import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import type {StoryProposal} from '../src/contracts/authoring.js';
import {PresentationPlan} from '../src/contracts/presentation.js';
import {canonical, sha256} from '../src/core/util.js';
import {PAPER_BIRD_SHA256} from '../src/presentation/asset.js';
import {presentationCommand} from '../src/presentation/cli.js';
import {compilePresentation} from '../src/presentation/compile.js';
import {presentationFrame} from '../src/presentation/frame-state.js';
import {bindPresentationVoice, readPresentation, renderPresentation} from '../src/presentation/runtime.js';
import {mixClips, placement, voiceCaptions} from '../src/presentation/narration.js';
import {produceTts} from '../src/tts/runtime.js';
import {ArtifactStore} from '../src/assets/store.js';
import {workflowCommand} from '../src/workflow/cli.js';
import {WorkflowStore} from '../src/workflow/store.js';
import {sourceFixture, workflowRoot} from './workflow-support.js';

const signal = new AbortController().signal;
const fixture = sourceFixture();
const citation = {sourceId: 'source-1', sourceSha256: fixture.documents[0]!.sha256, startLine: 1, endLine: 1,
  quote: fixture.documents[0]!.content.split(/\r?\n/)[0]!};
const binding = {projectId: 'demo', repository: fixture.repository, commit: fixture.commit,
  snapshotHash: '1'.repeat(64), evidenceFingerprint: '2'.repeat(64)};

function example(count: number, mode: 'http' | 'image-mask' = 'http', sourceBinding = binding, requestId = '3'.repeat(64)) {
  const isHttp = mode === 'http';
  const entityIds = isHttp ? ['listener', 'request', 'handler', 'response'] : ['input', 'cutout', 'mask'];
  const proposal: StoryProposal = {schemaVersion: '1.0', kind: 'session-story-proposal', binding: sourceBinding, authoringRequestId: requestId,
    authorship: {kind: 'session-agent'}, useCase: {title: 'Fixture title', audience: 'Fixture readers', question: 'What happens?', scope: 'Synthetic fixture only',
      exclusions: [], goalClaimIds: ['fact'], inputClaimIds: ['fact'], processClaimIds: ['fact'], outputClaimIds: ['fact'], limitationClaimIds: []},
    claims: [{id: 'fact', statement: 'Synthetic fixture statement', basis: {kind: 'documented'}, citations: [citation]}],
    entities: entityIds.map(id => ({id, label: 'Fixture ' + id, role: 'Fixture role', claimIds: ['fact']})),
    mechanisms: [{id: 'mechanism', explanation: 'Fixture mechanism', inputEntityIds: [entityIds[0]!], outputEntityIds: [entityIds.at(-1)!],
      claimIds: ['fact'], assumptions: [], visualIntent: 'Fixture visual', adapterCandidate: mode}],
    beats: Array.from({length: count}, (_, i) => ({id: 'beat-' + i, purpose: 'Fixture beat ' + i, narration: 'Text ' + i,
      narrationClaimIds: ['fact'], entityIds, mechanismIds: ['mechanism'], timingIntent: 'Fixture duration',
      visual: {description: 'Fixture diagram', depiction: 'illustrative', claimIds: ['fact']}})), openQuestions: [],
  };
  const param = <T>(value: T) => ({value, evidence: {claimId: 'fact', citationIndex: 0}});
  const names = isHttp ? ['listen', 'request', 'match', 'respond'] as const :
    ['show-input', 'select-cutout', 'show-cutout', 'select-mask', 'show-mask', 'compare'] as const;
  const plan = PresentationPlan.parse({schemaVersion: '1.0', kind: 'session-presentation-plan', proposalHash: sha256(canonical(proposal)),
    binding: sourceBinding, authoringRequestId: requestId, authorship: {kind: 'session-agent'},
    module: isHttp ? {id: 'http-exchange/1', initialState: 'ready', entities: {listener: 'listener', request: 'request', handler: 'handler', response: 'response'},
      parameters: {port: param(4000), method: param('POST'), path: param('/fixture'), body: param('Fixture body')}} :
      {id: 'image-output-choice/1', initialState: 'ready', entities: {input: 'input', cutout: 'cutout', mask: 'mask'},
        parameters: {cutoutCommand: param('fixture input output'), maskCommand: param('fixture --mask input output')},
        asset: {id: 'paper-bird/1', sha256: PAPER_BIRD_SHA256, claimId: 'fact', basis: 'illustrative'}},
    beats: proposal.beats.map((beat, index) => ({beatId: beat.id, frames: 72, events: names.flatMap((kind, at) =>
      Math.min(at, count - 1) === index ? [{kind, atFrame: at + 2, claimIds: ['fact']}] : [])})),
  });
  return {proposal, plan};
}

it('compiles one to twenty authored beats without source-text heuristics and preserves exact state at boundaries', () => {
  for (const count of [1, 4, 20]) {
    const {proposal, plan} = example(count);
    const result = compilePresentation(proposal, plan);
    expect(result.beats.map(beat => beat.narration)).toEqual(proposal.beats.map(beat => beat.narration));
    expect(result.timeline.totalFrames).toBe(count * 72);
    for (const event of result.trace) {
      expect(presentationFrame(result, event.frame - 1).state).toBe(event.before);
      expect(presentationFrame(result, event.frame).state).toBe(event.after);
    }
    expect(presentationFrame(result, count * 72 - 1).state).toBe('responded');
    expect(result.parameters.path?.value).toBe('/fixture');
    expect(result.parameters.port?.citation).toEqual(citation);
  }
  const image = example(5, 'image-mask');
  const compiled = compilePresentation(image.proposal, image.plan);
  expect(compiled.asset?.sha256).toBe(PAPER_BIRD_SHA256);
  expect(new Set(compiled.trace.map(event => event.assetId))).toEqual(new Set(['paper-bird/1']));
  expect(compiled.trace.at(-1)).toMatchObject({before: 'mask', after: 'comparison', entityIds: ['input', 'cutout', 'mask']});
});

it('refuses stale binding, absent citations, invalid events and assets, missing beats, unsupported profiles and over-budget plans', () => {
  const base = example(4);
  const cases: [string, (draft: typeof base) => void][] = [
    ['PRESENTATION_BINDING', draft => {draft.plan.binding = {...binding, commit: 'a'.repeat(40) === binding.commit ? 'b'.repeat(40) : 'a'.repeat(40)};}],
    ['PRESENTATION_BEATS', draft => {draft.plan.beats.pop();}],
    ['PRESENTATION_EVENT', draft => {draft.plan.beats[0]!.events[0]!.kind = 'respond';}],
    ['PRESENTATION_EVENT', draft => {draft.plan.beats[0]!.events[0]!.atFrame = 72;}],
    ['PRESENTATION_REFERENCE', draft => {draft.plan.beats[0]!.events[0]!.claimIds = ['unknown'];}],
    ['PRESENTATION_PARAMETER', draft => {if (draft.plan.module.id === 'http-exchange/1') draft.plan.module.parameters.body.evidence.citationIndex = 1;}],
    ['PRESENTATION_UNSUPPORTED', draft => {draft.proposal.mechanisms[0]!.adapterCandidate = 'unmapped';}],
    ['PRESENTATION_DURATION', draft => {for (const beat of draft.plan.beats) beat.frames = 361;}],
  ];
  for (const [code, change] of cases) {
    const draft = structuredClone(base);
    change(draft);
    draft.plan.proposalHash = sha256(canonical(draft.proposal));
    expect(() => compilePresentation(draft.proposal, draft.plan)).toThrow(expect.objectContaining({code}));
  }
  const image = example(5, 'image-mask');
  if (image.plan.module.id === 'image-output-choice/1') image.plan.module.asset.sha256 = 'f'.repeat(64);
  expect(() => compilePresentation(image.proposal, image.plan)).toThrow(expect.objectContaining({code: 'PRESENTATION_ASSET'}));
  expect(PresentationPlan.safeParse({...base.plan, beats: Array(21).fill(base.plan.beats[0])}).success).toBe(false);
});

it.runIf(process.platform === 'win32' && !!process.env.SystemRoot)('commits, verifies, reuses and retains presentation revisions and refuses corrupted historical CAS', async () => {
  const root = await workflowRoot('variable'), data = join(root, 'state');
  const store = new WorkflowStore(join(data, 'workflow'));
  try {await store.create('demo', fixture);} finally {store.close();}
  const run = (action: string, args: Parameters<typeof workflowCommand>[1]) =>
    workflowCommand(['project', action], {id: 'demo', data, ...args}, signal);
  const packet = await run('author', {out: join(root, 'packet')}) as {binding: typeof binding; authoringRequestId: string};
  const authored = example(4, 'http', packet.binding, packet.authoringRequestId);
  const proposalPath = join(root, 'proposal.json'), planPath = join(root, 'plan.json');
  await writeFile(proposalPath, canonical(authored.proposal));
  const submitted = await run('submit-proposal', {spec: proposalPath}) as {hash: string};
  await writeFile(planPath, canonical(authored.plan));
  const args = {spec: planPath, proposal: submitted.hash};
  const first = await run('presentation-plan', args) as {taskId: string; planSha256: string};
  await expect(run('presentation-plan', args)).resolves.toMatchObject({taskId: first.taskId, cached: true});
  await expect(presentationCommand(['presentation', 'render'], {task: first.taskId, data, mode: 'narrated'}, signal))
    .rejects.toMatchObject({code: 'USAGE'});
  const loaded = await readPresentation(data, first.taskId, 'plan', signal);
  expect(loaded.files?.get('presentation.json')?.toString()).toBe(canonical(authored.plan));
  expect(loaded.files?.get('source-1.txt')?.toString()).toBe(fixture.documents[0]!.content);

  authored.plan.beats[1]!.frames += 12;
  await writeFile(planPath, canonical(authored.plan));
  const revised = await run('presentation-plan', args) as {taskId: string};
  expect(revised.taskId).not.toBe(first.taskId);
  const update = new WorkflowStore(join(data, 'workflow'));
  try {await update.create('demo', {...fixture, description: 'Changed repository metadata'});} finally {update.close();}
  await expect(run('presentation-plan', args)).rejects.toMatchObject({code: 'AUTHORING_STALE'});
  await expect(readPresentation(data, first.taskId, 'plan', signal)).resolves.toMatchObject({status: {integrity: 'verified'}});
  const path = join(data, 'artifacts', first.planSha256.slice(0, 2), first.planSha256 + '.json');
  const original = await readFile(path);
  await writeFile(path, 'changed scratch plan');
  await expect(readPresentation(data, first.taskId, 'plan', signal)).rejects.toMatchObject({code: 'PRESENTATION_INTEGRITY'});
  await writeFile(path, original);
  await expect(readPresentation(data, first.taskId, 'plan', signal)).resolves.toMatchObject({status: {integrity: 'verified'}});
}, 60_000);

it('uses the last decoded sample, rounds cues outward, and rejects overflow and digital silence', () => {
  const authored = example(4);
  const plan = compilePresentation(authored.proposal, authored.plan);
  const beat = plan.beats[0]!;
  const clip = {beatId: beat.id, receiptFingerprint: 'b'.repeat(64), receiptSha256: 'c'.repeat(64),
    sourceAudioSha256: 'd'.repeat(64), transcript: 'A < B & C', transcriptSha256: sha256('A < B & C'), startOffsetFrames: 3};
  const source = {receipt: {durationSeconds: .053}, input: {voiceLabel: 'Declared test source', mediaType: 'audio/wav'}} as
    Parameters<typeof placement>[3];
  const pcm = Buffer.alloc(4_002);
  pcm.writeInt16LE(1234, pcm.length - 2);
  const cue = placement(beat, clip, pcm, source);
  expect(cue).toMatchObject({startSample: 6000, endSample: 8001, startFrame: 3, endFrame: 5, sampleCount: 2001});
  const mix = mixClips(72, [{cue, pcm}]);
  expect(mix.readInt16LE(16_000)).toBe(1234);
  expect(mix.readInt16LE(16_002)).toBe(0);
  expect(mix.subarray(12_000, 16_002)).toEqual(pcm);
  expect(voiceCaptions([cue]).toString()).toContain('00:00:00.125 --> 00:00:00.167\nA &lt; B &amp; C');
  expect(() => placement(beat, {...clip, startOffsetFrames: 71}, pcm, source))
    .toThrow(expect.objectContaining({code: 'VOICE_DOES_NOT_FIT', message: expect.stringContaining('"minAdditionalFrames":1')}));
  expect(() => placement(beat, clip, Buffer.alloc(4002), source)).toThrow(expect.objectContaining({code: 'VOICE_EMPTY'}));
});

it.runIf(process.platform === 'win32' && !!process.env.SystemRoot)('verifies local receipt, preserves voice revisions and rejects mismatched parents, text, coverage and CAS', async () => {
  const root = await workflowRoot('presentation-voice'), data = join(root, 'state');
  const store = new WorkflowStore(join(data, 'workflow'));
  try {await store.create('demo', fixture);} finally {store.close();}
  const run = (action: string, args: Parameters<typeof workflowCommand>[1]) =>
    workflowCommand(['project', action], {id: 'demo', data, ...args}, signal);
  const packet = await run('author', {out: join(root, 'packet')}) as {binding: typeof binding; authoringRequestId: string};
  const authored = example(1, 'http', packet.binding, packet.authoringRequestId);
  const proposalPath = join(root, 'proposal.json'), planPath = join(root, 'plan.json'), voicePath = join(root, 'voice.json');
  await writeFile(proposalPath, canonical(authored.proposal));
  const submitted = await run('submit-proposal', {spec: proposalPath}) as {hash: string};
  const build = async () => {
    await writeFile(planPath, canonical(authored.plan));
    const result = await run('presentation-plan', {spec: planPath, proposal: submitted.hash}) as {taskId: string};
    const read = await readPresentation(data, result.taskId, 'plan', signal);
    return {planTaskId: result.taskId, planManifestSha256: sha256(read.files!.get('plan-manifest.json')!)};
  };
  const parent = await build();
  const audio = await readFile('fixtures/tts-synthetic.mp3');
  const text = authored.proposal.beats[0]!.narration;
  const imported = await produceTts({schemaVersion: '1.0', provider: 'local-import', text, voiceLabel: 'Synthetic tone test',
    mediaType: 'audio/mpeg', sourceSha256: sha256(audio)}, data, signal, {audioPath: 'fixtures/tts-synthetic.mp3'});
  const clip = {beatId: authored.proposal.beats[0]!.id, receiptFingerprint: imported.fingerprint, receiptSha256: imported.receiptArtifact.sha256,
    sourceAudioSha256: sha256(audio), transcript: text, transcriptSha256: sha256(text), startOffsetFrames: 1};
  const spec = {schemaVersion: 'presentation-voice-bindings/1.0', ...parent, proposalHash: submitted.hash, playbackRate: 1,
    voicePolicy: 'caller-declared-local-import', clips: [clip]};
  const bind = async (draft: unknown) => {
    await writeFile(voicePath, canonical(draft));
    return bindPresentationVoice(data, voicePath, signal);
  };
  await expect(bind({...spec, clips: [clip, clip]})).rejects.toMatchObject({code: 'VOICE_COVERAGE'});
  await expect(bind({...spec, clips: [{...clip, transcript: text + '.'}]})).rejects.toMatchObject({code: 'VOICE_TRANSCRIPT'});
  await expect(bind({...spec, clips: [{...clip, receiptSha256: 'e'.repeat(64)}]})).rejects.toMatchObject({code: 'VOICE_RECEIPT'});
  await expect(bind({...spec, clips: [{...clip, startOffsetFrames: 71}]})).rejects.toMatchObject({code: 'VOICE_DOES_NOT_FIT'});
  const first = await bind(spec);
  await expect(bind(spec)).resolves.toMatchObject({taskId: first.taskId, cached: true});
  authored.plan.beats[0]!.frames += 2;
  const edited = await build();
  await expect(renderPresentation(data, edited.planTaskId, signal, undefined, first.taskId)).rejects.toMatchObject({code: 'VOICE_PARENT'});
  const revised = await bind({...spec, ...edited});
  expect(revised.taskId).not.toBe(first.taskId);
  const casPath = new ArtifactStore(data).path(imported.receipt.artifact);
  await writeFile(casPath, 'corrupted local audio');
  await expect(readPresentation(data, first.taskId, 'voice', signal)).rejects.toMatchObject({code: 'INTEGRITY'});
  await writeFile(casPath, audio);
  const restored = await readPresentation(data, first.taskId, 'voice', signal);
  expect(restored.files!.get('original/0.audio')).toEqual(audio);
  expect(restored.status).toMatchObject({integrity: 'verified', review: {speechContentReview: 'unverified', ownerListening: 'pending'}});
}, 60_000);
