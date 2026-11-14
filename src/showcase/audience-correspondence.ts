import {showcasePanels, showcasePanelVisible, showcaseShotProgress} from '../renderer/showcase-geometry.js';
import {showcaseCaptions} from '../renderer/showcase-reel-contract.js';
import {showcasePanelSourceFrame} from '../renderer/showcase-timing.js';
import type {AudienceExpectation} from './audience-contract.js';
import {fail, type Manifest} from './inputs.js';
import type {AudienceSpeechLine} from './audience-speech.js';
import type {showcaseTimeline} from './timeline.js';

type DisplayRange = {startFrame: number; endFrameExclusive: number};
type SpeechResult = {
  status: 'UNVERIFIED' | 'TIMING_EVIDENCE_OVERLAP' | 'TIMING_EVIDENCE_NO_OVERLAP';
  reason: string;
  method: 'recognition' | 'forced-alignment' | null;
  phraseIds: string[];
  intervalSeconds: [number, number] | null;
  confidences: (number | null)[];
  overlaps: DisplayRange[];
};

function runs(from: number, to: number, selects: (frame: number) => boolean) {
  const windows: DisplayRange[] = [];
  for (let frame = from; frame < to; frame++) {
    if (!selects(frame)) continue;
    const previous = windows.at(-1);
    if (previous?.endFrameExclusive === frame) previous.endFrameExclusive++;
    else windows.push({startFrame: frame, endFrameExclusive: frame + 1});
  }
  return windows;
}

function compareSpeech(
  line: AudienceSpeechLine | undefined, cueOffset: number, text: string, lineStartFrame: number, selected: DisplayRange[],
): SpeechResult {
  const result: SpeechResult = {status: 'UNVERIFIED', reason: 'No exact line-bound speech alignment report was supplied.',
    method: line?.method ?? null, phraseIds: [], intervalSeconds: null, confidences: [], overlaps: []};
  if (!line) return result;
  if (!line.method) return {...result, reason: 'The saved report has audio diagnostics only.'};
  const to = cueOffset + text.length;
  let offset = 0;
  const covered = line.draft.cues.filter(phrase => {
    const start = offset;
    offset += phrase.text.length;
    return start < to && offset > cueOffset;
  });
  result.phraseIds = covered.map(phrase => phrase.id);
  result.confidences = covered.map(phrase => phrase.confidence);
  if (!covered.length || covered.map(phrase => phrase.text).join('') !== text ||
      line.draft.cues.slice(0, line.draft.cues.indexOf(covered[0]!)).reduce((sum, phrase) => sum + phrase.text.length, 0) !== cueOffset) {
    return {...result, reason: 'The caption text span does not match whole aligned phrases at the same transcript offsets.'};
  }
  if (covered.some(phrase => phrase.reviewRequired || phrase.sourceTiming === null)) {
    return {...result, reason: 'The saved phrase timing is missing, below the original confidence threshold, or sub-frame.'};
  }
  result.intervalSeconds = [covered[0]!.sourceTiming!.startSeconds, covered.at(-1)!.sourceTiming!.endSeconds];
  for (const window of selected) {
    result.overlaps.push(...runs(window.startFrame, window.endFrameExclusive, frame =>
      covered.some(({sourceTiming}) =>
        (frame - lineStartFrame) / 30 < sourceTiming!.endSeconds &&
        (frame + 1 - lineStartFrame) / 30 > sourceTiming!.startSeconds)));
  }
  return {...result, status: result.overlaps.length ? 'TIMING_EVIDENCE_OVERLAP' : 'TIMING_EVIDENCE_NO_OVERLAP',
    reason: 'Overlap uses saved local phrase intervals. Speech content, timing accuracy and actual correspondence still require review.'};
}

