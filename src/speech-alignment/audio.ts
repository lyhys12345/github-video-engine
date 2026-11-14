import {mkdtemp, rm, rmdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkAbort, EngineError} from '../core/errors.js';
import {command} from '../core/process.js';
import {ffmpegPath} from '../providers/local.js';
import type {SpeechAlignmentRequest} from './contracts.js';

export type TimeSpan = {startSeconds: number; endSeconds: number};

const metadataFilter = "ametadata=mode=print:file='pipe\\:1'";
export const maxWavBytes = 128_000_000;
export const wavInput = ['-protocol_whitelist', 'file', '-f', 'wav'] as const;
const progressEnd = /\bprogress=end(?:\r?\n|$)/;
const decodedMicros = /^out_time_us=(\d+)\r?$/gm;
export const roundedSeconds = (seconds: number) => Math.round(seconds * 1_000_000) / 1_000_000;

export async function inspectWav(
  bytes: Buffer,
  settings: SpeechAlignmentRequest['settings'],
  signal: AbortSignal,
  recognize?: (wavPath: string, signal: AbortSignal) => Promise<unknown>,
) {
  checkAbort(signal);
  // A fixed demuxer and private copy keep the tools tied to the verified bytes.
  const container = bytes.toString('ascii', 0, 4);
  if (bytes.length < 44 || bytes.length > maxWavBytes || !['RIFF', 'RF64'].includes(container)
    || bytes.toString('ascii', 8, 12) !== 'WAVE'
    || (container === 'RIFF' && bytes.readUInt32LE(4) + 8 !== bytes.length)) {
    throw new EngineError('ALIGNMENT_AUDIO', 'Expected a complete bounded RIFF or RF64 WAVE file.');
  }

  const dir = await mkdtemp(join(tmpdir(), 'gve-speech-alignment-'));
  const audioPath = join(dir, 'source.wav');
  try {
    await writeFile(audioPath, bytes, {flag: 'wx'});
    const filter = 'silencedetect=n=' + settings.silenceThresholdDbfs + 'dB:d='
      + settings.minimumSilenceSeconds + ',' + metadataFilter;
    const executable = ffmpegPath();
    const [raw, version] = await Promise.all([
      command(executable, ['-hide_banner', '-nostdin', '-v', 'error', '-xerror',
        '-progress', 'pipe:1', '-nostats', ...wavInput, '-i', audioPath, '-map', '0:a:0',
        '-af', filter, '-f', 'null', '-'], {signal, timeout: 60_000}),
      command(executable, ['-version'], {signal, timeout: 5_000}),
    ]);
    const durationSeconds = Number([...raw.matchAll(decodedMicros)].at(-1)?.[1]) / 1_000_000;
    if (!progressEnd.test(raw) || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 300) {
      throw new EngineError('ALIGNMENT_AUDIO', 'WAV must fully decode to a positive duration of at most 300 seconds.');
    }
    const spans: TimeSpan[] = [];
    let start: number | undefined;
    const addSpan = (end: number) => {
      if (start === undefined || !Number.isFinite(end) || start < 0 || end <= start || end > durationSeconds + 0.001
        || (spans.length && start < spans.at(-1)!.endSeconds)) {
        throw new EngineError('ALIGNMENT_AUDIO', 'FFmpeg returned inconsistent silence boundaries.');
      }
      spans.push({startSeconds: start, endSeconds: Math.min(end, durationSeconds)});
      start = undefined;
    };
    for (const line of raw.split(/\r?\n/)) {
      const metadata = /^lavfi\.silence_(start|end)=([^ ]+)$/.exec(line);
      if (!metadata) continue;
      if (metadata[1] === 'start') {
        if (start !== undefined) throw new EngineError('ALIGNMENT_AUDIO', 'FFmpeg returned overlapping silence starts.');
        start = Number(metadata[2]);
      } else addSpan(Number(metadata[2]));
    }
    // FFmpeg emits the final silence_end during teardown, after the metadata frames.
    if (start !== undefined) addSpan(durationSeconds);

    const timing = recognize ? await recognize(audioPath, signal) : undefined;
    return {durationSeconds, spans, ffmpegVersion: version.split(/\r?\n/)[0]!, timing};
  } finally {
    await rm(audioPath, {force: true});
    await rmdir(dir);
  }
}
