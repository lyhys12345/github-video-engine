import {z} from 'zod';
import {Id} from './video.js';

export const HiddenFileCapability = 'hidden-file-policy/1.0';
export const HiddenFileModuleId = 'hidden-file-policy/1';
export const HiddenFileRule = z.strictObject({claimId: Id, citationIndex: z.number().int().min(0).max(7)});
export const HiddenFileRules = z.strictObject({default: HiddenFileRule, includeHidden: HiddenFileRule});

const NodeName = z.string().regex(/^[.A-Za-z0-9_-]{1,22}$/).refine(name => !['.', '..', '.git'].includes(name.toLowerCase()));
export const HiddenFileModule = z.strictObject({
  id: z.literal(HiddenFileModuleId),
  initialState: z.literal('ready'),
  language: z.enum(['en-US', 'zh-CN']),
  mechanismId: Id,
  scenario: z.strictObject({
    basis: z.literal('synthetic'),
    entries: z.array(z.strictObject({
      id: Id, parentId: Id.nullable(), kind: z.enum(['directory', 'file']), name: NodeName,
    })).min(3).max(8),
  }),
});

export const HiddenFileEvent = z.strictObject({
  kind: z.literal('evaluate-policy'),
  mode: z.enum(['default', 'include-hidden']),
  atFrame: z.number().int().nonnegative(),
  motionFrames: z.number().int().min(36).max(96),
  claimIds: z.array(Id).min(1).max(20),
});
