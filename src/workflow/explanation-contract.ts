import {z} from 'zod';
import {AuthoringBinding, StoryProposal} from '../contracts/authoring.js';
import {PresentationPlan} from '../contracts/presentation.js';
import {RepositoryUrl} from '../contracts/planning.js';
import {Hash, Id} from '../contracts/video.js';
import {ArtifactSchema} from '../contracts/runtime.js';
import {PRESENTATION_MAX_FRAMES} from '../contracts/presentation.js';
import {AuthoredCaption} from '../presentation/narration.js';
import {ZH_VISUAL_PROFILE} from '../presentation/visual-locale.js';

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
export const Request = z.discriminatedUnion('schemaVersion', [SilentRequest, NarratedRequest]);
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
const Protocol = z.strictObject({profile: z.literal('explanation-session/1.0')});
export const ExplanationAuthorPacketProfile = 'explanation-author-packet/1.0';
export const NarratedAuthorPacketProfile = 'explanation-author-packet/1.1';
export const LocalizedNarratedAuthorPacketProfile = 'explanation-author-packet/1.2';
export const NarratedProfile = 'explanation-session-huihui/1.0';
export const StartInput = z.union([
  Protocol.extend({request: SilentRequest, packetProfile: z.literal(ExplanationAuthorPacketProfile).optional()}),
  Protocol.extend({request: NarratedRequest, packetProfile: z.enum([NarratedAuthorPacketProfile, LocalizedNarratedAuthorPacketProfile])}),
]);
export const AuthorInput = Protocol.extend({submission: Submission});
const renderFields = {authorTaskId: Hash, plan: PresentationPlan, planTaskId: Hash,
  planManifestSha256: Hash, rendererEnvironment: z.record(z.string(), z.string())};
export const RenderInput = Protocol.extend(renderFields);
export const VoicePrepareInput = z.strictObject({profile: z.literal(NarratedProfile), authorTaskId: Hash,
  authorManifestSha256: Hash, generationTaskIds: z.array(Hash).min(1).max(20), decoder: z.record(z.string(), z.string())});
export const NarratedRenderSpec = z.strictObject({schemaVersion: z.literal('explanation-narrated-render/1.0'),
  voicePreparationManifestSha256: Hash, plan: PresentationPlan,
  offsets: z.array(z.strictObject({beatId: Id, startOffsetFrames: z.number().int().min(0).max(PRESENTATION_MAX_FRAMES - 1),
    captions: z.array(AuthoredCaption).min(1).max(40).optional()})).min(1).max(20)});
export const NarratedRenderInput = z.strictObject({...renderFields, profile: z.literal(NarratedProfile),
  voicePreparationTaskId: Hash, voicePreparationManifestSha256: Hash, voiceTaskId: Hash, offsets: NarratedRenderSpec.shape.offsets,
  visualLocaleProfile: z.literal(ZH_VISUAL_PROFILE).optional()});
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
