import type {ShowcaseProps} from '../renderer/showcase-reel.js';
import type {Manifest} from './inputs.js';
import {scheduleShowcaseShots, showcaseCaptions} from '../renderer/showcase-reel-contract.js';
import {resolveSourceAnchors} from '../renderer/showcase-timing.js';

type MeasuredLine = {samples: number; frames: number};
export function showcaseTimeline(manifest: Manifest, lines: [string, string][], measured: MeasuredLine[]) {
  const {theme, layout, cinematic, projectLabel} = manifest;
  const props: ShowcaseProps = {frames: 0, theme, projectLabel, shots: [], captions: [],
    ...(layout === undefined ? {} : {layout}), ...(cinematic === undefined ? {} : {cinematic})};
  const actionFrames: number[] = [];
  const media = new Map(manifest.media.map(({path, type, width, height, frames, id}) => [
    id, {file: path, type, width, height, ...(frames === undefined ? {} : {frames})},
  ]));
  const segments = manifest.narration.map(({id, sha256, captionCues, captionChunks}, index) => {
    const {samples, frames} = measured[index]!;
    const text = lines[index]![1];
    const startFrame = props.frames;
    const cues = showcaseCaptions(text, startFrame, frames, {captionCues, captionChunks});
    props.captions.push(...cues);
    for (const shot of scheduleShowcaseShots(manifest.beats[index]!.shots, startFrame, frames, cues)) {
      const {mediaId, start: start, end, crop, cropEnd, label, annotation, startFrame: from, endFrame: to, panels, overlays, actions} = shot;
      const source = media.get(mediaId)!;
      const sourceAnchors = actions ? resolveSourceAnchors(actions, cues, shot, source.frames!) : undefined;
      for (const action of actions ?? []) actionFrames.push(cues[action.cue]!.start);
      props.shots.push({
        ...source, start, end, crop,
        ...(cropEnd === undefined ? {} : {cropEnd}), ...(label === undefined ? {} : {label}),
        ...(annotation === undefined ? {} : {annotation}), ...(from === undefined ? {} : {startFrame: from}),
        ...(to === undefined ? {} : {endFrame: to}), ...(overlays === undefined ? {} : {overlays}),
        ...(sourceAnchors === undefined ? {} : {sourceAnchors}),
        ...(panels === undefined ? {} : {panels: panels.map(({mediaId: panelId, ...panel}) => ({
          ...panel, ...(panelId === undefined ? {} : {media: media.get(panelId)!}),
        }))}),
      });
    }
    props.frames += frames;
    return {id, text, startFrame, frames, sourceSamples: samples, padSamples: frames * 800 - samples,
      sourceSha256: sha256, playbackRate: 1};
  });
  if (props.frames > 9000) throw new Error('Showcase exceeds the five-minute limit.');
  return {props, timeline: {fps: 30, sampleRate: 24000, frames: props.frames, seconds: props.frames / 30, segments}, actionFrames};
}

export function showcaseShotInputs(props: ShowcaseProps, indexes: ReadonlyMap<string, string>, fontSha256: string, frame?: number) {
  return props.shots.filter(shot => frame === undefined || frame >= shot.start && frame < shot.end).map(shot => {
    // Asset path in the composition is stable under unrelated manifest reorderings.
    const rename = (file: string) => `assets/${indexes.get(file)!}${file.slice(file.lastIndexOf('.'))}`;
    const files = new Map([[rename(shot.file), indexes.get(shot.file)!]]);
    const panels = shot.panels?.map(panel => {
      if (!panel.media) return panel;
      const file = rename(panel.media.file);
      files.set(file, indexes.get(panel.media.file)!);
      return {...panel, media: {...panel.media, file}};
    });
    const from = frame ?? shot.start;
    const to = frame === undefined ? shot.end : frame + 1;
    return {
      // Preserve absolute time: the standard layout displays elapsed time and a reel-wide progress bar.
      props: {...props, shots: [{...shot, file: rename(shot.file), ...(panels ? {panels} : {})}],
        captions: props.captions.filter(cue => cue.start < to && cue.end > from)},
      from, to, assets: Object.fromEntries(files), fontSha256,
    };
  });
}
