import {z} from 'zod';
import {AuthoringBinding, HiddenFileStoryProposal, StoryProposal} from '../contracts/authoring.js';
import {HiddenFileCapability} from '../contracts/hidden-file-policy.js';
import {HiddenFilePlan, HistoricalPresentationPlan, PresentationPlan} from '../contracts/presentation.js';
import {RepositoryUrl} from '../contracts/planning.js';
import {Hash, Id} from '../contracts/video.js';
import {ArtifactSchema} from '../contracts/runtime.js';
import {PRESENTATION_MAX_FRAMES} from '../contracts/presentation.js';
import {AuthoredCaption} from '../presentation/narration.js';
import {ZH_VISUAL_PROFILE} from '../presentation/visual-locale.js';
import {TextCaptureLimits, TextCapturePath} from '../providers/github-readonly.js';

const boundedText = (max: number) => z.string().min(1).max(max).regex(/\S/u);
const Language = z.enum(['en-US', 'zh-CN']);
const Document = z.string().max(160).regex(/^[A-Za-z0-9_.\/-]+\.(md|txt)$/i)
  .refine(path => !path.split('/').some(part => !part || part === '.' || part === '..'));
const SilentRequest = z.strictObject({
  schemaVersion: z.literal('explanation-session-request/1.0'),
  repository: z.string().transform(url => url.replace(/\/$/, '').replace(/\.git$/, '')).pipe(RepositoryUrl)
    .transform(url => url.toLowerCase()),
  ref: z.string().regex(/^[A-Za-z0-9_./-]{1,160}$/).refine(ref => !ref.includes('..')).default('HEAD'),
  documents: z.array(Document).max(6).refine(paths => new Set(paths).size === paths.length).default([]),
  audience: boundedText(500), language: Language, maxSeconds: z.number().int().min(1).max(300),
  voiceMode: z.literal('silent'),
});
const NarratedRequest = SilentRequest.extend({
  schemaVersion: z.literal('explanation-session-request/1.1'), language: z.literal('zh-CN'),
  voiceMode: z.literal('windows-winrt-huihui'),
});
const SourcePathsRequestBase = SilentRequest.extend({
  schemaVersion: z.literal('explanation-session-request/1.2'),
  ref: z.string().regex(/^[a-f0-9]{40}$/i).transform(ref => ref.toLowerCase()),
  sourcePaths: z.array(TextCapturePath).min(1).max(TextCaptureLimits.filesPerRequest),
  voiceMode: z.enum(['silent', 'windows-winrt-huihui']),
});
function checkSourcePaths(request: {sourcePaths: string[]; documents: string[]}, context: z.RefinementCtx) {
  const paths = new Set(request.sourcePaths);
  if (paths.size !== request.sourcePaths.length || request.documents.some(path => paths.has(path))) {
    context.addIssue({code: 'custom', path: ['sourcePaths'], message: 'Use distinct source paths outside documents.'});
  }
}
const SourcePathsRequest = SourcePathsRequestBase.superRefine((request, context) => {
  checkSourcePaths(request, context);
  if (request.voiceMode === 'windows-winrt-huihui' && request.language !== 'zh-CN') {
    context.addIssue({code: 'custom', path: ['language'], message: 'Huihui requires zh-CN.'});
  }
});
const HiddenFileRequest = SourcePathsRequestBase.extend({
  schemaVersion: z.literal('explanation-session-request/1.3'),
  capabilityProfile: z.literal(HiddenFileCapability), voiceMode: z.literal('silent'),
}).superRefine(checkSourcePaths);
const NarratedHiddenFileRequest = SourcePathsRequestBase.extend({
  schemaVersion: z.literal('explanation-session-request/1.4'), language: z.literal('zh-CN'),
  capabilityProfile: z.literal(HiddenFileCapability), voiceMode: z.literal('windows-winrt-huihui'),
}).superRefine(checkSourcePaths);
export const Request = z.discriminatedUnion('schemaVersion',
  [SilentRequest, NarratedRequest, SourcePathsRequest, HiddenFileRequest, NarratedHiddenFileRequest]);
const Citation = z.strictObject({sourceId: z.string().regex(/^source-[1-8]$/), sourceSha256: Hash,
  startLine: z.number().int().min(1).max(200_001), endLine: z.number().int().min(1).max(200_001), quote: boundedText(8_000)});
