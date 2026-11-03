import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {Hash, Id} from '../contracts/video.js';
import {PRESENTATION_FPS, PRESENTATION_MAX_FRAMES} from '../contracts/presentation.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import {ffmpegPath, ffprobePath} from '../providers/local.js';
import {boundedFile} from '../story-planner/runtime.js';
import {readLocalTts} from '../tts/runtime.js';
import type {CompiledPresentation} from './compile.js';

export const RATE = 48_000;
export const FRAME_SAMPLES = RATE / PRESENTATION_FPS;
export const MAX_PCM = PRESENTATION_MAX_FRAMES * FRAME_SAMPLES * 2;
export const VOICE_KIND = 'repository-presentation-voice-v1';
export const NARRATED_KIND = 'repository-presentation-narrated-preview-v1';
export const voiceReview = {voice: 'local-import', transcriptVerification: 'caller-declared',
  speechContentReview: 'unverified', voiceSimilarityReview: 'unverified', ownerListening: 'pending',
  alignment: 'clip-level-measured; speech alignment unverified', semanticReview: 'pending',
  editorialReview: 'pending', audiovisualReview: 'pending', ownerAcceptance: 'pending'} as const;

export const VoiceSpec = z.strictObject({schemaVersion: z.literal('presentation-voice-bindings/1.0'),
  planTaskId: Hash, planManifestSha256: Hash, proposalHash: Hash, playbackRate: z.literal(1),
  voicePolicy: z.enum(['caller-declared-local-import', 'windows-sapi-zira-technical-fixture']),
  clips: z.array(z.strictObject({beatId: Id, receiptFingerprint: Hash, receiptSha256: Hash, sourceAudioSha256: Hash,
    transcript: z.string().min(1).max(120), transcriptSha256: Hash,
    startOffsetFrames: z.number().int().min(0).max(PRESENTATION_MAX_FRAMES - 1)})).min(1).max(20)});
export type VoiceSpec = z.infer<typeof VoiceSpec>;
type Clip = VoiceSpec['clips'][number];
type Beat = CompiledPresentation['beats'][number];
type LocalAudio = Awaited<ReturnType<typeof readLocalTts>>;

const voiceError = (code: string, message: string): never => {throw new EngineError(code, message);};

export function matchVoice(plan: CompiledPresentation, spec: VoiceSpec) {
  if (plan.proposalHash !== spec.proposalHash) voiceError('VOICE_PARENT', 'Voice proposal hash differs.');
  const clips = new Map(spec.clips.map(clip => [clip.beatId, clip]));
  if (clips.size !== spec.clips.length || clips.size !== plan.beats.length ||
      plan.beats.some(beat => !clips.has(beat.id))) voiceError('VOICE_COVERAGE', 'Supply exactly one recording per beat.');
  return plan.beats.map(beat => {
    const clip = clips.get(beat.id)!;
    if (clip.transcript !== beat.narration || sha256(clip.transcript) !== clip.transcriptSha256) {
      voiceError('VOICE_TRANSCRIPT', 'Exact narration and transcript hash differ for ' + beat.id);
    }
    if (/[\r\n\p{C}]/u.test(clip.transcript) || !clip.transcript.trim() ||
        [...clip.transcript].reduce((sum, character) => sum + (character.codePointAt(0)! > 127 ? 2 : 1), 0) > 100) {
      voiceError('VOICE_CAPTION_LIMIT', 'Use a shorter single-line transcript and matching recording for ' + beat.id);
    }
    return {beat, clip};
  });
}

export async function loadClip(data: string, clip: Clip, policy: VoiceSpec['voicePolicy'], signal: AbortSignal) {
  checkAbort(signal);
  const source = await readLocalTts(data, clip.receiptFingerprint);
  if (source.receiptArtifact.sha256 !== clip.receiptSha256 ||
      source.receipt.artifact.sha256 !== clip.sourceAudioSha256 ||
      source.input.text !== clip.transcript || (policy === 'windows-sapi-zira-technical-fixture' &&
        source.input.voiceLabel !== 'Microsoft Zira Desktop / Windows SAPI / rate 0 / technical fixture')) {
    voiceError('VOICE_RECEIPT', 'Local import receipt, exact transcript, audio or declared voice policy differs for ' + clip.beatId);
  }
  return source;
}

