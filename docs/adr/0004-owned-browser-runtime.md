# ADR 0004 — owned short runtime directories

Status: implemented; final current-source browser/install/milestone acceptance is separate.

## Evidence and problem

Actual force-termination experiments reproduced orphaned Chrome profiles in all three browser-rendering routes: M3 (`work/m3-recovery-validation/`), M0 (`work/m0-profile-baseline/`) and M2 (`work/m2-profile-baseline/`). Captured owned process birth identities had exited, but their exact profiles remained. Pinned Remotion cleanup can race Windows file locks; force-killed workers cannot execute their finally blocks.

The first proposed private directory inside the long stage path failed at a 265-character Windows profile path. One namespaced-path experiment reached Chrome and failed startup. Both failures remain recorded. A short private root rendered successfully. Independent real file-lock testing then found that recursive deletion could remove an interior ownership marker before failing on a busy payload; unconditional stage deletion could also erase its recovery locator. These were actual findings, not hypothetical test cases.

## Decision

Use one generic utility in `src/core/owned-runtime.ts`; the final renderer retains a compatibility re-export. Create an exclusive UUID directory under the known local temporary root and an exact adjacent `.owner` sidecar. The planned locator in the owned stage directory precedes sidecar/directory creation. The sidecar stays outside the recursively deleted payload until its absence is verified.

Only the worker receives TEMP/TMP/TMPDIR overrides. The parent environment is unchanged. Every cleanup validates bounded regular locator/sidecar bytes, version, UUID, exact root/path and owning stage directory; linked roots are refused. No global profile scan or browser-name process kill is used. Transient I/O cleanup failures are retryable, preserve the locator and do not become silent success. Simultaneous cleanup tolerates a losing removal only after verifying both exact payload and sidecar are absent.

Adapters clean before successful return/artifact publication. M0 Engine and production TaskRunner call the appropriate cleanup hook before discarding failed/stale attempt directories. If cleanup fails, those directories retain their recovery locator. Exported editable projects contain the same helper and preserve their staging directory if its cleanup fails.

## Consequences and limits

Normal completion/cooperative cancellation attempts immediate cleanup. Hard owner death may leave tracked incomplete temporary work; the next same-task restart reclaims it before fresh execution. This eventual cleanup is distinct from an assertion of instantaneous garbage collection after a dead owner. Attempts, committed artifacts and approval budgets are retained.

The protocol survives measured process termination; it is not a power-loss transaction, administrator-proof ownership system or general host scavenger. Historical failed-version profiles are preserved separately as forensic evidence, not misreported as automatic cleanup by the new implementation. Existing source/environment compatibility rules still apply to old jobs.

Raw bounded prechecks: `work/m3-temp-safety-precheck/`; immutable helper/probe candidates: `work/m3-cleanup-investigation/`; focused M0/M2 integration: `work/m0-m2-owned-runtime/`. Actual later acceptance records must identify their precise source hashes and distinguish mocked worker tests from real media/process checks.
