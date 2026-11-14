import {strict as assert} from 'node:assert';
import {constants} from 'node:fs';
import {copyFile, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
const ownerRoot = resolve('D:/gve-anna-render-temp');
const preferred = join(ownerRoot, 'voice-first-20261114');
const evidence = JSON.parse(await readFile('anna-comparison.json', 'utf8'));
const ffprobe = process.env.GVE_EVIDENCE_FFPROBE;
const ffmpeg = process.env.GVE_EVIDENCE_FFMPEG;
assert(ffprobe && ffmpeg);
let target = preferred;
try { await mkdir(target); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  target = preferred + '-' + String(Date.now());
  await mkdir(target);
}
assert(target.startsWith(ownerRoot + sep));
const srcRoot = resolve('a', 'artifacts');
const hash = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const outputs = [];
for (const sample of evidence.samples) {
  assert(['anna-a', 'anna-b'].includes(sample.name));
  const input = resolve(sample.wavPath);
  assert(input.startsWith(srcRoot + sep));
  assert.equal(await hash(input), sample.wavSha256);
  const path = join(target, sample.name + '.wav');
  await copyFile(input, path, constants.COPYFILE_EXCL);
  const sha256 = await hash(path);
  assert.equal(sha256, sample.wavSha256);
  assert.equal((await stat(input)).size, (await stat(path)).size);
  const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=duration', '-of', 'json', path], {encoding: 'utf8', windowsHide: true, timeout: 30000});
  assert.equal(probe.status, 0);
  const [stream] = JSON.parse(probe.stdout).streams;
  assert.equal(Number(stream.duration), sample.durationSeconds);
  const decode = spawnSync(ffmpeg, ['-v', 'error', '-xerror', '-nostdin', '-i', path, '-f', 'null', '-'], {encoding: 'utf8', windowsHide: true, timeout: 30000});
  assert.equal(decode.status, 0);
  outputs.push({...sample, path, sha256, bytes: (await stat(path)).size, fullDecodeExit: decode.status});
}
const result = {testOnly: true, playbackRate: 1, sameWords: evidence.sameWords, review: evidence.review,
  shortenedByPunctuationSeconds: evidence.shortenedByPunctuationSeconds, outputs};
await writeFile('anna-listening-copies.json', JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result));
