import {z} from 'zod';
import {AuthoringBinding, StoryProposal} from './authoring.js';
import {StoryEvidenceGraphSchema} from './evidence-plan.js';
import {StorySchema} from './story.js';
import {Hash, Id} from './video.js';
import {AnimationSchema} from '../story-planner/animation.js';

const graph = StoryEvidenceGraphSchema.shape;
const animation = AnimationSchema.shape.shots.element.shape;
const shot = StorySchema.shape.shots.element.shape;
export const MappingProfile = z.enum(['audience-http-v1', 'audience-rembg-outputs-v1']);
export const ProposalMapping = z.strictObject({
  schemaVersion: z.literal('1.0'), kind: z.literal('session-proposal-mapping'),
  proposalHash: Hash, binding: AuthoringBinding, authoringRequestId: Hash, profile: MappingProfile,
  authorship: StoryProposal.shape.authorship,
  objects: z.array(graph.objects.element.omit({label: true}).extend({entityId: Id})).min(1).max(12),
  actors: z.array(graph.actors.element.omit({label: true}).extend({entityId: Id})).min(1).max(8),
  operations: z.array(graph.operations.element.extend({mechanismId: Id})).min(1).max(5),
  shots: z.array(z.strictObject({
    beatId: Id, beat: shot.beat, visualSeconds: z.number().min(0.5).max(5),
    objects: z.array(animation.objects.element.omit({label: true}).extend({entityId: Id})).length(2),
    actions: z.array(animation.actions.element.pick({target: true, start: true, end: true, claimIds: true}).extend({
      kind: z.enum(['transfer', 'compare']), source: Id,
    })).length(1),
  })).length(3),
});

export const AdaptationMaterial = z.strictObject({proposal: StoryProposal, mapping: ProposalMapping});
export const AdaptationBinding = z.strictObject({
  schemaVersion: z.literal('1.0'), proposalHash: Hash, mappingSha256: Hash, profile: MappingProfile,
});
export type AdaptationMaterial = z.infer<typeof AdaptationMaterial>;
export type AdaptationBinding = z.infer<typeof AdaptationBinding>;
