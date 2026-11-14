import {constants} from 'node:fs';
import {copyFile, lstat, mkdir, mkdtemp, realpath, rm, rmdir, unlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, extname, join, resolve} from 'node:path';
import {VERSION as remotionVersion} from 'remotion/version';
import {z} from 'zod';
import {EngineError, checkAbort} from '../core/errors.js';
import {cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {command} from '../core/process.js';
import {canonical, fileHash, sha256} from '../core/util.js';
import {browserPath, ffmpegPath, projectRoot} from '../providers/local.js';
import {
  SHOWCASE_AUDIT_DOM_VERSION, SHOWCASE_AUDIT_MAX_FRAMES, showcaseAuditPhoneViewport, showcaseAuditThresholds,
  type ShowcaseAuditRect, type ShowcaseAuditElement, type ShowcaseAuditFinding,
} from '../renderer/showcase-audit-contract.js';
import {showcaseOutputSize} from '../renderer/showcase-geometry.js';
import type {ShowcaseProps} from '../renderer/showcase-reel.js';
import {ancestors} from '../story-planner/runtime.js';
import {LocalShowcaseRender} from './local-render.js';

const Rect = z.strictObject({x: z.number(), y: z.number(), width: z.number().nonnegative(), height: z.number().nonnegative()});
const DomFrame = z.strictObject({
  contractVersion: z.literal(SHOWCASE_AUDIT_DOM_VERSION), frame: z.number().int().nonnegative(),
  shotIndex: z.number().int().nonnegative().nullable(),
  viewport: z.strictObject({width: z.literal(showcaseOutputSize.width), height: z.literal(showcaseOutputSize.height)}),
  fontStatus: z.literal('loaded'),
  elements: z.array(z.strictObject({
    id: z.string().min(1), role: z.enum([
      'title', 'panel', 'overlay-label', 'overlay-arrow', 'overlay-ring', 'source-label', 'elapsed-label', 'annotation', 'caption',
    ]),
    paintOrder: z.number().int().nonnegative(), opacity: z.number().positive().max(1),
    bounds: Rect, clipBounds: Rect.nullable(),
    paintedRegions: z.array(z.strictObject({kind: z.enum(['box', 'text-range', 'svg-path-envelope']), rect: Rect})),
    text: z.strictObject({
      content: z.string().min(1), fontFamily: z.string().min(1), fontSizePx: z.number().positive(),
      phoneFontSizePx: z.number().positive(), lineHeight: z.string(), rects: z.array(Rect).min(1), layoutBounds: Rect,
    }).optional(),
    source: z.strictObject({
      asset: z.string().min(1), type: z.enum(['image', 'video']), sourceFrame: z.number().int().nonnegative().nullable(),
      mediaBounds: Rect, visibleMediaBounds: Rect.nullable(),
    }).optional(),
  })).max(20),
});

const mediaExtensions = {image: ['.png', '.jpg', '.jpeg', '.webp'], video: ['.mp4', '.mov', '.webm']};
const maxAssetBytes = 256_000_000;
const maxAssetTotalBytes = 512_000_000;
const maxFontBytes = 20_000_000;

type RenderRequest = {
  props: ShowcaseProps;
  assets: ReadonlyMap<string, Buffer>;
  font?: Buffer;
  frames: readonly number[];
  outputDir: string;
  signal?: AbortSignal;
};

function auditError(message: string) {
  return new EngineError('SHOWCASE_AUDIENCE_RENDER', message);
}

function safeAssets(props: ShowcaseProps, assets: ReadonlyMap<string, Buffer>, font: Buffer) {
  const visuals = new Map([['font.ttf', font]]);
  const originalPaths = new Map<string, string>();
  const renamed = new Map<string, string>();
  let totalBytes = font.length;
  const fileFor = (media: {file: string; type: 'image' | 'video'}) => {
    const extension = extname(media.file).toLowerCase();
    if (!mediaExtensions[media.type].includes(extension)) throw auditError('Unsupported Showcase audience visual extension.');
    const previous = renamed.get(media.file);
    if (previous) return previous;
    const bytes = assets.get(media.file);
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > maxAssetBytes || totalBytes + bytes.length > maxAssetTotalBytes ||
        renamed.size >= 30) throw auditError('Missing or oversized Showcase audience visual asset.');
    totalBytes += bytes.length;
    const name = 'media/visual-' + renamed.size + extension;
    renamed.set(media.file, name);
    originalPaths.set(name, media.file);
    visuals.set(name, bytes);
    return name;
  };
  const shots = props.shots.map(shot => ({
    ...shot, file: fileFor(shot),
    ...(shot.panels ? {panels: shot.panels.map(panel => {
      if (!panel.media) return panel;
      return {...panel, media: {...panel.media, file: fileFor(panel.media)}};
    })} : {}),
  }));
  return {props: {...props, shots}, visuals, originalPaths};
}

