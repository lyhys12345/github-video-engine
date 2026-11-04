import {spawnSync} from 'node:child_process';
import {mkdtemp, readFile, rm, rmdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {expect, it} from 'vitest';
import type {StoryProposal} from '../src/contracts/authoring.js';
import {PresentationPlan} from '../src/contracts/presentation.js';
import {canonical, sha256} from '../src/core/util.js';
import {command} from '../src/core/process.js';
import {ffmpegPath} from '../src/providers/local.js';
import {PAPER_BIRD_SHA256} from '../src/presentation/asset.js';
import {presentationCommand} from '../src/presentation/cli.js';
import {layoutCaptions} from '../src/presentation/caption-layout.js';
import {assembleSequence} from '../src/presentation/sequence.js';
import {sequenceAudio} from '../src/presentation/sequence-audio.js';
import {compilePresentation} from '../src/presentation/compile.js';
import {presentationFrame} from '../src/presentation/frame-state.js';
import {checkPresentationTiming, exportPresentationTiming, statusPresentationTiming} from '../src/presentation/timing-check.js';
import {bindPresentationVoice, checkPresentationPayload, PREVIEW_KIND, readPresentation, renderPresentation} from '../src/presentation/runtime.js';
import {FRAME_SAMPLES, MAX_PCM, matchVoice, mixClips, placement, projectCaptions, voiceCaptions, VOICE_KIND, VoiceSpec} from '../src/presentation/narration.js';
import {extendedRanges, FRAME_CHUNK, MAX_MOVIE_BYTES, requireExtendedDisk} from '../src/presentation/duration.js';
import {produceTts} from '../src/tts/runtime.js';
import {ArtifactStore} from '../src/assets/store.js';
import {TaskRunner} from '../src/orchestrator/tasks.js';
import {workflowCommand} from '../src/workflow/cli.js';
import {WorkflowStore} from '../src/workflow/store.js';
import {sourceFixture, workflowRoot} from './workflow-support.js';

const signal = new AbortController().signal;
const fixture = sourceFixture();
const citation = {sourceId: 'source-1', sourceSha256: fixture.documents[0]!.sha256, startLine: 1, endLine: 1,
  quote: fixture.documents[0]!.content.split(/\r?\n/)[0]!};
const binding = {projectId: 'demo', repository: fixture.repository, commit: fixture.commit,
  snapshotHash: '1'.repeat(64), evidenceFingerprint: '2'.repeat(64)};

it('lays out exact Chinese and mixed-script cue ranges at natural breaks with bounded, balanced lines', async () => {
  const font = await readFile(new URL('../assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf', import.meta.url));
  const inputs = [
    '示例监听三千端口。请求根路径时，处理器返回问候。',
    '示例使用 Express。发送 GET /hello 时，状态为 HTTP 200，正文为 Cafe\u0301。',
    '这是一段适合分行的示例文字，'.repeat(3) + '用来检查最后一行是否过短。',
    '短句。',
  ];
  const ranges = layoutCaptions(font, inputs);
  const lines = ranges.map((cue, i) => cue.map(({startChar, endChar}) => inputs[i]!.slice(startChar, endChar)));
  expect(lines[0]).toEqual(['示例监听三千端口。', '请求根路径时，处理器返回问候。']);
  expect(lines[1]!.find(line => line.includes('Cafe\u0301'))).toBeDefined();
  for (const token of ['Express', 'GET', '/hello', 'HTTP', '200']) expect(lines[1]!.filter(line => line.includes(token))).toHaveLength(1);
  expect(lines[2]).toHaveLength(3);
  expect(lines[2]!.every(line => line.length >= 10)).toBe(true);
  expect(lines[3]).toEqual(['短句。']);
  const request = '示例使用 Express。发送 GET / 时，处理器返回 Hello World!';
  expect(layoutCaptions(font, [request])[0]!.map(({startChar, endChar}) => request.slice(startChar, endChar)))
    .toEqual(['示例使用 Express。发送 GET / ', '时，处理器返回 Hello World!']);
  for (const [i, cue] of ranges.entries()) {
    expect(lines[i]!.join('')).toBe(inputs[i]);
    expect(cue.map(line => line.startChar)).toEqual([0, ...cue.slice(0, -1).map(line => line.endChar)]);
    expect(lines[i]!.every(line => !/^[，。！？、；：]/u.test(line))).toBe(true);
  }
  expect(layoutCaptions(font, ['中'.repeat(57)])[0]).toHaveLength(3);
  expect(layoutCaptions(font, ['文本𰻞'])[0]).toEqual([{startChar: 0, endChar: 4}]);
  for (const text of ['中'.repeat(58), 'W'.repeat(35), '中文🙂', '文本' + String.fromCodePoint(0x31350), 'مرحبا', '中\uFE0F', '中文\u2028换行']) {
    expect(() => layoutCaptions(font, [text])).toThrow(/Use shorter cues in presentation-voice-bindings\/1\.1/);
  }
});

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
  if (plan.schemaVersion === '1.2' || plan.schemaVersion === '1.3') throw new Error('Expected the legacy fixture plan');
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
  await expect(presentationCommand(['presentation', 'status'], {task: first.taskId, data}, signal))
    .resolves.toMatchObject({kind: 'plan', integrity: 'verified'});
  await expect(presentationCommand(['presentation', 'status'], {task: first.taskId, data, kind: 'narrated'}, signal))
    .rejects.toMatchObject({code: 'PRESENTATION_TASK_KIND'});
  await expect(presentationCommand(['presentation', 'status'], {task: 'invalid-id', data}, signal))
    .rejects.toMatchObject({code: 'PRESENTATION_TASK_ID'});
  await expect(presentationCommand(['presentation', 'status'], {task: '0'.repeat(64), data}, signal))
    .rejects.toMatchObject({code: 'EXPLAIN_TASK'});
  await expect(presentationCommand(['presentation', 'resume'], {task: first.taskId, data}, signal))
    .rejects.toMatchObject({code: 'PRESENTATION_RESUME_KIND'});
  await expect(presentationCommand(['presentation', 'export'], {task: first.taskId, data, out: join(root, 'detected-export')}, signal))
    .resolves.toMatchObject({taskId: first.taskId});
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
  const database = new DatabaseSync(join(data, 'tasks.sqlite'));
  try {
    const row = database.prepare('SELECT data FROM tasks WHERE id=?').get(first.taskId)!;
    const record = JSON.parse(String(row.data));
    const forgedId = 'f'.repeat(64);
    record.id = forgedId;
    record.kind = 'repository-presentation-narrated-preview-v1';
    database.prepare('INSERT INTO tasks(id,data) VALUES(?,?)').run(forgedId, canonical(record));
    await expect(presentationCommand(['presentation', 'status'], {task: forgedId, data}, signal))
      .rejects.toMatchObject({code: 'EXPLAIN_INTEGRITY'});
  } finally {database.close();}
}, 60_000);

