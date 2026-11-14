import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {cp, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {expect, it} from 'vitest';
import {canonical, sha256} from '../src/core/util.js';
import {command} from '../src/core/process.js';
import {ffmpegPath, projectRoot} from '../src/providers/local.js';
import {exportShowcase, importShowcase} from '../src/showcase/portable.js';
import {resumeShowcase, reviewShowcase, showcaseStatus} from '../src/showcase/runtime.js';
import {readShowcasePointer} from '../src/showcase/workspace.js';
import type {TaskRecord} from '../src/orchestrator/tasks.js';
import {signal, urlFixture, writeShowcaseFixture} from './showcase-support.js';

function checkTasks(data: string) {
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(join(data, 'tasks.sqlite'), {readOnly: true});
    return db.prepare('SELECT data FROM tasks').all().map(row => JSON.parse(String(row.data)) as TaskRecord);
  } catch (error) {
    const code = (error as {errcode?: number}).errcode;
    if (code === 14 || code === 5 || error instanceof Error && error.message.includes('no such table')) return [];
    throw error;
  } finally { db?.close(); }
}

it('recovers a hard-killed real shot render, reuses unchanged work, and reconstructs an offline workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gvs-'));
  const workspace = join(root, 'run');
  const data = join(workspace, 'state');
  const start = await urlFixture(workspace);
  const image = join(root, 'source.png'), video = join(root, 'source.mp4');
  await command(ffmpegPath(), ['-v', 'error', '-nostdin', '-f', 'lavfi', '-i', 'color=darkgreen:s=96x56',
    '-frames:v', '1', '-threads', '1', image], {signal});
  await command(ffmpegPath(), ['-v', 'error', '-nostdin', '-f', 'lavfi', '-i', 'testsrc2=s=96x56:r=30',
    '-frames:v', '6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video], {signal});
  const fixture = await writeShowcaseFixture(join(workspace, 'authored'), [
    {file: 'still.png', bytes: await readFile(image), width: 96, height: 56},
    {file: 'clip.mp4', bytes: await readFile(video), width: 96, height: 56, frames: 6},
  ], start.source.bindingSha256);
  const options = {mode: 'movie', stills: []} as const;
  const args = ['--import', 'tsx', 'src/cli.ts', 'showcase', 'render', '--workspace', workspace,
    '--spec', fixture.spec, '--review', fixture.review, '--skip-stills'];
  const child = spawn(process.execPath, args, {cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
  let stdout = '', stderr = '';
  child.stdout.on('data', data => {stdout += String(data);});
  child.stderr.on('data', data => {stderr += String(data);});
  const ended = once(child, 'close');
  let render: TaskRecord | undefined, shot: TaskRecord | undefined, active: TaskRecord | undefined;
  try {
    const until = Date.now() + 100_000;
    while (Date.now() < until && child.exitCode === null) {
      const tasks = checkTasks(data);
      render = tasks.find(task => task.kind === 'showcase-render-v1' && task.state === 'running');
      shot = tasks.find(task => task.kind === 'showcase-shot-v1' && task.state === 'succeeded');
      active = tasks.find(task => task.kind === 'showcase-shot-v1' && task.state === 'running');
      if (render && shot && active) break;
      await delay(15);
    }
    if (!render || !shot || !active) throw new Error(`Did not observe active second shot. stdout=${stdout} stderr=${stderr}`);
    child.kill('SIGKILL');
    await ended;
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await ended;
    await writeFile(join(root, 'interrupted.stdout'), stdout);
    await writeFile(join(root, 'interrupted.stderr'), stderr);
  }
  expect(child.signalCode).toBe('SIGKILL');
  expect(checkTasks(data).find(task => task.id === render.id)?.state).toBe('running');
  expect(await readShowcasePointer(workspace)).toBeUndefined();
  const leases = [render.id, active.id];
  for (let index = 0; index < 100; index++) {
    const latest = checkTasks(data).filter(task => leases.includes(task.id));
    const pending = Math.max(...latest.map(task => task.leaseUntil), 0) - Date.now();
    if (pending < 0) break;
    await delay(Math.min(pending + 40, 20_000));
  }

  const resume = await command(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'showcase', 'resume', '--workspace', workspace,
    '--task', render.id, '--out', join(root, 'review-out')], {cwd: projectRoot, signal, timeout: 140_000});
  const rendered = JSON.parse(resume);
  await writeFile(join(root, 'resumed.json'), resume);
  expect(rendered).toMatchObject({taskId: render.id, frames: 12, fullDecodePassed: true,
    perceptualReview: 'pending', ownerAcceptance: 'pending', sourceFacts: 'unverified', reuse: {shotsRendered: 1, shotsReused: 1}});
  expect(rendered.shots[0]).toBe(shot.id);
  expect(rendered.shots[1]).toBe(active.id);
  expect(checkTasks(data).find(task => task.id === active.id)?.attempt).toBe(2);
  const status = await showcaseStatus(data, render.id);
  expect(status).toMatchObject({state: 'succeeded', attempt: 2, events: expect.arrayContaining([expect.objectContaining({type: 'task_resumed'})])});
  expect(await readShowcasePointer(workspace)).toMatchObject({taskId: render.id, candidateSha256: rendered.candidateSha256});
  expect(sha256(await readFile(join(rendered.output.bundle, 'review.mp4')))).toBe(rendered.candidateSha256);

  const baseline = structuredClone(fixture.manifest);
  const rerun = async () => JSON.parse(await command(process.execPath, args, {cwd: projectRoot, signal, timeout: 120_000}));
  expect(await rerun()).toMatchObject({taskId: render.id, cached: true});
  (baseline.beats[0]!.shots[1]! as {annotation?: string}).annotation = 'Technical edit';
  await writeFile(fixture.spec, canonical(baseline));
  await expect(rerun()).rejects.toThrow('owner-authorized script review');
  await fixture.approve(baseline);
  const edited = await rerun();
  expect(edited.taskId).not.toBe(render.id);
  expect(edited.shots[0]).toBe(shot.id);
  expect(edited.shots[1]).not.toBe(active.id);
  expect(edited.reuse).toMatchObject({shotsRendered: 1, shotsReused: 1});

  const review = join(root, 'video-review.json');
  await writeFile(review, canonical({schemaVersion: 'candidate-review/1.0', candidateSha256: rendered.candidateSha256,
    stage: 'video', reviewer: 'Synthetic technical fixture', coverage: 'partial-av', verdict: 'UNVERIFIED', findings: []}));
  expect(await reviewShowcase(data, render.id, review, signal)).toMatchObject({decision: {status: 'unverified'}, ownerAcceptance: 'pending'});
  await expect(reviewShowcase(data, edited.taskId, review, signal)).rejects.toThrow('another candidate');
  const portable = await exportShowcase(data, render.id, join(root, 'portable'), signal);
  await writeFile(join(root, 'export.json'), canonical(portable));
  const moved = join(root, 'moved');
  await cp(portable.bundle, moved, {recursive: true});
  await writeFile(join(moved, 'private-voice.wav'), 'must refuse extra assets');
  await expect(importShowcase(moved, portable.digest, join(root, 'unsafe'), signal)).rejects.toThrow('Unexpected portable file');
  const imported = await importShowcase(portable.bundle, portable.digest, join(root, 'clean'), signal);
  expect(imported).toMatchObject({sourceTaskId: rendered.sourceTaskId, candidateSha256: rendered.candidateSha256, reviews: 'historical'});
  expect(sha256(await readFile(join(imported.bundle, 'output/review.mp4')))).toBe(rendered.candidateSha256);
  expect(sha256(await readFile(join(imported.bundle, 'source/manifest.json')))).toBe(rendered.manifestSha256);
  await writeFile(join(workspace, 'authored', 'still.png'), 'mutated original outside CAS');
  const rebuilt = await resumeShowcase(imported.data, imported.sourceTaskId, signal, undefined, {mode: options.mode, stills: []});
  expect(rebuilt).toMatchObject({sourceTaskId: rendered.sourceTaskId, frames: 12, fullDecodePassed: true, sourceFacts: 'unverified'});
  expect(rebuilt.reuse?.shotsRendered).toBe(2);
  await writeFile(join(root, 'import.json'), canonical({imported, rebuilt}));
  console.log('Showcase technical evidence retained in ' + root);
}, 300_000);
