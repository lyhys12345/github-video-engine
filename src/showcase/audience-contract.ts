import {z} from 'zod';
import {Hash} from './inputs.js';

export const maxAudienceFrames = 16;
const maxClips = 6;
const maxClipFrames = 120;
const Id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,50}$/);
const Frame = z.number().int().min(0).max(8999);
const DisplayCueWindow = z.strictObject({startFrame: Frame, endFrameExclusive: z.number().int().min(0).max(9000)})
  .refine(window => window.endFrameExclusive >= window.startFrame, 'Cue window cannot run backward.');
const FrameWindow = DisplayCueWindow
  .refine(window => window.endFrameExclusive > window.startFrame, 'Frame window needs increasing endpoints.');
const SourceWindow = z.strictObject({startFrame: z.number().int().nonnegative(), endFrameExclusive: z.number().int().positive()})
  .refine(window => window.endFrameExclusive > window.startFrame, 'Source frame window needs increasing endpoints.');
const Path = z.string().min(1).max(1000).refine(path => !path.includes('\0'));
const FileBinding = z.strictObject({path: Path, sha256: Hash});
const Expectation = z.strictObject({
  id: Id,
  beatId: Id,
  shotIndex: z.number().int().min(0).max(9),
  panelIndex: z.number().int().min(0).max(3),
  cue: z.strictObject({index: z.number().int().min(0).max(1199), text: z.string().min(1).max(300)}),
  media: z.strictObject({id: Id, sha256: Hash}),
  sourceWindow: SourceWindow,
  event: z.string().trim().min(1).max(300),
});
export type AudienceExpectation = z.infer<typeof Expectation>;

function unique<T>(values: T[]) {
  return new Set(values).size === values.length;
}

export const AudienceAuditRequest = z.strictObject({
  schemaVersion: z.literal('showcase-audience-audit-request/1.0'),
  source: z.discriminatedUnion('kind', [
    z.strictObject({kind: z.literal('historical'), manifest: FileBinding, candidate: FileBinding}),
    z.strictObject({kind: z.literal('checkpoint'), data: Path, taskId: Hash, candidateSha256: Hash}),
  ]),
  sampleFrames: z.array(Frame).min(1).max(maxAudienceFrames).refine(unique, 'Sample frames must be unique.'),
  clips: z.array(FrameWindow.refine(window => window.endFrameExclusive - window.startFrame <= maxClipFrames))
    .max(maxClips).refine(clips => unique(clips.map(clip => clip.startFrame + ':' + clip.endFrameExclusive)),
      'Clip frame windows must be unique.').default([]),
  expectations: z.array(Expectation).max(100).refine(rows => unique(rows.map(row => row.id)),
    'Expectation IDs must be unique.').default([]),
  speechAlignment: z.array(z.strictObject({lineId: Id, request: FileBinding, report: FileBinding})).max(20)
    .refine(rows => unique(rows.map(row => row.lineId)), 'Use one exact alignment report per line.').default([]),
});
export type AudienceAuditRequest = z.infer<typeof AudienceAuditRequest>;

export const AudienceEvidenceEntry = z.strictObject({
  path: z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.[a-z0-9]+$/),
  bytes: z.number().int().positive(), sha256: Hash,
});
export const AudienceAuditBindings = z.strictObject({
  schemaVersion: z.literal('showcase-audience-audit-bindings/1.0'),
  files: z.array(AudienceEvidenceEntry).min(3)
    .refine(files => unique(files.map(file => file.path)), 'Evidence paths must be unique.'),
});
export const AudienceAuditFileHashes = z.strictObject({
  requestSha256: Hash, originalManifestSha256: Hash, normalizedManifestSha256: Hash,
  candidateSha256: Hash, fontSha256: Hash, scriptSha256: Hash, approvalSha256: Hash,
  scriptReviewSha256: Hash.nullable(), pinnedSourceSha256: Hash.nullable(),
  timelineSha256: Hash, rendererPropsSha256: Hash, reconstructedPcmSha256: Hash.nullable(),
  media: z.array(z.strictObject({id: Id, type: z.enum(['image', 'video']), sha256: Hash})).min(1).max(30),
  narration: z.array(z.strictObject({id: Id, audioSha256: Hash, transcriptSha256: Hash, receiptSha256: Hash})).min(1).max(20),
});