it('validates location-free preview metadata while retaining the original historical fingerprint and bytes', async () => {
  const root = await workflowRoot('probe'), data = join(root, 'state');
  const store = new WorkflowStore(join(data, 'workflow'));
  try {await store.create('demo', fixture);} finally {store.close();}
  const run = (action: string, args: Parameters<typeof workflowCommand>[1]) =>
    workflowCommand(['project', action], {id: 'demo', data, ...args}, signal);
  const packet = await run('author', {out: join(root, 'packet')}) as {binding: typeof binding; authoringRequestId: string};
  const authored = example(1, 'http', packet.binding, packet.authoringRequestId);
  const proposalPath = join(root, 'proposal.json'), planPath = join(root, 'plan.json');
  await writeFile(proposalPath, canonical(authored.proposal));
  const submitted = await run('submit-proposal', {spec: proposalPath}) as {hash: string};
  await writeFile(planPath, canonical(authored.plan));
  const {taskId: planTaskId} = await run('presentation-plan', {spec: planPath, proposal: submitted.hash}) as {taskId: string};
  const parent = await readPresentation(data, planTaskId, 'plan', signal);
  const plan = compilePresentation(authored.proposal, authored.plan);
  const fontSha256 = sha256(await readFile('assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'));
  const base = {planTaskId, planManifestSha256: sha256(parent.files!.get('plan-manifest.json')!),
    mode: 'silent', fontSha256, environment: {fixture: 'metadata-profile'}};
  // Persist a complete synthetic closure. Historical status verifies bytes and metadata offline.
  const movie = Buffer.from('synthetic preview bytes');
  const captions = Buffer.from('WEBVTT\n\n00:00:00.000 --> 00:00:03.000\nText 0\n');
  const samples = [0, 1, 2, 3, 4, 5, 29, 71];
  const runner = new TaskRunner(data);
  const persist = async (input: typeof base & {mediaMetadataProfile?: string}, format: {duration: string; filename?: string | null}) => {
    const taskId = sha256(canonical({version: 'production-task-v1', kind: PREVIEW_KIND, input}));
    const probe = {format, streams: [{codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p',
      width: 720, height: 1280, avg_frame_rate: '24/1', nb_read_frames: '72'}]};
    const manifest = Buffer.from(canonical({kind: PREVIEW_KIND, taskId, ...input, binding: plan.binding,
      proposalHash: plan.proposalHash, planSha256: plan.planSha256, moduleId: plan.moduleId, timeline: plan.timeline,
      samples, media: {sha256: sha256(movie), probe, fullDecodeExit: 0}, review: parent.status.review}));
    const payloads = [
      {path: 'preview.mp4', bytes: movie, mediaType: 'video/mp4'},
      {path: 'captions.vtt', bytes: captions, mediaType: 'text/plain'},
      {path: 'preview-manifest.json', bytes: manifest, mediaType: 'application/json'},
      ...samples.map(frame => ({path: `samples/${frame}.png`, bytes: Buffer.from('synthetic sample'), mediaType: 'image/png'})),
    ];
    await runner.run(PREVIEW_KIND, input, async () => {
      const files = await Promise.all(payloads.map(async ({path, bytes, mediaType}) =>
        ({path, artifact: await runner.artifacts.commit(bytes, mediaType, 'PUBLISH', taskId)})));
      return {value: {kind: PREVIEW_KIND, files}, outputs: files.map(file => file.artifact)};
    }, signal);
    return {taskId, manifest};
  };
  try {
    const historical = await persist(base, {duration: '3.000000', filename: 'historical-tmp/preview.mp4'});
    const previous = await readPresentation(data, historical.taskId, 'preview', signal);
    expect(previous.status).toMatchObject({taskId: historical.taskId, integrity: 'verified'});
    expect(previous.files!.get('preview-manifest.json')).toEqual(historical.manifest);
    expect(runner.get(historical.taskId)?.input).toEqual(base);

    const currentInput = {...base, mediaMetadataProfile: 'ffprobe-no-location/1'};
    const current = await persist(currentInput, {duration: '3.000000'});
    expect(current.taskId).not.toBe(historical.taskId);
    expect((await readPresentation(data, current.taskId, 'preview', signal)).files!.get('preview-manifest.json')).toEqual(current.manifest);
    for (const filename of ['current-tmp/preview.mp4', null]) {
      const located = await persist({...currentInput, environment: {fixture: String(filename)}}, {duration: '3.000000', filename});
      await expect(readPresentation(data, located.taskId, 'preview', signal)).rejects.toMatchObject({code: 'PRESENTATION_INTEGRITY',
        message: 'Location-free preview metadata cannot contain a file name and requires a format record.'});
    }
    const unknown = await persist({...base, mediaMetadataProfile: 'unknown/9'}, {duration: '3.000000'});
    await expect(readPresentation(data, unknown.taskId, 'preview', signal)).rejects.toMatchObject({code: 'PRESENTATION_INTEGRITY',
      message: 'Persisted presentation input does not match its task kind.'});
  } finally {runner.close();}
});

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

