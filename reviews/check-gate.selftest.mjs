import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGate} from './check-gate.mjs';
const make = () => {
  const candidate = {id: 'candidate', milestone: 'M0'};
  const rules = {milestone: 'M0', requiredCriteria: {product: ['A'], reliability: ['B'], evidence: ['C']}};
  const reports = Object.fromEntries(Object.entries(rules.requiredCriteria).map(([role, ids]) => [role, {role, candidateId: candidate.id, candidateSha256: 'hash', verdict: 'PASS', criteria: ids.map((id) => ({id, status: 'PASS', evidence: ['proof']})), findings: [], executed: [{command: 'independent check', exitCode: 0, evidencePath: 'proof'}], limitations: []}]));
  return {candidate, candidateHash: 'hash', rules, reports};
};
test('passes only when all role/criterion checks pass', () => assert.equal(evaluateGate(make()).verdict, 'PASS'));
test('two PASS votes cannot override one failing judge', () => { const x = make(); x.reports.reliability.verdict = 'FAIL'; assert.equal(evaluateGate(x).verdict, 'FAIL'); });
test('a major blocks even when the report incorrectly says PASS', () => { const x = make(); x.reports.product.findings.push({id: 'P1', severity: 'major'}); assert.equal(evaluateGate(x).verdict, 'FAIL'); });
test('missing judge and missing criterion are not approval', () => { const x = make(); delete x.reports.evidence; assert.equal(evaluateGate(x).verdict, 'UNVERIFIED'); const y = make(); y.reports.product.criteria = []; assert.equal(evaluateGate(y).verdict, 'UNVERIFIED'); });
test('stale candidate reports and changed candidate files are not approval', () => { const x = make(); x.reports.product.candidateSha256 = 'old'; assert.equal(evaluateGate(x).verdict, 'UNVERIFIED'); assert.equal(evaluateGate({...make(), changedFiles: ['src/file.ts']}).verdict, 'UNVERIFIED'); });
test('inaccessible evidence and unverified criteria are not approval', () => { assert.equal(evaluateGate({...make(), evidenceExists: () => false}).verdict, 'UNVERIFIED'); const x = make(); x.reports.product.criteria[0].status = 'UNVERIFIED'; assert.equal(evaluateGate(x).verdict, 'UNVERIFIED'); });
test('a missing required-criteria policy cannot silently disable a role', () => { const x = make(); delete x.rules.requiredCriteria.product; assert.equal(evaluateGate(x).verdict, 'UNVERIFIED'); });
