import {join, resolve} from 'node:path';
import {z} from 'zod';
import {ArtifactStore} from '../assets/store.js';
import {PRESENTATION_FPS, PRESENTATION_MAX_FRAMES, PresentationPlan} from '../contracts/presentation.js';
import type {Artifact} from '../contracts/runtime.js';
import {Hash} from '../contracts/video.js';
import {checkAbort, EngineError} from '../core/errors.js';
import {createOwnedRuntimeTmp, cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {canonical, sha256} from '../core/util.js';
import {TaskRunner, type TaskRecord} from '../orchestrator/tasks.js';
import {compilePresentation} from '../presentation/compile.js';
import {bindPresentationVoiceFromSpec, createPresentationFromPlan, preflightPresentationState, presentationVoiceId,
  readPresentation, renderPresentation, taskCancellation, voiceDecoderVersions} from '../presentation/runtime.js';
import {decodeClip, FRAME_SAMPLES, matchVoice, RATE, VoiceSpec} from '../presentation/narration.js';
import {captureRepositoryText, researchRepository, TextCaptureLimits, type ReadonlyTransport} from '../providers/github-readonly.js';
import {environment} from '../providers/local.js';
import {publishAssetFiles, RECEIPT_PUBLICATION} from '../story-planner/asset-pack.js';
import {ancestors, boundedFile, readTask} from '../story-planner/runtime.js';
import {generateHuihui, huihuiGenerationId, HuihuiSpec} from '../tts/huihui.js';
import {importHuihuiTts, readLocalTts} from '../tts/runtime.js';
import {authoringPacket, loadAuthoringProposal, submitParsedAuthoringProposal, verifyProposal} from './agent-authoring.js';
import {checkDatabaseFiles} from './cli.js';
import {AuthorInput, AuthorReceipt, ExplanationAuthorPacketProfile, HiddenFileAuthorPacketProfile, NarratedHiddenFileAuthorPacketProfile, HiddenNarratedRenderSpec, LocalizedNarratedAuthorPacketProfile, NarratedProfile,
  NarratedRenderInput, NarratedRenderReceipt, NarratedRenderSpec, PreparedRevisionInput, RenderInput, RenderReceipt, Request, RevisionInput, RevisionReceipt, RevisionSpec, StartInput,
  SourceCaptureProfile, SourcePathsAuthorPacketProfile, StartReceipt, SessionSubmission, VoicePrepareInput, VoicePrepareReceipt} from './explanation-contract.js';
import {explanationAuthorPacket} from './explanation-author-packet.js';
import {evidenceWorkspace} from './project-evidence.js';
import {sourceFingerprint, validateSnapshot, WorkflowStore} from './store.js';
import {ZH_VISUAL_PROFILE} from '../presentation/visual-locale.js';
import {proposalFactReview, presentationFactReview, verifyFactReview, FactReviewReceipt} from './fact-review.js';

const START = 'repository-explanation-start-v1';
const AUTHOR = 'repository-explanation-author-v1';
const RENDER = 'repository-explanation-render-v1';
const PREPARE_VOICE = 'repository-explanation-prepare-huihui-v1';
const RENDER_NARRATED = 'repository-explanation-render-huihui-v1';
const REVISE = 'repository-explanation-revise-v1';
const MAX_REVISION_DEPTH = 8;
const RENDER_TIMEOUT_MS = 3_120_000;
const REVISION_TIMEOUT_MS = RENDER_TIMEOUT_MS + 60_000;
const PROFILE = 'explanation-session/1.0';
const RETRIES = 3;
const SNAPSHOT_LIMIT = 4_000_000;
type Announce = (id: string) => void;
const fail = (code: string, message: string): never => {throw new EngineError('EXPLANATION_' + code, message);};
const json = (value: unknown) => Buffer.from(canonical(value));
const fingerprint = (kind: string, input: unknown) => sha256(canonical({version: 'production-task-v1', kind, input}));
const projectFor = (id: string) => 'explain-' + id.slice(0, 48);
const digestFiles = (files: Map<string, Buffer>) =>
  sha256(canonical([...files].map(([name, bytes]) => [name, sha256(bytes)]).sort((a, b) => a[0]!.localeCompare(b[0]!, 'en'))));
const review = {semantic: 'pending', editorial: 'pending', audiovisual: 'pending', ownerAcceptance: 'pending'} as const;
const speechReview = {speechContent: 'unverified', speechAlignment: 'unverified', ownerListening: 'pending'} as const;

function decode(bytes: Buffer): unknown {
  try {return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));}
  catch {return fail('JSON', 'Expected valid UTF-8 explanation JSON.');}
}
function parse<T>(schema: z.ZodType<T>, value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return fail('SCHEMA', parsed.error.issues.slice(0, 6).map(issue =>
    issue.path.join('.') + ' ' + issue.message).join(', '));
  return parsed.data;
}
const spec = async <T>(schema: z.ZodType<T>, path: string, limit: number) =>
  parse(schema, decode(await boundedFile(resolve(path), limit)));
function storedInput<T>(schema: z.ZodType<T>, task: TaskRecord) {
  const input = parse(schema, task.input);
  if (canonical(input) !== canonical(task.input)) return fail('INTEGRITY', 'Stored input is not canonical for its stage.');
  return input;
}

async function withWorkflow<T>(data: string, create: boolean, work: (store: WorkflowStore) => Promise<T>) {
  const path = join(resolve(data), 'workflow');
  await ancestors(path);
  if (!await checkDatabaseFiles(join(path, 'workflow.sqlite')) && !create) return fail('PARENT', 'Verified workflow state is required.');
  const store = new WorkflowStore(path, {authoring: create});
  try {return await work(store);} finally {store.close();}
}

async function run<T>(data: string, kind: string, input: unknown, signal: AbortSignal, onTask: Announce | undefined,
  work: (runner: TaskRunner, id: string, signal: AbortSignal, directory: string) => Promise<{value: T; outputs: Artifact[]}>,
  timeoutMs: number) {
  data = await preflightPresentationState(data);
  checkAbort(signal);
  const id = fingerprint(kind, input);
  onTask?.(id);
  const runner = new TaskRunner(data);
  const cancellation = taskCancellation(signal);
  try {
    if (runner.get(id)?.state === 'succeeded') await checkedStage(data, await readTask(data, id, kind), signal);
    return await runner.run(kind, input, (dir, child) => work(runner, id, child, dir), cancellation.signal,
      {attempts: RETRIES, timeoutMs, ...(kind === PREPARE_VOICE && {beforeDiscardTemporary: cleanupOwnedRuntimeTmp})});
  }
  finally {cancellation.dispose(); runner.close();}
}

async function readArtifact(data: string, task: TaskRecord, artifact: Artifact, limit: number, signal: AbortSignal) {
  checkAbort(signal);
  if (artifact.inputFingerprint !== task.id || artifact.mediaType !== 'application/json' ||
      artifact.producingStage !== 'PUBLISH' || artifact.bytes > limit) return fail('INTEGRITY', 'Invalid stage artifact binding.');
  const store = new ArtifactStore(data);
  await store.verify(artifact);
  const bytes = await boundedFile(store.path(artifact), limit);
  if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) return fail('INTEGRITY', 'Stage artifact changed while reading.');
  return bytes;
}

async function receipt<T>(schema: z.ZodType<T>, data: string, task: TaskRecord, signal: AbortSignal) {
  if (task.state !== 'succeeded' || !task.result) return fail('NOT_READY', 'This explanation stage has no committed result.');
  const bytes = await readArtifact(data, task, task.result, 64_000, signal);
  const value = parse(schema, decode(bytes));
  if (!json(value).equals(bytes)) return fail('INTEGRITY', 'Stage receipt does not match its canonical bytes.');
  return value;
}

