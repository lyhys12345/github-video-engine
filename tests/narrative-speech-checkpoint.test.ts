import {it,expect,vi,afterEach,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({generate:vi.fn(),import:vi.fn(),chen:vi.fn()}));
vi.mock('../src/tts/huihui.js',()=>({generateHuihui:mocks.generate}));
vi.mock('../src/tts/runtime.js',()=>({importHuihuiTts:mocks.import}));
vi.mock('../src/tts/local-chen.js',()=>({generateLocalChen:mocks.chen}));
import {narrativeSpeechTiming,measureNarrativeSpeech} from '../src/workflow/narrative-speech-checkpoint.js';

it('checks opted-in portrait caption layout before animation', async () => {
 mocks.generate.mockResolvedValue({taskId:'a'.repeat(64),cached:true,manifest:{audio:{samples:32000}}});
 mocks.import.mockResolvedValue({fingerprint:'b'.repeat(64),cached:true,receiptArtifact:{sha256:'c'.repeat(64)},receipt:{artifact:{sha256:'d'.repeat(64)}}});
 const scene={id:'last',narration:'W'.repeat(40),execution:{kind:'supported-story'}};
 const config={selection:[selection[2]],speech:[{sceneId:scene.id,captions:[{startChar:0,endChar:40,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]}]};
 const signal=new AbortController().signal;
 expect(await measureNarrativeSpeech('state',{scenes:[scene]},config,signal)).toMatchObject({readyForAnimation:true});
 expect(await measureNarrativeSpeech('state',{scenes:[scene]},{...config,portraitStyle:'audience-portrait/1.0'},signal)).toMatchObject({
  allRecordingsFit:true,readyForAnimation:false,captionValidation:{status:'needs-author-revision',scenes:[{status:'invalid'}]},
 });
});
const selection=[{kind:'story-slice',sceneId:'first',slices:[{shotId:'a',startFrame:0,endFrame:30}]},{kind:'placeholder',sceneId:'gap',frames:60},{kind:'story-slice',sceneId:'last',slices:[{shotId:'b',startFrame:0,endFrame:60}]}];
const measured=(sceneId:string,samples:number)=>({sceneId,samples,generationTaskId:'a'.repeat(64),receiptFingerprint:'b'.repeat(64),generation:false,import:false});
beforeEach(()=>vi.stubEnv('GVE_NARRATION_VOICE','windows-huihui'));
afterEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();});
it('does not invoke the replacement voice when the preferred default is unavailable',async()=>{
 vi.stubEnv('GVE_NARRATION_VOICE',undefined);
 mocks.chen.mockRejectedValue(Object.assign(new Error('Local Chen profile unavailable'),{code:'CHEN_LOCAL_UNAVAILABLE'}));
 await expect(measureNarrativeSpeech('state',{scenes:[{id:'first',narration:'旁白',execution:{kind:'supported-story'}}]},{selection:[selection[0]],speech:[{sceneId:'first'}]},new AbortController().signal)).rejects.toMatchObject({code:'CHEN_LOCAL_UNAVAILABLE'});
 expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.import).not.toHaveBeenCalled();
});
it('reports exact whole-recording spill including fractional frames without editing selection or padding other scenes',()=>{
 const before=JSON.stringify(selection),report=narrativeSpeechTiming(selection,[measured('first',48001),measured('last',48000)]);
 expect(report).toMatchObject({allRecordingsFit:false,totalFrames:210,minimumFramesIfOnlyExtending:211,extensionFitsBudget:true});
 expect(report.scenes[0]).toMatchObject({minimumRecordingFrames:31,additionalFramesNeeded:1,fits:false,shotIds:['a']});
 expect(report.scenes[1]).toMatchObject({allocatedFrames:60,minimumRecordingFrames:30,additionalFramesNeeded:0,fits:true});
 expect(JSON.stringify(selection)).toBe(before);
});
it('reports when measured extension would exceed the complete budget and refuses missing, duplicate or gap recordings',()=>{
 expect(narrativeSpeechTiming([{kind:'story-slice',sceneId:'first',slices:[{shotId:'a',startFrame:0,endFrame:8940}]}],[measured('first',8940*1600+1)])).toMatchObject({extensionFitsBudget:false,minimumFramesIfOnlyExtending:9001});
 for(const recordings of [[measured('first',1)],[measured('first',1),measured('first',1)],[measured('first',1),measured('gap',1)],[measured('first',0),measured('last',1)]])expect(()=>narrativeSpeechTiming(selection,recordings)).toThrow();
});
it('separates exact unrecorded scene tails from intentional lead and placeholder silence',()=>{
 const report=narrativeSpeechTiming(selection,[measured('first',46400),measured('last',94399)],{maxUnnarratedTailFrames:1});
 expect(report.allRecordingsFit).toBe(true);
 expect(report.rhythm).toMatchObject({status:'needs-author-revision',violations:[{sceneId:'last',excessSamples:1,framesToRemove:1}],
  intentionalSilence:[{kind:'lead',startFrame:0,endFrame:60},{kind:'placeholder',sceneId:'gap',startFrame:90,endFrame:150}]});
 expect(report.scenes[0]).toMatchObject({startFrame:60,endFrame:90,recordingEndSample:142400,unnarratedTailSamples:1600});
 expect(report.scenes[1]).toMatchObject({startFrame:150,endFrame:210,recordingEndSample:334399,unnarratedTailSamples:1601});
 const uncapped=narrativeSpeechTiming(selection,[measured('first',46400),measured('last',94399)]);
 expect(uncapped.rhythm).toMatchObject({status:'diagnostics-only',maxUnnarratedTailFrames:null,violations:[]});
 const direct=narrativeSpeechTiming(selection,[measured('first',46400),measured('last',94399)],{maxUnnarratedTailFrames:1,leadFrames:0});
 expect(direct).toMatchObject({totalFrames:150,rhythm:{leadFrames:0,intentionalSilence:[{kind:'placeholder',sceneId:'gap',startFrame:30,endFrame:90}]}});
 expect(direct.scenes[0]).toMatchObject({startFrame:0,endFrame:30,recordingEndSample:46400,unnarratedTailSamples:1600});
});
it('generates and imports exact supported scene scripts only; measured timing keeps receipt identity for downstream reuse',async()=>{
 mocks.generate.mockResolvedValue({taskId:'a'.repeat(64),cached:false,manifest:{audio:{samples:16000}}});
 mocks.import.mockResolvedValue({fingerprint:'b'.repeat(64),cached:false});
 const plan={scenes:[{id:'first',narration:'实际作者脚本。',execution:{kind:'supported-story'}},{id:'gap',narration:'无声缺口。',execution:{kind:'needs-evidence'}},{id:'last',narration:'原速完整录音。',execution:{kind:'supported-story'}}]};
 const report=await measureNarrativeSpeech('state',plan,{selection,speech:[{sceneId:'first'},{sceneId:'last'}]},new AbortController().signal);
 expect(mocks.generate.mock.calls.map(c=>c[0].text)).toEqual(['实际作者脚本。','原速完整录音。']);
 expect(mocks.import).toHaveBeenCalledTimes(2);expect(report.allRecordingsFit).toBe(true);
 expect(report.scenes[0]).toMatchObject({samples:48000,generationTaskId:'a'.repeat(64),receiptFingerprint:'b'.repeat(64)});
 await expect(measureNarrativeSpeech('state',plan,{selection,speech:[{sceneId:'gap'}]},new AbortController().signal)).rejects.toThrow('unproduced');
});
it('speech checks caption character/recording/layout bounds before animation and preserves exact cached receipt identity',async()=>{
 mocks.generate.mockResolvedValue({taskId:'a'.repeat(64),cached:true,manifest:{audio:{samples:32000}}});mocks.import.mockResolvedValue({fingerprint:'b'.repeat(64),cached:true,receiptArtifact:{sha256:'c'.repeat(64)},receipt:{artifact:{sha256:'d'.repeat(64)}}});const plan={scenes:[{id:'first',narration:'完整旁白。',execution:{kind:'supported-story'}},{id:'last',narration:'完整录音。',execution:{kind:'supported-story'}}]},config={selection,speech:plan.scenes.map(s=>({sceneId:s.id,captions:[{startChar:0,endChar:[...s.narration].length,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]}))};const good=await measureNarrativeSpeech('state',plan,config,new AbortController().signal);expect(good.captionValidation.status).toBe('valid');expect(good.scenes[0]).toMatchObject({generation:true,import:true,receiptFingerprint:'b'.repeat(64)});const bad=structuredClone(config);bad.speech[0]!.captions[0]!.endChar--;const blocked=await measureNarrativeSpeech('state',plan,bad,new AbortController().signal);expect(blocked.captionValidation.status).toBe('needs-author-revision');expect(blocked.readyForAnimation).toBe(false);expect(blocked.captionValidation.scenes[0]).toMatchObject({status:'invalid'});mocks.generate.mockClear();await expect(measureNarrativeSpeech('state',plan,{...config,speech:[config.speech[0],config.speech[0]]},new AbortController().signal)).rejects.toThrow('exactly once');expect(mocks.generate).not.toHaveBeenCalled();
});
it('requires author revision for excess unrecorded tail even when the recording fits and captions are valid',async()=>{
 mocks.generate.mockResolvedValue({taskId:'a'.repeat(64),cached:true,manifest:{audio:{samples:16000}}});
 mocks.import.mockResolvedValue({fingerprint:'b'.repeat(64),cached:true,receiptArtifact:{sha256:'c'.repeat(64)},receipt:{artifact:{sha256:'d'.repeat(64)}}});
 const scenes=['first','last'].map(id=>({id,narration:'测试。',execution:{kind:'supported-story'}}));
 const speech=scenes.map(scene=>({sceneId:scene.id,captions:[{startChar:0,endChar:3,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]}));
 const config={selection,speech};
 const signal=new AbortController().signal;
 const uncapped=await measureNarrativeSpeech('state',{scenes},config,signal);
 expect(uncapped).toMatchObject({readyForAnimation:true,rhythm:{status:'diagnostics-only'}});
 const capped=await measureNarrativeSpeech('state',{scenes},{...config,rhythm:{maxUnnarratedTailFrames:5}},signal);
 expect(capped).toMatchObject({allRecordingsFit:true,captionValidation:{status:'valid'},readyForAnimation:false,
  rhythm:{status:'needs-author-revision',violations:[{sceneId:'last',excessSamples:40000,framesToRemove:25}]}});
 const withinLimit=await measureNarrativeSpeech('state',{scenes},{...config,rhythm:{maxUnnarratedTailFrames:30}},signal);
 expect(withinLimit).toMatchObject({readyForAnimation:true,rhythm:{status:'within-limit'}});
});
