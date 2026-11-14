import {constants} from 'node:fs';
import {access, readdir, readFile, stat} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {command} from '../core/process.js';
import {canonical, sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export async function browserPath(): Promise<string> {
  const candidates = process.env.GVE_BROWSER ? [process.env.GVE_BROWSER] : [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  ];
  for (const candidate of candidates) {
    try {
      if (!(await stat(candidate)).isFile()) continue;
      await access(candidate, constants.X_OK);
      return candidate;
    } catch { /* Try known local installation. */ }
  }
  throw new EngineError('BROWSER_MISSING', 'Install Chrome/Chromium or set GVE_BROWSER to an existing browser executable. No automatic download is performed.');
}
export const ffmpegPath = () => process.env.GVE_FFMPEG || 'ffmpeg';
export const ffprobePath = () => process.env.GVE_FFPROBE || 'ffprobe';
export const localAudioInput = ['-protocol_whitelist', 'file', '-format_whitelist', 'wav,mp3,flac,ogg,aac,mov,matroska,asf,aiff'] as const;
export function requireNodeRuntime() {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new EngineError('NODE_VERSION', 'Run videoEngine using Node 24.x.');
}
export async function planningEnvironment(): Promise<Record<string, string>> {
  requireNodeRuntime();
  const files: string[] = [];
  async function walk(dir: string) { for (const entry of (await readdir(join(projectRoot, dir), {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = `${dir}/${entry.name}`; if (entry.isDirectory()) await walk(path); else files.push(path);
  } }
  await walk('src'); files.push('package.json', 'pnpm-lock.yaml', 'examples/demo.v1.json');
  const source = [];
  for (const path of files) source.push([path, sha256(await readFile(join(projectRoot, path)))]);
  return {engine: 'gve-0.1.0', codeHash: sha256(canonical(source)), node: process.version, platform: process.platform, arch: process.arch,
    remotion: '4.0.538'};
}
export async function environment(): Promise<Record<string, string>> {
  requireNodeRuntime();
  const browser = await browserPath();
  const browserStat = await stat(browser);
  const [ffmpeg, ffprobe] = await Promise.all([
    command(ffmpegPath(), ['-version']), command(ffprobePath(), ['-version']),
  ]);
  return {...await planningEnvironment(), browser, browserStamp: `${browserStat.size}:${browserStat.mtimeMs}`,
    ffmpeg: ffmpeg.split(/\r?\n/)[0]!, ffprobe: ffprobe.split(/\r?\n/)[0]!};
}
