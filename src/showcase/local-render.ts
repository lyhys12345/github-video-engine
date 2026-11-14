import {spawn} from 'node:child_process';
import {lstat, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EngineError, checkAbort} from '../core/errors.js';
import {createOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command, killTree} from '../core/process.js';
import {canonical, fileHash, sha256} from '../core/util.js';
import {browserPath, ffmpegPath, ffprobePath, projectRoot} from '../providers/local.js';
import type {WorkerRequest, WorkerResponse} from './worker.js';

export async function showcaseEnvironment(signal: AbortSignal) {
  const browser = await browserPath();
  const sources = [
    'src/renderer/showcase-reel.tsx', 'src/renderer/showcase-reel-contract.ts',
    'src/renderer/showcase-geometry.ts', 'src/renderer/showcase-timing.ts',
    'src/renderer/approved-reel.ts', 'src/showcase/timeline.ts',
    'src/showcase/inputs.ts', 'src/showcase/workspace.ts', 'src/showcase/runtime.ts', 'src/showcase/local-render.ts',
    'src/showcase/worker.ts', 'pnpm-lock.yaml',
  ];
  const [code, chrome, chromeHash, ffmpeg, ffprobe] = await Promise.all([
    Promise.all(sources.map(async path => [path, await fileHash(join(projectRoot, path))])),
    stat(browser), fileHash(browser), command(ffmpegPath(), ['-version'], {signal}), command(ffprobePath(), ['-version'], {signal}),
  ]);
  return {browser, fingerprint: {
    renderer: sha256(canonical(code)), platform: process.platform, arch: process.arch,
    node: process.version, icu: process.versions.icu,
    browser: sha256(canonical([chromeHash, chrome.size, chrome.mtimeMs])),
    ffmpeg: sha256(ffmpeg), ffprobe: sha256(ffprobe),
  }};
}

export class LocalShowcaseRender {
  private child?: ReturnType<typeof spawn>;
  private closed?: Promise<void>;
  private failure?: Error;
  private pending?: {request: WorkerRequest; reject: (error: unknown) => void; resolve: () => void};

  constructor(private directory: string, private browser: string, private visuals: ReadonlyMap<string, Buffer>) {}

  private async start(signal: AbortSignal) {
    for (const [path, bytes] of this.visuals) {
      checkAbort(signal);
      const target = join(this.directory, 'public', path);
      await mkdir(dirname(target), {recursive: true});
      await writeFile(target, bytes, {flag: 'wx'});
    }
    const owned = await createOwnedRuntimeTmp(this.directory);
    const path = join(this.directory, 'worker-input.json');
    await writeFile(path, canonical({browser: this.browser}), {flag: 'wx'});
    checkAbort(signal);
    const worker = fileURLToPath(new URL('./worker.ts', import.meta.url));
    const child = spawn(process.execPath, ['--import', 'tsx', worker, path], {
      cwd: projectRoot, windowsHide: true, detached: process.platform !== 'win32',
      env: {...process.env, TEMP: owned.directory, TMP: owned.directory, TMPDIR: owned.directory},
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    this.child = child;
    let stderr = '';
    child.stderr!.on('data', chunk => {stderr = (stderr + String(chunk)).slice(-16_000);});
    child.on('message', (raw: unknown) => {
      const result = raw as WorkerResponse;
      const pending = this.pending;
      if (!pending || pending.request.id !== result.id) return;
      this.pending = undefined;
      if (result.error) pending.reject(new EngineError('SHOWCASE_RENDERER', result.error, 'retryable'));
      else pending.resolve();
    });
    this.closed = new Promise(done => {
      const fail = (message: string) => {
        this.failure = new EngineError('SHOWCASE_RENDERER', message, 'retryable');
        this.pending?.reject(this.failure);
        this.pending = undefined;
      };
      child.once('error', error => fail(error.message));
      child.once('close', code => {
        fail(`Showcase render worker closed (${code}): ${stderr}`);
        done();
      });
    });
  }

  async render(request: WorkerRequest, signal: AbortSignal) {
    if (!this.child) await this.start(signal);
    checkAbort(signal);
    if (this.failure) throw this.failure;
    const child = this.child!;
    const abort = () => this.pending?.reject(signal.reason ?? new EngineError('CANCELLED', 'Showcase render cancelled.', 'cancelled'));
    signal.addEventListener('abort', abort, {once: true});
    try {
      await new Promise<void>((resolve, reject) => {
        this.pending = {request, resolve, reject};
        child.send(request, error => {if (error) reject(error);});
        if (signal.aborted) abort();
      });
    } finally {
      signal.removeEventListener('abort', abort);
      this.pending = undefined;
    }
    const output = join(this.directory, request.id + (request.kind === 'still' ? '.png' : '.mp4'));
    const info = await lstat(output);
    if (!info.isFile() || info.isSymbolicLink() || info.size <= 0 || info.size > 256_000_000) {
      throw new EngineError('SHOWCASE_RENDERER', 'Worker output is missing or exceeds the asset bound.', 'retryable');
    }
    return {output, bytes: await readFile(output)};
  }

  async close() {
    const child = this.child;
    if (!child) return;
    let killing: Promise<void> | undefined;
    const kill = setTimeout(() => {if (child.pid) killing = killTree(child.pid);}, 10_000);
    try {
      if (child.connected) child.send({kind: 'stop'}, () => {});
      await this.closed;
      await killing;
    } finally { clearTimeout(kill); }
  }
}
