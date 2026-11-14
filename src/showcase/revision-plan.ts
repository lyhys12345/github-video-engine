import {z} from 'zod';
import {canonical, sha256} from '../core/util.js';
import {ShowcaseDraftManifest, validateShowcaseContent} from '../renderer/showcase-reel-contract.js';
import {Hash, fail, showcaseStoryboardSha256, type Manifest} from './inputs.js';

const Beat = ShowcaseDraftManifest.shape.beats.element;
const Narration = ShowcaseDraftManifest.shape.narration.element;
const Id = Beat.shape.id;
const text = (limit: number) => z.string().min(1).max(limit).refine(value => /\S/.test(value));
const reason = text(2000);

export const RevisionBaseline = z.strictObject({
  renderTaskId: Hash,
  sourceTaskId: Hash,
  candidateSha256: Hash,
  originalManifestSha256: Hash,
  normalizedManifestSha256: Hash,
  scriptSha256: Hash,
  approvalSha256: Hash,
  pinnedSourceSha256: Hash.nullable(),
  scriptReviewSha256: Hash.nullable(),
});

export const ShowcaseRevisionPlan = z.strictObject({
  schemaVersion: z.literal('showcase-revision-plan/1.0'),
  baseline: RevisionBaseline,
  feedback: z.strictObject({
    text: text(4000),
    origin: z.enum(['user', 'independent-review', 'session-agent-validation']),
    interpretedBy: z.literal('current-session-agent'),
    interpretation: text(4000),
    videoReviewSha256: Hash.optional(),
  }).refine(feedback => feedback.origin !== 'independent-review' || feedback.videoReviewSha256 !== undefined,
    'Independent review feedback requires its exact video review digest.'),
  scriptShots: z.array(text(1000)).min(1).max(200),
  shots: z.array(z.strictObject({
    beatId: Id,
    shotIndex: z.number().int().min(0).max(9),
    expectedShotSha256: Hash,
    reason,
    replacement: Beat.shape.shots.element,
  })).max(200).optional(),
  captions: z.array(z.strictObject({
    beatId: Id,
    expectedCaptionSha256: Hash,
    reason,
    captionCues: Narration.shape.captionCues.unwrap().nullable(),
  })).max(20).optional(),
  display: z.strictObject({
    expectedDisplaySha256: Hash,
    reason,
    theme: ShowcaseDraftManifest.shape.theme.optional(),
    layout: ShowcaseDraftManifest.shape.layout.unwrap().nullable().optional(),
    cinematic: ShowcaseDraftManifest.shape.cinematic.unwrap().nullable().optional(),
  }).optional(),
});

export type RevisionBaseline = z.infer<typeof RevisionBaseline>;
export type ShowcaseRevisionPlan = z.infer<typeof ShowcaseRevisionPlan>;

export const exactHash = (value: unknown) => sha256(canonical(value));
const revisionError = (message: string) => fail(message, 'SHOWCASE_REVISION');

export function captionBinding(line: Manifest['narration'][number]) {
  return {captionCues: line.captionCues ?? null, captionChunks: line.captionChunks ?? null};
}

export function displayBinding(manifest: Omit<Manifest, 'approval'>) {
  return {theme: manifest.theme, layout: manifest.layout ?? null, cinematic: manifest.cinematic ?? null};
}

export function applyShowcaseRevisionPlan(
  approved: Manifest,
  priorScript: {lines: [string, string][]; sourceBindingSha256?: string},
  plan: ShowcaseRevisionPlan,
) {
  const {approval: _approval, scriptReview: _scriptReview, ...manifest} = structuredClone(approved);
  if (plan.scriptShots.length !== manifest.beats.reduce((count, beat) => count + beat.shots.length, 0)) {
    revisionError('Supply one explicit storyboard description per shot in beat and shot order.');
  }
  const changes = [];
  const beats = new Map(manifest.beats.map(beat => [beat.id, beat]));
  const lines = new Map(manifest.narration.map(line => [line.id, line]));
  const shotSelectors = new Set<string>();
  for (const edit of plan.shots ?? []) {
    const selector = edit.beatId + '/' + edit.shotIndex;
    if (shotSelectors.has(selector)) revisionError('Duplicate shot selector: ' + selector);
    shotSelectors.add(selector);
    const beat = beats.get(edit.beatId);
    const before = beat?.shots[edit.shotIndex];
    if (!beat || !before || exactHash(before) !== edit.expectedShotSha256) {
      return revisionError('Unknown or stale shot selector: ' + selector);
    }
    if (canonical(before) === canonical(edit.replacement)) revisionError('Shot edit is unchanged: ' + selector);
    beat.shots[edit.shotIndex] = edit.replacement;
    changes.push({kind: 'shot', beatId: edit.beatId, shotIndex: edit.shotIndex, reason: edit.reason,
      before, after: edit.replacement} as const);
  }
  const captionSelectors = new Set<string>();
  for (const edit of plan.captions ?? []) {
    if (captionSelectors.has(edit.beatId)) revisionError('Duplicate caption selector: ' + edit.beatId);
    captionSelectors.add(edit.beatId);
    const line = lines.get(edit.beatId);
    if (!line || exactHash(captionBinding(line)) !== edit.expectedCaptionSha256) {
      return revisionError('Unknown or stale caption selector: ' + edit.beatId);
    }
    const before = captionBinding(line);
    if (edit.captionCues === null && before.captionCues === null) revisionError('Caption cues are already absent: ' + edit.beatId);
    delete line.captionChunks;
    if (edit.captionCues === null) delete line.captionCues;
    else line.captionCues = edit.captionCues;
    const after = captionBinding(line);
    if (canonical(before) === canonical(after)) revisionError('Caption edit is unchanged: ' + edit.beatId);
    changes.push({kind: 'captions', beatId: edit.beatId, reason: edit.reason, before, after} as const);
  }
  if (plan.display) {
    const {expectedDisplaySha256, reason, theme, layout, cinematic} = plan.display;
    const before = displayBinding(manifest);
    if (exactHash(before) !== expectedDisplaySha256) revisionError('Stale display settings.');
    if (theme !== undefined) manifest.theme = theme;
    if (layout === null) delete manifest.layout;
    else if (layout !== undefined) manifest.layout = layout;
    if (cinematic === null) delete manifest.cinematic;
    else if (cinematic !== undefined) manifest.cinematic = cinematic;
    const after = displayBinding(manifest);
    if (canonical(before) === canonical(after)) revisionError('Display edit is unchanged.');
    changes.push({kind: 'display', reason, before, after} as const);
  }
  const storyboardSha256 = showcaseStoryboardSha256(manifest);
  if (!changes.length || storyboardSha256 === showcaseStoryboardSha256(approved)) {
    revisionError('Supply an explicit storyboard change.');
  }
  const nextScript = {
    ...(priorScript.sourceBindingSha256 ? {sourceBindingSha256: priorScript.sourceBindingSha256} : {}),
    storyboardSha256,
    lines: priorScript.lines,
    reviewPolicy: 'independent-script-review-required' as const,
    shots: plan.scriptShots,
  };
  const scriptBytes = Buffer.from(canonical(nextScript));
  manifest.script.sha256 = sha256(scriptBytes);
  validateShowcaseContent(manifest, nextScript);
  return {manifest, changes, nextScript, scriptBytes, storyboardSha256};
}
