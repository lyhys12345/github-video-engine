import {it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sha256,canonical} from '../src/core/util.js';
import {freezeMediaExperiment,verifyMediaExperiment,mediaReviewDecision,startMediaRepair,mediaRepairStatus,recordMediaReview,applyMediaRepair,mediaBenchmarkSummary} from '../src/workflow/rsi-media.js';

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'rsi-media-'));
 const assets=[];
 for(const [role,ext]of [['script','txt'],['brief','json'],['source','md'],['video','mp4'],['audio','wav'],['frame','png']] as const){
  // Deliberately non-playable fixture bytes: these tests exercise binding, not codec validity or perception.
  const path=join(root,'original-'+role+'.'+ext),bytes=Buffer.from('TEST ONLY '+role);
  await writeFile(path,bytes);assets.push({role,path,sha256:sha256(bytes),rightsConfirmed:true as const});
 }
 return {root,input:{schemaVersion:'rsi-media-input/1.0' as const,id:'fixture',repository:'https://github.com/example/one',category:'audio',split:'calibration' as const,baseline:{assets},candidate:{assets},requirements:'Understand input and output',rubric:'Clear, factual, paced',requiredModalities:['script','frames','audio','continuous-av'] as const}};
}
async function review(packet:string,verdict:'PASS'|'REVISE'|'UNVERIFIED'='PASS',reviewer='judge'){
 const frozen=await verifyMediaExperiment(packet),role={script:'script',frames:'frame',audio:'audio','continuous-av':'video'} as const,method={script:'read',frames:'viewed',audio:'listened','continuous-av':'watched-and-listened'} as const;
 const observations=frozen.experiment.requiredModalities.flatMap(m=>(['A','B'] as const).flatMap(label=>frozen.manifests[label].assets.filter(a=>a.role===role[m]).map(a=>({label,modality:m,method:method[m],artifactSha256:a.sha256,complete:true,notes:'SYNTHETIC REVIEW FOR CONTRACT TEST ONLY'}))));
 return {schemaVersion:'rsi-media-review/1.0',bindingSha256:sha256(canonical(frozen.binding)),report:{experimentSha256:sha256(canonical(frozen.experiment)),reviewer,verdict,coverage:[...frozen.experiment.requiredModalities],findings:verdict==='REVISE'?['TEST ONLY improve hook']:[],preferred:'tie'},observations};
}
it('freezes anonymous media, requires rights/hash bindings, and detects changed files',async()=>{
 const {root,input}=await fixture(),packet=join(root,'frozen');
 await expect(freezeMediaExperiment({...input,candidate:{assets:input.candidate.assets.map(a=>a.role==='audio'?{...a,rightsConfirmed:undefined}:a)}},packet)).rejects.toThrow('rights');
 await expect(lstat(packet)).rejects.toMatchObject({code:'ENOENT'});
 await freezeMediaExperiment(input,packet);
 const frozen=await verifyMediaExperiment(packet),manifestText=await readFile(join(packet,'reviewer','A.txt'),'utf8');
 expect(manifestText).not.toContain('original-');expect(manifestText).not.toContain(root);
 await expect(freezeMediaExperiment(input,packet)).rejects.toThrow('exists');
 await writeFile(join(packet,'reviewer','A',frozen.manifests.A.assets[0]!.path),'changed');
 await expect(verifyMediaExperiment(packet)).rejects.toThrow('integrity');
});
it('rejects invented modality coverage and records missing modalities as UNVERIFIED',async()=>{
 const {root,input}=await fixture(),packet=join(root,'frozen');await freezeMediaExperiment(input,packet);
 const r=await review(packet);
 await expect(mediaReviewDecision(packet,{...r,observations:[]})).rejects.toThrow('coverage');
 const partial={...r,report:{...r.report,coverage:['script']},observations:r.observations.filter(o=>o.modality==='script')};
 expect((await mediaReviewDecision(packet,partial)).decision.status).toBe('UNVERIFIED');
 expect((await mediaReviewDecision(packet,r)).comparison).toBe('tie');
 await expect(mediaReviewDecision(packet,{...r,bindingSha256:'0'.repeat(64)})).rejects.toThrow('different media');
});
it('persists media repair, fixes reviewer identity, detects media mutation, and limits attempts',async()=>{
 const {root,input}=await fixture(),chain=join(root,'repair');let state=await startMediaRepair(chain,input);
 expect((await startMediaRepair(chain,input)).current!.recordSha256).toBe(state.current!.recordSha256);
 await recordMediaReview(chain,state.current!.recordSha256,await review(state.currentPacket!,'REVISE'));
 state=await applyMediaRepair(chain,state.current!.recordSha256,input.candidate);
 expect(state.current!.experiment.attempt).toBe(2);
 await expect(recordMediaReview(chain,state.current!.recordSha256,await review(state.currentPacket!,'PASS','replacement'))).rejects.toThrow('Reviewer changed');
 await recordMediaReview(chain,state.current!.recordSha256,await review(state.currentPacket!,'REVISE'));
 state=await applyMediaRepair(chain,state.current!.recordSha256,input.candidate);
 await recordMediaReview(chain,state.current!.recordSha256,await review(state.currentPacket!,'REVISE'));
 expect((await mediaRepairStatus(chain)).currentReview.decision.status).toBe('STOP');
 await expect(applyMediaRepair(chain,state.current!.recordSha256,input.candidate)).rejects.toThrow('REVISE');
 const packet=await verifyMediaExperiment(state.currentPacket!);
 await writeFile(join(state.currentPacket!,'reviewer','B',packet.manifests.B.assets[0]!.path),'changed');
 await expect(mediaRepairStatus(chain)).rejects.toThrow('integrity');
});
it('requires two calibration categories and a distinct holdout without treating ties as improvements',async()=>{
 const {root,input}=await fixture(),roots=[];
 for(const [i,category,split] of [[1,'audio','calibration'],[2,'map','calibration'],[3,'developer-tool','holdout']] as const){
  const path=join(root,'chain-'+i);roots.push(path);const state=await startMediaRepair(path,{...input,id:'test-'+i,repository:'https://github.com/example/project'+i,category,split});
  await recordMediaReview(path,state.current!.recordSha256,await review(state.currentPacket!));
 }
 const summary=await mediaBenchmarkSummary(roots);expect(summary.coverageReady).toBe(true);expect(summary.improved).toBe(0);expect(summary.pending).toBe(0);
 expect((await mediaBenchmarkSummary([roots[0]!,roots[0]!,roots[2]!])).coverageReady).toBe(false);
});


it('does not treat a bare legacy PASS as an observed multimodal review',async()=>{
 const {root,input}=await fixture(),chain=join(root,'repair');
 const state=await startMediaRepair(chain,input),r=await review(state.currentPacket!);
 const path=join(root,'bare.json');await writeFile(path,canonical(r.report));
 const {recordRepairReview}=await import('../src/workflow/rsi-repair.js');
 await recordRepairReview(join(chain,'chain'),state.current!.recordSha256,path);
 await expect(mediaRepairStatus(chain)).rejects.toThrow('raw multimodal review');
});

