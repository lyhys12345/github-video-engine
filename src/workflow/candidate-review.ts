import {z} from 'zod';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {boundedFile} from '../story-planner/runtime.js';
import {Hash} from '../contracts/video.js';
import {EngineError} from '../core/errors.js';

const Report = z.strictObject({
  schemaVersion: z.literal('candidate-review/1.0'),
  candidateSha256: Hash,
  stage: z.enum(['script', 'video']),
  reviewer: z.string().trim().min(1),
  verdict: z.enum(['PASS', 'REVISE', 'UNVERIFIED']),
  coverage: z.enum(['script', 'complete-av', 'partial-av']),
  findings: z.array(z.string().trim().min(1)).max(100),
  ownerApprovedSha256: Hash.optional(),
});

export const NarrativeRunApproval = z.strictObject({
  authorSha256: Hash,
  briefSha256: Hash.nullable(),
  report: Report,
}).refine(value => candidateReviewDecision(value.report, value.authorSha256, 'script').status === 'passed',
  'Expected a passing script review bound to the exact author snapshot.');

export function candidateReviewDecision(raw: unknown, candidateSha256: string, stage: 'script'|'video') {
  const report = Report.parse(raw);
  if (report.candidateSha256 !== candidateSha256 || report.stage !== stage) {
    throw new EngineError('REVIEW_MISMATCH', 'Review belongs to another candidate or stage.');
  }
  if (report.verdict === 'REVISE') {
    if (!report.findings.length) throw new EngineError('REVIEW_FINDINGS_REQUIRED', 'Revision requires actionable findings.');
    return {status: 'revise-and-resubmit', findings: report.findings} as const;
  }
  const requiredCoverage = stage === 'script' ? 'script' : 'complete-av';
  if (report.verdict === 'UNVERIFIED' || report.coverage !== requiredCoverage) {
    return {status: 'unverified', findings: report.findings} as const;
  }
  // A PASS label cannot waive unresolved findings. Keep the raw report intact.
  if (report.findings.length) {
    return {status: 'revise-and-resubmit', findings: report.findings} as const;
  }
  if (stage === 'script' && report.ownerApprovedSha256 !== candidateSha256) {
    return {status: 'awaiting-owner-approval', findings: report.findings} as const;
  }
  return {status: 'passed', findings: report.findings} as const;
}

export async function videoReviewCommand(pos: string[], values: Record<string, unknown>, signal: AbortSignal) {
  if (pos.length !== 2 || typeof values.review !== 'string' || typeof values.spec !== 'string' ||
      Object.entries(values).some(([key, value]) => value !== undefined && key !== 'review' && key !== 'spec')) {
    throw new EngineError('USAGE', 'explanation video-review --spec <candidate MP4> --review <report JSON>');
  }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(values.spec, {signal})) hash.update(chunk);
  const candidateSha256 = hash.digest('hex');
  const report: unknown = JSON.parse((await boundedFile(values.review, 1_000_000)).toString('utf8').replace(/^\uFEFF/u, ''));
  return {candidateSha256, ...candidateReviewDecision(report, candidateSha256, 'video')};
}
