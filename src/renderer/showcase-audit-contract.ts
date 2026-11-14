export const SHOWCASE_AUDIT_DOM_VERSION = 'showcase-audience-dom/1.0';
export const SHOWCASE_AUDIT_ARTIFACT = 'showcase-audience-dom.json';
export const SHOWCASE_AUDIT_MAX_FRAMES = 80;
export const showcaseAuditPhoneViewport = {width: 360, height: 640} as const;
export const showcaseAuditThresholds = {smallPhoneFontPx: 12, overflowToleranceOutputPx: 1, occlusionMinFraction: .01} as const;

export type ShowcaseAuditRect = {x: number; y: number; width: number; height: number};
export type ShowcaseAuditRole = 'title' | 'panel' | 'overlay-label' | 'overlay-arrow' | 'overlay-ring' |
  'source-label' | 'elapsed-label' | 'annotation' | 'caption';

export type ShowcaseAuditElement = {
  id: string;
  role: ShowcaseAuditRole;
  paintOrder: number;
  opacity: number;
  bounds: ShowcaseAuditRect;
  clipBounds: ShowcaseAuditRect | null;
  paintedRegions: {kind: 'text-range' | 'box' | 'svg-path-envelope'; rect: ShowcaseAuditRect}[];
  text?: {
    content: string;
    fontFamily: string;
    fontSizePx: number;
    phoneFontSizePx: number;
    lineHeight: string;
    rects: ShowcaseAuditRect[];
    layoutBounds: ShowcaseAuditRect;
  };
  source?: {
    asset: string;
    type: 'image' | 'video';
    sourceFrame: number | null;
    mediaBounds: ShowcaseAuditRect;
    visibleMediaBounds: ShowcaseAuditRect | null;
  };
};

export type ShowcaseAuditFinding = {
  code: 'small-phone-text' | 'text-overflow' | 'text-clipping-risk' | 'text-occlusion-risk' | 'panel-occlusion-risk';
  severity: 'warning';
  classification: 'size-risk' | 'geometric-risk';
  elementId: string;
  otherElementId?: string;
  overlapFraction?: number;
  phoneFontSizePx?: number;
};

export type ShowcaseAuditDomFrame = {
  contractVersion: typeof SHOWCASE_AUDIT_DOM_VERSION;
  frame: number;
  shotIndex: number | null;
  viewport: {width: number; height: number};
  fontStatus: 'loaded';
  elements: ShowcaseAuditElement[];
};