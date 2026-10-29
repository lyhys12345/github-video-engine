import {beforeAll, afterAll, describe, it, expect} from 'vitest';
import {copyFile, readFile, writeFile, readdir, stat, lstat} from 'node:fs/promises';
import {join, resolve, relative, isAbsolute, sep} from 'node:path';
import {parseSpec, type VideoSpec} from '../src/contracts/video.js';
import {fileHash} from '../src/core/util.js';
import {command, killTree} from '../src/core/process.js';
import {ffmpegPath, ffprobePath} from '../src/providers/local.js';
import {Engine} from '../src/orchestrator/engine.js';
import {activeRender, alive, cli, descendants, outputRoot, save, startCli, status, until, sleep, type Status} from './acceptance-support.js';


const existsOwnedPath=async(path:string)=>lstat(path).then(()=>true,(error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return false;throw error;});
function ownedProfilePaths(owned:{name:string;commandLine?:string}[],runtime:{directory:string}){const profiles=owned.filter(p=>/chrome|msedge|chromium/i.test(p.name)).flatMap(p=>{const match=p.commandLine?.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/);return match?[match[1]??match[2]!]:[];});if(process.platform==='win32'){expect(profiles.length).toBeGreaterThan(0);for(const path of profiles){const rel=relative(runtime.directory,path);expect(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep)).toBe(false);}}return profiles;}