function packet(id: string, input: StartInput, snapshot: ReturnType<typeof validateSnapshot>) {
  if (snapshot.repository !== input.request.repository ||
      (/^[a-f0-9]{40}$/i.test(input.request.ref) && snapshot.commit !== input.request.ref.toLowerCase()) ||
      input.request.documents.some(path => !snapshot.documents.some(file => file.path === path))) {
    return fail('INTEGRITY', 'Pinned snapshot differs from the requested repository, commit or documents.');
  }
  if ('sourceCaptureProfile' in input) {
    const {sourcePaths, documents} = input.request;
    const split = snapshot.documents.length - sourcePaths.length;
    const base = snapshot.documents.slice(0, split);
    const captured = snapshot.documents.slice(split);
    if (split < 1 || documents.some(path => !base.some(file => file.path === path)) ||
        captured.some((file, index) => file.path !== sourcePaths[index] || !file.content ||
          file.content.includes('\0') || Buffer.from(file.content).toString('utf8') !== file.content) ||
        snapshot.documents.reduce((size, file) => size + Buffer.byteLength(file.content), 0) > TextCaptureLimits.totalBytes) {
      return fail('INTEGRITY', 'Pinned snapshot differs from the ordered sourcePaths or capture budget.');
    }
  }
  const workspace = evidenceWorkspace(projectFor(id), sourceFingerprint(snapshot), snapshot);
  const author = authoringPacket(workspace, 'capabilityProfile' in input.request
    ? input.request.capabilityProfile : undefined);
  author.files.set('session-request.json', json({sessionTaskId: id, request: input.request, ...author.request}));
  if (input.packetProfile) explanationAuthorPacket(id, input, author);
  return {workspace, author, packetSha256: digestFiles(author.files)};
}

async function verifiedStart(data: string, task: TaskRecord, signal: AbortSignal) {
  const input = storedInput(StartInput, task);
  const saved = await receipt(StartReceipt, data, task, signal);
  if (canonical(task.outputs) !== canonical([saved.snapshot])) return fail('INTEGRITY', 'Start output closure differs.');
  const bytes = await readArtifact(data, task, saved.snapshot, SNAPSHOT_LIMIT, signal);
  const snapshot = validateSnapshot(decode(bytes));
  const material = packet(task.id, input, snapshot);
  if (!json(snapshot).equals(bytes) || material.packetSha256 !== saved.packetSha256 ||
      canonical(material.author.request) !== canonical({binding: saved.binding, authoringRequestId: saved.authoringRequestId})) {
    return fail('INTEGRITY', 'Pinned source or authoring packet differs.');
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.0', taskId: task.id, stage: 'awaiting-author',
    profile: input.profile, request: input.request, binding: saved.binding, authoringRequestId: saved.authoringRequestId,
    ...(input.packetProfile ? {packetProfile: input.packetProfile} : {}),
    ...('sourceCaptureProfile' in input ? {sourceCaptureProfile: input.sourceCaptureProfile} : {}),
    packetSha256: saved.packetSha256, review} as const;
  const files = new Map(material.author.files);
  files.set('session-manifest.json', json(manifest));
  return {manifest, files, snapshot, workspace: material.workspace, input};
}

function validateSubmission(submission: SessionSubmission, parent: Awaited<ReturnType<typeof verifiedStart>>) {
  const {manifest, workspace} = parent;
  const request = manifest.request;
  const hidden = 'capabilityProfile' in request ? request : null;
  if (hidden ? submission.schemaVersion !== 'explanation-session-author/1.1' || submission.capabilityProfile !== hidden.capabilityProfile
    : submission.schemaVersion !== 'explanation-session-author/1.0') {
    return fail('BINDING', 'Use the submission profile supplied by the exact start checkpoint.');
  }
  if (submission.sessionTaskId !== manifest.taskId || submission.snapshotHash !== manifest.binding.snapshotHash ||
      submission.authoringRequestId !== manifest.authoringRequestId || submission.language !== manifest.request.language) {
    return fail('BINDING', 'Submission differs from the pinned authoring request or language.');
  }
  if ('proposal' in submission) {
    if (submission.proposal.authorship.kind !== 'session-agent' ||
        submission.proposal.useCase.audience !== manifest.request.audience) {
      return fail('AUTHORSHIP', 'Proposal must declare session-agent authorship and the exact requested audience.');
    }
    verifyProposal(submission.proposal, workspace);
    if (hidden && submission.proposal.schemaVersion === '1.2') {
      const captured = new Set(workspace.manifest.documents.filter(row => hidden.sourcePaths.includes(row.repositoryPath)).map(row => row.sourceId));
      const mechanism = submission.proposal.mechanisms[0];
      for (const rule of Object.values(mechanism.rules)) {
        const claim = submission.proposal.claims.find(row => row.id === rule.claimId);
        const citation = claim?.citations[rule.citationIndex];
        if (claim?.basis.kind !== 'documented' || !citation || !captured.has(citation.sourceId) || !mechanism.claimIds.includes(rule.claimId)) {
          return fail('CITATION', 'Each hidden-file rule must cite an exact documented line in a selected sourcePaths file.');
        }
      }
    }
    if (json(submission.proposal).length > 300_000) return fail('LIMIT', 'Session proposals are limited to 300 kB.');
  }
  if ('reason' in submission) for (const item of submission.reason.citations) {
    const source = workspace.manifest.sources.find(row => row.id === item.sourceId);
    if (!source || source.sha256 !== item.sourceSha256) return fail('CITATION', 'Disposition source identity differs.');
    const lines = workspace.files.get(source.path)!.toString('utf8').split(/\r?\n/);
    if (item.startLine > item.endLine || item.endLine > lines.length ||
        lines.slice(item.startLine - 1, item.endLine).join('\n') !== item.quote) {
      return fail('CITATION', 'Disposition requires the exact pinned source lines.');
    }
  }
  if (submission.disposition === 'unsupported' && submission.reason.code === 'unsupported-mechanism' &&
      submission.proposal.mechanisms.every(mechanism => ['http', 'image-mask', 'concurrency-queue'].includes(mechanism.adapterCandidate))) {
    return fail('DISPOSITION', 'The proposal declares only supported mechanism families. Use a specific unsupported operation or evidence gap.');
  }
}

async function verifiedAuthor(data: string, task: TaskRecord, signal: AbortSignal) {
  const {submission} = storedInput(AuthorInput, task);
  const saved = await receipt(AuthorReceipt, data, task, signal);
  const parent = await verifiedStart(data, await readTask(data, submission.sessionTaskId, START), signal);
  validateSubmission(submission, parent);
  const expectedProposal = 'proposal' in submission ? sha256(json(submission.proposal)) : null;
  if (task.outputs.length || saved.proposalHash !== expectedProposal ||
      saved.startManifestSha256 !== sha256(json(parent.manifest))) {
    return fail('INTEGRITY', 'Author checkpoint differs from its exact submission and start stage.');
  }
  if (saved.proposalHash) {
    const proposal = await withWorkflow(data, false, store => loadAuthoringProposal(store, parent.manifest.binding.projectId,
      saved.proposalHash!, signal));
    if (!proposal.bytes.equals(json('proposal' in submission ? submission.proposal : null))) {
      return fail('INTEGRITY', 'Committed author proposal differs from the session.');
    }
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.0', taskId: task.id, sessionTaskId: parent.manifest.taskId,
    stage: submission.disposition === 'proposal'
      ? parent.manifest.request.voiceMode === 'silent' ? 'awaiting-plan' : 'awaiting-voice'
      : submission.disposition,
    binding: parent.manifest.binding, authoringRequestId: parent.manifest.authoringRequestId,
    request: parent.manifest.request, proposalHash: saved.proposalHash, startManifestSha256: saved.startManifestSha256,
    submissionSha256: sha256(json(submission)), ...('reason' in submission ? {reason: submission.reason} : {}), review} as const;
  const files = new Map(parent.files);
  files.set('start-manifest.json', json(parent.manifest));
  files.set('authoring-submission.json', json(submission));
  files.set('session-manifest.json', json(manifest));
  return {manifest, files, parent, submission};
}

