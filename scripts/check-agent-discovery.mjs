// Metadata only: never starts a turn, executes a tool, or sends a user message.
import {spawn, execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = process.platform === 'win32' ? 'codex.exe' : 'codex';
const version = execFileSync(cli, ['--version'], {encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']}).trim();
if (!/^codex-cli \S+$/.test(version)) throw Error('Expected the installed official Codex CLI.');
const child = spawn(cli, ['app-server', '--listen', 'stdio://', '-c', 'analytics.enabled=false', '-c', 'mcp_servers={}'], {cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']});
child.stderr.resume(); // Do not persist account/auth diagnostics.
const lines = createInterface({input: child.stdout});
const sent = [];
const send = (method, params, id) => {
  if (!['initialize', 'initialized', 'skills/list'].includes(method)) throw Error('Denied metadata RPC.');
  sent.push(method);
  child.stdin.write(JSON.stringify({method, params, ...(id == null ? {} : {id})}) + '\n');
};
const find = value => !value || typeof value !== 'object' ? [] : [...(value.name === 'github-explainer' ? [value] : []), ...Object.values(value).flatMap(find)];
let timer;
try {
  const result = await new Promise((done, reject) => {
    timer = setTimeout(() => reject(Error('Local Codex metadata timeout.')), 30000);
    child.once('error', reject);
    child.once('exit', code => reject(Error('Local app-server exited ' + code)));
    lines.on('line', line => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.error) { reject(Error(JSON.stringify(message.error))); return; }
      if (message.id === 1) {
        send('initialized', {});
        send('skills/list', {cwds: [cwd], forceReload: true}, 2);
      } else if (message.id === 2) done(find(message.result));
      else if (message.id != null && message.method) reject(Error('Probe refuses callback: ' + message.method));
    });
    send('initialize', {clientInfo: {name: 'gve_skill_discovery_check', version: '1.0'}}, 1);
  });
  console.log(JSON.stringify({version, cwd, discovered: result, methodsSent: sent, modelTurnsStarted: 0, limitation: 'Real metadata discovery only; model skill selection and conversation recovery are not tested.'}, null, 2));
  if (!result.some(skill => skill.enabled && skill.scope === 'repo')) process.exitCode = 1;
} finally {
  clearTimeout(timer);
  lines.close();
  child.stdin.end();
  let shutdown;
  await Promise.race([new Promise(done => child.once('exit', done)), new Promise(done => { shutdown = setTimeout(done, 3000); })]);
  clearTimeout(shutdown);
  if (child.exitCode == null) child.kill();
}
