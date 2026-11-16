import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultSourceDir = fileURLToPath(new URL('../../docs/media/', import.meta.url));
const defaultDestinationDir = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const expectedNames = new Set(
  ['artcraft-demo', 'engine-flagship', 'openmaic-b-demo', 'voicestudio-demo', 'worldknow-demo']
    .flatMap(name => [`${name}.jpg`, `${name}.mp4`]),
);

// Materialize only existing repository media; this never generates or downloads it.
export async function prepareMedia({sourceDir = defaultSourceDir, destinationDir = defaultDestinationDir} = {}) {
  const manifest = JSON.parse(await readFile(new URL('./media-sources.json', import.meta.url), 'utf8'));
  const remaining = new Set(expectedNames);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) || manifest.files.length !== remaining.size) {
    throw new Error('Invalid website media manifest.');
  }
  for (const entry of manifest.files) {
    if (!remaining.delete(entry.file) || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0) {
      throw new Error(`Invalid website media entry: ${entry.file}`);
    }
  }

  // Keep verified bytes in memory so no input can change between verification and copy.
  // Complete every source check before making any destination directory or file.
  const verified = [];
  for (const entry of manifest.files) {
    const source = path.join(sourceDir, entry.file);
    const bytes = await readFile(source).catch(cause => {
      throw new Error(`Cannot read required website media: ${source}`, {cause});
    });
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== entry.bytes || digest !== entry.sha256) {
      throw new Error(`Website media hash/size mismatch: ${source}`);
    }
    verified.push({file: entry.file, bytes});
  }
  await mkdir(destinationDir, {recursive: true});
  for (const {file, bytes} of verified) await writeFile(path.join(destinationDir, file), bytes);
  return verified.map(({file}) => file);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await prepareMedia();
  console.log(`Prepared ${files.length} verified website media files from docs/media.`);
}
