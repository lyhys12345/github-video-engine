import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, it} from 'vitest';
import {canonical, sha256} from '../src/core/util.js';
import {AudienceAuditRequest, type AudienceExpectation} from '../src/showcase/audience-contract.js';
import {evaluateAudienceCorrespondence} from '../src/showcase/audience-correspondence.js';
import {loadAudienceSpeech, type AudienceSpeechLine} from '../src/showcase/audience-speech.js';
import {loadAudienceSource} from '../src/showcase/audience-source.js';
import {showcaseAudienceAudit} from '../src/showcase/audience-audit.js';
import {showcaseTimeline} from '../src/showcase/timeline.js';
import {type Manifest} from '../src/showcase/inputs.js';
import {signal, tone, writeShowcaseFixture} from './showcase-support.js';

const hash = 'a'.repeat(64);
const overrideHash = 'b'.repeat(64);
const crop = {x: 0, y: 0, width: 1, height: 1};
const panel = {...crop, crop};
const captions = [{text: 'Show ', startFrame: 0, endFrame: 3}, {text: 'result.', startFrame: 3, endFrame: 7},
  {text: '!', startFrame: 7, endFrame: 12}];
const line: [string, string][] = [['line1', captions.map(cue => cue.text).join('')]];
const media = {id: 'main', path: 'main.mp4', sha256: hash, type: 'video' as const, width: 100, height: 100, frames: 100, fps: 30};
const override = {...media, id: 'other', path: 'other.mp4', sha256: overrideHash};

const dirs: string[] = [];
afterEach(async () => {
  for (const directory of dirs.splice(0)) await rm(directory, {recursive: true, force: true, maxRetries: 2});
});
async function temp() {
  const root = await mkdtemp(join(tmpdir(), 'gve-aud-test-'));
  dirs.push(root);
  return root;
}

function authored(): Manifest {
  return {
    schemaVersion: 'showcase-reel/1.0', theme: 'paper', projectLabel: 'Test fixture',
    script: {path: 'script.json', sha256: hash}, approval: {path: 'approval.json', sha256: hash},
    font: {path: 'font.ttf', sha256: hash},
    narration: [{id: 'line1', path: 'line.wav', sha256: hash, transcriptSha256: sha256(line[0]![1]),
      receipt: {path: 'receipt.json', sha256: hash}, captionCues: captions}],
    media: [media, override],
    beats: [{id: 'line1', shots: [{mediaId: 'main', crop, weight: 1, startFrame: 10, endFrame: 50,
      actions: [{cue: 1, sourceFrame: 40}], panels: [panel, {...panel, startFrame: 15, endFrame: 20},
        {...panel, mediaId: 'other', reveal: 0.5}, {...panel, reveal: 1}]}]}],
  };
}
const timelineFor = (manifest: Manifest) => showcaseTimeline(manifest, line, [{frames: 12, samples: 9600}]);
const expectation: AudienceExpectation = {
  id: 'binding', beatId: 'line1', shotIndex: 0, panelIndex: 0, cue: {index: 1, text: 'result.'},
  media: {id: 'main', sha256: hash}, sourceWindow: {startFrame: 40, endFrameExclusive: 43}, event: 'Declared result',
};