type VerifiedAuthor = Awaited<ReturnType<typeof verifiedAuthor>>;

function checkPlan(author: VerifiedAuthor, plan: PresentationPlan) {
  if (author.submission.disposition !== 'proposal' || plan.proposalHash !== author.manifest.proposalHash ||
      plan.authorship.kind !== 'session-agent') return fail('BINDING', 'Rendering requires the accepted exact proposal and session-agent plan.');
  if (plan.schemaVersion === '1.2') return fail('SCHEMA', 'Use queue plan 1.3 for new sessions.');
  const request = author.manifest.request;
  if ('capabilityProfile' in request
    ? plan.schemaVersion !== '1.4' || plan.capabilityProfile !== request.capabilityProfile || plan.module.language !== request.language
    : plan.schemaVersion === '1.4') {
    return fail('BINDING', 'The presentation plan must use the start checkpoint’s capability and requested language.');
  }
  const compiled = compilePresentation(author.submission.proposal, plan);
  if (compiled.timeline.totalFrames > author.manifest.request.maxSeconds * PRESENTATION_FPS) {
    return fail('DURATION', 'Compiled timeline exceeds the requested maximum frame count.');
  }
  return compiled;
}

async function verifiedPlan(data: string, author: VerifiedAuthor, input: RenderInput | NarratedRenderInput, signal: AbortSignal) {
  checkPlan(author, input.plan);
  const result = await readPresentation(data, input.planTaskId, 'plan', signal);
  const manifest = result.files && parse(z.object({hiddenVoicePreparationTaskId: Hash.optional()}),
    decode(result.files.get('plan-manifest.json')!));
  const hiddenVoicePreparationTaskId = input.plan.schemaVersion === '1.4' && 'voicePreparationTaskId' in input
    ? input.voicePreparationTaskId : undefined;
  if (!result.files || manifest?.hiddenVoicePreparationTaskId !== hiddenVoicePreparationTaskId ||
      !result.files.get('presentation.json')?.equals(json(input.plan)) ||
      sha256(result.files.get('plan-manifest.json')!) !== input.planManifestSha256) {
    return fail('INTEGRITY', 'Child plan differs from the exact authored plan or its committed manifest.');
  }
}

async function verifiedPreview(data: string, input: RenderInput | NarratedRenderInput, id: string, signal: AbortSignal,
  voiceManifestSha256?: string) {
  const mode = input.profile === NarratedProfile ? 'narrated' : 'silent';
  const result = await readPresentation(data, id, mode === 'silent' ? 'preview' : 'narrated', signal);
  if (!result.files) return fail('NOT_READY', 'Child preview has no verified completed output.');
  const bytes = result.files.get('preview-manifest.json')!;
  const metadata = parse(z.object({taskId: Hash, mode: z.literal(mode), planTaskId: Hash, planManifestSha256: Hash,
    voiceTaskId: Hash.optional(), voiceManifestSha256: Hash.optional(),
    visualLocaleProfile: z.literal(ZH_VISUAL_PROFILE).optional(),
    environment: z.record(z.string(), z.string()), timeline: z.object({fps: z.literal(PRESENTATION_FPS),
      totalFrames: z.number().int().positive().max(7200)})}), decode(bytes));
  if (metadata.taskId !== id || metadata.planTaskId !== input.planTaskId ||
      metadata.planManifestSha256 !== input.planManifestSha256 ||
      canonical(metadata.environment) !== canonical(input.rendererEnvironment) ||
      (input.profile === NarratedProfile && (metadata.voiceTaskId !== input.voiceTaskId ||
        !voiceManifestSha256 || metadata.voiceManifestSha256 !== voiceManifestSha256 ||
        metadata.visualLocaleProfile !== input.visualLocaleProfile))) {
    return fail('INTEGRITY', 'Child preview differs from the verified plan or recorded renderer environment.');
  }
  return {metadata, bytes, files: result.files};
}

function voiceBeats(author: VerifiedAuthor) {
  if (author.manifest.request.voiceMode !== 'windows-winrt-huihui' || author.submission.disposition !== 'proposal') {
    return fail('VOICE_MODE', 'Voice preparation requires an accepted Huihui session proposal.');
  }
  return author.submission.proposal.beats.map(beat => ({
    beatId: beat.id, spec: parse(HuihuiSpec, {schemaVersion: 'tts-huihui/1.0', text: beat.narration}),
  }));
}

async function voiceAuthor(data: string, input: VoicePrepareInput, signal: AbortSignal) {
  const author = await verifiedAuthor(data, await readTask(data, input.authorTaskId, AUTHOR), signal);
  const beats = voiceBeats(author);
  if (input.authorManifestSha256 !== sha256(json(author.manifest)) || input.generationTaskIds.length !== beats.length) {
    return fail('INTEGRITY', 'Voice preparation differs from its accepted author checkpoint.');
  }
  return {author, beats};
}

async function verifiedVoicePreparation(data: string, task: TaskRecord, signal: AbortSignal) {
  const input = storedInput(VoicePrepareInput, task);
  const saved = await receipt(VoicePrepareReceipt, data, task, signal);
  const {author, beats} = await voiceAuthor(data, input, signal);
  if (task.outputs.length || saved.clips.length !== beats.length) return fail('INTEGRITY', 'Invalid voice preparation closure.');
  const files = new Map(author.files);
  const clips = [];
  for (const [index, beat] of beats.entries()) {
    const clip = saved.clips[index]!;
    const local = await readLocalTts(data, clip.receiptFingerprint, signal);
    const origin = 'huihuiV2' in local ? local.huihuiV2 : undefined;
    if (!origin || !('generationManifestBytes' in local) || !local.generationManifestBytes || clip.beatId !== beat.beatId ||
        clip.generationTaskId !== input.generationTaskIds[index] || origin.taskId !== clip.generationTaskId ||
        origin.manifestSha256 !== clip.generationManifestSha256 || origin.samples !== clip.sourceSamples ||
        clip.decodedSamples !== clip.sourceSamples * (RATE / 16_000) ||
        local.input.text !== beat.spec.text || local.receiptArtifact.sha256 !== clip.receiptSha256 ||
        local.receipt.artifact.sha256 !== clip.sourceAudioSha256) {
      return fail('INTEGRITY', 'Huihui source differs from the committed recording for ' + beat.beatId + '.');
    }
    clips.push({...clip, transcript: beat.spec.text, transcriptSha256: sha256(beat.spec.text),
      minFrames: Math.ceil(clip.decodedSamples / FRAME_SAMPLES)});
    files.set(`huihui/${index}/speech.wav`, local.audio);
    files.set(`huihui/${index}/generation.json`, local.generationManifestBytes);
    files.set(`huihui/${index}/import-receipt.json`, local.receiptBytes);
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.1', taskId: task.id, stage: 'awaiting-narrated-plan',
    sessionTaskId: author.manifest.sessionTaskId, authorTaskId: input.authorTaskId, authorManifestSha256: input.authorManifestSha256,
    binding: author.manifest.binding, request: author.manifest.request, proposalHash: author.manifest.proposalHash,
    profile: input.profile, fps: PRESENTATION_FPS, sourceSampleRate: 16_000, placementSampleRate: RATE, decoder: input.decoder,
    clips, review: {...review, ...speechReview}} as const;
  files.set('author-manifest.json', json(author.manifest));
  files.set('voice-preparation.json', json(manifest));
  files.set('session-manifest.json', json(manifest));
  return {manifest, files, author};
}

