import {test,expect,afterEach,vi} from 'vitest';
import {mkdtemp,readFile,writeFile,rm,readdir,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {ElevenLabsProvider,RemoteTtsSchema,ttsFingerprint,ttsInput,type TtsTransport} from '../src/providers/tts.js';
import {dryRunTts,produceTts,statusTts,exportTts,importHuihuiTts,readLocalTts} from '../src/tts/runtime.js';
import {generateHuihui,measureHuihuiWav,HUIHUI_VOICE_LABEL} from '../src/tts/huihui.js';
import {ttsCommand} from '../src/tts/cli.js';
import {ArtifactStore} from '../src/assets/store.js';
import {sha256,canonical} from '../src/core/util.js';
import {TaskRunner} from '../src/orchestrator/tasks.js';
import {decodeClip} from '../src/presentation/narration.js';
const dirs:string[]=[];
afterEach(async()=>{vi.restoreAllMocks();for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true,maxRetries:3});});
async function scratch(){const dir=await mkdtemp(join(tmpdir(),'gve-tts-'));dirs.push(dir);return dir;}
const signal=()=>new AbortController().signal;
const spec=()=>RemoteTtsSchema.parse({schemaVersion:'1.0',provider:'elevenlabs',text:'Explicit mocked provider narration.',voiceId:'test_exact_voice',voiceLabel:'Test voice; no Chen inference',modelId:'eleven_multilingual_v2',voiceSettings:{stability:.5,similarity_boost:.75,style:0,use_speaker_boost:true,speed:1},outputFormat:'mp3_44100_128',entitlement:'confirmed-api-access',estimatedMaxChargeMicros:40});
const audio=()=>readFile('fixtures/tts-synthetic.mp3');

test('rejects unbounded Huihui requests and alternate provider controls before state is created', async () => {
  const root = await scratch();
  const request = {schemaVersion: 'tts-huihui/1.0', text: '中文技术测试。'};
  for (const invalid of [
    {...request, text: '中'.repeat(121)},
    {...request, text: '中\n文'},
    {...request, text: '中\ud800文'},
    {...request, voiceId: 'another-voice'},
    {...request, ssml: '<speak>test</speak>'},
    {...request, apiKey: 'synthetic-test-key'},
    {...request, referenceAudio: 'audio.wav'},
  ]) {
    await expect(generateHuihui(invalid, join(root, 'state'), signal())).rejects.toHaveProperty('name', 'ZodError');
  }
  await expect(ttsCommand(['tts', 'huihui-generate'], {spec: 'unused.json', data: root, 'allow-paid': true}, signal()))
    .rejects.toMatchObject({code: 'USAGE'});
  await expect(readdir(root)).resolves.toEqual([]);
});

