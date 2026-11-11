export type Cue = {text: string; start: number; end: number};
export type SourceAnchor = {frame: number; sourceFrame: number};

export function sourceFrameAt(frame: number, anchors: SourceAnchor[]): number {
  const next = anchors.findIndex(anchor => anchor.frame > frame);
  if (next === 0) return anchors[0]!.sourceFrame;
  if (next < 0) return anchors.at(-1)!.sourceFrame;
  const left = anchors[next - 1]!;
  const right = anchors[next]!;
  const progress = (frame - left.frame) / (right.frame - left.frame);
  return Math.round(left.sourceFrame + progress * (right.sourceFrame - left.sourceFrame));
}

export function resolveSourceAnchors(
  actions: {cue: number; sourceFrame: number}[],
  cues: Cue[],
  shot: {start: number; end: number; startFrame?: number; endFrame?: number},
  sourceFrames: number,
): SourceAnchor[] {
  const first = shot.startFrame ?? 0;
  const last = (shot.endFrame ?? sourceFrames) - 1;
  const anchors = [{frame: shot.start, sourceFrame: first}];
  for (const action of actions) {
    const frame = cues[action.cue]?.start;
    const previous = anchors.at(-1)!;
    if (frame === undefined || frame < shot.start || frame >= shot.end ||
        action.sourceFrame < previous.sourceFrame || action.sourceFrame > last ||
        (frame <= previous.frame && !(anchors.length === 1 && frame === shot.start && action.sourceFrame === first))) {
      throw new Error('Action cue or source frame is outside the shot or out of order');
    }
    if (frame > previous.frame) anchors.push({frame, sourceFrame: action.sourceFrame});
  }
  const final = anchors.at(-1)!;
  if (final.frame < shot.end - 1) {
    anchors.push({frame: shot.end - 1, sourceFrame: last});
  }
  return anchors;
}
