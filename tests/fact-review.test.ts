import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {StorySchema} from '../src/contracts/story.js';
import {storyFactReview,verifyFactReview} from '../src/workflow/fact-review.js';
import {sha256} from '../src/core/util.js';
async function fixture(name:string){const story=StorySchema.parse(JSON.parse(await readFile(`examples/story-planner-v1/${name}.json`,'utf8')));const sources=await Promise.all(story.evidence.sources.map(async s=>({...s,bytes:await readFile(s.path)})));return {story,sources};}
function receipt(p:ReturnType<typeof storyFactReview>){return {schemaVersion:'fact-review-receipt/1.0',candidateHash:p.candidateHash,packetHash:p.packetHash,reviewer:{kind:'session-agent',identity:'TEST ONLY: fabricated verdicts for structural validation'},items:p.requiredItems.map(id=>({id,verdict:'supported',reason:'TEST ONLY, not a real semantic review',limitations:'No semantic conclusion established'}))};}
it.each(['rea','rembg'])('creates independent review work for pinned %s evidence',async name=>{const {story,sources}=await fixture(name);const p=storyFactReview(story,sources);expect(p.semantic).toBe('pending-independent-review');expect(p.requiredItems.length).toBe(story.evidence.claims.length+2*story.shots.length+1+story.evidence.objects.length+story.evidence.actors.length+story.evidence.operations.length);expect(p.claims.every(c=>c.citations.every(q=>q.context.includes(q.quote)))).toBe(true);expect(storyFactReview(story,sources)).toEqual(p);expect(verifyFactReview(p,receipt(p))).toMatchObject({status:'attributed-review-complete',semanticTruth:'not-machine-verified',approval:'none'});});
it.each(['quote','hash','bytes','line','source'])('rejects provenance alteration: %s',async kind=>{const {story,sources}=await fixture('rembg');const cite=story.evidence.claims[0]!.citations[0]!;if(kind==='quote')cite.quote='false';if(kind==='hash')sources[0]!.sha256='0'.repeat(64);if(kind==='bytes')sources[0]!.bytes=Buffer.from('changed');if(kind==='line')cite.startLine=0;if(kind==='source')cite.document='unknown';expect(()=>storyFactReview(story,sources)).toThrow();});
it('does not infer truth from documented labels or matching quotes',async()=>{const {story,sources}=await fixture('rembg');story.evidence.claims[0]!.statement='It guarantees perfect results for every image';story.shots[0]!.narration='It cures all diseases';const p=storyFactReview(story,sources);expect(p.semantic).toBe('pending-independent-review');expect(p.units.find(u=>u.id==='narration:'+story.shots[0]!.id)?.text).toContain('diseases');const r=receipt(p);r.items[0]!.verdict='unsupported';expect(verifyFactReview(p,r).status).toBe('review-unresolved');});
it.each(['missing','duplicate','unknown','stale','tampered'])('rejects %s review',async kind=>{const {story,sources}=await fixture('rembg'),p=storyFactReview(story,sources),r=receipt(p);if(kind==='missing')r.items.pop();if(kind==='duplicate')r.items.push(r.items[0]!);if(kind==='unknown')r.items[0]!.id='unknown';if(kind==='stale')r.candidateHash='0'.repeat(64);if(kind==='tampered')p.claims[0]!.statement='altered';expect(()=>verifyFactReview(p,r)).toThrow();});
it('invalidates review after narration changes while citations stay identical',async()=>{const {story,sources}=await fixture('rembg'),p=storyFactReview(story,sources);story.shots[0]!.narration+=' Added unreviewed assertion.';expect(()=>verifyFactReview(storyFactReview(story,sources),receipt(p))).toThrow();});
it('preserves exact BOM first-line citations and rejects BOM omission',async()=>{
 const {story,sources}=await fixture('rembg'),source=sources[0]!;
 source.bytes=Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),source.bytes]);source.sha256=sha256(source.bytes);story.evidence.sources[0]!.sha256=source.sha256;
 const quote=source.bytes.toString('utf8').split(/\r?\n/)[0]!;
 story.evidence.claims[0]!.citations=[{document:source.id,startLine:1,endLine:1,quote}];
 const p=storyFactReview(story,sources);expect(p.claims[0]!.citations[0]!.quote.charCodeAt(0)).toBe(0xfeff);
 expect(p.claims[0]!.citations[0]!.context.charCodeAt(0)).toBe(0xfeff);
 story.evidence.claims[0]!.citations[0]!.quote=quote.slice(1);
 expect(()=>storyFactReview(story,sources)).toThrow('Exact citation mismatch');
});
it('still rejects malformed UTF-8 even with a matching source digest',async()=>{
 const {story,sources}=await fixture('rembg'),source=sources[0]!;source.bytes=Buffer.from([0xef,0xbb,0xbf,0xc3,0x28]);source.sha256=sha256(source.bytes);story.evidence.sources[0]!.sha256=source.sha256;
 expect(()=>storyFactReview(story,sources)).toThrow('Source is not UTF-8');
});
it('requires explicit review of Story visible labels, disclosures and full inferential rationale',async()=>{
 const {story,sources}=await fixture('rembg');story.evidence.objects[0]!.label='Unsupported visible claim';story.evidence.disclosure='A disclosure also makes factual assertions';story.evidence.claims[0]!.rationale='Full inferential reasoning';
 const p=storyFactReview(story,sources);
 expect(p.units.find(u=>u.id==='object:'+story.evidence.objects[0]!.id)?.text).toContain('Unsupported visible claim');
 expect(p.units.find(u=>u.id==='story-context')?.text).toContain(story.evidence.disclosure);
 expect(p.claims[0]?.reasoning).toBe('Full inferential reasoning');
 for(const omitted of ['story-context','object:'+story.evidence.objects[0]!.id,'actor:'+story.evidence.actors[0]!.id]){const r=receipt(p);r.items=r.items.filter(i=>i.id!==omitted);expect(()=>verifyFactReview(p,r)).toThrow('Incomplete');}
 const r=receipt(p);story.evidence.disclosure+=' Changed';expect(()=>verifyFactReview(storyFactReview(story,sources),r)).toThrow('Stale');
});