export async function decodeClip(source: LocalAudio, dir: string, index: number, maxFrames: number, signal: AbortSignal) {
  const path = join(dir, index + '.audio');
  const output = join(dir, index + '.pcm');
  const format = { 'audio/wav': 'wav', 'audio/flac': 'flac', 'audio/mpeg': 'mp3' }[source.input.mediaType];
  await writeFile(path, source.audio, {flag: 'wx'});
  const probe = JSON.parse(await command(ffprobePath(), ['-v', 'error', '-protocol_whitelist', 'file', '-f', format, '-show_streams', '-show_format',
    '-of', 'json', path], {signal, timeout: 30_000}));
  const seconds = Number(probe.format?.duration);
  if (probe.streams?.length !== 1 || probe.streams[0]?.codec_type !== 'audio' ||
      seconds !== source.receipt.durationSeconds) voiceError('VOICE_MEDIA', 'Measured container differs from the import receipt.');
  const maxSeconds = maxFrames / PRESENTATION_FPS;
  if (seconds > maxSeconds + 1) voiceError('VOICE_DOES_NOT_FIT', 'The measured container exceeds the entire ' + maxSeconds + '-second preview scope.');
  const maxPcmBytes = maxFrames * FRAME_SAMPLES * 2;
  // The extra second distinguishes a bounded output stop from a valid clip.
  // Any result over the exact budget fails regardless of the decoder exit code.
  const outputCeiling = maxPcmBytes + RATE * 2;
  await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-n', '-protocol_whitelist', 'file', '-f', format, '-i', path, '-map', '0:a:0',
    '-ac', '1', '-ar', String(RATE), '-c:a', 'pcm_s16le', '-fs', String(outputCeiling), '-f', 's16le', output], {signal, timeout: 30_000});
  const pcm = await boundedFile(output, outputCeiling + RATE * 2);
  if (pcm.length >= outputCeiling) voiceError('VOICE_DOES_NOT_FIT', 'Decoded clip exceeded the complete preview sample budget.');
  return pcm;
}

export function placement(beat: Beat, clip: Clip, pcm: Buffer, source: LocalAudio) {
  if (!pcm.length || pcm.length % 2 || !pcm.some(byte => byte !== 0)) {
    voiceError('VOICE_EMPTY', 'The decoded recording is empty or digital silence for ' + beat.id);
  }
  const startFrame = beat.start + clip.startOffsetFrames;
  const startSample = startFrame * FRAME_SAMPLES;
  const sampleCount = pcm.length / 2;
  const availableSamples = Math.max(0, (beat.end - startFrame) * FRAME_SAMPLES);
  if (sampleCount > availableSamples) voiceError('VOICE_DOES_NOT_FIT', canonical({beatId: beat.id, actualSamples: sampleCount,
    availableSamples, minAdditionalFrames: clip.startOffsetFrames + Math.ceil(sampleCount / FRAME_SAMPLES) - (beat.end - beat.start)}));
  return {beatId: beat.id, startSample, endSample: startSample + sampleCount, sampleCount, startFrame,
    endFrame: startFrame + Math.ceil(sampleCount / FRAME_SAMPLES), transcript: clip.transcript,
    transcriptSha256: clip.transcriptSha256, pcmSha256: sha256(pcm), sourceAudioSha256: clip.sourceAudioSha256,
    receiptSha256: clip.receiptSha256, containerSeconds: source.receipt.durationSeconds,
    mediaType: source.input.mediaType, voiceLabel: source.input.voiceLabel};
}

export type Cue = ReturnType<typeof placement>;

export function mixClips(totalFrames: number, clips: {cue: Cue; pcm: Buffer}[]) {
  const mix = Buffer.alloc(totalFrames * FRAME_SAMPLES * 2);
  for (const {cue, pcm} of clips) pcm.copy(mix, cue.startSample * 2);
  return mix;
}

export function voiceCaptions(cues: Cue[]) {
  const timestamp = (sample: number, round: (x: number) => number) => new Date(round(sample / RATE * 1000)).toISOString().slice(11, 23);
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from('WEBVTT\n\nNOTE Clip-level measured placement. Caller-declared transcript; speech alignment unverified.\n\n' +
    cues.map(cue => timestamp(cue.startSample, Math.floor) + ' --> ' + timestamp(cue.endSample, Math.ceil) +
      '\n' + escape(cue.transcript) + '\n').join('\n'));
}
