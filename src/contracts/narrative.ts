import {z} from 'zod';
import {AuthoringBinding,LegacyStoryProposal} from './authoring.js';
import {Hash,Id} from './video.js';
const text=(max:number)=>z.string().min(1).max(max).regex(/\S/);
const execution=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('supported-story'),adapter:z.enum(['http','image-mask','scalar-rule','document-flow/1.0']),storyTaskId:Hash,expectedGraphHash:Hash,shotIds:z.array(Id).min(1).max(12)}),
 z.strictObject({kind:z.literal('needs-evidence'),reason:text(1000),missingEvidence:text(1000)}),
 z.strictObject({kind:z.literal('needs-adapter'),reason:text(1000),requiredCapability:text(1000)})
]);
export const NarrativePlan=z.strictObject({
 schemaVersion:z.literal('repository-narrative-plan/1.0'),binding:AuthoringBinding,authoringRequestId:Hash,
 authorship:LegacyStoryProposal.shape.authorship,
 interpretation:z.literal('human-or-session-agent-authored-not-automatic-repository-understanding'),
 brief:z.strictObject({title:text(240),audience:text(500),question:text(1000),thesis:text(1500),scope:text(1000),exclusions:z.array(text(500)).max(20),claimIds:z.array(Id).min(1).max(60)}),
 claims:LegacyStoryProposal.shape.claims,
 scenes:z.array(z.strictObject({id:Id,role:z.enum(['hook','context','mechanism','example','benefit','limitation','closing']),title:text(240),narration:text(3000),visual:text(3000),onScreenText:z.array(text(500)).max(8),claimIds:z.array(Id).max(60),estimatedSeconds:z.number().finite().min(1).max(120),transitionToNext:z.string().max(1500),execution})).min(5).max(40),
 openQuestions:z.array(text(1000)).max(30)
}).superRefine((p,c)=>{
 const issue=(message:string)=>c.addIssue({code:'custom',message});
 if(new Set(p.claims.map(x=>x.id)).size!==p.claims.length||new Set(p.scenes.map(x=>x.id)).size!==p.scenes.length)issue('Duplicate narrative claim or scene identity.');
 const claims=new Set(p.claims.map(x=>x.id));
 if(new Set(p.brief.claimIds).size!==p.brief.claimIds.length||p.brief.claimIds.some(id=>!claims.has(id))||p.scenes.some(s=>new Set(s.claimIds).size!==s.claimIds.length||s.claimIds.some(id=>!claims.has(id))))issue('Unknown or duplicate narrative claim reference.');
 if(p.scenes[0]?.role!=='hook'||p.scenes.at(-1)?.role!=='closing'||p.scenes.filter(s=>s.role==='hook').length!==1||p.scenes.filter(s=>s.role==='closing').length!==1)issue('The plan requires one opening hook first and one closing scene last.');
 for(const role of ['mechanism','example','limitation'])if(!p.scenes.some(s=>s.role===role))issue('Missing complete-story role: '+role);
 if(p.scenes.reduce((n,s)=>n+s.estimatedSeconds,0)>300)issue('Estimated narrative duration exceeds 300 seconds.');
 if(p.scenes.slice(0,-1).some(s=>!s.transitionToNext.trim()))issue('Every non-final scene requires an explicitly authored transition.');
 for(const s of p.scenes)if(s.execution.kind==='supported-story'&&(!s.claimIds.length||new Set(s.execution.shotIds).size!==s.execution.shotIds.length))issue('Supported scenes require claims and distinct Story shots.');
});
export type NarrativePlan=z.infer<typeof NarrativePlan>;
