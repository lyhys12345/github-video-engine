import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {parseSpec} from '../src/contracts/video.js';
import type {EngineOptions} from '../src/orchestrator/engine.js';
export const fixtureDirectory = resolve('examples');
export async function fixture() { return parseSpec(JSON.parse(await readFile(join(fixtureDirectory, 'demo.v1.json'), 'utf8'))); }
export async function temp(name: string) { await mkdir('test-output', {recursive: true}); return mkdtemp(resolve('test-output', `${name}-`)); }
export const mockOptions: EngineOptions = {
  environment: async () => ({engine: 'MOCK-test-environment-v1'}),
  renderer: {async render({directory, spec}) { const path = join(directory, 'mock.mp4'); await writeFile(path, `MOCK VIDEO ${JSON.stringify(spec)}`); return path; }},
  evaluator: async (_path, _spec, artifact) => ({schemaVersion: '1.0', evaluatorVersion: 'ffprobe-ffmpeg-v1', artifact: artifact.sha256, passed: true, checks: [{name: 'MOCK-only', passed: true, severity: 'warning', explanation: 'Mocked orchestration evaluator; no media validation'}]}),
};
export const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export async function until(check: () => Promise<boolean>, timeout = 10_000) { const end = Date.now() + timeout; while (!(await check())) { if (Date.now() > end) throw new Error('Condition timed out'); await pause(25); } }