describe('showcase audience correspondence', () => {
  it('uses absolute cue edges, actual anchor interpolation and independent panel selection', () => {
    const manifest = authored();
    const expected = [
      expectation,
      {...expectation, id: 'range', panelIndex: 1, sourceWindow: {startFrame: 19, endFrameExclusive: 20}},
      {...expectation, id: 'override', panelIndex: 2, media: {id: 'other', sha256: overrideHash},
        sourceWindow: {startFrame: 3, endFrameExclusive: 8}},
      {...expectation, id: 'hidden', panelIndex: 3},
    ];
    const result = evaluateAudienceCorrespondence(manifest, timelineFor(manifest), expected, new Map());
    expect(result.expectations.map(item => [item.status, item.captionSourceOverlap])).toEqual([
      ['OVERLAP', [{startFrame: 3, endFrameExclusive: 6}]],
      ['OVERLAP', [{startFrame: 4, endFrameExclusive: 7}]],
      ['OVERLAP', [{startFrame: 6, endFrameExclusive: 7}]],
      ['NO_OVERLAP', []],
    ]);
    expect(result.expectations.every(row => row.speech.status === 'UNVERIFIED')).toBe(true);
    expect(result.unboundActions).toEqual([]);
    expect(result.unboundCues.map(item => [item.cue.index, item.status])).toEqual([[0, 'UNASSESSED'], [2, 'UNASSESSED']]);
  });

  it('reports a cue beginning at the exclusive end of the source-window match as no overlap', () => {
    const manifest = authored();
    const result = evaluateAudienceCorrespondence(manifest, timelineFor(manifest), [
      {...expectation, panelIndex: 1, sourceWindow: {startFrame: 17, endFrameExclusive: 18}},
    ], new Map());
    expect(result.expectations[0]).toMatchObject({
      visibleSourceWindowMatches: [{startFrame: 2, endFrameExclusive: 3}], captionSourceOverlap: [], status: 'NO_OVERLAP',
    });
    expect(result.unboundActions).toEqual([{beatId: 'line1', shotIndex: 0, cueIndex: 1, sourceFrame: 40}]);
  });

  it('rejects stale cue, asset and contradictory source windows', () => {
    const manifest = authored();
    const evaluate = (rows: AudienceExpectation[]) => evaluateAudienceCorrespondence(manifest, timelineFor(manifest), rows, new Map());
    expect(() => evaluate([{...expectation, cue: {index: 1, text: 'changed'}}])).toThrow(/exact current caption cue/);
    expect(() => evaluate([{...expectation, media: {...expectation.media, sha256: overrideHash}}])).toThrow(/stale or different panel media/);
    expect(() => evaluate([{...expectation, sourceWindow: {startFrame: 42, endFrameExclusive: 45}}])).toThrow(/contradicts the authored action/);
    expect(() => evaluate([{...expectation, sourceWindow: {startFrame: 5, endFrameExclusive: 40}}])).toThrow(/panel playback bounds/);
    expect(() => evaluate([{...expectation, panelIndex: 2}])).toThrow(/stale or different panel media/);
    expect(() => evaluate([expectation, {...expectation, id: 'duplicate'}])).toThrow(/duplicates/);
  });

  it('keeps optional exact alignment evidence separate from caption overlap and preserves missing confidence', () => {
    const manifest = authored();
    const timing = {startSeconds: 0.1, endSeconds: 0.2, confidence: 0.93};
    const evidence = (confidence: number | null, reviewRequired: boolean): AudienceSpeechLine => ({
      method: 'forced-alignment', requestBytes: Buffer.alloc(0), reportBytes: Buffer.alloc(0),
      draft: {cues: [{id: 'a', text: 'Show ', sourceTiming: null}, {id: 'b', text: 'result.',
        sourceTiming: {...timing, confidence}, confidence, reviewRequired}]} as AudienceSpeechLine['draft'],
    });
    const evaluate = (item: AudienceSpeechLine) => evaluateAudienceCorrespondence(manifest, timelineFor(manifest), [expectation],
      new Map([['line1', item]])).expectations[0]!;
    expect(evaluate(evidence(0.93, false))).toMatchObject({status: 'OVERLAP', speech: {
      status: 'TIMING_EVIDENCE_OVERLAP', confidences: [0.93], method: 'forced-alignment', intervalSeconds: [0.1, 0.2],
      overlaps: [{startFrame: 3, endFrameExclusive: 6}],
    }});
    expect(evaluate(evidence(null, true))).toMatchObject({status: 'OVERLAP',
      speech: {status: 'UNVERIFIED', confidences: [null], intervalSeconds: null, overlaps: []}});
  });
});

