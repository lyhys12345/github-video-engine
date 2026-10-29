import type {z} from 'zod';
import type {ErrorSchema} from '../contracts/runtime.js';
import type {Artifact} from '../contracts/runtime.js';
export class EngineError extends Error {
  constructor(public code: string, message: string, public classification: 'retryable' | 'permanent' | 'cancelled' = 'permanent', public artifacts: Artifact[] = []) { super(message); }
}
export function errorInfo(error: unknown): z.infer<typeof ErrorSchema> {
  return error instanceof EngineError ? {code: error.code, message: error.message, classification: error.classification} : {code: 'UNEXPECTED', message: error instanceof Error ? error.message : String(error), classification: 'permanent'};
}
export function checkAbort(signal: AbortSignal): void { if (signal.aborted) throw signal.reason ?? new EngineError('CANCELLED', 'Execution cancelled', 'cancelled'); }