it('version-gates the frame, beat and event boundaries and partitions exact absolute renderer frames', () => {
  const authored = example(1);
  authored.plan.schemaVersion = '1.1';
  for (const frames of [24, 1440, 1441, 1464, 1800, 7199, 7200]) {
    authored.plan.beats[0]!.frames = frames;
    const compiled = compilePresentation(authored.proposal, PresentationPlan.parse(authored.plan));
    expect(compiled.timeline).toEqual({fps: 24, totalFrames: frames});
    if (frames > 1440) {
      const ranges = extendedRanges(frames);
      expect(ranges.flatMap(([first, last]) => Array.from({length: last - first + 1}, (_, index) => first + index)))
        .toEqual(Array.from({length: frames}, (_, index) => index));
      expect(ranges.every(([first, last]) => last - first + 1 <= FRAME_CHUNK)).toBe(true);
    }
  }
  authored.plan.beats[0]!.events.at(-1)!.atFrame = 7199;
  const last = compilePresentation(authored.proposal, PresentationPlan.parse(authored.plan));
  expect(last.trace.at(-1)).toMatchObject({frame: 7199, after: 'responded'});
  authored.plan.beats[0]!.events.at(-1)!.atFrame = 7200;
  expect(PresentationPlan.safeParse(authored.plan).success).toBe(false);
  for (const frame of [NaN, 1440, 1441.5, 7201]) {
    expect(() => extendedRanges(frame)).toThrow(expect.objectContaining({code: 'PRESENTATION_DURATION'}));
  }
  const legacy = example(2);
  legacy.plan.beats[0]!.frames = 721;
  legacy.plan.beats[1]!.frames = 720;
  expect(() => compilePresentation(legacy.proposal, PresentationPlan.parse(legacy.plan)))
    .toThrow(expect.objectContaining({code: 'PRESENTATION_DURATION'}));
  legacy.plan.schemaVersion = '1.1';
  legacy.plan.beats[0]!.frames = 3600;
  legacy.plan.beats[1]!.frames = 3601;
  expect(() => compilePresentation(legacy.proposal, PresentationPlan.parse(legacy.plan)))
    .toThrow(expect.objectContaining({code: 'PRESENTATION_DURATION'}));
});

