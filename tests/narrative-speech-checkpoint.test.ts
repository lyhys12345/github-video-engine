import {it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({generate:vi.fn(),import:vi.fn()}));
vi.mock('../src/tts/huihui.js',()=>({generateHuihui:mocks.generate}));
vi.mock('../src/tts/runtime.js',()=>({importHuihuiTts:mocks.import}));
import {narrativeSpeechTiming,measureNarrativeSpeech} from '../src/workflow/narrative-speech-checkpoint.js';
const selection=[{kind:'story-slice',sceneId:'first',slices:[{shotId:'a',startFrame:0,endFrame:30}]},{kind:'placeholder',sceneId:'gap',frames:60},{kind:'story-slice',sceneId:'last',slices:[{shotId:'b',startFrame:0,endFrame:60}]}];
const measured=(sceneId:string,samples:number)=>({sceneId,samples,generationTaskId:'a'.repeat(64),receiptFingerprint:'b'.repeat(64),generation:false,import:false});
afterEach(()=>vi.resetAllMocks());
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
