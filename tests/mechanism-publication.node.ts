import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {test} from 'node:test';
import {prepareReaRulePilot} from '../examples/story-planner-v1/rea-rule-pilot.js';

test('XML closure, existing outputs and native publication path safety', {skip: process.platform !== 'win32'}, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gve-publication-'));
  try {
    const state = join(dir, 'state');
    const plan = await prepareReaRulePilot(process.cwd(), state, join(dir, 'story'));
    const input = join(dir, 'plan.json');
    const preview = resolve('scripts/mechanism-preview.ts');
    const prepare = resolve('scripts/prepare-rea-rule-pilot.ts');
    const cli = (script: string, ...args: string[]) => spawnSync(process.execPath,
      [...process.execArgv, script, ...args], {encoding: 'utf8', windowsHide: true});
    const foreign = join(dir, 'foreign');
    const link = join(dir, 'link');
    await mkdir(foreign);
    await writeFile(join(foreign, 'sentinel'), 'preserve');
    await symlink(foreign, link, 'junction');
    for (const character of ['\uFFFE', '\uFFFF', '\u0000', '\uD800']) {
      await writeFile(input, JSON.stringify({...plan, state: {...plan.state, unit: 'Speed ' + character}}));
      const output = join(dir, 'bad-xml');
      const rejected = cli(preview, state, input, output);
      assert.equal(rejected.status, 1, rejected.stderr);
      assert.match(rejected.stderr, /invalid XML 1.0 character/);
      await assert.rejects(readdir(output), {code: 'ENOENT'});
    }
    const label = '中文 🏁 <script> & onload=';
    await writeFile(input, JSON.stringify({...plan, state: {...plan.state, unit: label}}));
    const escaped = join(dir, '转义');
    assert.equal(cli(preview, state, input, escaped).status, 0);
    const escapedFrame = await readFile(join(escaped, 'beat-001-start.svg'), 'utf8');
    assert.ok(escapedFrame.includes('中文 🏁 &lt;script&gt; &amp; onload='));
    assert.ok(!escapedFrame.includes('<script>'));

    const linkedParent = cli(preview, state, input, join(link, 'preview'));
    assert.equal(linkedParent.status, 1, linkedParent.stderr);
    assert.match(linkedParent.stderr, /reparse points/);
    assert.equal(cli(preview, state, input, link).status, 1);
    assert.equal(cli(prepare, state, join(dir, 'prepare-story'), join(link, 'sidecar.json')).status, 1);
    const oldSidecar = join(dir, 'existing-sidecar.json');
    await writeFile(oldSidecar, 'owned by user');
    assert.equal(cli(prepare, state, join(dir, 'existing-story'), oldSidecar).status, 1);
    assert.equal(await readFile(oldSidecar, 'utf8'), 'owned by user');
    assert.equal(cli(preview, state, input, foreign).status, 1);
    assert.deepEqual(await readdir(foreign), ['sentinel']);
    assert.equal(await readFile(join(foreign, 'sentinel'), 'utf8'), 'preserve');

    // Pause only the test copy after real native directory creation, before any payload.
    // The test runner then races the same Win32 handles from another process.
    const helper = await readFile(resolve('scripts/mechanism-publish-windows.ps1'), 'utf8');
    const anchor = '            for (int i = 0; i < names.Length; i++)';
    assert.ok(helper.includes(anchor));
    const marker = join(dir, 'inside-native-publication');
    const release = join(dir, 'release-native-publication');
    const verbatim = (value: string) => '@"' + value.replace(/"/g, '""') + '"';
    const instrumented = helper.replace(anchor,
      '            File.WriteAllText(' + verbatim(marker) + ', "locked");\n' +
      '            for (int waited = 0; !File.Exists(' + verbatim(release) + '); waited++) {\n' +
      '                if (waited == 200) throw new IOException("Timed out waiting for test");\n' +
      '                System.Threading.Thread.Sleep(50);\n            }\n' + anchor);
    const script = join(dir, 'barrier.ps1');
    await writeFile(script, instrumented);
    const host = join(process.env.SystemRoot!, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const target = join(dir, 'raced');
    const child = spawn(host, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script],
      {stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true});
    let diagnostics = '';
    child.stderr.on('data', bytes => { diagnostics += bytes.toString(); });
    const exit = new Promise<number | null>(resolve => child.once('close', resolve));
    child.stdin.end(JSON.stringify({output: target, directory: true, names: ['manifest.json'],
      payloads: [Buffer.from('owned').toString('base64')]}));
    try {
      let entered = false;
      for (let wait = 0; wait < 150 && !entered; wait++) {
        entered = await readFile(marker).then(() => true, () => false);
        if (!entered) await new Promise(resolve => setTimeout(resolve, 30));
      }
      assert.ok(entered, diagnostics);
      assert.deepEqual(await readdir(target), []);
      const race = cli(resolve('tests/mechanism-rename-attempt.node.mjs'), target, foreign);
      assert.equal(race.status, 0, race.stderr);
      assert.match(race.stdout, /rename denied/);
      assert.deepEqual(await readdir(foreign), ['sentinel']);
    } finally {
      await writeFile(release, 'go');
      await exit;
    }
    assert.equal(await exit, 0, diagnostics);
    assert.equal(await readFile(join(target, 'manifest.json'), 'utf8'), 'owned');
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
