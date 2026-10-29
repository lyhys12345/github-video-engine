import {z} from 'zod';
import {Hash, VideoSpecSchema} from './video.js';
export const STAGES = ['VALIDATE', 'RESOLVE_ASSETS', 'RENDER', 'VERIFY_MEDIA', 'PUBLISH'] as const;
export const StageSchema = z.enum(STAGES);
export type Stage = z.infer<typeof StageSchema>;
export const ErrorSchema = z.object({code: z.string(), classification: z.enum(['retryable', 'permanent', 'cancelled']), message: z.string()}).strict();
export const ArtifactSchema = z.object({
  schemaVersion: z.literal('1.0'), id: Hash, sha256: Hash, bytes: z.number().int().nonnegative(),
  mediaType: z.string(), storage: z.string(), producingStage: StageSchema, inputFingerprint: Hash,
  createdAt: z.string(), integrity: z.literal('verified'),
}).strict();
export type Artifact = z.infer<typeof ArtifactSchema>;
export const JobSchema = z.object({
  schemaVersion: z.literal('1.0'), id: z.string().uuid(), inputFingerprint: Hash,
  status: z.enum(['queued', 'running', 'failed', 'cancelled', 'succeeded']),
  stage: StageSchema.nullable(), spec: VideoSpecSchema, specDirectory: z.string(), environment: z.record(z.string(), z.string()),
  createdAt: z.string(), updatedAt: z.string(), error: ErrorSchema.nullable(),
  owner: z.string().nullable(), leaseUntil: z.number(), cancelRequested: z.boolean(),
}).strict();
export type Job = z.infer<typeof JobSchema>;
export const JobStepSchema = z.object({
  schemaVersion: z.literal('1.0'), jobId: z.string().uuid(), stage: StageSchema,
  status: z.enum(['running', 'failed', 'cancelled', 'succeeded']), attempt: z.number().int().positive(),
  inputFingerprint: Hash, outputs: z.array(ArtifactSchema), error: ErrorSchema.nullable(),
  startedAt: z.string(), finishedAt: z.string().nullable(), owner: z.string(),
}).strict();
export type JobStep = z.infer<typeof JobStepSchema>;
export const EvaluationResultSchema = z.object({
  schemaVersion: z.literal('1.0'), evaluatorVersion: z.literal('ffprobe-ffmpeg-v1'), artifact: Hash,
  checks: z.array(z.object({name: z.string(), passed: z.boolean(), severity: z.enum(['error', 'warning']), explanation: z.string()}).strict()),
  passed: z.boolean(),
}).strict();
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
