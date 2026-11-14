import type {ShowcasePanel} from './showcase-reel-contract.js';

type Region = {x: number; y: number; width: number; height: number};

export const SHOWCASE_GEOMETRY_VERSION = 'showcase-viewport/1.0';
export const showcaseOutputSize = {width: 1080, height: 1920} as const;

export function showcaseViewport(layout?: 'standard' | 'immersive' | 'cinematic', safeInset = 76) {
  if (layout === 'cinematic') return {x: safeInset, y: 236, w: showcaseOutputSize.width - 2 * safeInset, h: 1240};
  if (layout === 'immersive') return {x: 0, y: 125, w: showcaseOutputSize.width, h: 1460};
  return {x: 0, y: 135, w: showcaseOutputSize.width, h: 1450};
}

export function sourceCropLayout(sw: number, sh: number, crop: Region, w: number, h: number, fit: 'contain' | 'cover' = 'cover') {
  const scale = (fit === 'contain' ? Math.min : Math.max)(w / (sw * crop.width), h / (sh * crop.height));
  const cw = sw * crop.width * scale;
  const ch = sh * crop.height * scale;
  return {
    scale,
    crop: {left: (w - cw) / 2, top: (h - ch) / 2, width: cw, height: ch},
    source: {left: -crop.x * sw * scale, top: -crop.y * sh * scale, width: sw * scale, height: sh * scale},
  };
}

export const unitProgress = (position: number, start = 0, end = 1) => Math.max(0, Math.min(1, (position - start) / (end - start)));
const smoothProgress = (progress: number) => progress * progress * (3 - 2 * progress);
const interpolate = (a: number, b: number, t: number) => a + (b - a) * t;

export function showcaseShotProgress(frame: number, shot: {start: number; end: number}) {
  return unitProgress((frame - shot.start) / (shot.end - shot.start));
}

export function showcasePanels<Panel extends ShowcasePanel>(shot: {panels?: Panel[]; crop: Region; cropEnd?: Region}) {
  const fullViewport: ShowcasePanel = {crop: shot.crop, cropEnd: shot.cropEnd, x: 0, y: 0, width: 1, height: 1};
  return shot.panels ?? [fullViewport];
}

export const showcasePanelVisible = (panel: ShowcasePanel, progress: number) => progress >= (panel.reveal ?? 0);

export function panelPosition(panel: Region & {motion?: {from: Region; start: number; end: number}}, progress: number) {
  const t = smoothProgress(panel.motion ? unitProgress(progress, panel.motion.start, panel.motion.end) : 1);
  const from = panel.motion?.from ?? panel;
  return {
    x: interpolate(from.x, panel.x, t), y: interpolate(from.y, panel.y, t),
    width: interpolate(from.width, panel.width, t), height: interpolate(from.height, panel.height, t),
  };
}

export function showcasePanelLayout(
  panel: ShowcasePanel, progress: number, media: {width: number; height: number}, viewport: ReturnType<typeof showcaseViewport>,
) {
  const rect = panelPosition(panel, progress);
  const t = smoothProgress(progress);
  const crop = {
    x: interpolate(panel.crop.x, panel.cropEnd?.x ?? panel.crop.x, t),
    y: interpolate(panel.crop.y, panel.cropEnd?.y ?? panel.crop.y, t),
    width: interpolate(panel.crop.width, panel.cropEnd?.width ?? panel.crop.width, t),
    height: interpolate(panel.crop.height, panel.cropEnd?.height ?? panel.crop.height, t),
  };
  const destination = {
    left: viewport.x + viewport.w * rect.x,
    top: viewport.y + viewport.h * rect.y,
    width: viewport.w * rect.width,
    height: viewport.h * rect.height,
  };
  return {...sourceCropLayout(media.width, media.height, crop, destination.width, destination.height, panel.fit), destination};
}
