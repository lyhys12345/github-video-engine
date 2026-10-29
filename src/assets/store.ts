import {mkdir, open, link, unlink, readFile, stat} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ArtifactSchema, type Artifact, type Stage} from '../contracts/runtime.js';
import {fileHash, sha256} from '../core/util.js';
import {EngineError} from '../core/errors.js';
const extensionFor=(mediaType:string)=>({'video/mp4':'mp4','image/png':'png','audio/wav':'wav','audio/flac':'flac','text/vtt':'vtt','text/plain':'txt','application/zip':'zip','font/ttf':'ttf'}[mediaType]??'json');

export class ArtifactStore {
  readonly root: string;
  constructor(root: string) { this.root = resolve(root, 'artifacts'); }
  path(artifact: Artifact): string {
    ArtifactSchema.parse(artifact);
    const extension = extensionFor(artifact.mediaType);
    const expected = `${artifact.sha256.slice(0, 2)}/${artifact.sha256}.${extension}`;
    if (artifact.storage !== expected) throw new EngineError('INTEGRITY', 'Artifact storage path does not match its hash');
    return join(this.root, ...expected.split('/'));
  }
  async verify(artifact: Artifact): Promise<void> {
    const path = this.path(artifact);
    try {
      if ((await stat(path)).size !== artifact.bytes || await fileHash(path) !== artifact.sha256) throw new Error('Hash or size mismatch');
    } catch (error) { throw new EngineError('INTEGRITY', `Artifact ${artifact.sha256} is missing or damaged: ${String(error)}. Restore the original blob; immutable records are never overwritten.`); }
  }
  async readJson<T>(artifact: Artifact): Promise<T> { await this.verify(artifact); return JSON.parse(await readFile(this.path(artifact), 'utf8')) as T; }
  async commit(data: Buffer | string, mediaType: string, producingStage: Stage, inputFingerprint: string): Promise<Artifact> {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (bytes.length === 0) throw new EngineError('EMPTY_ARTIFACT', 'Cannot commit an empty artifact');
    const hash = sha256(bytes);
    const extension = extensionFor(mediaType);
    const artifact: Artifact = {schemaVersion: '1.0', id: hash, sha256: hash, bytes: bytes.length, mediaType,
      storage: `${hash.slice(0, 2)}/${hash}.${extension}`, producingStage, inputFingerprint, createdAt: new Date().toISOString(), integrity: 'verified'};
    const dir = join(this.root, hash.slice(0, 2));
    await mkdir(dir, {recursive: true});
    const temp = join(dir, `.partial-${randomUUID()}`);
    const handle = await open(temp, 'wx');
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    try {
      // Same-volume hard link is atomic and refuses replacement; readers never see partial blobs.
      try { await link(temp, this.path(artifact)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      await this.verify(artifact);
      return artifact;
    } finally { await unlink(temp).catch(() => {}); }
  }
}
