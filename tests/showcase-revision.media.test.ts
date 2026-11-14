import {mkdtemp, mkdir, readFile, rename, unlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {expect, it} from 'vitest';
import {command} from '../src/core/process.js';
import {canonical, sha256} from '../src/core/util.js';
import {ffmpegPath, projectRoot} from '../src/providers/local.js';
import {openShowcase, loadShowcase, readShowcaseSpec, validateSource} from '../src/showcase/inputs.js';
import {exportShowcase, importShowcase} from '../src/showcase/portable.js';
import {readShowcasePointer, workspaceReviewName, writeShowcasePointer} from '../src/showcase/workspace.js';
import {signal, urlFixture, writeShowcaseFixture} from './showcase-support.js';

type Report = Record<string, any>;

async function run(flags: string[], unavailable = false): Promise<Report> {
  const bad = 'nonexistent-gve-test-tool';
  return JSON.parse(await command(process.execPath, ['--import', 'tsx', 'src/cli.ts', 'showcase', ...flags], {
    cwd: projectRoot, signal, timeout: 160_000,
    ...(unavailable ? {env: {...process.env, GVE_FFMPEG: bad, GVE_FFPROBE: bad, GVE_BROWSER: bad, GVE_NARRATION_VOICE: bad}} : {}),
  }));
}

it('revises a real synthetic local movie through the CLI and preserves approval, PCM, and cache evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gvsrev-'));
  console.log('Showcase revision synthetic evidence: ' + root);
  const workspace = join(root, 'workspace');
  const data = join(workspace, 'state');
  const start = await urlFixture(workspace);
  const pattern = join(root, 'pattern.png');
  const ffmpeg = ffmpegPath();
  await command(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=160x96:r=30', '-frames:v', '1', '-threads', '1', pattern], {signal});
  const fixture = await writeShowcaseFixture(join(workspace, 'author'), [
    {file: 'pattern.png', bytes: await readFile(pattern), width: 160, height: 96},
    {file: 'control.png', bytes: await readFile(pattern), width: 160, height: 96},
  ], start.source.bindingSha256);
  const baseline = await run(['render', '--workspace', workspace, '--spec', fixture.spec, '--review', fixture.review,
    '--out', join(root, 'baseline'), '--skip-stills']);
  const oldPointer = await readShowcasePointer(workspace);
  const originalSpec = await readFile(fixture.spec);
  const oldReviewPath = join(root, 'video-review.json');
  await writeFile(oldReviewPath, canonical({schemaVersion: 'candidate-review/1.0', stage: 'video', reviewer: 'TEST_ONLY',
    candidateSha256: baseline.candidateSha256, verdict: 'REVISE', coverage: 'partial-av', findings: ['Focus on the upper left.']}));
  await run(['review', '--workspace', workspace, '--task', baseline.taskId, '--review', oldReviewPath], true);
  const viaWorkspace = ['--workspace', workspace, '--task', baseline.taskId];
  const context = await run(['feedback-context', ...viaWorkspace], true);
  expect(context).toMatchObject({baseline: {renderTaskId: baseline.taskId, sourceTaskId: baseline.sourceTaskId,
    candidateSha256: baseline.candidateSha256, originalManifestSha256: sha256(originalSpec),
    normalizedManifestSha256: baseline.manifestSha256}, frames: 12, videoReviews: [{decision: {status: 'revise-and-resubmit'}}]});
  expect(context.baseline.normalizedManifestSha256).not.toBe(context.baseline.originalManifestSha256);
  await rename(join(workspace, 'author'), join(workspace, 'archived-author'));
  expect(await run(['feedback-context', ...viaWorkspace], true)).toEqual(context);
  await expect(run(['feedback-context', ...viaWorkspace, '--approval', 'ignored.json'], true)).rejects.toThrow('USAGE');
  const shot = context.beats[0].shots[0];
  const plan = {schemaVersion: 'showcase-revision-plan/1.0', baseline: context.baseline,
    feedback: {text: 'Focus on the upper left.', origin: 'independent-review', interpretation: 'Use a tighter shot crop.',
      interpretedBy: 'current-session-agent', videoReviewSha256: context.videoReviews[0].sha256},
    scriptShots: ['Close-up of the upper left of the synthetic test pattern.', 'Full synthetic test pattern.'],
    shots: [{beatId: 'line1', shotIndex: 0, expectedShotSha256: shot.expectedShotSha256, reason: 'Make the pattern focus larger',
      replacement: {...shot.shot, crop: {x: 0, y: 0, width: .55, height: .55}}}]};
  const planPath = join(root, 'plan.json');
  const setPlan = (value: unknown) => writeFile(planPath, canonical(value));
  await setPlan({...plan, baseline: {...context.baseline, normalizedManifestSha256: '0'.repeat(64)}});
  await expect(run(['revision-impact', ...viaWorkspace, '--spec', planPath], true)).rejects.toThrow('Stale or different');
  await setPlan({...plan, feedback: {...plan.feedback, videoReviewSha256: '0'.repeat(64)}});
  await expect(run(['revision-impact', ...viaWorkspace, '--spec', planPath], true)).rejects.toThrow('digest does not belong');
  await setPlan(plan);
  const impact = await run(['revision-impact', ...viaWorkspace, '--spec', planPath], true);
  expect(impact).toMatchObject({frames: 12, baselinePcmSha256: baseline.pcmSha256, reusableShotInputs: 1, changedShotInputs: 1,
    shots: [{before: {from: 0, to: 6, taskId: baseline.shots[0]}, cacheEligibleWithSavedEnvironment: false},
      {before: {from: 6, to: 12, taskId: baseline.shots[1]}, cacheEligibleWithSavedEnvironment: true}]});
  await setPlan({...plan, display: {expectedDisplaySha256: context.expectedDisplaySha256, reason: 'Use copper', theme: 'copper'}});
  expect(await run(['revision-impact', ...viaWorkspace, '--spec', planPath], true)).toMatchObject({reusableShotInputs: 0, changedShotInputs: 2});
  await setPlan(plan);
  const draftOut = join(root, 'draft');
  const prepare = () => run(['revision-prepare', ...viaWorkspace, '--spec', planPath, '--out', draftOut], true);
  const draft = await prepare();
  expect(draft).toMatchObject({approval: 'pending', scriptSha256: impact.scriptSha256, reused: false});
  expect(await prepare()).toMatchObject({bundle: draft.bundle, receiptSha256: draft.receiptSha256, reused: true});
  const draftManifest = JSON.parse(await readFile(draft.manifest, 'utf8'));
  expect(draftManifest).not.toHaveProperty('approval');
  await expect(run(['render', '--workspace', workspace, '--spec', draft.manifest, '--review', oldReviewPath], true)).rejects.toThrow('approval');
  const document = await readFile(draft.reviewDocument);
  expect(document.toString()).toContain('## Exact narration');
  expect(document.toString()).toContain('line1 / shot 1');
  expect(document.toString()).toContain('Eligible');
  const approvalPath = join(root, 'owner.json'), reviewPath = join(root, 'script-review.json');
  const authorApprove = {schemaVersion: 'script-owner-authorization/1.0', authority: 'TEST_ONLY synthetic fixture',
    scriptSha256: draft.scriptSha256, approvedDocumentSha256: sha256(document)};
  const independent = {schemaVersion: 'candidate-review/1.0', stage: 'script', coverage: 'script',
    reviewer: 'TEST_ONLY independent synthetic fixture', verdict: 'PASS', findings: [],
    candidateSha256: draft.scriptSha256, ownerApprovedSha256: draft.scriptSha256};
  const finalOut = join(root, 'final');
  const finalize = (digest = draft.receiptSha256, out = finalOut) => run(['revision-finalize', ...viaWorkspace, '--package', draft.bundle,
    '--digest', digest, '--approval', approvalPath, '--review', reviewPath, '--out', out], true);
  await writeFile(approvalPath, canonical({...authorApprove, scriptSha256: context.baseline.scriptSha256}));
  await writeFile(reviewPath, canonical(independent));
  await expect(finalize(draft.receiptSha256, join(draft.bundle, 'nested'))).rejects.toThrow('disjoint');
  await expect(finalize(draft.receiptSha256, root)).rejects.toThrow('disjoint');
  await expect(finalize('0'.repeat(64))).rejects.toThrow('receipt does not match');
  await expect(finalize()).rejects.toThrow('Fresh owner authorization');
  await writeFile(approvalPath, canonical(authorApprove));
  await writeFile(reviewPath, canonical({...independent, ownerApprovedSha256: context.baseline.scriptSha256}));
  await expect(finalize()).rejects.toThrow('exact owner authorization');
  await writeFile(reviewPath, canonical(independent));
  await writeFile(draft.reviewDocument, 'corrupt');
  await expect(finalize()).rejects.toThrow('damaged');
  await expect(prepare()).rejects.toThrow('changed during publication');
  await writeFile(draft.reviewDocument, document);
  // A staging directory without a committed receipt is allowed to remain from an earlier interrupted attempt.
  await mkdir(draft.bundle.slice(0, -6) + 'abc999');
  await writeFile(join(draft.bundle.slice(0, -6) + 'abc999', 'interrupted'), 'partial');
  expect(await prepare()).toMatchObject({bundle: draft.bundle, reused: true});
  const supplemental = join(draft.bundle, 'other.json');
  await writeFile(supplemental, '{}');
  await expect(finalize()).rejects.toThrow('Unexpected');
  await unlink(supplemental);
  const final = await finalize();
  expect(final).toMatchObject({renderTasksStarted: 0, ownerAcceptance: 'pending', approval: 'exact script authorized', reused: false});
  expect(final.sourceTaskId).not.toBe(baseline.sourceTaskId);
  expect(await finalize()).toMatchObject({sourceTaskId: final.sourceTaskId, receiptSha256: final.receiptSha256, reused: true});
  await writeFile(reviewPath, canonical({...independent, reviewer: 'TEST_ONLY different review bytes'}));
  await expect(finalize()).rejects.toThrow('Destination is complete');
  expect(await readShowcasePointer(workspace)).toEqual(oldPointer);
  expect(await readFile(join(workspace, 'archived-author/manifest.json'))).toEqual(originalSpec);

  const revised = await run(['resume', '--workspace', workspace, '--task', final.sourceTaskId, '--out', join(root, 'revised'), '--skip-stills']);
  expect(revised).toMatchObject({pcmSha256: baseline.pcmSha256, frames: baseline.frames, fullDecodePassed: true, sourceFacts: 'unverified',
    perceptualReview: 'pending', ownerAcceptance: 'pending', reuse: {shotsReused: 1, shotsRendered: 1}});
  expect(revised.shots).toEqual(impact.shots.map((entry: Report) => entry.after.taskId));
  expect(revised.candidateSha256).not.toBe(baseline.candidateSha256);
  await expect(prepare()).rejects.toThrow('baseline is stale');
  await expect(finalize()).rejects.toThrow('baseline is stale');

  for (const [label, result] of [['baseline', baseline], ['revised', revised]] as const) {
    const movie = join(result.output.bundle, 'review.mp4');
    for (const [index, frame] of [3, 9].entries()) {
      await command(ffmpeg, ['-v', 'error', '-i', movie, '-vf', `select=eq(n\\,${frame})`,
        '-frames:v', '1', '-threads', '1', join(root, `${label}-shot-${index}.png`)], {signal});
    }
  }
  const digest = async (path: string) => sha256(await readFile(join(root, path)));
  expect(await digest('baseline-shot-0.png')).not.toBe(await digest('revised-shot-0.png'));
  expect(await digest('baseline-shot-1.png')).toBe(await digest('revised-shot-1.png'));
  const exported = await exportShowcase(data, revised.taskId, join(root, 'export'), signal);
  const imported = await importShowcase(exported.bundle, exported.digest, join(root, 'import'), signal);
  const runner = await openShowcase(imported.data);
  try {
    const loaded = await loadShowcase(runner, imported.sourceTaskId, signal);
    expect(loaded.input.provenance?.sourceSha256).toBe(context.baseline.pinnedSourceSha256);
    expect(loaded.assets.get(workspaceReviewName)).toEqual(Buffer.from(canonical(independent)));
    expect(loaded.manifest.narration[0]).toMatchObject({sha256: context.beats[0].audioSha256, receipt: {sha256: context.beats[0].receiptSha256}});
  } finally { runner.close(); }
  const revertedReview = await readFile(join(exported.bundle, 'source', ...workspaceReviewName.split('/')));
  expect(sha256(revertedReview)).toBe(final.scriptReviewSha256);
  await writeFile(join(root, 'revision-evidence.json'), canonical({baseline, impact, draft, final, revised, exported, imported}));
}, 300_000);

