import {it, expect} from 'vitest';
import {spawn} from 'node:child_process';
import {access, readFile, readdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {Engine} from '../src/orchestrator/engine.js';
import {EngineError} from '../src/core/errors.js';
import {command, killTree} from '../src/core/process.js';
import {fixture, fixtureDirectory, mockOptions, temp, until, pause} from './support.js';
const helper = resolve('tests/child.ts');
const exists = async (path: string) => access(path).then(() => true, () => false);
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

it.each(['crash', 'crash-render'])('recovers force-killed process %s from SQLite in a new process (mock media)', async (mode) => {
  const root = await temp('crash'); const marker = join(root, 'ready');
  const child = spawn(process.execPath, ['--import', 'tsx', helper, mode, root, marker], {windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']});
  let diagnostics = ''; child.stderr.on('data', (b) => { diagnostics += b; });
  try {
    await until(() => exists(marker)); const id = await readFile(marker, 'utf8');
    const before = new Engine(root, mockOptions); expect(before.db.get(id).status).toBe('running'); const original = before.db.step(id, 'VALIDATE')!.outputs[0]!.sha256; before.close();
    await expect(command(process.execPath, ['--import', 'tsx', helper, 'resume', root, id])).rejects.toThrow('active worker');
    await killTree(child.pid!); await until(async () => !alive(child.pid!)); await pause(600);
    const output = JSON.parse(await command(process.execPath, ['--import', 'tsx', helper, 'resume', root, id]));
    expect(output.job.status).toBe('succeeded');
    expect(output.steps[0].outputs[0].sha256).toBe(original); expect(output.steps[0].attempt).toBe(1);
    expect(output.events.some((e: {type: string}) => e.type === 'checkpoint_reused')).toBe(true);
    expect(output.steps.find((s: {stage: string}) => s.stage === 'RENDER').attempt).toBe(mode === 'crash-render' ? 2 : 1);
    expect(await readdir(join(root, 'tmp'))).toEqual([]);
    await writeFile(join(root, 'recovery-proof.json'), JSON.stringify({id, killedPid: child.pid, originalHash: original, output}, null, 2));
  } catch (error) { throw new Error(`${String(error)}\n${diagnostics}`); }
  finally { if (child.pid && alive(child.pid)) await killTree(child.pid); }
});

it('resumes after injected failure without rendering a committed step twice (mock media)', async () => {
  const root = await temp('injection'); let engine = new Engine(root, {...mockOptions, afterStage: async (stage) => { if (stage === 'RENDER') throw new EngineError('INJECTED', 'Crash after render commit', 'retryable'); }});
  const job = await engine.submit(await fixture(), fixtureDirectory); await expect(engine.run(job.id)).rejects.toThrow('Crash after render');
  const videoHash = engine.db.step(job.id, 'RENDER')!.outputs[0]!.sha256; engine.close();
  engine = new Engine(root, {...mockOptions, renderer: {async render() { throw new Error('Must not re-render'); }}});
  await engine.run(job.id); expect(engine.db.get(job.id).status).toBe('succeeded'); expect(engine.db.step(job.id, 'RENDER')!.outputs[0]!.sha256).toBe(videoHash); expect(engine.db.step(job.id, 'RENDER')!.attempt).toBe(1); engine.close();
});

it('cancellation stops a real child process tree, cleans temporary output and allows resume (mock media)', async () => {
  const root = await temp('cancel'); const marker = join(root, 'pids.json');
  const engine = new Engine(root, {...mockOptions, renderer: {async render({directory, signal}) {
    await writeFile(join(directory, 'incomplete.mp4'), 'PARTIAL');
    await command(process.execPath, ['--import', 'tsx', helper, 'sleep-tree', marker], {signal}); return '';
  }}});
  const job = await engine.submit(await fixture(), fixtureDirectory); const control=new AbortController();const pending = engine.run(job.id,control.signal).catch((e) => e);
  try {
  await until(() => exists(marker)); const pids = JSON.parse(await readFile(marker, 'utf8'));
  const cancellation = JSON.parse(await command(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), 'jobs', 'cancel', job.id, '--data', root]));
  expect(cancellation.cancellationRequested).toBe(true); expect(await pending).toBeInstanceOf(EngineError);
  expect(engine.db.get(job.id).status).toBe('cancelled'); expect(alive(pids.parent)).toBe(false); expect(alive(pids.child)).toBe(false);
  expect(engine.db.step(job.id, 'RENDER')!.outputs).toEqual([]); expect(await readdir(join(root, 'tmp'))).toEqual([]);
  }finally{control.abort(new EngineError('CANCELLED','Test cleanup','cancelled'));await pending;engine.close();}
  const resumed = new Engine(root, mockOptions); await resumed.run(job.id); expect(resumed.db.get(job.id).status).toBe('succeeded'); expect(resumed.db.step(job.id, 'VALIDATE')!.attempt).toBe(1); resumed.close();
});

it('enforces stage timeouts and bounded retries using real sleeping child processes', async () => {
  const root = await temp('timeout'); const engine = new Engine(root, {...mockOptions, stageTimeoutMs: 250, renderer: {async render({signal}) {
    await command(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {signal}); return '';
  }}});
  const job = await engine.submit(await fixture(), fixtureDirectory);
  await expect(engine.run(job.id)).rejects.toThrow('deadline'); expect(engine.db.get(job.id).status).toBe('failed');
  expect(engine.db.step(job.id, 'RENDER')!.attempt).toBe(2); expect(engine.db.step(job.id, 'RENDER')!.error?.code).toBe('TIMEOUT');
  expect(await readdir(join(root, 'tmp'))).toEqual([]); engine.close();
});

it('records setup failure on its step and exits without a leaked deadline timer', async () => {
  const root = await temp('setup-failure');
  const output = await command(process.execPath, ['--import', 'tsx', resolve('tests/setup-failure-child.ts'), root], {timeout: 5000});
  const result = JSON.parse(output);
  expect(result.job.status).toBe('failed');
  const step = result.steps.find((s: {stage: string}) => s.stage === 'RESOLVE_ASSETS');
  expect(step.status).toBe('failed'); expect(step.error.code).toBe('STAGE_SETUP'); expect(step.finishedAt).toBeTruthy(); expect(result.output).toBeNull();
});
