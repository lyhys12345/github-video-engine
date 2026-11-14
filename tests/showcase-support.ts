import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {canonical, sha256} from '../src/core/util.js';
import {projectRoot} from '../src/providers/local.js';
import {ttsInput} from '../src/providers/tts.js';
import {showcaseStoryboardSha256} from '../src/showcase/inputs.js';
import {runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {sourceFixture} from './workflow-support.js';

export const signal = new AbortController().signal;
const text = 'Technical fixture.';
const crop = {x: 0, y: 0, width: 1, height: 1};
export const tone = () => {
  const samples = 9600, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24); bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) bytes.writeInt16LE(Math.round(2000 * Math.sin(index * Math.PI * 2 / 48)), 44 + index * 2);
  return bytes;
};

export async function writeShowcaseFixture(root: string, sources: {file: string; bytes: Buffer; width: number; height: number; frames?: number}[], sourceBindingSha256?: string) {
  await mkdir(root, {recursive: true});
  const put = async (path: string, bytes: string | Buffer) => {
    await writeFile(join(root, path), bytes, {flag: 'wx'});
    return {path, sha256: sha256(bytes)};
  };
  const script = {path: 'script.json', sha256: '0'.repeat(64)};
  const approval = {path: 'approval.json', sha256: '0'.repeat(64)};
  const audio = tone();
  const wav = await put('narration.wav', audio);
  const input = ttsInput({schemaVersion: '1.0', provider: 'local-import', text, sourceSha256: wav.sha256,
    voiceLabel: 'Synthetic non-speech tone', mediaType: 'audio/wav'});
  const fingerprint = sha256(canonical(input));
  const createdAt = '2026-11-13T12:00:00.000Z';
  const narration = {id: 'line1', ...wav, transcriptSha256: sha256(text), captionChunks: [text],
    receipt: await put('receipt.json', canonical({schemaVersion: 'tts-receipt/1.0', fingerprint, input, voiceLabel: input.voiceLabel,
      createdAt, durationSeconds: .4, requestId: null, estimatedMaxChargeMicros: 0, actualChargeMicros: null,
      chargeBasis: 'local-import-no-provider-call', transcriptVerification: 'caller-declared; recorded speech not verified',
      review: 'pending-owner-listening', artifact: {schemaVersion: '1.0', id: wav.sha256, sha256: wav.sha256,
        bytes: audio.length, mediaType: 'audio/wav', producingStage: 'PUBLISH', inputFingerprint: fingerprint,
        storage: wav.sha256.slice(0, 2) + '/' + wav.sha256 + '.wav', createdAt, integrity: 'verified'},
    })),
  };
  const media = [];
  for (const [index, source] of sources.entries()) {
    const {file, bytes, width, height, frames} = source;
    media.push({id: `clip-${index}`, ...await put(file, bytes), width, height, type: frames ? 'video' : 'image',
      ...(frames ? {frames, fps: 30} : {})});
  }
  const font = await put('font.ttf', await readFile(join(projectRoot, 'assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf')));
  const manifest = {schemaVersion: 'showcase-reel/1.0', theme: 'paper', layout: 'cinematic',
    projectLabel: 'Synthetic technical fixture', script, approval, font, narration: [narration], media,
    beats: [{id: 'line1', shots: media.map(item => ({mediaId: item.id, weight: 1, crop, label: 'Synthetic technical asset'}))}]};
  const spec = join(root, 'manifest.json');
  const review = join(root, 'script-review.json');
  const approve = async (draft: typeof manifest) => {
    const scriptBytes = canonical({
      lines: [['line1', text]], shots: ['Two synthetic source shots.'], ...(sourceBindingSha256 ? {
        sourceBindingSha256, storyboardSha256: showcaseStoryboardSha256(draft),
      } : {}),
    });
    draft.script.sha256 = sha256(scriptBytes);
    await writeFile(join(root, script.path), scriptBytes);
    const approvalBytes = canonical({
      schemaVersion: 'script-owner-authorization/1.0', scriptSha256: draft.script.sha256, authority: 'TEST_ONLY synthetic approval receipt',
    });
    draft.approval.sha256 = sha256(approvalBytes);
    await writeFile(join(root, approval.path), approvalBytes);
    await writeFile(review, canonical({
      schemaVersion: 'candidate-review/1.0', candidateSha256: draft.script.sha256, stage: 'script', reviewer: 'TEST_ONLY synthetic fixture',
      verdict: 'PASS', coverage: 'script', findings: [], ownerApprovedSha256: draft.script.sha256,
    }));
    await writeFile(spec, canonical(draft));
  };
  await approve(manifest);
  return {spec, review, manifest, approve};
}
export async function urlFixture(root: string, commit?: string) {
  const snapshot = sourceFixture(), content = snapshot.documents[0]!.content;
  if (commit) snapshot.commit = commit;
  const transport = async (url: string) => url.includes('/commits/') ? {sha: snapshot.commit} : url.includes('/readme?') ?
    {type: 'file', path: 'README.md', encoding: 'base64', size: Buffer.byteLength(content), content: Buffer.from(content).toString('base64')} :
    {full_name: 'example/demo', name: 'demo', default_branch: 'main', license: null};
  const start = await runNarrativeWorkspace(snapshot.repository, root, undefined, 'planning', signal, transport);
  if (!('binding' in start)) throw new Error('Missing pinned source handoff.');
  return start;
}