const Reason = z.strictObject({detail: boundedText(1_000), citations: z.array(Citation).min(1).max(4)});
const SubmissionBase = z.strictObject({schemaVersion: z.literal('explanation-session-author/1.0'),
  sessionTaskId: Hash, snapshotHash: Hash, authoringRequestId: Hash, language: Language, authorship: z.literal('session-agent')});
export const Submission = z.discriminatedUnion('disposition', [
  SubmissionBase.extend({disposition: z.literal('proposal'), proposal: StoryProposal}),
  SubmissionBase.extend({disposition: z.literal('unsupported'), proposal: StoryProposal,
    reason: Reason.extend({code: z.enum(['unsupported-mechanism', 'unsupported-operations'])})}),
  SubmissionBase.extend({disposition: z.literal('needs-evidence'),
    reason: Reason.extend({code: z.literal('insufficient-pinned-evidence')})}),
]);
const HiddenFileSubmissionBase = SubmissionBase.extend({schemaVersion: z.literal('explanation-session-author/1.1'),
  capabilityProfile: z.literal(HiddenFileCapability)});
export const HiddenFileSubmission = z.discriminatedUnion('disposition', [
  HiddenFileSubmissionBase.extend({disposition: z.literal('proposal'), proposal: HiddenFileStoryProposal}),
  HiddenFileSubmissionBase.extend({disposition: z.literal('unsupported'), proposal: HiddenFileStoryProposal,
    reason: Reason.extend({code: z.literal('unsupported-operations')})}),
  HiddenFileSubmissionBase.extend({disposition: z.literal('needs-evidence'),
    reason: Reason.extend({code: z.literal('insufficient-pinned-evidence')})}),
]);
export const SessionSubmission = z.union([Submission, HiddenFileSubmission]);
const Protocol = z.strictObject({profile: z.literal('explanation-session/1.0')});
export const ExplanationAuthorPacketProfile = 'explanation-author-packet/1.0';
export const NarratedAuthorPacketProfile = 'explanation-author-packet/1.1';
export const LocalizedNarratedAuthorPacketProfile = 'explanation-author-packet/1.2';
export const SourcePathsAuthorPacketProfile = 'explanation-author-packet/1.3';
export const HiddenFileAuthorPacketProfile = 'explanation-author-packet/1.4';
export const NarratedHiddenFileAuthorPacketProfile = 'explanation-author-packet/1.5';
export const SourceCaptureProfile = 'github-pinned-git-blob/1.0';
export const NarratedProfile = 'explanation-session-huihui/1.0';
export const StartInput = z.union([
  Protocol.extend({request: SilentRequest, packetProfile: z.literal(ExplanationAuthorPacketProfile).optional()}),
  Protocol.extend({request: NarratedRequest, packetProfile: z.enum([NarratedAuthorPacketProfile, LocalizedNarratedAuthorPacketProfile])}),
  Protocol.extend({request: SourcePathsRequest, packetProfile: z.literal(SourcePathsAuthorPacketProfile),
    sourceCaptureProfile: z.literal(SourceCaptureProfile)}),
  Protocol.extend({request: HiddenFileRequest, packetProfile: z.literal(HiddenFileAuthorPacketProfile),
    sourceCaptureProfile: z.literal(SourceCaptureProfile)}),
  Protocol.extend({request: NarratedHiddenFileRequest, packetProfile: z.literal(NarratedHiddenFileAuthorPacketProfile),
    sourceCaptureProfile: z.literal(SourceCaptureProfile)}),
]);
export const AuthorInput = Protocol.extend({submission: SessionSubmission});
const renderFields = {authorTaskId: Hash, plan: HistoricalPresentationPlan, planTaskId: Hash,
  planManifestSha256: Hash, rendererEnvironment: z.record(z.string(), z.string())};
export const RenderInput = z.union([Protocol.extend(renderFields),
  Protocol.extend({...renderFields, plan: HiddenFilePlan, capabilityProfile: z.literal(HiddenFileCapability)})]);
export const VoicePrepareInput = z.strictObject({profile: z.literal(NarratedProfile), authorTaskId: Hash,
  authorManifestSha256: Hash, generationTaskIds: z.array(Hash).min(1).max(20), decoder: z.record(z.string(), z.string())});