it('keeps the exact 300-second reference PCM, rejects one extra sample, and places an exact cue at the last frame', () => {
  const authored = example(1);
  authored.plan.schemaVersion = '1.1';
  authored.plan.beats[0]!.frames = 7200;
  const beat = compilePresentation(authored.proposal, authored.plan).beats[0]!;
  const clip = {beatId: beat.id, receiptFingerprint: 'b'.repeat(64), receiptSha256: 'c'.repeat(64),
    sourceAudioSha256: 'd'.repeat(64), transcript: 'Tail sample', transcriptSha256: sha256('Tail sample'), startOffsetFrames: 0};
  const source = {receipt: {durationSeconds: 300}, input: {voiceLabel: 'Sample-boundary test', mediaType: 'audio/wav'}} as
    Parameters<typeof placement>[3];
  const pcm = Buffer.alloc(MAX_PCM);
  pcm.writeInt16LE(10, 0);
  pcm.writeInt16LE(1234, pcm.length - 2);
  const cue = placement(beat, clip, pcm, source);
  const mix = mixClips(7200, [{cue, pcm}]);
  expect(mix.length).toBe(28_800_000);
  expect(cue).toMatchObject({sampleCount: 14_400_000, endFrame: 7200});
  expect(mix.readInt16LE(mix.length - 2)).toBe(1234);
  const excess = Buffer.concat([pcm, Buffer.from([0x01, 0x00])]);
  expect(() => placement(beat, clip, excess, source)).toThrow(expect.objectContaining({code: 'VOICE_DOES_NOT_FIT'}));
  const binding = {schemaVersion: 'presentation-voice-bindings/1.0', planTaskId: 'a'.repeat(64), planManifestSha256: 'a'.repeat(64),
    proposalHash: 'a'.repeat(64), voicePolicy: 'caller-declared-local-import', playbackRate: 1, clips: [{...clip, startOffsetFrames: 7199}]};
  expect(VoiceSpec.safeParse(binding).success).toBe(true);
  expect(VoiceSpec.safeParse({...binding, clips: [{...clip, startOffsetFrames: 7200}]}).success).toBe(false);
  const lastCue = placement(beat, binding.clips[0]!, pcm.subarray(-FRAME_SAMPLES * 2), source);
  expect(lastCue).toMatchObject({startFrame: 7199, endFrame: 7200, endSample: 14_400_000});
  expect(voiceCaptions([lastCue]).toString()).toContain('00:04:59.958 --> 00:05:00.000');
});

it('fails the extended disk admission check when the work volume cannot be verified', async () => {
  await expect(requireExtendedDisk('not-a-valid-scratch-path-3db55b7f', '.'))
    .rejects.toMatchObject({code: 'PRESENTATION_DISK_BUDGET', classification: 'retryable'});
});

