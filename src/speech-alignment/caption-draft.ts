import {z} from 'zod';
import {EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {Seconds, SpeechAlignmentRequest} from './contracts.js';

const Hash = z.string().regex(/^[0-9a-f]{64}$/);
const VideoClock = z.strictObject({
  audioSha256: Hash, audioStartFrame: z.number().int().nonnegative().max(100_000_000), fps: z.number().min(1).max(240),
});
export const SpeechCaptionDraftInput = z.strictObject({
  schemaVersion: z.literal('speech-caption-draft-input/1.0'), reportPath: z.string().min(1), reportSha256: Hash, clock: VideoClock,
});
const Report = z.object({
  schemaVersion: z.literal('speech-alignment-report/1.0'),
  status: z.enum(['AUDIO_DIAGNOSTICS_ONLY', 'PROPOSED_UNREVIEWED']),
  renderable: z.literal(false),
  review: z.strictObject({speechContent: z.literal('UNVERIFIED'), timing: z.literal('UNVERIFIED'),
    naturalness: z.literal('UNVERIFIED'), ownerAcceptance: z.literal('pending')}),
  binding: z.object({requestSha256: Hash, transcriptSha256: Hash,
    audio: z.object({sha256: Hash, bytes: z.number().int().min(44)}), locale: z.string(), approval: z.record(z.string(), z.unknown())}),
  adapter: z.object({kind: z.enum(['unavailable', 'imported-local', 'windows-desktop-speech'])}).passthrough(),
  audio: z.object({durationSeconds: Seconds}),
  settings: z.object({minimumConfidence: z.number().positive().max(1)}),
  phrases: z.array(z.object({id: z.string(), text: z.string(), timing: z.strictObject({
    startSeconds: Seconds, endSeconds: Seconds, confidence: z.number().min(0).max(1).nullable(),
  }).nullable()})).min(1).max(200),
});
type AlignmentReport = z.infer<typeof Report>;
type AuthoredPhrase = {id: string; text: string};
type VideoClock = z.infer<typeof VideoClock>;

/** Translate measured phrase intervals to a review draft without changing the authored captions. */
export function buildSpeechCaptionTimingDraft(report: AlignmentReport, authoredPhrases: AuthoredPhrase[], clock: VideoClock, reportSha256 = sha256(canonical(report))) {
  const {audioSha256, audioStartFrame, fps} = clock;
  const authored = authoredPhrases.map(({id, text}) => ({id, text}));
  const reported = report.phrases.map(({id, text}) => ({id, text}));
  if (audioSha256 !== report.binding.audio.sha256
    || sha256(authored.map(phrase => phrase.text).join('')) !== report.binding.transcriptSha256
    || canonical(authored) !== canonical(reported)
    || !VideoClock.safeParse(clock).success
    || report.phrases.some(({timing}) => timing && (timing.startSeconds >= timing.endSeconds
      || timing.endSeconds > report.audio.durationSeconds + 0.001 || report.status === 'AUDIO_DIAGNOSTICS_ONLY'))) {
    throw new EngineError('ALIGNMENT_CAPTION_BINDING', 'Caption draft requires the exact approved phrases, matching source audio, and a valid video clock.');
  }
  return {
    schemaVersion: 'speech-caption-timing-draft/1.0' as const,
    renderable: false as const,
    status: 'PROPOSED_UNREVIEWED' as const,
    review: report.review,
    sourceReportSha256: reportSha256,
    binding: report.binding,
    adapter: report.adapter,
    clock,
    cues: report.phrases.map(({id, text, timing}) => {
      const startFrame = timing ? audioStartFrame + Math.round(timing.startSeconds * fps) : null;
      const endFrame = timing ? audioStartFrame + Math.round(timing.endSeconds * fps) : null;
      const distinctFrames = startFrame !== null && endFrame !== null && endFrame > startFrame;
      return {id, text, startFrame: distinctFrames ? startFrame : null, endFrame: distinctFrames ? endFrame : null,
        sourceTiming: timing, confidence: timing?.confidence ?? null,
        reviewRequired: !distinctFrames || timing?.confidence === null
          || (timing?.confidence ?? 0) < report.settings.minimumConfidence};
    }),
  };
}

/** Verify the original request and byte-exact report digest before drafting from a saved report. */
export function draftCaptionTimingFromSavedReport(
  reportBytes: Buffer, expectedSha256: string, rawRequest: unknown, clock: VideoClock,
) {
  if (sha256(reportBytes) !== expectedSha256) {
    throw new EngineError('ALIGNMENT_CAPTION_BINDING', 'The saved alignment report hash differs from the expected hash.');
  }
  const raw: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(reportBytes));
  const report = Report.parse(raw);
  const request = SpeechAlignmentRequest.parse(rawRequest);
  if (report.binding.requestSha256 !== sha256(canonical(request))
    || report.binding.transcriptSha256 !== request.transcriptSha256
    || canonical(report.binding.audio) !== canonical(request.audio)
    || canonical(report.binding.approval) !== canonical(request.approval)
    || report.binding.locale !== request.locale || report.settings.minimumConfidence !== request.settings.minimumConfidence) {
    throw new EngineError('ALIGNMENT_CAPTION_BINDING', 'The saved alignment report does not bind the original request.');
  }
  return buildSpeechCaptionTimingDraft(report, request.phrases, clock, expectedSha256);
}
