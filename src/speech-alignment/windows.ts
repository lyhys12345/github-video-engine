import {rm, readFile} from 'node:fs/promises';
import {dirname, isAbsolute, join} from 'node:path';
import {z} from 'zod';
import {checkAbort, EngineError} from '../core/errors.js';
import {command} from '../core/process.js';
import {sha256} from '../core/util.js';
import {ffmpegPath, projectRoot} from '../providers/local.js';
import {TimingPhrase} from './contracts.js';
import {wavInput} from './audio.js';

const worker = join(projectRoot, 'scripts/windows-speech-alignment.ps1');
const Recognizer = z.strictObject({id: z.string().min(1), locale: z.string().min(1), description: z.string().min(1)});
const Recognition = z.strictObject({
  recognizer: Recognizer,
  engineVersion: z.string().min(1),
  phrases: z.array(TimingPhrase).max(500),
});

function powershell() {
  const root = process.env.SystemRoot;
  if (process.platform !== 'win32' || !root || !isAbsolute(root)) {
    throw new EngineError('ALIGNMENT_WINDOWS_UNAVAILABLE', 'Offline Windows desktop speech recognition requires Windows PowerShell and an installed matching recognizer.');
  }
  return join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

export async function probeWindowsSpeech(signal: AbortSignal) {
  try {
    const raw = await command(powershell(), ['-NoProfile', '-NonInteractive', '-File', worker, '-Probe'], {signal, timeout: 10_000});
    const recognizers = z.array(Recognizer).parse(JSON.parse(raw));
    return {available: recognizers.length > 0, recognizers, reason: recognizers.length
      ? null : 'No offline Windows desktop recognizer is installed.'};
  } catch (error) {
    checkAbort(signal);
    return {available: false, recognizers: [], reason: error instanceof Error ? error.message : String(error)};
  }
}

export async function recognizeWindowsSpeech(source: string, locale: string, signal: AbortSignal) {
  const executable = powershell();
  const {recognizers, reason} = await probeWindowsSpeech(signal);
  if (!recognizers.some(recognizer => recognizer.locale.toLowerCase() === locale.toLowerCase())) {
    throw new EngineError('ALIGNMENT_WINDOWS_UNAVAILABLE', reason ?? ('No installed offline Windows recognizer matches ' + locale + '.'));
  }

  const decoded = join(dirname(source), 'recognizer.wav');
  try {
    // SAPI accepts signed 16-bit mono PCM. Resample a scratch copy without changing its media clock.
    await command(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-xerror', '-nostdin', '-n',
      ...wavInput, '-i', source, '-map', '0:a:0', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-f', 'wav', decoded],
    {signal, timeout: 60_000});
    const raw = await command(executable, ['-NoProfile', '-NonInteractive', '-File', worker],
      {signal, timeout: 90_000, env: {GVE_ALIGNMENT_LOCALE: locale, GVE_ALIGNMENT_PCM: decoded}});
    const rawJson = Buffer.from(raw.trim(), 'base64');
    const result = Recognition.parse(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(rawJson)));
    if (result.recognizer.locale.toLowerCase() !== locale.toLowerCase()) {
      throw new EngineError('ALIGNMENT_WINDOWS_UNAVAILABLE', 'Windows speech recognizer reported a different locale.');
    }
    return {
      ...result,
      outputSha256: sha256(rawJson),
      recognitionAudioSha256: sha256(await readFile(decoded)),
      adapterSha256: sha256(await readFile(worker)),
    };
  } finally {
    await rm(decoded, {force: true});
  }
}

export type WindowsRecognition = Awaited<ReturnType<typeof recognizeWindowsSpeech>>;