it('rejects oversized movies, declared aggregate PCM and excess result files before loading them', () => {
  expect(() => checkPresentationPayload(PREVIEW_KIND, [{path: 'preview.mp4', bytes: MAX_MOVIE_BYTES + 1}]))
    .toThrow(expect.objectContaining({code: 'PRESENTATION_PAYLOAD'}));
  const clips = [0, 1, 2].map(index => ({path: index + '.pcm', bytes: MAX_PCM}));
  expect(() => checkPresentationPayload(VOICE_KIND, clips.slice(0, 2))).not.toThrow();
  expect(() => checkPresentationPayload(VOICE_KIND, clips)).toThrow(expect.objectContaining({code: 'PRESENTATION_PAYLOAD'}));
  const files = Array.from({length: 61}, (_, index) => ({path: index + '.png', bytes: 1}));
  expect(() => checkPresentationPayload(PREVIEW_KIND, files)).toThrow(expect.objectContaining({code: 'PRESENTATION_PAYLOAD'}));
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
  const audioPath = join(root, 'test-tone.wav');
  await command(ffmpegPath(), ['-v', 'error', '-nostdin', '-n', '-stream_loop', '1', '-i',
    'fixtures/tts-synthetic.mp3', '-c:a', 'pcm_s16le', audioPath]);
  const audio = await readFile(audioPath);
  const text = authored.proposal.beats[0]!.narration;
  const imported = await produceTts({schemaVersion: '1.0', provider: 'local-import', text, voiceLabel: 'Synthetic tone test',
    mediaType: 'audio/wav', sourceSha256: sha256(audio)}, data, signal, {audioPath});
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
  const old = await readPresentation(data, first.taskId, 'voice', signal);
  const multi = {...spec, schemaVersion: 'presentation-voice-bindings/1.1',
    clips: [{...clip, captions: [
      {startChar: 0, endChar: 2, startSample: 0, endSample: FRAME_SAMPLES * 12},
      {startChar: 2, endChar: [...text].length, startSample: FRAME_SAMPLES * 12, endSample: FRAME_SAMPLES * 24},
    ]}]};
  const split = await bind(multi);
  expect(split).toMatchObject({schemaVersion: 'presentation-voice-ledger/1.1', captionTiming: 'caller-declared', captionCues: [
    {startFrame: 1, endFrame: 13}, {startFrame: 13, endFrame: 25},
  ]});
  expect(split.cues).toEqual(first.cues);
  expect(split.mixedPcmSha256).toBe(first.mixedPcmSha256);
  await expect(bind(multi)).resolves.toMatchObject({taskId: split.taskId, cached: true});
  const splitFiles = await readPresentation(data, split.taskId, 'voice', signal);
  expect(splitFiles.files!.get('captions.vtt')!.toString()).toContain('00:00:00.042 --> 00:00:00.542');
  expect(splitFiles.files!.get('narration.pcm')).toEqual(old.files!.get('narration.pcm'));
  const planFiles = (await readPresentation(data, parent.planTaskId, 'plan', signal)).files!;
  const trace = planFiles.get('trace.json')!;
  const voiceManifest = splitFiles.files!.get('voice-manifest.json')!;
  const responseEvent = JSON.parse(trace.toString()).trace[3];
  const responseCue = JSON.parse(voiceManifest.toString()).captionCues[1];
  const assertion = {id: 'response-arrival', state: 'http-response-arrived', minContinuousFrames: 3,
    cue: {beatId: clip.beatId, indexInBeat: 1, sha256: sha256(canonical(responseCue))},
    event: {beatId: clip.beatId, indexInBeat: 3, sha256: sha256(canonical(responseEvent))}};
  const timing = {schemaVersion: 'presentation-visual-cues/1.0', ...parent, traceSha256: sha256(trace),
    voiceTaskId: split.taskId, voiceManifestSha256: sha256(voiceManifest), checks: [assertion]};
  const timingPath = join(root, 'timing.json');
  const timingCli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'presentation',
    ...args, '--data', data], {encoding: 'utf8', timeout: 20_000, windowsHide: true});
  const verifyTiming = async (input: unknown) => {
    await writeFile(timingPath, canonical(input) + '\n');
    return checkPresentationTiming(data, timingPath, signal);
  };
  const passed = await verifyTiming(timing);
  expect(passed).toMatchObject({state: 'succeeded', declaredTemporalChecks: 'passed', cached: false,
    report: {speechAlignment: 'unverified', uncheckedCueCount: 1, undeclaredRelationships: 'unchecked',
      checks: [{cueInterval: {startFrame: 13, endFrame: 25}, visualIntervals: [{startFrame: 22, endFrame: 72}],
        longestOverlap: {frames: 3, interval: {startFrame: 22, endFrame: 25}}, verdict: 'passed'}]}});
  expect(await verifyTiming(timing)).toMatchObject({taskId: passed.taskId, cached: true});
  expect(passed.report).not.toHaveProperty('occlusion');
  const passingCli = timingCli('timing-check', '--spec', timingPath);
  expect(passingCli.status).toBe(0);
  expect(JSON.parse(passingCli.stdout)).toMatchObject({taskId: passed.taskId, cached: true, declaredTemporalChecks: 'passed'});
  await writeFile(timingPath, canonical({...timing, checks: [{...assertion, minContinuousFrames: 4}]}) + '\n');
  const failingCli = timingCli('timing-check', '--spec', timingPath);
  expect(failingCli.status).toBe(2);
  const failed = JSON.parse(failingCli.stdout) as Awaited<ReturnType<typeof checkPresentationTiming>>;
  expect(failed).toMatchObject({state: 'succeeded', declaredTemporalChecks: 'failed', report: {checks: [{verdict: 'failed'}]}});
  expect(failed.taskId).not.toBe(passed.taskId);
  const cachedFailure = timingCli('timing-check', '--spec', timingPath);
  expect(cachedFailure.status).toBe(2);
  expect(JSON.parse(cachedFailure.stdout)).toMatchObject({taskId: failed.taskId, cached: true, declaredTemporalChecks: 'failed'});
  const failedStatus = timingCli('timing-check-status', '--task', failed.taskId);
  expect(failedStatus.status).toBe(0);
  expect(JSON.parse(failedStatus.stdout)).toMatchObject({taskId: failed.taskId, declaredTemporalChecks: 'failed'});
  expect(await statusPresentationTiming(data, failed.taskId, signal)).toMatchObject({declaredTemporalChecks: 'failed', integrity: 'verified'});
  const checkedExport = await exportPresentationTiming(data, failed.taskId, join(root, 'timing-check-export'), signal);
  expect(checkedExport.declaredTemporalChecks).toBe('failed');
  expect(await readFile(join(checkedExport.bundle, 'timing-spec.json'))).toEqual(await readFile(timingPath));
  expect(await readFile(join(checkedExport.bundle, 'trace.json'))).toEqual(trace);
  const failedExport = timingCli('timing-check-export', '--task', failed.taskId, '--out', join(root, 'timing-check-export'));
  expect(failedExport.status).toBe(0);
  expect(JSON.parse(failedExport.stdout)).toMatchObject({bundle: checkedExport.bundle, declaredTemporalChecks: 'failed'});
  await expect(verifyTiming({...timing, checks: [assertion, {...assertion, id: 'duplicate'}]}))
    .rejects.toMatchObject({code: 'PRESENTATION_TIMING_SPEC'});
  await expect(verifyTiming({...timing, checks: [{...assertion, state: 'image-comparison-full'}]}))
    .rejects.toMatchObject({code: 'PRESENTATION_TIMING_STATE'});
  await expect(verifyTiming({...timing, checks: [{...assertion, cue: {...assertion.cue, sha256: '0'.repeat(64)}}]}))
    .rejects.toMatchObject({code: 'PRESENTATION_TIMING_REFERENCE'});
  await writeFile(timingPath, 'malformed');
  const malformed = timingCli('timing-check', '--spec', timingPath);
  expect(malformed.status).toBe(1);
  expect(malformed.stdout).toBe('');
  expect(malformed.stderr).toContain('PRESENTATION_TIMING_SPEC');
  const retimed = structuredClone(multi);
  retimed.clips[0]!.captions[1]!.endSample += FRAME_SAMPLES;
  const changed = await bind(retimed);
  expect(changed.taskId).not.toBe(split.taskId);
  expect(changed.mixedPcmSha256).toBe(split.mixedPcmSha256);
  expect((await readPresentation(data, first.taskId, 'voice', signal)).files).toEqual(old.files);
  expect((await readPresentation(data, split.taskId, 'voice', signal)).files).toEqual(splitFiles.files);
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

