import {expect, it} from 'vitest';
import {candidateReviewDecision} from '../src/workflow/candidate-review.js';

const original = 'a'.repeat(64);
const revised = 'b'.repeat(64);
const script = {
  schemaVersion: 'candidate-review/1.0',
  candidateSha256: original,
  stage: 'script',
  coverage: 'script',
  reviewer: 'independent-script-review',
  verdict: 'PASS',
  findings: [],
};

it('does not release script or video with unresolved findings even when labelled PASS', () => {
  for (const stage of ['script', 'video'] as const) {
    const report = {...script, stage, coverage: stage === 'script' ? 'script' : 'complete-av',
      ownerApprovedSha256: original, findings: ['The claimed input/output pair has no supporting evidence.']};
    expect(candidateReviewDecision(report, original, stage)).toEqual({
      status: 'revise-and-resubmit', findings: report.findings,
    });
  }
  expect(candidateReviewDecision({...script, coverage: 'partial-av', findings: ['Cannot hear audio']}, original, 'script').status).toBe('unverified');
});

it('requires both review and owner approval of the same script bytes', () => {
  expect(candidateReviewDecision(script, original, 'script').status).toBe('awaiting-owner-approval');
  const approved = {...script, ownerApprovedSha256: original};
  expect(candidateReviewDecision(approved, original, 'script').status).toBe('passed');
  expect(() => candidateReviewDecision(approved, revised, 'script')).toThrow('another candidate');
});

it('returns specific findings for revision and accepts a separately reviewed replacement', () => {
  const decision = candidateReviewDecision({...script, verdict: 'REVISE', findings: ['Shorten the opening']}, original, 'script');
  expect(decision).toEqual({status: 'revise-and-resubmit', findings: ['Shorten the opening']});
  expect(candidateReviewDecision({...script, candidateSha256: revised, ownerApprovedSha256: revised}, revised, 'script').status).toBe('passed');
});

it('requires complete audiovisual coverage to pass a rendered candidate', () => {
  const video = {...script, stage: 'video', coverage: 'partial-av'};
  expect(candidateReviewDecision(video, original, 'video').status).toBe('unverified');
  expect(candidateReviewDecision({...video, coverage: 'complete-av'}, original, 'video').status).toBe('passed');
  expect(() => candidateReviewDecision(video, original, 'script')).toThrow('another candidate or stage');
});
