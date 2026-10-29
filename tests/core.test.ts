import {describe, it, expect} from 'vitest';
import {readFile, writeFile, readdir, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {parseSpec, SceneSpecSchema} from '../src/contracts/video.js';
import {ArtifactSchema, JobSchema, JobStepSchema, EvaluationResultSchema, STAGES} from '../src/contracts/runtime.js';
import {ArtifactStore} from '../src/assets/store.js';
import {Engine} from '../src/orchestrator/engine.js';
import {EngineError} from '../src/core/errors.js';
import {canonical, sha256} from '../src/core/util.js';
import {fixture, fixtureDirectory, temp, mockOptions, pause} from './support.js';
import {fitTitle, fitText} from '../src/renderer/text-layout.js';

describe('versioned contracts', () => {
  it('accepts the fixture and independent scenes', async () => { const spec = await fixture(); expect(parseSpec(spec)).toEqual(spec); expect(SceneSpecSchema.parse(spec.scenes[0])).toEqual(spec.scenes[0]); });
  it.each(['0.9', '2.0', '1.1'])('rejects unsupported version %s', async (version) => { const spec = await fixture(); expect(() => parseSpec({...spec, schemaVersion: version})).toThrow(); });
  it('rejects malformed, unknown, excessive and inconsistent input', async () => {
    const spec = await fixture();
    for (const value of [{...spec, surprise: true}, {...spec, video: {...spec.video, width: 721}}, {...spec, video: {...spec.video, fps: 60}}, {...spec, scenes: []}, {...spec, audio: {mode: 'tts', references: []}}, {...spec, scenes: [spec.scenes[0], spec.scenes[0], spec.scenes[0]]}]) expect(() => parseSpec(value)).toThrow();
    expect(() => SceneSpecSchema.parse({...spec.scenes[0], durationFrames: -1})).toThrow();
    expect(() => parseSpec({...spec, scenes: spec.scenes.map((s) => ({...s, durationFrames: 60}))})).toThrow();
    expect(() => parseSpec({...spec, scenes: [{...spec.scenes[0], assetIds: ['missing']}, ...spec.scenes.slice(1)]})).toThrow();
    expect(() => parseSpec({...spec, project: {...spec.project, repository: 'https://evil.invalid/repo'}})).toThrow();
  });
  it('exports versioned JSON Schemas with strict object properties', async () => { for (const name of ['Project', 'VideoSpec', 'SceneSpec', 'Artifact', 'Job', 'JobStep', 'EvaluationResult']) { const schema = JSON.parse(await readFile(`schemas/${name}.v1.schema.json`, 'utf8')); expect(schema.$id).toBe(`urn:github-video-engine:${name}:1.0`); expect(schema.additionalProperties).toBe(false); } });
  it('canonical hashing is independent of object key insertion order', () => { expect(sha256(canonical({b: 2, a: 1}))).toBe(sha256(canonical({a: 1, b: 2}))); });
  it('rejects titles whose explicit line count cannot fit legibly', async () => {
    const spec = await fixture(); spec.scenes[0]!.elements.find((e) => e.role === 'title')!.text = 'one\ntwo\nthree\nfour\nfive'; expect(() => parseSpec(spec)).toThrow('four explicit lines');
  });
  it('fits boundary titles without losing characters or exceeding their box', () => {
    const measure = (text: string, size: number) => text.length * size;
    for (const title of ['W'.repeat(60), 'wide title words '.repeat(3).trim(), 'one\ntwo\nthree\nfour']) {
      const result = fitTitle(title, measure, 84);
      expect(result.lines.join('').replace(/\s/g, '')).toBe(title.replace(/\s/g, ''));
      expect(result.lines.every((line) => measure(line, result.fontSize) <= 612)).toBe(true);
      expect(result.lines.length * result.fontSize * 1.04).toBeLessThanOrEqual(240);
    }
  });
  it('fits dense body identifiers and full-width boundary text without content loss', () => {
    const measure = (text: string, size: number) => Array.from(text).length * size;
    for (const body of ['GitHubVideoEngineFoundationSpecificationAcceptanceTest', 'W'.repeat(150), '字'.repeat(150), ('W'.repeat(20) + ' ').repeat(7).trim()]) {
      const result = fitText(body, measure, 27, 20, 580, 170, 1.4);
      expect(result.lines.join('').replace(/\s/g, '')).toBe(body.replace(/\s/g, ''));
      expect(result.lines.every((line) => measure(line, result.fontSize) <= 580)).toBe(true);
      expect(result.lines.length * result.fontSize * 1.4).toBeLessThanOrEqual(170);
    }
  });
  it('rejects text-role bounds the fixed layout does not support before submission', async () => {
    for (const [role, text] of [['body', 'first\nsecond'], ['eyebrow', 'W'.repeat(25)], ['label', 'W'.repeat(41)]]) {
      const spec = await fixture(); spec.scenes[0]!.elements.find((e) => e.role === role)!.text = text!;
      expect(() => parseSpec(spec)).toThrow();
    }
  });
});

describe('real filesystem artifact store', () => {
  it('atomically commits simultaneous identical writes and reuses the same immutable path', async () => {
    const store = new ArtifactStore(await temp('atomic')); const fingerprint = sha256('input');
    const data = Buffer.alloc(1_000_000, 37);
    const results = await Promise.all(Array.from({length: 5}, () => store.commit(data, 'image/png', 'RESOLVE_ASSETS', fingerprint)));
    expect(new Set(results.map((r) => r.storage)).size).toBe(1);
    await store.verify(results[0]!); expect(await readFile(store.path(results[0]!))).toEqual(data);
    expect((await readdir(join(store.root, results[0]!.sha256.slice(0, 2)))).filter((n) => n.startsWith('.partial'))).toEqual([]);
    expect(ArtifactSchema.parse(results[0])).toEqual(results[0]);
  });
  it('detects tampering, refuses replacement and rejects unsafe artifact paths', async () => {
    const store = new ArtifactStore(await temp('integrity')); const ref = await store.commit('original', 'application/json', 'VALIDATE', sha256('x'));
    await writeFile(store.path(ref), 'tampered');
    await expect(store.verify(ref)).rejects.toThrow('missing or damaged');
    await expect(store.commit('original', 'application/json', 'VALIDATE', sha256('x'))).rejects.toThrow('missing or damaged');
    expect(await readFile(store.path(ref), 'utf8')).toBe('tampered');
    expect(() => store.path({...ref, storage: '../../outside'})).toThrow();
  });
  it('never regards a staged partial file as a committed artifact', async () => {
    const root = await temp('partial'); const store = new ArtifactStore(root);
    const hash = sha256('complete'); await mkdir(join(store.root, hash.slice(0, 2)), {recursive: true});
    await writeFile(join(store.root, hash.slice(0, 2), '.partial-interrupted'), 'incomplete');
    await expect(store.verify({schemaVersion: '1.0', id: hash, sha256: hash, bytes: 8, mediaType: 'application/json', storage: `${hash.slice(0, 2)}/${hash}.json`, producingStage: 'VALIDATE', inputFingerprint: hash, createdAt: new Date().toISOString(), integrity: 'verified'})).rejects.toThrow();
    await expect(store.commit('', 'application/json', 'VALIDATE', hash)).rejects.toThrow('empty');
  });
});

describe('durable orchestration (mock renderer/evaluator, real SQLite/filesystem)', () => {
  it('classifies invalid submissions and reports their field without creating a job', async () => {
    const engine = new Engine(await temp('invalid-submission'), mockOptions); const spec = await fixture();
    await expect(engine.submit({...spec, video: {...spec.video, width: 721}}, fixtureDirectory)).rejects.toMatchObject({code: 'INVALID_SPEC', classification: 'permanent', message: expect.stringContaining('video.width')});
    await expect(engine.submit({...spec, schemaVersion: '99'}, fixtureDirectory)).rejects.toMatchObject({code: 'INVALID_SPEC', message: expect.stringContaining('schemaVersion')});
    expect(engine.db.list()).toEqual([]); engine.close();
  });
  it('orders all stages, validates persisted contracts, survives reopen and deduplicates', async () => {
    const root = await temp('ordered'); let engine = new Engine(root, mockOptions); const spec = await fixture();
    const job = await engine.submit(spec, fixtureDirectory); await engine.run(job.id);
    expect(engine.db.steps(job.id).map((s) => s.stage)).toEqual([...STAGES]);
    expect(JobSchema.parse(engine.db.get(job.id)).status).toBe('succeeded');
    for (const step of engine.db.steps(job.id)) expect(JobStepSchema.parse(step).status).toBe('succeeded');
    const report = await engine.artifacts.readJson(engine.db.step(job.id, 'VERIFY_MEDIA')!.outputs[0]!);
    expect(EvaluationResultSchema.parse(report).passed).toBe(true);
    engine.close(); engine = new Engine(root, mockOptions);
    expect((await engine.submit(spec, fixtureDirectory)).id).toBe(job.id);
    await engine.run(job.id); expect(engine.db.steps(job.id).every((s) => s.attempt === 1)).toBe(true);
    expect(() => engine.db.db.prepare('DELETE FROM steps WHERE job_id=?').run(job.id)).toThrow('cannot be deleted');
    engine.close();
  });
  it('invalidates changed spec but reuses unchanged asset stage', async () => {
    const engine = new Engine(await temp('invalidation'), mockOptions); const spec = await fixture();
    const first = await engine.submit(spec, fixtureDirectory); await engine.run(first.id);
    const second = await engine.submit({...spec, style: {...spec.style, accent: '#FFAA00'}}, fixtureDirectory); await engine.run(second.id);
    expect(second.id).not.toBe(first.id);
    expect(engine.db.step(second.id, 'RESOLVE_ASSETS')!.inputFingerprint).toBe(engine.db.step(first.id, 'RESOLVE_ASSETS')!.inputFingerprint);
    expect(engine.db.step(second.id, 'RENDER')!.inputFingerprint).not.toBe(engine.db.step(first.id, 'RENDER')!.inputFingerprint);
    expect(engine.db.events(second.id).some((e) => e.type === 'cache_reused')).toBe(true); engine.close();
  });
  it('retries transient failures, stops permanent failures and enforces attempt limits', async () => {
    for (const classification of ['retryable', 'permanent'] as const) {
      let calls = 0;
      const engine = new Engine(await temp(classification), {...mockOptions, renderer: {async render(request) { calls++; if (calls === 1) throw new EngineError('INJECTED', 'Injected renderer failure', classification); return mockOptions.renderer!.render(request); }}});
      const job = await engine.submit(await fixture(), fixtureDirectory);
      if (classification === 'retryable') { await engine.run(job.id); expect(calls).toBe(2); }
      else { await expect(engine.run(job.id)).rejects.toThrow('Injected'); expect(calls).toBe(1); await expect(engine.run(job.id)).rejects.toThrow('cannot resume'); }
      engine.close();
    }
    let calls = 0;
    const engine = new Engine(await temp('bounded'), {...mockOptions, renderer: {async render() { calls++; throw new EngineError('TRANSIENT', 'still unavailable', 'retryable'); }}});
    const job = await engine.submit(await fixture(), fixtureDirectory);
    await expect(engine.run(job.id)).rejects.toThrow('unavailable'); await expect(engine.run(job.id)).rejects.toThrow('exhausted'); expect(calls).toBe(2); engine.close();
  });
  it('excludes a second worker and fences an expired owner', async () => {
    const root = await temp('lock'); let release!: () => void; let reached!: () => void;
    const ready = new Promise<void>((r) => { reached = r; }); const gate = new Promise<void>((r) => { release = r; });
    const one = new Engine(root, {...mockOptions, afterStage: async (stage) => { if (stage === 'VALIDATE') { reached(); await gate; } }});
    const two = new Engine(root, mockOptions); const job = await one.submit(await fixture(), fixtureDirectory);
    const running = one.run(job.id); await ready;
    await expect(two.run(job.id)).rejects.toThrow('active worker'); release(); await running;
    one.close(); two.close();
    const fenced = new Engine(await temp('fence'), mockOptions); const next = await fenced.submit(await fixture(), fixtureDirectory);
    const old = fenced.db.claim(next.id, 1); await pause(10); const current = fenced.db.claim(next.id, 30_000);
    expect(current).not.toBe(old); expect(() => fenced.db.finish(next.id, old)).toThrow('ownership'); fenced.db.finish(next.id, current, new EngineError('TEST', 'test complete', 'cancelled')); fenced.close();
  });
  it('fails explicitly when published output is damaged', async () => {
    const engine = new Engine(await temp('damaged-job'), mockOptions); const job = await engine.submit(await fixture(), fixtureDirectory); await engine.run(job.id);
    await writeFile(engine.artifacts.path(engine.db.step(job.id, 'RENDER')!.outputs[0]!), 'bad');
    expect((await engine.status(job.id)).output).toBeNull(); await expect(engine.run(job.id)).rejects.toThrow('missing or damaged'); engine.close();
  });
  it('retains failed evaluation evidence and never publishes rejected media', async () => {
    const engine = new Engine(await temp('rejected-media'), {...mockOptions, evaluator: async (_path, _spec, artifact) => ({schemaVersion: '1.0', evaluatorVersion: 'ffprobe-ffmpeg-v1', artifact: artifact.sha256, passed: false, checks: [{name: 'MOCK-rejection', passed: false, severity: 'error', explanation: 'Injected rejection'}]})});
    const job = await engine.submit(await fixture(), fixtureDirectory); await expect(engine.run(job.id)).rejects.toThrow('Media checks failed');
    expect(engine.db.get(job.id).status).toBe('failed'); expect(engine.db.step(job.id, 'VERIFY_MEDIA')!.outputs).toHaveLength(1); expect(engine.db.step(job.id, 'PUBLISH')).toBeUndefined(); expect((await engine.status(job.id)).output).toBeNull(); engine.close();
  });
  it('refuses to resume with a changed execution environment', async () => {
    const root = await temp('changed-environment'); const initial = new Engine(root, mockOptions); const spec = await fixture(); const job = await initial.submit(spec, fixtureDirectory); initial.close();
    const changed = new Engine(root, {...mockOptions, environment: async () => ({engine: 'MOCK-test-environment-v2'})});
    await expect(changed.run(job.id)).rejects.toThrow('changed'); expect((await changed.submit(spec, fixtureDirectory)).id).not.toBe(job.id); changed.close();
  });
  it('checks local asset hashes and prevents directory traversal', async () => {
    const root = await temp('assets'); const engine = new Engine(root, mockOptions); const spec = await fixture();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=', 'base64');
    await writeFile(join(root, 'mark.png'), png);
    const withAsset = {...spec, assets: [{id: 'mark', path: 'mark.png', sha256: sha256(png), mediaType: 'image/png' as const}], scenes: spec.scenes.map((s) => ({...s, assetIds: ['mark']}))};
    const job = await engine.submit(withAsset, root); await engine.run(job.id);
    expect(engine.db.step(job.id, 'RESOLVE_ASSETS')!.outputs).toHaveLength(2);
    await writeFile(join(root, 'mark.png'), Buffer.from('changed')); await expect(engine.submit(withAsset, root)).rejects.toThrow('declared hash');
    await mkdir(join(root, 'nested')); await expect(engine.submit({...withAsset, assets: [{...withAsset.assets[0]!, path: '../mark.png'}]}, join(root, 'nested'))).rejects.toThrow('inside'); engine.close();
  });
});
