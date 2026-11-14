import {lstat, mkdir, mkdtemp, readFile, rename, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {command} from '../src/core/process.js';
import {canonical, fileHash} from '../src/core/util.js';
import {ffmpegPath, ffprobePath, projectRoot} from '../src/providers/local.js';
import {fixtureCommit, fixtureQuote, fixtureRepository} from './first-owner-cli-preload.js';
import {narrativeAuthorFixture} from './narrative-author-fixture.js';

const editedScene = 'match-route';
const sourceScenes = ['send-request', editedScene, 'return-body'];
const expectedFrames = 540;
const signal = new AbortController().signal;

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8'));
}

// Pass ordinary OS/tool configuration. No synthesis, provider credentials, or owner-local profile overrides enter this child.
function cliEnvironment() {
  const allowed = /^(path|systemroot|windir|comspec|temp|tmp|tmpdir|home|userprofile|localappdata|appdata|programdata|programfiles(?:\(x86\))?|programw6432|lang|lc_all|gve_browser|gve_ffmpeg|gve_ffprobe)$/i;
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.test(key)));
}

async function writeFixtureReview(path: string, authorSha256: string, ownerFixtureApproval = true) {
  await writeFile(path, canonical({
    schemaVersion: 'candidate-review/1.0',
    candidateSha256: authorSha256,
    stage: 'script',
    reviewer: 'TEST ONLY synthetic receipt for CLI contract verification',
    verdict: 'PASS',
    coverage: 'script',
    findings: [],
    ...(ownerFixtureApproval ? {ownerApprovedSha256: authorSha256} : {}),
  }), {flag: 'wx'});
}

async function verifyVideo(path: string) {
  const ffprobe = await command(ffprobePath(), [
    '-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,codec_name,nb_read_frames', '-of', 'json', path,
  ], {signal, timeout: 60_000});
  const report = JSON.parse(ffprobe);
  expect(report.streams).toEqual([{codec_name: 'h264', codec_type: 'video', nb_read_frames: String(expectedFrames)}]);
  await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-i', path, '-f', 'null', '-'], {signal, timeout: 60_000});
  return {...report, fullDecodeExit: 0, sha256: await fileHash(path)};
}

