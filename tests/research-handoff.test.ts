import {it,expect} from 'vitest';
import {buildResearchHandoff} from '../src/story-planner/research-handoff.js';
it('builds deterministic evidence-bound handoffs for distinct projects',async()=>{
 for(const name of ['rea','rembg']){const p=`examples/story-planner-v1/${name}.json`;const a=await buildResearchHandoff(p,'.'),b=await buildResearchHandoff(p,'.');expect(a.fingerprint).toBe(b.fingerprint);expect(a.sources.length).toBeGreaterThan(0);expect(a.reviewChecklist).toHaveLength(a.story.shots.length);expect(a.review).toBe('pending');expect(a.origin).toBe('curated-research-not-automatic-understanding');}
});
