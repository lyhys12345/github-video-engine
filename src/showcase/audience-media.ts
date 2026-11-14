import {createHash} from 'node:crypto';
import {mkdir, rename, unlink, writeFile} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {z} from 'zod';
import {checkAbort} from '../core/errors.js';
import {command} from '../core/process.js';
import {ffmpegPath, ffprobePath, localAudioInput} from '../providers/local.js';
import {alignReelPcm} from '../renderer/approved-reel.js';
import {boundedFile} from '../story-planner/runtime.js';
import type {AudienceAuditRequest} from './audience-contract.js';
import {fail, type Manifest} from './inputs.js';

const fps = 30;
const sampleRate = 24000;
const samplesPerFrame = sampleRate / fps;
const maxPcmBytes = 14_400_000;
const movieInput = ['-protocol_whitelist', 'file', '-format_whitelist', 'mov'];
const ffmpeg = (args: string[], signal: AbortSignal) => command(ffmpegPath(), ['-hide_banner', '-v', 'error', '-xerror', '-nostdin',
  '-n', '-filter_threads', '1', '-filter_complex_threads', '1', ...args], {signal, timeout: 180_000});
const ffprobe = (args: string[], signal: AbortSignal) => command(ffprobePath(), ['-v', 'error', ...args, '-of', 'json'],
  {signal, timeout: 180_000});
const mediaError = (message: string) => fail(message, 'SHOWCASE_MEDIA');

export async function measureAudienceNarration(manifest: Manifest, assets: ReadonlyMap<string, Buffer>, scratch: string,
  signal: AbortSignal) {
  const lines: {frames: number; samples: number}[] = [];
  const hash = createHash('sha256');
  const pcm = join(scratch, 'narration.pcm');
  for (const line of manifest.narration) {
    checkAbort(signal);
    const input = join(scratch, 'narration' + extname(line.path));
    await writeFile(input, assets.get(line.path)!, {flag: 'wx'});
    await ffmpeg([...localAudioInput, '-i', input, '-map', '0:a:0', '-f', 's16le', '-ar', String(sampleRate), '-ac', '1',
      '-fs', String(maxPcmBytes + 1), pcm], signal);
    const bytes = await boundedFile(pcm, maxPcmBytes);
    if (!bytes.length || bytes.length >= maxPcmBytes) mediaError('Expected a nonempty original narration line shorter than five minutes.');
    const {frames, samples, padded} = alignReelPcm(bytes, 0);
    lines.push({frames, samples});
    hash.update(padded);
    await unlink(input);
    await unlink(pcm);
  }
  return {lines, pcmSha256: hash.digest('hex')};
}

const VisualProbe = z.object({streams: z.array(z.object({
  width: z.number().positive(), height: z.number().positive(), nb_read_frames: z.string().optional(), avg_frame_rate: z.string().optional(),
})).length(1)});

export async function probeAudienceVisuals(manifest: Manifest, assets: ReadonlyMap<string, Buffer>, scratch: string, signal: AbortSignal) {
  for (const media of manifest.media) {
    checkAbort(signal);
    const input = join(scratch, 'visual' + extname(media.path));
    await writeFile(input, assets.get(media.path)!, {flag: 'wx'});
    const options = media.type === 'video' ? ['-count_frames'] : [];
    const formats = media.type === 'video' ? 'mov,matroska,webm' : 'image2,png_pipe,jpeg_pipe,webp_pipe';
    const {streams: [video]} = VisualProbe.parse(JSON.parse(await ffprobe([
      '-protocol_whitelist', 'file', '-format_whitelist', formats, '-select_streams', 'v:0', ...options,
      '-show_entries', 'stream=width,height,nb_read_frames,avg_frame_rate', input,
    ], signal)));
    if (video!.width !== media.width || video!.height !== media.height ||
        (media.type === 'video' && (Number(video!.nb_read_frames) !== media.frames || video!.avg_frame_rate !== '30/1'))) {
      mediaError('Measured historical source dimensions or frame extent differ for ' + media.id + '.');
    }
    await unlink(input);
  }
}