function area(rect: ShowcaseAuditRect) {
  return rect.width * rect.height;
}

function overlapRatio(target: ShowcaseAuditRect, region: ShowcaseAuditRect) {
  const width = Math.max(0, Math.min(target.x + target.width, region.x + region.width) - Math.max(target.x, region.x));
  const height = Math.max(0, Math.min(target.y + target.height, region.y + region.height) - Math.max(target.y, region.y));
  return area(target) > 0 ? width * height / area(target) : 0;
}

function overflows(box: ShowcaseAuditRect, allowed: ShowcaseAuditRect | null) {
  const tolerance = showcaseAuditThresholds.overflowToleranceOutputPx;
  return !allowed || box.x < allowed.x - tolerance || box.y < allowed.y - tolerance ||
    box.x + box.width > allowed.x + allowed.width + tolerance || box.y + box.height > allowed.y + allowed.height + tolerance;
}

function auditFindings(elements: ShowcaseAuditElement[]) {
  const findings: ShowcaseAuditFinding[] = [];
  for (const element of elements) {
    const {id: elementId, text, source, paintedRegions} = element;
    if (text) {
      if (text.phoneFontSizePx < showcaseAuditThresholds.smallPhoneFontPx) {
        findings.push({code: 'small-phone-text', severity: 'warning', classification: 'size-risk', elementId,
          phoneFontSizePx: text.phoneFontSizePx});
      }
      if (text.rects.some(box => overflows(box, text.layoutBounds))) {
        findings.push({code: 'text-overflow', severity: 'warning', classification: 'geometric-risk', elementId});
      }
      if (text.rects.some(box => overflows(box, element.clipBounds))) {
        findings.push({code: 'text-clipping-risk', severity: 'warning', classification: 'geometric-risk', elementId});
      }
    }
    const targetRects = source?.visibleMediaBounds ? [source.visibleMediaBounds] :
      paintedRegions.filter(region => region.kind === 'text-range').map(region => region.rect);
    for (const foreground of elements) {
      if (foreground.paintOrder <= element.paintOrder || !targetRects.length) continue;
      let overlapFraction = 0;
      for (const target of targetRects) {
        for (const region of foreground.paintedRegions) overlapFraction = Math.max(overlapFraction, overlapRatio(target, region.rect));
      }
      if (overlapFraction >= showcaseAuditThresholds.occlusionMinFraction) {
        findings.push({code: source ? 'panel-occlusion-risk' : 'text-occlusion-risk', severity: 'warning', classification: 'geometric-risk',
          elementId, otherElementId: foreground.id, overlapFraction});
      }
    }
  }
  return findings;
}

const dimensions = showcaseAuditPhoneViewport.width + 'x' + showcaseAuditPhoneViewport.height;
const phoneWidth = showcaseAuditPhoneViewport.width;
const phoneHeight = showcaseAuditPhoneViewport.height;
const contactColumns = 4;

const ffmpeg = (args: string[], signal: AbortSignal) => command(ffmpegPath(), [
  '-hide_banner', '-v', 'error', '-xerror', '-nostdin', '-n', '-filter_threads', '1', '-filter_complex_threads', '1', ...args,
], {signal, timeout: 90_000});

