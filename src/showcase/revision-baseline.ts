import {z} from 'zod';
import type {TaskRunner} from '../orchestrator/tasks.js';
import {canonical, sha256} from '../core/util.js';
import {fail, Hash, json, loadShowcase, ShowcaseScript, taskId} from './inputs.js';
import {RevisionBaseline, exactHash} from './revision-plan.js';
import {loadShowcaseRender, loadShowcaseReviews, SHOT_KIND} from './runtime.js';
import {showcaseShotInputs, showcaseTimeline} from './timeline.js';
import {validateWorkspaceSource, workspaceSourceName} from './workspace.js';

const Segment = z.object({
  id: z.string(),
  text: z.string(),
  sourceSha256: Hash,
  sourceSamples: z.number().int().positive().max(7_200_000),
  frames: z.number().int().positive().max(9000),
});

const corrupt = (message: string) => fail(message, 'SHOWCASE_INTEGRITY');

export function pictureInputs(
  manifest: Parameters<typeof showcaseTimeline>[0],
  timeline: ReturnType<typeof showcaseTimeline>,
) {
  return showcaseShotInputs(timeline.props, new Map(manifest.media.map(media => [media.path, media.sha256])), manifest.font.sha256);
}

export async function loadRevisionBaseline(runner: TaskRunner, id: string, signal: AbortSignal, options?: {mode: 'audience-audit'}) {
  const render = await loadShowcaseRender(runner, id, signal);
  const {verification, shotTaskIds} = render.result;
  if (verification.candidateSha256 === null || render.input.options.mode !== 'movie') {
    fail('Showcase revisions require a completed movie checkpoint.', 'SHOWCASE_REVISION');
  }
  const source = await loadShowcase(runner, verification.sourceTaskId, signal);
  const {input, manifest, assets} = source;
  if (input.sourceManifestSha256 !== verification.sourceManifestSha256 ||
      canonical(input.provenance ?? null) !== canonical(verification.provenance ?? null) ||
      !render.files.get('manifest.json')?.equals(Buffer.from(canonical(manifest))) ||
      !render.files.get('approved-script.json')?.equals(assets.get(manifest.script.path)!) ||
      !render.files.get('owner-approval.json')?.equals(assets.get(manifest.approval.path)!)) {
    corrupt('Baseline movie does not bind the exact showcase source and approval.');
  }
  const script = ShowcaseScript.parse(json(assets.get(manifest.script.path)!));
  const timelineBytes = render.files.get('timeline.json')!;
  const saved = z.object({segments: z.array(Segment).max(20)}).parse(json(timelineBytes));
  if (saved.segments.length !== manifest.narration.length) corrupt('Saved baseline timeline has incomplete narration coverage.');
  const measured = saved.segments.map((segment, index) => {
    const line = manifest.narration[index]!;
    if (segment.id !== line.id || segment.sourceSha256 !== line.sha256 || segment.text !== script.lines[index]![1] ||
        segment.frames !== Math.ceil(segment.sourceSamples / 800)) {
      corrupt('Saved baseline timeline differs from the exact narration and audio frame extent.');
    }
    return {frames: segment.frames, samples: segment.sourceSamples};
  });
  const before = showcaseTimeline(manifest, script.lines, measured);
  if (!timelineBytes.equals(Buffer.from(canonical(before.timeline))) ||
      !render.files.get('props.json')?.equals(Buffer.from(canonical(before.props))) ||
      before.timeline.frames !== verification.frames) {
    corrupt('Saved baseline timeline or renderer props differ from the showcase source.');
  }
  const pictures = pictureInputs(manifest, before);
  const fingerprint = render.input.fingerprint;
  const expectedShots = pictures.map(shot => taskId(SHOT_KIND, {...shot, fingerprint}));
  if (canonical(expectedShots) !== canonical(shotTaskIds)) corrupt('Baseline movie shot fingerprints differ from its renderer inputs.');
  const baseline = RevisionBaseline.parse({
    renderTaskId: id,
    sourceTaskId: verification.sourceTaskId,
    candidateSha256: verification.candidateSha256,
    originalManifestSha256: verification.sourceManifestSha256,
    normalizedManifestSha256: verification.manifestSha256,
    scriptSha256: manifest.script.sha256,
    approvalSha256: manifest.approval.sha256,
    pinnedSourceSha256: input.provenance?.sourceSha256 ?? null,
    scriptReviewSha256: input.provenance?.reviewSha256 ?? input.standaloneReviewSha256 ?? null,
  });
  const reviews = options?.mode === 'audience-audit' ? new Map<string, Buffer>() : await loadShowcaseReviews(runner, id, baseline.candidateSha256, signal);
  const pinned = assets.get(workspaceSourceName);
  const pinnedSource = pinned ? validateWorkspaceSource(pinned) : null;
  return {
    baseline, source, script, measured, before, pictures, timelineSha256: sha256(timelineBytes),
    ...(options?.mode === 'audience-audit' ? {candidate: render.files.get('review.mp4')!} : {}), pcmSha256: verification.pcmSha256, fingerprint, fingerprintSha256: exactHash(fingerprint), reviews, pinnedSource,
  };
}