it('projects Unicode transcript ranges and rejects caption text and timing that cannot be displayed safely', () => {
  const authored = example(1);
  const first = '🙂' + 'A'.repeat(75);
  const second = ' ' + 'B'.repeat(75);
  const text = first + second;
  authored.proposal.beats[0]!.narration = text;
  authored.plan.beats[0]!.frames = 240;
  authored.plan.proposalHash = sha256(canonical(authored.proposal));
  const plan = compilePresentation(authored.proposal, PresentationPlan.parse(authored.plan));
  const split = [...first].length;
  const cap = [...text].length;
  const spec = VoiceSpec.parse({schemaVersion: 'presentation-voice-bindings/1.1',
    planTaskId: '4'.repeat(64), planManifestSha256: '5'.repeat(64), proposalHash: plan.proposalHash, playbackRate: 1,
    voicePolicy: 'caller-declared-local-import', clips: [{beatId: plan.beats[0]!.id,
      receiptFingerprint: '6'.repeat(64), receiptSha256: '7'.repeat(64), sourceAudioSha256: '8'.repeat(64),
      transcript: text, transcriptSha256: sha256(text), startOffsetFrames: 2, captions: [
        {startChar: 0, endChar: split, startSample: 0, endSample: 192000},
        {startChar: split, endChar: cap, startSample: 192000, endSample: 384000},
      ]}]});
  if (spec.schemaVersion !== 'presentation-voice-bindings/1.1') throw new Error('Expected authored captions');
  const clip = spec.clips[0]!;
  const recording = {beatId: clip.beatId, startSample: 4000, endSample: 388000, sampleCount: 384000,
    startFrame: 2, endFrame: 194} as ReturnType<typeof placement>;
  expect(matchVoice(plan, spec)).toHaveLength(1);
  expect(VoiceSpec.safeParse({...spec, clips: [{...clip,
    captions: Array.from({length: 41}, () => clip.captions[0]!),
  }]}).success).toBe(false);
  expect(() => projectCaptions({...clip, captions: [
    {...clip.captions[0]!, endChar: 110}, {...clip.captions[1]!, startChar: 110},
  ]}, recording)).toThrow(expect.objectContaining({code: 'VOICE_CAPTION_LIMIT'}));
  const projected = projectCaptions(clip, recording);
  expect(projected.map(cue => [cue.transcript, cue.startFrame, cue.endFrame])).toEqual([[first, 2, 98], [second.trim(), 98, 194]]);
  for (const [change, code] of [
    [{startChar: split + 1}, 'VOICE_CAPTION_TEXT'], [{startChar: split - 1}, 'VOICE_CAPTION_TEXT'],
    [{endChar: cap - 1}, 'VOICE_CAPTION_TEXT'], [{endSample: 384001}, 'VOICE_CAPTION_TIMING'],
    [{startSample: 191999}, 'VOICE_CAPTION_TIMING'], [{startSample: 383999}, 'VOICE_CAPTION_TIMING'],
    [{endSample: 194000}, 'VOICE_CAPTION_DURATION'], [{endSample: 300000}, 'VOICE_CAPTION_DURATION'],
  ] as const) {
    expect(() => projectCaptions({...clip, captions: [clip.captions[0]!, {...clip.captions[1]!, ...change}]}, recording))
      .toThrow(expect.objectContaining({code}));
  }
  expect(() => projectCaptions({...clip, captions: [
    {...clip.captions[0]!, startSample: 0, endSample: 192100}, {...clip.captions[1]!, startSample: 192150},
  ]}, recording)).toThrow(expect.objectContaining({code: 'VOICE_CAPTION_TIMING'}));
});

