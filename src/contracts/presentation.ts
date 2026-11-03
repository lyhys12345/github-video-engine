import {z} from 'zod';
import {AuthoringBinding, StoryProposal} from './authoring.js';
import {Hash, Id} from './video.js';

export const PRESENTATION_FPS = 24;
export const PRESENTATION_MAX_FRAMES = PRESENTATION_FPS * 60;
const evidence = z.strictObject({claimId: Id, citationIndex: z.number().int().min(0).max(7)});
const fact = <T extends z.ZodType>(value: T) => z.strictObject({value, evidence});
const roles = <T extends z.ZodRawShape>(value: T) => z.strictObject(value);
const http = z.strictObject({
  id: z.literal('http-exchange/1'), initialState: z.literal('ready'),
  entities: roles({listener: Id, request: Id, handler: Id, response: Id}),
  parameters: z.strictObject({
    port: fact(z.number().int().min(1).max(65535)),
    method: fact(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])),
    path: fact(z.string().regex(/^\/[A-Za-z0-9_./~-]{0,47}$/)),
    body: fact(z.string().min(1).max(80).regex(/^[^\p{C}\p{Zl}\p{Zp}]+$/u)),
  }),
});
const image = z.strictObject({
  id: z.literal('image-output-choice/1'), initialState: z.literal('ready'),
  entities: roles({input: Id, cutout: Id, mask: Id}),
  parameters: z.strictObject({
    cutoutCommand: fact(z.string().min(1).max(72).regex(/^[ -~]+$/)),
    maskCommand: fact(z.string().min(1).max(72).regex(/^[ -~]+$/)),
  }),
  asset: z.strictObject({id: z.literal('paper-bird/1'), sha256: Hash, claimId: Id, basis: z.literal('illustrative')}),
});
export const PresentationEventKind = z.enum([
  'listen', 'request', 'match', 'respond', 'show-input', 'select-cutout', 'show-cutout', 'select-mask', 'show-mask', 'compare',
]);
export const PresentationPlan = z.strictObject({
  schemaVersion: z.literal('1.0'), kind: z.literal('session-presentation-plan'),
  proposalHash: Hash, authoringRequestId: Hash, binding: AuthoringBinding, authorship: StoryProposal.shape.authorship,
  module: z.discriminatedUnion('id', [http, image]),
  beats: z.array(z.strictObject({
    beatId: Id, frames: z.number().int().min(24).max(PRESENTATION_MAX_FRAMES),
    events: z.array(z.strictObject({kind: PresentationEventKind, atFrame: z.number().int().min(0).max(PRESENTATION_MAX_FRAMES - 1),
      claimIds: z.array(Id).min(1).max(20),
    })).max(12),
  })).min(1).max(20),
});
export type PresentationPlan = z.infer<typeof PresentationPlan>;
export type PresentationEventKind = z.infer<typeof PresentationEventKind>;