export function evaluateAudienceCorrespondence(
  manifest: Manifest, timeline: ReturnType<typeof showcaseTimeline>, expectations: AudienceExpectation[],
  speech: ReadonlyMap<string, AudienceSpeechLine>,
) {
  const mediaById = new Map(manifest.media.map(media => [media.id, media]));
  const shots = new Map<string, {beatIndex: number; shot: typeof timeline.props.shots[number]; authored: Manifest['beats'][number]['shots'][number]}>();
  let nextShot = 0;
  for (const [beatIndex, beat] of manifest.beats.entries()) {
    for (const [shotIndex, authored] of beat.shots.entries()) {
      shots.set(beat.id + ':' + shotIndex, {beatIndex, authored, shot: timeline.props.shots[nextShot++]!});
    }
  }
  const boundPanels = new Set<string>();
  const boundCues = new Set<string>();
  const cuesByBeat = timeline.timeline.segments.map((segment, index) =>
    showcaseCaptions(segment.text, segment.startFrame, segment.frames, manifest.narration[index]!));
  const boundActions = new Set<string>();
  const targets = new Set<string>();
  const results = expectations.map(expectation => {
    const {beatId, shotIndex, panelIndex, cue: cueBinding, media: mediaBinding, sourceWindow} = expectation;
    const key = beatId + ':' + shotIndex;
    const panelKey = key + ':' + panelIndex;
    const target = panelKey + ':' + cueBinding.index;
    const known = shots.get(key);
    const stale = (detail: string): never =>
      fail('Expectation ' + expectation.id + ' ' + detail, 'SHOWCASE_AUDIENCE_BINDING');
    if (!known) return stale('names an unknown beat or shot.');
    const {shot, authored, beatIndex} = known;
    const panel = showcasePanels(shot)[panelIndex];
    if (!panel) return stale('names an unknown panel.');
    if (targets.has(target)) return stale('duplicates a shot, panel and cue binding.');
    targets.add(target);
    const mediaId = authored.panels?.[panelIndex]?.mediaId ?? authored.mediaId;
    const media = mediaById.get(mediaId)!;
    if (media.id !== mediaBinding.id || media.sha256 !== mediaBinding.sha256) return stale('names stale or different panel media.');
    if (media.type !== 'video' || sourceWindow.endFrameExclusive > media.frames!) return stale('has an invalid source-frame window.');
    const segment = timeline.timeline.segments[beatIndex]!;
    const narration = manifest.narration[beatIndex]!;
    const cues = cuesByBeat[beatIndex]!;
    const cue = cues[cueBinding.index];
    if (!cue || cue.text !== cueBinding.text) return stale('does not bind the exact current caption cue.');
    const independentMedia = 'media' in panel && panel.media;
    const sourceStart = panel.startFrame ?? (independentMedia ? 0 : shot.startFrame ?? 0);
    const sourceEnd = panel.endFrame ?? (independentMedia ? media.frames : shot.endFrame ?? shot.frames);
    if (sourceWindow.startFrame < sourceStart || sourceWindow.endFrameExclusive > sourceEnd!) {
      return stale('claims a source range outside the selected panel playback bounds.');
    }
    const anchoredPanel = !independentMedia && panel.startFrame === undefined && panel.endFrame === undefined;
    const action = authored.actions?.find(row => row.cue === cueBinding.index);
    if (action && anchoredPanel) {
      if (action.sourceFrame < sourceWindow.startFrame || action.sourceFrame >= sourceWindow.endFrameExclusive) {
        return stale('contradicts the authored action anchor at this cue.');
      }
      boundActions.add(key + ':' + cueBinding.index);
    }
    boundPanels.add(panelKey);
    boundCues.add(beatId + ':' + cueBinding.index);
    const inSourceWindow = (frame: number) => {
      if (!showcasePanelVisible(panel, showcaseShotProgress(frame, shot))) return false;
      const sourceFrame = showcasePanelSourceFrame(frame, shot, panel);
      return sourceFrame >= sourceWindow.startFrame && sourceFrame < sourceWindow.endFrameExclusive;
    };
    const visibleSourceWindowMatches = runs(shot.start, shot.end, inSourceWindow);
    const captionSourceOverlap = runs(Math.max(shot.start, cue.start), Math.min(shot.end, cue.end), inSourceWindow);
    const speechResult = compareSpeech(speech.get(beatId),
      cues.slice(0, cueBinding.index).reduce((sum, row) => sum + row.text.length, 0), cue.text, segment.startFrame,
      visibleSourceWindowMatches);
    return {
      expectation,
      captionClock: narration.captionCues ? 'authored-caption-cues' as const : 'estimated-caption-display' as const,
      cueWindow: {startFrame: cue.start, endFrameExclusive: cue.end},
      visibleSourceWindowMatches,
      captionSourceOverlap,
      status: captionSourceOverlap.length ? 'OVERLAP' as const : 'NO_OVERLAP' as const,
      speech: speechResult,
    };
  });
  const unboundPanels = manifest.beats.flatMap(beat => beat.shots.flatMap((authored, shotIndex) =>
    (authored.panels ?? [null]).flatMap((panel, panelIndex) => boundPanels.has(beat.id + ':' + shotIndex + ':' + panelIndex)
      ? [] : [{beatId: beat.id, shotIndex, panelIndex, mediaId: panel?.mediaId ?? authored.mediaId}])));
  const unboundActions = manifest.beats.flatMap(beat => beat.shots.flatMap((authored, shotIndex) =>
    (authored.actions ?? []).flatMap(action => boundActions.has(beat.id + ':' + shotIndex + ':' + action.cue)
      ? [] : [{beatId: beat.id, shotIndex, cueIndex: action.cue, sourceFrame: action.sourceFrame}])));
  const unboundCues = manifest.beats.flatMap((beat, beatIndex) => cuesByBeat[beatIndex]!.flatMap((cue, index) =>
    boundCues.has(beat.id + ':' + index) ? [] : [{beatId: beat.id, cue: {index, text: cue.text,
      window: {startFrame: cue.start, endFrameExclusive: cue.end}}, status: 'UNASSESSED' as const}]));
  return {expectations: results, unboundCues, unboundPanels, unboundActions};
}

