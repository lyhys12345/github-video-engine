import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {command} from '../src/core/process.ts';
import {canonical,sha256} from '../src/core/util.ts';
const root=resolve(process.argv[2]??'work/bom-source'),results=[];
for(const r of await readdir(join(root,'runs')))for(const a of await readdir(join(root,'runs',r,'attempts'))){const path=join(root,'runs',r,'attempts',a,'result.json');try{results.push({path,...JSON.parse(await readFile(path,'utf8'))});}catch{}}
const authorHash=async(dir)=>{
 const entries=await Promise.all((await readdir(dir)).map(async name=>[name,sha256(await readFile(join(dir,name)))]));
 return sha256(canonical(entries.sort((a,b)=>a[0].localeCompare(b[0]))));
};
const originalHash=await authorHash(join(root,'author')),editedHash=await authorHash(join(root,'author-edited'));
const original=results.find(r=>r.status==='editable-preview-complete'&&r.authorSha256===originalHash),edited=results.find(r=>r.status==='editable-preview-complete'&&r.authorSha256===editedHash&&!r.cache.narratedPreview);
if(!original||!edited)throw Error('Both original and edited movies must actually finish first.');
await mkdir(join(root,'checks'),{recursive:true});
const media=[];
for(const[kind,r]of [['original',original],['edited',edited]]){
 const bundle=r.details.movie.output.bundle,movie=join(bundle,'excerpt.mp4');
 await command('ffmpeg',['-v','error','-i',movie,'-f','null','-']);
 const p=JSON.parse(await command('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',movie]));
 const v=p.streams.find(s=>s.codec_type==='video'),a=p.streams.find(s=>s.codec_type==='audio');
 if(+v.nb_read_frames!==1440||+p.format.duration!==48||v.codec_name!=='h264'||a.codec_name!=='aac')throw Error('Unexpected physical media');
 const ledger=JSON.parse(await readFile(join(bundle,'audio-ledger.json'),'utf8'));
 if(ledger.recordings.length!==5)throw Error('Incomplete recording coverage');
 const plan=JSON.parse(await readFile(join(bundle,'narrative.json'),'utf8'));
 for(const scene of plan.scenes){const voice=ledger.recordings.find(x=>x.beatId===scene.id);if(!voice||voice.transcript!==scene.narration||voice.sampleCount!==voice.decodedCompleteSamples||voice.playbackRate!==1)throw Error('Recording/text closure failed');}
 const coverage=JSON.parse(await readFile(join(bundle,'coverage.json'),'utf8'));
 if(coverage.length!==5||coverage.some(x=>x.excerptDisposition==='omitted-supported-scene'))throw Error('Incomplete scene coverage');
 media.push({kind,result:r.path,taskId:r.tasks.narratedPreview,bundle,movie,sha256:sha256(await readFile(movie)),seconds:+p.format.duration,frames:+v.nb_read_frames,fullDecode:true,video:v.codec_name,audio:a.codec_name,recordingSeconds:ledger.recordings.reduce((n,x)=>n+x.sampleCount/48000,0),recordings:ledger.recordings,coverage,cache:r.cache});
 await command('ffmpeg',['-v','error','-ss','14','-i',movie,'-frames:v','1','-y',join(root,'checks',kind+'-mechanism.png')]);
 await command('ffmpeg',['-v','error','-ss','32','-i',movie,'-frames:v','1','-y',join(root,'checks',kind+'-limitation.png')]);
}
const changed=media[0].recordings.filter(x=>{const other=media[1].recordings.find(y=>y.beatId===x.beatId);return x.sourceAudioSha256!==other.sourceAudioSha256;}).map(x=>x.beatId);
if(canonical(changed)!==canonical(['scene-limitation']))throw Error('Unexpected recording invalidation');
for(const s of edited.cache.scenes)if(s.sceneId==='scene-limitation'?s.sourcePreview||s.assets:s.assets!==true||s.sourcePreview!==true)throw Error('Unexpected source scene cache');
const editSpeech=results.find(r=>r.authorSha256===editedHash&&r.details.through==='speech');
if(!editSpeech||editSpeech.cache.speech.some(s=>s.sceneId==='scene-limitation'?s.generation||s.import:!s.generation||!s.import))throw Error('Unexpected edited speech cache');
if(media[0].sha256===media[1].sha256)throw Error('Edited video did not change');
const repeat=results.find(r=>r.status==='editable-preview-complete'&&r.authorSha256===editedHash&&r.cache.narratedPreview);
if(!repeat||!repeat.cache.scenes.every(s=>s.assets&&s.sourcePreview)||!repeat.cache.voice.every(s=>s.generation&&s.import))throw Error('Exact-input repeat must reuse every scene, recording and movie');
const summary={status:'experimental-unreviewed',repository:'https://github.com/sindresorhus/strip-bom',commit:'c691ec5724be8bb61e9df269a2577fcba41353f7',source:original.source,authorship:'actual session Agent; no target execution/model dispatch',changedNarrationScenes:changed,unchangedSourceScenesReused:4,unchangedRecordingsReused:4,media,pending:['semantic facts','listening','word alignment','continuous AV','owner acceptance'],limits:{Judge:false,paidAPI:false,targetExecution:false,formalFilm:false,deployment:false}};
await writeFile(join(root,'checks/verification.json'),JSON.stringify(summary,null,2));
await writeFile(join(root,'checks/summary.json'),JSON.stringify({...summary,media:media.map(({kind,taskId,seconds,frames,sha256,fullDecode,recordingSeconds})=>({kind,taskId,seconds,frames,sha256,fullDecode,recordingSeconds})),exactRepeatAllCached:true},null,2));
const src=path=>relative(root,path).replaceAll('\\','/');
await writeFile(join(root,'preview.html'),`<!doctype html><meta charset="utf-8"><title>strip-bom 实验技术预览</title><h1>来源示意，未执行目标，事实与听感待审</h1><h2>原版：48秒</h2><video controls width="360" src="${src(media[0].movie)}"></video><h2>文案修改版：48秒</h2><p>只修改限制章节，其他四章来源动画与录音复用。</p><video controls width="360" src="${src(media[1].movie)}"></video><p><a href="author-edited/narrative.json">当前可编辑策划</a> <a href="author-edited/story.json">Story</a> <a href="author-edited/animation.json">动画</a> <a href="author-edited/run.json">时长与字幕</a> <a href="checks/verification.json">技术验证</a></p>`);
console.log(JSON.stringify({preview:join(root,'preview.html'),media:media.map(({kind,taskId,seconds,frames,sha256})=>({kind,taskId,seconds,frames,sha256})),changed}));