async function contactSheet(stills: string[], output: string, signal: AbortSignal) {
  if (stills.length === 1) {
    await copyFile(stills[0]!, output, constants.COPYFILE_EXCL);
    return;
  }
  const layout = stills.map((_, index) =>
    (index % contactColumns * phoneWidth) + '_' + (Math.floor(index / contactColumns) * phoneHeight)).join('|');
  await ffmpeg([...stills.flatMap(path => ['-threads', '1', '-i', path]),
    '-filter_complex', 'xstack=inputs=' + stills.length + ':layout=' + layout + ':fill=black',
    '-frames:v', '1', '-threads', '1', output], signal);
}

async function capture(request: RenderRequest, scratch: string, signal: AbortSignal) {
  const {frames, assets} = request;
  const font = request.font ?? assets.get('font.ttf');
  if (!Buffer.isBuffer(font) || !font.length || font.length > maxFontBytes) throw auditError('Exact Showcase font bytes are required.');
  const {props, visuals, originalPaths} = safeAssets(request.props, assets, font);
  const browser = await browserPath();
  const evaluatorSources = [
    'src/renderer/showcase-audit-contract.ts', 'src/renderer/showcase-audit-dom.tsx', 'src/renderer/showcase-geometry.ts',
    'src/renderer/showcase-reel.tsx', 'src/renderer/showcase-timing.ts', 'src/showcase/audience-render.ts',
    'src/showcase/local-render.ts', 'src/showcase/worker.ts', 'pnpm-lock.yaml',
  ];
  const [chromiumSha256, evaluatorHashes] = await Promise.all([
    fileHash(browser),
    Promise.all(evaluatorSources.map(async path => ({path, sha256: await fileHash(join(projectRoot, path))}))),
  ]);
  checkAbort(signal);
  const renderer = new LocalShowcaseRender(scratch, browser, visuals);
  const measurements = [];
  try {
    for (const frame of frames) {
      checkAbort(signal);
      const {image, measurement} = await renderer.inspect({id: sha256('showcase-audit-frame-' + frame), props, from: frame}, signal);
      const dom = DomFrame.parse(measurement);
      const expectedShot = props.shots.findIndex(shot => frame >= shot.start && frame < shot.end);
      if (dom.frame !== frame || dom.shotIndex !== (expectedShot < 0 ? null : expectedShot)) {
        throw auditError('Measured Showcase shot or frame differs from the selected frame.');
      }
      const elements: ShowcaseAuditElement[] = dom.elements.map(element => {
        if (!element.source) return element;
        const asset = originalPaths.get(element.source.asset);
        if (!asset) throw auditError('Measured Showcase panel did not bind to an exact visual asset.');
        return {...element, source: {...element.source, asset}};
      });
      const screenshotPath = 'frame-' + frame + '.png';
      const phoneScreenshotPath = 'phone-' + frame + '.png';
      await writeFile(join(scratch, screenshotPath), image, {flag: 'wx'});
      await ffmpeg(['-threads', '1', '-i', join(scratch, screenshotPath), '-vf', 'scale=' + dimensions + ':flags=lanczos',
        '-frames:v', '1', '-threads', '1', join(scratch, phoneScreenshotPath)], signal);
      measurements.push({frame, shotIndex: dom.shotIndex, fontStatus: dom.fontStatus, screenshotPath, phoneScreenshotPath,
        elements, findings: auditFindings(elements)});
    }
  } finally {
    try {await renderer.close();}
    finally {await cleanupOwnedRuntimeTmp(scratch);}
  }
  const contactSheetPath = 'phone-contact.png';
  await contactSheet(measurements.map(frame => join(scratch, frame.phoneScreenshotPath)), join(scratch, contactSheetPath), signal);
  const metadata = {
    contractVersion: SHOWCASE_AUDIT_DOM_VERSION,
    viewport: showcaseOutputSize,
    phoneViewport: showcaseAuditPhoneViewport,
    thresholds: showcaseAuditThresholds,
    coverage: {scope: 'sampled-frames-only' as const, totalFrames: props.frames, requestedFrames: [...frames],
      renderedFrames: measurements.map(frame => frame.frame), embeddedMediaText: 'UNASSESSED' as const},
    evaluator: {method: 'Remotion Artifact from font-ready Showcase Reel DOM at screenshot time',
      phoneImageMethod: 'Lanczos scale of 1080×1920 rendered pixels to 360×640 with no layout reflow',
      node: process.version, remotion: remotionVersion, chromiumSha256, sources: evaluatorHashes,
      sha256: sha256(canonical(evaluatorHashes)), fontSha256: sha256(font)},
    findingBasis: {
      smallPhoneText: 'Computed author font size is projected to 360px-wide playback; the threshold flags a size risk.',
      textOverflow: 'Text-node Range rectangles extend beyond the allotted layout box. CSS may leave that overflow visible.',
      textClipping: 'Text-node Range rectangles extend beyond the stage or an actual clipping ancestor.',
      overlap: 'Largest sampled target rectangle fraction covered by any foreground box, Range rectangle or SVG stroke envelope. Envelopes include space outside ink and may include undrawn portions of a path. Pixel opacity and contrast need perceptual review.',
    },
    frames: measurements,
    contactSheetPath,
  };
  const metadataPath = 'dom-measurements.json';
  await writeFile(join(scratch, metadataPath), canonical(metadata) + '\n', {flag: 'wx'});
  return {...metadata, metadataPath};
}

