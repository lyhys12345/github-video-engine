import {describe, expect, it} from 'vitest';
import {sha256} from '../src/core/util.js';
import {buildSpeechCaptionTimingDraft} from '../src/speech-alignment/caption-draft.js';
import {inspectSpeechAlignment} from '../src/speech-alignment/report.js';

function makeWav() {
  const sampleRate = 8_000;
  const frameCount = sampleRate * 4;
  const bytes = Buffer.alloc(44 + frameCount * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(frameCount * 2, 40);
  for (let frame = 0; frame < frameCount; frame++) {
    const seconds = frame / sampleRate;
    if (seconds >= 0.25 && seconds < 0.75 || seconds >= 1.5 && seconds < 2 || seconds >= 2.75 && seconds < 3.75) {
      bytes.writeInt16LE(frame % 16 < 8 ? 8000 : -8000, 44 + frame * 2);
    }
  }
  return bytes;
}

const json = (value: unknown) => Buffer.from(JSON.stringify(value));
const transcript = 'Keep this. Say every word.';
const audio = makeWav();
const approval = json({schemaVersion: 'speech-transcript-approval/1.0', status: 'approved',
  transcript, transcriptSha256: sha256(transcript), authority: 'Integration fixture'});
const request = {
  schemaVersion: 'speech-alignment-request/1.0', locale: 'en-US', transcript, transcriptSha256: sha256(transcript),
  approval: {kind: 'transcript-approval', sha256: sha256(approval)}, audio: {sha256: sha256(audio), bytes: audio.length},
  phrases: [{id: 'first', text: 'Keep this. '}, {id: 'second', text: 'Say every word.'}],
  intentionalPauses: [{id: 'beat', startSeconds: 0.75, endSeconds: 1.5, reason: 'Narrative beat'}],
  actionAnchors: [
    {id: 'action', target: {kind: 'phrase', phraseId: 'first'}, expectedSeconds: 0.1, toleranceSeconds: 0.1},
    {id: 'other-action', target: {kind: 'word', wordIndex: 3}, expectedSeconds: 1.9},
  ],
};
const timing = {
  schemaVersion: 'speech-timing-evidence/1.0',
  transcriptSha256: request.transcriptSha256, audioSha256: request.audio.sha256, locale: request.locale,
  provider: 'fixture recognition engine', providerVersion: '1.0', model: 'fixture', method: 'recognition',
  confidenceMeaning: 'Fixture scores',
  phrases: [
    {text: 'keep this', confidence: 0.83, startSeconds: 0.25, endSeconds: 0.75, words: [
      {text: 'keep', startSeconds: 0.3, endSeconds: 0.5, confidence: 0.9},
      {text: 'this', startSeconds: 0.5, endSeconds: 0.7, confidence: 0.45},
    ]},
    {text: 'say word', confidence: 0.7, startSeconds: 1.5, endSeconds: 3.4, words: [
      {text: 'say', startSeconds: 1.5, endSeconds: 1.9, confidence: 0.9},
      {text: 'word', startSeconds: 3, endSeconds: 3.4, confidence: 0.8},
    ]},
  ],
};

describe('speech alignment quality reports', () => {
  const run = (overrides: Partial<Parameters<typeof inspectSpeechAlignment>[0]> = {}) =>
    inspectSpeechAlignment({request, approval, audio, signal: AbortSignal.timeout(10_000), ...overrides});

  it('measures silence in the actual WAV, preserves approved pauses, and leaves missing timing unverified', async () => {
    const report = await run();
    expect(report.status).toBe('AUDIO_DIAGNOSTICS_ONLY');
    expect(report.review).toEqual({speechContent: 'UNVERIFIED', timing: 'UNVERIFIED', naturalness: 'UNVERIFIED', ownerAcceptance: 'pending'});
    expect(report.audio.durationSeconds).toBe(4);
    expect(report.audio.ffmpegVersion).toMatch(/^ffmpeg version/i);
    expect(report.audio.silence).toEqual([
      {kind: 'leading', startSeconds: 0, endSeconds: 0.25, durationSeconds: 0.25, intentionalPauseId: null},
      {kind: 'internal', startSeconds: 0.75, endSeconds: 1.5, durationSeconds: 0.75, intentionalPauseId: 'beat'},
      {kind: 'internal', startSeconds: 2, endSeconds: 2.75, durationSeconds: 0.75, intentionalPauseId: null},
      {kind: 'trailing', startSeconds: 3.75, endSeconds: 4, durationSeconds: 0.25, intentionalPauseId: null},
    ]);
    expect(report.findings.filter(finding => finding.kind === 'long-internal-pause')).toEqual([
      {kind: 'long-internal-pause', startSeconds: 2, endSeconds: 2.75, durationSeconds: 0.75, review: 'required'},
    ]);
    expect(report.words.every(word => word.timing === null && word.recognition === 'unavailable')).toBe(true);
    expect(report.actionAnchors.every(anchor => anchor.status === 'UNAVAILABLE')).toBe(true);
    expect(report.findings.some(finding => finding.kind === 'possible-missing-word')).toBe(false);
    expect(sha256(audio)).toBe(request.audio.sha256);
  });

  it('binds imported recognition evidence and flags low confidence, candidate omissions and action offsets', async () => {
    const evidence = json(timing);
    const report = await run({timingEvidence: evidence});
    expect(report.adapter).toMatchObject({kind: 'imported-local', evidenceSha256: sha256(evidence), model: 'fixture'});
    expect(report.status).toBe('PROPOSED_UNREVIEWED');
    expect(report.phrases[0]?.timing).toEqual({startSeconds: 0.3, endSeconds: 0.7, confidence: 0.45});
    expect(report.phrases[1]?.timing).toBeNull();
    expect(report.findings).toContainEqual({kind: 'possible-missing-word', wordIndex: 3, text: 'every', recognition: 'unmatched', review: 'required'});
    expect(report.findings).toContainEqual({kind: 'low-confidence-word-timing', wordIndex: 1, text: 'this', confidence: 0.45, reason: 'provider-confidence', review: 'required'});
    expect(report.actionAnchors[0]).toMatchObject({offsetSeconds: 0.2, status: 'OFFSET_EXCEEDS_TOLERANCE', confidenceStatus: 'LOW'});
    expect(report.actionAnchors[1]).toMatchObject({observedSeconds: null, status: 'UNAVAILABLE'});

    const clock = {audioSha256: request.audio.sha256, audioStartFrame: 30, fps: 30};
    const draft = buildSpeechCaptionTimingDraft(report, request.phrases, clock);
    expect(draft).toMatchObject({renderable: false, status: 'PROPOSED_UNREVIEWED', binding: report.binding,
      cues: [{id: 'first', startFrame: 39, endFrame: 51, reviewRequired: true}, {id: 'second', startFrame: null, endFrame: null, reviewRequired: true}]});
    expect(() => buildSpeechCaptionTimingDraft(report, [{id: 'first', text: 'Keep this.'}], clock)).toThrow(/exact approved phrases/);
  });

  it('avoids guessing word cuts inside a multi-word backend span', async () => {
    const chinese = '小松鼠吃了坚果。';
    const signed = json({schemaVersion: 'speech-transcript-approval/1.0', status: 'approved',
      transcript: chinese, transcriptSha256: sha256(chinese), authority: 'Integration fixture'});
    const aligned = await run({approval: signed, request: {...request, transcript: chinese, transcriptSha256: sha256(chinese),
      locale: 'zh-CN', approval: {...request.approval, sha256: sha256(signed)}, phrases: [{id: 'one', text: chinese}], actionAnchors: []},
    timingEvidence: json({...timing, locale: 'zh-CN', transcriptSha256: sha256(chinese), method: 'forced-alignment',
      phrases: [{text: '小松鼠吃了坚果', startSeconds: 1, endSeconds: 3, confidence: null,
        words: [{text: '小松鼠吃了坚果', startSeconds: 1, endSeconds: 3, confidence: null}]}]})});
    expect(aligned.words.length).toBeGreaterThan(1);
    expect(aligned.words.every(word => word.recognition === 'matched' && word.timing === null)).toBe(true);
    expect(aligned.phrases[0]?.timing).toEqual({startSeconds: 1, endSeconds: 3, confidence: null});
    expect(aligned.findings.some(finding => finding.kind === 'possible-missing-word')).toBe(false);
  });

  it('reports complete silence when FFmpeg closes the interval at end of file', async () => {
    const empty = Buffer.from(audio);
    empty.fill(0, 44);
    const report = await run({audio: empty, request: {...request, audio: {sha256: sha256(empty), bytes: empty.length}}});
    expect(report.audio.silence).toEqual([
      {kind: 'entire', startSeconds: 0, endSeconds: 4, durationSeconds: 4, intentionalPauseId: null},
    ]);
    expect(report.findings).toContainEqual({kind: 'entire-recording-silence', startSeconds: 0, endSeconds: 4, durationSeconds: 4, review: 'required'});
  });

  it('rejects wrong audio, approval, transcript partitions, timing evidence, and overlapping backend ranges', async () => {
    await expect(run({audio: Buffer.alloc(audio.length)})).rejects.toThrow(/WAV hash/);
    await expect(run({approval: Buffer.concat([approval, Buffer.from(' ')] )})).rejects.toThrow(/receipt hash/);
    await expect(run({request: {...request, phrases: [{id: 'first', text: 'Kee'}, {id: 'second', text: transcript.slice(3)}]}}))
      .rejects.toThrow(/preserve word boundaries/);
    await expect(run({timingEvidence: json({...timing, audioSha256: '0'.repeat(64)})})).rejects.toThrow(/differs from the exact/);
    const phases = structuredClone(timing.phrases);
    phases[1]!.startSeconds = 0.5;
    await expect(run({timingEvidence: json({...timing, phrases: phases})})).rejects.toThrow(/phrases overlap/);
  });

  it('accepts only the exact line from a hash-bound existing showcase approval', async () => {
    const script = json({lines: [['first', transcript]], shots: []});
    const showcaseApproval = json({schemaVersion: 'script-owner-authorization/1.0', scriptSha256: sha256(script), authority: 'Fixture'});
    const showcaseRequest = {...request, approval: {kind: 'showcase-script-approval', sha256: sha256(showcaseApproval),
      scriptSha256: sha256(script), lineId: 'first'}};
    expect((await run({request: showcaseRequest, approval: showcaseApproval, script})).binding.approval).toEqual(showcaseRequest.approval);
    await expect(run({request: showcaseRequest, approval: showcaseApproval})).rejects.toThrow(/exact approved script file/);
    await expect(run({request: {...showcaseRequest, approval: {...showcaseRequest.approval, lineId: 'unknown'}},
      approval: showcaseApproval, script})).rejects.toThrow(/does not contain the exact transcript/);
  });
});
