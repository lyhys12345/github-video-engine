import {it, expect} from 'vitest';
import {readFile, writeFile, copyFile, mkdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {Engine} from '../src/orchestrator/engine.js';
import {EngineError} from '../src/core/errors.js';
import {command} from '../src/core/process.js';
import {fixture, fixtureDirectory, temp} from './support.js';
import {ffmpegPath} from '../src/providers/local.js';

it('REAL Remotion MP4: injected failure, CLI resume, FFprobe/decode, persistence and deduplication', async () => {
  const root = await temp('real-smoke');
  const engine = new Engine(root, {afterStage: async (stage) => { if (stage === 'RENDER') throw new EngineError('INJECTED', 'Controlled stop after real Remotion output commit', 'retryable'); }});
  const job = await engine.submit(await fixture(), fixtureDirectory);
  try {
    await expect(engine.run(job.id)).rejects.toThrow('Controlled stop');
    expect(engine.db.get(job.id).status).toBe('failed');
    const original = engine.db.step(job.id, 'RENDER')!.outputs[0]!;
    await engine.artifacts.verify(original);
    const cli = resolve('src/cli.ts');
    const resumed = JSON.parse(await command(process.execPath, ['--import', 'tsx', cli, 'jobs', 'resume', job.id, '--data', root], {timeout: 120_000}));
    expect(resumed.job.status).toBe('succeeded'); expect(resumed.output).toBeTruthy();
    expect(resumed.steps.find((s: {stage: string}) => s.stage === 'RENDER').attempt).toBe(1);
    const report = await engine.artifacts.readJson<{passed: boolean; checks: unknown[]}>(engine.db.step(job.id, 'VERIFY_MEDIA')!.outputs[0]!);
    expect(report.passed).toBe(true);
    const frameHashes = await command(ffmpegPath(), ['-v', 'error', '-i', resumed.output, '-vf', 'select=eq(n\\,3)+eq(n\\,20)+eq(n\\,60)+eq(n\\,180)+eq(n\\,300)', '-fps_mode', 'passthrough', '-f', 'framemd5', '-']);
    const hashes = frameHashes.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => line.split(',').at(-1)!.trim());
    expect(hashes).toHaveLength(5); expect(new Set(hashes).size).toBe(5);
    const status = JSON.parse(await command(process.execPath, ['--import', 'tsx', cli, 'jobs', 'status', job.id, '--data', root]));
    expect(status.job.status).toBe('succeeded'); expect(status.integrity.every((a: {valid: boolean}) => a.valid)).toBe(true);
    const duplicate = JSON.parse(await command(process.execPath, ['--import', 'tsx', cli, 'render', '--spec', resolve('examples/demo.v1.json'), '--data', root], {timeout: 30_000}));
    expect(duplicate.job.id).toBe(job.id); expect(duplicate.steps.every((s: {attempt: number}) => s.attempt === 1)).toBe(true);
    const doctor = JSON.parse(await command(process.execPath, ['--import', 'tsx', cli, 'doctor', '--data', root])); expect(doctor.ok).toBe(true);
    await expect(command(process.execPath, ['--import', 'tsx', cli, 'jobs', 'resume', 'unknown', '--data', root])).rejects.toThrow('JOB_NOT_FOUND');
    const invalid = join(root, 'invalid.json'); await writeFile(invalid, JSON.stringify({schemaVersion: '99'}));
    await expect(command(process.execPath, ['--import', 'tsx', cli, 'render', '--spec', invalid, '--data', root])).rejects.toThrow('exited 1');
    await mkdir('demo-output', {recursive: true});
    await copyFile(resumed.output, 'demo-output/demo.mp4');
    await writeFile('demo-output/evaluation.json', JSON.stringify(report, null, 2));
    await writeFile('demo-output/frame-hashes.txt', frameHashes);
    await writeFile('demo-output/job-status.json', JSON.stringify(status, null, 2));
    await writeFile('demo-output/smoke-proof.json', JSON.stringify({jobId: job.id, database: join(root, 'jobs.sqlite'), artifact: original, recovery: 'Injected retryable failure after real RENDER commit; new CLI process resumed VERIFY_MEDIA and PUBLISH', renderAttempts: 1, duplicateJobId: duplicate.job.id, doctor, testedAt: new Date().toISOString()}, null, 2));
    const manifest = engine.db.step(job.id, 'PUBLISH')!.outputs[0]!;
    await copyFile(engine.artifacts.path(manifest), 'demo-output/manifest.json');
    expect((await readFile('demo-output/demo.mp4')).length).toBeGreaterThan(10_000);
  } finally { engine.close(); }
}, 240_000);
