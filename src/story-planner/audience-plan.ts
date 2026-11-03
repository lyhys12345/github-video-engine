
import {EngineError} from '../core/errors.js';
import type {compileAnimation} from './animation.js';

export const AUDIENCE_PRESENTATION = 'audience-v1';
type Animation = ReturnType<typeof compileAnimation>;
type Shot = Animation['shots'][number];
type Action = Shot['actions'][number];

const invalid = () => new EngineError('PREVIEW_AUDIENCE_UNSUPPORTED',
  'Audience v1 needs a supported three-shot HTTP exchange or local file cutout/mask storyboard with matching source excerpts.');

function primary(shot: Shot, kind: Action['kind'], source: string, target: string) {
  const action = shot.actions[0];
  if (!action || action.kind !== kind ||
      shot.objects.find(object => object.id === action.source)?.visual !== source ||
      shot.objects.find(object => object.id === action.target)?.visual !== target) throw invalid();
  return action;
}

function excerpts(action: Action) {
  return action.evidence.filter(claim => claim.kind === 'documented').flatMap(claim => claim.citations.map((citation: {quote: string}) => citation.quote));
}

const interval = (action: Action) => ({start: action.startFrame, end: action.endFrame});

export function compileAudience(animation: Animation) {
  const [first, second, third] = animation.shots;
  if (!first || !second || !third || animation.shots.length !== 3) throw invalid();

  if (first.objects.some(object => object.visual === 'request')) {
    const request = primary(first, 'transfer', 'request', 'code');
    const match = primary(second, 'transfer', 'request', 'route');
    const response = primary(third, 'transfer', 'route', 'response');
    const route = /\bapp\.(get|post|put|patch|delete)\(['"](\/[a-zA-Z0-9/_-]{0,16})['"],\s*\(req,\s*res\)\s*=>\s*\{\s*res\.send\(['"]([a-zA-Z0-9 !?.-]{1,20})['"]\)\s*;?\s*\}\)/;
    const matchExcerpt = excerpts(match).find(quote => route.test(quote));
    if (!matchExcerpt || !excerpts(response).includes(matchExcerpt)) throw invalid();
    const [, method, path, body] = route.exec(matchExcerpt)!;
    const port = excerpts(request).map(quote => /\bapp\.listen\((\d{1,5})\b/.exec(quote)?.[1]).find(Boolean);
    if (!port) throw invalid();
    return {
      kind: 'http' as const, request: method!.toUpperCase() + ' ' + path, port, body: body!,
      intervals: [interval(request), interval(match), interval(response)],
      cuts: [second.startFrame, third.startFrame],
    };
  }

  const input = primary(first, 'compare', 'scene', 'code');
  const cutout = primary(second, 'transfer', 'code', 'cutout');
  const mask = primary(third, 'transfer', 'code', 'mask');
  const file = /^rembg i path\/to\/input\.png path\/to\/output\.png$/m;
  const onlyMask = /^rembg i -om path\/to\/input\.png path\/to\/output\.png$/m;
  if (!excerpts(input).some(quote => file.test(quote)) || !excerpts(input).some(quote => onlyMask.test(quote)) ||
      !excerpts(cutout).some(quote => file.test(quote)) || !excerpts(mask).some(quote => onlyMask.test(quote))) throw invalid();
  return {
    kind: 'image-outputs' as const, intervals: [interval(input), interval(cutout), interval(mask)],
    cuts: [second.startFrame, third.startFrame],
  };
}

export type AudiencePlan = ReturnType<typeof compileAudience>;
const clamp = (number: number) => Math.min(1, Math.max(0, number));
const ease = (number: number) => number * number * (3 - 2 * number);

export function audienceFrame(plan: AudiencePlan, frame: number) {
  const [second, third] = plan.cuts;
  const phase = frame < second! ? 0 : frame < third! ? 1 : 2;
  const motion = plan.intervals.map(({start, end}) => ease(clamp((frame - start) / (end - start))));
  return {phase, motion: [motion[0]!, motion[1]!, motion[2]!] as const};
}
