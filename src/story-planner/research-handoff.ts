import {captureEvidence} from './runtime.js';
import {compileStory} from './compile.js';
import {canonical,sha256} from '../core/util.js';
import type {Story} from '../contracts/story.js';
/** Deterministic research-to-editorial handoff; semantics remain authored. */
export async function buildResearchHandoff(spec:string,root:string){
 return deriveResearchHandoff(await captureEvidence(spec,root));
}
export function deriveResearchHandoff(snapshot:{graph:Story;sources:{id:string;bytes:Buffer}[]}){
 const story=snapshot.graph;
 const sources=snapshot.sources.map(s=>({id:s.id,sha256:sha256(s.bytes),bytes:s.bytes.length}));
 const claims=story.evidence.claims.map(c=>({...c,usedBy:story.shots.filter(s=>s.claimIds.includes(c.id)).map(s=>s.id)}));
 const timeline=compileStory(story);
 const review=story.shots.map(s=>({shotId:s.id,beat:s.beat,claimIds:s.claimIds,
  documented:s.claimIds.filter(id=>claims.find(c=>c.id===id)?.kind==='documented'),
  requiresInterpretationReview:s.claimIds.some(id=>claims.find(c=>c.id===id)?.kind!=='documented'),
  requiredChecks:['Does the source support every factual sentence?','Are input, process and output visually distinguishable?','Is inference visibly identified?']}));
 const content={schemaVersion:'1.0',origin:'curated-research-not-automatic-understanding',review:'pending',storyId:story.id,sources,claims,story,timeline,reviewChecklist:review,
  gaps:['Semantic entailment requires independent review','No automatic repository-wide research or creative selection','Estimated timing is not recorded speech','No rendered or audience quality approval']};
 return {...content,fingerprint:sha256(canonical(content))};
}
