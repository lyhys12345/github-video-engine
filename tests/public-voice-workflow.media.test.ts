import {lstat, mkdir, mkdtemp, readFile, rename, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {command} from '../src/core/process.js';
import {canonical, fileHash, sha256} from '../src/core/util.js';
import {ffmpegPath, ffprobePath, projectRoot} from '../src/providers/local.js';
import {fixtureCommit, fixtureQuote, fixtureRepository} from './first-owner-cli-preload.js';
import {narrativeAuthorFixture} from './narrative-author-fixture.js';

const scenes = ['send-request', 'match-route', 'return-body'];
const changedScene = 'match-route';
const lines = ['A request arrives.', 'A route matches.', 'A reply returns.'];
const editedLine = 'The handler runs.';
const frames = 540;
const sampleRate = 48000;
const signal = new AbortController().signal;

interface Recording {
  beatId: string;
  transcript: string;
  transcriptSha256: string;
  pcmSha256: string;
  sourceAudioSha256: string;
  receiptFingerprint: string;
  generationManifestSha256: string;
  startSample: number;
  endSample: number;
  sampleCount: number;
  decodedCompleteSamples: number;
  playbackRate: number;
  sourceSceneInterval: {startFrame: number; endFrame: number};
}

interface VoiceCache {
  sceneId: string;
  generation: boolean;
  import: boolean;
  generationTaskId: string;
  receiptFingerprint: string;
}

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function approveFixture(path: string, candidateSha256: string) {
  await writeFile(path, canonical({
    schemaVersion: 'candidate-review/1.0',
    candidateSha256,
    ownerApprovedSha256: candidateSha256,
    stage: 'script',
    reviewer: 'TEST ONLY exact receipt for synthetic public-voice fixture',
    verdict: 'PASS',
    coverage: 'script',
    findings: [],
  }), {flag: 'wx'});
}

async function verifyMovie(bundle: string, screenshot: string) {
  const movie = join(bundle, 'excerpt.mp4');
  const options = {signal, timeout: 90_000};
  const probe = JSON.parse(await command(ffprobePath(), [
    '-v', 'error', '-count_frames',
    '-show_entries', 'stream=codec_type,codec_name,nb_read_frames,sample_rate,channels,duration',
    '-of', 'json', movie,
  ], options));
  expect(probe.streams).toEqual([
    expect.objectContaining({codec_type: 'video', codec_name: 'h264', nb_read_frames: String(frames)}),
    expect.objectContaining({codec_type: 'audio', codec_name: 'aac', sample_rate: String(sampleRate), channels: 1}),
  ]);
  for (const stream of probe.streams) expect(Number(stream.duration)).toBeCloseTo(frames / 30, 1);
  await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-i', movie,
    '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], options);
  await command(ffmpegPath(), ['-v', 'error', '-xerror', '-nostdin', '-n', '-ss', '7.2', '-i', movie,
    '-frames:v', '1', '-update', '1', screenshot], options);

  const ledger = await readJson(join(bundle, 'audio-ledger.json'));
  expect(ledger).toMatchObject({language: 'en-US', sampleRate, samples: frames * 1600, playbackRate: 1,
    speechContent: 'unverified', speechAlignment: 'unverified', ownerListening: 'pending'});
  const recordings: Recording[] = ledger.recordings;
  expect(recordings.map(record => record.beatId)).toEqual(scenes);
  const pcm = await readFile(join(bundle, 'voice', 'narration.pcm'));
  expect(pcm.length).toBe(frames * 1600 * 2);
  expect(sha256(pcm)).toBe(ledger.pcmSha256);

  let previousEnd = 0;
  for (const record of recordings) {
    expect(record.transcriptSha256).toBe(sha256(record.transcript));
    expect(record.startSample).toBe(record.sourceSceneInterval.startFrame * 1600);
    expect(record.endSample).toBeLessThanOrEqual(record.sourceSceneInterval.endFrame * 1600);
    expect(record.endSample - record.startSample).toBe(record.sampleCount);
    expect(record.decodedCompleteSamples).toBe(record.sampleCount);
    expect(record.playbackRate).toBe(1);
    expect(sha256(pcm.subarray(record.startSample * 2, record.endSample * 2))).toBe(record.pcmSha256);
    expect(pcm.subarray(record.startSample * 2, record.endSample * 2).some(sample => sample !== 0)).toBe(true);
    expect(pcm.subarray(previousEnd * 2, record.startSample * 2).every(sample => sample === 0)).toBe(true);
    expect(await fileHash(join(bundle, 'voice', 'audio', record.beatId + '.bin'))).toBe(record.sourceAudioSha256);
    const generationPath = join(bundle, 'voice', 'generation', record.beatId + '.json');
    expect(await fileHash(generationPath)).toBe(record.generationManifestSha256);
    expect(await readJson(generationPath)).toMatchObject({
      schemaVersion: 'qwen-public-generation/1.0', engineRemoteDispatch: 'none', textSha256: record.transcriptSha256,
      input: {text: record.transcript, speaker: 'Ryan', language: 'en-US', repository: 'Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice',
        revision: '85e237c12c027371202489a0ec509ded67b5e4b5', license: 'Apache-2.0'},
      audio: {mediaType: 'audio/wav', sha256: record.sourceAudioSha256, sampleRate: 16_000, samples: record.sampleCount / 3},
    });
    previousEnd = record.endSample;
  }
  expect(pcm.subarray(previousEnd * 2).every(sample => sample === 0)).toBe(true);
  return {streams: probe.streams, fullDecodeExit: 0, sha256: await fileHash(movie), recordings, screenshot};
}

it.skipIf(process.env.GVE_PUBLIC_VOICE_MEDIA !== '1')(
  'synthesizes a public voiced CLI preview, replays a portable copy without voice setup, and revoices one approved edit',
  async () => {
    const profile = process.env.GVE_QWEN_PUBLIC_PROFILE;
    if (!profile) throw new Error('Set GVE_QWEN_PUBLIC_PROFILE to the prepared public profile for this opt-in test.');
    const profileBytes = await readFile(profile);
    const root = await mkdtemp(join(tmpdir(), 'gve-pv-'));
    console.log('TEST ONLY real public-voice CLI evidence: ' + root);
    const workspace = join(root, 'w');
    const author = join(workspace, 'author');
    const packageDir = join(root, 'p');
    const importedWorkspace = join(root, 'i');
    const hidden = join(root, 'hidden');
    const importedAuthor = join(importedWorkspace, 'author');
    const missingProfile = join(root, 'intentionally-unavailable-profile.json');
    const missingTool = join(root, 'intentionally-unavailable-media-tool');
    const allowed = /^(path|systemroot|windir|comspec|temp|tmp|tmpdir|home|userprofile|localappdata|appdata|programdata|programfiles(?:\(x86\))?|programw6432|lang|lc_all|gve_browser|gve_ffmpeg|gve_ffprobe)$/i;
    const osEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.test(key)));
    const invoke = (args: string[], settings: {capture?: boolean; noVoice?: boolean; noMedia?: boolean} = {}) =>
      command(process.execPath, ['--import', 'tsx', '--import', './tests/first-owner-cli-preload.ts', 'src/cli.ts', ...args], {
        cwd: projectRoot, signal, timeout: 480_000, inheritEnv: false,
        env: {
          ...osEnvironment,
          GVE_TEST_FIXTURE_GITHUB: settings.capture ? 'capture' : 'offline',
          GVE_QWEN_PUBLIC_PROFILE: settings.noVoice ? missingProfile : profile,
          ...(settings.noMedia ? {GVE_BROWSER: missingTool, GVE_FFMPEG: missingTool, GVE_FFPROBE: missingTool} : {}),
        },
      });
    async function runCli(name: string, args: string[], settings?: Parameters<typeof invoke>[1]) {
      try {
        const stdout = await invoke(args, settings);
        await writeFile(join(root, name + '.json'), stdout, {flag: 'wx'});
        return JSON.parse(stdout);
      } catch (error) {
        await writeFile(join(root, name + '.error.txt'), String(error), {flag: 'wx'});
        throw error;
      }
    }
    const run = (dir: string, through: string, ...extra: string[]) => [
      'explanation', 'run', '--repo', fixtureRepository, '--workspace', dir,
      '--author', join(dir, 'author'), '--through', through, ...extra,
    ];

    const first = await runCli('intake', ['explanation', 'run', '--repo', fixtureRepository, '--workspace', workspace],
      {capture: true, noVoice: true, noMedia: true});
    expect(first).toMatchObject({status: 'awaiting-session-agent',
      binding: {repository: fixtureRepository, commit: fixtureCommit}, modelCalls: 0, approval: 'none'});
    const guide = await readJson(join(first.authoringPacket.bundle, 'authoring-guide.json'));
    const fixture = await narrativeAuthorFixture({first, guide, quote: fixtureQuote}, 'silent');
    const story = JSON.parse(fixture.storyJson);
    const plan = JSON.parse(fixture.narrativeJson);
    const config = JSON.parse(fixture.runJson);
    async function writeAuthor(dir: string, edited: boolean) {
      const transcripts = new Map(scenes.map((scene, index) => [scene, edited && scene === changedScene ? editedLine : lines[index]!]));
      for (const shot of story.shots) shot.narration = transcripts.get(shot.id);
      for (const scene of plan.scenes) if (transcripts.has(scene.id)) scene.narration = transcripts.get(scene.id);
      config.speech = [...transcripts].map(([sceneId, narration]) => ({
        sceneId, captions: [{startChar: 0, endChar: [...narration].length, startSample: 0, endSample: '$FULL_RECORDING_SAMPLES'}],
      }));
      for (const [name, contents] of Object.entries({'story.json': story, 'narrative.json': plan, 'run.json': config})) {
        await writeFile(join(dir, name), canonical(contents));
      }
    }
    plan.brief.title = 'TEST ONLY public voice fixture';
    await mkdir(author);
    await writeAuthor(author, false);
    await writeFile(join(author, 'animation.json'), fixture.animationJson);
    await writeFile(join(author, 'creative-brief.json'), canonical({
      schemaVersion: 'creative-brief/1.0', duration: {mode: 'max', maxSeconds: 20},
      style: 'TEST ONLY routing diagram with public preset', audience: 'Technical fixture', platforms: ['local preview'],
      language: 'en-US', voice: {mode: 'local', profile: 'qwen-public'}, decision: 'delegated',
      notes: ['No real creative approval is represented.'],
    }));

    const gated = await runCli('gated', run(workspace, 'preview'), {noVoice: true, noMedia: true});
    expect(gated).toMatchObject({status: 'awaiting-script-review', approval: 'none'});
    await expect(lstat(join(workspace, 'state', 'tts.sqlite'))).rejects.toMatchObject({code: 'ENOENT'});
    await expect(lstat(join(workspace, 'workspace-preview.html'))).rejects.toMatchObject({code: 'ENOENT'});

    const review = join(workspace, 'test-only-script-review.json');
    await approveFixture(review, gated.authorSha256);
    const speech = await runCli('baseline-speech', run(workspace, 'speech', '--review', review));
    expect(speech).toMatchObject({status: 'checkpoint-complete', modelCalls: 0, approval: 'none', details: {
      through: 'speech', animationRendered: false, timing: {readyForAnimation: true, allRecordingsFit: true,
        totalFrames: frames, captionValidation: {status: 'valid'}, scenes: scenes.map(sceneId => ({
          sceneId, fits: true, generation: false, import: false, source: 'generated',
        }))},
    }});
    const baseline = await runCli('baseline', run(workspace, 'preview', '--review', review));
    expect(baseline).toMatchObject({status: 'editable-preview-complete', ownerListening: 'pending', ownerAcceptance: 'pending',
      currentFacts: 'pending', modelCalls: 0, details: {narration: 'local', movie: {timeline: {fps: 30, totalFrames: frames}}},
      cache: {voice: scenes.map(sceneId => ({sceneId, generation: true, import: true}))}});
    const baselineBundle: string = baseline.details.movie.output.bundle;
    const baselineMedia = await verifyMovie(baselineBundle, join(root, 'baseline-frame.png'));
    expect(baselineMedia.recordings.map(record => record.transcript)).toEqual(lines);

    const builtTask: string = baseline.tasks.narratedPreview;
    const exported = await runCli('export', ['explanation', 'project-export', '--workspace', workspace, '--out', packageDir,
      '--task', builtTask, '--author', author], {noVoice: true});
    expect(exported).toMatchObject({previewTaskId: builtTask, localSpeech: scenes.length,
      authorBinding: 'reviewed-author-snapshot', approval: 'none'});
    const manifestPath = join(packageDir, 'portable-project.json');
    const manifest = await readJson(manifestPath);
    expect(await fileHash(manifestPath)).toBe(exported.digest);
    const packageFiles: {path: string; sha256: string}[] = manifest.files;
    expect(packageFiles.some(file => /\.(?:safetensors|whl|exe|py|sqlite)(?:$|-)|(?:^|\/)(?:\.env|profile|model)(?:[./-]|$)|test-only-script-review/i.test(file.path))).toBe(false);
    const generatedWavs = packageFiles.filter(file => file.path.endsWith('.wav'));
    expect(generatedWavs.map(file => file.sha256).sort()).toEqual(baselineMedia.recordings.map(record => record.sourceAudioSha256).sort());
    const profileData = JSON.parse(profileBytes.toString('utf8'));
    const stateRows = await readFile(join(packageDir, 'state', 'tasks-rows.json'), 'utf8');
    for (const assetPath of [profile, profileData.pythonPath, profileData.modelPath]) {
      expect(stateRows).not.toContain(JSON.stringify(assetPath).slice(1, -1));
    }
    const replayReview = await readFile(review);
    await rename(workspace, hidden);
    try {
      await expect(lstat(review)).rejects.toMatchObject({code: 'ENOENT'});
      await expect(lstat(missingProfile)).rejects.toMatchObject({code: 'ENOENT'});
      const imported = await runCli('import', ['explanation', 'project-import', '--package', packageDir, '--digest',
        exported.digest, '--workspace', importedWorkspace], {noVoice: true});
      expect(imported).toMatchObject({previewTaskId: builtTask, localSpeech: scenes.length, approval: 'none', resumable: true});
      const importedReview = join(importedWorkspace, 'script-review.json');
      expect(await readFile(importedReview)).toEqual(replayReview);
      expect(imported.resume).toEqual(run(importedWorkspace, 'preview', '--review', importedReview));
      const restored = await runCli('offline-replay', imported.resume, {noVoice: true});
      expect(restored).toMatchObject({status: 'editable-preview-complete', authorSha256: gated.authorSha256, tasks: baseline.tasks,
        cache: {narrative: true, narratedPreview: true, voice: scenes.map(sceneId => ({sceneId, generation: true, import: true}))}});
      const restoredMovie = join(restored.details.movie.output.bundle, 'excerpt.mp4');
      expect(await fileHash(restoredMovie)).toBe(baselineMedia.sha256);

      await writeAuthor(importedAuthor, true);
      const changedStatus = await runCli('changed-status', ['explanation', 'workspace-status', '--workspace', importedWorkspace],
        {noVoice: true});
      expect(changedStatus).toMatchObject({authorState: 'changed', ownerAcceptance: 'pending', ownerListening: 'pending'});
      expect(changedStatus.resume).not.toContain('--review');
      await expect(runCli('stale-receipt', imported.resume, {noVoice: true, noMedia: true}))
        .rejects.toThrow('Review belongs to another candidate or stage');
      const editedGate = await runCli('edited-gate', run(importedWorkspace, 'preview'), {noVoice: true, noMedia: true});
      expect(editedGate).toMatchObject({status: 'awaiting-script-review', approval: 'none'});
      expect(editedGate.authorSha256).not.toBe(gated.authorSha256);

      const editedReview = join(importedWorkspace, 'edited-test-only-review.json');
      await approveFixture(editedReview, editedGate.authorSha256);
      const edited = await runCli('edited', run(importedWorkspace, 'preview', '--review', editedReview));
      expect(edited).toMatchObject({status: 'editable-preview-complete', authorSha256: editedGate.authorSha256,
        ownerAcceptance: 'pending', ownerListening: 'pending', cache: {narratedPreview: false}});
      expect(edited.tasks.narratedPreview).not.toBe(builtTask);
      const editedMedia = await verifyMovie(edited.details.movie.output.bundle, join(root, 'edited-frame.png'));
      expect(editedMedia.sha256).not.toBe(baselineMedia.sha256);
      const originalCache: VoiceCache[] = baseline.cache.voice;
      const editedCache: VoiceCache[] = edited.cache.voice;
      for (const [index, sceneId] of scenes.entries()) {
        const before = baselineMedia.recordings[index]!;
        const after = editedMedia.recordings[index]!;
        const prior = originalCache[index]!;
        const next = editedCache[index]!;
        expect(next.sceneId).toBe(sceneId);
        if (sceneId === changedScene) {
          expect(next).toMatchObject({generation: false, import: false});
          expect(next.generationTaskId).not.toBe(prior.generationTaskId);
          expect(next.receiptFingerprint).not.toBe(prior.receiptFingerprint);
          expect(after).toMatchObject({transcript: editedLine});
          expect(after.sourceAudioSha256).not.toBe(before.sourceAudioSha256);
        } else {
          expect(next).toEqual(prior);
          expect(after).toEqual(before);
        }
      }
      expect(await fileHash(restoredMovie)).toBe(baselineMedia.sha256);
      expect(await fileHash(manifestPath)).toBe(exported.digest);
      for (const file of packageFiles) expect(await fileHash(join(packageDir, ...file.path.split('/')))).toBe(file.sha256);
      expect(await readFile(profile)).toEqual(profileBytes);
      await writeFile(join(root, 'public-voice-media-verification.json'), canonical({
        fixture: 'TEST ONLY synthetic repository and script; built-in Qwen English public preset',
        baseline: baselineMedia, edited: editedMedia, restoredSha256: await fileHash(restoredMovie),
        packageDigest: exported.digest, sourceWorkspaceUnavailableDuringImport: true,
        profileUnavailableDuringOfflineReplay: true, synthesizedEditScenes: 1, reusedEditRecordings: 2,
        ownerListening: 'pending', continuousPerceptualAv: 'unverified', ownerAcceptance: 'pending',
      }), {flag: 'wx'});
    } finally {
      await rename(hidden, workspace);
    }
    expect(await fileHash(join(baselineBundle, 'excerpt.mp4'))).toBe(baselineMedia.sha256);
  },
  900_000,
);
