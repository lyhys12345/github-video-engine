import {it,expect} from 'vitest';
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {started,fixture,signal} from './byo-api-support.js';
import {runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {canonical} from '../src/core/util.js';
const brief={schemaVersion:'creative-brief/1.0',duration:{mode:'max',maxSeconds:60},style:'Real demonstration',audience:'General audience',platforms:['TikTok'],language:'zh-CN',voice:{mode:'local',profile:'chen-local'},decision:'user-specified',notes:[]};
async function authored(){const f=await started(),answer=await fixture(f),author=join(f.root,'author');await mkdir(author);for(const [key,name]of [['storyJson','story.json'],['narrativeJson','narrative.json'],['animationJson','animation.json'],['runJson','run.json']]as const)await writeFile(join(author,name),answer[key]);await writeFile(join(author,'creative-brief.json'),canonical(brief));return{...f,author};}
const noNetwork=async()=>{throw Error('Unexpected network');};
it('real brief-bound planning snapshots choices, requires review before media and rejects changed receipt',async()=>{
 const f=await authored(),repo=f.first.binding.repository;
 const planned=await runNarrativeWorkspace(repo,f.root,f.author,'planning',signal,noNetwork);expect(planned.status).toBe('checkpoint-complete');if(!('candidate'in planned))throw Error('No candidate');
 expect(JSON.parse(await readFile(join(planned.candidate,'author/creative-brief.json'),'utf8'))).toEqual(brief);
 const oldVoice=process.env.GVE_NARRATION_VOICE;process.env.GVE_NARRATION_VOICE='chen-local';
 try{const gated=await runNarrativeWorkspace(repo,f.root,f.author,'speech',signal,noNetwork);expect(gated.status).toBe('awaiting-script-review');
 const changed=join(f.root,'changed-author');await cp(f.author,changed,{recursive:true});await writeFile(join(changed,'creative-brief.json'),canonical({...brief,style:'Technical explanation'}));
 const receipt=join(f.root,'test-only-review.json');await writeFile(receipt,canonical({schemaVersion:'candidate-review/1.0',candidateSha256:planned.authorSha256,ownerApprovedSha256:planned.authorSha256,stage:'script',reviewer:'TEST ONLY structural fixture',coverage:'script',verdict:'PASS',findings:[]}));
 await expect(runNarrativeWorkspace(repo,f.root,changed,'speech',signal,noNetwork,{},undefined,{reportPath:receipt})).rejects.toThrow('another candidate');
 }finally{if(oldVoice===undefined)delete process.env.GVE_NARRATION_VOICE;else process.env.GVE_NARRATION_VOICE=oldVoice;}
});
it('real run refuses requested timeline overflow and stops unsupported voice before synthesis',async()=>{
 const f=await authored(),repo=f.first.binding.repository;await writeFile(join(f.author,'creative-brief.json'),canonical({...brief,duration:{mode:'max',maxSeconds:1}}));
 await expect(runNarrativeWorkspace(repo,f.root,f.author,'planning',signal,noNetwork)).rejects.toThrow('violates the creative brief');
 await writeFile(join(f.author,'creative-brief.json'),canonical({...brief,voice:{mode:'none'}}));const stopped=await runNarrativeWorkspace(repo,f.root,f.author,'preview',signal,noNetwork);expect(stopped.status).toBe('awaiting-creative-requirements');if(!('details'in stopped))throw Error('No details');expect(JSON.stringify(stopped.details)).toContain('needs an adapter');
 expect(Object.keys(stopped.tasks)).not.toContain('narratedPreview');expect(Object.keys(stopped.cache)).not.toContain('speech');
});
