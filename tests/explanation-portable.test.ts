import {readFile,writeFile,mkdir,rename,cp,lstat,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,it,vi} from 'vitest';
import {sourceFixture,workflowRoot} from './workflow-support.js';
import {sourceFingerprint} from '../src/workflow/store.js';
import {evidenceWorkspace} from '../src/workflow/project-evidence.js';
import {authoringPacket} from '../src/workflow/agent-authoring.js';
import {presentationFactReview} from '../src/workflow/fact-review.js';
import {importPortableExplanation,renderPortableExplanation,PortableManifest} from '../src/workflow/explanation-portable.js';
import {canonical,sha256} from '../src/core/util.js';
import {StoredStoryProposal} from '../src/contracts/authoring.js';
import {PresentationPlan} from '../src/contracts/presentation.js';
import {ArtifactStore} from '../src/assets/store.js';
import {readTask} from '../src/story-planner/runtime.js';
const signal=new AbortController().signal;
async function fixture(){
 const root=await workflowRoot('portable'),bundle=join(root,'bundle');await mkdir(join(bundle,'audio'),{recursive:true});
 const snapshot=sourceFixture(),workspace=evidenceWorkspace('original',sourceFingerprint(snapshot),snapshot),identity=authoringPacket(workspace).request;
 const ids=['listener','request','handler','response'];
 const proposal=StoredStoryProposal.parse({schemaVersion:'1.0',kind:'session-story-proposal',...identity,authorship:{kind:'session-agent'},useCase:{title:'TEST ONLY',audience:'Fixture readers',question:'What happens?',scope:'Synthetic validation only',exclusions:[],goalClaimIds:['fact'],inputClaimIds:['fact'],processClaimIds:['fact'],outputClaimIds:['fact'],limitationClaimIds:[]},claims:[{id:'fact',statement:'TEST ONLY fixture assertion',basis:{kind:'documented'},citations:[{sourceId:'source-1',sourceSha256:snapshot.documents[0]!.sha256,startLine:1,endLine:1,quote:'# Demo'}]}],entities:ids.map(id=>({id,label:id,role:'Fixture role',claimIds:['fact']})),mechanisms:[{id:'mechanism',adapterCandidate:'http',explanation:'TEST ONLY mechanism',inputEntityIds:['listener'],outputEntityIds:['response'],claimIds:['fact'],assumptions:[],visualIntent:'Synthetic'}],beats:[{id:'beat',purpose:'Synthetic example',narration:'TEST ONLY',narrationClaimIds:['fact'],entityIds:ids,mechanismIds:['mechanism'],timingIntent:'Synthetic',visual:{description:'Synthetic fixture',depiction:'illustrative',claimIds:['fact']}}],openQuestions:[]});
 const param=(value:unknown)=>({value,evidence:{claimId:'fact',citationIndex:0}});
 const plan=PresentationPlan.parse({schemaVersion:'1.0',kind:'session-presentation-plan',...identity,proposalHash:sha256(canonical(proposal)),authorship:{kind:'session-agent'},module:{id:'http-exchange/1',initialState:'ready',entities:Object.fromEntries(ids.map(id=>[id,id])),parameters:{port:param(3000),method:param('GET'),path:param('/'),body:param('Fixture')}},beats:[{beatId:'beat',frames:96,events:['listen','request','match','respond'].map((kind,i)=>({kind,atFrame:i*4,claimIds:['fact']}))}]});
 const presentation={mode:'narrated',spec:{schemaVersion:'explanation-narrated-render/1.0',voicePreparationManifestSha256:'1'.repeat(64),plan,offsets:[{beatId:'beat',startOffsetFrames:0}]}};
 const packet=presentationFactReview(proposal,workspace.manifest.sources.map(s=>({...s,bytes:workspace.files.get(s.path)!})),presentation);
 const review={schemaVersion:'fact-review-receipt/1.0',candidateHash:packet.candidateHash,packetHash:packet.packetHash,reviewer:{kind:'session-agent',identity:'TEST ONLY synthetic receipt, not semantic acceptance'},items:packet.requiredItems.map(id=>({id,verdict:'supported',reason:'TEST ONLY structural validation',limitations:'No actual factual review'}))};
 const audio=await readFile('fixtures/tts-synthetic.mp3'),receipt=Buffer.from(canonical({artifact:{sha256:sha256(audio),mediaType:'audio/mpeg'},disclaimer:'TEST ONLY local synthetic audio'}));
 const manifest=PortableManifest.parse({schemaVersion:'portable-explanation/1.0',snapshot,proposal,presentation,historicalReview:review,maxSeconds:12,clips:[{beatId:'beat',sha256:sha256(audio),bytes:audio.length,mediaType:'audio/mpeg',originalReceiptSha256:sha256(receipt),originalReceiptBytes:receipt.length}]});
 await writeFile(join(bundle,'portable.json'),canonical(manifest));await writeFile(join(bundle,'audio/0.audio'),audio);await writeFile(join(bundle,'audio/0.receipt.json'),receipt);
 return {root,bundle,manifest,digest:sha256(canonical(manifest)),audio};
}
it('snapshots data-only import into fresh state, namespaces the editable mapping, preserves historical review and stays pending after source package moves',async()=>{
 const f=await fixture(),data=join(f.root,'new-state');const result=await importPortableExplanation(data,f.bundle,f.digest,join(f.root,'handoff'),signal);
 expect(result).toMatchObject({currentReview:'pending',ownerAcceptance:'pending',cached:false});
 const task=await readTask(data,result.taskId,null);expect(JSON.stringify(task.input)).not.toContain(f.bundle);
 const artifacts=new ArtifactStore(data);expect(await readFile(artifacts.path(task.outputs[0]!))).toEqual(f.audio);
 const edit=JSON.parse(await readFile(join(result.output.bundle,'edit.json'),'utf8'));
 expect(edit.plan.binding.projectId).toBe('portable-'+result.taskId.slice(0,48));expect(edit.plan.binding.projectId).not.toBe(f.manifest.proposal.binding.projectId);
 const old=JSON.parse(await readFile(join(result.output.bundle,'original-portable.json'),'utf8'));expect(old.historicalReview).toEqual(f.manifest.historicalReview);
 await rename(f.bundle,join(f.root,'package-no-longer-addressable'));
 const editPath=join(f.root,'wrong-edit.json');await writeFile(editPath,canonical({...edit,importTaskId:'0'.repeat(64)}));
 await expect(renderPortableExplanation(data,result.taskId,editPath,join(f.root,'bad-render'),signal)).rejects.toMatchObject({code:'PORTABLE'});
});
it.each(['digest','audio','receipt','quote','source','review','unknown','missing','executable','sqlite'])('refuses %s package tampering before creating state',async kind=>{
 const f=await fixture(),data=join(f.root,'absent-state');let digest=f.digest;
 if(kind==='digest')digest='0'.repeat(64);
 if(kind==='audio')await writeFile(join(f.bundle,'audio/0.audio'),'changed');
 if(kind==='receipt')await writeFile(join(f.bundle,'audio/0.receipt.json'),'changed');
 if(kind==='quote')f.manifest.proposal.claims[0]!.citations[0]!.quote='not the source';
 if(kind==='source')f.manifest.snapshot.documents[0]!.content='changed';
 if(kind==='review')f.manifest.historicalReview.items.pop();
 if(kind==='unknown')(f.manifest as any).execute='malicious';
 if(['quote','source','review','unknown'].includes(kind)){await writeFile(join(f.bundle,'portable.json'),canonical(f.manifest));digest=sha256(canonical(f.manifest));}
 if(kind==='missing')await rename(join(f.bundle,'audio/0.audio'),join(f.root,'audio-outside'));
 if(kind==='executable')await writeFile(join(f.bundle,'render.mjs'),'throw Error("never execute")');
 if(kind==='sqlite')await writeFile(join(f.bundle,'tasks.sqlite'),'never import');
 await expect(importPortableExplanation(data,f.bundle,digest,join(f.root,'out'),signal)).rejects.toBeTruthy();await expect(lstat(data)).rejects.toMatchObject({code:'ENOENT'});
});
it('rejects linked package files and output/state overlap',async()=>{
 const f=await fixture();await rename(join(f.bundle,'audio'),join(f.root,'external-audio'));
 await symlink(join(f.root,'external-audio'),join(f.bundle,'audio'),process.platform==='win32'?'junction':'dir');
 await expect(importPortableExplanation(join(f.root,'state'),f.bundle,f.digest,join(f.root,'out'),signal)).rejects.toBeTruthy();
 await expect(importPortableExplanation(join(f.bundle,'state'),f.bundle,f.digest,join(f.root,'out'),signal)).rejects.toMatchObject({code:'PORTABLE'});
});
it('refuses corruption of the imported CAS before local plan or renderer creation',async()=>{
 const f=await fixture(),data=join(f.root,'state');const imported=await importPortableExplanation(data,f.bundle,f.digest,join(f.root,'handoff'),signal);
 const task=await readTask(data,imported.taskId,null),store=new ArtifactStore(data);
 await writeFile(store.path(task.outputs[0]!), 'corrupt imported snapshot');
 const editPath=join(imported.output.bundle,'edit.json');
 await expect(renderPortableExplanation(data,imported.taskId,editPath,join(f.root,'out'),signal)).rejects.toBeTruthy();
 await expect(lstat(join(data,'workflow','workflow.sqlite'))).rejects.toMatchObject({code:'ENOENT'});
});
it('propagates a simulated parent deadline cancellation into nested media work (MOCK parent timeout; real import/plan/audio validation)',async()=>{
 const f=await fixture(),data=join(f.root,'state');const imported=await importPortableExplanation(data,f.bundle,f.digest,join(f.root,'handoff'),signal);
 const {TaskRunner}=await import('../src/orchestrator/tasks.js');const original=TaskRunner.prototype.run;
 const spy=vi.spyOn(TaskRunner.prototype,'run').mockImplementation((async function(this:InstanceType<typeof TaskRunner>,kind:any,input:any,work:any,outer:any,limits:any){
  if(kind==='portable-explanation-render-v1'){const child=new AbortController();child.abort(new Error('TEST ONLY parent deadline'));return work('unused',child.signal);}
  return original.call(this,kind,input,work,outer,limits);
 }) as any);
 try{await expect(renderPortableExplanation(data,imported.taskId,join(imported.output.bundle,'edit.json'),join(f.root,'out'),signal)).rejects.toThrow('TEST ONLY parent deadline');await expect(lstat(join(f.root,'out'))).rejects.toMatchObject({code:'ENOENT'});}finally{spy.mockRestore();}
});