function narrationBindings(voice: Awaited<ReturnType<typeof verifiedVoicePreparation>>,
  input: Pick<NarratedRenderInput, 'authorTaskId' | 'voicePreparationManifestSha256' | 'plan' | 'offsets' | 'planTaskId' | 'planManifestSha256'>) {
  const compiled = checkPlan(voice.author, input.plan);
  if (input.authorTaskId !== voice.manifest.authorTaskId ||
      input.voicePreparationManifestSha256 !== sha256(json(voice.manifest)) ||
      input.offsets.length !== compiled.beats.length) return fail('BINDING', 'Narrated plan differs from its voice checkpoint.');
  const clips = voice.manifest.clips.map((clip, index) => {
    const beat = compiled.beats[index]!;
    const offset = input.offsets[index]!;
    if (clip.beatId !== beat.id || offset.beatId !== beat.id) return fail('BINDING', 'Offsets must match each beat in order.');
    const availableFrames = beat.end - beat.start - offset.startOffsetFrames;
    if (availableFrames < clip.minFrames) {
      return fail('VOICE_FIT', canonical({beatId: clip.beatId, startOffsetFrames: offset.startOffsetFrames,
        availableFrames, minClipFrames: clip.minFrames, minAdditionalFrames: clip.minFrames - availableFrames}));
    }
    return {beatId: clip.beatId, startOffsetFrames: offset.startOffsetFrames, transcript: clip.transcript,
      transcriptSha256: clip.transcriptSha256, receiptFingerprint: clip.receiptFingerprint,
      receiptSha256: clip.receiptSha256, sourceAudioSha256: clip.sourceAudioSha256,
      ...(offset.captions && {captions: offset.captions})};
  });
  const version = input.offsets.some(offset => offset.captions) ? '1.1' : '1.0';
  const spec = parse(VoiceSpec, {schemaVersion: 'presentation-voice-bindings/' + version, planTaskId: input.planTaskId,
    planManifestSha256: input.planManifestSha256, proposalHash: input.plan.proposalHash, playbackRate: 1,
    voicePolicy: 'caller-declared-local-import', clips});
  matchVoice(compiled, spec);
  return spec;
}

function presentationReview(author:VerifiedAuthor,input:RenderInput | NarratedRenderInput,files?:Map<string,Buffer>){
 if(!input.factReviewReceipt)return {};
 if(author.submission.disposition!=='proposal')return fail('FACT_REVIEW','A proposal is required.');
 const workspace=author.parent.workspace;
 const packet=presentationFactReview(author.submission.proposal,workspace.manifest.sources.map(s=>({...s,bytes:workspace.files.get(s.path)!})),renderPresentationSpec(input));
 const result=verifyFactReview(packet,input.factReviewReceipt);
 if(result.status!=='attributed-review-complete')return fail('FACT_REVIEW','Review is unresolved; create an explicitly unreviewed preview without --review or supply a complete new receipt.');
 if(files){files.set('fact-review/packet.json',json(packet));files.set('fact-review/receipt.json',json(input.factReviewReceipt));files.set('fact-review/result.json',json(result));}
 return {factReview:result};
}

async function verifiedNarratedRender(data: string, task: TaskRecord, signal: AbortSignal) {
  const input = storedInput(NarratedRenderInput, task);
  const saved = await receipt(NarratedRenderReceipt, data, task, signal);
  const voice = await verifiedVoicePreparation(data, await readTask(data, input.voicePreparationTaskId, PREPARE_VOICE), signal);
  const spec = narrationBindings(voice, input);
  await verifiedPlan(data, voice.author, input, signal);
  const preview = await verifiedPreview(data, input, saved.previewTaskId, signal, saved.voiceManifestSha256);
  if (task.outputs.length || saved.authorManifestSha256 !== voice.manifest.authorManifestSha256 ||
      saved.previewManifestSha256 !== sha256(preview.bytes) || !preview.files.get('voice/bindings.json')?.equals(json(spec)) ||
      saved.voiceManifestSha256 !== sha256(preview.files.get('voice/voice-manifest.json')!) ||
      preview.metadata.timeline.totalFrames > voice.manifest.request.maxSeconds * PRESENTATION_FPS) {
    return fail('INTEGRITY', 'Narrated output differs from its accepted authored plan and Huihui closure.');
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.1', taskId: task.id, stage: 'preview-ready',
    sessionTaskId: voice.manifest.sessionTaskId, authorTaskId: input.authorTaskId, binding: voice.manifest.binding,
    request: voice.manifest.request, proposalHash: voice.manifest.proposalHash, planTaskId: input.planTaskId,
    planManifestSha256: input.planManifestSha256, voicePreparationTaskId: input.voicePreparationTaskId,
    voicePreparationManifestSha256: input.voicePreparationManifestSha256, voiceTaskId: input.voiceTaskId,
    voiceManifestSha256: saved.voiceManifestSha256, previewTaskId: saved.previewTaskId,
    previewManifestSha256: saved.previewManifestSha256, timeline: preview.metadata.timeline,
    ...(input.visualLocaleProfile && {visualLocaleProfile: input.visualLocaleProfile}),
    review: {...review, ...speechReview}, ...presentationReview(voice.author,input)} as const;
  const files = new Map(preview.files);
  files.set('session-manifest.json', json(manifest));
  files.set('start-manifest.json', json(voice.author.parent.manifest));
  files.set('author-manifest.json', json(voice.author.manifest));
  files.set('authoring-submission.json', json(voice.author.submission));
  files.set('voice-preparation.json', json(voice.manifest));
  presentationReview(voice.author,input,files);
  return {manifest, files};
}

async function verifiedRender(data: string, task: TaskRecord, signal: AbortSignal) {
  const input = storedInput(RenderInput, task);
  const saved = await receipt(RenderReceipt, data, task, signal);
  const author = await verifiedAuthor(data, await readTask(data, input.authorTaskId, AUTHOR), signal);
  if (author.manifest.request.voiceMode !== 'silent') return fail('VOICE_MODE', 'Expected a silent session for this checkpoint.');
  await verifiedPlan(data, author, input, signal);
  const preview = await verifiedPreview(data, input, saved.previewTaskId, signal);
  if (task.outputs.length || saved.authorManifestSha256 !== sha256(json(author.manifest)) ||
      saved.previewManifestSha256 !== sha256(preview.bytes) ||
      preview.metadata.timeline.totalFrames > author.manifest.request.maxSeconds * PRESENTATION_FPS) {
    return fail('INTEGRITY', 'Rendered stage differs from the accepted authoring or duration closure.');
  }
  const manifest = {schemaVersion: 'explanation-session-stage/1.0', taskId: task.id, stage: 'preview-ready',
    sessionTaskId: author.manifest.sessionTaskId, authorTaskId: input.authorTaskId, binding: author.manifest.binding,
    request: author.manifest.request, proposalHash: author.manifest.proposalHash, planTaskId: input.planTaskId,
    planManifestSha256: input.planManifestSha256, previewTaskId: saved.previewTaskId,
    previewManifestSha256: saved.previewManifestSha256, authorManifestSha256: saved.authorManifestSha256,
    timeline: preview.metadata.timeline, review, ...presentationReview(author,input)} as const;
  const files = new Map(preview.files);
  files.set('session-manifest.json', json(manifest));
  files.set('start-manifest.json', json(author.parent.manifest));
  files.set('author-manifest.json', json(author.manifest));
  files.set('authoring-submission.json', json(author.submission));
  presentationReview(author,input,files);
  return {manifest, files};
}

async function executeStart(data: string, input: StartInput, signal: AbortSignal, onTask?: Announce, transport?: ReadonlyTransport) {
  const result = await run(data, START, input, signal, onTask, async (runner, id, child) => {
    const {request} = input;
    const base = await researchRepository(request.repository, request.ref, request.documents, transport, child);
    const snapshot = 'sourcePaths' in request
      ? validateSnapshot(await captureRepositoryText(base, request.sourcePaths, child, transport))
      : base;
    const material = packet(id, input, snapshot);
    const artifact = await runner.artifacts.commit(json(snapshot), 'application/json', 'PUBLISH', id);
    return {value: StartReceipt.parse({...material.author.request, packetSha256: material.packetSha256, snapshot: artifact}),
      outputs: [artifact]};
  }, 180_000);
  const status = await statusExplanation(data, result.id, signal);
  return {...status, cached: result.cached};
}