const MovieProbe = z.object({
  streams: z.array(z.object({
    codec_type: z.string(), codec_name: z.string(), time_base: z.string(), start_time: z.string(),
    duration: z.string(), width: z.number().optional(), height: z.number().optional(),
    avg_frame_rate: z.string().optional(), sample_rate: z.string().optional(), channels: z.number().optional(),
  })).length(2),
  format: z.object({duration: z.string()}),
});
const Timestamps = z.object({frames: z.array(z.object({best_effort_timestamp: z.number().int().nonnegative()})).min(1).max(9000)});
const mp4StreamOptions = 'stream=codec_type,codec_name,time_base,start_time,duration,width,height,avg_frame_rate,sample_rate,channels:format=duration';

async function checkCandidate(path: string, frames: number, signal: AbortSignal) {
  const {streams, format} = MovieProbe.parse(JSON.parse(await ffprobe([
    ...movieInput, '-show_entries', mp4StreamOptions, path,
  ], signal)));
  const video = streams.find(stream => stream.codec_type === 'video');
  const audio = streams.find(stream => stream.codec_type === 'audio');
  const seconds = frames / fps;
  const durationOK = (duration: string) => Math.abs(Number(duration) - seconds) <= 0.06;
  if (!video || video.width !== 1080 || video.height !== 1920 || video.codec_name !== 'h264' ||
      video.avg_frame_rate !== '30/1' || !durationOK(video.duration) || Number(video.start_time) !== 0 ||
      !audio || audio.codec_name !== 'aac' || audio.sample_rate !== String(sampleRate) || audio.channels !== 1 ||
      !durationOK(audio.duration) || Number(audio.start_time) !== 0 || !durationOK(format.duration)) {
    mediaError('Candidate does not have the expected 1080×1920 30 fps video and original-speed 24 kHz mono audio extent.');
  }
  const {frames: observed} = Timestamps.parse(JSON.parse(await ffprobe([
    ...movieInput, '-select_streams', 'v:0', '-show_entries', 'frame=best_effort_timestamp', path,
  ], signal)));
  const [numerator, denominator] = video!.time_base.split('/').map(Number);
  const tick = numerator! / denominator!;
  if (!Number.isFinite(tick) || tick <= 0 || tick >= 1 / fps || observed.length !== frames ||
      observed.some(({best_effort_timestamp}, index) => Math.abs(best_effort_timestamp * tick - index / fps) > tick / 2 + 1e-9)) {
    mediaError('Candidate frame timestamps differ from the measured 30 fps timeline.');
  }
}

export async function validateAudienceCandidate(path: string, frames: number, signal: AbortSignal) {
  await checkCandidate(path, frames, signal);
}

export async function extractAudienceCandidate(path: string, frames: number[], clips: AudienceAuditRequest['clips'], out: string,
  signal: AbortSignal) {
  const folder = join(out, 'candidate');
  await mkdir(folder);
  const select = frames.map(frame => 'eq(n,' + frame + ')').join('+');
  await ffmpeg([...movieInput, '-threads', '2', '-i', path, '-map', '0:v:0', '-vf', "select='" + select + "'",
    '-fps_mode', 'passthrough', '-frames:v', String(frames.length), '-c:v', 'png', '-threads', '1',
    join(folder, 'selected-%03d.png')], signal);
  const originalFrames = await Promise.all(frames.map(async (frame, index) => {
    const name = 'frame-' + frame + '.png';
    await rename(join(folder, 'selected-' + String(index + 1).padStart(3, '0') + '.png'), join(folder, name));
    return {frame, path: 'candidate/' + name};
  }));
  const extractedClips = [];
  for (const clip of clips) {
    const {startFrame, endFrameExclusive} = clip;
    const name = 'clip-' + startFrame + '-' + endFrameExclusive + '.mp4';
    const target = join(folder, name);
    await ffmpeg([...movieInput, '-threads', '2', '-i', path, '-map', '0:v:0', '-map', '0:a:0',
      '-vf', 'trim=start_frame=' + startFrame + ':end_frame=' + endFrameExclusive + ',setpts=PTS-STARTPTS',
      '-af', 'atrim=start_sample=' + startFrame * samplesPerFrame + ':end_sample=' + endFrameExclusive * samplesPerFrame + ',asetpts=PTS-STARTPTS',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-threads', '2', '-c:a', 'aac',
      '-b:a', '96k', '-map_metadata', '-1', '-map_chapters', '-1', '-movflags', '+faststart', target], signal);
    await checkCandidate(target, endFrameExclusive - startFrame, signal);
    extractedClips.push({...clip, path: 'candidate/' + name});
  }
  return {originalFrames, extractedClips};
}