it('requires the standalone revision review on resumed and ordinary manifest rendering paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gvsstand-'));
  const data = join(root, 'state');
  const image = join(root, 'source.png');
  await command(ffmpegPath(), ['-v', 'error', '-f', 'lavfi', '-i', 'color=darkgreen:s=96x56', '-frames:v', '1', '-threads', '1', image], {signal});
  const input = await writeShowcaseFixture(join(root, 'author'), [{file: 'synthetic.png', bytes: await readFile(image), width: 96, height: 56}]);
  const editable = await run(['render', '--data', data, '--spec', input.spec, '--skip-stills']);
  const target = ['--data', data, '--task', editable.taskId];
  const context = await run(['feedback-context', ...target], true);
  const plan = {schemaVersion: 'showcase-revision-plan/1.0', baseline: context.baseline,
    feedback: {text: 'Use copper', origin: 'user', interpretation: 'Change the theme', interpretedBy: 'current-session-agent'},
    scriptShots: ['Synthetic solid color image.'],
    display: {expectedDisplaySha256: context.expectedDisplaySha256, reason: 'Use requested contrast', theme: 'copper'}};
  const planPath = join(root, 'plan.json');
  await writeFile(planPath, canonical(plan));
  const draft = await run(['revision-prepare', ...target, '--spec', planPath, '--out', join(root, 'draft')], true);
  const approvalPath = join(root, 'owner.json'), reviewPath = join(root, 'script-review.json');
  await writeFile(approvalPath, canonical({schemaVersion: 'script-owner-authorization/1.0',
    authority: 'TEST_ONLY synthetic fixture', scriptSha256: draft.scriptSha256}));
  await writeFile(reviewPath, canonical({schemaVersion: 'candidate-review/1.0', stage: 'script', coverage: 'script',
    reviewer: 'TEST_ONLY independent synthetic fixture', verdict: 'PASS', findings: [],
    candidateSha256: draft.scriptSha256, ownerApprovedSha256: draft.scriptSha256}));
  const final = await run(['revision-finalize', ...target, '--package', draft.bundle, '--digest', draft.receiptSha256,
    '--approval', approvalPath, '--review', reviewPath, '--out', join(root, 'final')], true);
  const source = await readShowcaseSpec(final.manifest, signal);
  expect(source.input.standaloneReviewSha256).toBe(final.scriptReviewSha256);
  expect(() => validateSource({...source.input, standaloneReviewSha256: '0'.repeat(64)}, source.assets)).toThrow('review binding');
  const {scriptReview: _review, ...bare} = source.input.manifest;
  const noReview = join(final.bundle, 'no-review.json');
  await writeFile(noReview, canonical(bare));
  await expect(run(['render', '--data', data, '--spec', noReview, '--skip-stills'], true)).rejects.toThrow('requires its exact independent script review');
  await unlink(noReview);
  const rendered = await run(['render', '--data', data, '--spec', final.manifest, '--skip-stills']);
  expect(rendered.sourceTaskId).toBe(final.sourceTaskId);
  const exported = await exportShowcase(data, rendered.taskId, join(root, 'export'), signal);
  const imported = await importShowcase(exported.bundle, exported.digest, join(root, 'moved'), signal);
  const runner = await openShowcase(imported.data);
  try {
    const loaded = await loadShowcase(runner, imported.sourceTaskId, signal);
    expect(loaded.input.standaloneReviewSha256).toBe(final.scriptReviewSha256);
    expect(loaded.assets.get(workspaceReviewName)).toEqual(await readFile(reviewPath));
  } finally { runner.close(); }
}, 160_000);