function makeHuihuiWav(samples: number) {
    const wav = Buffer.alloc(46 + samples * 2);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(18, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(16000, 24);
    wav.writeUInt32LE(32000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 38);
    wav.writeUInt32LE(samples * 2, 42);
    wav.writeInt16LE(-1, 46);
    return wav;
}

test('checks the fixed Huihui PCM WAV layout, duration and non-silence', () => {
  const exact = makeHuihuiWav(480_000);
  expect(measureHuihuiWav(exact)).toEqual({sampleRate: 16000, channels: 1, sampleFormat: 's16le', samples: 480_000, durationSeconds: 30});
  const silence = makeHuihuiWav(1);
  silence.writeInt16LE(0, 46);
  const stereo = makeHuihuiWav(1);
  stereo.writeUInt16LE(2, 22);
  for (const invalid of [silence, stereo, exact.subarray(0, -1), makeHuihuiWav(480_001), Buffer.alloc(2_000_001)]) {
    expect(() => measureHuihuiWav(invalid)).toThrow(expect.objectContaining({code: 'HUIHUI_MEDIA'}));
  }
});

test('Huihui v2 commits one import atomically across retry and contention and decodes odd samples without decimal rounding', async () => {
  const data = await scratch();
  const input = {schemaVersion: 'tts-huihui/1.0', text: '奇数采样测试。', provider: 'windows-winrt-huihui',
    voiceId: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens\\MSTTS_V110_zhCN_HuihuiM',
    language: 'zh-CN', workerSha256: 'a'.repeat(64), windowsRelease: 'test', arch: 'x64'};
  const kind = 'windows-winrt-huihui-generation-v1';
  const id = sha256(canonical({version: 'production-task-v1', kind, input}));
  const wav = makeHuihuiWav(16_001);
  const runner = new TaskRunner(data);
  try {
    await runner.run(kind, input, async () => ({
      value: {schemaVersion: 'tts-huihui-generation/1.0', taskId: id, input, textSha256: sha256(input.text),
        voiceLabel: HUIHUI_VOICE_LABEL, audio: {mediaType: 'audio/wav', sha256: sha256(wav), bytes: wav.length, ...measureHuihuiWav(wav)},
        origin: 'installed Windows WinRT SpeechSynthesizer', engineRemoteDispatch: 'none',
        review: {speechContent: 'unverified', ownerListening: 'pending'}},
      outputs: [await runner.artifacts.commit(wav, 'audio/wav', 'RESOLVE_ASSETS', id)],
    }), signal());
  } finally {runner.close();}

  const beforeCommit = new AbortController();
  const commit = ArtifactStore.prototype.commit;
  const spy = vi.spyOn(ArtifactStore.prototype, 'commit').mockImplementation(async function(this: ArtifactStore, ...args) {
    const result = await commit.apply(this, args);
    if (args[2] === 'PUBLISH') beforeCommit.abort();
    return result;
  });
  try {await expect(importHuihuiTts(data, id, beforeCommit.signal)).rejects.toBeDefined();}
  finally {spy.mockRestore();}
  const db = new DatabaseSync(join(data, 'tts.sqlite'));
  try {
    const tables = () => db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
    expect(tables()).toEqual([]);
    await expect(statusTts(data, id)).rejects.toMatchObject({code: 'TTS_STATE'});
    db.exec('CREATE TABLE unrelated (id TEXT);');
    await expect(importHuihuiTts(data, id, signal())).rejects.toMatchObject({code: 'TTS_INTEGRITY'});
    expect(tables()).toEqual([{name: 'unrelated'}]);
    db.exec('DROP TABLE unrelated;');
    const prepare = DatabaseSync.prototype.prepare;
    const inject = vi.spyOn(DatabaseSync.prototype, 'prepare').mockImplementation(function(this: DatabaseSync, sql: string) {
      if (sql.startsWith('INSERT INTO tts_outcomes')) throw new Error('test rollback');
      return prepare.call(this, sql);
    });
    try {await expect(importHuihuiTts(data, id, signal())).rejects.toThrow('test rollback');}
    finally {inject.mockRestore();}
    expect(tables()).toEqual([]);
    const results = await Promise.all([importHuihuiTts(data, id, signal()), importHuihuiTts(data, id, signal())]);
    expect(results.map(result => result.cached).sort()).toEqual([false, true]);
    expect(results[0]!.receiptArtifact).toEqual(results[1]!.receiptArtifact);
    expect(db.prepare('SELECT estimate FROM tts_requests').all()).toEqual([{estimate: 0}]);
    const source = await readLocalTts(data, results[0]!.fingerprint, signal());
    expect(source).toMatchObject({huihuiV2: {samples: 16_001, taskId: id}});
    const pcm = await decodeClip(source, data, 0, 48, signal());
    expect(pcm.length / 2).toBe(48_003);

    const legacy = {...results[0]!.receipt.input as object, adapterVersion: 'local-import-huihui-v1'};
    const legacyId = sha256(canonical(legacy));
    db.prepare('INSERT INTO tts_requests VALUES(?,?,?,?)').run(legacyId, canonical(legacy), 0, new Date().toISOString());
    expect(await statusTts(data, legacyId)).toMatchObject({state: 'held', reservationMicros: 0});
    expect(await importHuihuiTts(data, id, signal())).toMatchObject({cached: true, fingerprint: results[0]!.fingerprint});
    expect(db.prepare('SELECT * FROM tts_outcomes WHERE id=?').get(legacyId)).toBeUndefined();
  } finally {db.close();}
});
const options=(transport:TtsTransport,budget=100)=>({allowPaid:true,budgetMicros:budget,key:()=> 'sk_explicit_fake_test_secret',provider:new ElevenLabsProvider(transport)});
const response=async(_url?:string,_init?:RequestInit)=>new Response(await audio(),{status:200,headers:{'Content-Type':'audio/mpeg','request-id':'test-request-123'}});

test('offline dry-run uses no network or credentials, explicitly retains unverified entitlement',async()=>{const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('unexpected'));const s={...spec(),entitlement:undefined};const r=dryRunTts(s);expect(r.remoteDispatch).toBe(false);expect(r.entitlement).toBe('unverified');expect(r.fingerprint).toMatch(/^[a-f0-9]{64}$/);expect(fetch).not.toHaveBeenCalled();});
test('request identity includes exact narration, explicit voice/model/settings and adapter, excluding budget/label/entitlement noise',()=>{const s=spec(),id=ttsFingerprint(s);for(const next of [{...s,text:s.text+' '},{...s,voiceId:'other'},{...s,modelId:'other'},{...s,voiceSettings:{...s.voiceSettings,speed:1.1}}])expect(ttsFingerprint(next)).not.toBe(id);expect(ttsFingerprint({...s,estimatedMaxChargeMicros:99,voiceLabel:'another label',entitlement:'unverified'})).toBe(id);expect(ttsInput(s)).toHaveProperty('adapterVersion');expect(()=>RemoteTtsSchema.parse({...s,outputFormat:'wav_44100'})).toThrow();expect(()=>RemoteTtsSchema.parse({...s,apiKey:'forbidden'})).toThrow();expect(()=>RemoteTtsSchema.parse({...s,voiceId:'Chen Mandarin Chinese'})).toThrow();});
test('generation default, budget, entitlement, missing key fail before state or transport',async()=>{const dir=await scratch(),transport=vi.fn(response),key=vi.fn(()=>undefined);await expect(produceTts(spec(),join(dir,'a'),signal(),{key})).rejects.toMatchObject({code:'TTS_PAID_DISABLED'});await expect(produceTts(spec(),join(dir,'b'),signal(),{allowPaid:true,key})).rejects.toMatchObject({code:'TTS_BUDGET'});await expect(produceTts({...spec(),entitlement:'unverified'},join(dir,'c'),signal(),{...options(transport),key})).rejects.toMatchObject({code:'TTS_ENTITLEMENT'});expect(key).not.toHaveBeenCalled();await expect(produceTts(spec(),join(dir,'d'),signal(),{...options(transport),key})).rejects.toMatchObject({code:'TTS_KEY_MISSING'});expect(transport).not.toHaveBeenCalled();expect(await readdir(dir)).toEqual([]);});
test('mock adapter constructs official POST with pinned inputs, no redirect, bounded signal, request id; durable success cache rereads CAS without key',async()=>{const dir=await scratch(),transport=vi.fn(response),s=spec(),r=await produceTts(s,dir,signal(),options(transport));expect(r.cached).toBe(false);expect(r.receipt.actualChargeMicros).toBeNull();expect(r.receipt.chargeBasis).toBe('provider-invoice-unverified');expect(r.receipt.artifact.storage).toMatch(/\.mp3$/);expect(r.receipt.requestId).toBe('test-request-123');expect(r.receipt.durationSeconds).toBeGreaterThan(0);const [url,init]=transport.mock.calls[0]!;expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/test_exact_voice?output_format=mp3_44100_128');expect(init!.redirect).toBe('error');expect(init!.signal).toBeInstanceOf(AbortSignal);expect(JSON.parse(String(init!.body))).toEqual({text:s.text,model_id:s.modelId,voice_settings:s.voiceSettings});const key=vi.fn(()=>{throw Error('must not read key on cache')});const cached=await produceTts(s,dir,signal(),{key});expect(cached.cached).toBe(true);expect(cached.receipt).toEqual(r.receipt);expect(key).not.toHaveBeenCalled();expect(transport).toHaveBeenCalledTimes(1);expect(await statusTts(dir,r.fingerprint)).toMatchObject({state:'succeeded',integrity:'verified'});const db=new DatabaseSync(join(dir,'tts.sqlite'),{readOnly:true});try{const raw=JSON.stringify(db.prepare('SELECT * FROM tts_requests').all())+JSON.stringify(db.prepare('SELECT * FROM tts_outcomes').all());expect(raw).not.toContain('sk_explicit_fake_test_secret');}finally{db.close();}});
test('transport error text is redacted, restart retains unknown reservation and blocks retries',async()=>{const dir=await scratch(),transport=vi.fn(async()=>{throw Error('sensitive sk_explicit_fake_test_secret')});await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_NETWORK',message:expect.not.stringContaining('sk_explicit_fake_test_secret')});expect(await statusTts(dir,ttsFingerprint(spec()))).toMatchObject({state:'held',reservationMicros:40,actualChargeMicros:null});await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_HELD'});expect(transport).toHaveBeenCalledTimes(1);});
test.each([401,429,500,302])('HTTP %s is one dispatch with unknown charge; never automatic retry',async(code)=>{const dir=await scratch(),transport=vi.fn(async()=>new Response('secret provider body',{status:code}));await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_HTTP'});await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_HELD'});expect(transport).toHaveBeenCalledTimes(1);});
test('invalid/empty/non-audio and declared oversized stream fail closed',async()=>{for(const value of [new Response('',{headers:{'Content-Type':'audio/mpeg'}}),new Response('html',{headers:{'Content-Type':'text/html'}}),new Response('not audio',{headers:{'Content-Type':'audio/mpeg'}}),new Response(new Uint8Array(25_000_001),{headers:{'Content-Type':'audio/mpeg'}})]){const dir=await scratch(),transport=vi.fn(async()=>value);await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toBeDefined();expect(await statusTts(dir,ttsFingerprint(spec()))).toMatchObject({state:'held',actualChargeMicros:null});}});
test('aborted dispatch remains unknown after restart',async()=>{const dir=await scratch(),abort=new AbortController(),transport=vi.fn(async(_u,init)=>{abort.abort();throw new DOMException('test cancellation','AbortError');});await expect(produceTts(spec(),dir,abort.signal,options(transport))).rejects.toMatchObject({code:'TTS_NETWORK'});expect(await statusTts(dir,ttsFingerprint(spec()))).toMatchObject({state:'held'});expect(transport).toHaveBeenCalledTimes(1);});
test('incomplete body and abort during body are sanitized and held',async()=>{const dir=await scratch(),transport=vi.fn(async()=>new Response(new ReadableStream({start(c){c.error(Error('secret sk_explicit_fake_test_secret'));}}),{headers:{'Content-Type':'audio/mpeg'}}));await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_NETWORK',message:expect.not.stringContaining('sk_explicit_fake_test_secret')});expect(await statusTts(dir,ttsFingerprint(spec()))).toHaveProperty('state','held');});
test('bounded timeout cannot be defeated by a transport that ignores AbortSignal',async()=>{const native=AbortSignal.timeout.bind(AbortSignal),timeout=vi.spyOn(AbortSignal,'timeout').mockImplementation(()=>native(5));const dir=await scratch(),transport=vi.fn(()=>new Promise<Response>(()=>{}));await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_NETWORK'});expect(timeout).toHaveBeenCalledWith(60_000);expect(await statusTts(dir,ttsFingerprint(spec()))).toMatchObject({state:'held'});expect(transport).toHaveBeenCalledTimes(1);});
test('oversized declared Content-Length is rejected before consuming body',async()=>{const dir=await scratch(),transport=vi.fn(async()=>new Response('small body',{headers:{'Content-Type':'audio/mpeg','Content-Length':'25000001'}}));await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_SIZE'});expect(await statusTts(dir,ttsFingerprint(spec()))).toMatchObject({state:'held'});});
test('never-settling stream cancellation cannot keep failed HTTP/media/size cleanup alive',async()=>{for(const kind of ['http','type','declared-size','stream-size']){const dir=await scratch();const stream=new ReadableStream({start(c){if(kind==='stream-size')c.enqueue(new Uint8Array(25_000_001));},cancel(){return new Promise<void>(()=>{});}});const transport=vi.fn(async()=>new Response(stream,{status:kind==='http'?500:200,headers:{'Content-Type':kind==='type'?'text/html':'audio/mpeg',...(kind==='declared-size'?{'Content-Length':'25000001'}:{})}}));await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toBeDefined();expect(await statusTts(dir,ttsFingerprint(spec()))).toMatchObject({state:'held'});expect(transport).toHaveBeenCalledTimes(1);}},2000);
test('atomic same-fingerprint race dispatches at most once; different-key cap race reserves aggregate bound',async()=>{const dir=await scratch();let release!:()=>void;const gate=new Promise<void>(r=>release=r);const transport=vi.fn(async()=>{await gate;return response();}),s=spec();const first=produceTts(s,dir,signal(),options(transport,40));while(!transport.mock.calls.length)await new Promise(r=>setTimeout(r,5));await expect(produceTts(s,dir,signal(),options(transport,40))).rejects.toMatchObject({code:'TTS_HELD'});await expect(produceTts({...s,text:'other fingerprint'},dir,signal(),options(transport,40))).rejects.toMatchObject({code:'TTS_BUDGET'});release();expect((await first).cached).toBe(false);expect(transport).toHaveBeenCalledTimes(1);await expect(produceTts({...s,text:'third'},dir,signal(),options(transport,100))).rejects.toMatchObject({code:'TTS_BUDGET'});});
test('crashed or active reservation with no terminal record is held and retains aggregate spend',async()=>{const dir=await scratch(),transport=vi.fn(async()=>{throw Error('disconnect')});await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toBeDefined();const db=new DatabaseSync(join(dir,'tts.sqlite'));try{const s={...spec(),text:'simulated process crash after durable reservation'};db.prepare('INSERT INTO tts_requests VALUES(?,?,?,?)').run(ttsFingerprint(s),canonical(ttsInput(s)),40,new Date().toISOString());expect(await statusTts(dir,ttsFingerprint(s))).toMatchObject({state:'held',code:'TTS_INTERRUPTED_OR_RUNNING'});await expect(produceTts(s,dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_HELD'});await expect(produceTts({...s,text:'third'},dir,signal(),options(transport))).rejects.toMatchObject({code:'TTS_BUDGET'});}finally{db.close();}expect(transport).toHaveBeenCalledTimes(1);});
test('tampered or missing audio and receipt cache fail closed without another provider dispatch',async()=>{for(const which of ['audio','receipt']){const dir=await scratch(),transport=vi.fn(response),r=await produceTts(spec(),dir,signal(),options(transport));const path=new ArtifactStore(dir).path(which==='audio'?r.receipt.artifact:r.receiptArtifact);await writeFile(path,'tamper');await expect(produceTts(spec(),dir,signal(),options(transport))).rejects.toMatchObject({code:'INTEGRITY'});expect(transport).toHaveBeenCalledTimes(1);}});
test('local imported synthetic MP3 is distinct from remote synthesis, full lifecycle and exact-current-story handoff preserve pending listening',async()=>{const dir=await scratch(),bytes=await audio(),story=JSON.parse(await readFile('examples/story-planner-v1/rea.json','utf8')),shot=story.shots[0],s={schemaVersion:'1.0',provider:'local-import',text:shot.narration,voiceLabel:'Synthetic tone fixture: declared text is not recorded speech',sourceSha256:sha256(bytes),mediaType:'audio/mpeg'},path=join(dir,'original.mp3');await writeFile(path,bytes);const key=vi.fn(()=>{throw Error('must never read key')});const r=await produceTts(s,join(dir,'state'),signal(),{audioPath:path,key});expect(r.receipt.chargeBasis).toBe('local-import-no-provider-call');expect(r.receipt.input).toHaveProperty('provider','local-import');expect((await produceTts(s,join(dir,'state'),signal(),{key})).cached).toBe(true);const out=join(dir,'export'),exported=await exportTts(join(dir,'state'),r.fingerprint,out,signal(),{story,shotId:shot.id});expect(sha256(await readFile(exported.audioPath))).toBe(sha256(bytes));const handoff=JSON.parse(await readFile(join(out,'voice-handoff.json'),'utf8'));expect(handoff.review).toBe('pending');expect(handoff.transcriptVerification).toContain('not verified');expect(handoff.retiming).toContain('never stretch');expect(key).not.toHaveBeenCalled();await expect(exportTts(join(dir,'state'),r.fingerprint,out,signal(),{story,shotId:shot.id})).rejects.toBeDefined();shot.narration+=' changed';await expect(exportTts(join(dir,'state'),r.fingerprint,join(dir,'changed'),signal(),{story,shotId:shot.id})).rejects.toMatchObject({code:'TTS_TRANSCRIPT'});});
test('imports reject hash mismatch and misleading WAV declaration for MP3 bytes',async()=>{const dir=await scratch(),bytes=await audio(),path=join(dir,'audio.bin');await writeFile(path,bytes);const s={schemaVersion:'1.0',provider:'local-import',text:'Caller declared narration',voiceLabel:'Test import',sourceSha256:sha256(bytes),mediaType:'audio/wav'};await expect(produceTts({...s,sourceSha256:'a'.repeat(64)},join(dir,'bad-hash'),signal(),{audioPath:path})).rejects.toMatchObject({code:'TTS_IMPORT'});await expect(produceTts(s,join(dir,'bad-mime'),signal(),{audioPath:path})).rejects.toMatchObject({code:'TTS_MEDIA'});});
test('real CLI offline dry-run and generate default refuse network, secret config and unrelated flags',async()=>{const dir=await scratch(),path=join(dir,'spec.json');await writeFile(path,JSON.stringify({...spec(),entitlement:'unverified'}));const cli=(args:string[])=>spawnSync(process.execPath,['--import',pathToFileURL(resolve('node_modules/tsx/dist/loader.mjs')).href,resolve('src/cli.ts'),...args],{cwd:dir,encoding:'utf8',windowsHide:true,timeout:15000,env:{...process.env,ELEVENLABS_API_KEY:''}});const dry=cli(['tts','dry-run','--spec',path]);expect(dry.status,dry.stderr).toBe(0);expect(JSON.parse(dry.stdout)).toMatchObject({remoteDispatch:false,entitlement:'unverified'});const disabled=cli(['tts','generate','--spec',path,'--data',join(dir,'state')]);expect(disabled.status).toBe(1);expect(disabled.stderr).toContain('TTS_PAID_DISABLED');const bad=cli(['tts','dry-run','--spec',path,'--allow-paid']);expect(bad.status).toBe(1);expect(bad.stderr).toContain('USAGE');expect(await readdir(dir)).toEqual(['spec.json']);});
