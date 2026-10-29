import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const CORE = ['product', 'reliability', 'evidence'];
const ROLES = [...CORE, 'video_quality', 'content_facts', 'security'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const parse = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));

export function evaluateGateV2({candidate, candidateHash, rules, reports, changedFiles = [], evidenceExists = () => true}) {
  const blocking = [], unverified = [];
  const roles = Array.isArray(rules.activeRoles) ? rules.activeRoles : [];
  if (rules.schemaVersion !== '2.0' || rules.milestone !== candidate.milestone) unverified.push('Invalid policy version or milestone');
  if (!roles.length || new Set(roles).size !== roles.length || roles.some((r) => !ROLES.includes(r)) || CORE.some((r) => !roles.includes(r))) unverified.push('Active roles must be unique known roles and include all core judges');
  for (const role of Object.keys(rules.requiredCriteria ?? {})) if (!roles.includes(role)) unverified.push(`${role}: required criteria assigned to an inactive role`);
  if (changedFiles.length) unverified.push(`Candidate changed: ${changedFiles.join(', ')}`);
  for (const role of new Set(roles)) {
    const ids = rules.requiredCriteria?.[role];
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) { unverified.push(`${role}: missing/duplicate required criteria`); continue; }
    const report = reports[role];
    if (!report) { unverified.push(`Missing ${role} report`); continue; }
    if (report.role !== role || report.candidateId !== candidate.id || report.candidateSha256?.toLowerCase() !== candidateHash) unverified.push(`${role}: role/candidate mismatch`);
    if (report.verdict === 'FAIL') blocking.push(`${role}: FAIL`);
    else if (report.verdict !== 'PASS') unverified.push(`${role}: not verified`);
    if (!Array.isArray(report.criteria) || !Array.isArray(report.findings) || !Array.isArray(report.executed) || !Array.isArray(report.limitations)) { unverified.push(`${role}: incomplete report`); continue; }
    if (!report.executed.length || report.executed.some((e) => typeof e.command !== 'string' || !Number.isInteger(e.exitCode) || !evidenceExists(e.evidencePath))) unverified.push(`${role}: missing independent execution evidence`);
    for (const id of ids) {
      const matches = report.criteria.filter((c) => c.id === id);
      if (matches.length !== 1) { unverified.push(`${role}: missing/duplicate ${id}`); continue; }
      const criterion = matches[0];
      if (criterion.status === 'FAIL') blocking.push(`${role}: ${id} failed`);
      else if (criterion.status !== 'PASS') unverified.push(`${role}: ${id} unverified`);
      if (!Array.isArray(criterion.evidence) || !criterion.evidence.length || criterion.evidence.some((p) => !evidenceExists(p))) unverified.push(`${role}: ${id} lacks evidence`);
    }
    for (const finding of report.findings) {
      if (!['minor', 'major', 'blocker'].includes(finding.severity)) unverified.push(`${role}: invalid severity`);
      if (finding.severity === 'major' || finding.severity === 'blocker') blocking.push(`${role}: ${finding.id ?? 'finding'} ${finding.severity}`);
    }
  }
  return {milestone: candidate.milestone, candidateId: candidate.id, activeRoles: roles, verdict: blocking.length ? 'FAIL' : unverified.length ? 'UNVERIFIED' : 'PASS', blocking, unverified, judges: Object.fromEntries(roles.map((r) => [r, reports[r]?.verdict ?? 'MISSING'])), humanFinalAcceptance: 'separate; never implied'};
}
export function checkGateV2(candidatePath, rulesPath, repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')) {
  const candidate = parse(candidatePath), rules = parse(rulesPath), reports = {}, changedFiles = [];
  if (!Array.isArray(candidate.files) || !candidate.files.length) throw new Error('Candidate has no frozen files');
  // Bind activation/rules to the same snapshot: hiding a failing specialist changes the candidate.
  const rulesRel = relative(repo, rulesPath).replaceAll('\\', '/');
  if (!candidate.files.some((f) => f.path === rulesRel && f.sha256 === hash(readFileSync(rulesPath)))) changedFiles.push('unbound activation policy');
  for (const file of candidate.files) {
    const path = resolve(repo, file.path), rel = relative(repo, path);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`) || !existsSync(path) || hash(readFileSync(path)) !== file.sha256) changedFiles.push(file.path);
  }
  for (const role of Array.isArray(rules.activeRoles) ? rules.activeRoles.filter((r) => ROLES.includes(r)) : []) {
    const path = resolve(dirname(candidatePath), `${role}.json`);
    if (existsSync(path)) { try { reports[role] = parse(path); } catch { /* Invalid is never approval. */ } }
  }
  return evaluateGateV2({candidate, candidateHash: hash(readFileSync(candidatePath)), rules, reports, changedFiles,
    evidenceExists: (path) => typeof path === 'string' && !!path && existsSync(isAbsolute(path.replace(/:\d+(?::\d+)?$/, '')) ? path.replace(/:\d+(?::\d+)?$/, '') : resolve(repo, path.replace(/:\d+(?::\d+)?$/, '')))});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [candidate, rules] = process.argv.slice(2);
    if (!candidate || !rules) throw new Error('Usage: node reviews/check-gate-v2.mjs <candidate.json> <gate.json>');
    const result = checkGateV2(resolve(candidate), resolve(rules)); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.verdict === 'PASS' ? 0 : result.verdict === 'FAIL' ? 1 : 2;
  } catch (error) { console.error(JSON.stringify({verdict: 'UNVERIFIED', error: String(error)})); process.exitCode = 2; }
}