describe('showcase audience input verification', () => {
  it('refuses stale candidate or manifest bytes without publishing or modifying original inputs', async () => {
    const root = await temp();
    const {spec} = await writeShowcaseFixture(join(root, 'source'), [{file: 'image.png', bytes: Buffer.from('fixture bytes'),
      width: 100, height: 100}]);
    const originalSpec = await readFile(spec);
    const movie = join(root, 'movie.mp4'), originalMovie = Buffer.from('synthetic invalid movie');
    await writeFile(movie, originalMovie);
    const base = {kind: 'historical' as const, manifest: {path: spec, sha256: sha256(originalSpec)}, candidate: {path: movie, sha256: hash}};
    const scratch = join(root, 'scratch');
    await mkdir(scratch);
    await expect(loadAudienceSource(base, root, scratch, signal)).rejects.toThrow(/Candidate SHA-256 differs/);
    await expect(loadAudienceSource({...base, manifest: {...base.manifest, sha256: hash}}, root, scratch, signal))
      .rejects.toThrow(/Historical manifest SHA-256 differs/);
    expect(await readFile(spec)).toEqual(originalSpec);
    expect(await readFile(movie)).toEqual(originalMovie);
  });

  it('refuses duplicate or oversized samples and refuses an existing destination before source I/O', async () => {
    const root = await temp();
    const requestFile = join(root, 'request.json'), existing = join(root, 'existing');
    const request = {schemaVersion: 'showcase-audience-audit-request/1.0',
      source: {kind: 'checkpoint', data: 'missing', taskId: hash, candidateSha256: hash}, sampleFrames: [0]};
    expect(AudienceAuditRequest.safeParse({...request, sampleFrames: [1, 1]}).success).toBe(false);
    expect(AudienceAuditRequest.safeParse({...request, sampleFrames: Array.from({length: 17}, (_, i) => i)}).success).toBe(false);
    expect(AudienceAuditRequest.safeParse({...request, clips: [{startFrame: 1, endFrameExclusive: 122}]}).success).toBe(false);
    await writeFile(requestFile, canonical(request));
    await mkdir(existing);
    await expect(showcaseAudienceAudit(requestFile, join(root, 'missing', 'new-output'), signal))
      .rejects.toThrow(/output and checkpoint state overlap/);
    await expect(showcaseAudienceAudit(requestFile, existing, signal)).rejects.toThrow(/destination already exists/);
  });

  it('binds saved speech timing to the original request, approval, WAV and transcript', async () => {
    const root = await temp();
    const wav = tone(), manifest = authored(), text = line[0]![1];
    manifest.narration[0]!.sha256 = sha256(wav);
    const input = {
      schemaVersion: 'speech-alignment-request/1.0', locale: 'en', transcript: text, transcriptSha256: sha256(text),
      audio: {sha256: sha256(wav), bytes: wav.length},
      approval: {kind: 'showcase-script-approval', sha256: manifest.approval.sha256, scriptSha256: manifest.script.sha256, lineId: 'line1'},
      phrases: [{id: 'phrase', text}], intentionalPauses: [], actionAnchors: [],
      settings: {silenceThresholdDbfs: -45, minimumSilenceSeconds: 0.2, longPauseSeconds: 0.6, minimumConfidence: 0.65},
    };
    const report = {
      schemaVersion: 'speech-alignment-report/1.0', status: 'AUDIO_DIAGNOSTICS_ONLY', renderable: false,
      review: {speechContent: 'UNVERIFIED', timing: 'UNVERIFIED', naturalness: 'UNVERIFIED', ownerAcceptance: 'pending'},
      binding: {requestSha256: sha256(canonical(input)), transcriptSha256: input.transcriptSha256, audio: input.audio,
        approval: input.approval, locale: input.locale},
      adapter: {kind: 'unavailable'}, audio: {durationSeconds: 0.4}, settings: input.settings,
      phrases: [{...input.phrases[0], timing: null}],
    };
    const files = {request: {path: 'alignment-request.json', sha256: sha256(canonical(input))},
      report: {path: 'alignment-report.json', sha256: sha256(canonical(report))}};
    await writeFile(join(root, files.request.path), canonical(input));
    await writeFile(join(root, files.report.path), canonical(report));
    const load = () => loadAudienceSpeech([{lineId: 'line1', ...files}], root, manifest, new Map([['line.wav', wav]]), timelineFor(manifest));
    expect((await load()).get('line1')).toMatchObject({method: null, draft: {review: {timing: 'UNVERIFIED'}}});
    manifest.approval.sha256 = overrideHash;
    await expect(load()).rejects.toThrow(/exact approved WAV and transcript/);
    manifest.approval.sha256 = hash;
    await writeFile(join(root, files.report.path), canonical({...report, status: 'PROPOSED_UNREVIEWED'}));
    await expect(load()).rejects.toThrow(/Saved speech request or report bytes differ/);
  });
});

