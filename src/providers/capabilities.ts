import {link, lstat, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {EngineError, checkAbort} from '../core/errors.js';
import {command} from '../core/process.js';
import {ancestors, preflightStatePath} from '../story-planner/runtime.js';
import {probeHuihuiVoice} from '../tts/huihui.js';
import {probeLocalCudaVoice} from '../tts/local-chen.js';
import {probePublicVoice} from '../tts/qwen-public.js';
import {compositionLanguages, isLocalNarrationVoice, localNarrationVoices, narrationAdapterBlocker, publicVoicePresets, requireNarrationVoice} from '../workflow/narration-voice-policy.js';
import {browserPath, ffmpegPath, ffprobePath, requireNodeRuntime} from './local.js';

export const capabilityPhases = ['planning', 'speech', 'animation', 'voice', 'preview'] as const;
export type CapabilityPhase = typeof capabilityPhases[number];
type CheckId = 'runtime' | 'storage' | 'browser' | 'ffmpeg' | 'ffprobe' | 'videoFilters' | 'audioEncoder' | 'voice';
type Check = {status: 'ready' | 'blocked' | 'not-checked'; code?: string; detail?: string};
type Options = {phase?: CapabilityPhase; data?: string; language?: string; voice?: string; signal?: AbortSignal};

async function storageProbe(data?: string) {
  let parent = resolve(data ?? tmpdir());
  if (data) preflightStatePath(parent);
  await ancestors(parent);
  // A proposed directory may not exist yet. Probe its nearest existing parent on the same volume.
  for (;;) {
    try {
      const info = await lstat(parent);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new EngineError('STORAGE_PATH', 'Expected a regular state directory.');
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || dirname(parent) === parent) throw error;
      parent = dirname(parent);
    }
  }
  const scratch = await mkdtemp(join(parent, '.gve-doctor-'));
  try {
    const original = join(scratch, 'original');
    const linked = join(scratch, 'linked');
    await writeFile(original, 'videoEngine', {flag: 'wx'});
    await link(original, linked);
    if ((await readFile(linked, 'utf8')) !== 'videoEngine') throw new Error('Hard link contents differ');
    const database = join(scratch, 'storage.sqlite');
    const db = new DatabaseSync(database);
    try {
      if (db.prepare('PRAGMA journal_mode=WAL').get()?.journal_mode !== 'wal') throw new Error('SQLite WAL unavailable');
      db.exec('CREATE TABLE probe(value INTEGER); INSERT INTO probe VALUES (1);');
    } finally { db.close(); }
    const reopened = new DatabaseSync(database, {readOnly: true});
    try { if (reopened.prepare('SELECT value FROM probe').get()?.value !== 1) throw new Error('SQLite readback failed'); }
    finally { reopened.close(); }
  } finally {
    await rm(scratch, {recursive: true, force: true});
  }
}

function checkCode(error: unknown, fallback: string) {
  if (error instanceof EngineError && ['NODE_VERSION', 'BROWSER_MISSING', 'VOICE_PLATFORM', 'NARRATION_VOICE',
    'CHEN_LOCAL_UNAVAILABLE', 'CHEN_PROFILE', 'VOICE_RUNTIME_TIMEOUT', 'HUIHUI_PLATFORM', 'HUIHUI_VOICE_UNAVAILABLE', 'PUBLIC_VOICE_PLATFORM', 'PUBLIC_VOICE_PROFILE', 'PUBLIC_VOICE_MODEL',
    'PUBLIC_VOICE_RUNTIME', 'PUBLIC_VOICE_TIMEOUT', 'EXPLAIN_STATE_PATH_TOO_LONG'].includes(error.code)) return error.code;
  return fallback;
}

function publicVoiceBlocker(code: string) {
  if (code === 'PUBLIC_VOICE_PLATFORM') return 'The public Qwen presets require Windows x64 and NVIDIA CUDA.';
  if (code === 'PUBLIC_VOICE_PROFILE') return 'Run scripts/prepare-public-voice.py from the dedicated Python environment, then configure GVE_QWEN_PUBLIC_PROFILE for a custom profile path.';
  if (code === 'PUBLIC_VOICE_MODEL') return 'Prepare a clean copy of the pinned model with scripts/prepare-public-voice.py --download.';
  if (code === 'PUBLIC_VOICE_TIMEOUT') return 'The local public voice readiness probe exceeded 120 seconds.';
  return 'Check config/public-voice-v1/requirements-windows.txt, Windows x64 Python 3.12 and an NVIDIA GPU with native bfloat16 support.';
}

