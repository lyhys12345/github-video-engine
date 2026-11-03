import {lstat, readdir, statfs} from 'node:fs/promises';
import {join} from 'node:path';
import {PRESENTATION_FPS, PRESENTATION_LEGACY_MAX_FRAMES, PRESENTATION_MAX_FRAMES} from '../contracts/presentation.js';
import {EngineError} from '../core/errors.js';

export const EXTENDED_RENDER_PROFILE = 'presentation-extended-v1';
export const FRAME_CHUNK = PRESENTATION_FPS * 20;
export const EXTENDED_WORKER_DEADLINE = 1_800_000;
export const EXTENDED_VERIFY_DEADLINE = 300_000;
export const MAX_MOVIE_BYTES = 80_000_000;
export const MAX_PART_BYTES = 12_000_000;
export const MAX_SAMPLE_BYTES = 2_000_000;
export const MAX_SAMPLES = 48;
const TEMP_RESERVE = 2_300_000_000;
const STATE_RESERVE = 320_000_000;
const TEMP_PAYLOAD_LIMIT = 2_200_000_000;
const TEMP_ENTRY_LIMIT = 50_000;

export function extendedRanges(totalFrames: number): [number, number][] {
  if (!Number.isInteger(totalFrames) || totalFrames <= PRESENTATION_LEGACY_MAX_FRAMES || totalFrames > PRESENTATION_MAX_FRAMES) {
    throw new EngineError('PRESENTATION_DURATION', 'Extended rendering requires 1,441–7,200 frames at 24 fps.');
  }
  const ranges: [number, number][] = [];
  for (let first = 0; first < totalFrames; first += FRAME_CHUNK) ranges.push([first, Math.min(totalFrames, first + FRAME_CHUNK) - 1]);
  return ranges;
}

export async function requireExtendedDisk(tempPath: string, statePath: string) {
  try {
    const [temp, state] = await Promise.all([statfs(tempPath, {bigint: true}), statfs(statePath, {bigint: true})]);
    const tempAvailable = temp.bavail * temp.bsize, stateAvailable = state.bavail * state.bsize;
    // The two paths may share a volume. Reserve space for both budgets on the work volume.
    if (tempAvailable < BigInt(TEMP_RESERVE + STATE_RESERVE) || stateAvailable < BigInt(STATE_RESERVE)) {
      throw new EngineError('PRESENTATION_DISK_BUDGET', 'Extended preview needs 2.62 GB free on its work volume and 320 MB on the state volume.', 'retryable');
    }
  } catch (error) {
    if (error instanceof EngineError) throw error;
    throw new EngineError('PRESENTATION_DISK_BUDGET', 'Could not verify free space for extended preview.', 'retryable');
  }
}

export async function checkExtendedScratch(root: string) {
  const free = await statfs(root, {bigint: true});
  if (free.bavail * free.bsize < BigInt(STATE_RESERVE)) {
    throw new EngineError('PRESENTATION_DISK_BUDGET', 'Extended rendering has less than 320 MB free on its work volume.', 'retryable');
  }
  const directories = [root];
  let bytes = 0, entries = 0;
  while (directories.length) {
    const directory = directories.pop()!;
    for (const item of await readdir(directory, {withFileTypes: true}).catch(error => {
      if (error.code === 'ENOENT' && directory !== root) return [];
      throw error;
    })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) directories.push(path);
      if (item.isFile()) bytes += await lstat(path).then(info => info.size, error => {
        if (error.code === 'ENOENT') return 0;
        throw error;
      });
      if (++entries > TEMP_ENTRY_LIMIT || bytes > TEMP_PAYLOAD_LIMIT) {
        throw new EngineError('PRESENTATION_DISK_BUDGET', 'Extended renderer scratch exceeded its entry or byte budget.', 'retryable');
      }
    }
  }
  return {bytes, entries};
}
