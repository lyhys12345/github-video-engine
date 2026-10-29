import {z} from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
export const Id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
export const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export const ProjectSchema = z.object({
  schemaVersion: z.literal('1.0'), id: Id, name: text(80),
  repository: z.string().regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  revision: text(80), evidence: z.literal('synthetic-demo'),
}).strict();
export const SceneSpecSchema = z.object({
  schemaVersion: z.literal('1.0'), id: Id,
  durationFrames: z.number().int().min(48).max(450),
  layout: z.enum(['title', 'architecture', 'closing']),
  elements: z.array(z.object({role: z.enum(['eyebrow', 'title', 'body', 'label']), text: text(150)}).strict()).min(1).max(4),
  animation: z.object({preset: z.literal('fade-slide'), entranceFrames: z.number().int().min(1).max(45)}).strict(),
  assetIds: z.array(Id).max(4),
}).strict().superRefine((scene, ctx) => {
  if (new Set(scene.elements.map((e) => e.role)).size !== scene.elements.length) ctx.addIssue({code: 'custom', message: 'Element roles must be unique'});
  if (!scene.elements.some((e) => e.role === 'title')) ctx.addIssue({code: 'custom', message: 'A title element is required'});
  for (const e of scene.elements) if (e.role !== 'body' && e.text.length > 60) ctx.addIssue({code: 'custom', message: 'Non-body text is limited to 60 characters'});
  const title = scene.elements.find((e) => e.role === 'title');
  if (title && title.text.split(/\r?\n/).length > 4) ctx.addIssue({code: 'custom', path: ['elements'], message: 'Title supports at most four explicit lines to remain legible in the fixed M0 template'});
  for (const e of scene.elements) {
    if (e.role !== 'title' && /[\r\n]/.test(e.text)) ctx.addIssue({code: 'custom', path: ['elements'], message: `${e.role} supports one paragraph; automatic line wrapping is provided by the fixed M0 template`});
    if (e.role === 'eyebrow' && e.text.length > 24) ctx.addIssue({code: 'custom', path: ['elements'], message: 'Eyebrow is limited to 24 characters in the fixed M0 template'});
    if (e.role === 'label' && e.text.length > 40) ctx.addIssue({code: 'custom', path: ['elements'], message: 'Label is limited to 40 characters in the fixed M0 template'});
  }
  if (scene.animation.entranceFrames >= scene.durationFrames) ctx.addIssue({code: 'custom', message: 'Entrance must fit within the scene'});
});
export const VideoSpecSchema = z.object({
  schemaVersion: z.literal('1.0'), project: ProjectSchema,
  video: z.object({
    width: z.number().int().min(320).max(1920).multipleOf(2),
    height: z.number().int().min(320).max(1920).multipleOf(2),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30)]),
  }).strict(),
  style: z.object({background: color, foreground: color, accent: color}).strict(),
  scenes: z.array(SceneSpecSchema).min(1).max(6),
  assets: z.array(z.object({id: Id, path: text(240), sha256: Hash, mediaType: z.literal('image/png')}).strict()).max(8),
  audio: z.object({mode: z.literal('silent'), references: z.array(z.string()).max(0)}).strict(),
  evidenceReferences: z.array(z.object({id: Id, uri: z.string().url(), note: text(200)}).strict()).max(20),
}).strict().superRefine((spec, ctx) => {
  const duration = totalFrames(spec) / spec.video.fps;
  if (duration < 10 || duration > 15) ctx.addIssue({code: 'custom', path: ['scenes'], message: 'M0 duration must be 10–15 seconds'});
  if (new Set(spec.scenes.map((s) => s.id)).size !== spec.scenes.length) ctx.addIssue({code: 'custom', path: ['scenes'], message: 'Scene IDs must be unique'});
  if (new Set(spec.assets.map((a) => a.id)).size !== spec.assets.length) ctx.addIssue({code: 'custom', path: ['assets'], message: 'Asset IDs must be unique'});
  for (const scene of spec.scenes) for (const id of scene.assetIds) if (!spec.assets.some((a) => a.id === id)) ctx.addIssue({code: 'custom', path: ['scenes'], message: `Unknown asset: ${id}`});
});
export type VideoSpec = z.infer<typeof VideoSpecSchema>;
export type SceneSpec = z.infer<typeof SceneSpecSchema>;
export const totalFrames = (spec: {scenes: {durationFrames: number}[]}) => spec.scenes.reduce((n, s) => n + s.durationFrames, 0);
export function parseSpec(value: unknown): VideoSpec { return VideoSpecSchema.parse(value); }
