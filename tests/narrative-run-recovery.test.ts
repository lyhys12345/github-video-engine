import {lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {acquireNarrativeWorkspaceLock,runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {workflowRoot} from './workflow-support.js';

it('releases workspace ownership when environment setup fails and permits same-process retry',async()=>{
  const root=await workflowRoot('environment-recovery');
  const browser=process.env.GVE_BROWSER;
  process.env.GVE_BROWSER=join(root,'missing-browser.exe');
  try{
    // Use the real dependency check and filesystem lock; no browser/model/network runs.
    for(let attempt=0;attempt<2;attempt++){
      await expect(runNarrativeWorkspace(
        'https://github.com/example/demo',root,undefined,'planning',new AbortController().signal,
      )).rejects.toMatchObject({code:'BROWSER_MISSING'});
      await expect(lstat(join(root,'active-run.json'))).rejects.toMatchObject({code:'ENOENT'});
    }
    const release=await acquireNarrativeWorkspaceLock(root);
    try{expect((await lstat(join(root,'active-run.json'))).isFile()).toBe(true);}
    finally{await release();}
    await expect(lstat(join(root,'active-run.json'))).rejects.toMatchObject({code:'ENOENT'});
  }finally{
    if(browser===undefined)delete process.env.GVE_BROWSER;
    else process.env.GVE_BROWSER=browser;
  }
});
