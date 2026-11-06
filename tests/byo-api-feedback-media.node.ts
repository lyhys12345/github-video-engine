import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256,canonical} from '../src/core/util.js';
import {ffmpegPath,ffprobePath} from '../src/providers/local.js';
import {authorNarrativeViaApi,continueApiNarrative} from '../src/workflow/narrative-api-author.js';
import {generateApiFeedback,continueApiFeedback} from '../src/workflow/narrative-api-feedback.js';
import {signal,env,testKey,mock,completion,started,fixture,fileBytes} from './byo-api-support.js';
import {feedbackFixture} from './byo-feedback-support.js';
test('ordinary feedback -> one localhost plan -> guarded narration+visual revision -> keyless real media/history/cache',{timeout:300000},async()=>{
 const f=await started(),answer=await fixture(f);let authorRequests=0,feedbackRequests=0;
 const s=await mock((_q,r,b)=>{if(b.response_format.json_schema.name==='github_video_author'){authorRequests++;r.end(JSON.stringify(completion(answer)));}else{feedbackRequests++;r.end(JSON.stringify(completion({planJson:JSON.stringify(feedbackFixture(b))})));}});
 const author=join(f.root,'api-author-base'),out=join(f.root,'api-feedback-one');let baseline:any,feedback:any;
 try{await authorNarrativeViaApi(f.root,s.config,author,true,signal,env);await continueApiNarrative(f.root,author,'speech',signal);baseline=await continueApiNarrative(f.root,author,'preview',signal);
 const oldMovie=join(baseline.run.details.movie.output.bundle,'excerpt.mp4'),oldHash=sha256(await readFile(oldMovie)),oldAuthor=sha256(await readFile(join(author,'author/narrative.json'))),source=sha256(await readFile(join(f.root,'source.json')));
 feedback=await generateApiFeedback(f.root,s.config,'开场说得更直接，并让传递动画更快。',out,true,'speech',signal,env);assert.equal(feedback.providerRequests,1);assert.equal(feedback.local.applied.actionsExecuted,1);assert.equal(feedback.local.status,'checkpoint-complete');assert.equal(authorRequests,1);assert.equal(feedbackRequests,1);
 await s.close();
 const result:any=await continueApiFeedback(f.root,out,'preview',signal);assert.equal(result.providerRequests,0);assert.equal(result.keyRead,false);assert.equal(result.status,'editable-preview-complete');const run=result.applied.run,movie=join(run.details.movie.output.bundle,'excerpt.mp4');
 const probe=spawnSync(ffprobePath(),['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,nb_frames','-of','json',movie],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);const measured=JSON.parse(probe.stdout);assert.equal(Number(measured.format.duration),18);assert.equal(Number(measured.streams.find((s:any)=>s.codec_type==='video').nb_frames),540);assert.ok(measured.streams.some((s:any)=>s.codec_type==='audio'));const decode=spawnSync(ffmpegPath(),['-v','error','-i',movie,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0,decode.stderr);
 assert.equal(sha256(await readFile(oldMovie)),oldHash);assert.equal(sha256(await readFile(join(author,'author/narrative.json'))),oldAuthor);assert.equal(sha256(await readFile(join(f.root,'source.json'))),source);
 const plan=JSON.parse(await readFile(join(out,'plan.json'),'utf8')),before=JSON.parse(await readFile(join(author,'author/narrative.json'),'utf8')),after=JSON.parse(await readFile(join(out,'applied/author/narrative.json'),'utf8'));assert.deepEqual(after.claims,before.claims);assert.equal(after.scenes[0].narration,'请求先到服务器。');assert.equal(plan.feedback.interpretedBy,'api-model');assert.ok((await readFile(join(run.details.movie.output.bundle,'caption-ledger.json'),'utf8')).includes('请求先到服务器。'));
 const changed=plan.changes[0].sceneId;assert.ok(run.cache.scenes.filter((s:any)=>s.sceneId!==changed).every((s:any)=>s.assets&&s.sourcePreview));assert.equal(run.cache.scenes.find((s:any)=>s.sceneId===changed).sourcePreview,false);for(const v of run.cache.voice){const old=baseline.run.cache.voice.find((a:any)=>a.sceneId===v.sceneId);assert.equal(v.generationTaskId===old.generationTaskId,v.sceneId!==changed);}
 const repeated:any=await continueApiFeedback(f.root,out,'preview',signal);assert.equal(repeated.applied.actionsExecuted,0);assert.equal(repeated.providerRequests,0);assert.ok(!(await fileBytes(out)).includes(testKey));await mkdir('work/api-feedback-check',{recursive:true});await writeFile('work/api-feedback-check/media.json',canonical({workspace:f.root,out,preview:join(f.root,'workspace-preview.html'),oldMovie,newMovie:movie,oldMovieSha256:oldHash,newMovieSha256:sha256(await readFile(movie)),probe:measured,fullDecodeExit:decode.status,feedbackRequests,baselineMockAuthorRequests:authorRequests,localProviderRequests:0,changedScene:changed,sourceUnchanged:true,oldAuthorUnchanged:true,claimsUnchanged:true,repeatActions:repeated.applied.actionsExecuted,cache:run.cache,review:'pending',realProvider:'not run',realClaude:'not run',fixture:'synthetic sources and predetermined localhost response; not an LLM'}));console.log(JSON.stringify({status:'feedback-media-verified',seconds:18,changedScene:changed,preview:join(f.root,'workspace-preview.html')}));
 }finally{await s.close().catch(()=>{});}
});
