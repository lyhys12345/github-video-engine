import {createHash} from 'node:crypto';
import {z} from 'zod';
import {Hash, Id} from '../contracts/video.js';
import {EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {FRAME_SAMPLES, MAX_PCM, RATE} from './narration.js';

const MAX_CAPTION_BYTES = 2_000_000;
const Timing = z.enum(['clip-level-measured', 'caller-declared']);
const SourceCue = z.object({beatId: Id, startSample: z.number().int().nonnegative(),
  endSample: z.number().int().positive(), startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(), transcript: z.string()});
const VoiceLedger = z.discriminatedUnion('schemaVersion', [
  z.object({schemaVersion: z.literal('presentation-voice-ledger/1.0'), cues: z.array(SourceCue).max(20)}),
  z.object({schemaVersion: z.literal('presentation-voice-ledger/1.1'), captionTiming: z.literal('caller-declared'),
    captionCues: z.array(SourceCue).max(800)}),
]);
const VoiceRef = z.object({voiceTaskId: Hash, voiceManifestSha256: Hash});
export const SceneNarration = VoiceRef.strict().extend({
  pcmSha256: Hash, startSample: z.number().int().nonnegative(), endSample: z.number().int().positive(),
  captionTiming: Timing,
});
export const SequenceAudioMetadata = z.strictObject({
  sampleFormat: z.literal('s16le-mono'), sampleRate: z.literal(RATE), samples: z.number().int().min(1).max(MAX_PCM / 2),
  pcmSha256: Hash, captionsSha256: Hash, captionLedgerSha256: Hash,
  captionCount: z.number().int().min(1).max(3200), speechAlignment: z.literal('unverified'),
  transcriptVerification: z.literal('caller-declared'), ownerListening: z.literal('pending'),
});
type GlobalCue = z.infer<typeof SourceCue> & {
  id: string; sceneId: string; sourceCueIndex: number; captionTiming: z.infer<typeof Timing>;
  sourceStartSample: number; sourceEndSample: number; sourceStartFrame: number; sourceEndFrame: number;
};
const fail = (message: string): never => {throw new EngineError('PRESENTATION_SEQUENCE_AUDIO', message);};
const milliseconds = (sample: number) => Math.round(sample * 1000 / RATE);
const stamp = (sample: number) => new Date(milliseconds(sample)).toISOString().slice(11, 23);
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Only use after readPresentation has verified the child's preview, voice and plan closures.
export function sequenceAudio(output?: Buffer) {
  const hash = createHash('sha256');
  const captions: GlobalCue[] = [];
  let samples = 0;
  let previousCueEnd = 0;
  function append(sceneId: string, startFrame: number, endFrame: number, files: ReadonlyMap<string, Buffer>) {
    const pcm = files.get('voice/narration.pcm');
    const voiceManifest = files.get('voice/voice-manifest.json');
    const previewManifest = files.get('preview-manifest.json');
    const startSample = startFrame * FRAME_SAMPLES, endSample = endFrame * FRAME_SAMPLES;
    if (!pcm || !voiceManifest || !previewManifest || pcm.length !== (endSample - startSample) * 2 ||
        startSample < samples || endSample * 2 > MAX_PCM || (output && endSample * 2 > output.length)) {
      return fail('Verified child narration is missing or exceeds its frame and sample bounds.');
    }
    const ref = VoiceRef.parse(JSON.parse(previewManifest.toString('utf8')));
    if (sha256(voiceManifest) !== ref.voiceManifestSha256) return fail('Child voice manifest differs.');
    const ledger = VoiceLedger.parse(JSON.parse(voiceManifest.toString('utf8')));
    const authored = ledger.schemaVersion === 'presentation-voice-ledger/1.1';
    const captionTiming = authored ? 'caller-declared' as const : 'clip-level-measured' as const;
    if (samples < startSample) hash.update(Buffer.alloc((startSample - samples) * 2));
    hash.update(pcm);
    if (output) pcm.copy(output, startSample * 2);
    for (const [sourceCueIndex, cue] of (authored ? ledger.captionCues : ledger.cues).entries()) {
      const shiftedStart = startSample + cue.startSample, shiftedEnd = startSample + cue.endSample;
      if (shiftedStart < previousCueEnd || shiftedEnd > endSample || cue.endFrame + startFrame > endFrame ||
          milliseconds(shiftedStart) >= milliseconds(shiftedEnd)) {
        return fail('Child caption cannot be represented within its scene on the global timeline.');
      }
      previousCueEnd = shiftedEnd;
      captions.push({id: sceneId + ':' + (sourceCueIndex + 1), sceneId, sourceCueIndex, captionTiming, beatId: cue.beatId,
        sourceStartSample: cue.startSample, sourceEndSample: cue.endSample, sourceStartFrame: cue.startFrame, sourceEndFrame: cue.endFrame,
        startSample: shiftedStart, endSample: shiftedEnd, startFrame: cue.startFrame + startFrame, endFrame: cue.endFrame + startFrame,
        transcript: cue.transcript});
    }
    samples = endSample;
    return SceneNarration.parse({...ref, pcmSha256: sha256(pcm), startSample, endSample, captionTiming});
  }
  function finish() {
    if (output && output.length !== samples * 2) return fail('Combined PCM must cover the full sequence.');
    const pcmSha256 = hash.digest('hex');
    if (output && sha256(output) !== pcmSha256) return fail('Combined PCM differs from the placed recordings and silence.');
    const vtt = Buffer.from('WEBVTT\n\nNOTE Caller-declared transcripts; child timing provenance is in sequence-caption-ledger.json. Speech alignment unverified.\n\n' +
      captions.map(cue => cue.id + '\n' + stamp(cue.startSample) + ' --> ' + stamp(cue.endSample) + '\n' + escape(cue.transcript) + '\n').join('\n'));
    const captionLedger = Buffer.from(canonical({schemaVersion: 'presentation-sequence-captions/1.0', sampleRate: RATE,
      timingUnit: 'samples', speechAlignment: 'unverified', cues: captions}));
    if (vtt.length > MAX_CAPTION_BYTES || captionLedger.length > MAX_CAPTION_BYTES) return fail('Combined captions exceed their byte budget.');
    const metadata = SequenceAudioMetadata.parse({sampleFormat: 's16le-mono', sampleRate: RATE, samples, pcmSha256,
      captionsSha256: sha256(vtt), captionLedgerSha256: sha256(captionLedger), captionCount: captions.length,
      speechAlignment: 'unverified', transcriptVerification: 'caller-declared', ownerListening: 'pending'});
    return {metadata, vtt, captionLedger};
  }
  return {append, finish};
}
