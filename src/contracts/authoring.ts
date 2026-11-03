import {z} from 'zod';
import {Hash, Id} from './video.js';
import {RepositoryUrl} from './planning.js';

const text = (max: number) => z.string().min(1).max(max).regex(/\S/);
const ids = z.array(Id).min(1).max(20);
const citation = z.strictObject({
  sourceId: Id,
  sourceSha256: Hash,
  startLine: z.number().int().min(1).max(200_001),
  endLine: z.number().int().min(1).max(200_001),
  quote: text(8_000),
});

export const AuthoringBinding = z.strictObject({
  projectId: Id,
  repository: RepositoryUrl,
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  snapshotHash: Hash,
  evidenceFingerprint: Hash,
});

export const LegacyStoryProposal = z.strictObject({
  schemaVersion: z.literal('1.0'),
  kind: z.literal('session-story-proposal'),
  authoringRequestId: Hash,
  binding: AuthoringBinding,
  authorship: z.strictObject({kind: z.enum(['session-agent', 'human'])}),
  useCase: z.strictObject({
    title: text(200),
    audience: text(500),
    question: text(500),
    scope: text(500),
    exclusions: z.array(text(500)).max(20),
    goalClaimIds: ids,
    inputClaimIds: ids,
    processClaimIds: ids,
    outputClaimIds: ids,
    limitationClaimIds: z.array(Id).max(20),
  }),
  claims: z.array(z.strictObject({
    id: Id,
    statement: text(1_000),
    basis: z.discriminatedUnion('kind', [
      z.strictObject({kind: z.literal('documented')}),
      z.strictObject({kind: z.literal('inference'), reasoning: text(1_000)}),
    ]),
    citations: z.array(citation).min(1).max(8),
  })).min(1).max(60),
  entities: z.array(z.strictObject({id: Id, label: text(200), role: text(500), claimIds: ids})).min(1).max(30),
  mechanisms: z.array(z.strictObject({
    id: Id,
    explanation: text(2_000),
    inputEntityIds: ids,
    outputEntityIds: ids,
    claimIds: ids,
    assumptions: z.array(text(500)).max(20),
    visualIntent: text(2_000),
    adapterCandidate: z.enum(['http', 'image-mask', 'scalar-rule', 'unmapped']),
  })).min(1).max(20),
  beats: z.array(z.strictObject({
    id: Id,
    purpose: text(500),
    narration: text(2_000),
    narrationClaimIds: ids,
    entityIds: ids,
    mechanismIds: ids,
    timingIntent: text(300),
    visual: z.strictObject({
      description: text(2_000),
      depiction: z.enum(['document-excerpt', 'illustrative', 'hypothetical']),
      claimIds: ids,
    }),
  })).min(1).max(20),
  openQuestions: z.array(text(500)).max(30),
});

export const QueueStoryProposal = LegacyStoryProposal.extend({
  schemaVersion: z.literal('1.1'),
  mechanisms: z.array(LegacyStoryProposal.shape.mechanisms.element.extend({
    adapterCandidate: z.literal('concurrency-queue'),
  })).min(1).max(20),
});
export const StoryProposal = z.discriminatedUnion('schemaVersion', [LegacyStoryProposal, QueueStoryProposal]);
export const ProposalAuthorship = LegacyStoryProposal.shape.authorship;

export type AuthoringBinding = z.infer<typeof AuthoringBinding>;
export type StoryProposal = z.infer<typeof StoryProposal>;
