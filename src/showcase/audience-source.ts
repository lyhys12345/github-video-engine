import {extname, resolve} from 'node:path';
import {checkAbort} from '../core/errors.js';
import {sha256} from '../core/util.js';
import {boundedFile} from '../story-planner/runtime.js';
import type {AudienceAuditRequest} from './audience-contract.js';
import {measureAudienceNarration, probeAudienceVisuals} from './audience-media.js';
import {fail, openShowcase, readShowcaseSpec, validateSource} from './inputs.js';
import {loadRevisionBaseline} from './revision-baseline.js';
import {showcaseTimeline} from './timeline.js';

export const maxCandidateBytes = 256_000_000;

export async function loadAudienceSource(
  source: AudienceAuditRequest['source'], base: string, scratch: string, signal: AbortSignal,
) {
  if (source.kind === 'historical') {
    const path = resolve(base, source.manifest.path);
    const movie = resolve(base, source.candidate.path);
    if (extname(movie).toLowerCase() !== '.mp4') fail('Historical candidate must be an existing MP4.', 'SHOWCASE_MEDIA');
    const {input, assets} = await readShowcaseSpec(path, signal);
    if (input.sourceManifestSha256 !== source.manifest.sha256) fail('Historical manifest SHA-256 differs.', 'SHOWCASE_INTEGRITY');
    const {manifest, script} = validateSource(input, assets);
    const candidate = await boundedFile(movie, maxCandidateBytes);
    if (!candidate.length || sha256(candidate) !== source.candidate.sha256) fail('Candidate SHA-256 differs.', 'SHOWCASE_INTEGRITY');
    const measured = await measureAudienceNarration(manifest, assets, scratch, signal);
    const timeline = showcaseTimeline(manifest, script.lines, measured.lines);
    await probeAudienceVisuals(manifest, assets, scratch, signal);
    return {input, assets, manifest, timeline, candidate, reconstructedPcmSha256: measured.pcmSha256,
      association: {kind: 'historical-declared' as const, timelineOrigin: 'reconstructed-from-original-narration' as const}};
  }

  const runner = await openShowcase(resolve(base, source.data), false, true);
  try {
    const baseline = await loadRevisionBaseline(runner, source.taskId, signal, {mode: 'audience-audit'});
    const {input, manifest, assets} = baseline.source;
    const candidate = baseline.candidate;
    checkAbort(signal);
    if (!candidate || baseline.baseline.candidateSha256 !== source.candidateSha256 || sha256(candidate) !== source.candidateSha256) {
      fail('Checkpoint candidate SHA-256 differs.', 'SHOWCASE_INTEGRITY');
    }
    return {input, manifest, assets, candidate, timeline: baseline.before, reconstructedPcmSha256: null,
      association: {kind: 'durable-checkpoint' as const, taskId: source.taskId, sourceTaskId: baseline.baseline.sourceTaskId,
        timelineOrigin: 'verified-checkpoint' as const, savedEnvironmentSha256: baseline.fingerprintSha256}};
  } finally {
    runner.close();
  }
}

