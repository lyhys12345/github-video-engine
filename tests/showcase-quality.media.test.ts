import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {expect, it} from 'vitest';
import {ArtifactStore} from '../src/assets/store.js';
import {command} from '../src/core/process.js';
import {canonical, sha256} from '../src/core/util.js';
import type {TaskRecord} from '../src/orchestrator/tasks.js';
import {ffmpegPath, projectRoot} from '../src/providers/local.js';
import {signal, urlFixture, writeShowcaseFixture} from './showcase-support.js';

const badTool = 'nonexistent-gve-quality-tool';
async function run(args: string[], unavailable = false) {
  return JSON.parse(await command(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'showcase', ...args], {
    cwd: projectRoot, signal, timeout: 145_000,
    ...(unavailable ? {env: {GVE_FFMPEG: badTool, GVE_FFPROBE: badTool, GVE_BROWSER: badTool}} : {}),
  }));
}

function stateSnapshot(data: string) {
  const db = new DatabaseSync(join(data, 'tasks.sqlite'), {readOnly: true});
  try {
    return {
      version: db.prepare('PRAGMA user_version').get(),
      tasks: db.prepare('SELECT data FROM tasks ORDER BY id').all().map(row => JSON.parse(String(row.data)) as TaskRecord),
      events: db.prepare('SELECT * FROM task_events ORDER BY seq').all(),
      usage: db.prepare('SELECT * FROM usage_events ORDER BY rowid').all(),
    };
  } finally { db.close(); }
}