it('starts at a URL, stops for exact script review, then imports and edits a self-contained silent preview through the CLI', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gve-fo-'));
  console.log('TEST ONLY first-owner technical evidence: ' + root);
  const workspace = join(root, 'w');
  const author = join(workspace, 'author');
  const pack = join(root, 'p');
  const importedWorkspace = join(root, 'i');
  const hidden = join(root, 'hidden');
  const options = {cwd: projectRoot, signal, inheritEnv: false as const, timeout: 240_000};
  const invoke = (args: string[], capture = false, mediaUnavailable = false) => {
    const missing = join(root, 'intentionally-unavailable-tool');
    return command(process.execPath, ['--import', 'tsx', '--import', './tests/first-owner-cli-preload.ts', 'src/cli.ts', ...args], {
      ...options,
      env: {
        ...cliEnvironment(),
        GVE_TEST_FIXTURE_GITHUB: capture ? 'capture' : 'offline',
        ...(mediaUnavailable ? {GVE_BROWSER: missing, GVE_FFMPEG: missing, GVE_FFPROBE: missing} : {}),
      },
    });
  };
  async function runCli(name: string, args: string[], settings: {capture?: boolean; mediaUnavailable?: boolean} = {}) {
    const stdout = await invoke(args, settings.capture, settings.mediaUnavailable);
    await writeFile(join(root, name + '.json'), stdout, {flag: 'wx'});
    return JSON.parse(stdout);
  }
  const run = (dir: string, through: string, ...extra: string[]) => [
    'explanation', 'run', '--repo', fixtureRepository, '--workspace', dir, '--author', join(dir, 'author'), '--through', through, ...extra,
  ];
  const status = (dir: string) => ['explanation', 'workspace-status', '--workspace', dir];

  const first = await runCli('intake', ['explanation', 'run', '--repo', fixtureRepository, '--workspace', workspace],
    {capture: true, mediaUnavailable: true});
  expect(first).toMatchObject({
    status: 'awaiting-session-agent', binding: {repository: fixtureRepository, commit: fixtureCommit}, modelCalls: 0,
    approval: 'none', requiredFiles: expect.arrayContaining(['creative-brief.json']),
    agentHandoff: {executor: 'current-session-agent', userAuthorJsonRequired: false, automaticModelDispatch: false},
  });
  const guide = await readJson(join(first.authoringPacket.bundle, 'authoring-guide.json'));
  const answer = await narrativeAuthorFixture({first, guide, quote: fixtureQuote}, 'silent');
  await mkdir(author);
  const authorFiles = {
    'story.json': answer.storyJson, 'narrative.json': answer.narrativeJson,
    'animation.json': answer.animationJson, 'run.json': answer.runJson,
    'creative-brief.json': canonical({
      schemaVersion: 'creative-brief/1.0', duration: {mode: 'max', maxSeconds: 20},
      style: 'TEST ONLY silent routing diagram', audience: 'Technical fixture', platforms: ['local preview'],
      language: 'en-US', voice: {mode: 'none'}, decision: 'delegated', notes: ['No real creative approval is represented.'],
    }),
  };
  for (const [file, contents] of Object.entries(authorFiles)) await writeFile(join(author, file), contents, {flag: 'wx'});

  const planned = await runCli('planned', first.agentHandoff.resume, {mediaUnavailable: true});
  expect(planned).toMatchObject({status: 'checkpoint-complete', details: {through: 'planning', scriptReview: 'pending'}});
  for (const phase of ['speech', 'animation', 'voice', 'preview']) {
    const paused = await runCli('gated-' + phase, run(workspace, phase), {mediaUnavailable: true});
    expect(paused).toMatchObject({status: 'awaiting-script-review', authorSha256: planned.authorSha256, approval: 'none'});
    expect(Object.keys(paused.tasks).sort()).toEqual(Object.keys(planned.tasks).sort());
    expect(Object.keys(paused.cache).sort()).toEqual(Object.keys(planned.cache).sort());
  }
  await expect(lstat(join(workspace, 'workspace-preview.html'))).rejects.toMatchObject({code: 'ENOENT'});
  await expect(lstat(join(workspace, 'state', 'tts.sqlite'))).rejects.toMatchObject({code: 'ENOENT'});

  const incompleteReview = join(workspace, 'test-only-review-without-owner.json');
  await writeFixtureReview(incompleteReview, planned.authorSha256, false);
  expect(await runCli('owner-gate', run(workspace, 'preview', '--review', incompleteReview), {mediaUnavailable: true}))
    .toMatchObject({status: 'awaiting-owner-approval', approval: 'none'});

  const initialReview = join(workspace, 'test-only-review.json');
  await writeFixtureReview(initialReview, planned.authorSha256);
  const built = await runCli('baseline', run(workspace, 'preview', '--review', initialReview));
  expect(built).toMatchObject({
    status: 'editable-preview-complete', currentFacts: 'pending', ownerAcceptance: 'pending', ownerListening: 'not-applicable',
    details: {narration: 'none', audioTrack: false, movie: {
      currentReview: 'pending', notProducibleScenes: ['gap', 'closing'],
      timeline: {fps: 30, totalFrames: expectedFrames},
    }},
  });
  const baselineMovie = join(built.details.movie.output.bundle, 'excerpt.mp4');
  const baselineMedia = await verifyVideo(baselineMovie);
  const savedStatus = await runCli('baseline-status', status(workspace));
  expect(savedStatus).toMatchObject({status: 'editable-preview-complete', authorState: 'unchanged', ownerAcceptance: 'pending'});
  expect(await readFile(savedStatus.preview, 'utf8')).toContain('Editable preview bundle');
  expect(await readFile(join(built.details.movie.output.bundle, 'parent-plan', 'narrative.json'), 'utf8')).toContain('TEST ONLY silent fixture');

  const exported = await runCli('export', ['explanation', 'project-export', '--workspace', workspace, '--out', pack,
    '--task', built.tasks.silentPreview, '--author', author]);
  expect(exported).toMatchObject({
    previewTaskId: built.tasks.silentPreview, authorBinding: 'reviewed-author-snapshot', localSpeech: 0, approval: 'none',
  });
  const manifestPath = join(pack, 'portable-project.json');
  const manifest = await readJson(manifestPath);
  expect(await fileHash(manifestPath)).toBe(exported.digest);
  expect(manifest.files.some((file: {path: string}) => /\.wav$|\.sqlite(?:$|-)|test-only-review|private|\.env/.test(file.path))).toBe(false);
  const originalReview = await readFile(initialReview);
  await rename(workspace, hidden);
  try {
    await expect(lstat(initialReview)).rejects.toMatchObject({code: 'ENOENT'});
    const imported = await runCli('import', ['explanation', 'project-import', '--package', pack, '--digest', exported.digest,
      '--workspace', importedWorkspace]);
    expect(imported).toMatchObject({previewTaskId: built.tasks.silentPreview, resumable: true, approval: 'none'});
    await expect(lstat(join(importedWorkspace, 'state', 'tts.sqlite'))).rejects.toMatchObject({code: 'ENOENT'});
    const restoredReview = join(importedWorkspace, 'script-review.json');
    expect(imported.resume).toEqual(run(importedWorkspace, 'preview', '--review', restoredReview));
    expect(await readFile(restoredReview)).toEqual(originalReview);
    for (const [file, contents] of Object.entries(authorFiles)) {
      expect(await readFile(join(importedWorkspace, 'author', file), 'utf8')).toBe(contents);
    }
    const restored = await runCli('offline-replay', imported.resume);
    expect(restored).toMatchObject({
      status: 'editable-preview-complete', authorSha256: planned.authorSha256,
      tasks: built.tasks, cache: {narrative: true, silentPreview: true},
    });
    expect(restored.cache.scenes.every((scene: {sourcePreview: boolean}) => scene.sourcePreview)).toBe(true);
    await expect(lstat(join(importedWorkspace, 'state', 'tts.sqlite'))).rejects.toMatchObject({code: 'ENOENT'});
    const restoredMovie = join(restored.details.movie.output.bundle, 'excerpt.mp4');
    expect(await fileHash(restoredMovie)).toBe(baselineMedia.sha256);
    const restoredStatus = await runCli('restored-status', status(importedWorkspace));
    expect(restoredStatus).toMatchObject({task: built.tasks.silentPreview, authorState: 'unchanged', ownerAcceptance: 'pending'});
    expect(restoredStatus.resume.at(-1)).toBe(join(restored.attempt, 'script-review.json'));

    const restoredBrief = join(importedWorkspace, 'author', 'creative-brief.json');
    const previousBrief = await readJson(restoredBrief);
    await writeFile(restoredBrief, canonical({...previousBrief, style: 'TEST ONLY revised style'}));
    await expect(invoke(imported.resume, false, true)).rejects.toThrow('Review belongs to another candidate or stage');
    await writeFile(restoredBrief, authorFiles['creative-brief.json']);

    const animated = join(importedWorkspace, 'author', 'animation.json');
    const nextAnimation = await readJson(animated);
    nextAnimation.shots.find((shot: {shotId: string}) => shot.shotId === editedScene).objects[1].label = 'Revised test handler';
    await writeFile(animated, canonical(nextAnimation));
    const editedStatus = await runCli('changed-status', status(importedWorkspace));
    expect(editedStatus).toMatchObject({authorState: 'changed', ownerAcceptance: 'pending'});
    expect(editedStatus.resume).not.toContain('--review');
    await expect(invoke(imported.resume, false, true)).rejects.toThrow('Review belongs to another candidate or stage');
    const editedDraft = await runCli('edited-gate', run(importedWorkspace, 'preview'), {mediaUnavailable: true});
    expect(editedDraft).toMatchObject({status: 'awaiting-script-review', tasks: {narrative: built.tasks.narrative}});
    expect(editedDraft.authorSha256).not.toBe(planned.authorSha256);

    const newReview = join(importedWorkspace, 'edited-test-only-review.json');
    await writeFixtureReview(newReview, editedDraft.authorSha256);
    const edited = await runCli('edited', run(importedWorkspace, 'preview', '--review', newReview));
    expect(edited).toMatchObject({
      status: 'editable-preview-complete', authorSha256: editedDraft.authorSha256, ownerAcceptance: 'pending',
      cache: {narrative: true, silentPreview: false},
    });
    expect(edited.tasks.silentPreview).not.toBe(built.tasks.silentPreview);
    for (const scene of sourceScenes) {
      const key = 'sourcePreview.' + scene;
      const cached = edited.cache.scenes.find((entry: {sceneId: string}) => entry.sceneId === scene).sourcePreview;
      if (scene === editedScene) {
        expect(edited.tasks[key]).not.toBe(built.tasks[key]);
        expect(cached).toBe(false);
      } else {
        expect(edited.tasks[key]).toBe(built.tasks[key]);
        expect(cached).toBe(true);
      }
    }
    const editedMedia = await verifyVideo(join(edited.details.movie.output.bundle, 'excerpt.mp4'));
    await expect(lstat(join(importedWorkspace, 'state', 'tts.sqlite'))).rejects.toMatchObject({code: 'ENOENT'});
    expect(editedMedia.sha256).not.toBe(baselineMedia.sha256);
    expect(await fileHash(restoredMovie)).toBe(baselineMedia.sha256);
    expect(await fileHash(manifestPath)).toBe(exported.digest);
    expect(await readFile(join(pack, 'author', 'animation.json'), 'utf8')).toBe(authorFiles['animation.json']);
    await writeFile(join(root, 'video-verification.json'), canonical({fixture: 'TEST ONLY; no real approval or source fetch',
      baseline: baselineMedia, edited: editedMedia, restoredSha256: await fileHash(restoredMovie),
      originalWorkspaceUnavailable: true, freshSceneCount: 1, reusedSceneCount: 2}));
  } finally {
    await rename(hidden, workspace);
  }
  expect(await fileHash(baselineMovie)).toBe(baselineMedia.sha256);
}, 420_000);
