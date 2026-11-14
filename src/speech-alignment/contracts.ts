import {z} from 'zod';

const Hash = z.string().regex(/^[0-9a-f]{64}$/);
export const Seconds = z.number().nonnegative().max(300);
const Id = z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const Label = z.string().trim().min(1).max(200);
const SpeechText = z.string().min(1).max(4_000).refine(text => /\S/u.test(text) && !/[\uD800-\uDFFF]/u.test(text));
const Locale = z.string().max(35).refine(value => {
  try { return Intl.getCanonicalLocales(value).length === 1; }
  catch { return false; }
});
const textBinding = {transcript: SpeechText, transcriptSha256: Hash};

const Pause = z.strictObject({id: Id, startSeconds: Seconds, endSeconds: Seconds, reason: Label})
  .refine(pause => pause.startSeconds < pause.endSeconds, 'Intentional pause must have positive duration');
const Anchor = z.strictObject({
  id: Id,
  target: z.discriminatedUnion('kind', [
    z.strictObject({kind: z.literal('phrase'), phraseId: Id}),
    z.strictObject({kind: z.literal('word'), wordIndex: z.number().int().nonnegative().max(3_999)}),
  ]),
  expectedSeconds: Seconds,
  edge: z.enum(['start', 'end']).default('start'),
  toleranceSeconds: z.number().positive().max(5).default(0.25),
});

export const SpeechAlignmentRequest = z.strictObject({
  schemaVersion: z.literal('speech-alignment-request/1.0'),
  locale: Locale,
  ...textBinding,
  audio: z.strictObject({sha256: Hash, bytes: z.number().int().min(44).max(128_000_000)}),
  approval: z.discriminatedUnion('kind', [
    z.strictObject({kind: z.literal('transcript-approval'), sha256: Hash}),
    z.strictObject({kind: z.literal('showcase-script-approval'), sha256: Hash, scriptSha256: Hash, lineId: Id}),
  ]),
  phrases: z.array(z.strictObject({id: Id, text: SpeechText})).min(1).max(200),
  intentionalPauses: z.array(Pause).max(200).default([]),
  actionAnchors: z.array(Anchor).max(200).default([]),
  settings: z.strictObject({
    silenceThresholdDbfs: z.number().min(-90).max(-15).default(-45),
    minimumSilenceSeconds: z.number().min(0.15).max(10).default(0.2),
    longPauseSeconds: z.number().min(0.15).max(30).default(0.6),
    minimumConfidence: z.number().positive().max(1).default(0.65),
  }).prefault({}),
});
export type SpeechAlignmentRequest = z.infer<typeof SpeechAlignmentRequest>;

export const TranscriptApproval = z.strictObject({
  schemaVersion: z.literal('speech-transcript-approval/1.0'),
  status: z.literal('approved'),
  ...textBinding,
  authority: z.string().trim().min(1).max(1_000),
});
export const ShowcaseApproval = z.object({
  schemaVersion: z.literal('script-owner-authorization/1.0'),
  scriptSha256: Hash,
  authority: z.string().trim().min(1).max(1_000),
});
export const ShowcaseScript = z.object({lines: z.array(z.tuple([Id, SpeechText])).min(1).max(200)});

const Confidence = z.number().min(0).max(1).nullable();
export const TimingWord = z.strictObject({
  text: z.string().min(1).max(200),
  confidence: Confidence,
  startSeconds: Seconds.nullable(),
  endSeconds: Seconds.nullable(),
}).refine(word => word.startSeconds === null
  ? word.endSeconds === null
  : word.endSeconds !== null && word.endSeconds > word.startSeconds,
'Word timing needs two increasing endpoints or two null endpoints');

export const TimingPhrase = z.strictObject({
  text: SpeechText, confidence: Confidence, startSeconds: Seconds, endSeconds: Seconds,
  rejected: z.boolean().default(false),
  words: z.array(TimingWord).max(4_000),
}).refine(phrase => phrase.endSeconds > phrase.startSeconds, 'Phrase timing must have positive duration');
export type TimingPhrase = z.infer<typeof TimingPhrase>;

export const ImportedSpeechTimings = z.strictObject({
  schemaVersion: z.literal('speech-timing-evidence/1.0'),
  transcriptSha256: Hash,
  audioSha256: Hash,
  locale: Locale,
  provider: Label,
  providerVersion: Label,
  model: Label,
  method: z.enum(['recognition', 'forced-alignment']),
  confidenceMeaning: Label,
  phrases: z.array(TimingPhrase).max(500),
});
