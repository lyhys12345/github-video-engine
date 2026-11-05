import {readFile,writeFile,readdir,mkdir,lstat} from 'node:fs/promises';
import {join,resolve,relative,basename} from 'node:path';
import {command} from '../src/core/process.ts';
import {canonical,sha256} from '../src/core/util.ts';
import {readNarrativeAuthorData} from '../src/workflow/narrative-run.ts';
const root=resolve('work/mri'),results=[],check=(yes,message)=>{if(!yes)throw Error(message);};
for(const r of await readdir(join(root,'runs')))for(const a of await readdir(join(root,'runs',r,'attempts'))){const path=join(root,'runs',r,'attempts',a,'result.json');try{results.push({path,...JSON.parse(await readFile(path,'utf8'))});}catch{}}
const originalHash=(await readNarrativeAuthorData(join(root,'author'))).hash,editedHash=(await readNarrativeAuthorData(join(root,'author-feedback'))).hash;
const original=results.find(r=>r.status==='editable-preview-complete'&&r.authorSha256===originalHash&&!r.cache.narratedPreview),edited=results.find(r=>r.status==='editable-preview-complete'&&r.authorSha256===editedHash&&!r.cache.narratedPreview);
check(original&&edited,'Both actual movies must finish first.');
const baseline=JSON.parse(await readFile(join(root,'baseline-authorship.json'),'utf8')),oldMovie=JSON.parse(await readFile(join(root,'baseline-movie.json'),'utf8'));
check(sha256(await readFile(join(root,'source.json')))===baseline.sourceSha256,'Source record changed');check(sha256(await readFile(join(root,'request.json')))===baseline.requestSha256,'Immutable request changed');
for(const f of baseline.authorFiles)check(sha256(await readFile(join(root,'author',f.name)))===f.sha256,'Original author file changed');
check(sha256(await readFile(oldMovie.movie))===oldMovie.sha256,'Original movie bytes changed');
const dirs=await readdir(join(root,'authoring')),packetParent=join(root,'authoring',dirs[0]);
const packetDir=join(packetParent,(await readdir(packetParent)).find(x=>x.startsWith('.asset-staging')||x.startsWith('.s-'))),hand=JSON.parse(await readFile(join(packetDir,'agent-handoff.json'),'utf8'));
check(hand.binding.commit==='62b9ce4f25e1f7b476c99858c20882d86c010085','Commit changed');
async function files(dir){const out=[];for(const n of await readdir(dir)){const p=join(dir,n),s=await lstat(p);check(!s.isSymbolicLink(),'Linked export');if(s.isDirectory())out.push(...await files(p));else out.push(p);}return out;}
await mkdir(join(root,'checks'),{recursive:true});
const media=[];
for(const[kind,r]of [['original',original],['feedback',edited]]){
 const bundle=r.details.movie.output.bundle,movie=join(bundle,'excerpt.mp4');
 await command('ffmpeg',['-v','error','-i',movie,'-f','null','-']);
 const p=JSON.parse(await command('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',movie]));
 const v=p.streams.find(s=>s.codec_type==='video'),a=p.streams.find(s=>s.codec_type==='audio');
 check(+v.nb_read_frames===1530&&+p.format.duration===51&&v.codec_name==='h264'&&a.codec_name==='aac','Physical media mismatch');
 const ledger=JSON.parse(await readFile(join(bundle,'audio-ledger.json'),'utf8')),plan=JSON.parse(await readFile(join(bundle,'narrative.json'),'utf8')),pcm=await readFile(join(bundle,'voice/narration.pcm'));
 check(plan.scenes.length===5&&ledger.recordings.length===5,'Incomplete coverage');check(pcm.length===51*48000*2,'Mixed PCM length mismatch');
 let cursor=0;for(const scene of plan.scenes){const rec=ledger.recordings.find(x=>x.beatId===scene.id),cues=ledger.burnedCaptionLayout.filter(x=>x.beatId===scene.id);check(rec&&rec.transcript===scene.narration&&rec.sampleCount===rec.decodedCompleteSamples&&rec.playbackRate===1,'Whole recording closure failed');check(cues.map(x=>x.transcript).join('')===scene.narration&&cues.every(x=>x.lines.join('')===x.transcript),'Burned caption text mismatch');check(pcm.subarray(cursor,rec.startSample*2).every(b=>b===0),'Lead/gap audio is not silent');cursor=rec.endSample*2;}
 check(pcm.subarray(cursor).every(b=>b===0),'Audio tail is not silent');
 let sourceCopies=0;for(const path of await files(bundle)){const s=hand.read.sources.find(s=>basename(path)===s.path);if(s){check(sha256(await readFile(path))===s.sha256,'Exported source bytes changed');sourceCopies++;}}check(sourceCopies>=hand.read.sources.length,'Source closure missing');
 media.push({kind,result:r.path,taskId:r.tasks.narratedPreview,bundle,movie,movieSha256:sha256(await readFile(movie)),seconds:+p.format.duration,frames:+v.nb_read_frames,fullDecode:true,recordingSeconds:ledger.recordings.reduce((n,x)=>n+x.sampleCount/48000,0),recordings:ledger.recordings,sourceCopies,cache:r.cache,plan,pcm});
 await command('ffmpeg',['-v','error','-ss','25','-i',movie,'-frames:v','1','-y',join(root,'checks',kind+'-example.png')]);
}
check(canonical(original.source)===canonical(edited.source),'Run source binding changed');check(canonical(media[0].plan.claims)===canonical(media[1].plan.claims),'Evidence assertions/citations changed');
const changedAudio=[],unchangedPcm=[];
for(const rec of media[0].recordings){const next=media[1].recordings.find(x=>x.beatId===rec.beatId);if(rec.sourceAudioSha256!==next.sourceAudioSha256)changedAudio.push(rec.beatId);else{check(media[0].pcm.subarray(rec.startSample*2,rec.endSample*2).equals(media[1].pcm.subarray(next.startSample*2,next.endSample*2)),'Unchanged recording PCM differs');unchangedPcm.push(rec.beatId);}}
check(canonical(changedAudio)===canonical(['scene-example'])&&unchangedPcm.length===4,'Unexpected audio invalidation');
for(const s of edited.cache.scenes)check(s.sceneId==='scene-example'?!s.assets&&!s.sourcePreview:s.assets&&s.sourcePreview,'Unexpected scene cache behavior');
const editSpeech=results.find(r=>r.authorSha256===editedHash&&r.details.through==='speech');check(editSpeech&&editSpeech.cache.speech.every(s=>s.sceneId==='scene-example'?!s.generation&&!s.import:s.generation&&s.import),'Unexpected speech cache');
const repeat=results.find(r=>r.authorSha256===editedHash&&r.status==='editable-preview-complete'&&r.cache.narratedPreview);check(repeat&&repeat.cache.scenes.every(s=>s.assets&&s.sourcePreview)&&repeat.cache.voice.every(s=>s.generation&&s.import),'Exact-input repeat cache missing');
const before=JSON.parse(await readFile(join(root,'author/animation.json'),'utf8')).scenes.find(s=>s.sceneId==='scene-example'),after=JSON.parse(await readFile(join(root,'author-feedback/animation.json'),'utf8')).scenes.find(s=>s.sceneId==='scene-example');
check(sha256(canonical(before))!==sha256(canonical(after)),'Visual edit missing');check(media[0].movieSha256!==media[1].movieSha256,'Movie did not change');
const summary={status:'experimental-unreviewed',repository:hand.binding.repository,commit:hand.binding.commit,source:original.source,feedback:JSON.parse(await readFile(join(root,'feedback.json'),'utf8')),changedScene:'scene-example',changedAudio,unchangedPcm,oldAuthorAndMoviePreserved:true,sourceAssertionsAndBytesUnchanged:true,exactRepeatAllCached:true,visualRevision:{before,after},media:media.map(({kind,result,taskId,movie,movieSha256,seconds,frames,fullDecode,recordingSeconds,sourceCopies,cache})=>({kind,result,taskId,movie,movieSha256,seconds,frames,fullDecode,recordingSeconds,sourceCopies,cache})),tests:'12 directly relevant prose/scene-animation cases passed; actual media/source/caption/PCM/cache assertions passed',pending:['semantic facts','document/source unknown-option condition discrepancy','natural listening','word alignment','continuous AV','owner acceptance'],limits:{Judge:false,paidAPI:false,targetExecution:false,formalFilm:false,deployment:false}};
await writeFile(join(root,'checks/verification.json'),JSON.stringify(summary,null,2));
const url=p=>relative(root,p).replaceAll('\\','/').split('/').map(encodeURIComponent).join('/');
await writeFile(join(root,'comparison.html'),`<!doctype html><meta charset="utf-8"><h1>MRI 实验预览，未审</h1><p>固定来源；未运行目标。改稿反馈由本次会话Agent提供，不是用户验收。</p><h2>原版 51秒</h2><video controls width="360" src="${url(media[0].movie)}"></video><h2>旁白与画面反馈版 51秒</h2><video controls width="360" src="${url(media[1].movie)}"></video><p><a href="feedback.json">一句反馈</a> <a href="author-feedback/narrative.json">当前策划</a> <a href="author-feedback/animation.json">动画</a> <a href="checks/verification.json">完整证据</a></p>`);
console.log(JSON.stringify({comparison:join(root,'comparison.html'),media:summary.media.map(({kind,taskId,seconds,frames,movieSha256,recordingSeconds})=>({kind,taskId,seconds,frames,movieSha256,recordingSeconds})),unchangedPcm}));