async function executeAuthor(data: string, input: AuthorInput, signal: AbortSignal, onTask?: Announce) {
  const {submission} = input;
  const parent = await verifiedStart(data, await readTask(data, submission.sessionTaskId, START), signal);
  validateSubmission(submission, parent);
  const result = await run(data, AUTHOR, input, signal, onTask, async (_runner, _id, child) => {
    const proposalHash = 'proposal' in submission ? await withWorkflow(data, true, async store => {
      const projectId = parent.manifest.binding.projectId;
      const project = await store.create(projectId, parent.snapshot, {preserveExistingSource: true});
      if (project.snapshotHash !== parent.manifest.binding.snapshotHash) return fail('BINDING', 'Workflow source differs from the session.');
      const committed = await submitParsedAuthoringProposal(store, projectId, submission.proposal, child);
      return committed.hash;
    }) : null;
    return {value: AuthorReceipt.parse({startManifestSha256: sha256(json(parent.manifest)), proposalHash}), outputs: []};
  }, 60_000);
  const status = await statusExplanation(data, result.id, signal);
  return {...status, cached: result.cached};
}

function assertCurrentAuthorSource(data: string, author: VerifiedAuthor) {
  return withWorkflow(data, false, async store => {
    if (store.project(author.manifest.binding.projectId).snapshotHash !== author.manifest.binding.snapshotHash) {
      return fail('BINDING', 'Current workflow source changed. Use a new pinned session.');
    }
  });
}

async function executeVoicePreparation(data: string, input: VoicePrepareInput, signal: AbortSignal, onTask?: Announce) {
  const {author, beats} = await voiceAuthor(data, input, signal);
  const result = await run(data, PREPARE_VOICE, input, signal, onTask, async (_runner, _id, child, directory) => {
    await assertCurrentAuthorSource(data, author);
    if (canonical(await voiceDecoderVersions(child)) !== canonical(input.decoder)) {
      return fail('ENVIRONMENT', 'Voice decoder identity changed. Prepare voice again for a new checkpoint.');
    }
    const runtime = await createOwnedRuntimeTmp(directory);
    const clips = [];
    for (const [index, beat] of beats.entries()) {
      const generation = await generateHuihui(beat.spec, data, child, generationId => {
        if (generationId !== input.generationTaskIds[index]) {
          return fail('ENVIRONMENT', 'Huihui generation identity changed. Prepare voice again for a new checkpoint.');
        }
      });
      const imported = await importHuihuiTts(data, generation.taskId, child);
      const source = await readLocalTts(data, imported.fingerprint, child);
      const pcm = await decodeClip(source, runtime.directory, index, PRESENTATION_MAX_FRAMES, child);
      clips.push({beatId: beat.beatId, generationTaskId: generation.taskId, generationManifestSha256: generation.manifestSha256,
        receiptFingerprint: imported.fingerprint, receiptSha256: imported.receiptArtifact.sha256,
        sourceAudioSha256: imported.receipt.artifact.sha256, sourceSamples: generation.manifest.audio.samples, decodedSamples: pcm.length / 2});
    }
    await assertCurrentAuthorSource(data, author);
    return {value: VoicePrepareReceipt.parse({clips}), outputs: []};
  }, 1_020_000);
  return {...await statusExplanation(data, result.id, signal), cached: result.cached};
}

async function executeNarratedRender(data: string, input: NarratedRenderInput, signal: AbortSignal, onTask?: Announce) {
  const voice = await verifiedVoicePreparation(data, await readTask(data, input.voicePreparationTaskId, PREPARE_VOICE), signal);
  const spec = narrationBindings(voice, input);
  await verifiedPlan(data, voice.author, input, signal);
  presentationReview(voice.author,input);
  const result = await run(data, RENDER_NARRATED, input, signal, onTask, async (_runner, _id, child) => {
    if (canonical(await environment()) !== canonical(input.rendererEnvironment)) {
      return fail('ENVIRONMENT', 'Renderer identity changed. Submit the authored narrated plan again.');
    }
    await assertCurrentAuthorSource(data, voice.author);
    const bound = await bindPresentationVoiceFromSpec(data, spec, child, voiceId => {
      if (voiceId !== input.voiceTaskId) return fail('ENVIRONMENT', 'Voice decoder identity changed. Submit the plan again.');
    });
    if (bound.taskId !== input.voiceTaskId) return fail('INTEGRITY', 'Narrated binding task differs.');
    const preview = await renderPresentation(data, input.planTaskId, child, undefined, input.voiceTaskId, undefined,
      input.visualLocaleProfile);
    const boundVoice = await readPresentation(data, input.voiceTaskId, 'voice', child);
    const ledger = boundVoice.files?.get('voice-manifest.json');
    if (!ledger) return fail('INTEGRITY', 'Narrated binding ledger is unavailable.');
    const voiceManifestSha256 = sha256(ledger);
    const checked = await verifiedPreview(data, input, preview.taskId, child, voiceManifestSha256);
    if (checked.metadata.timeline.totalFrames > voice.manifest.request.maxSeconds * PRESENTATION_FPS) {
      return fail('DURATION', 'Verified preview exceeds the requested maximum frame count.');
    }
    await assertCurrentAuthorSource(data, voice.author);
    return {value: NarratedRenderReceipt.parse({authorManifestSha256: voice.manifest.authorManifestSha256,
      voiceManifestSha256, previewTaskId: preview.taskId, previewManifestSha256: sha256(checked.bytes)}), outputs: []};
  }, RENDER_TIMEOUT_MS);
  return {...await statusExplanation(data, result.id, signal), cached: result.cached};
}

async function executeRender(data: string, input: RenderInput, signal: AbortSignal, onTask?: Announce) {
  const author = await verifiedAuthor(data, await readTask(data, input.authorTaskId, AUTHOR), signal);
  if (author.manifest.request.voiceMode !== 'silent') return fail('VOICE_MODE', 'Use the narrated render checkpoint for Huihui sessions.');
  await verifiedPlan(data, author, input, signal);
  presentationReview(author,input);
  const result = await run(data, RENDER, input, signal, onTask, async (_runner, _id, child) => {
    if (canonical(await environment()) !== canonical(input.rendererEnvironment)) {
      return fail('ENVIRONMENT', 'Renderer identity changed. Submit the authored plan again to create a new render checkpoint.');
    }
    await assertCurrentAuthorSource(data, author);
    const preview = await renderPresentation(data, input.planTaskId, child);
    const checked = await verifiedPreview(data, input, preview.taskId, child);
    if (checked.metadata.timeline.totalFrames > author.manifest.request.maxSeconds * PRESENTATION_FPS) {
      return fail('DURATION', 'Verified preview exceeds the requested maximum frame count.');
    }
    await assertCurrentAuthorSource(data, author);
    return {value: RenderReceipt.parse({authorManifestSha256: sha256(json(author.manifest)),
      previewTaskId: preview.taskId, previewManifestSha256: sha256(checked.bytes)}), outputs: []};
  }, RENDER_TIMEOUT_MS);
  const status = await statusExplanation(data, result.id, signal);
  return {...status, cached: result.cached};
}

async function sessionTask(data: string, id: string, signal: AbortSignal) {
  checkAbort(signal);
  if (!Hash.safeParse(id).success) return fail('TASK', 'Expected a lowercase hexadecimal explanation task ID.');
  const task = await readTask(data, id, null);
  if (![START, AUTHOR, RENDER, PREPARE_VOICE, RENDER_NARRATED, REVISE].includes(task.kind)) {
    return fail('TASK', 'Task does not belong to an explanation session.');
  }
  return task;
}