describe.sequential('M0 public CLI acceptance — all media REAL, no mock renderer/evaluator', () => {
  let root: string, data: string, spec: VideoSpec, modified: VideoSpec, baseline: Status, changed: Status;
  const outcomes: {check: string; passed: boolean; evidence: string[]}[] = [];
  beforeAll(async () => {
    root = await outputRoot(); data = join(root, 'state');
    console.log(`ACCEPTANCE_OUTPUT=${root}`);
    spec = parseSpec(JSON.parse(await readFile('examples/demo.v1.json', 'utf8')));
    modified = structuredClone(spec); modified.style.accent = '#FFAA00';
    modified.scenes[0]!.elements.find((e) => e.role === 'title')!.text = 'My own\nvideo test.';
    await save(root, 'baseline.spec.json', spec); await save(root, 'modified.spec.json', modified);
    const install = await cli(root, 'doctor', ['doctor', '--data', data]); expect(install.code).toBe(0); expect(JSON.parse(install.stdout).ok).toBe(true);
    await save(root, 'run-context.json', {startedAt: new Date().toISOString(), platform: process.platform, node: process.version, project: resolve('.'), allMediaReal: true, doctor: JSON.parse(install.stdout), originalFixtureHash: await fileHash('examples/demo.v1.json')});
  });
  afterAll(async () => { if (root) await save(root, 'acceptance-summary.json', {outcomes, completedAt: new Date().toISOString(), allMediaReal: true, note: 'Check Vitest JSON for assertion failures; this list contains completed checks only.'}); });

  it('fresh CLI render produces a verified playable baseline', async () => {
    const run = await cli(root, 'baseline-render', ['render', '--spec', join(root, 'baseline.spec.json'), '--data', data]); expect(run.code).toBe(0);
    baseline = JSON.parse(run.stdout); expect(baseline.job.status).toBe('succeeded'); expect(baseline.integrity.every((a) => a.valid)).toBe(true);
    await copyFile(baseline.output!, join(root, 'baseline.mp4')); await save(root, 'baseline.status.json', baseline);
    const probe = JSON.parse(await command(ffprobePath(), ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', baseline.output!]));
    expect(probe.streams[0].codec_name).toBe('h264'); expect(probe.streams[0].nb_read_frames).toBe('360'); expect(Number(probe.format.duration)).toBe(12);
    await save(root, 'baseline.ffprobe.json', probe);
    outcomes.push({check: 'fresh-render', passed: true, evidence: ['baseline.mp4', 'baseline.status.json', 'baseline.ffprobe.json']});
  }, 180_000);

  it('title/color edits rerender while retaining the original video and asset cache', async () => {
    const originalHash = await fileHash(baseline.output!);
    const run = await cli(root, 'modified-render', ['render', '--spec', join(root, 'modified.spec.json'), '--data', data]); expect(run.code).toBe(0);
    changed = JSON.parse(run.stdout); expect(changed.job.id).not.toBe(baseline.job.id); expect(changed.job.status).toBe('succeeded');
    expect(await fileHash(changed.output!)).not.toBe(originalHash); expect(await fileHash(baseline.output!)).toBe(originalHash);
    expect(changed.events.some((e) => e.type === 'cache_reused' && String(e.detail).includes('RESOLVE_ASSETS'))).toBe(true);
    await copyFile(changed.output!, join(root, 'modified.mp4')); await save(root, 'modified.status.json', changed);
    for (const [name, path] of [['baseline', baseline.output!], ['modified', changed.output!]]) {
      await command(ffmpegPath(), ['-v', 'error', '-ss', '2', '-i', path!, '-frames:v', '1', '-y', join(root, `${name}.title.png`)]);
    }
    await command(ffmpegPath(), ['-v', 'error', '-i', join(root, 'baseline.title.png'), '-i', join(root, 'modified.title.png'), '-filter_complex', '[0:v]scale=360:640[a];[1:v]scale=360:640[b];[a][b]hstack=inputs=2', '-frames:v', '1', '-y', join(root, 'title-comparison.png')]);
    await save(root, 'edit-proof.json', {baselineJobId: baseline.job.id, modifiedJobId: changed.job.id, originalHash, modifiedHash: await fileHash(changed.output!), originalUnchanged: true, title: modified.scenes[0]!.elements.find((e) => e.role === 'title')!.text, accent: modified.style.accent});
    outcomes.push({check: 'input-edit', passed: true, evidence: ['modified.mp4', 'title-comparison.png', 'edit-proof.json']});
  }, 180_000);

  it('duplicate submission preserves job ID, events, attempts, file hash and timestamp', async () => {
    const before = await stat(changed.output!); const hash = await fileHash(changed.output!);
    const run = await cli(root, 'duplicate-render', ['render', '--spec', join(root, 'modified.spec.json'), '--data', data]); expect(run.code).toBe(0);
    const duplicate: Status = JSON.parse(run.stdout);
    expect(duplicate.job.id).toBe(changed.job.id); expect(duplicate.steps).toEqual(changed.steps); expect(duplicate.events).toEqual(changed.events);
    expect((await stat(changed.output!)).mtimeMs).toBe(before.mtimeMs); expect(await fileHash(changed.output!)).toBe(hash);
    await save(root, 'duplicate-proof.json', {sameJobId: duplicate.job.id, durationMs: run.durationMs, attempts: duplicate.steps.map((s) => [s.stage, s.attempt]), unchangedTimestamp: before.mtimeMs, unchangedHash: hash, eventsUnchanged: true});
    outcomes.push({check: 'deduplication', passed: true, evidence: ['duplicate-proof.json', 'duplicate-render.cli.json']});
  });

  it('invalid width/version/JSON fail without creating a job or successful output', async () => {
    const engine = new Engine(data); const countBefore = engine.db.list().length; engine.close();
    const invalidWidth = structuredClone(modified); invalidWidth.video.width = 721;
    const variants = [['invalid-width', JSON.stringify(invalidWidth), 'video.width', 'INVALID_SPEC'], ['unsupported-version', JSON.stringify({...modified, schemaVersion: '99'}), 'schemaVersion', 'INVALID_SPEC'], ['invalid-json', '{not json', 'JSON', 'INVALID_JSON']];
    const results = [];
    for (const [name, content, diagnostic, code] of variants) {
      const path = join(root, `${name}.json`); await writeFile(path, content!);
      const run = await cli(root, name!, ['render', '--spec', path, '--data', data]); expect(run.code).toBe(1); expect(run.stdout.trim()).toBe(''); expect(run.stderr).toContain(diagnostic!);
      expect(JSON.parse(run.stderr).error.code).toBe(code); expect(JSON.parse(run.stderr).error.classification).toBe('permanent'); results.push({name, code: run.code, stderr: run.stderr});
    }
    const reopened = new Engine(data); expect(reopened.db.list()).toHaveLength(countBefore); reopened.close();
    await save(root, 'invalid-proof.json', {countBefore, countAfter: countBefore, results});
    outcomes.push({check: 'invalid-input', passed: true, evidence: ['invalid-proof.json']});
  });

  it('force-kills only the CLI mid-REAL-frame-render, observes orphan cleanup, then resumes', async () => {
    const recoverySpec = structuredClone(modified); recoverySpec.scenes[0]!.elements.find((e) => e.role === 'title')!.text = 'Recovered\nreal render.';
    const path = join(root, 'recovery.spec.json'); await save(root, 'recovery.spec.json', recoverySpec);
    const running = startCli(root, 'killed-render', ['render', '--spec', path, '--data', data]); let workerPid: number | undefined;
    try {
      const active = await activeRender(data, running.child.pid!); workerPid = active.progress.workerPid;
      const owned = await descendants(workerPid); expect(owned.some((p) => /chrome|msedge|chromium/i.test(p.name))).toBe(true);
      const runtimeOwner=JSON.parse(await readFile(join(active.directory,'runtime-owner.json'),'utf8'));const profiles=ownedProfilePaths(owned,runtimeOwner);expect(await existsOwnedPath(runtimeOwner.directory)).toBe(true);expect(await existsOwnedPath(runtimeOwner.directory+'.owner')).toBe(true);
      const progress = JSON.parse(await readFile(join(active.directory, 'render-progress.json'), 'utf8'));
      expect(progress.renderedFrames).toBeGreaterThan(0); expect(progress.renderedFrames).toBeLessThan(progress.totalFrames);
      const engine = new Engine(data); const job = engine.db.list().find((j) => j.owner && j.stage === 'RENDER')!; engine.close();
      const before = await status(data, job.id); expect(before.steps.find((s) => s.stage === 'RENDER')!.outputs).toEqual([]);
      const busy = await cli(root, 'concurrent-resume', ['jobs', 'resume', job.id, '--data', data]); expect(busy.code).toBe(1); expect(busy.stderr).toContain('JOB_BUSY');
      // Deliberately kill the orchestrator alone. Its worker/Chrome must clean themselves up.
      process.kill(running.child.pid!, 'SIGKILL'); await running.result;
      await until(async () => !alive(workerPid!) && owned.every((p) => !alive(p.pid)) ? true : undefined, 15_000);
      const interrupted = await status(data, job.id); expect(interrupted.job.status).toBe('running'); expect(interrupted.output).toBeNull(); expect(interrupted.steps.find((s) => s.stage === 'RENDER')!.status).toBe('running');
      await save(root, 'crash-proof.json', {orchestratorPid: running.child.pid, progressBeforeKill: progress, ownedProcesses: owned, allObservedProcessesExited: true, before, interrupted, incompleteDirectory: active.directory,runtimeOwner,profiles});
      // Use the public default 30-second lease, not a shortened test lease.
      await until(async () => Date.now() > interrupted.job.leaseUntil + 100 ? true : undefined, 35_000);
      const resumed = await cli(root, 'crash-resume', ['jobs', 'resume', job.id, '--data', data]); expect(resumed.code).toBe(0);
      const result: Status = JSON.parse(resumed.stdout); expect(result.job.status).toBe('succeeded'); expect(result.integrity.every((a) => a.valid)).toBe(true);
      for (const stage of ['VALIDATE', 'RESOLVE_ASSETS']) expect(result.steps.find((s) => s.stage === stage)!.outputs).toEqual(before.steps.find((s) => s.stage === stage)!.outputs);
      expect(result.steps.find((s) => s.stage === 'RENDER')!.attempt).toBe(2); expect(await readdir(join(data, 'tmp'))).toEqual([]);
      expect(await existsOwnedPath(runtimeOwner.directory)).toBe(false);expect(await existsOwnedPath(runtimeOwner.directory+'.owner')).toBe(false);expect(await existsOwnedPath(active.directory)).toBe(false);await save(root,'recovery-owned-temp-proof.json',{runtimeOwner,profiles,originalPayloadAbsent:true,originalSidecarAbsent:true,oldAttemptDirectoryAbsent:true,cleanupMeaning:'eventual on explicit same-job resume; no immediate crash reclamation claim'});
      await save(root, 'recovery.status.json', result); await copyFile(result.output!, join(root, 'recovered.mp4'));
      outcomes.push({check: 'real-render-crash-resume', passed: true, evidence: ['crash-proof.json', 'recovery-owned-temp-proof.json', 'recovery.status.json', 'recovered.mp4']});
    } finally { if (running.child.pid && alive(running.child.pid)) await killTree(running.child.pid); if (workerPid && alive(workerPid)) await killTree(workerPid); }
  }, 210_000);

  it('cancels REAL in-progress rendering through CLI, cleans children, and resumes', async () => {
    const cancelSpec = structuredClone(modified); cancelSpec.scenes[0]!.elements.find((e) => e.role === 'title')!.text = 'Cancelled.\nThen resumed.';
    const path = join(root, 'cancel.spec.json'); await save(root, 'cancel.spec.json', cancelSpec);
    const running = startCli(root, 'cancelled-render', ['render', '--spec', path, '--data', data]); let workerPid: number | undefined;
    try {
      const active = await activeRender(data, running.child.pid!); workerPid = active.progress.workerPid; const owned = await descendants(workerPid);
      const runtimeOwner=JSON.parse(await readFile(join(active.directory,'runtime-owner.json'),'utf8'));const profiles=ownedProfilePaths(owned,runtimeOwner);expect(await existsOwnedPath(runtimeOwner.directory)).toBe(true);expect(await existsOwnedPath(runtimeOwner.directory+'.owner')).toBe(true);
      const engine = new Engine(data); const job = engine.db.list().find((j) => j.owner && j.stage === 'RENDER')!; engine.close();
      const cancelled = await cli(root, 'cancel-command', ['jobs', 'cancel', job.id, '--data', data]); expect(cancelled.code).toBe(0);
      const exit = await running.result; expect(exit.code).toBe(130);
      await until(async () => !alive(workerPid!) && owned.every((p) => !alive(p.pid)) ? true : undefined, 15_000);
      const stopped = await status(data, job.id); expect(stopped.job.status).toBe('cancelled'); expect(stopped.output).toBeNull(); expect(stopped.steps.find((s) => s.stage === 'RENDER')!.outputs).toEqual([]);
      expect(await readdir(join(data, 'tmp'))).toEqual([]);
      expect(await existsOwnedPath(runtimeOwner.directory)).toBe(false);expect(await existsOwnedPath(runtimeOwner.directory+'.owner')).toBe(false);expect(await existsOwnedPath(active.directory)).toBe(false);
      await save(root, 'cancel-proof.json', {runtimeOwner,profiles,ownedPayloadAbsent:true,ownedSidecarAbsent:true,oldAttemptDirectoryAbsent:true,progress: active.progress, ownedProcesses: owned, allObservedProcessesExited: true, exitCode: exit.code, stopped});
      const resumed = await cli(root, 'cancel-resume', ['jobs', 'resume', job.id, '--data', data]); expect(resumed.code).toBe(0);
      const result: Status = JSON.parse(resumed.stdout); expect(result.job.status).toBe('succeeded'); expect(result.steps.find((s) => s.stage === 'RENDER')!.attempt).toBe(2);
      await save(root, 'cancel-resumed.status.json', result); await copyFile(result.output!, join(root, 'cancel-resumed.mp4'));
      outcomes.push({check: 'real-render-cancel-resume', passed: true, evidence: ['cancel-proof.json', 'cancel-resumed.status.json', 'cancel-resumed.mp4']});
    } finally { if (running.child.pid && alive(running.child.pid)) await killTree(running.child.pid); if (workerPid && alive(workerPid)) await killTree(workerPid); }
  }, 180_000);
});