it('checks a verified synthetic image and video without media tools or state changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gvsquality-'));
  console.log('Showcase quality synthetic evidence: ' + root);
  const workspace = join(root, 'workspace'), data = join(workspace, 'state');
  const pointerPath = join(workspace, 'current-showcase.json');
  const start = await urlFixture(workspace);
  const pattern = join(root, 'source.png'), video = join(root, 'source.mp4');
  const ffmpeg = ffmpegPath();
  await command(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=0x234b83:s=240x160',
    '-vf', 'drawbox=x=0:y=0:w=120:h=80:color=red:t=fill,drawbox=x=120:y=0:w=120:h=80:color=yellow:t=fill,drawbox=x=0:y=80:w=120:h=80:color=lime:t=fill',
    '-frames:v', '1', '-threads', '1', pattern], {signal});
  await command(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=320x240:r=30',
    '-frames:v', '6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-threads', '1', video], {signal});
  const fixture = await writeShowcaseFixture(join(workspace, 'author'), [
    {file: 'pattern.png', bytes: await readFile(pattern), width: 240, height: 160},
    {file: 'sample.mp4', bytes: await readFile(video), width: 320, height: 240, frames: 6},
  ], start.source.bindingSha256);
  const whole = {x: 0, y: 0, width: 1, height: 1};
  Object.assign(fixture.manifest.beats[0]!.shots[0]!, {panels: [
    {x: 0, y: 0, width: .5, height: 1, fit: 'cover', crop: whole,
      cropEnd: {x: .2, y: .05, width: .6, height: .9}},
    {x: .5, y: 0, width: .5, height: 1, fit: 'contain', crop: whole, mediaId: 'clip-1', reveal: .5,
      motion: {from: {x: .6, y: .35, width: .4, height: .5}, start: .5, end: .9}},
    {...whole, crop: whole, reveal: 1},
  ]});
  await fixture.approve(fixture.manifest);
  const baseline = await run(['render', '--workspace', workspace, '--spec', fixture.spec, '--review', fixture.review,
    '--out', join(root, 'baseline'), '--skip-stills']);
  expect(baseline).toMatchObject({fullDecodePassed: true, frames: 12});
  const pointer = await readFile(pointerPath);
  const reviewPath = join(root, 'video-review.json');
  await writeFile(reviewPath, canonical({schemaVersion: 'candidate-review/1.0', stage: 'video', reviewer: 'TEST_ONLY',
    candidateSha256: baseline.candidateSha256, verdict: 'REVISE', coverage: 'partial-av', findings: ['Widen the source framing.']}));
  const args = ['--workspace', workspace, '--task', baseline.taskId];
  await run(['review', ...args, '--review', reviewPath], true);
  const context = await run(['feedback-context', ...args], true);
  const prior = stateSnapshot(data);
  const quality = (spec?: string) => run(['quality', ...args, ...(spec === undefined ? [] : ['--spec', spec])], true);

  const report = await quality();
  expect(report).toMatchObject({schemaVersion: 'showcase-crop-quality/1.0', baseline: context.baseline,
    currentGeometryVersion: 'showcase-viewport/1.0', savedEnvironmentSha256: context.savedEnvironmentSha256,
    freshMediaProbe: false, proposedComposition: null, revisionPlanSha256: null,
    pixelBudget: {outputPixels: {width: 1080, height: 1920},
      assumedPhone: {widthCssPixels: 360, heightCssPixels: 640, devicePixelRatio: 1}, warningScaleAbove: 1},
  });
  expect(await quality()).toEqual(report);
  expect(await run(['quality', '--data', data, '--task', baseline.taskId], true)).toEqual(report);
  expect(report.baselineComposition.shots).toMatchObject([
    {startFrame: 0, endFrameExclusive: 6, panels: [
      {mediaId: 'clip-0', sourcePixels: {width: 240, height: 160}, firstVisibleFrame: 0,
        worstEnlargement: {frame: 5}, warnings: ['output-upscaling', 'phone-upscaling', 'cover-clipping']},
      {mediaId: 'clip-1', sourcePixels: {width: 320, height: 240}, firstVisibleFrame: 3, visibleFrameCount: 3,
        worstEnlargement: {frame: 5}, warnings: ['output-upscaling']},
      {firstVisibleFrame: null, visibleFrameCount: 0, warnings: ['never-visible']},
    ]},
    {startFrame: 6, endFrameExclusive: 12, panels: [{mediaId: 'clip-1', worstEnlargement: {frame: 6}}]},
  ]);
  const shot = context.beats[0].shots[0];
  const plan = {schemaVersion: 'showcase-revision-plan/1.0', baseline: context.baseline,
    feedback: {text: 'Widen the source framing.', origin: 'independent-review', interpretedBy: 'current-session-agent',
      interpretation: 'Use contain fitting after removing the animated crop.', videoReviewSha256: context.videoReviews[0].sha256},
    scriptShots: ['Preserve the complete color pattern.', 'Synthetic moving bars.'],
    shots: [{beatId: 'line1', shotIndex: 0, expectedShotSha256: shot.expectedShotSha256, reason: 'Preserve the crop context',
      replacement: {...shot.shot, panels: [{...whole, crop: whole, fit: 'contain'}]}}],
  };
  const planPath = join(root, 'plan.json');
  await writeFile(planPath, canonical({...plan, baseline: {...context.baseline, candidateSha256: '0'.repeat(64)}}));
  await expect(quality(planPath)).rejects.toThrow('Stale or different');
  await writeFile(planPath, canonical({...plan, feedback: {...plan.feedback, videoReviewSha256: '0'.repeat(64)}}));
  await expect(quality(planPath)).rejects.toThrow('digest does not belong');
  await writeFile(planPath, canonical({...plan, shots: [{...plan.shots[0], expectedShotSha256: '0'.repeat(64)}]}));
  await expect(quality(planPath)).rejects.toThrow('Unknown or stale shot selector');
  const planBytes = canonical(plan);
  await writeFile(planPath, planBytes);
  const proposed = await quality(planPath);
  expect(proposed).toMatchObject({baselineComposition: report.baselineComposition, revisionPlanSha256: sha256(planBytes),
    proposedComposition: {shots: [{panels: [
      {mediaId: 'clip-0', fit: 'contain', worstEnlargement: {frame: 0}, worstCoverClipping: null},
    ]}, report.baselineComposition.shots[1]]},
  });
  expect(await quality(planPath)).toEqual(proposed);

  await writeFile(pointerPath, canonical({...JSON.parse(pointer.toString()), candidateSha256: 'f'.repeat(64)}));
  try { await expect(quality()).rejects.toThrow('stale or belongs'); }
  finally { await writeFile(pointerPath, pointer); }
  const sourceTask = prior.tasks.find(task => task.id === context.baseline.sourceTaskId)!;
  const sourceArtifact = sourceTask.outputs.find(output => output.sha256 === fixture.manifest.media[0]!.sha256)!;
  const casPath = new ArtifactStore(data).path(sourceArtifact);
  const original = await readFile(casPath);
  await writeFile(casPath, Buffer.alloc(original.length));
  try { await expect(quality()).rejects.toThrow('missing or damaged'); }
  finally { await writeFile(casPath, original); }
  expect(stateSnapshot(data)).toEqual(prior);
  expect(await readFile(pointerPath)).toEqual(pointer);

  // Retain actual decoded output frames and a phone-sized strip for independent visual comparison.
  const movie = join(baseline.output.bundle, 'review.mp4');
  const frames = [0, 3, 5, 11];
  const pngs = [];
  for (const frame of frames) {
    const path = join(root, 'output-' + frame + '.png');
    await command(ffmpeg, ['-v', 'error', '-i', movie, '-vf', 'select=eq(n\\,' + frame + ')',
      '-frames:v', '1', '-threads', '1', path], {signal});
    pngs.push(path);
  }
  const phoneStrip = join(root, 'phone-contact.png');
  await command(ffmpeg, ['-v', 'error', ...pngs.flatMap(path => ['-i', path]), '-filter_complex_threads', '1',
    '-filter_complex', '[0:v]scale=360:640[a];[1:v]scale=360:640[b];[2:v]scale=360:640[c];[3:v]scale=360:640[d];[a][b][c][d]hstack=inputs=4',
    '-frames:v', '1', '-threads', '1', phoneStrip], {signal});
  await writeFile(join(root, 'crop-quality.json'), canonical(report));
  await writeFile(join(root, 'crop-quality-proposed.json'), canonical(proposed));
  await writeFile(join(root, 'crop-quality-evidence.json'), canonical({candidateSha256: baseline.candidateSha256,
    frames, outputPngSha256: await Promise.all(pngs.map(async path => sha256(await readFile(path)))),
    phoneContactSha256: sha256(await readFile(phoneStrip))}));

  fixture.manifest.media[0]!.width++;
  await fixture.approve(fixture.manifest);
  await expect(run(['render', '--workspace', workspace, '--spec', fixture.spec, '--review', fixture.review, '--skip-stills']))
    .rejects.toThrow('Real source media metadata differs: clip-0');
  expect(await readFile(pointerPath)).toEqual(pointer);
}, 250_000);

