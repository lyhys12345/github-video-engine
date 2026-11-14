import {cp, lstat, mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {workflowRoot} from './workflow-support.js';
import {afterEach, expect, it, vi} from 'vitest';
import {command} from '../src/core/process.js';
import {canonical,sha256} from '../src/core/util.js';
import {ffprobePath} from '../src/providers/local.js';
import {produceTts} from '../src/tts/runtime.js';
import {verifyImportedRecording} from '../src/workflow/narration-voice.js';
import {runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {statusNarrativeWorkspace} from '../src/workflow/narrative-workspace.js';
import {exportNarrativeProject,importNarrativeProject} from '../src/workflow/project-portable.js';
import {started,fixture,signal} from './byo-api-support.js';

afterEach(()=>vi.unstubAllEnvs());
const noNetwork=async()=>{throw new Error('Do not fetch target repository during fixture media stages');};
const voiceLabel='TEST ONLY fixture WAV';
const brief={schemaVersion:'creative-brief/1.0',duration:{mode:'max',maxSeconds:60},style:'Technical fixture',audience:'Test',
 platforms:['Test'],language:'en-US',decision:'user-specified',notes:[]};

function toneWav(samples:number){
 const wav=Buffer.alloc(44+samples*2);
 wav.write('RIFF',0);
 wav.writeUInt32LE(wav.length-8,4);
 wav.write('WAVEfmt ',8);
 wav.writeUInt32LE(16,16);
 wav.writeUInt16LE(1,20);
 wav.writeUInt16LE(1,22);
 wav.writeUInt32LE(48000,24);
 wav.writeUInt32LE(96000,28);
 wav.writeUInt16LE(2,32);
 wav.writeUInt16LE(16,34);
 wav.write('data',36);
 wav.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(2500*Math.sin(i*2*Math.PI/120)),44+2*i);
 return wav;
}

async function checkStreams(movie:string,types:string[]){
 const probe=JSON.parse(await command(ffprobePath(),['-v','error','-show_entries','stream=codec_type','-of','json',movie],{signal}));
 expect(probe.streams.map((stream:{codec_type:string})=>stream.codec_type)).toEqual(types);
}

it('renders a genuine silent complete preview, then exact finished WAV narration without a synthesis profile',async()=>{
 const packages=await workflowRoot('cap-media-package');
 const f=await started(),source=f.first.binding.repository,state=join(f.root,'state'),author=join(f.root,'author'),authored=await fixture(f);
 const story=JSON.parse(authored.storyJson),plan=JSON.parse(authored.narrativeJson),config=JSON.parse(authored.runJson);
 const transcript='Fixture narration.';
 for(const shot of story.shots)shot.narration=transcript;
 for(const scene of plan.scenes)if(scene.execution.kind==='supported-story')scene.narration=transcript;
 await mkdir(author);
 await writeFile(join(author,'story.json'),canonical(story));
 await writeFile(join(author,'narrative.json'),canonical(plan));
 await writeFile(join(author,'animation.json'),authored.animationJson);
 vi.stubEnv('GVE_NARRATION_VOICE','private-invalid-profile');
 vi.stubEnv('GVE_ANNA_PROFILE',join(f.root,'missing-profile'));
 async function inputs(voice:unknown,speech:unknown){
  await writeFile(join(author,'creative-brief.json'),canonical({...brief,voice}));
  await writeFile(join(author,'run.json'),canonical({...config,speech}));
 }
 async function review(){
  const planned=await runNarrativeWorkspace(source,f.root,author,'planning',signal,noNetwork);
  if(!('authorSha256'in planned)||!planned.authorSha256)throw new Error('Expected an exact structural candidate');
  const path=join(f.root,'review-'+planned.authorSha256.slice(0,8)+'.json');
  await writeFile(path,canonical({schemaVersion:'candidate-review/1.0',candidateSha256:planned.authorSha256,
   ownerApprovedSha256:planned.authorSha256,stage:'script',reviewer:'TEST ONLY structural fixture',coverage:'script',verdict:'PASS',findings:[]}));
  return {reportPath:path};
 }
 await inputs({mode:'none'},[]);
 const silent=await runNarrativeWorkspace(source,f.root,author,'preview',signal,noNetwork,{},undefined,await review());
 expect(silent).toMatchObject({status:'editable-preview-complete',ownerListening:'not-applicable',
  details:{narration:'none',audioTrack:false,movie:{timeline:{totalFrames:540}}}});
 const silentTask='tasks'in silent?silent.tasks.silentPreview:undefined;
 if(!silentTask)throw new Error('Missing silent task');
 const silentStatus=await statusNarrativeWorkspace(f.root,signal);
 expect(silentStatus).toMatchObject({task:silentTask,ownerListening:'not-applicable',next:{stage:'editable-silent-preview'}});
 await checkStreams(join(silentStatus.bundle!,'excerpt.mp4'),['video']);
 await expect(lstat(join(state,'tts.sqlite'))).rejects.toMatchObject({code:'ENOENT'});
 const portable=await exportNarrativeProject(f.root,join(packages,'silent-package'),signal,{author,taskId:silentTask});
 expect(portable).toMatchObject({localSpeech:0,authorBinding:'reviewed-author-snapshot'});
 expect(silentStatus.resume).toContain('--review');
 expect(JSON.parse(await readFile(join(silentStatus.bundle!,'fact-review','script-review.json'),'utf8')).coverage).toBe('script');
 const altered=join(f.root,'altered');
 await cp(author,altered,{recursive:true});
 await writeFile(join(altered,'creative-brief.json'),canonical({...brief,style:'Revised draft style',voice:{mode:'none'}}));
 await expect(exportNarrativeProject(f.root,join(packages,'altered-package'),signal,{author:altered,taskId:silentTask}))
  .rejects.toThrow('different reviewed author snapshot');
 const silentCopy=await importNarrativeProject(portable.package,portable.digest,join(packages,'silent-copy'),signal);
 expect(silentCopy).toMatchObject({previewTaskId:silentTask,localSpeech:0,resumable:true});

 const samples=57600,wav=toneWav(samples),wavPath=join(f.root,'fixture.wav'),sourceSha256=sha256(wav);
 await writeFile(wavPath,wav);
 const receipt=await produceTts({schemaVersion:'1.0',provider:'local-import',text:transcript,voiceLabel,sourceSha256,mediaType:'audio/wav'},
  state,signal,{audioPath:wavPath});
 const binding={receiptFingerprint:receipt.fingerprint,receiptSha256:receipt.receiptArtifact.sha256,sourceAudioSha256:sourceSha256,
  transcriptSha256:sha256(transcript)};
 await expect(verifyImportedRecording(state,transcript+'!',voiceLabel,binding,signal)).rejects.toMatchObject({code:'NARRATION_IMPORT_TRANSCRIPT'});
 await expect(verifyImportedRecording(state,transcript,'Different declared voice',binding,signal)).rejects.toMatchObject({code:'NARRATION_IMPORT_RECEIPT'});
 await expect(verifyImportedRecording(state,transcript,voiceLabel,{...binding,sourceAudioSha256:'c'.repeat(64)},signal))
  .rejects.toMatchObject({code:'NARRATION_IMPORT_RECEIPT'});
 await expect(verifyImportedRecording(state,transcript+'!',voiceLabel,{...binding,transcriptSha256:sha256(transcript+'!')},signal))
  .rejects.toMatchObject({code:'NARRATION_IMPORT_RECEIPT'});
 const speech=config.speech.map((entry:{sceneId:string})=>({sceneId:entry.sceneId,recording:binding,captions:[
  {startChar:0,endChar:[...transcript].length,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]}));
 await inputs({mode:'imported',voiceLabel,rightsConfirmed:true},speech);
 const importedReview=await review();
 const originalBrowser=process.env.GVE_BROWSER;
 vi.stubEnv('GVE_BROWSER',join(f.root,'missing-browser'));
 const measured=await runNarrativeWorkspace(source,f.root,author,'speech',signal,noNetwork,{},undefined,importedReview);
 expect(measured).toMatchObject({status:'checkpoint-complete',details:{through:'speech',timing:{readyForAnimation:true,
  scenes:speech.map(({sceneId}:{sceneId:string})=>({sceneId,samples,generationTaskId:null,source:'imported'}))}}});
 vi.stubEnv('GVE_BROWSER',originalBrowser);
 const narrated=await runNarrativeWorkspace(source,f.root,author,'preview',signal,noNetwork,{},undefined,importedReview);
 expect(narrated).toMatchObject({status:'editable-preview-complete',details:{narration:'imported'}});
 const status=await statusNarrativeWorkspace(f.root,signal);
 await checkStreams(join(status.bundle!,'excerpt.mp4'),['video','audio']);
 expect(await readFile(join(status.bundle!,'voice','audio',speech[0].sceneId+'.bin'))).toEqual(wav);
 const speechPackage=await exportNarrativeProject(f.root,join(packages,'speech-package'),signal,{author,taskId:status.task});
 expect(speechPackage).toMatchObject({localSpeech:1,authorBinding:'reviewed-author-snapshot'});
 const imported=await importNarrativeProject(speechPackage.package,speechPackage.digest,join(packages,'speech-copy'),signal);
 expect(imported).toMatchObject({previewTaskId:status.task,localSpeech:1,resumable:true});
},360_000);
