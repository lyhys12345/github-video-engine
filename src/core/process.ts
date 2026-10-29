import {spawn} from 'node:child_process';
import {EngineError, checkAbort} from './errors.js';

// Each invocation owns its children. Never kill another Chrome session by name.
export async function killTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
      killer.once('error', () => resolve()); killer.once('close', () => resolve());
    });
  } else { try { process.kill(-pid, 'SIGKILL'); } catch { /* Already exited. */ } }
}
export function command(exe: string, args: string[], options: {timeout?: number; signal?: AbortSignal; cwd?: string; capture?: 'stdout'|'stderr'; env?: NodeJS.ProcessEnv} = {}): Promise<string> {
  if (options.signal) checkAbort(options.signal);
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, {shell: false, windowsHide: true, detached: process.platform !== 'win32', cwd: options.cwd, env: options.env ? {...process.env,...options.env} : undefined, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '', failure: unknown;
    let killing: Promise<void> | undefined;
    const stop = (reason: unknown) => { failure ??= reason; if (child.pid && !killing) killing = killTree(child.pid); };
    const abort = () => stop(options.signal?.reason ?? new EngineError('CANCELLED', 'Command cancelled', 'cancelled'));
    options.signal?.addEventListener('abort', abort, {once: true});
    const timer = setTimeout(() => stop(new EngineError('TIMEOUT', `${exe} exceeded ${options.timeout ?? 30_000}ms`, 'retryable')), options.timeout ?? 30_000);
    const clean = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); };
    child.stdout.on('data', (data) => { stdout = (stdout + data.toString()).slice(-2_000_000); });
    child.stderr.on('data', (data) => { stderr = (stderr + data.toString()).slice(-16_000); });
    child.once('error', (error) => { clean(); reject(new EngineError('DEPENDENCY', `${exe}: ${error.message}`)); });
    child.once('close', async (code) => {
      clean(); await killing;
      if (failure) reject(failure);
      else if (code === 0) resolve(options.capture==='stderr'?stderr:stdout);
      else reject(new EngineError('PROCESS_FAILED', `${exe} exited ${code}: ${stderr}`, 'retryable'));
    });
    if (options.signal?.aborted) abort();
  });
}
