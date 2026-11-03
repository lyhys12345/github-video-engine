import {execFile, fork, spawn} from 'node:child_process';
import {mkdir, readFile, readdir, rename, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {expect, it} from 'vitest';
import {ArtifactStore} from '../src/assets/store.js';
import {StorySchema} from '../src/contracts/story.js';
import {EngineError} from '../src/core/errors.js';
import {command} from '../src/core/process.js';
import {sha256} from '../src/core/util.js';
import {ffmpegPath} from '../src/providers/local.js';
import {storyCommand} from '../src/story-planner/cli.js';
import {renderStoryPreview} from '../src/story-planner/preview.js';
import {readTask} from '../src/story-planner/runtime.js';
import {workflowCommand} from '../src/workflow/cli.js';
import {WorkflowStore} from '../src/workflow/store.js';
import {until} from './support.js';
import {workflowRoot} from './workflow-support.js';

const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const run = promisify(execFile);
const cli = (...args: string[]) => ['--import', 'tsx', 'src/cli.ts', 'story', ...args];

it('renders, caches and exports a repository-bound preview after original inputs are moved', async () => {
  const root = await workflowRoot('pv');
  const data = join(root, 'state');
  const signal = new AbortController().signal;
  const story = StorySchema.parse(await readJson('examples/http-story-v1/express-story.json'));
  story.shots = [{...story.shots[0]!, narration: 'Test & <fixture>', visualSeconds: 1, transitionSeconds: 0, holdSeconds: 0}];
  story.timing = {fps: 4, chineseCharsPerSecond: 4, wordsPerSecond: 5};
  const animation = await readJson('examples/http-story-v1/express-animation.json');
  animation.shots = animation.shots.slice(0, 1);
  const source = story.evidence.sources[0]!;
  const lines = Array<string>(50).fill('');
  for (const claim of story.evidence.claims) for (const citation of claim.citations) {
    citation.quote.split('\n').forEach((line, index) => { lines[citation.startLine + index - 1] = line; });
  }
  const content = lines.join('\n');
  source.sha256 = sha256(content);
  const store = new WorkflowStore(join(data, 'workflow'));
  try {
    await store.create('preview-test', {
      schemaVersion: '1.0', repository: 'https://github.com/expressjs/express',
      commit: '43fca52d28a422c8be48fd489cbd4f2d6152bab6', name: 'express', description: '',
      defaultBranch: 'master', license: null, fetchedAt: new Date().toISOString(), trust: 'untrusted-data-never-executed',
      documents: [{path: 'Readme.md', url: source.url, content, sha256: source.sha256}],
    });
  } finally { store.close(); }
  const workspace = join(root, 'evidence');
  await workflowCommand(['project', 'evidence'], {data, id: 'preview-test', out: workspace}, signal);
  const spec = join(root, 'story.json');
  const plan = join(root, 'animation.json');
  const voice = join(root, 'voice.json');
  const audio = join(root, 'tone.wav');
  await writeFile(spec, JSON.stringify(story));
  await writeFile(plan, JSON.stringify(animation));
  await command(ffmpegPath(), ['-v', 'error', '-nostdin', '-n', '-f', 'lavfi',
    '-i', 'sine=frequency=440:duration=0.2', audio], {signal});
  const audioHash = sha256(await readFile(audio));
  await writeFile(voice, JSON.stringify({schemaVersion: '1.0', storyId: story.id, voiceLabel: 'Non-speech test tone',
    clips: [{shotId: story.shots[0]!.id, path: audio, sha256: audioHash, transcript: story.shots[0]!.narration}]}));
  const bound = await workflowCommand(['project', 'story'], {data, id: 'preview-test', root: join(workspace, 'bundle'),
    spec, out: join(root, 'bound')}, signal) as {taskId: string};
  const pack = await storyCommand(['story', 'asset-plan'], {task: bound.taskId, data, plan, voice}, signal) as {taskId: string};
  animation.shots[0].objects[0].label = 'Edited request label';
  const revisedPlan = join(root, 'edited-animation.json');
  await writeFile(revisedPlan, JSON.stringify(animation));
  const revisedPack = await storyCommand(['story', 'asset-plan'], {task: bound.taskId, data, plan: revisedPlan, voice}, signal) as {taskId: string};
  expect(revisedPack.taskId).not.toBe(pack.taskId);
  for (const path of [spec, plan, revisedPlan, voice, audio, workspace]) await rename(path, path + '.moved');

  const render = () => storyCommand(['story', 'preview-render'], {task: pack.taskId, data, mode: 'narrated'}, signal);
  const preview = await render() as {taskId: string};
  await expect(render()).resolves.toMatchObject({taskId: preview.taskId, cached: true, review: 'pending'});
  await expect(storyCommand(['story', 'preview-status'], {data, task: preview.taskId}, signal))
    .resolves.toMatchObject({state: 'succeeded', integrity: 'verified', sourceStory: {taskId: bound.taskId}});
  const out = join(root, 'export');
  const exportPreview = async () => JSON.parse((await run(process.execPath,cli('preview-export',
    '--data',data,'--task',preview.taskId,'--out',out))).stdout);
  const first = await exportPreview();
  expect(first).toMatchObject({publication:'receipt-v1',reused:false});
  await expect(exportPreview()).resolves.toEqual({...first,reused:true});
  const bundle = first.bundle;
  const receipt = await readJson(join(bundle, 'preview.json'));
  expect(receipt).toMatchObject({mode: 'narrated', timeline: {fps: 4, totalFrames: 4}, media: {fullDecodeExit: 0},
    voice: {label: 'Non-speech test tone', transcript: 'caller-declared',
      placements: [{sourceSha256: audioHash, startSample: 0, samples: 9_600}]},
    listening: 'UNVERIFIED', ownerAcceptance: 'pending', paidCalls: 0, targetExecution: false});
  expect(receipt.media.probe.streams.map((stream: {codec_name: string}) => stream.codec_name)).toEqual(['h264', 'aac']);
  expect(await readFile(join(bundle, 'captions.vtt'), 'utf8')).toContain('Test &amp; &lt;fixture&gt;');
  expect(sha256(await readFile(join(bundle, 'editable/audio/send-request.bin')))).toBe(audioHash);
  expect(sha256(await readFile(join(bundle, 'preview.mp4')))).toBe(receipt.media.sha256);

  const recoveryOut = join(root, 'export-crash');
  const exportChild = fork('tests/story-preview-export-child.ts', [data, preview.taskId, recoveryOut],
    {execArgv: ['--import', 'tsx'], stdio: ['ignore', 'ignore', 'inherit', 'ipc']});
  const exportExit = new Promise(resolve => exportChild.once('exit', (code, sig) => resolve({code, sig})));
  const exportArgs = ['--task', preview.taskId, '--data', data, '--out', recoveryOut, '--publication', 'legacy-v2'];
  let staged = false;
  exportChild.on('message', message => { staged = message === 'staged'; });
  try {
    await until(async () => staged);
    await expect(run(process.execPath, cli('preview-export', ...exportArgs)))
      .rejects.toMatchObject({stderr: expect.stringContaining('ASSET_EXPORT_BUSY')});
    expect(await readdir(recoveryOut)).not.toContain('bundle');
  } finally { exportChild.kill('SIGKILL'); await exportExit; }
  const stage = (await readdir(recoveryOut)).find(name => name.startsWith('.asset-staging-'))!;
  expect(stage).toBeDefined();
  const userFile = join(recoveryOut, 'user-file.txt');
  await writeFile(userFile, 'keep');
  await expect(run(process.execPath, cli('preview-export', ...exportArgs)))
    .rejects.toMatchObject({stderr: expect.stringContaining('ASSET_EXPORT_EXISTS')});
  expect(await readFile(userFile, 'utf8')).toBe('keep');
  await rename(userFile, join(root, 'user-file.txt'));
  await run(process.execPath, cli('preview-export', ...exportArgs));
  expect(sha256(await readFile(join(recoveryOut, 'bundle/preview.mp4')))).toBe(receipt.media.sha256);
  expect(await readdir(recoveryOut)).toContain(stage);
  await expect(run(process.execPath, cli('preview-export', ...exportArgs)))
    .rejects.toMatchObject({stderr: expect.stringContaining('ASSET_EXPORT_EXISTS')});
  const unknown = join(root, 'unowned');
  await mkdir(unknown);
  await expect(run(process.execPath, cli('preview-export', '--task', preview.taskId, '--data', data, '--out', unknown)))
    .rejects.toMatchObject({stderr: expect.stringContaining('ASSET_EXPORT_EXISTS')});
  expect(await readdir(unknown)).toEqual([]);

  const swappedOut = join(root, 'export-swapped');
  const swappedChild = fork('tests/story-preview-export-child.ts', [data, preview.taskId, swappedOut],
    {execArgv: ['--import', 'tsx'], stdio: ['ignore', 'ignore', 'ignore', 'ipc']});
  const swappedExit = new Promise(resolve => swappedChild.once('exit', (code, sig) => resolve({code, sig})));
  let swappedReady = false;
  swappedChild.on('message', message => { swappedReady = message === 'staged'; });
  try {
    await until(async () => swappedReady);
    const stageName = (await readdir(swappedOut)).find(name => name.startsWith('.asset-staging-'))!;
    const stagePath = join(swappedOut, stageName);
    await rename(stagePath, stagePath + '.saved');
    await mkdir(stagePath);
    const sentinel = join(stagePath, 'user-sentinel.txt');
    await writeFile(sentinel, 'preserve user file', {flag: 'wx'});
    swappedChild.send('abort');
    expect(await swappedExit).toMatchObject({code: 1});
    expect(await readFile(sentinel, 'utf8')).toBe('preserve user file');
    expect(await readdir(swappedOut)).not.toContain('bundle');
  } finally {
    if (swappedChild.exitCode === null && swappedChild.signalCode === null) swappedChild.kill('SIGKILL');
    await swappedExit;
  }

  const publishOut = join(root, 'export-interference');
  const publishChild = fork('tests/story-preview-export-child.ts', [data, preview.taskId, publishOut, 'publish'],
    {execArgv: ['--import', 'tsx'], stdio: ['ignore', 'ignore', 'pipe', 'ipc']});
  const publishExit = new Promise(resolve => publishChild.once('exit', (code, sig) => resolve({code, sig})));
  let publishing = false, publishError = '';
  publishChild.on('message', message => { publishing = message === 'publishing'; });
  publishChild.stderr!.on('data', chunk => { publishError += String(chunk); });
  try {
    await until(async () => publishing);
    const stageName = (await readdir(publishOut)).find(name => name.startsWith('.asset-staging-'))!;
    await writeFile(join(publishOut, stageName, 'user-sentinel.txt'), 'preserved after publication', {flag: 'wx'});
    publishChild.send('continue');
    expect(await publishExit).toMatchObject({code: 1});
    expect(publishError).toContain('ASSET_EXPORT_STAGE');
    expect(await readFile(join(publishOut, 'bundle/user-sentinel.txt'), 'utf8')).toBe('preserved after publication');
  } finally {
    if (publishChild.exitCode === null && publishChild.signalCode === null) publishChild.kill('SIGKILL');
    await publishExit;
  }

  for (const probe of ['receipt', 'receipt-forged', 'receipt-crash', 'receipt-linked'] as const) {
    const versionedOut=join(root,probe);
    const child=fork('tests/story-preview-export-child.ts',[data,preview.taskId,versionedOut,probe],
      {execArgv:['--import','tsx'],stdio:['ignore','ignore','ignore','ipc']});
    const exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
    let event:string|undefined, targetedReceipt:string|undefined;
    child.on('message',message=>{
      if(typeof message==='string')event=message;
      else if(message&&typeof message==='object'&&'stage' in message&&'receipt' in message){
        event=String(message.stage);targetedReceipt=String(message.receipt);
      }
    });
    const args=['--task',preview.taskId,'--data',data,'--out',versionedOut];
    try {
      await until(async()=>event===(probe==='receipt-crash'?'staged':probe==='receipt-linked'?'linked':'publishing'));
      await expect(run(process.execPath,cli('preview-export',...args)))
        .rejects.toMatchObject({stderr:expect.stringContaining('ASSET_EXPORT_BUSY')});
      const version=(await readdir(versionedOut)).find(name=>name.startsWith('.asset-staging-'))!;
      const failedBundle=join(versionedOut,version);
      if(probe==='receipt'){
        const movie=join(failedBundle,'preview.mp4');
        await writeFile(movie,Buffer.alloc((await readFile(movie)).length,1));
        await writeFile(join(failedBundle,'user-sentinel.txt'),'keep');
        child.send('continue');
        expect(await exit).toMatchObject({code:1});
        expect(await readFile(join(failedBundle,'user-sentinel.txt'),'utf8')).toBe('keep');
      } else if(probe==='receipt-forged'){
        await writeFile(targetedReceipt!,'foreign receipt placeholder',{flag:'wx'});
        child.send('continue');
        expect(await exit).toMatchObject({code:1});
        expect(await readFile(targetedReceipt!,'utf8')).toBe('foreign receipt placeholder');
      } else {
        child.kill('SIGKILL');
        expect(await exit).toMatchObject({signal:'SIGKILL'});
      }
      expect(await readdir(versionedOut)).not.toContain('bundle');
      const exported=JSON.parse((await run(process.execPath,cli('preview-export',...args))).stdout);
      expect(exported).toMatchObject({publication:'receipt-v1',bundle:expect.any(String),receipt:expect.any(String),reused:probe==='receipt-linked'});
      if(probe==='receipt-linked'){
        expect(exported.bundle).toBe(failedBundle);
        expect(exported.receipt).toBe(targetedReceipt);
      }else expect(exported.bundle).not.toBe(failedBundle);
      expect(sha256(await readFile(exported.receipt))).toBe(exported.receiptSha256);
      expect(sha256(await readFile(join(exported.bundle,'preview.mp4')))).toBe(receipt.media.sha256);
      expect(await readdir(versionedOut)).toContain(version);
      const repeat=JSON.parse((await run(process.execPath,cli('preview-export',...args))).stdout);
      expect(repeat).toEqual({...exported,reused:true});
    }finally{
      if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
      await exit;
    }
  }

  const revised = await renderStoryPreview(data, revisedPack.taskId, 'narrated', signal);
  expect(revised.taskId).not.toBe(preview.taskId);
  const revisedRecord = await readTask(data, revised.taskId, 'repository-story-preview-v1');
  expect(revisedRecord.outputs.find(output => output.mediaType === 'video/mp4')!.sha256).not.toBe(receipt.media.sha256);
  expect((await readTask(data, preview.taskId, 'repository-story-preview-v1')).outputs
    .find(output => output.mediaType === 'video/mp4')!.sha256).toBe(receipt.media.sha256);

  const abort = new AbortController();
  let interruptedId = '';
  const interrupted = renderStoryPreview(data, pack.taskId, 'silent', abort.signal, id => { interruptedId = id; })
    .catch((error: unknown) => error);
  await until(async () => {
    if (!interruptedId) return false;
    const tmp = join(data, 'tmp');
    const attempt = (await readdir(tmp)).find(name => name.startsWith(interruptedId + '-'));
    if (!attempt) return false;
    try {
      const runtime = await readJson(join(tmp, attempt, 'runtime-owner.json'));
      return !!(await readJson(join(runtime.directory, 'progress.json'))).workerPid;
    } catch { return false; }
  });
  abort.abort(new EngineError('CANCELLED', 'Integration cancellation', 'cancelled'));
  expect(await interrupted).toMatchObject({code: 'CANCELLED'});
  expect((await readTask(data, interruptedId, 'repository-story-preview-v1'))).toMatchObject({state: 'cancelled', attempt: 1});
  await expect(renderStoryPreview(data, pack.taskId, 'silent', signal)).resolves.toMatchObject({taskId: interruptedId, cached: false});
  expect((await readTask(data, interruptedId, 'repository-story-preview-v1'))).toMatchObject({state: 'succeeded', attempt: 2});

  const renderArgs = ['--task', revisedPack.taskId, '--data', data, '--mode', 'silent'];
  const renderChild = spawn(process.execPath, cli('preview-render', ...renderArgs), {stdio: ['ignore', 'ignore', 'pipe']});
  const renderExit = new Promise(resolve => renderChild.once('exit', (code, sig) => resolve({code, sig})));
  let renderLog = '', crashedId = '';
  renderChild.stderr.on('data', chunk => {
    renderLog += String(chunk);
    crashedId = renderLog.match(/"taskId":"([a-f0-9]{64})"/)?.[1] ?? '';
  });
  try {
    await until(async () => {
      if (!crashedId) return false;
      const tmp = join(data, 'tmp');
      const attempt = (await readdir(tmp)).find(name => name.startsWith(crashedId + '-'));
      if (!attempt) return false;
      try {
        const owner = await readJson(join(tmp, attempt, 'runtime-owner.json'));
        return !!(await readJson(join(owner.directory, 'progress.json'))).workerPid;
      } catch { return false; }
    });
  } finally { renderChild.kill('SIGKILL'); await renderExit; }
  const statusArgs = ['--task', crashedId, '--data', data];
  const status = async () => JSON.parse((await run(process.execPath, cli('preview-status', ...statusArgs))).stdout);
  const active = await status();
  expect(active).toMatchObject({state: 'running', attempt: 1, retryable: false, leaseExpiresAt: expect.any(String)});
  await expect(run(process.execPath, cli('preview-render', ...renderArgs)))
    .rejects.toMatchObject({stderr: expect.stringContaining('TASK_BUSY')});
  await delay(Math.max(0, Date.parse(active.leaseExpiresAt) - Date.now()) + 100);
  expect(await status()).toMatchObject({state: 'interrupted', attempt: 1, retryable: true});
  const rerendered = await run(process.execPath, cli('preview-render', ...renderArgs));
  expect(JSON.parse(rerendered.stdout)).toMatchObject({taskId: crashedId, cached: false, state: 'succeeded'});
  expect((await readTask(data, crashedId, 'repository-story-preview-v1')).attempt).toBe(2);

  const task = await readTask(data, preview.taskId, 'repository-story-preview-v1');
  const committedVideo = task.outputs.find(output => output.mediaType === 'video/mp4')!;
  await writeFile(new ArtifactStore(data).path(committedVideo), 'corrupted fixture');
  await expect(storyCommand(['story', 'preview-status'], {data, task: preview.taskId}, signal))
    .rejects.toMatchObject({code: 'PREVIEW_INTEGRITY'});
}, 120_000);
