import {access, mkdir, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {expect, it} from 'vitest';
import {showcaseViewport} from '../src/renderer/showcase-geometry.js';
import {ShowcaseDraftManifest} from '../src/renderer/showcase-reel-contract.js';
import {showcaseCommand} from '../src/showcase/cli.js';
import {showcaseCropComposition} from '../src/showcase/crop-quality.js';
import {showcaseTimeline} from '../src/showcase/timeline.js';

const signal = new AbortController().signal;
const asset = {path: 'asset.png', sha256: 'a'.repeat(64)};
const whole = {x: 0, y: 0, width: 1, height: 1};
const draft = ShowcaseDraftManifest.parse({
  schemaVersion: 'showcase-reel/1.0', theme: 'paper', projectLabel: 'Pixel budget',
  script: asset, font: asset,
  narration: [{...asset, id: 'line', transcriptSha256: asset.sha256, receipt: asset}],
  media: [
    {...asset, id: 'square', type: 'image', width: 100, height: 100},
    {...asset, id: 'wide', type: 'image', width: 1080, height: 100},
  ],
  beats: [{id: 'line', shots: [{mediaId: 'square', weight: 1, crop: whole}]}],
});

function composition(manifest = draft, frames = 8) {
  return showcaseCropComposition(manifest, showcaseTimeline(manifest, [['line', 'Synthetic.']], [{frames, samples: frames * 800}]), signal);
}

it('shares the exact standard, immersive and cinematic viewports including explicit insets', () => {
  expect(showcaseViewport()).toEqual({x: 0, y: 135, w: 1080, h: 1450});
  expect(showcaseViewport('standard', 140)).toEqual({x: 0, y: 135, w: 1080, h: 1450});
  expect(showcaseViewport('immersive')).toEqual({x: 0, y: 125, w: 1080, h: 1460});
  expect(showcaseViewport('cinematic')).toEqual({x: 76, y: 236, w: 928, h: 1240});
  expect(showcaseViewport('cinematic', 140)).toEqual({x: 140, y: 236, w: 800, h: 1240});
});

it('reports cover’s source loss independently of the contain destination fill and scales for the assumed phone', () => {
  const cover = composition().shots[0]!.panels[0]!;
  expect(cover).toMatchObject({fit: 'cover', mediaId: 'square', visibleFrameCount: 8, firstVisibleFrame: 0,
    leastContainFill: null, warnings: ['output-upscaling', 'phone-upscaling', 'cover-clipping']});
  expect(cover.worstEnlargement?.outputScale).toBe(14.5);
  expect(cover.worstEnlargement?.assumedPhoneScale).toBeCloseTo(14.5 / 3);
  expect(cover.worstEnlargement?.destinationOutputPixels).toEqual({left: 0, top: 135, width: 1080, height: 1450});
  expect(cover.worstCoverClipping?.additionalCoverClippedFraction).toBeCloseTo(1 - 1080 / 1450);
  expect(cover.worstCoverClipping?.visibleSourcePixels).toMatchObject({y: 0, height: 100});
  expect(cover.worstCoverClipping?.visibleSourcePixels.x).toBeCloseTo((1450 - 1080) / 29);
  expect(cover.worstCoverClipping?.visibleSourcePixels.width).toBeCloseTo(1080 / 14.5);

  const manifest = structuredClone(draft);
  manifest.beats[0]!.shots[0]!.panels = [{...whole, crop: whole, fit: 'contain'}];
  const contain = composition(manifest).shots[0]!.panels[0]!;
  expect(contain).toMatchObject({worstCoverClipping: null, warnings: ['output-upscaling', 'phone-upscaling']});
  expect(contain.worstEnlargement?.outputScale).toBe(10.8);
  expect(contain.leastContainFill?.containFillFraction).toBeCloseTo(1080 / 1450);
  expect(contain.leastContainFill?.visibleSourcePixels).toEqual({x: 0, y: 0, width: 100, height: 100});
});

it('detects an interior motion maximum, media overrides and reveal using displayed integer frames', () => {
  const manifest = structuredClone(draft);
  manifest.beats[0]!.shots[0]!.panels = [
    {...whole, mediaId: 'wide', fit: 'contain', width: .8, crop: {...whole, width: .25}, cropEnd: whole, reveal: .25,
      motion: {from: {...whole, width: .2}, start: 0, end: .5}},
    {...whole, crop: whole, reveal: 1},
    {...whole, mediaId: 'wide', fit: 'contain', crop: {...whole, width: .5}, cropEnd: {...whole, width: .1}, reveal: .875},
  ];
  const {panels, endFrameExclusive} = composition(manifest).shots[0]!;
  expect(endFrameExclusive).toBe(8);
  expect(panels[0]).toMatchObject({mediaId: 'wide', sourcePixels: {width: 1080, height: 100},
    firstVisibleFrame: 2, visibleFrameCount: 6, worstEnlargement: {frame: 3}, warnings: ['output-upscaling']});
  expect(panels[0]?.worstEnlargement?.outputScale).toBeCloseTo(.70625 / .4873046875);
  expect(panels[1]).toMatchObject({firstVisibleFrame: null, visibleFrameCount: 0, worstEnlargement: null,
    worstCoverClipping: null, leastContainFill: null, warnings: ['never-visible']});
  expect(panels[2]).toMatchObject({firstVisibleFrame: 7, visibleFrameCount: 1, worstEnlargement: {frame: 7}});
  expect(panels[2]?.worstEnlargement?.outputScale).toBeCloseTo(1 / .1171875);
});

it('does not turn the manifest edge tolerance into imaginary visible source pixels', () => {
  const manifest = structuredClone(draft);
  manifest.beats[0]!.shots[0]!.panels = [{...whole, fit: 'contain', crop: {x: .501, y: 0, width: .5, height: 1}}];
  const panel = composition(manifest, 1).shots[0]!.panels[0]!;
  expect(panel.worstEnlargement?.visibleSourcePixels.x).toBeCloseTo(50.1);
  expect(panel.worstEnlargement?.visibleSourcePixels.width).toBeCloseTo(49.9);
  expect(panel.worstEnlargement?.additionalCoverClippedFraction).toBe(0);
});


it('ignores floating-point noise at the one-to-one threshold while reporting the measured ratio', () => {
  const manifest = structuredClone(draft);
  manifest.media[0]!.width = 1080;
  manifest.media[0]!.height = 1000;
  manifest.beats[0]!.shots[0]!.panels = [{...whole, crop: {...whole, width: .9999999999}, fit: 'contain'}];
  const panel = composition(manifest, 1).shots[0]!.panels[0]!;
  expect(panel.worstEnlargement!.outputScale).toBeGreaterThan(1);
  expect(panel.warnings).toEqual([]);
});


it('leaves missing state absent and an unsupported database schema unchanged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gvs-quality-unit-'));
  const run = (data: string) => showcaseCommand(['showcase', 'quality'], {data, task: asset.sha256}, signal);
  const missing = join(root, 'missing');
  await expect(run(missing)).rejects.toMatchObject({code: 'SHOWCASE_INPUT'});
  await expect(access(missing)).rejects.toMatchObject({code: 'ENOENT'});

  const legacy = join(root, 'legacy');
  await mkdir(legacy);
  const database = join(legacy, 'tasks.sqlite');
  const db = new DatabaseSync(database);
  try { db.exec("CREATE TABLE preserve(value TEXT); INSERT INTO preserve VALUES ('original')"); }
  finally { db.close(); }
  await expect(run(legacy)).rejects.toMatchObject({code: 'USAGE_DB_VERSION'});
  const check = new DatabaseSync(database, {readOnly: true});
  try {
    expect(check.prepare('PRAGMA user_version').get()).toEqual({user_version: 0});
    expect(check.prepare('SELECT value FROM preserve').get()).toEqual({value: 'original'});
  } finally { check.close(); }
});
