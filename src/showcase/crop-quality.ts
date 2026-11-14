import {resolve} from 'node:path';
import {checkAbort} from '../core/errors.js';
import {sha256} from '../core/util.js';
import {
  SHOWCASE_GEOMETRY_VERSION, showcaseOutputSize, showcasePanelLayout, showcasePanels,
  showcasePanelVisible, showcaseShotProgress, showcaseViewport,
} from '../renderer/showcase-geometry.js';
import {boundedFile} from '../story-planner/runtime.js';
import {MAX_JSON, fail, type Manifest} from './inputs.js';
import {evaluateShowcaseRevision, withRevision} from './revision.js';
import type {showcaseTimeline} from './timeline.js';

const phone = {widthCssPixels: 360, heightCssPixels: 640, devicePixelRatio: 1} as const;
const phoneScale = phone.widthCssPixels * phone.devicePixelRatio / showcaseOutputSize.width;
const warningScaleAbove = 1;
// Ignore roundoff around the one-to-one pixel boundary.
const scaleComparisonTolerance = 1e-9;
const guidance = {
  'output-upscaling': 'Use a higher-resolution capture, widen the selected source crop, or reduce the destination panel.',
  'phone-upscaling': 'Use a higher-resolution capture, widen the selected source crop, or reduce the destination panel. Inspect the affected frame at the assumed phone size.',
  'cover-clipping': 'Match the crop and panel aspect ratios, reposition the crop, or switch to contain to keep the selected context.',
  'never-visible': 'Set reveal before the shot’s last displayed frame or remove the hidden panel.',
} as const;

type PanelLayout = ReturnType<typeof showcasePanelLayout>;

function frameMetrics(frame: number, layout: PanelLayout, width: number, height: number) {
  const {crop, source, destination, scale} = layout;
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(crop.width) || !Number.isFinite(crop.height) ||
      crop.width <= 0 || crop.height <= 0 || destination.width <= 0 || destination.height <= 0 ||
      !Number.isFinite(source.width) || !Number.isFinite(source.height)) {
    fail('Showcase panel geometry exceeds the supported numeric range at frame ' + frame, 'SHOWCASE_QUALITY');
  }
  // Intersect the panel, selected crop and actual source. The manifest allows a small source-edge tolerance.
  const visible = (start: number, cropSize: number, panelSize: number, sourceOffset: number, sourceSize: number) => {
    const sourceStart = start + sourceOffset;
    const from = Math.max(0, start, sourceStart);
    const to = Math.min(panelSize, start + cropSize, sourceStart + sourceSize);
    return {start: Math.max(0, (from - sourceStart) / scale), size: Math.max(0, to - from) / scale};
  };
  const x = visible(crop.left, crop.width, destination.width, source.left, source.width);
  const y = visible(crop.top, crop.height, destination.height, source.top, source.height);
  const intersectionWidth = Math.min(crop.width, destination.width);
  const intersectionHeight = Math.min(crop.height, destination.height);
  const clippedFraction = 1 - (intersectionWidth / crop.width) * (intersectionHeight / crop.height);
  return {
    frame,
    outputScale: scale,
    assumedPhoneScale: scale * phoneScale,
    destinationOutputPixels: destination,
    visibleSourcePixels: {
      x: Math.min(width, x.start), y: Math.min(height, y.start),
      width: Math.min(width, x.size), height: Math.min(height, y.size),
    },
    additionalCoverClippedFraction: clippedFraction <= 1e-12 ? 0 : clippedFraction,
    containFillFraction: (intersectionWidth / destination.width) * (intersectionHeight / destination.height),
  };
}

type FrameMetrics = ReturnType<typeof frameMetrics>;
type PanelAdvisory = {
  panelIndex: number;
  mediaId: string;
  mediaSha256: string;
  sourcePixels: {width: number; height: number};
  fit: 'contain' | 'cover';
  firstVisibleFrame: number | null;
  visibleFrameCount: number;
  worstEnlargement: FrameMetrics | null;
  worstCoverClipping: FrameMetrics | null;
  leastContainFill: FrameMetrics | null;
  warnings: (keyof typeof guidance)[];
};