async function checkedStage(data: string, task: TaskRecord, signal: AbortSignal) {
  if (task.kind === REVISE) return verifiedRevision(data, task, signal);
  if (task.kind === START) return verifiedStart(data, task, signal);
  if (task.kind === AUTHOR) return verifiedAuthor(data, task, signal);
  if (task.kind === PREPARE_VOICE) return verifiedVoicePreparation(data, task, signal);
  if (task.kind === RENDER_NARRATED) return verifiedNarratedRender(data, task, signal);
  return verifiedRender(data, task, signal);
}

export async function statusExplanation(data: string, id: string, signal: AbortSignal) {
  const task = await sessionTask(data, id, signal);
  if (task.state !== 'succeeded') {
    const expired = task.state === 'running' && task.leaseUntil <= Date.now();
    if (task.kind === REVISE) storedInput(RevisionInput, task);
    else if (task.kind === START) storedInput(StartInput, task);
    else if (task.kind === AUTHOR) storedInput(AuthorInput, task);
    else if (task.kind === PREPARE_VOICE) storedInput(VoicePrepareInput, task);
    else if (task.kind === RENDER_NARRATED) storedInput(NarratedRenderInput, task);
    else storedInput(RenderInput, task);
    return {taskId: id, kind: task.kind, state: expired ? 'interrupted' : task.state, attempt: task.attempt,
      retryable: task.attempt < RETRIES && (expired || (task.state !== 'running' && task.error?.classification !== 'permanent')),
      error: task.error};
  }
  const stage = await checkedStage(data, task, signal);
  const next = task.kind === PREPARE_VOICE ? {
    voicePreparationManifestSha256: sha256(json(stage.manifest)),
    submitCommand: 'pnpm gve explanation narrated-render --task ' + id + ' --spec "<NARRATED_RENDER_JSON>" --data "<STATE>"',
  } : {};
  return {...stage.manifest, ...next, state: task.state, attempt: task.attempt, integrity: 'verified' as const};
}

export async function startExplanation(data: string, path: string, out: string, signal: AbortSignal, onTask?: Announce,
  transport?: ReadonlyTransport) {
  const request = await spec(Request, path, 12_000);
  const input = StartInput.parse('sourcePaths' in request
    ? {profile: PROFILE, request, sourceCaptureProfile: SourceCaptureProfile,
      packetProfile: request.schemaVersion === 'explanation-session-request/1.4' ? NarratedHiddenFileAuthorPacketProfile :
        request.schemaVersion === 'explanation-session-request/1.3' ? HiddenFileAuthorPacketProfile : SourcePathsAuthorPacketProfile}
    : {profile: PROFILE, request,
      packetProfile: request.voiceMode === 'silent' ? ExplanationAuthorPacketProfile : LocalizedNarratedAuthorPacketProfile});
  const status = await executeStart(data, input, signal, onTask, transport);
  return {...status, packet: await exportExplanation(data, status.taskId, out, signal)};
}

export async function submitExplanation(data: string, id: string, path: string, signal: AbortSignal, onTask?: Announce) {
  const submission = await spec(SessionSubmission, path, 360_000);
  if (submission.sessionTaskId !== id) return fail('BINDING', 'Submission must name the exact start task.');
  return executeAuthor(data, AuthorInput.parse({profile: PROFILE, submission}), signal, onTask);
}

export async function renderExplanation(data: string, id: string, path: string, signal: AbortSignal, onTask?: Announce, reviewPath?:string) {
  const plan = await spec(PresentationPlan, path, 160_000);
  return executeRender(data, {...await prepareExplanationRender(data, id, plan, signal),...await reviewInput(reviewPath)}, signal, onTask);
}

async function prepareExplanationRender(data: string, id: string, plan: PresentationPlan, signal: AbortSignal) {
  const author = await verifiedAuthor(data, await readTask(data, id, AUTHOR), signal);
  if (author.manifest.request.voiceMode !== 'silent') return fail('VOICE_MODE', 'Prepare Huihui voice and submit a narrated plan.');
  checkPlan(author, plan);
  data = await preflightPresentationState(data);
  const created = await withWorkflow(data, false, store => createPresentationFromPlan(store, author.manifest.binding.projectId,
    plan.proposalHash, plan, data, signal));
  const verified = await readPresentation(data, created.taskId, 'plan', signal);
  if (!verified.files) return fail('NOT_READY', 'Child plan has no completed output.');
  return RenderInput.parse({profile: PROFILE, authorTaskId: id, plan, planTaskId: created.taskId,
    ...(plan.schemaVersion === '1.4' ? {capabilityProfile: plan.capabilityProfile} : {}),
    planManifestSha256: sha256(verified.files.get('plan-manifest.json')!), rendererEnvironment: await environment()});
}

export async function prepareExplanationVoice(data: string, id: string, signal: AbortSignal, onTask?: Announce) {
  const author = await verifiedAuthor(data, await readTask(data, id, AUTHOR), signal);
  const beats = voiceBeats(author);
  const generationTaskIds = await Promise.all(beats.map(beat => huihuiGenerationId(beat.spec)));
  const input = VoicePrepareInput.parse({profile: NarratedProfile, authorTaskId: id,
    authorManifestSha256: sha256(json(author.manifest)), generationTaskIds, decoder: await voiceDecoderVersions(signal)});
  return executeVoicePreparation(data, input, signal, onTask);
}

export async function renderNarratedExplanation(data: string, id: string, path: string, signal: AbortSignal, onTask?: Announce, reviewPath?:string) {
  const authored = await spec(z.union([NarratedRenderSpec, HiddenNarratedRenderSpec]), path, 170_000);
  return executeNarratedRender(data, {...await prepareNarratedExplanationRender(data, id, authored, signal),...await reviewInput(reviewPath)}, signal, onTask);
}

async function prepareNarratedExplanationRender(data: string, id: string, authored: z.infer<typeof NarratedRenderSpec | typeof HiddenNarratedRenderSpec>,
  signal: AbortSignal) {
  const {schemaVersion, plan, offsets, voicePreparationManifestSha256} = authored;
  const voice = await verifiedVoicePreparation(data, await readTask(data, id, PREPARE_VOICE), signal);
  if (voicePreparationManifestSha256 !== sha256(json(voice.manifest))) {
    return fail('BINDING', 'Select the exact voice preparation manifest.');
  }
  if ((schemaVersion === 'explanation-narrated-render/1.1') !== (voice.author.manifest.request.schemaVersion === 'explanation-session-request/1.4')) {
    return fail('BINDING', 'The narrated render specification must match the voice session profile.');
  }
  checkPlan(voice.author, plan);
  data = await preflightPresentationState(data);
  const created = await withWorkflow(data, false, store => createPresentationFromPlan(store, voice.manifest.binding.projectId,
    plan.proposalHash, plan, data, signal, plan.schemaVersion === '1.4' ? id : undefined));
  const verified = await readPresentation(data, created.taskId, 'plan', signal);
  if (!verified.files) return fail('NOT_READY', 'Child plan has no completed output.');
  const base = {profile: NarratedProfile, authorTaskId: voice.manifest.authorTaskId, voicePreparationTaskId: id,
    voicePreparationManifestSha256, plan, offsets, planTaskId: created.taskId,
    planManifestSha256: sha256(verified.files.get('plan-manifest.json')!)};
  const voiceTaskId = await presentationVoiceId(narrationBindings(voice, base), signal);
  return NarratedRenderInput.parse({...base, voiceTaskId, rendererEnvironment: await environment(),
    visualLocaleProfile: ZH_VISUAL_PROFILE});
}

