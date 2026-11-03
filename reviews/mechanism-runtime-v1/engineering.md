# Mechanism runtime v1 — independent reliability/security review

- Candidate: `C:/Users/luyuh/Documents/Codex/gve-mechanism-runtime-v1`.
- Reviewer: preview_facts_judge. Assigned scope: TaskRunner/CAS identity, cache, cancellation/recovery, corruption and export, existing real local tests and an independent process interruption fixture.
- Contract/rules read: source/AGENTS.md, source/docs/mechanism-pilot.md including Eight-second media task, judges-v2 reliability/security role definitions and previously read common rules. No builder verification/results logs or peer judge reports were read.
- Manifest SHA256: `599cd65504fb2648d34be4ae44f80a3644b62c682b0c6f4b010eaa22858bb36e`. All **173** listed entries match before and after review, including 18 source entries and 72 state entries. See hash-check.json and post-review-hashes.json.
- Environment: Windows, Node v24.22.1, authorized existing local tsx/Remotion dependency tree, installed local Chrome-family browser, FFmpeg/FFprobe. No downloads, paid services, external source requests or target-project execution.
- Scratch and raw evidence: this judge-engineering directory only; review sources and generated fixtures under engine. Frozen candidate was not modified. Existing state was read through the implementation's copied SQLite snapshot, not opened for mutation.
- Completed: 2026-11-03 11:31 UTC.
- **Reliability: PASS. Security: PASS within the trusted single-machine/local-toolchain scope.** No confirmed blocker/major within the assigned scope. The limitations below accompany both judgments.

## Measured results

| Requirement | Verdict | Independent execution / evidence |
| --- | --- | --- |
| Frozen identity | PASS | 173/173 matching hashes before and after; full entry list in hash-check.json. The list is not a complete repository/dependency inventory. |
| Existing local real tests | PASS | independent-tests.log: 3 tests, 3 pass, 0 fail/skip. Command: `node --import tsx --test tests/mechanism-pilot.node.ts tests/mechanism-publication.node.ts tests/mechanism-media.node.ts`, with GVE_TEST_MECHANISM_MEDIA=1; exit 0, 26.26 seconds. No mock media renderer. |
| Controlled cancellation / restart | PASS | Existing media test aborts a real media task, confirms cancelled status and premature-export refusal; resume uses the same task ID at attempt 2 and succeeds; repeated render is cached. |
| Process death / leases | PASS | Own engine/judge-hardkill.ts, hardkill.log, hardkill-child.log, hardkill-results.json: start actual CLI, observe running attempt 1 plus worker/runtime ownership files, then terminate only spawned test PID tree with taskkill /PID /T /F. Process exit 1 recorded. Status remains running under unexpired lease; export refuses incomplete work and resume refuses TASK_BUSY. Wait for actual recorded lease expiry, without editing DB; resume succeeds at attempt 2 with same ID. |
| Recovery resource state | PASS | Dedicated task's stale and new temporary directories absent after successful resume; no gve-final-* runtime directories or sidecars remain in its configured private temp root. Taskkill log records successful termination of six owned processes. |
| Cache/input identity | PASS | Existing test confirms repeated render cached. Own hard-kill fixture confirms resume cache hit; adding only a newline to sidecar bytes changes task ID, stopped by callback before starting another task. |
| Corruption and immutable task state | PASS | Existing test corrupts committed media and confirms status/export refusal. Own judge-integrity.ts confirms cached render refuses corrupted CAS as missing/damaged; after restoration, status verifies. Attempted SQL update of own successful task is rejected by immutable-success trigger, and exact row remains unchanged. integrity-results.json. |
| Existing output / junction protection | PASS | Existing publication test rerun on this candidate: refuses existing output and sidecar, checks foreign sentinel, rejects junctions, and verifies real native held-handle directory replacement attempt is denied. Existing media test also refuses second export to the same directory and confirms previous MP4 hash unchanged. |
| Browser-free successful export | PASS | Existing test sets GVE_BROWSER to missing executable and successfully exports committed media. Export reads verified CAS bytes and invokes native publisher, not media renderer. |
| Frozen original task/CAS state | PASS | Own judge-artifacts.ts reads original state through statusMechanismTask; REA and fill succeeded, attempt 1, integrity verified. No candidate mutation; all state manifest hashes unchanged afterwards. |
| Export/source/code/trace closure | PASS | artifact-results.json: every export file size/hash, exact sidecar bytes, graph/sourceManifest binding, captured source hashes, current declared implementation hashes and reconstructed TaskRunner input fingerprint verified. Every trace/frame mapping recomputed from sidecar, samples match. |
| Actual frozen media | PASS (technical) | Both original MP4s independently probed and completely decoded with FFmpeg -xerror. Exactly one silent H.264/yuv420p video stream each, 720×1000, 24fps, 192 frames, 8.000 seconds. No listening or perceptual quality judgment. |

## Task identity and lifecycle review

The task input includes sidecarBase64 and sidecarHash, Story binding and captured-source manifest, fixed geometry, eight mechanism implementation files plus package.json/pnpm-lock.yaml, Node/platform/architecture, browser executable digest and FFmpeg/FFprobe version lines. The task ID hashes canonical `{version:'production-task-v1',kind,input}`. Frozen export manifests intentionally omit base64 sidecar duplication; my verifier restores it from the exported exact sidecar and reconstructs each task ID independently.