export const AudienceAuditReport = z.strictObject({
  schemaVersion: z.literal('showcase-audience-audit-report/1.0'),
  review: z.strictObject({
    status: z.literal('REVIEW_REQUIRED'),
    candidateVisuals: z.literal('UNVERIFIED'),
    currentPerceptualReadability: z.literal('UNVERIFIED'),
    embeddedMediaText: z.literal('UNASSESSED'),
    visualEventSemantics: z.literal('UNVERIFIED'),
    actualSpeechCorrespondence: z.literal('UNVERIFIED'),
    continuousAudiovisual: z.literal('UNVERIFIED'),
    ownerAcceptance: z.literal('pending'),
  }),
  association: z.discriminatedUnion('kind', [
    z.strictObject({kind: z.literal('historical-declared'), timelineOrigin: z.literal('reconstructed-from-original-narration')}),
    z.strictObject({kind: z.literal('durable-checkpoint'), taskId: Hash, sourceTaskId: Hash,
      timelineOrigin: z.literal('verified-checkpoint'), savedEnvironmentSha256: Hash}),
  ]),
  hashes: AudienceAuditFileHashes,
  provenance: z.strictObject({
    evaluatorSha256: Hash, ffmpegVersion: z.string().min(1), ffprobeVersion: z.string().min(1),
    browserSha256: Hash, rendererEvaluatorSha256: Hash, inspectionContract: z.string().min(1),
  }),
  coverage: z.strictObject({
    totalFrames: z.number().int().min(1).max(9000),
    fps: z.literal(30),
    sampleCoverage: z.literal('selected-frames-only'),
    sampleFrames: z.array(Frame).min(1).max(maxAudienceFrames),
    sampledFrameFraction: z.number().positive().max(1),
    extractedClips: z.array(FrameWindow.extend({path: AudienceEvidenceEntry.shape.path})).max(maxClips),
    originalFrames: z.array(z.strictObject({frame: Frame, path: AudienceEvidenceEntry.shape.path})).min(1).max(maxAudienceFrames),
    currentFrames: z.array(z.strictObject({frame: Frame, screenshot: AudienceEvidenceEntry.shape.path,
      phoneScreenshot: AudienceEvidenceEntry.shape.path})).min(1).max(maxAudienceFrames),
  }),
  inspection: z.strictObject({
    reportPath: AudienceEvidenceEntry.shape.path,
    contactSheet: AudienceEvidenceEntry.shape.path,
    findings: z.array(z.strictObject({
      frame: Frame, code: z.enum(['small-phone-text', 'text-overflow', 'text-clipping-risk', 'text-occlusion-risk', 'panel-occlusion-risk']),
      severity: z.literal('warning'), classification: z.enum(['size-risk', 'geometric-risk']),
      elementId: z.string(), otherElementId: z.string().optional(),
      overlapFraction: z.number().nonnegative().max(1).optional(), phoneFontSizePx: z.number().nonnegative().optional(),
    })),
  }),
  correspondence: z.strictObject({
    expectations: z.array(z.strictObject({
      expectation: Expectation, captionClock: z.enum(['authored-caption-cues', 'estimated-caption-display']),
      cueWindow: DisplayCueWindow, visibleSourceWindowMatches: z.array(FrameWindow),
      captionSourceOverlap: z.array(FrameWindow), status: z.enum(['OVERLAP', 'NO_OVERLAP']),
      speech: z.strictObject({
        status: z.enum(['UNVERIFIED', 'TIMING_EVIDENCE_OVERLAP', 'TIMING_EVIDENCE_NO_OVERLAP']),
        reason: z.string(), method: z.enum(['recognition', 'forced-alignment']).nullable(),
        phraseIds: z.array(z.string()), intervalSeconds: z.tuple([z.number(), z.number()]).nullable(),
        confidences: z.array(z.number().min(0).max(1).nullable()),
        overlaps: z.array(FrameWindow),
      }),
    })).max(100),
    unboundCues: z.array(z.strictObject({beatId: Id, cue: z.strictObject({index: z.number().int().nonnegative(),
      text: z.string().min(1), window: DisplayCueWindow}), status: z.literal('UNASSESSED')})),
    unboundPanels: z.array(z.strictObject({beatId: Id, shotIndex: z.number().int().nonnegative(),
      panelIndex: z.number().int().nonnegative(), mediaId: Id})),
    unboundActions: z.array(z.strictObject({beatId: Id, shotIndex: z.number().int().nonnegative(),
      cueIndex: z.number().int().nonnegative(), sourceFrame: z.number().int().nonnegative()})),
    speechInputs: z.array(z.strictObject({
      lineId: Id, requestSha256: Hash, reportSha256: Hash, requestPath: AudienceEvidenceEntry.shape.path,
      reportPath: AudienceEvidenceEntry.shape.path, status: z.enum(['AUDIO_DIAGNOSTICS_ONLY', 'PROPOSED_UNREVIEWED']),
      adapter: z.record(z.string(), z.unknown()),
    })).max(20),
  }),
  scope: z.array(z.string().min(1)).min(1),
});