export const NarratedRenderSpec = z.strictObject({schemaVersion: z.literal('explanation-narrated-render/1.0'),
  voicePreparationManifestSha256: Hash, plan: HistoricalPresentationPlan,
  offsets: z.array(z.strictObject({beatId: Id, startOffsetFrames: z.number().int().min(0).max(PRESENTATION_MAX_FRAMES - 1),
    captions: z.array(AuthoredCaption).min(1).max(40).optional()})).min(1).max(20)});
export const HiddenNarratedRenderSpec = NarratedRenderSpec.extend({
  schemaVersion: z.literal('explanation-narrated-render/1.1'), plan: HiddenFilePlan,
});
const HistoricalNarratedRenderInput = z.strictObject({...renderFields, profile: z.literal(NarratedProfile),
  voicePreparationTaskId: Hash, voicePreparationManifestSha256: Hash, voiceTaskId: Hash, offsets: NarratedRenderSpec.shape.offsets,
  visualLocaleProfile: z.literal(ZH_VISUAL_PROFILE).optional()});
export const NarratedRenderInput = z.union([HistoricalNarratedRenderInput, HistoricalNarratedRenderInput.extend({
  plan: HiddenFilePlan, visualLocaleProfile: z.literal(ZH_VISUAL_PROFILE),
})]);
export const StartReceipt = z.strictObject({binding: AuthoringBinding, authoringRequestId: Hash, packetSha256: Hash,
  snapshot: ArtifactSchema});
export const AuthorReceipt = z.strictObject({startManifestSha256: Hash, proposalHash: Hash.nullable()});
export const RenderReceipt = z.strictObject({authorManifestSha256: Hash, previewTaskId: Hash, previewManifestSha256: Hash});
export const VoicePrepareReceipt = z.strictObject({clips: z.array(z.strictObject({beatId: Id, generationTaskId: Hash,
  generationManifestSha256: Hash, receiptFingerprint: Hash, receiptSha256: Hash, sourceAudioSha256: Hash,
  sourceSamples: z.number().int().positive().max(480_000), decodedSamples: z.number().int().positive().max(1_440_000)})).min(1).max(20)});
export const NarratedRenderReceipt = RenderReceipt.extend({voiceManifestSha256: Hash});
export type StartInput = z.infer<typeof StartInput>;
export type AuthorInput = z.infer<typeof AuthorInput>;
export type RenderInput = z.infer<typeof RenderInput>;
export type VoicePrepareInput = z.infer<typeof VoicePrepareInput>;
export type NarratedRenderInput = z.infer<typeof NarratedRenderInput>;
export type NarratedRenderSpec = z.infer<typeof NarratedRenderSpec>;
export type Submission = z.infer<typeof Submission>;
export type SessionSubmission = z.infer<typeof SessionSubmission>;
const RevisionPresentation = z.union([
  z.strictObject({mode: z.literal('silent'), plan: PresentationPlan}),
  z.strictObject({mode: z.literal('narrated'), spec: z.union([NarratedRenderSpec, HiddenNarratedRenderSpec])}),
]);
const revisionFields = {
  schemaVersion: z.literal('explanation-revision/1.0'),
  expectedBaseManifestSha256: Hash,
  reason: boundedText(500),
  presentation: RevisionPresentation,
};
export const RevisionSpec = z.discriminatedUnion('kind', [
  z.strictObject({...revisionFields, kind: z.literal('presentation')}),
  z.strictObject({...revisionFields, kind: z.literal('manuscript'), authorTaskId: Hash, voicePreparationTaskId: Hash.optional()}),
]);
const LegacyRevisionInput = z.strictObject({baseTaskId: Hash, edit: RevisionSpec});
export const PreparedRevisionInput = LegacyRevisionInput.extend({
  profile: z.literal('explanation-revision-task/1.1'),
  childRender: z.union([RenderInput, NarratedRenderInput]),
});
export const RevisionInput = z.union([LegacyRevisionInput, PreparedRevisionInput]);
export const RevisionReceipt = z.strictObject({
  baseManifestSha256: Hash, childTaskId: Hash, childManifestSha256: Hash,
});
export type RevisionInput = z.infer<typeof RevisionInput>;
export type PreparedRevisionInput = z.infer<typeof PreparedRevisionInput>;