function renderPresentationSpec(input: RenderInput | NarratedRenderInput): RevisionInput['edit']['presentation'] {
  if (input.profile !== NarratedProfile) return {mode: 'silent', plan: input.plan};
  const spec = input.plan.schemaVersion === '1.4' ? HiddenNarratedRenderSpec : NarratedRenderSpec;
  return {mode: 'narrated', spec: spec.parse({schemaVersion: input.plan.schemaVersion === '1.4'
    ? 'explanation-narrated-render/1.1' : 'explanation-narrated-render/1.0',
  plan: input.plan, offsets: input.offsets, voicePreparationManifestSha256: input.voicePreparationManifestSha256})};
}

async function revisionPreview(data: string, task: TaskRecord, signal: AbortSignal) {
  if (task.kind === RENDER) {
    const input = storedInput(RenderInput, task);
    const stage = await verifiedRender(data, task, signal);
    return {...stage, authorTaskId: input.authorTaskId, voicePreparationTaskId: undefined,
      presentation: renderPresentationSpec(input)};
  }
  if (task.kind === RENDER_NARRATED) {
    const input = storedInput(NarratedRenderInput, task);
    const stage = await verifiedNarratedRender(data, task, signal);
    return {...stage, authorTaskId: input.authorTaskId, voicePreparationTaskId: input.voicePreparationTaskId,
      presentation: renderPresentationSpec(input)};
  }
  return fail('REVISION_PARENT', 'Select a completed explanation preview or revision.');
}

type RevisionPreview = Awaited<ReturnType<typeof revisionPreview>>;
type RevisionLineage = {
  preview: RevisionPreview;
  manifest: {taskId: string; stage: "preview-ready"};
  depth: number;
  files: Map<string, Buffer>;
};

async function revisionBase(data: string, input: RevisionInput, signal: AbortSignal, remaining: number): Promise<RevisionLineage> {
  if (remaining <= 0) return fail('REVISION_DEPTH', 'Explanation revisions are limited to eight from the original preview.');
  const task = await readTask(data, input.baseTaskId, null);
  const base = task.kind === REVISE ? await verifiedRevision(data, task, signal, remaining - 1) : undefined;
  const preview = base?.preview ?? await revisionPreview(data, task, signal);
  const manifest = base?.manifest ?? preview.manifest;
  if (sha256(json(manifest)) !== input.edit.expectedBaseManifestSha256) {
    return fail('REVISION_HASH', 'The verified base manifest differs from the expected hash.');
  }
  return {preview, manifest, files: base?.files ?? preview.files, depth: base?.depth ?? 0};
}

async function revisionParents(data: string, base: RevisionPreview, edit: RevisionInput['edit'], signal: AbortSignal) {
  if (edit.presentation.mode !== base.presentation.mode) {
    return fail('REVISION_MODE', 'A revision must keep the original voice mode.');
  }
  if (canonical(edit.presentation) === canonical(base.presentation)) {
    return fail('REVISION_UNCHANGED', 'Supply a changed presentation or manuscript.');
  }
  if (edit.kind === 'presentation') {
    return {authorTaskId: base.authorTaskId, voicePreparationTaskId: base.voicePreparationTaskId};
  }
  const author = await verifiedAuthor(data, await readTask(data, edit.authorTaskId, AUTHOR), signal);
  if (author.manifest.sessionTaskId !== base.manifest.sessionTaskId ||
      canonical(author.manifest.binding) !== canonical(base.manifest.binding) ||
      canonical(author.manifest.request) !== canonical(base.manifest.request) ||
      author.submission.disposition !== 'proposal') {
    return fail('REVISION_SOURCE', 'The revised manuscript must be accepted by the same pinned session.');
  }
  if (author.manifest.proposalHash === base.manifest.proposalHash) {
    return fail('REVISION_UNCHANGED', 'A manuscript revision requires a changed accepted proposal.');
  }
  if (edit.presentation.mode === 'narrated') {
    if (!edit.voicePreparationTaskId) return fail('REVISION_VOICE', 'Provide the revised manuscript’s voice preparation checkpoint.');
    const voice = await verifiedVoicePreparation(data, await readTask(data, edit.voicePreparationTaskId, PREPARE_VOICE), signal);
    if (voice.manifest.authorTaskId !== edit.authorTaskId) {
      return fail('REVISION_VOICE', 'The voice preparation must belong to the revised manuscript.');
    }
  } else if (edit.voicePreparationTaskId) {
    return fail('REVISION_VOICE', 'A silent manuscript cannot select voice preparation.');
  }
  return {authorTaskId: edit.authorTaskId, voicePreparationTaskId: edit.voicePreparationTaskId};
}

async function verifiedRevision(data: string, task: TaskRecord, signal: AbortSignal, remaining = MAX_REVISION_DEPTH): Promise<RevisionLineage> {
  const input = storedInput(RevisionInput, task);
  const saved = await receipt(RevisionReceipt, data, task, signal);
  const base = await revisionBase(data, input, signal, remaining);
  const parents = await revisionParents(data, base.preview, input.edit, signal);
  if ('childRender' in input && saved.childTaskId !== revisionChildId(input.childRender)) {
    return fail('INTEGRITY', 'Revision receipt does not reference the prepared render checkpoint.');
  }
  const child = await revisionPreview(data, await readTask(data, saved.childTaskId, null), signal);
  if (task.outputs.length || saved.baseManifestSha256 !== input.edit.expectedBaseManifestSha256 ||
      saved.childManifestSha256 !== sha256(json(child.manifest)) ||
      child.authorTaskId !== parents.authorTaskId || child.voicePreparationTaskId !== parents.voicePreparationTaskId ||
      canonical(child.presentation) !== canonical(input.edit.presentation)) {
    return fail('INTEGRITY', 'Revision receipt differs from the verified base, edits or child preview.');
  }
  const depth = base.depth + 1;
  const manifest = {
    schemaVersion: 'explanation-revision-stage/1.0', taskId: task.id, stage: 'preview-ready' as const, depth,
    baseTaskId: input.baseTaskId, baseManifestSha256: saved.baseManifestSha256,
    childTaskId: saved.childTaskId, childManifestSha256: saved.childManifestSha256,
    sessionTaskId: child.manifest.sessionTaskId, binding: child.manifest.binding, request: child.manifest.request,
    proposalHash: child.manifest.proposalHash, authorTaskId: child.authorTaskId,
    ...(child.voicePreparationTaskId && {voicePreparationTaskId: child.voicePreparationTaskId}),
    kind: input.edit.kind, reason: input.edit.reason, review: child.manifest.review,
    ...(child.manifest.factReview && {factReview:child.manifest.factReview}),
  };
  const files = new Map(child.files);
  files.set('base-manifest.json', json(base.manifest));
  files.set('revision-edit.json', json(input.edit));
  files.set('revision-manifest.json', json(manifest));
  return {manifest, files, preview: child, depth};
}

const revisionChildId = (child: RenderInput | NarratedRenderInput) =>
  fingerprint(child.profile === NarratedProfile ? RENDER_NARRATED : RENDER, child);

async function checkRevisionEnvironment(data: string, child: RenderInput | NarratedRenderInput, signal: AbortSignal) {
  const task = await readTask(data, revisionChildId(child), null).catch(error => {
    if (error instanceof EngineError && error.code === 'EXPLAIN_TASK') return null;
    throw error;
  });
  if (task?.state === 'succeeded') return;
  const changed = () => new EngineError('EXPLANATION_ENVIRONMENT',
    'Restore the prepared renderer and decoder environment to resume this revision, or submit the edit again to create a new checkpoint.',
    'retryable');
  if (canonical(await environment()) !== canonical(child.rendererEnvironment)) throw changed();
  if (child.profile === NarratedProfile) {
    const voice = await verifiedVoicePreparation(data, await readTask(data, child.voicePreparationTaskId, PREPARE_VOICE), signal);
    if (await presentationVoiceId(narrationBindings(voice, child), signal) !== child.voiceTaskId) throw changed();
  }
}

