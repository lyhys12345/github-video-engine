import {checkAbort, EngineError} from '../core/errors.js';
import {publishExactReview} from '../mechanism/publish.js';

export function rejectLegacyReviewExport(): never {
  throw new EngineError('LEGACY_EXPORT_DISABLED', 'Legacy PlanningPackage file export is disabled. Use project status to inspect stored revisions.');
}

export async function publishReviewExport(output: string, files: readonly [string, Buffer][], signal: AbortSignal, options: {exactFiles?: boolean} = {}) {
  if (options.exactFiles !== true) rejectLegacyReviewExport();
  checkAbort(signal);
  if (process.platform !== 'win32' || !process.env.SystemRoot) {
    throw new EngineError('AUTHORING_PLATFORM', 'Safe authoring publication requires a local Windows drive');
  }
  try {
    // Create directly through held native handles. Incomplete outputs remain for inspection.
    await publishExactReview(output, new Map(files));
  } catch (cause) {
    throw new EngineError('EXPORT_EXISTS', 'Could not safely create or verify the authoring output. Inspect the path or choose a new directory. ' + String(cause));
  }
  checkAbort(signal);
}
