import {it, expect} from 'vitest';
import {canonical, sha256} from '../src/core/util.js';
import {ShowcaseDraftManifest, validateShowcase, validateShowcaseContent} from '../src/renderer/showcase-reel-contract.js';

const text = 'Keep the approved words.';
const bytes = Buffer.from(canonical({lines: [['line1', text]], shots: ['Contract-only image; no media execution.']}));
const asset = {path: 'fixture.bin', sha256: 'a'.repeat(64)};
const draft = () => ShowcaseDraftManifest.parse({
  schemaVersion: 'showcase-reel/1.0', theme: 'paper', projectLabel: 'Contract fixture',
  script: {...asset, sha256: sha256(bytes)}, font: asset,
  narration: [{...asset, id: 'line1', transcriptSha256: sha256(text), receipt: asset, captionChunks: [text]}],
  media: [{...asset, id: 'image1', type: 'image', width: 10, height: 10}],
  beats: [{id: 'line1', shots: [{mediaId: 'image1', weight: 1, crop: {x: 0, y: 0, width: 1, height: 1}}]}],
});
const owner = {schemaVersion: 'script-owner-authorization/1.0', scriptSha256: sha256(bytes), authority: 'TEST_ONLY contract receipt'};

it('validating an approval-free draft does not make it renderable through the existing approved entrypoint', () => {
  const value = draft();
  expect(validateShowcaseContent(value, JSON.parse(bytes.toString())).lines).toEqual([['line1', text]]);
  expect(() => ShowcaseDraftManifest.parse({...value, approval: asset})).toThrow();
  expect(() => validateShowcase(bytes, owner, value)).toThrow();
  expect(validateShowcase(bytes, owner, {...value, approval: asset}).script.lines).toEqual([['line1', text]]);
  expect(() => validateShowcase(bytes, {...owner, scriptSha256: '0'.repeat(64)}, {...value, approval: asset})).toThrow('Exact owner approval required');
});

it('draft structural validation retains the exact narration and caption text boundary', () => {
  const changedScript = {lines: [['line1', 'A different claim.']], shots: ['Fixture']};
  expect(() => validateShowcaseContent(draft(), changedScript)).toThrow('Caption or transcript differs');
  const changedCaptions = draft();
  changedCaptions.narration[0]!.captionChunks = ['A different claim.'];
  expect(() => validateShowcaseContent(changedCaptions, JSON.parse(bytes.toString()))).toThrow('Caption or transcript differs');
  const missingSource = draft();
  missingSource.beats[0]!.shots[0]!.mediaId = 'unknown';
  expect(() => validateShowcaseContent(missingSource, JSON.parse(bytes.toString()))).toThrow('Unknown visual asset');
});
