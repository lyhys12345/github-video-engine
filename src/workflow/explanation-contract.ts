import {z} from 'zod';
import {AuthoringBinding, StoryProposal} from '../contracts/authoring.js';
import {PresentationPlan} from '../contracts/presentation.js';
import {RepositoryUrl} from '../contracts/planning.js';
import {Hash} from '../contracts/video.js';
import {ArtifactSchema} from '../contracts/runtime.js';

const boundedText = (max: number) => z.string().min(1).max(max).regex(/\S/u);
const Language = z.enum(['en-US', 'zh-CN']);
const Document = z.string().max(160).regex(/^[A-Za-z0-9_.\/-]+\.(md|txt)$/i)
  .refine(path => !path.split('/').some(part => !part || part === '.' || part === '..'));
export const Request = z.strictObject({
  schemaVersion: z.literal('explanation-session-request/1.0'),
  repository: z.string().transform(url => url.replace(/\/$/, '').replace(/\.git$/, '')).pipe(RepositoryUrl)
    .transform(url => url.toLowerCase()),
  ref: z.string().regex(/^[A-Za-z0-9_./-]{1,160}$/).refine(ref => !ref.includes('..')).default('HEAD'),
  documents: z.array(Document).max(6).refine(paths => new Set(paths).size === paths.length).default([]),
  audience: boundedText(500), language: Language, maxSeconds: z.number().int().min(1).max(300),
  voiceMode: z.literal('silent'),
});
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
export const StartInput = Protocol.extend({request: Request, packetProfile: z.literal(ExplanationAuthorPacketProfile).optional()});
export const AuthorInput = Protocol.extend({submission: Submission});
export const RenderInput = Protocol.extend({authorTaskId: Hash, plan: PresentationPlan, planTaskId: Hash,
  planManifestSha256: Hash, rendererEnvironment: z.record(z.string(), z.string())});
export const StartReceipt = z.strictObject({binding: AuthoringBinding, authoringRequestId: Hash, packetSha256: Hash,
  snapshot: ArtifactSchema});
export const AuthorReceipt = z.strictObject({startManifestSha256: Hash, proposalHash: Hash.nullable()});
export const RenderReceipt = z.strictObject({authorManifestSha256: Hash, previewTaskId: Hash, previewManifestSha256: Hash});
export type StartInput = z.infer<typeof StartInput>;
export type AuthorInput = z.infer<typeof AuthorInput>;
export type RenderInput = z.infer<typeof RenderInput>;
export type Submission = z.infer<typeof Submission>;
