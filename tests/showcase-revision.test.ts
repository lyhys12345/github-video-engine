import {join} from 'node:path';
import {mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {expect, it} from 'vitest';
import {json, readShowcaseSpec, ShowcaseScript} from '../src/showcase/inputs.js';
import {
  ShowcaseRevisionPlan, applyShowcaseRevisionPlan, captionBinding, displayBinding, exactHash,
} from '../src/showcase/revision-plan.js';
import {showcaseTimeline} from '../src/showcase/timeline.js';
import {signal, writeShowcaseFixture} from './showcase-support.js';

const hash = 'f'.repeat(64);
const baseline = {renderTaskId: hash, sourceTaskId: hash, candidateSha256: hash, originalManifestSha256: hash,
  normalizedManifestSha256: hash, scriptSha256: hash, approvalSha256: hash, pinnedSourceSha256: null, scriptReviewSha256: null};
const feedback = {text: 'Make the source easier to follow.', origin: 'user', interpretedBy: 'current-session-agent',
  interpretation: 'Change the visible framing and mark the source cue.'};
const plan = {schemaVersion: 'showcase-revision-plan/1.0', baseline, feedback, scriptShots: ['First test card.', 'Reframed test card.']};

it('applies exact scoped selectors and keeps narration bytes, receipts, media, and beat positions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gvs-unit-'));
  const fixture = await writeShowcaseFixture(root, [
    {file: 'a.png', bytes: Buffer.from('a'), width: 20, height: 20},
    {file: 'b.mp4', bytes: Buffer.from('b'), width: 20, height: 20, frames: 6},
  ]);
  const {input: {manifest}, assets} = await readShowcaseSpec(fixture.spec, signal);
  const script = ShowcaseScript.parse(json(assets.get(manifest.script.path)!));
  const line = manifest.narration[0]!, clip = manifest.beats[0]!.shots[1]!;
  const captionCues = [{text: 'Technical ', startFrame: 0, endFrame: 5}, {text: 'fixture.', startFrame: 5, endFrame: 12}];
  const captions = [{beatId: 'line1', expectedCaptionSha256: exactHash(captionBinding(line)), reason: 'Phrase boundary', captionCues}];
  const edit = {beatId: 'line1', shotIndex: 1, expectedShotSha256: exactHash(clip), reason: 'Mark source motion',
    replacement: {...clip, actions: [{cue: 0, sourceFrame: 0}]}};
  const display = {expectedDisplaySha256: exactHash(displayBinding(manifest)), reason: 'Increase caption size', cinematic: {captionSize: 45}};
  const apply = (raw: unknown) => applyShowcaseRevisionPlan(manifest, script, ShowcaseRevisionPlan.parse(raw));
  const result = apply({...plan, captions, display});
  expect(result.manifest).not.toHaveProperty('approval');
  expect(result.manifest.narration[0]).toMatchObject({id: line.id, sha256: line.sha256, receipt: line.receipt, transcriptSha256: line.transcriptSha256, captionCues});
  expect(result.manifest.narration[0]).not.toHaveProperty('captionChunks');
  expect(manifest.narration[0]?.captionChunks).toEqual(['Technical fixture.']);
  expect(result.nextScript.lines).toEqual(script.lines);
  expect(result.manifest).toMatchObject({font: manifest.font, beats: manifest.beats, media: manifest.media});
  expect(showcaseTimeline(result.manifest, script.lines, [{frames: 12, samples: 9600}]).timeline.frames).toBe(12);
  const blockedAction = apply({...plan, captions, shots: [edit]});
  expect(() => showcaseTimeline(blockedAction.manifest, script.lines, [{frames: 12, samples: 9600}])).toThrow('outside the shot');

  expect(() => apply({...plan, scriptShots: ['One description only.'], display})).toThrow('per shot');
  expect(() => apply({...plan, shots: [edit, edit], captions})).toThrow('Duplicate shot selector');
  expect(() => apply({...plan, shots: [{...edit, shotIndex: 2}], captions})).toThrow('Unknown or stale shot selector');
  expect(() => apply({...plan, shots: [{...edit, expectedShotSha256: hash}], captions})).toThrow('Unknown or stale shot selector');
  expect(() => apply({...plan, shots: [{...edit, replacement: {...clip, mediaId: 'foreign'}}]})).toThrow('Unknown visual asset');
  expect(() => apply({...plan, captions: [{...captions[0]!, captionCues: [{text: 'new text', startFrame: 0, endFrame: 12}]}]})).toThrow('caption partition');
  expect(() => apply({...plan, display: {...display, layout: manifest.layout, cinematic: null}})).toThrow('unchanged');
  expect(() => apply({...plan, feedback: {...feedback, origin: 'independent-review'}, display})).toThrow('digest');
  for (const unsupported of [{narration: []}, {durationFrames: 12}, {media: []}, {beats: []}, {font: ''}]) {
    expect(ShowcaseRevisionPlan.safeParse({...plan, display, ...unsupported}).success).toBe(false);
  }
  expect((await readFile(fixture.spec)).includes('Increase caption size')).toBe(false);
});
