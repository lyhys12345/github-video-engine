// Opt-in real local media smoke. No account, real key, remote model or reference-code execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {sha256,canonical} from '../src/core/util.js';
import {ffmpegPath,ffprobePath} from '../src/providers/local.js';
import {authorNarrativeViaApi,continueApiNarrative} from '../src/workflow/narrative-api-author.js';
import {signal,env,mock,completion,started,fixture,fileBytes,testKey} from './byo-api-support.js';

test('localhost author -> keyless speech -> editable preview -> verified cache repeat', {timeout:300000},async()=>{
 const f=await started(),answer=await fixture(f),server=await mock((_q,res)=>res.end(JSON.stringify(completion(answer))));
 const candidate=join(f.root,'api-author-media');
 try{const authored=await authorNarrativeViaApi(f.root,server.config,candidate,true,signal,env);assert.equal(authored.status,'api-authored-planning-complete');assert.equal(server.count,1);}finally{await server.close();}
 // Provider socket is now closed; no credentials or provider configuration are passed to continuation.
 const receiptBefore=sha256(await readFile(join(candidate,'api-report.json'))),sourceBefore=sha256(await readFile(join(f.root,'source.json')));
 const speech:any=await continueApiNarrative(f.root,candidate,'speech',signal);assert.equal(speech.providerRequests,0);assert.equal(speech.keyRead,false);assert.equal(speech.status,'checkpoint-complete');
 const preview:any=await continueApiNarrative(f.root,candidate,'preview',signal);assert.equal(preview.status,'editable-preview-complete');assert.equal(preview.providerRequests,0);
 const movie=preview.run.details.movie,physical=join(movie.output.bundle,'excerpt.mp4');
 const probe=spawnSync(ffprobePath(),['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,nb_frames,sample_rate','-of','json',physical],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);
 const measured=JSON.parse(probe.stdout);assert.equal(Number(measured.format.duration),movie.timeline.seconds);assert.equal(Number(measured.streams.find((s:any)=>s.codec_type==='video').nb_frames),movie.timeline.seconds*30);assert.ok(measured.streams.some((s:any)=>s.codec_type==='audio'));
 const decode=spawnSync(ffmpegPath(),['-v','error','-i',physical,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0,decode.stderr);
 const repeated:any=await continueApiNarrative(f.root,candidate,'preview',signal);assert.equal(repeated.run.details.movie.taskId,movie.taskId);assert.equal(repeated.run.cache.narratedPreview,true);assert.ok(repeated.run.cache.scenes.every((s:any)=>s.assets&&s.sourcePreview));assert.ok(repeated.run.cache.voice.every((s:any)=>s.generation&&s.import));
 assert.equal(sha256(await readFile(join(candidate,'api-report.json'))),receiptBefore);assert.equal(sha256(await readFile(join(f.root,'source.json'))),sourceBefore);assert.ok(!(await fileBytes(candidate)).includes(testKey));
 await mkdir('work/reference-check',{recursive:true});const report={schemaVersion:'byo-local-preview-check/1.0',workspace:f.root,candidate,providerRequests:1,provider:'closed localhost mock, no real model',keylessContinuations:[speech.report,preview.report,repeated.report],preview:join(f.root,'workspace-preview.html'),movie:physical,movieSha256:sha256(await readFile(physical)),taskId:movie.taskId,seconds:movie.timeline.seconds,probe:measured,fullDecodeExit:decode.status,repeatCache:repeated.run.cache,sourceUnchanged:true,apiReceiptUnchanged:true,credentialPersisted:false,claims:'synthetic test fixture; not semantic evidence',realClaude:'not run',realProvider:'not run',review:'pending'};
 await writeFile(resolve('work/reference-check/media-check.json'),canonical(report));console.log(JSON.stringify({status:'local-mock-preview-verified',seconds:report.seconds,taskId:report.taskId,preview:report.preview}));
});
