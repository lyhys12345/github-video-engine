import {readFile,writeFile} from 'node:fs/promises';
import {buildVoiceHandoff} from '../src/story-planner/voice-handoff.js';
const [story,bindings,out]=process.argv.slice(2);if(!story||!bindings||!out)throw new Error('voice-handoff <story.json> <bindings.json> <new-output.json>');
const parse=async(p:string)=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
await writeFile(out,JSON.stringify(await buildVoiceHandoff(await parse(story),await parse(bindings),new AbortController().signal),null,2)+'\n',{flag:'wx'});
