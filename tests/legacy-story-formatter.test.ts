import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {legacyReviewPacket0,reviewPacket} from '../src/story-planner/runtime.js';
it('reproduces real historical formatter 0 bytes without replacing modern escaping',async()=>{
 const root='fixtures/legacy-story-formatter0/';
 const graph=JSON.parse(await readFile(root+'graph.json','utf8'));
 const plan=JSON.parse(await readFile(root+'compiled-plan.json','utf8'));
 const old=await readFile(root+'review.md','utf8');
 expect(legacyReviewPacket0(graph,plan)).toBe(old);
 expect(reviewPacket(graph,plan)).not.toBe(old);
});
