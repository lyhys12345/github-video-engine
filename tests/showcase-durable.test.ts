import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {canonical, sha256} from '../src/core/util.js';
import {showcaseCommand} from '../src/showcase/cli.js';
import {captureShowcase, loadShowcase, openShowcase, readShowcaseSpec, showcaseStoryboardSha256, validateSource} from '../src/showcase/inputs.js';
import {showcaseShotInputs, showcaseTimeline} from '../src/showcase/timeline.js';
import {workspaceReviewName, workspaceShowcaseSource, workspaceSourceName} from '../src/showcase/workspace.js';
import {signal, urlFixture, writeShowcaseFixture} from './showcase-support.js';

it('captures exact files once and keeps portable input independent of mutable original paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gve-showcase-source-'));
  const fixture = await writeShowcaseFixture(join(root, 'author'), [{file: 'image.png', bytes: Buffer.from('fake-media-unit'), width: 1, height: 1}]);
  const stored = await readShowcaseSpec(fixture.spec, signal);
  expect(stored.input.sourceManifestSha256).toBe(sha256(await readFile(fixture.spec)));
  const runner = await openShowcase(join(root, 'state'), true);
  try {
    const id = await captureShowcase(runner, stored.input, stored.assets, signal);
    expect(await captureShowcase(runner, stored.input, stored.assets, signal)).toBe(id);
    expect(runner.get(id)).toMatchObject({state: 'succeeded', attempt: 1});
    await writeFile(join(root, 'author', 'image.png'), 'changed');
    const loaded = await loadShowcase(runner, id, signal);
    expect(loaded.assets.get(loaded.manifest.media[0]!.path)?.toString()).toBe('fake-media-unit');
    const changed = await readShowcaseSpec(fixture.spec, signal);
    await expect(captureShowcase(runner, changed.input, changed.assets, signal)).rejects.toThrow('source bytes differ');
  } finally { runner.close(); }
});

it('rejects a mismatched approval and unrecognized receipt fields before durable submission', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gve-showcase-invalid-'));
  const {spec} = await writeShowcaseFixture(root, [{file: 'image.png', bytes: Buffer.from('fixture'), width: 1, height: 1}]);
  const {input, assets} = await readShowcaseSpec(spec, signal);
  const badApproval = Buffer.from(canonical({schemaVersion: 'script-owner-authorization/1.0', scriptSha256: 'a'.repeat(64), authority: 'fixture'}));
  const changed = structuredClone(input);
  changed.manifest.approval.sha256 = sha256(badApproval);
  const wrong = new Map(assets).set(changed.manifest.approval.path, badApproval);
  expect(() => validateSource(changed, wrong)).toThrow('approval');
  const receipt = changed.manifest.narration[0]!.receipt;
  const withPrivateField = Buffer.from(canonical({...JSON.parse(assets.get(receipt.path)!.toString()), referenceWavPath: 'private.wav'}));
  const newInput = structuredClone(input);
  newInput.manifest.narration[0]!.receipt.sha256 = sha256(withPrivateField);
  expect(() => validateSource(newInput, new Map(assets).set(receipt.path, withPrivateField))).toThrow('referenceWavPath');
});

it('binds exact approved script bytes and review to the verified owner workspace snapshot', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'gve-showcase-workspace-'));
  const start = await urlFixture(workspace);
  const authored = await writeShowcaseFixture(join(workspace, 'showcase-author'),
    [{file: 'image.png', bytes: Buffer.from('fixture'), width: 1, height: 1}], start.source.bindingSha256);
  const {input, assets} = await readShowcaseSpec(authored.spec, signal);
  expect(() => validateSource(input, assets)).toThrow('original URL workspace');
  const source = await workspaceShowcaseSource(workspace, signal);
  const review = await readFile(authored.review);
  input.provenance = {sourceSha256: sha256(source), reviewSha256: sha256(review)};
  assets.set(workspaceSourceName, source).set(workspaceReviewName, review);
  expect(validateSource(input, assets).script.lines).toHaveLength(1);
  const newRevision = await mkdtemp(join(tmpdir(), 'gve-showcase-workspace-new-'));
  await urlFixture(newRevision, 'b'.repeat(40));
  const newerSource = await workspaceShowcaseSource(newRevision, signal);
  const movedApproval = structuredClone(input);
  movedApproval.provenance!.sourceSha256 = sha256(newerSource);
  expect(() => validateSource(movedApproval, new Map(assets).set(workspaceSourceName, newerSource))).toThrow('owner-authorized script review');
  const edited = structuredClone(input);
  edited.manifest.beats[0]!.shots[0]!.annotation = 'Unapproved new operational text';
  expect(showcaseStoryboardSha256(edited.manifest)).not.toBe(showcaseStoryboardSha256(input.manifest));
  expect(() => validateSource(edited, assets)).toThrow('owner-authorized script review');
  const wrong = Buffer.from(canonical({...JSON.parse(review.toString()), ownerApprovedSha256: 'a'.repeat(64)}));
  input.provenance.reviewSha256 = sha256(wrong);
  expect(() => validateSource(input, assets.set(workspaceReviewName, wrong))).toThrow('owner-authorized script review');
  const standalone = await writeShowcaseFixture(join(workspace, 'standalone'),
    [{file: 'image.png', bytes: Buffer.from('fixture'), width: 1, height: 1}]);
  const foreign = await readShowcaseSpec(standalone.spec, signal);
  const runner = await openShowcase(join(workspace, 'state'));
  let standaloneSource: string;
  try { standaloneSource = await captureShowcase(runner, foreign.input, foreign.assets, signal); }
  finally { runner.close(); }
  await expect(showcaseCommand(['showcase', 'resume'], {workspace, task: standaloneSource}, signal)).rejects.toThrow('another source capture or a standalone run');
  await writeFile(join(workspace, 'source.json'), canonical({...start.source, bindingSha256: 'a'.repeat(64)}));
  await expect(workspaceShowcaseSource(workspace, signal)).rejects.toThrow('Pinned showcase source provenance differs');
});

it('a one-shot visual edit changes only that render fingerprint, including when a panel uses an independent asset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gve-showcase-parts-'));
  const {spec} = await writeShowcaseFixture(root, [
    {file: 'image.png', bytes: Buffer.from('first'), width: 1, height: 1}, {file: 'second.png', bytes: Buffer.from('second'), width: 1, height: 1},
  ]);
  const {input, assets} = await readShowcaseSpec(spec, signal);
  const {manifest, script} = validateSource(input, assets);
  const build = () => showcaseShotInputs(showcaseTimeline(manifest, script.lines, [{frames: 90, samples: 72000}]).props,
    new Map(manifest.media.map(media => [media.path, media.sha256])), manifest.font.sha256).map(part => sha256(canonical(part)));
  const original = build();
  manifest.beats[0]!.shots[0]!.panels = [{mediaId: 'clip-1', crop: {x: 0, y: 0, width: 1, height: 1}, x: 0, y: 0, width: 1, height: 1}];
  const edited = build();
  expect(edited[0]).not.toBe(original[0]);
  expect(edited[1]).toBe(original[1]);
});
