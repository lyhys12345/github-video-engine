import {lstat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {afterEach, expect, it, vi} from 'vitest';
import {capabilityReport} from '../src/providers/capabilities.js';
import {firstOwnerCommand, firstOwnerReport} from '../src/providers/first-owner.js';
import {workflowRoot} from './workflow-support.js';

const {signal} = new AbortController();

afterEach(() => vi.unstubAllEnvs());

it('plans on a writable checkout with browser, decoders and local voice deliberately unavailable', async () => {
 const root=await workflowRoot('caps'),path=join(root,'private-missing-tool');
 for(const key of ['GVE_BROWSER','GVE_FFMPEG','GVE_FFPROBE','GVE_ANNA_PROFILE'])vi.stubEnv(key,path);
 vi.stubEnv('GVE_NARRATION_VOICE','private-unknown-profile');
 const data=join(root,'planned-state');
 const report=await capabilityReport({phase:'planning',data});
 expect(report).toMatchObject({ok:true,selectedPhase:'planning',checks:{
  runtime:{status:'ready'},storage:{status:'ready'},browser:{status:'not-checked'},ffmpeg:{status:'not-checked'},voice:{status:'not-checked'}},
  phases:{planning:{status:'ready'},preview:{status:'not-checked'}}});
 await expect(lstat(data)).rejects.toMatchObject({code:'ENOENT'});
 expect(JSON.stringify(report)).not.toContain(root);
 expect(JSON.stringify(report)).not.toContain('private-unknown-profile');
});

it('keeps silent speech independent of media or a default voice, and explains blocked adapters separately', async () => {
 const root=await workflowRoot('caps-mode'),path=join(root,'private-missing-tool');
 vi.stubEnv('GVE_BROWSER',root); // An existing directory is insufficient.
 vi.stubEnv('GVE_FFMPEG',path);
 vi.stubEnv('GVE_FFPROBE',path);
 vi.stubEnv('GVE_NARRATION_VOICE','invalid-configured-voice');
 expect(await capabilityReport({phase:'speech',data:root,voice:'none',language:'en-US'})).toMatchObject({
  ok:true,checks:{voice:{status:'ready'},browser:{status:'not-checked'},ffmpeg:{status:'not-checked'}}});
 expect(await capabilityReport({phase:'speech',data:root,voice:'imported',language:'en-US'})).toMatchObject({
  ok:false,checks:{voice:{status:'ready'},ffmpeg:{status:'blocked',code:'FFMPEG_MISSING'},ffprobe:{status:'blocked',code:'FFPROBE_MISSING'}}});
 const report=await capabilityReport({phase:'preview',data:root,voice:'anna-local',language:'en-US'});
 expect(report).toMatchObject({ok:false,checks:{voice:{status:'blocked',code:'VOICE_ADAPTER'},browser:{status:'blocked',code:'BROWSER_MISSING'}}});
 expect(JSON.stringify(report)).not.toContain(root);
 expect(report.checks.voice.detail).toContain('zh-CN only');
});

it('fails the storage check for a non-directory ancestor without publishing its path', async () => {
 const root=await workflowRoot('caps-storage');
 const file=join(root,'inner');
 await writeFile(file,'fixture');
 const report=await capabilityReport({phase:'planning',data:join(file,'state')});
 expect(report).toMatchObject({ok:false,checks:{storage:{status:'blocked',code:'STORAGE_UNAVAILABLE'}}});
 expect(JSON.stringify(report)).not.toContain(root);
});


it('guides planning without consulting a configured voice or rendering tools', async () => {
  const root = await workflowRoot('first-owner');
  const workspace = join(root, 'new workspace');
  const unavailable = join(root, 'private-missing-tool');
  for (const key of ['GVE_BROWSER', 'GVE_FFMPEG', 'GVE_FFPROBE', 'GVE_ANNA_PROFILE']) vi.stubEnv(key, unavailable);
  vi.stubEnv('GVE_NARRATION_VOICE', 'private-unknown-profile');

  const report = await firstOwnerReport({repo: 'https://github.com/Example/Demo.git/', workspace, signal});
  expect(report).toMatchObject({
    ok: true, planning: {status: 'ready'}, preview: {status: 'not-checked'},
    selection: {voice: 'undecided', language: null, requiredForPreview: ['voice', 'language']},
    checks: {browser: {status: 'not-checked'}, voice: {status: 'not-checked'}, previewFont: {status: 'not-checked'}},
    renderers: {technicalPreview: {editableExport: [
      'pnpm', 'gve', 'explanation', 'project-export', '--workspace', '<WORKSPACE>',
      '--task', '<PREVIEW_TASK>', '--author', '<AUTHOR_DIRECTORY>', '--out', '<NEW_EXPORT_DIRECTORY>',
    ]}},
    next: {scriptApproval: {status: 'required-before-render'}, sourceCapture: [
      'pnpm', 'gve', 'explanation', 'run', '--repo', 'https://github.com/example/demo',
      '--workspace', workspace, '--through', 'planning',
    ]},
  });
  await expect(lstat(workspace)).rejects.toMatchObject({code: 'ENOENT'});
  expect(JSON.stringify(report)).not.toContain('private-');
});

it('distinguishes visual blockers from undecided and unsupported narration', async () => {
  const root = await workflowRoot('first-owner-preview');
  const unavailable = join(root, 'missing-tool');
  for (const key of ['GVE_BROWSER', 'GVE_FFMPEG', 'GVE_FFPROBE']) vi.stubEnv(key, unavailable);

  const options = {phase: 'preview', workspace: root, language: 'en-US', signal} as const;
  expect(await firstOwnerReport(options)).toMatchObject({
    ok: false, planning: {status: 'ready'}, preview: {status: 'blocked'},
    selection: {voice: 'undecided', requiredForPreview: ['voice']},
    checks: {browser: {status: 'blocked'}, voice: {status: 'not-checked'}, previewFont: {status: 'ready'}},
  });
  expect(await firstOwnerReport({...options, voice: 'none'})).toMatchObject({
    ok: false, selection: {voice: 'none', requiredForPreview: []},
    checks: {voice: {status: 'ready'}, audioEncoder: {status: 'not-checked'}},
  });
  expect(await firstOwnerReport({...options, voice: 'byo-api'})).toMatchObject({
    ok: false, checks: {voice: {status: 'blocked', code: 'VOICE_ADAPTER'}},
  });
});

it('rejects unsupported first-owner options and non-repository URLs before making a suggestion', async () => {
  const invoke = (values: Record<string, unknown>) => firstOwnerCommand(['doctor'], {'first-owner': true, ...values}, signal);
  await expect(invoke({capabilities: true})).rejects.toMatchObject({code: 'USAGE'});
  await expect(invoke({phase: 'speech'})).rejects.toMatchObject({code: 'USAGE'});
  await expect(invoke({voice: 'any-installed-voice'})).rejects.toMatchObject({code: 'USAGE'});
  await expect(invoke({repo: 'https://github.com/example/demo?query=1'})).rejects.toMatchObject({code: 'USAGE'});
});