it('rejects unbounded or unsupported sequence specs before dispatch', async ({onTestFinished}) => {
  const root = await mkdtemp(join(tmpdir(), 'gve-seq-'));
  const data = join(root, 'unused-state');
  const path = join(root, 'sequence.json');
  onTestFinished(async () => {
    await rm(path, {force: true});
    await rmdir(root);
  });
  const preview = {sceneId: 'first', previewTaskId: '1'.repeat(64), expectedPreviewManifestSha256: '2'.repeat(64)};
  const scene = {...preview, openingCard: {title: 'One slot'}};
  const spec = {schemaVersion: 'presentation-sequence/1.2', locale: 'en', authorship: {kind: 'caller-authored'}, mode: 'silent',
    scenes: [scene, {...scene, sceneId: 'second', previewTaskId: '3'.repeat(64)}]};
  const reject = async (value: unknown, code: string) => {
    await writeFile(path, JSON.stringify(value));
    await expect(assembleSequence(data, path, signal, () => {throw new Error('Unexpected dispatch');}))
      .rejects.toMatchObject({code: 'PRESENTATION_SEQUENCE_' + code});
  };
  await reject({...spec, scenes: [scene]}, 'SCHEMA');
  await reject({...spec, scenes: [scene, {...scene, path: 'outside.mp4'}]}, 'SCHEMA');
  await reject({...spec, scenes: [scene, {...preview, sceneId: 'second'}]}, 'SCHEMA');
  for (const title of ['A'.repeat(22), ' ', 'Example\n', 'A%{pts}', 'A:../../other', 'A\u202e']) {
    await reject({...spec, scenes: [scene, {...spec.scenes[1], openingCard: {title}}]}, 'SCHEMA');
  }
  await reject({...spec, scenes: [scene, {...spec.scenes[1], openingCard: {title: 'Example', frames: 1}}]}, 'SCHEMA');
  await reject({...spec, locale: undefined}, 'LOCALE');
  await reject({...spec, locale: 'fr-FR'}, 'LOCALE');
  await reject({...spec, locale: 'zh-CN'}, 'SCHEMA');
  await reject({...spec, scenes: [scene, {...spec.scenes[1], openingCard: {title: '修订版'}}]}, 'SCHEMA');
  const chinese = {sceneId: 'second', previewTaskId: '3'.repeat(64), expectedPreviewManifestSha256: '2'.repeat(64),
    openingCard: {title: '修订版示意'}};
  await reject({...spec, locale: 'zh-CN', scenes: [chinese, chinese]}, 'DUPLICATE');
  for (const title of ['中文'.repeat(7), '中文\u200b', '中文\n示例']) {
    await reject({...spec, locale: 'zh-CN', scenes: [chinese, {...chinese, openingCard: {title}}]}, 'SCHEMA');
  }
  await reject({...spec, locale: undefined, schemaVersion: 'presentation-sequence/1.1'}, 'VERSION');
  await reject({...spec, locale: undefined, schemaVersion: 'presentation-sequence/1.0',
    scenes: [preview, {...preview, sceneId: 'second', previewTaskId: '3'.repeat(64)}]}, 'VERSION');
  await reject({...spec, scenes: [scene, scene]}, 'DUPLICATE');
  await reject({...spec, mode: 'narrated'}, 'MODE');
  await reject({...spec, schemaVersion: 'presentation-sequence/1.3'}, 'SCHEMA');
  await reject({...spec, schemaVersion: 'presentation-sequence/1.3', mode: 'narrated', scenes: [scene, scene]}, 'DUPLICATE');
});