REA task: `54af7ffc938f1d4022890fa11df3a54b46a5346cb78d439df9798f9c9fe6c2f1`; 39 files, 8 captured sources, 26 PNG samples. MP4 SHA256 `66e00f28b5db372113ce6e9d2d3d173119165bb62b48540be070cf561abc3dfe`.

Fill task: `767ca8c75c43fa5bde3842c8c380d7317dc52eb5f192d1acf15d82f8ea2761d0`; 20 files, 1 authored source, 14 PNG samples. MP4 SHA256 `cbc0eb238fbc11fd87c100f9a774c106c26069663df33312ffb9a5f78d016adb`.

TaskRunner transactionally claims a lease; live lease blocks concurrent reuse. Expired running state can be reclaimed and creates interrupted accounting for the previous attempt. Heartbeat and owner checks fence completion. Rendering uses at most three attempts, 230-second task deadline, bounded worker/process commands, and owned temporary cleanup. CAS writes use exclusive temporary files, fsync and no-replace hardlink; existing bytes must verify. A successful task is returned from cache only after all output/result artifacts verify.

`readTask` rechecks task identity and schema from bounded copied SQLite/WAL bytes. Successful status/export rechecks result schema, artifact task binding, CAS bytes, output list, exact input files, source closure and file names. Export assembles verified bytes in memory and uses the native exclusive publisher; it cannot silently reuse an unrelated existing directory. The publisher intentionally retains partial output after interruption and requires a fresh destination. There is no claim of cross-directory atomic rollback or signed/immutable external export storage.

## Security boundary table

| Entry / trust | Allowed operation | Control checked | Limits |
| --- | --- | --- | --- |
| Sidecar and captured source text / untrusted data | Model validation, quoting and rendering to SVG | Bounded fatal UTF-8 JSON, strict schema, exact Story/source hashes, no eval/target imports; XML guard/escaping; tested malformed characters and provenance mismatch | A matching citation proves provenance, not truth. Historical target behavior not executed or newly certified. |
| Render worker / trusted local application | Local Remotion and FFmpeg subprocesses | Fixed local entrypoint and fixed argument arrays, no shell; SVG data URI from authored validated renderer; explicit local installed browser, no auto-download | Not an OS sandbox or hostile dependency protection. Browser may have ordinary host capabilities; network egress was not independently instrumented. |
| State/CAS / operator-controlled local files | Persistence, cache/recovery/read/export | Hash-bound task identity and CAS closure, success immutability trigger, live lease refusal, tested corruption rejection | A same-user attacker controlling DB, CAS and code is outside authenticated storage guarantees. Hashes are not signatures. |
| Export path / caller-selected local destination | New files in new directory | Native component-relative handles, reparse refusal, no replacement, retained directory handle, actual junction-race regression | Windows/local filesystem tested only; partial output retained; post-return edits remain possible. |
| Cancellation / dedicated subprocess tree | Terminate this task's descendants | Existing AbortController test plus own real taskkill /PID /T /F only for spawned test PID; lease recovery and temp cleanup observed | Not proof of arbitrary orphan-process discovery or process-ID reuse immunity. |

## Independent fault fixture and initial harness result

Own process-death fixture identity is `c8a333b33f5dfe6e25681d88d5ece5ffb21f974c2dd3e3b5ffc77ad2a17938f3`. Generated state, exported media and logs remain under engine/judge-temp/hardkill-4z1kET. The interruption occurs after runtime ownership files exist and real worker launch, before committed output; it is not a specifically instrumented encoder-mid-frame or CAS-final-commit-window crash. The actual lease elapsed before retry; no timestamp or attempt record was altered.

The first additional SQL mutation probe expected to reach read-time identity validation, but successful-task immutability correctly rejected the UPDATE first. That original probe exit 1 is preserved in integrity-initial-immutable-trigger.log. The fixture was changed to assert that actual protective boundary, then passed. No trigger was removed and no candidate was changed. The final run independently repeats CAS corruption refusal, restores only its own fixture bytes and confirms integrity again.

## Explicit limitations / UNVERIFIED

- No complete repository/typecheck suite, randomized concurrency stress, retry-exhaustion/timeout-duration campaign, lease theft/fencing race injection, cancellation exactly during CAS final commit, disk-full/fsync power-loss or forced export-interruption test in this round.
- Process test terminates the owned CLI tree intentionally. Parent-only death with surviving descendants and arbitrary orphan discovery are not verified. Temp-directory checks and successful taskkill records do not prove absence of every hypothetical unrelated process.
- Implementation identity covers the declared ten files, not every transitive support implementation or installed dependency byte. Manifest contains 18 source entries and 72 state entries, not all checkout files. FFmpeg/FFprobe identity is a version string, not executable/DLL hash; the installed local toolchain is trusted.
- No hostile same-user concurrent manipulation of internal TaskRunner/CAS/temp roots was certified. Existing cleanup uses ordinary pathname and ownership-record checks; these are recovery aids within operator-controlled storage, not an authenticated isolation boundary. Native export has stronger reviewed pathname handling, but does not make returned files immutable.
- No independent network-traffic capture, fresh website access, semantic re-audit of all REA historical claims, full PNG pixel comparison, continuous visual watch, human audiovisual acceptance, or production-release approval. Silent output has no audio to judge.
- Cross-platform behavior, nonlocal filesystem volumes, dependency supply-chain integrity and multi-user service isolation remain outside this Windows single-machine engineering verdict.

All unresolved limitations remain explicit; no builder statements or peer votes were used to convert them into PASS.
