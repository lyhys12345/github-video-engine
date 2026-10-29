import {spawn, type ChildProcess} from 'node:child_process';
import {mkdir, mkdtemp, readFile, readdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {killTree, command} from '../src/core/process.js';
import {Engine} from '../src/orchestrator/engine.js';
export type Status = Awaited<ReturnType<Engine['status']>>;
export type Progress = {workerPid: number; parentPid: number; renderedFrames: number; totalFrames: number; encodedFrames: number; updatedAt: string};
export type ProcessInfo = {pid: number; parentPid: number; name: string;commandLine?:string;creationDate?:string};
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export async function until<T>(read: () => Promise<T | undefined>, timeout = 60_000): Promise<T> {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await read(); if (value !== undefined) return value; await sleep(50); }
  throw new Error(`Acceptance condition timed out after ${timeout}ms`);
}
export const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
export async function outputRoot() {
  const base = resolve(process.env.GVE_ACCEPTANCE_OUTPUT ?? 'acceptance-output'); await mkdir(base, {recursive: true});
  return mkdtemp(join(base, 'run-'));
}
export async function save(root: string, name: string, data: unknown) { await writeFile(join(root, name), JSON.stringify(data, null, 2) + '\n'); }
export function startCli(root: string, name: string, args: string[]) {
  const startedAt = Date.now();
  const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), ...args], {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '', stderr = '';
  child.stdout!.on('data', (b) => { stdout += b; }); child.stderr!.on('data', (b) => { stderr += b; });
  const timer = setTimeout(() => { if (child.pid) void killTree(child.pid); }, 210_000);
  const result = new Promise<{code: number | null; signal: string | null; stdout: string; stderr: string; durationMs: number}>((resolveResult, reject) => {
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', async (code, signal) => {
      clearTimeout(timer);
      const result = {code, signal, stdout, stderr, durationMs: Date.now() - startedAt};
      try { await save(root, `${name}.cli.json`, {args, pid: child.pid, ...result}); resolveResult(result); } catch (error) { reject(error); }
    });
  });
  return {child, result};
}
export async function cli(root: string, name: string, args: string[]) { return startCli(root, name, args).result; }
export async function status(data: string, id: string): Promise<Status> { const engine = new Engine(data); try { return await engine.status(id); } finally { engine.close(); } }
export async function activeRender(data: string, parentPid: number) {
  return until(async () => {
    const dirs = await readdir(join(data, 'tmp')).catch(() => []);
    for (const name of dirs) {
      if (!name.includes('-RENDER-')) continue;
      try {
        const progress = JSON.parse(await readFile(join(data, 'tmp', name, 'render-progress.json'), 'utf8')) as Progress;
        if (progress.parentPid === parentPid && progress.renderedFrames >= 12 && progress.renderedFrames < progress.totalFrames - 12) return {progress, directory: join(data, 'tmp', name)};
      } catch { /* Progress may not yet exist. */ }
    }
    return undefined;
  }, 75_000);
}
export async function descendants(parentPid: number): Promise<ProcessInfo[]> {
  if (process.platform !== 'win32') {
    const rows = await command('ps', ['-axo', 'pid=,ppid=,comm=']);
    const processes = rows.trim().split('\n').map((line) => { const [pid, ppid, ...name] = line.trim().split(/\s+/); return {pid: Number(pid), parentPid: Number(ppid), name: name.join(' ')}; });
    const owned = new Set([parentPid]); let changed = true;
    while (changed) { changed = false; for (const p of processes) if (owned.has(p.parentPid) && !owned.has(p.pid)) { owned.add(p.pid); changed = true; } }
    return processes.filter((p) => p.pid !== parentPid && owned.has(p.pid));
  }
  const script = `$items = Get-CimInstance Win32_Process -Filter 'ParentProcessId=${parentPid}'; @($items | Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate) | ConvertTo-Json -Compress`;
  const result = await command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
  const value = result.trim() ? JSON.parse(result) : [];
  const direct = (Array.isArray(value) ? value : [value]).filter(Boolean).map((p: {ProcessId: number; ParentProcessId: number; Name: string;CommandLine?:string;CreationDate?:string}) => ({pid: p.ProcessId, parentPid: p.ParentProcessId, name: p.Name,commandLine:p.CommandLine,creationDate:p.CreationDate}));
  const all:ProcessInfo[] = [...direct]; for (const p of direct) all.push(...await descendants(p.pid)); return all;
}