it('places exact child PCM and provenance across a narrated sequence card', () => {
  const pcm1 = Buffer.alloc(2 * FRAME_SAMPLES, 17);
  const pcm2 = Buffer.alloc(2 * FRAME_SAMPLES, 33);
  const output = Buffer.alloc(38 * FRAME_SAMPLES * 2);
  const legacyCue = {beatId: 'same-beat', startSample: 25, endSample: 1990, startFrame: 0, endFrame: 1, transcript: 'A < B'};
  const newerCue = {...legacyCue, startSample: 50, endSample: 1875, transcript: 'Next & exact'};
  const makeChild = (pcm: Buffer, ledger: unknown) => {
    const voice = Buffer.from(JSON.stringify(ledger));
    const manifest = Buffer.from(JSON.stringify({voiceTaskId: '1'.repeat(64), voiceManifestSha256: sha256(voice)}));
    return new Map([['preview-manifest.json', manifest], ['voice/voice-manifest.json', voice], ['voice/narration.pcm', pcm]]);
  };
  const original = {schemaVersion: 'presentation-voice-ledger/1.0', cues: [legacyCue]};
  const declared = {schemaVersion: 'presentation-voice-ledger/1.1', captionTiming: 'caller-declared', captionCues: [newerCue]};
  const audio = sequenceAudio(output);
  expect(audio.append('first', 0, 1, makeChild(pcm1, original))).toMatchObject({
    startSample: 0, endSample: 2000, pcmSha256: sha256(pcm1), captionTiming: 'clip-level-measured'});
  expect(audio.append('next', 37, 38, makeChild(pcm2, declared))).toMatchObject({
    startSample: 74000, endSample: 76000, pcmSha256: sha256(pcm2), captionTiming: 'caller-declared'});
  const combined = audio.finish();
  expect(output.equals(Buffer.concat([pcm1, Buffer.alloc(144_000), pcm2]))).toBe(true);
  expect(combined.metadata).toMatchObject({samples: 76000, pcmSha256: sha256(output), captionCount: 2, speechAlignment: 'unverified'});
  expect(combined.vtt.toString()).toContain('first:1\n00:00:00.001 --> 00:00:00.041\nA &lt; B');
  expect(combined.vtt.toString()).toContain('next:1\n00:00:01.543 --> 00:00:01.581\nNext &amp; exact');
  expect(JSON.parse(combined.captionLedger.toString()).cues[1]).toMatchObject({
    id: 'next:1', sceneId: 'next', beatId: 'same-beat', sourceCueIndex: 0,
    sourceStartSample: 50, sourceEndSample: 1875, startSample: 74050, endSample: 75875,
    sourceStartFrame: 0, sourceEndFrame: 1, startFrame: 37, endFrame: 38, captionTiming: 'caller-declared'});
  for (const bad of [pcm1.subarray(2), Buffer.concat([pcm1, Buffer.alloc(2)])]) {
    expect(() => sequenceAudio().append('first', 0, 1, makeChild(bad, original)))
      .toThrow(expect.objectContaining({code: 'PRESENTATION_SEQUENCE_AUDIO'}));
  }
  expect(() => sequenceAudio().append('first', 0, 1, makeChild(pcm1, {...original, cues: [{...legacyCue, endSample: 2001}]})))
    .toThrow(expect.objectContaining({code: 'PRESENTATION_SEQUENCE_AUDIO'}));
  expect(() => sequenceAudio().append('first', 0, 1, makeChild(pcm1, {...original, cues: [{...legacyCue, endSample: 26}]})))
    .toThrow(expect.objectContaining({code: 'PRESENTATION_SEQUENCE_AUDIO'}));
});
