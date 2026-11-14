import React from 'react';
import {Artifact, cancelRender, continueRender, delayRender} from 'remotion';
import {
  SHOWCASE_AUDIT_ARTIFACT, SHOWCASE_AUDIT_DOM_VERSION, showcaseAuditPhoneViewport,
  type ShowcaseAuditDomFrame, type ShowcaseAuditElement, type ShowcaseAuditRect, type ShowcaseAuditRole,
} from './showcase-audit-contract';

export function showcaseAuditMarker(enabled: boolean, id: string, role: ShowcaseAuditRole) {
  return enabled ? {'data-audit-id': id, 'data-audit-role': role} : {};
}

const rect = ({x, y, width, height}: DOMRect | ShowcaseAuditRect): ShowcaseAuditRect => ({x, y, width, height});

function intersect(a: ShowcaseAuditRect | null, b: ShowcaseAuditRect): ShowcaseAuditRect | null {
  if (!a) return null;
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? {x, y, width, height} : null;
}

function clipBounds(element: Element, root: HTMLElement, viewport: ShowcaseAuditRect) {
  let clipped: ShowcaseAuditRect | null = viewport;
  for (let parent = element.parentElement; parent && parent !== root; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const clipsX = style.overflowX !== 'visible';
    const clipsY = style.overflowY !== 'visible';
    if (!clipsX && !clipsY) continue;
    const bounds = parent.getBoundingClientRect();
    clipped = intersect(clipped, {
      x: clipsX ? bounds.x + parent.clientLeft : viewport.x,
      y: clipsY ? bounds.y + parent.clientTop : viewport.y,
      width: clipsX ? parent.clientWidth : viewport.width,
      height: clipsY ? parent.clientHeight : viewport.height,
    });
  }
  return clipped;
}

function textRects(element: Element) {
  const rects: ShowcaseAuditRect[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const bounds of range.getClientRects()) {
      if (bounds.width && bounds.height) rects.push(rect(bounds));
    }
  }
  return rects;
}

function svgPaintEnvelopes(element: Element) {
  // A path envelope includes whitespace and the path's future dash extent. It is a geometry cue for visual review.
  return [...element.querySelectorAll<SVGGeometryElement>('path, ellipse')].flatMap(path => {
    const style = getComputedStyle(path);
    const matrix = path.getScreenCTM();
    if (style.stroke === 'none' || Number(style.opacity) === 0 || !matrix) return [];
    const bounds = path.getBoundingClientRect();
    const halfStroke = parseFloat(style.strokeWidth) / 2;
    const xPad = halfStroke * Math.hypot(matrix.a, matrix.c);
    const yPad = halfStroke * Math.hypot(matrix.b, matrix.d);
    return [{x: bounds.x - xPad, y: bounds.y - yPad, width: bounds.width + 2 * xPad, height: bounds.height + 2 * yPad}];
  });
}

function inspect(root: HTMLElement, frame: number, shotIndex: number | null): ShowcaseAuditDomFrame {
  const stage = rect(root.getBoundingClientRect());
  const scale = showcaseAuditPhoneViewport.width / stage.width;
  const elements = [...root.querySelectorAll<HTMLElement>('[data-audit-role]')].flatMap((element, paintOrder) => {
    // Marked Reel siblings use DOM paint order. Opacity/transform on animated overlays preserve their sibling order.
    const role = element.dataset.auditRole as ShowcaseAuditRole;
    const style = getComputedStyle(element);
    const opacity = Number(style.opacity);
    if (!opacity || style.visibility !== 'visible') return [];
    const bounds = rect(element.getBoundingClientRect());
    const clipped = clipBounds(element, root, stage);
    const measured: ShowcaseAuditElement = {
      id: element.dataset.auditId!, role, paintOrder, opacity, bounds, clipBounds: clipped, paintedRegions: [],
    };
    const addPaint = (kind: ShowcaseAuditElement['paintedRegions'][number]['kind'], boxes: ShowcaseAuditRect[]) => {
      for (const box of boxes) {
        const visible = intersect(clipped, box);
        if (visible) measured.paintedRegions.push({kind, rect: visible});
      }
    };

    if (role === 'panel') {
      const media = element.querySelector<HTMLImageElement>('[data-audit-media] img');
      if (!media || !media.complete || !media.naturalWidth || !media.naturalHeight) throw new Error('Audited panel image was unavailable.');
      const mediaBounds = rect(media.getBoundingClientRect());
      const type = element.dataset.auditMediaType as 'image' | 'video';
      measured.source = {
        asset: element.dataset.auditMediaAsset!, type,
        sourceFrame: type === 'video' ? Number(element.dataset.auditSourceFrame) : null,
        mediaBounds,
        visibleMediaBounds: intersect(clipBounds(media, root, stage), mediaBounds),
      };
      addPaint('box', [bounds]);
    } else if (role === 'overlay-arrow' || role === 'overlay-ring') {
      addPaint('svg-path-envelope', svgPaintEnvelopes(element));
    } else {
      const content = element.textContent?.trim();
      if (!content) return [];
      const rects = textRects(element);
      if (rects.length === 0) throw new Error('Audited Reel text was unavailable to DOM Range.');
      const layout = element.closest('[data-audit-text-layout]') ?? element;
      const fontSizePx = parseFloat(style.fontSize);
      measured.text = {content, rects, fontFamily: style.fontFamily, fontSizePx,
        phoneFontSizePx: fontSizePx * scale, lineHeight: style.lineHeight, layoutBounds: rect(layout.getBoundingClientRect())};
      if (role === 'annotation') addPaint('box', [bounds]);
      addPaint('text-range', rects);
    }
    return [measured];
  });
  return {contractVersion: SHOWCASE_AUDIT_DOM_VERSION, frame, shotIndex,
    viewport: {width: stage.width, height: stage.height}, fontStatus: 'loaded', elements};
}

export function ShowcaseAuditArtifact({root, fontReady, frame, shotIndex}: {
  root: React.RefObject<HTMLDivElement | null>; fontReady: boolean; frame: number; shotIndex: number | null;
}) {
  const [handle] = React.useState(() => delayRender('Showcase audience audit layout'));
  const [measurement, setMeasurement] = React.useState<ShowcaseAuditDomFrame>();
  React.useEffect(() => {
    if (!fontReady) return;
    let mounted = true;
    let animationFrame: number | undefined;
    const sample = () => {
      if (!mounted) return;
      try {
        if (!root.current) throw new Error('Audited Reel root was unavailable.');
        const media = [...root.current.querySelectorAll('[data-audit-media]')];
        // OffthreadVideo mounts its image after fetching the selected decoded source frame.
        if (media.some(container => {
          const image = container.querySelector('img');
          return !image?.complete || !image.naturalWidth || !image.naturalHeight;
        })) {
          animationFrame = requestAnimationFrame(sample);
          return;
        }
        setMeasurement(inspect(root.current, frame, shotIndex));
      } catch (error) {cancelRender(error);}
    };
    void document.fonts.ready.then(sample).catch(error => {if (mounted) cancelRender(error);});
    return () => {
      mounted = false;
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    };
  }, [root, fontReady, frame, shotIndex]);
  React.useEffect(() => () => continueRender(handle), [handle]);
  React.useEffect(() => {
    // The child Artifact registers with Remotion in a layout effect before the still is released.
    if (measurement) continueRender(handle);
  }, [handle, measurement]);
  return measurement ? <Artifact filename={SHOWCASE_AUDIT_ARTIFACT} content={JSON.stringify(measurement)}/> : null;
}