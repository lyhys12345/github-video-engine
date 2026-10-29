import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const parse = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));

// This gate checks completeness/version/rules, not the truth of an LLM's opinion.
export function evaluateGate({candidate, candidateHash, rules, reports, changedFiles = [], evidenceExists = () => true}) {
  const blocking = [], unverified = [];
  const roles = ['product', 'reliability', 'evidence'];
  if (candidate.milestone !== rules.milestone) unverified.push('Contract rules do not match the milestone');
  if (changedFiles.length) unverified.push(`Candidate changed: ${changedFiles.join(', ')}`);
  for (const role of roles) {
    if (!Array.isArray(rules.requiredCriteria?.[role]) || !rules.requiredCriteria[role].length) unverified.push(`${role}: missing required-criteria policy`);
    const report = reports[role];
    if (!report) { unverified.push(`Missing ${role} report`); continue; }
    if (report.role !== role || report.candidateId !== candidate.id || report.candidateSha256?.toLowerCase() !== candidateHash) unverified.push(`${role}: role or candidate version mismatch`);
    if (!['PASS', 'FAIL', 'UNVERIFIED'].includes(report.verdict)) unverified.push(`${role}: invalid verdict`);
    if (report.verdict === 'FAIL') blocking.push(`${role}: FAIL`);
    if (report.verdict === 'UNVERIFIED') unverified.push(`${role}: UNVERIFIED`);
    if (!Array.isArray(report.criteria) || !Array.isArray(report.findings) || !Array.isArray(report.executed) || !Array.isArray(report.limitations)) { unverified.push(`${role}: incomplete report structure`); continue; }
    if (!report.executed.length) unverified.push(`${role}: no independent execution record`);
    for (const execution of report.executed) if (typeof execution.command !== 'string' || !Number.isInteger(execution.exitCode) || !execution.evidencePath || !evidenceExists(execution.evidencePath)) unverified.push(`${role}: incomplete/missing execution evidence`);
    for (const id of rules.requiredCriteria?.[role] ?? []) {
      const matches = report.criteria.filter((criterion) => criterion.id === id);
      if (matches.length !== 1) { unverified.push(`${role}: missing or duplicated ${id}`); continue; }
      const criterion = matches[0];
      if (criterion.status === 'FAIL') blocking.push(`${role}: ${id} failed`);
      else if (criterion.status !== 'PASS') unverified.push(`${role}: ${id} not verified`);
      if (!Array.isArray(criterion.evidence) || !criterion.evidence.length || criterion.evidence.some((p) => !evidenceExists(p))) unverified.push(`${role}: ${id} lacks accessible evidence`);
    }
    for (const finding of report.findings) {
      if (!['blocker', 'major', 'minor'].includes(finding.severity)) unverified.push(`${role}: invalid finding severity`);
      if (finding.severity === 'blocker' || finding.severity === 'major') blocking.push(`${role}: ${finding.id ?? 'unnamed'} ${finding.severity}`);
    }
  }
  return {candidateId: candidate.id, milestone: candidate.milestone, verdict: blocking.length ? 'FAIL' : unverified.length ? 'UNVERIFIED' : 'PASS', blocking, unverified,
    judges: Object.fromEntries(roles.map((role) => [role, reports[role]?.verdict ?? 'MISSING'])), humanFinalAcceptance: 'separate; never implied by this gate'};
}

export function checkGate(candidatePath, rulesPath) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const candidate = parse(candidatePath), rules = parse(rulesPath), reports = {};
  const changedFiles = [];
  for (const file of candidate.files) {
    const path = resolve(repo, file.path), rel = relative(repo, path);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`) || !existsSync(path) || hash(readFileSync(path)) !== file.sha256) changedFiles.push(file.path);
  }
  for (const role of ['product', 'reliability', 'evidence']) {
    const path = resolve(dirname(candidatePath), `${role}.json`);
    if (existsSync(path)) { try { reports[role] = parse(path); } catch { /* Invalid JSON is a missing report, never approval. */ } }
  }
  return evaluateGate({candidate, candidateHash: hash(readFileSync(candidatePath)), rules, reports, changedFiles,
    evidenceExists: (path) => {
      if (typeof path !== 'string') return false;
      const file = path.replace(/:\d+(?::\d+)?$/, '');
      return existsSync(isAbsolute(file) ? file : resolve(repo, file));
    }});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [candidate, rules] = process.argv.slice(2);
    if (!candidate || !rules) throw new Error('Usage: node reviews/check-gate.mjs <candidate.json> <gate.json>');
    const result = checkGate(resolve(candidate), resolve(rules)); console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.verdict === 'PASS' ? 0 : result.verdict === 'FAIL' ? 1 : 2;
  } catch (error) { console.error(JSON.stringify({verdict: 'UNVERIFIED', error: String(error)})); process.exitCode = 2; }
}