async function executeRevision(data: string, input: PreparedRevisionInput, signal: AbortSignal, onTask?: Announce) {
  const base = await revisionBase(data, input, signal, MAX_REVISION_DEPTH);
  const parents = await revisionParents(data, base.preview, input.edit, signal);
  const childRender = input.childRender;
  const voicePreparationTaskId = childRender.profile === NarratedProfile ? childRender.voicePreparationTaskId : undefined;
  if (childRender.authorTaskId !== parents.authorTaskId || voicePreparationTaskId !== parents.voicePreparationTaskId ||
      canonical(renderPresentationSpec(childRender)) !== canonical(input.edit.presentation)) {
    return fail('INTEGRITY', 'Prepared render differs from the revision edit or its parents.');
  }
  const childTaskId = revisionChildId(childRender);
  await checkRevisionEnvironment(data, childRender, signal);
  const result = await run(data, REVISE, input, signal, onTask, async (_runner, _id, childSignal) => {
    const status = childRender.profile === NarratedProfile
      ? await executeNarratedRender(data, childRender, childSignal)
      : await executeRender(data, childRender, childSignal);
    if (status.taskId !== childTaskId) return fail('INTEGRITY', 'Render did not use the prepared checkpoint.');
    const child = await revisionPreview(data, await readTask(data, childTaskId, null), childSignal);
    return {value: RevisionReceipt.parse({baseManifestSha256: input.edit.expectedBaseManifestSha256,
      childTaskId, childManifestSha256: sha256(json(child.manifest))}), outputs: []};
  }, REVISION_TIMEOUT_MS);
  return {...await statusExplanation(data, result.id, signal), cached: result.cached};
}

export async function reviseExplanation(data: string, id: string, path: string, signal: AbortSignal, onTask?: Announce, reviewPath?:string) {
  const edit = await spec(RevisionSpec, path, 175_000);
  const baseInput = {baseTaskId: parse(Hash, id), edit};
  const base = await revisionBase(data, baseInput, signal, MAX_REVISION_DEPTH);
  const parents = await revisionParents(data, base.preview, edit, signal);
  const presentation = edit.presentation;
  const preparedRender = presentation.mode === 'silent'
    ? await prepareExplanationRender(data, parents.authorTaskId, presentation.plan, signal)
    : await prepareNarratedExplanationRender(data, parents.voicePreparationTaskId!, presentation.spec, signal);
  const childRender={...preparedRender,...await reviewInput(reviewPath)};
  return executeRevision(data, PreparedRevisionInput.parse({...baseInput, profile: 'explanation-revision-task/1.1', childRender}),
    signal, onTask);
}

export async function resumeExplanation(data: string, id: string, signal: AbortSignal, onTask?: Announce) {
  const task = await sessionTask(data, id, signal);
  if (task.state === 'succeeded') return {...await statusExplanation(data, id, signal), cached: true};
  if (task.kind === REVISE) {
    const input = storedInput(RevisionInput, task);
    if (!('childRender' in input)) return fail('REVISION_LEGACY_RESUME',
      'This unfinished revision did not record a prepared render checkpoint. Submit the edit again.');
    return executeRevision(data, input, signal, onTask);
  }
  if (task.kind === START) return executeStart(data, storedInput(StartInput, task), signal, onTask);
  if (task.kind === AUTHOR) return executeAuthor(data, storedInput(AuthorInput, task), signal, onTask);
  if (task.kind === PREPARE_VOICE) return executeVoicePreparation(data, storedInput(VoicePrepareInput, task), signal, onTask);
  if (task.kind === RENDER_NARRATED) return executeNarratedRender(data, storedInput(NarratedRenderInput, task), signal, onTask);
  return executeRender(data, storedInput(RenderInput, task), signal, onTask);
}

export async function exportExplanation(data: string, id: string, out: string, signal: AbortSignal) {
  const stage = await checkedStage(data, await sessionTask(data, id, signal), signal);
  return publishAssetFiles(data, id, out, stage.files, signal, RECEIPT_PUBLICATION);
}

/** Separate review sidecar: never mutates historical stage receipts or grants approval. */
export async function exportExplanationFacts(data:string,id:string,out:string,signal:AbortSignal,receiptPath?:string,presentationPath?:string){
 const author=await verifiedAuthor(data,await readTask(data,id,AUTHOR),signal);
 if(author.submission.disposition!=='proposal')return fail('FACT_REVIEW','Select a proposal checkpoint.');
 const workspace=author.parent.workspace;
 const sources=workspace.manifest.sources.map(s=>({...s,bytes:workspace.files.get(s.path)!}));
 const presentation=presentationPath?await spec(ReviewPresentation,presentationPath,175_000):undefined;
 if(presentation)checkPlan(author,presentation.mode==='silent'?presentation.plan:presentation.spec.plan);
 const packet=presentation?presentationFactReview(author.submission.proposal,sources,presentation):proposalFactReview(author.submission.proposal,sources);
 const files=new Map<string,Buffer>([['fact-review-packet.json',json(packet)],['fact-review-receipt.schema.json',json(z.toJSONSchema(FactReviewReceipt))]]);
 let result:unknown={status:'pending-independent-review',semanticTruth:'not-machine-verified',approval:'none'};
 if(receiptPath){const raw=decode(await boundedFile(resolve(receiptPath),4_000_000));result=verifyFactReview(packet,raw);files.set('fact-review-receipt.json',json(FactReviewReceipt.parse(raw)));}
 files.set('fact-review-result.json',json(result));
 checkAbort(signal);
 return {taskId:id,packetHash:packet.packetHash,result,output:await publishAssetFiles(data,id,out,files,signal,RECEIPT_PUBLICATION)};
}

const ReviewPresentation=z.union([
 z.strictObject({mode:z.literal('silent'),plan:PresentationPlan}),
 z.strictObject({mode:z.literal('narrated'),spec:z.union([NarratedRenderSpec,HiddenNarratedRenderSpec])})
]);
async function reviewInput(path?:string){return path?{factReviewReceipt:await spec(FactReviewReceipt,path,4_000_000)}:{};}

/** Data-only portable capture. Historical review never grants trust to an import. */
export async function capturePortableExplanation(data:string,id:string,signal:AbortSignal){
 let task=await sessionTask(data,id,signal);
 await checkedStage(data,task,signal);
 for(let depth=0;task.kind===REVISE&&depth<MAX_REVISION_DEPTH;depth++){
  const stage=await verifiedRevision(data,task,signal);task=await readTask(data,stage.preview.manifest.taskId,null);
 }
 if(task.kind!==RENDER_NARRATED)return fail('PORTABLE','Portable v1 requires a completed narrated reviewed preview.');
 const input=storedInput(NarratedRenderInput,task);
 if(!input.factReviewReceipt)return fail('PORTABLE','Select a preview with an attributed complete source review.');
 const stage=await verifiedNarratedRender(data,task,signal);
 const author=await verifiedAuthor(data,await readTask(data,input.authorTaskId,AUTHOR),signal);
 if(author.submission.disposition!=='proposal')return fail('PORTABLE','A proposal is required.');
 return {snapshot:author.parent.snapshot,proposal:author.submission.proposal,presentation:renderPresentationSpec(input),
  historicalReview:input.factReviewReceipt,maxSeconds:Math.min(60,author.manifest.request.maxSeconds),
  clips:author.submission.proposal.beats.map((b,index)=>{
   const audio=stage.files.get('voice/original/'+index+'.audio'),sourceReceipt=stage.files.get('voice/original/'+index+'.receipt.json');
   if(!audio||!sourceReceipt)return fail('PORTABLE','Original audio closure unavailable.');
   const receipt=parse(z.object({artifact:z.object({mediaType:z.enum(['audio/wav','audio/mpeg','audio/flac'])})}),decode(sourceReceipt));
   return {beatId:b.id,audio,sourceReceipt,mediaType:receipt.artifact.mediaType};
  })};
}
