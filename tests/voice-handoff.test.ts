import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {buildVoiceHandoff} from '../src/story-planner/voice-handoff.js';
const story=async()=>JSON.parse(await readFile('examples/story-planner-v1/rea.json','utf8'));
it('keeps absent recordings estimated and all narration pending',async()=>{const s=await story(),r=await buildVoiceHandoff(s,{schemaVersion:'1.0',storyId:s.id,voiceLabel:'Chen preference; new recording pending',clips:[]},new AbortController().signal);expect(r.timingBasis).toBe('estimate-only');expect(r.pendingShots).toHaveLength(s.shots.length);});
it('rejects outdated narration before reading an unrelated historic clip',async()=>{const s=await story();await expect(buildVoiceHandoff(s,{schemaVersion:'1.0',storyId:s.id,voiceLabel:'Chen',clips:[{shotId:s.shots[0].id,path:'missing.mp3',sha256:'a'.repeat(64),transcript:'old teaser text'}]},new AbortController().signal)).rejects.toThrow('exact current narration');});
