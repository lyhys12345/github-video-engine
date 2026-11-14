import {mkdir, mkdtemp, readFile, readdir, realpath, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {expect, it, vi} from 'vitest';
import {cleanupOwnedRuntimeTmp} from '../src/core/owned-runtime.js';
import {command} from '../src/core/process.js';
import {sha256} from '../src/core/util.js';
import {browserPath, ffmpegPath, projectRoot} from '../src/providers/local.js';
import type {ShowcaseProps} from '../src/renderer/showcase-reel.js';
import {inspectShowcaseFrames} from '../src/showcase/audience-render.js';
import {LocalShowcaseRender} from '../src/showcase/local-render.js';

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

it('measures font-ready browser text, clipping and paint order on actual selected media frames', async () => {
  const scratch = await realpath(tmpdir());
  const root = await mkdtemp(join(scratch, 'gve-audit-test-'));
  try {
    const film = join(root, 'fixture.mp4');
    await command(ffmpegPath(), ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=160x120:r=30',
      '-frames:v', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-threads', '1', film]);
    const font = await readFile(join(projectRoot, 'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf'));
    const asset = 'original/fixture.mp4';
    const media = {file: asset, type: 'video' as const, width: 160, height: 120, frames: 30};
    const crop = {x: 0, y: 0, width: 1, height: 1};
    const overflowCaption = '实测手机字幕遇到连续的长行时需要检查实际字形位置与视觉布局是否出现挤压。'.repeat(3).slice(0, 80);
    const props: ShowcaseProps = {
      frames: 20, theme: 'paper', projectLabel: '手机阅读检查示例',
      shots: [{...media, start: 0, end: 20, crop, startFrame: 2, endFrame: 28, annotation: '这是覆盖素材的注释',
        sourceAnchors: [{frame: 0, sourceFrame: 2}, {frame: 10, sourceFrame: 23}, {frame: 19, sourceFrame: 27}],
        panels: [
          {...crop, crop, fit: 'cover'},
          {x: .2, y: .40, width: .30, height: .30, media, startFrame: 0, endFrame: 18, crop, fit: 'contain', reveal: .25,
            motion: {from: {x: .15, y: .05, width: .30, height: .30}, start: .25, end: .75}},
          {x: .60, y: .05, width: .30, height: .30, startFrame: 5, endFrame: 22, crop, fit: 'contain'},
        ],
        overlays: [
          {kind: 'label', text: 'W'.repeat(33), x: .94, y: .20, width: .045, height: .08, start: 0, end: .15, fontSize: 20},
          {kind: 'label', text: 'W'.repeat(8), x: .48, y: .60, width: .02, height: .08, start: 0, end: .15, fontSize: 20},
          {kind: 'ring', x: .12, y: .10, width: .10, height: .08, start: .25, end: .8},
        ],
      }],
      captions: [
        {text: '第一句', start: 0, end: 10},
        {text: overflowCaption, start: 10, end: 20},
      ],
    };
    const frames = [0, 5, 9, 10, 19];
    const outputDir = join(root, 'evidence');
    const args = {props, assets: new Map([[asset, await readFile(film)]]), font, frames, outputDir};
    const result = await inspectShowcaseFrames(args);
    expect(result.coverage).toMatchObject({scope: 'sampled-frames-only', requestedFrames: frames, renderedFrames: frames,
      embeddedMediaText: 'UNASSESSED'});
    expect(result.evaluator).toMatchObject({fontSha256: sha256(font), remotion: '4.0.538'});
    expect(result.evaluator.chromiumSha256).toMatch(/^[0-9a-f]{64}$/u);
    const sourceFrames = (frame: typeof result.frames[number]) => frame.elements.flatMap(element => {
      return element.source ? [[element.id, element.source.sourceFrame]] : [];
    });
    expect(result.frames.map(sourceFrames)).toEqual([
      [['panel-0', 2], ['panel-2', 5]],
      [['panel-0', 13], ['panel-1', 5], ['panel-2', 10]],
      [['panel-0', 21], ['panel-1', 9], ['panel-2', 14]],
      [['panel-0', 23], ['panel-1', 10], ['panel-2', 15]],
      [['panel-0', 27], ['panel-1', 17], ['panel-2', 21]],
    ]);
    const early = result.frames[1]!;
    const later = result.frames[3]!;
    const panel = (frame: typeof later, id: string) => frame.elements.find(element => element.id === id)!;
    expect(panel(later, 'panel-1').bounds.y).toBeGreaterThan(panel(early, 'panel-1').bounds.y + 100);
    expect(panel(later, 'panel-1').source).toMatchObject({asset, type: 'video'});
    expect(panel(later, 'panel-1').source!.visibleMediaBounds!.height).toBeLessThan(panel(later, 'panel-1').bounds.height);
    expect(panel(later, 'panel-0').source!.visibleMediaBounds).toEqual(panel(later, 'panel-0').bounds);
    expect(panel(result.frames[2]!, 'caption').text?.content).toBe('第一句');
    expect(panel(later, 'caption').text).toMatchObject({content: overflowCaption, fontSizePx: 47});
    expect(panel(later, 'caption').text!.rects.length).toBeGreaterThan(3);
    expect(panel(later, 'caption').text!.fontFamily).toMatch(/^showcase/iu);
    expect(panel(later, 'overlay-2').paintedRegions[0]?.kind).toBe('svg-path-envelope');
    expect(later.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({code: 'small-phone-text', elementId: 'source-label', phoneFontSizePx: 7}),
      expect.objectContaining({code: 'text-overflow', elementId: 'caption'}),
      expect.objectContaining({code: 'text-overflow', elementId: 'overlay-0'}),
      expect.objectContaining({code: 'text-clipping-risk', elementId: 'overlay-0'}),
      expect.objectContaining({code: 'text-overflow', elementId: 'overlay-1'}),
      expect.objectContaining({code: 'panel-occlusion-risk', elementId: 'panel-0', otherElementId: 'annotation',
        severity: 'warning', classification: 'geometric-risk'}),
    ]));
    expect(later.findings.filter(finding => finding.code === 'text-clipping-risk').map(finding => finding.elementId))
      .not.toContain('overlay-1');
    expect(later.findings.filter(finding => finding.code === 'text-clipping-risk').map(finding => finding.elementId))
      .not.toContain('caption');
    const firstPng = await readFile(result.frames[0]!.screenshotPath);
    const movedPng = await readFile(later.screenshotPath);
    expect(pngSize(firstPng)).toEqual([1080, 1920]);
    expect(sha256(firstPng)).not.toBe(sha256(movedPng));
    expect(pngSize(await readFile(later.phoneScreenshotPath))).toEqual([360, 640]);
    expect(pngSize(await readFile(result.contactSheetPath))).toEqual([1440, 1280]);
    expect(JSON.parse(await readFile(result.metadataPath, 'utf8')).frames[3]).toMatchObject({
      frame: 10, screenshotPath: 'frame-10.png', phoneScreenshotPath: 'phone-10.png',
    });

    await expect(inspectShowcaseFrames({...args, frames: [20]})).rejects.toThrow('distinct selected frames');
    await expect(inspectShowcaseFrames(args)).rejects.toThrow('already exists');
    const original = join(root, 'production');
    await mkdir(original);
    const renderer = new LocalShowcaseRender(original, await browserPath(), new Map([['font.ttf', font], [asset, args.assets.get(asset)!]]));
    try {
      const {bytes} = await renderer.render({id: sha256('still-no-audit'), kind: 'still', props, from: 10, to: 11},
        new AbortController().signal);
      expect(sha256(bytes)).toBe(sha256(movedPng));
    } finally {
      try {await renderer.close();}
      finally {await cleanupOwnedRuntimeTmp(original);}
    }

    const privateTmp = join(root, 'cancel-temp');
    await mkdir(privateTmp);
    vi.stubEnv('TEMP', privateTmp);
    vi.stubEnv('TMP', privateTmp);
    vi.stubEnv('TMPDIR', privateTmp);
    const controller = new AbortController();
    const cancelledDir = join(root, 'cancelled');
    const cancellationResult = inspectShowcaseFrames({...args, outputDir: cancelledDir, signal: controller.signal})
      .then(() => null, (error: unknown) => error);
    try {
      const deadline = Date.now() + 20_000;
      let started = false;
      while (!started && Date.now() < deadline) {
        started = (await readdir(privateTmp)).some(name => name.startsWith('gve-final-'));
        if (!started) await delay(25);
      }
      expect(started).toBe(true);
    } finally {
      controller.abort(new Error('audit fixture cancelled'));
      const cancellation = await cancellationResult;
      vi.unstubAllEnvs();
      expect(cancellation).toEqual(new Error('audit fixture cancelled'));
    }
    expect(await readdir(privateTmp)).toEqual([]);
    await expect(stat(cancelledDir)).rejects.toMatchObject({code: 'ENOENT'});
  } finally {
    if (dirname(await realpath(root)) !== scratch) throw new Error('Audit test scratch moved outside its owned root.');
    await rm(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
}, 180_000);