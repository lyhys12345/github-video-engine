import {lstat, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {checkAbort, EngineError} from '../core/errors.js';
import {ancestors} from '../story-planner/runtime.js';

const errorCode = (error: unknown) => (error as NodeJS.ErrnoException).code;
async function optionalStat(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return null;
    throw error;
  }
}

async function reviewParent(parent: string, create = false) {
  try {
    await ancestors(parent, create);
  } catch (error) {
    if (error instanceof EngineError && error.code === 'EXPLAIN_PATH') {
      throw new EngineError('EXPORT_PATH', 'Review export requires regular parent directories');
    }
    if (create && errorCode(error) === 'EEXIST') return reviewParent(parent, true);
    throw error;
  }
}

export async function publishReviewExport(output: string, files: readonly [string, Buffer][], signal: AbortSignal) {
  checkAbort(signal);
  const parent = dirname(output);
  const conflict = () => new EngineError('EXPORT_EXISTS', 'Existing review export is incomplete, linked or different. Choose a new output directory');
  async function exactExisting() {
    await reviewParent(parent);
    const target = await optionalStat(output);
    if (!target) return false;
    if (!target.isDirectory() || target.isSymbolicLink()) throw conflict();
    for (const [name, expected] of files) {
      const path = join(output, name);
      const info = await optionalStat(path);
      if (!info?.isFile() || info.isSymbolicLink() || info.size !== expected.length ||
          !(await readFile(path)).equals(expected)) throw conflict();
    }
    return true;
  }

  const existing = await exactExisting();
  checkAbort(signal);
  if (existing) return;
  await reviewParent(parent, true);
  checkAbort(signal);
  const stage = await mkdtemp(join(parent, '.gve-review-'));
  let published = false;
  try {
    for (const [name, bytes] of files) {
      checkAbort(signal);
      await writeFile(join(stage, name), bytes, {flag: 'wx'});
    }
    checkAbort(signal);
    const concurrentExport = await exactExisting();
    checkAbort(signal);
    if (concurrentExport) return;
    try {
      await rename(stage, output);
      published = true;
    } catch (error) {
      checkAbort(signal);
      const concurrentExport = await exactExisting();
      checkAbort(signal);
      if (!concurrentExport) throw error;
    }
  } finally {
    if (!published) {
      await reviewParent(parent);
      const info = await optionalStat(stage);
      if (!info?.isDirectory() || info.isSymbolicLink()) {
        throw new EngineError('EXPORT_PATH', 'Review export staging changed before cleanup');
      }
      await rm(stage, {recursive: true, maxRetries: 3});
    }
  }
}