export async function capabilityReport(options: Options = {}) {
  const signal = options.signal ?? new AbortController().signal;
  checkAbort(signal);
  const language = options.language ?? 'zh-CN';
  const voice = options.voice ?? (process.env.GVE_NARRATION_VOICE || requireNarrationVoice({}));
  const imported = voice === 'imported';
  const silent = voice === 'none';
  const local = isLocalNarrationVoice(voice);
  const adapter = local ? narrationAdapterBlocker('local', language, voice) : narrationAdapterBlocker(voice, language);
  const audio: CheckId[] = silent ? ['voice'] : ['ffmpeg', 'ffprobe', 'voice'];
  const planning: CheckId[] = ['runtime', 'storage'];
  const visuals: CheckId[] = ['browser', 'ffmpeg', 'ffprobe', 'videoFilters'];
  const phases: Record<CapabilityPhase, CheckId[]> = {
    planning, speech: [...planning, ...audio], animation: [...planning, ...visuals],
    voice: [...planning, ...audio], preview: [...planning, ...visuals, ...(silent ? [] : ['audioEncoder' as const]), 'voice'],
  };
  const required = new Set<CheckId>(options.phase ? phases[options.phase] : Object.values(phases).flat());
  const probes: Record<CheckId, {code: string; detail: string; error: string; run(): unknown}> = {
    runtime: {code: 'NODE_VERSION', detail: 'Node 24.x runtime detected.', error: 'Run videoEngine using Node 24.x.', run: requireNodeRuntime},
    storage: {code: 'STORAGE_UNAVAILABLE', detail: 'Temporary write, atomic hard link and SQLite WAL readback succeeded.',
      error: 'Choose a short writable state path on a filesystem with hard links and SQLite WAL.', run: () => storageProbe(options.data)},
    browser: {code: 'BROWSER_MISSING', detail: 'Chrome/Chromium executable found; browser launch and rendering remain unchecked.',
      error: 'Install Chrome/Chromium or set GVE_BROWSER to the executable.', run: browserPath},
    ffmpeg: {code: 'FFMPEG_MISSING', detail: 'FFmpeg ran its version check.', error: 'Install FFmpeg or set GVE_FFMPEG to the executable.',
      async run() {
        if (!/^ffmpeg version\s/.test(await command(ffmpegPath(), ['-version'], {signal, timeout: 5000}))) throw new Error('Invalid FFmpeg version output');
      }},
    ffprobe: {code: 'FFPROBE_MISSING', detail: 'ffprobe ran its version check.', error: 'Install ffprobe or set GVE_FFPROBE to the executable.',
      async run() {
        if (!/^ffprobe version\s/.test(await command(ffprobePath(), ['-version'], {signal, timeout: 5000}))) throw new Error('Invalid ffprobe version output');
      }},
    videoFilters: {code: 'FFMPEG_VIDEO_FEATURES', detail: 'FFmpeg lists the required libx264 encoder and drawtext filter.',
      error: 'Use an FFmpeg build with libx264 and drawtext.',
      async run() {
        const [encoders, filters] = await Promise.all([
          command(ffmpegPath(), ['-hide_banner', '-encoders'], {signal, timeout: 5000}),
          command(ffmpegPath(), ['-hide_banner', '-filters'], {signal, timeout: 5000}),
        ]);
        if (!/\blibx264\s/.test(encoders) || !/\bdrawtext\s/.test(filters)) throw new Error('Required FFmpeg feature unavailable');
      }},
    audioEncoder: {code: 'FFMPEG_AUDIO_ENCODER', detail: 'FFmpeg lists the required AAC encoder.',
      error: 'Use an FFmpeg build with an AAC encoder for narrated previews.', async run() {
        if (!/\baac\s/.test(await command(ffmpegPath(), ['-hide_banner', '-encoders'], {signal, timeout: 5000}))) throw new Error('AAC encoder unavailable');
      }},
    voice: {code: 'VOICE_RUNTIME', detail: imported ? 'Finished WAV adapter available. Exact authorized per-scene receipts are required for a real run.' :
        silent ? 'Explicit silent mode produces video without an audio track.' : 'Selected local profile and synthesis runtime checked; no audio generated.',
      error: 'Check the selected voice requirements and local runtime.',
      async run() {
        if (adapter) throw new EngineError('VOICE_ADAPTER', adapter);
        if (silent || imported) return;
        if (!local) throw new EngineError('NARRATION_VOICE', 'Unknown narration mode.');
        if (voice === 'windows-huihui') await probeHuihuiVoice(signal);
        else if (voice === 'qwen-public') await probePublicVoice(signal);
        else await probeLocalCudaVoice(voice, signal);
      }},
  };
  const checks = {} as Record<CheckId, Check>;
  await Promise.all((Object.keys(probes) as CheckId[]).map(async id => {
    const p = probes[id];
    if (!required.has(id)) { checks[id] = {status: 'not-checked'}; return; }
    try { await p.run(); checks[id] = {status: 'ready', detail: p.detail}; }
    catch (error) {
      checkAbort(signal);
      const code = checkCode(error, p.code);
      const detail = id !== 'voice' ? p.error : adapter ?? (
        code === 'NARRATION_VOICE' ? `Choose ${localNarrationVoices.join(', ')}, imported or none.` :
        voice === 'qwen-public' ? publicVoiceBlocker(code) :
        code === 'VOICE_RUNTIME_TIMEOUT' ? 'The configured local voice runtime did not finish its 120-second readiness probe.' :
        code === 'VOICE_PLATFORM' || code === 'HUIHUI_PLATFORM' ? 'The selected synthesis profile requires Windows.' :
        voice === 'windows-huihui' ? 'Install the exact local WinRT Huihui zh-CN voice and use Windows PowerShell.' :
        code === 'CHEN_LOCAL_UNAVAILABLE' || code === 'CHEN_PROFILE' ? (voice === 'anna-local' ?
          'Configure GVE_ANNA_PROFILE with the locked model, reference and Python files.' :
          'Configure GVE_CHEN_PROFILE with the locked model, reference and Python files.') :
        'Check the pinned Python, Qwen and Torch versions and a compatible Windows CUDA GPU with native bfloat16 support.');
      checks[id] = {status: 'blocked', code: adapter && id === 'voice' ? 'VOICE_ADAPTER' : code, detail};
    }
  }));
  const phaseReports = Object.fromEntries(capabilityPhases.map(phase => {
    const names = phases[phase];
    const blockers = names.filter(id => checks[id].status === 'blocked');
    const status = blockers.length ? 'blocked' : names.every(id => checks[id].status === 'ready') ? 'ready' : 'not-checked';
    return [phase, {status, requires: names, blockers}];
  })) as Record<CapabilityPhase, {status: 'ready' | 'blocked' | 'not-checked'; requires: CheckId[]; blockers: CheckId[]}>;
  return {
    schemaVersion: 'videoengine-capabilities/1.0',
    ok: options.phase ? phaseReports[options.phase].status === 'ready' : Object.values(phaseReports).every(phase => phase.status === 'ready'),
    selectedPhase: options.phase ?? null,
    host: {platform: process.platform, architecture: process.arch, node: process.versions.node},
    selection: {voice: local || imported || silent || voice === 'reference' || voice === 'byo-api' ? voice : 'unsupported',
      language: compositionLanguages.some(value => value === language) ? language : 'unsupported'},
    checks: Object.fromEntries((Object.keys(probes) as CheckId[]).map(id => [id, checks[id]])) as Record<CheckId, Check>,
    phases: phaseReports,
    narration: {
      local: {profiles: localNarrationVoices, languages: compositionLanguages, defaultProfile: 'anna-local', explicitAlternatives: true,
        profileLanguages: {'anna-local':['zh-CN'], 'chen-local':['zh-CN'], 'windows-huihui':['zh-CN'], 'qwen-public':compositionLanguages},
        publicPresets: publicVoicePresets},
      imported: {languages: compositionLanguages, mediaType: 'audio/wav', authorization: 'rights confirmation and exact per-scene local receipts'},
      silent: {languages: compositionLanguages, audioTrack: false},
      unavailable: {reference: 'reference-audio voice cloning adapter missing', 'byo-api': 'custom narration API adapter missing'},
    },
    scope: 'Local preflight only. This check does not contact GitHub, render, synthesize speech, or approve content.',
  };
}
