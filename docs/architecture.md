# M0 architecture and invariants

## Boundaries

`contracts` defines data independently of Remotion. `core` provides hashing, classified errors and subprocess ownership. `orchestrator` determines stage order and persistence. `assets` publishes local blobs. `renderer` accepts a validated spec and resolved PNG data URLs. `evaluation` inspects actual media. `providers` discovers local tools only. `cli` translates user commands and signals into engine calls.

The only renderer entrypoint is bundled engine-owned `composition.tsx`. No spec field can choose executable code. Repository/evidence URLs are metadata, never fetched. Text is rendered through React escaping; there is no HTML injection API. Local PNG paths are realpath-resolved beneath the spec directory, checked for maximum size, PNG header and declared SHA-256. Asset bytes are copied to the artifact store; subsequent rendering uses stored bytes, not mutable source paths.

## State and ownership

SQLite has `jobs`, `steps`, `events` and `cache` tables. Schema version is `PRAGMA user_version=1`; newer databases are rejected. WAL, FULL synchronous mode, busy timeout and `BEGIN IMMEDIATE` serialize writes. States are validated again when read.

Job states: queued → running → succeeded / failed / cancelled. Failed jobs resume only for retryable errors; cancelled jobs may resume while budget remains. Each step records attempts, dependency fingerprint, ownership token, start/finish times, output references and classified error. Events preserve transitions even when a failed step begins its next attempt.

Claiming a job checks its prior lease within the same transaction. Each claim gets a new UUID fencing token. Heartbeats, step completion and job completion require the current token and an unexpired lease. Stale workers cannot commit database state. An expired running step is eligible for another attempt; a successful step is immutable. No external queue is needed for M0.

Default lease: 30 seconds. Heartbeat/cancel poll: at most one second. Default stage deadline: 180 seconds. Maximum: two total stage attempts. These are constructor options for tests, not undocumented CLI flags. Retryable process/timeouts retry automatically within the budget; validation, asset corruption and failed media checks are permanent. Interrupted steps consume an attempt. Resuming does not reset budgets.

## Stage dependency graph

| Stage | Input fingerprint | Output |
| --- | --- | --- |
| VALIDATE | Complete canonical spec + execution environment | Canonical validated spec JSON |
| RESOLVE_ASSETS | Asset declarations + resolver revision | Verified PNG blobs + ID-to-artifact JSON |
| RENDER | VALIDATE / RESOLVE_ASSETS hashes + environment | Candidate MP4 (not yet published) |
| VERIFY_MEDIA | MP4 hash, dimensions/fps/timing/audio policy + environment | Structured evaluation JSON |
| PUBLISH | Job ID and all preceding output hashes + environment | Manifest referencing verified outputs |

Job identity is a random UUID; a unique canonical spec/environment fingerprint prevents duplicate jobs. Stage cache entries are populated only for committed successful steps. Every cache hit is integrity-checked. Input changes conservatively invalidate affected stages. For example, a style change reruns validation/render/media verification while reusing the unchanged asset stage. Version/environment changes intentionally invalidate more broadly than strictly necessary.

The environment records source hash (all runtime source, package manifest, lockfile and bundled default fixture), Node/platform/architecture, pinned Remotion version, browser path/file size/mtime, and FFmpeg/FFprobe version strings. It is reproducibility metadata, not a promise of bit-identical browser pixels or a cryptographic inventory of the whole operating system.

## Artifact lifecycle

1. Work occurs under a unique job/stage attempt directory.
2. Blob bytes are hashed; a unique `.partial-*` file is written and fsynced on the target volume.
3. An atomic hard link exposes the fully written file at `artifacts/<prefix>/<sha256>.<ext>`. Existing targets are never replaced; they must pass hash and size verification.
4. The temporary link is removed. Only after the file exists and passes verification does the step transaction reference it and publish a cache entry.
5. Media is inspected before PUBLISH commits the final manifest; `status.output` is only populated for successful jobs whose referenced artifacts still pass integrity checks.

A crash between file commit and database commit can leave an unreferenced complete blob; a crash during staging can leave `.partial-*` files. Neither is a successful output. M0 deliberately has no garbage collector. Job-owned attempt directories from stale runs are removed on recovery; completed artifacts are preserved. An old unreferenced blob can be reused by identical content in a later successful attempt.

Immutability covers application writes and committed step references. It does not block an administrator editing files or SQLite directly. Corrupt content is detected and reported; it is never silently overwritten or accepted as a cache hit. No power-cut durability guarantee is claimed for directory metadata on Windows.

## Cancellation and process supervision

The orchestrator propagates AbortSignals to media subprocesses. Each command runs without a shell. On Windows, cancellation/timeout uses `taskkill /PID <owned pid> /T /F`; Unix uses the owned process group. The command waits for child closure and cleanup before reporting failure. The Remotion worker uses a browser instance scoped to its render and closes it normally in `finally`.

The worker also polls its parent PID and self-terminates its process tree if the parent disappears; its own wall-clock watchdog covers a lost parent timer. A forced host/OS crash can leave temporary files. Lease recovery fences their old owner; next resume removes that job's abandoned attempt directories. SIGINT/SIGTERM mark a cancellation when the parent is still alive. The supported adapters cooperate with cancellation; injected custom adapters must honor their signal and deadlines.

The worker writes an atomic `render-progress.json` snapshot in its attempt directory from Remotion's real `onProgress` callback. It records the worker/parent PID and rendered/encoded/total frames. This is transient observability, not a successful artifact or checkpoint. The real acceptance tests use it to terminate only after frames have actually rendered and before rendering completes. Completed/cleaned attempt directories remove this snapshot; test evidence retains a copy.

Invalid public submissions return permanent `INVALID_SPEC` errors with field paths; malformed JSON returns `INVALID_JSON` with its source file. Expected user-input failures are not categorized as unexpected engine faults, and they create no job.

## Media verification

Remotion renders H.264 motion graphics; FFmpeg normalizes limited-range yuv420p and MP4 fast-start. FFprobe checks MP4 container, one H.264 video stream, yuv420p, exact dimensions/fps/frame count, duration within one frame and no audio for the explicitly silent fixture. FFmpeg then decodes the entire file with errors treated as failures. Evaluation failure artifacts remain attached to the failed VERIFY_MEDIA step.

Technical checks do not evaluate narrative, aesthetics, provenance of future real-repository claims or production readiness. Those belong to later milestones and the retained v7 workflow.