export type ShowcaseAuditRenderResult = Awaited<ReturnType<typeof inspectShowcaseFrames>>;

/** Render only the selected stills in the unchanged production composition, with an opt-in DOM report. */
export async function inspectShowcaseFrames(request: RenderRequest) {
  const {frames, props} = request;
  const signal = request.signal ?? new AbortController().signal;
  checkAbort(signal);
  if (!Number.isSafeInteger(props.frames) || props.frames > 9000 || !frames.length || frames.length > SHOWCASE_AUDIT_MAX_FRAMES ||
      new Set(frames).size !== frames.length || frames.some(frame => !Number.isSafeInteger(frame) || frame < 0 || frame >= props.frames)) {
    throw auditError('Expected distinct selected frames within the measured Showcase timeline.');
  }
  const output = resolve(request.outputDir);
  await ancestors(dirname(output));
  try {
    await lstat(output);
    throw auditError('Showcase audience render output already exists.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const scratchRoot = await realpath(tmpdir());
  const scratch = await mkdtemp(join(scratchRoot, 'gve-aud-'));
  try {
    const captureResult = await capture(request, scratch, signal);
    checkAbort(signal);
    await ancestors(dirname(output), true);
    await mkdir(output);
    const copied: string[] = [];
    try {
      const {contactSheetPath, metadataPath} = captureResult;
      const names = [...captureResult.frames.flatMap(frame => [frame.screenshotPath, frame.phoneScreenshotPath]),
        contactSheetPath, metadataPath];
      for (const name of names) {
        checkAbort(signal);
        const destination = join(output, name);
        await copyFile(join(scratch, name), destination, constants.COPYFILE_EXCL);
        copied.push(destination);
      }
      return {...captureResult, contactSheetPath: join(output, contactSheetPath), metadataPath: join(output, metadataPath),
        frames: captureResult.frames.map(frame => ({...frame, screenshotPath: join(output, frame.screenshotPath),
          phoneScreenshotPath: join(output, frame.phoneScreenshotPath)}))};
    } catch (error) {
      await Promise.all(copied.map(path => unlink(path)));
      await rmdir(output);
      throw error;
    }
  } finally {
    if (dirname(await realpath(scratch)) !== scratchRoot) throw auditError('Showcase audit scratch moved outside its owned root.');
    await rm(scratch, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
}