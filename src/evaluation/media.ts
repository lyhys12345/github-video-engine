import type {VideoSpec} from '../contracts/video.js';
import {totalFrames} from '../contracts/video.js';
import {EvaluationResultSchema, type Artifact, type EvaluationResult} from '../contracts/runtime.js';
import {command} from '../core/process.js';
import {ffmpegPath, ffprobePath} from '../providers/local.js';
export async function verifyMedia(path: string, spec: VideoSpec, artifact: Artifact, signal: AbortSignal): Promise<EvaluationResult> {
  const probe = JSON.parse(await command(ffprobePath(), ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', path], {signal, timeout: 60_000}));
  const streams = probe.streams as Record<string, unknown>[];
  const videos = streams.filter((s) => s.codec_type === 'video'), audios = streams.filter((s) => s.codec_type === 'audio');
  const video = videos[0] ?? {};
  const [num, den] = String(video.avg_frame_rate).split('/').map(Number);
  const fps = num! / den!;
  const check = (name: string, passed: boolean, explanation: string) => ({name, passed, severity: 'error' as const, explanation});
  const checks = [
    check('container', String(probe.format?.format_name).split(',').includes('mp4'), String(probe.format?.format_name)),
    check('video-stream', videos.length === 1, `${videos.length} video stream(s)`),
    check('codec', video.codec_name === 'h264', String(video.codec_name)),
    check('pixel-format', video.pix_fmt === 'yuv420p', String(video.pix_fmt)),
    check('dimensions', video.width === spec.video.width && video.height === spec.video.height, `${video.width}x${video.height}`),
    check('frame-rate', Math.abs(fps - spec.video.fps) < 0.001, `${fps} fps`),
    check('frame-count', Number(video.nb_read_frames) === totalFrames(spec), `${video.nb_read_frames} decoded frames`),
    check('duration', Math.abs(Number(probe.format?.duration) - totalFrames(spec) / spec.video.fps) <= 1 / spec.video.fps, `${probe.format?.duration} seconds`),
    check('audio-policy', audios.length === 0, `${audios.length} audio streams; fixture explicitly requests silence`),
  ];
  try {
    await command(ffmpegPath(), ['-v', 'error', '-xerror', '-i', path, '-map', '0:v:0', '-f', 'null', '-'], {signal, timeout: 60_000});
    checks.push(check('full-decode', true, 'FFmpeg decoded the entire video without errors'));
  } catch (error) { if (signal.aborted) throw signal.reason; checks.push(check('full-decode', false, String(error))); }
  return EvaluationResultSchema.parse({schemaVersion: '1.0', evaluatorVersion: 'ffprobe-ffmpeg-v1', artifact: artifact.sha256, checks, passed: checks.every((c) => c.passed)});
}
