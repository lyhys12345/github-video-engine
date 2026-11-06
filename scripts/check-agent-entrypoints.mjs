// Filesystem compatibility only. Never starts a model or executes target code.
import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checked = [];
async function localFile(relative) {
  const full = await realpath(path.resolve(root, relative));
  const inside = path.relative(root, full);
  if (inside.startsWith('..') || path.isAbsolute(inside) || !(await stat(full)).isFile()) {
    throw Error(`Entry reference must be a regular file inside this checkout: ${relative}`);
  }
  checked.push(relative.replaceAll('\\', '/'));
  return readFile(full, 'utf8');
}
function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) throw Error(message);
}
const canonicalPath = '.agents/skills/github-explainer/SKILL.md';
const wrapperPath = '.claude/skills/github-explainer/SKILL.md';
const canonical = await localFile(canonicalPath);
const wrapper = await localFile(wrapperPath);
for (const [name, text] of [[canonicalPath, canonical], [wrapperPath, wrapper]]) {
  requireMatch(text, /^---\r?\n[\s\S]*?\r?\n---/, `Missing skill frontmatter: ${name}`);
  requireMatch(text, /^name: github-explainer\r?$/m, `Wrong skill name: ${name}`);
  requireMatch(text, /^description: .+$/m, `Missing discovery description: ${name}`);
}
if (/^disable-model-invocation:\s*true\s*$/m.test(wrapper) || /^allowed-tools:/m.test(wrapper) || /^context:\s*fork\s*$/m.test(wrapper)) {
  throw Error('Claude wrapper must retain ordinary discovery and permissions without a fork or tool pre-approval');
}
const route = wrapper.match(/\[shared workflow\]\(([^)]+)\)/)?.[1];
if (!route || path.resolve(root, path.dirname(wrapperPath), route) !== path.resolve(root, canonicalPath)) {
  throw Error('Claude skill must route to the canonical workflow');
}
const memory = await localFile('CLAUDE.md');
requireMatch(memory, /^@AGENTS\.md\s*$/m, 'CLAUDE.md must import shared project instructions');
await localFile('AGENTS.md');
requireMatch(memory, /\.claude\/skills\/github-explainer\/SKILL\.md/, 'Missing Claude skill route');
for (const match of canonical.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
  const link = match[1];
  if (/^[a-z]+:/i.test(link)) continue;
  await localFile(path.relative(root, path.resolve(root, path.dirname(canonicalPath), link)));
}
console.log(JSON.stringify({schemaVersion: 'agent-entrypoint-check/1.0', status: 'pass', checked: [...new Set(checked)], modelCalls: 0, targetCodeExecuted: false, limitation: 'Static local paths/frontmatter only; Claude CLI discovery, instruction loading, authentication, model use and media execution are unverified.'}, null, 2));
