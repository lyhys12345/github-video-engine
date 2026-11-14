import {lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,it,vi} from 'vitest';
import {acquireNarrativeWorkspaceLock,runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {sourceFixture,workflowRoot} from './workflow-support.js';

it('releases workspace ownership when source capture fails and permits same-process retry without media tools',async()=>{
 const root=await workflowRoot('environment-recovery');
 const source=sourceFixture(),signal=new AbortController().signal;
 const offline=vi.fn(async()=>{throw Error('Offline source fixture');});
 vi.stubEnv('GVE_BROWSER',join(root,'missing-browser.exe'));
 vi.stubEnv('GVE_FFMPEG',join(root,'missing-ffmpeg.exe'));
 vi.stubEnv('GVE_FFPROBE',join(root,'missing-ffprobe.exe'));
 try{
  for(let attempt=0;attempt<2;attempt++){
   await expect(runNarrativeWorkspace(source.repository,root,undefined,'planning',signal,offline)).rejects.toThrow();
   await expect(lstat(join(root,'active-run.json'))).rejects.toMatchObject({code:'ENOENT'});
  }
  expect(offline).toHaveBeenCalled();
  const release=await acquireNarrativeWorkspaceLock(root);
  try{expect((await lstat(join(root,'active-run.json'))).isFile()).toBe(true);}
  finally{await release();}
  await expect(lstat(join(root,'active-run.json'))).rejects.toMatchObject({code:'ENOENT'});
 }finally{vi.unstubAllEnvs();}
});
