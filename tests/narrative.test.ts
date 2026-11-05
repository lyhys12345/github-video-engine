import {readFile,writeFile,rename,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,it} from 'vitest';
import {StorySchema} from '../src/contracts/story.js';
import {NarrativePlan} from '../src/contracts/narrative.js';
import {startExplanation,captureNarrativeStart} from '../src/workflow/explanation-session.js';
import {narrativeStory,submitNarrative,narrativeStatus,narrativeExport} from '../src/workflow/narrative.js';
import {statusStory,readTask} from '../src/story-planner/runtime.js';
import {ArtifactStore} from '../src/assets/store.js';
import {canonical,sha256} from '../src/core/util.js';
import {workflowRoot,sourceFixture} from './workflow-support.js';
const signal=new AbortController().signal;
async function fixture(){
 const root=await workflowRoot('narrative'),data=join(root,'state'),input=join(root,'request.json'),source=sourceFixture();
 await writeFile(input,canonical({schemaVersion:'explanation-session-request/1.0',repository:source.repository,ref:source.commit,documents:[],audience:'TEST ONLY fixture readers',language:'en-US',maxSeconds:60,voiceMode:'silent'}));
 const transport=async(url:string)=>url.includes('/commits/')?{sha:source.commit}:url.includes('/readme?')?{type:'file',path:'README.md',encoding:'base64',size:Buffer.byteLength(source.documents[0]!.content),content:Buffer.from(source.documents[0]!.content).toString('base64')}:{full_name:'example/demo',name:'demo',default_branch:'main',license:null};
 const start=await startExplanation(data,input,join(root,'capture'),signal,undefined,transport),captured=await captureNarrativeStart(data,start.taskId,signal);
 const story=StorySchema.parse(JSON.parse(await readFile('examples/http-story-v1/express-story.json','utf8')));
 story.name='TEST ONLY synthetic source binding';story.evidence.sources=captured.workspace.manifest.sources;
 story.evidence.claims.forEach(c=>{c.statement='TEST ONLY '+c.id;c.rationale='Synthetic provenance fixture, not semantic acceptance';c.citations=[{document:'source-1',startLine:1,endLine:1,quote:'# Demo'}];});
 story.shots.forEach(s=>{s.narration='TEST ONLY narration '+s.id;s.visual='TEST ONLY visual '+s.id;});
 const storyPath=join(root,'story.json');await writeFile(storyPath,canonical(story));const child=await narrativeStory(data,start.taskId,storyPath,join(root,'child'),signal),status=await statusStory(data,child.taskId);if(!('graphHash' in status))throw Error('Child not complete');
 const claims=story.evidence.claims.map(c=>({id:c.id,statement:c.statement,basis:c.kind==='inference'?{kind:'inference',reasoning:c.rationale}:{kind:'documented'},citations:c.citations.map(q=>({sourceId:q.document,sourceSha256:story.evidence.sources.find(s=>s.id===q.document)!.sha256,startLine:q.startLine,endLine:q.endLine,quote:q.quote}))}));
 const scenes=story.shots.map((s,i)=>({id:s.id,role:['hook','mechanism','example'][i],title:'TEST ONLY title',narration:s.narration,visual:s.visual,onScreenText:['TEST ONLY screen'],claimIds:s.claimIds,estimatedSeconds:8,transitionToNext:'TEST ONLY transition',execution:{kind:'supported-story',adapter:'http',storyTaskId:child.taskId,expectedGraphHash:status.graphHash,shotIds:[s.id]}}));
 const plan=NarrativePlan.parse({schemaVersion:'repository-narrative-plan/1.0',binding:captured.manifest.binding,authoringRequestId:captured.manifest.authoringRequestId,authorship:{kind:'session-agent'},interpretation:'human-or-session-agent-authored-not-automatic-repository-understanding',brief:{title:'TEST ONLY',audience:'Fixture readers',question:'Fixture question',thesis:'Fixture thesis',scope:'Structural fixture only',exclusions:[],claimIds:claims.map(c=>c.id)},claims,scenes:[...scenes,{id:'limitations',role:'limitation',title:'Unknown result',narration:'This result is not verified.',visual:'Unknown result card',onScreenText:['Unverified'],claimIds:[],estimatedSeconds:5,transitionToNext:'Conclude with the scope.',execution:{kind:'needs-evidence',reason:'No observed result',missingEvidence:'Need measured output'}},{id:'ending',role:'closing',title:'Ending',narration:'A future adapter is still required.',visual:'Future-work card',onScreenText:['Future work'],claimIds:[],estimatedSeconds:5,transitionToNext:'',execution:{kind:'needs-adapter',reason:'Card not linked to a Story',requiredCapability:'A separately authored card adapter'}}],openQuestions:['TEST ONLY unresolved question']});
 const path=join(root,'plan.json');await writeFile(path,canonical(plan));const result=await submitNarrative(data,start.taskId,path,join(root,'pending-plan'),signal);
 const packet=JSON.parse(await readFile(join(result.output.bundle,'fact-review/packet.json'),'utf8'));
 const receipt={schemaVersion:'fact-review-receipt/1.0',candidateHash:packet.candidateHash,packetHash:packet.packetHash,reviewer:{kind:'session-agent',identity:'TEST ONLY synthetic structural reviewer'},items:packet.requiredItems.map((id:string)=>({id,verdict:'supported',reason:'TEST ONLY structural receipt',limitations:'No real semantic review'}))};
 const receiptPath=join(root,'receipt.json');await writeFile(receiptPath,canonical(receipt));return {root,data,path,plan,start,child,result,packet,receipt,receiptPath,storyPath};
}
it('connects a pinned URL capture to complete multi-scene planning and durable review while preserving unresolved dispositions and editable source exports',async()=>{
 const f=await fixture();expect(f.result.sceneStates.map(s=>s.state)).toEqual(['supported-story','supported-story','supported-story','needs-evidence','needs-adapter']);expect(f.result.factReview).toMatchObject({status:'pending-independent-review',approval:'none'});
 const reviewed=await submitNarrative(f.data,f.start.taskId,f.path,join(f.root,'reviewed'),signal,f.receiptPath);expect(reviewed.taskId).not.toBe(f.result.taskId);expect(reviewed.factReview).toMatchObject({status:'attributed-review-complete',identityAuthentication:'not-provided',approval:'none'});expect(reviewed.unresolvedSceneCount).toBe(2);
 await rename(f.path,join(f.root,'moved-plan.json'));await rename(f.storyPath,join(f.root,'moved-story.json'));await rename(f.receiptPath,join(f.root,'moved-receipt.json'));await rename(f.data,join(f.root,'relocated-state'));
 const state=join(f.root,'relocated-state');expect(await narrativeStatus(state,reviewed.taskId,signal)).toMatchObject({integrity:'verified',unresolvedSceneCount:2,ownerAcceptance:'pending'});const exported=await narrativeExport(state,reviewed.taskId,join(f.root,'reexport'),signal);
 expect(await readFile(join(exported.output.bundle,'narrative.json'))).toEqual(Buffer.from(canonical(f.plan)));expect(await readFile(join(exported.output.bundle,'fact-review/receipt.json'))).toEqual(Buffer.from(canonical(f.receipt)));
 expect((await narrativeStatus(state,f.result.taskId,signal)).factReview).toMatchObject({status:'pending-independent-review'});
});
it('requires explicit review of thesis, screen text, all transitions and ending including unsupported scene text',async()=>{
 const f=await fixture();expect(f.packet.units.find((u:any)=>u.id==='narrative-brief').text).toContain(f.plan.brief.thesis);
 for(const id of ['narrative-brief','scene-transition:'+f.plan.scenes[0]!.id,'scene-screen:'+f.plan.scenes[0]!.id,'scene-narration:ending','scene-execution:ending']){const r=structuredClone(f.receipt);r.items=r.items.filter((x:any)=>x.id!==id);await writeFile(f.receiptPath,canonical(r));await expect(submitNarrative(f.data,f.start.taskId,f.path,join(f.root,'reject-'+id.replace(':','-')),signal,f.receiptPath)).rejects.toMatchObject({code:'FACT_REVIEW'});}
});
it.each(['thesis','transition','screen','ending','timing','disposition'])('rejects old review after %s changes and preserves the prior candidate',async kind=>{
 const f=await fixture(),plan=structuredClone(f.plan);
 if(kind==='thesis')plan.brief.thesis+=' New unreviewed assertion';if(kind==='transition')plan.scenes[0]!.transitionToNext+=' New assertion';if(kind==='screen')plan.scenes[0]!.onScreenText.push('New visible assertion');if(kind==='ending')plan.scenes.at(-1)!.narration+=' Changed ending';if(kind==='timing')plan.scenes[0]!.estimatedSeconds++;const ending=plan.scenes.at(-1)!.execution;if(kind==='disposition'&&ending.kind==='needs-adapter')ending.reason+=' Changed scope';
 await writeFile(f.path,canonical(plan));await expect(submitNarrative(f.data,f.start.taskId,f.path,join(f.root,'rejected'),signal,f.receiptPath)).rejects.toMatchObject({code:'FACT_REVIEW'});expect(await narrativeStatus(f.data,f.result.taskId,signal)).toMatchObject({integrity:'verified'});
});
it.each(['child-hash','shot','narration','claim','binding'])('refuses altered supported child binding: %s',async kind=>{
 const f=await fixture(),p=structuredClone(f.plan),e=p.scenes[0]!.execution;if(e.kind!=='supported-story')throw Error('Expected linked scene');
 if(kind==='child-hash')e.expectedGraphHash='0'.repeat(64);if(kind==='shot')e.shotIds=['absent'];if(kind==='narration')p.scenes[0]!.narration+=' Unmatched child text';if(kind==='claim')p.claims[0]!.statement+=' Unmatched child claim';if(kind==='binding')p.binding.projectId='other-project';
 await writeFile(f.path,canonical(p));await expect(submitNarrative(f.data,f.start.taskId,f.path,join(f.root,'rejected'),signal)).rejects.toMatchObject({code:'NARRATIVE'});await expect(lstat(join(f.root,'rejected'))).rejects.toMatchObject({code:'ENOENT'});
});
it('retains unresolved attributed judgments instead of granting approval or erasing gap scenes',async()=>{const f=await fixture();f.receipt.items[0]!.verdict='unverified';await writeFile(f.receiptPath,canonical(f.receipt));const result=await submitNarrative(f.data,f.start.taskId,f.path,join(f.root,'unresolved-review'),signal,f.receiptPath);expect(result.factReview).toMatchObject({status:'review-unresolved',approval:'none'});expect(result.unresolvedSceneCount).toBe(2);});
it('refuses damaged pinned source CAS after the source input files move',async()=>{const f=await fixture(),task=await readTask(f.data,f.start.taskId,null),store=new ArtifactStore(f.data);await writeFile(store.path(task.outputs[0]!), 'corrupt source snapshot');await expect(narrativeStatus(f.data,f.result.taskId,signal)).rejects.toBeTruthy();});
it('rejects missing complete-story roles, duplicated scenes and unsupported extra fields',async()=>{const f=await fixture();for(const change of [(p:any)=>{p.scenes.splice(3,1);},(p:any)=>{p.scenes[1].id=p.scenes[0].id;},(p:any)=>{p.execute='never run';},(p:any)=>{p.scenes[0].transitionToNext='';}]){const p=structuredClone(f.plan);change(p);expect(NarrativePlan.safeParse(p).success).toBe(false);}});
import {NarrativeExcerptSpec,validateNarrativeExcerptSelection} from '../src/workflow/narrative-preview.js';
import {narrativePreviewFactReview,verifyFactReview} from '../src/workflow/fact-review.js';
function excerptSpec(plan:ReturnType<typeof NarrativePlan.parse>,hash='1'.repeat(64)){
 return NarrativeExcerptSpec.parse({schemaVersion:'narrative-technical-excerpt/1.0',expectedNarrativePlanHash:hash,mode:'silent',fps:30,scenes:plan.scenes.map(s=>s.execution.kind==='supported-story'?{kind:'story-slice',sceneId:s.id,boundary:'reset',previewTaskId:'2'.repeat(64),expectedPreviewManifestSha256:'3'.repeat(64),slices:s.execution.shotIds.map(shotId=>({shotId,startFrame:0,endFrame:60}))}:{kind:'placeholder',sceneId:s.id,boundary:'reset',frames:90})});
}
it('allows an explicitly short multi-scene selection only when every unresolved scene remains visibly not producible',async()=>{const f=await fixture(),spec=excerptSpec(f.plan);validateNarrativeExcerptSelection(f.plan,spec);spec.scenes.splice(2,1);expect(()=>validateNarrativeExcerptSelection(f.plan,spec)).not.toThrow();expect(spec.scenes.filter(e=>e.kind==='placeholder')).toHaveLength(2);});
it.each(['missing-gap','reorder','duplicate','promote-gap','demote-supported','only-one-supported'])('refuses dishonest excerpt coverage: %s',async kind=>{
 const f=await fixture(),spec=excerptSpec(f.plan);if(kind==='missing-gap')spec.scenes=spec.scenes.filter(e=>e.sceneId!=='limitations');if(kind==='reorder')[spec.scenes[0],spec.scenes[1]]=[spec.scenes[1]!,spec.scenes[0]!];if(kind==='duplicate')spec.scenes[1]=structuredClone(spec.scenes[0]!);if(kind==='promote-gap')spec.scenes[3]={...structuredClone(spec.scenes[0]!),sceneId:'limitations'};if(kind==='demote-supported')spec.scenes[0]={kind:'placeholder',sceneId:spec.scenes[0]!.sceneId,boundary:'reset',frames:90};if(kind==='only-one-supported')spec.scenes=spec.scenes.filter((e,i)=>e.kind==='placeholder'||i===0);expect(()=>validateNarrativeExcerptSelection(f.plan,spec)).toThrow();
});
it('refuses unsupported state continuation, narration, clocks and overlong or empty source slices',async()=>{const f=await fixture(),base=excerptSpec(f.plan);for(const edit of [(s:any)=>s.scenes[0].boundary='continuation',(s:any)=>s.mode='narrated',(s:any)=>s.fps=24,(s:any)=>s.scenes[0].slices[0].endFrame=181,(s:any)=>s.scenes[0].slices[0].endFrame=0]){const s=structuredClone(base);edit(s);expect(NarrativeExcerptSpec.safeParse(s).success).toBe(false);}});
it('requires a new pending review for exact child visual labels, animation, timeline, omissions and actual media identity',async()=>{
 const f=await fixture(),source=await captureNarrativeStart(f.data,f.start.taskId,signal),sources=source.workspace.manifest.sources.map(s=>({...s,bytes:source.workspace.files.get(s.path)!}));
 const execution={profile:'TEST ONLY technical excerpt',child:{actorLabels:['UNSUPPORTED VISIBLE ASSERTION'],animation:{from:1,to:2}},parts:[{startFrame:60,endFrame:120}],coverage:{parentTransition:'exported-only; not rendered'},actualMovieSha256:'4'.repeat(64)};
 const packet=narrativePreviewFactReview(f.plan,sources,execution);expect(packet.semantic).toBe('pending-independent-review');expect(packet.requiredItems).toContain('technical-preview-execution');expect(packet.units.at(-1)!.text).toContain('UNSUPPORTED VISIBLE ASSERTION');expect(()=>verifyFactReview(packet,f.receipt)).toThrow('Stale');
 const receipt={...f.receipt,candidateHash:packet.candidateHash,packetHash:packet.packetHash,items:packet.requiredItems.map(id=>({id,verdict:'supported',reason:'TEST ONLY structural receipt',limitations:'No semantic or rendered-pixel approval'}))};expect(verifyFactReview(packet,receipt)).toMatchObject({approval:'none',semanticTruth:'not-machine-verified'});
 for(const change of [(e:any)=>e.parts[0].endFrame++,(e:any)=>e.child.animation.to=3,(e:any)=>e.child.actorLabels[0]='Changed assertion',(e:any)=>e.actualMovieSha256='5'.repeat(64)]){const edited=structuredClone(execution);change(edited);expect(()=>verifyFactReview(narrativePreviewFactReview(f.plan,sources,edited),receipt)).toThrow('Stale');}
 receipt.items=receipt.items.filter(i=>i.id!=='technical-preview-execution');expect(()=>verifyFactReview(packet,receipt)).toThrow('Incomplete');
});
import {validateSourceClockBridge,NarrativeContinuitySpec} from '../src/workflow/narrative-continuity.js';
import {audienceRenderState,AUDIENCE_RENDER_STATE_PROFILE} from '../src/story-planner/audience-render-state.js';
it('source clock bridge binds adjacent ranges, exact renderer states and typed source identities',()=>{
 const audience:any={kind:'http',request:'GET /',body:'Hello World!',port:'3000',cuts:[100,200],intervals:[{start:10,end:80},{start:110,end:180},{start:210,end:280}]};
 const child:any={input:{renderStateProfile:AUDIENCE_RENDER_STATE_PROFILE},props:{audience},pack:{input:{story:{evidence:{objects:[{id:'request',kind:'http-request'}]}}}}};
 const left={kind:'story-slice',sceneId:'first',previewTaskId:'a'.repeat(64),sourceStartFrame:10,sourceEndFrame:100},right={kind:'story-slice',sceneId:'second',previewTaskId:'a'.repeat(64),sourceStartFrame:100,sourceEndFrame:190};
 const hash=(f:number)=>sha256(canonical(audienceRenderState(audience,f)));
 const bridge={fromSceneId:'first',toSceneId:'second',previewTaskId:'a'.repeat(64),sourceBoundaryFrame:100,entityMap:[{sourceObjectId:'request',renderEntityId:'http-request'}],expectedExitStateHash:hash(100),expectedEntryStateHash:hash(100),expectedLastVisibleStateHash:hash(99),expectedNextStateHash:hash(101)};
 expect(validateSourceClockBridge(bridge,left,right,child).stateTrace.map(s=>s.state.frame)).toEqual([98,99,100,101]);
 for(const mutated of [{...bridge,expectedEntryStateHash:hash(99)},{...bridge,sourceBoundaryFrame:101},{...bridge,entityMap:[{sourceObjectId:'request',renderEntityId:'http-response'}]},{...bridge,entityMap:[...bridge.entityMap,...bridge.entityMap]}])expect(()=>validateSourceClockBridge(mutated,left,right,child)).toThrow();
 for(const changed of [{...right,sourceStartFrame:101},{...right,previewTaskId:'b'.repeat(64)},{...right,kind:'placeholder'}])expect(()=>validateSourceClockBridge(bridge,left,changed,child)).toThrow();
 expect(()=>validateSourceClockBridge(bridge,left,right,{...child,input:{}})).toThrow();
 expect(NarrativeContinuitySpec.safeParse({schemaVersion:'narrative-technical-excerpt/1.0'}).success).toBe(false);
});
it('distinct rembg outputs never acquire the persistent input identity',()=>{
 const p:any={kind:'image-outputs',cuts:[100,200],intervals:[{start:10,end:80},{start:110,end:180},{start:210,end:280}]};
 const s=audienceRenderState(p,100);expect(s.entities['image-input']).toMatchObject({visible:true,origin:'same-synthetic-input-photo'});expect(s.entities['image-cutout']).toMatchObject({origin:'distinct-derived-cutout-illustration'});expect(s.entities['image-mask']).toMatchObject({origin:'distinct-derived-mask-illustration'});
});
