import {it,expect} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {planStory,statusStory,exportStory} from '../src/story-planner/runtime.js';
it('commits derived research handoff for both projects and verifies it on restart/export',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gve-rh-'));const signal=new AbortController().signal;
 try{for(const project of ['rea','rembg']){
 const data=join(root,project),out=join(root,project+'-out');
 const result=await planStory(`examples/story-planner-v1/${project}.json`,'.',data,out,signal);
 const packet=JSON.parse(await readFile(join(out,'bundle/research-handoff.json'),'utf8'));
 expect(packet.storyId).toContain(project);expect(packet.review).toBe('pending');
 expect((await statusStory(data,result.taskId)).integrity).toBe('verified');
 await exportStory(data,result.taskId,join(root,project+'-copy'),signal);
 expect(await readFile(join(root,project+'-copy/bundle/research-handoff.json'),'utf8')).toBe(await readFile(join(out,'bundle/research-handoff.json'),'utf8'));
 }}finally{await rm(root,{recursive:true,force:true});}
});