export function showcaseCropComposition(
  manifest: Pick<Manifest, 'layout' | 'cinematic' | 'beats' | 'media'>,
  timeline: ReturnType<typeof showcaseTimeline>,
  signal: AbortSignal,
) {
  const {props} = timeline;
  const layout = manifest.layout ?? 'standard';
  const viewport = showcaseViewport(layout, manifest.cinematic?.safeInset);
  const mediaById = new Map(manifest.media.map(visual => [visual.id, visual]));
  let flatShot = 0;
  const shots = manifest.beats.flatMap(beat => beat.shots.map((sourceShot, shotIndex) => {
    checkAbort(signal);
    const shot = props.shots[flatShot++]!;
    const panels = showcasePanels(shot).map((panel, panelIndex): PanelAdvisory => {
      const mediaId = sourceShot.panels?.[panelIndex]?.mediaId ?? sourceShot.mediaId;
      const media = mediaById.get(mediaId)!;
      const fit = panel.fit ?? 'cover';
      let firstVisibleFrame: number | null = null;
      let visibleFrameCount = 0;
      let worstEnlargement: FrameMetrics | null = null;
      let worstCoverClipping: FrameMetrics | null = null;
      let leastContainFill: FrameMetrics | null = null;
      for (let frame = shot.start; frame < shot.end; frame++) {
        const progress = showcaseShotProgress(frame, shot);
        if (!showcasePanelVisible(panel, progress)) continue;
        firstVisibleFrame ??= frame;
        visibleFrameCount++;
        const metrics = frameMetrics(frame, showcasePanelLayout(panel, progress, media, viewport), media.width, media.height);
        if (!worstEnlargement || metrics.outputScale > worstEnlargement.outputScale) worstEnlargement = metrics;
        if (fit === 'cover' && (!worstCoverClipping || metrics.additionalCoverClippedFraction > worstCoverClipping.additionalCoverClippedFraction)) {
          worstCoverClipping = metrics;
        }
        if (fit === 'contain' && (!leastContainFill || metrics.containFillFraction < leastContainFill.containFillFraction)) {
          leastContainFill = metrics;
        }
      }
      const warnings: (keyof typeof guidance)[] = [];
      if (!worstEnlargement) warnings.push('never-visible');
      else {
        if (worstEnlargement.outputScale > warningScaleAbove + scaleComparisonTolerance) warnings.push('output-upscaling');
        if (worstEnlargement.assumedPhoneScale > warningScaleAbove + scaleComparisonTolerance) warnings.push('phone-upscaling');
        if (worstCoverClipping && worstCoverClipping.additionalCoverClippedFraction > 0) warnings.push('cover-clipping');
      }
      return {
        panelIndex, mediaId, mediaSha256: media.sha256, sourcePixels: {width: media.width, height: media.height}, fit,
        firstVisibleFrame, visibleFrameCount, worstEnlargement, worstCoverClipping, leastContainFill, warnings,
      };
    });
    return {beatId: beat.id, shotIndex, startFrame: shot.start, endFrameExclusive: shot.end, panels};
  }));
  return {layout, viewportOutputPixels: {x: viewport.x, y: viewport.y, width: viewport.w, height: viewport.h}, frames: props.frames, shots};
}

export async function showcaseQuality(
  data: string, baselineId: string, workspace: string | undefined, spec: string | undefined, signal: AbortSignal,
) {
  const planBytes = spec === undefined ? undefined : await boundedFile(resolve(spec), MAX_JSON);
  return withRevision(data, baselineId, workspace, signal, async (_runner, revision) => {
    const proposed = planBytes ? evaluateShowcaseRevision(revision, planBytes) : null;
    return {
      schemaVersion: 'showcase-crop-quality/1.0',
      baseline: revision.baseline,
      revisionPlanSha256: planBytes ? sha256(planBytes) : null,
      currentGeometryVersion: SHOWCASE_GEOMETRY_VERSION,
      savedEnvironmentSha256: revision.fingerprintSha256,
      savedRendererSha256: revision.fingerprint.renderer,
      dimensionBasis: 'hash-bound source declarations verified by the completed baseline render',
      freshMediaProbe: false,
      pixelBudget: {outputPixels: showcaseOutputSize, assumedPhone: phone, warningScaleAbove, scaleComparisonTolerance},
      baselineComposition: showcaseCropComposition(revision.source.manifest, revision.before, signal),
      proposedComposition: proposed ? showcaseCropComposition(proposed.manifest, proposed.after, signal) : null,
      guidance,
      scope: 'Panel-local geometry before overlay occlusion. Fit fractions compare the selected crop and destination. Enlargement is a pixel budget and cannot establish blur, legibility or perceptual quality.',
    };
  }, {readOnly: true});
}

