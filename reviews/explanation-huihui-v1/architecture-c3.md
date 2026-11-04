# Independent c3 architecture / evidence / content-facts recheck

Candidate SHA-256: `ccfd2d582965d9dd2c964ca4bf93a6a52bc343f6c9904b500d13cb9e49444c0f`.

Verdict: **PASS_BOUNDED** for the affected engineering scope. No new blocker/major found. Owner listening, transcription/alignment and continuous perceptual audiovisual acceptance remain **UNVERIFIED / pending**.

## Identity and impact

Independently verified all 562 manifest files and 631 extracted source files. Source zip SHA-256: `a128003819a55646d8693ce7368f1b040cc2df9abd4476a1834157396e073015`.

Byte comparison with my verified c2 extraction identifies exactly the three declared changes: `src/orchestrator/tasks.ts`, `src/story-planner/runtime.ts`, `tests/tasks.test.ts`. The other 628 files are unchanged. The earlier Git-base verification is reused through that byte comparison; it was not rerun and is not represented as a fresh Git checkout test.

Read changed source, contracts/OPERATOR and actual retained artifacts. Builder replay summaries are not treated as proof and builder verification scripts were not executed. No other judge report was read. All code execution, mutations, exports and reports from this review are in independent `judge-architecture` source/state. Candidate files were not modified.

## TaskRunner startup locking

The busy timeout and foreign-key pragma now precede `PRAGMA user_version`. The constructor closes an opened connection on failure. Only SQLite primary BUSY code 5 (including extended codes via low byte) becomes retryable `TASK_BUSY`; schema/version failures keep their existing errors. This is a finite constructor attempt and SQLite wait policy, not an automatic forever-retry loop or an authorization change.

Independently authored `lock-worker.mts` and `storage-checks.mts` used a real separate Node process against an actual SQLite exclusive lock:

- Parent released the lock after the child reached startup and a 350 ms hold. The child opened successfully; measured elapsed 391.81 ms.
- Under a sustained lock the child returned `TASK_BUSY`, classification `retryable`; after releasing the lock a separate child opened successfully.
- The sustained case measured 7,344.15 ms total. `busy_timeout=5000` is a SQLite wait setting, **not a demonstrated five-second end-to-end startup deadline**. Multiple operations/scheduling may contribute to elapsed time. The review does not overstate that bound.
- Invalid `user_version=99` and incompatible tasks schema retained `USAGE_DB_VERSION` / `USAGE_DB_SCHEMA` behavior; their original database bytes remained unchanged.

These probes execute the engine's TaskRunner only. No GitHub target repository code or paid service executes.

## Bounded active DB/WAL snapshots

The new helper applies only to the expected `tasks.sqlite` and `tasks.sqlite-wal` files. Source review confirms:

- Ancestors must be regular directories; the file must be regular and not a symbolic link.
- Initial size is bounded by the existing 64,000,000-byte **per-file** ceiling. The opened file descriptor must match device/inode and file type. A changed opened size is transient before allocation.
- Allocation is limited to the observed bounded size. Reads use explicit positions and never append beyond that buffer. Zero-byte premature read or changed final size is transient; opened identity mismatch is a permanent input failure.
- The reader still requires two matching complete DB/WAL pairs before opening only its owned temporary SQLite copy. It does not open/migrate the original task state through SQLite.
- Retry is at most three capture attempts. Only `ActiveSnapshotChanged` is caught for retry; WAL disappearance maps to that transient category. Identity/type/size-limit and other errors are not broadly swallowed.
- The copied state retains exact task schema/version and task-input fingerprint verification before returning a record. Ordinary `boundedFile` and artifact hashing are not replaced by the active-state helper.

Fresh independent tests in `storage-checks.json`:

| Case | Result |
|---|---|
| One actual TaskRunner write grows active WAL after size observation | Original committed task read succeeds after one growth |
| Actual TaskRunner writes grow WAL on every capture | Exactly three changes, then retryable `EXPLAIN_BUSY` |
| Injected WAL disappearance at open | Three opens, then retryable `EXPLAIN_BUSY` |
| Injected zero-byte short read | Three opens/reads, then retryable `EXPLAIN_BUSY` |
| Injected opened file-identity mismatch | One open, no content read, permanent `EXPLAIN_INPUT` |
| Injected permission denial | One open, original `EACCES` propagates; no retry |
| Injected observed size 64,000,001 | No open/read, permanent `EXPLAIN_INPUT` |
| Actual ordinary-file length mutation during `boundedFile` | Permanent `EXPLAIN_INPUT`, unchanged ordinary-file rule |

The growth cases use real SQLite writes. Disappearance/short-read/identity/permission/oversize cases are explicit controlled fault injection into filesystem observations; they are not described as naturally observed OS failures or a live symlink race reproduction. The valid task reads again after restoring the original functions. The per-file ceiling is not claimed to be a global RSS ceiling: comparing DB/WAL pairs holds multiple bounded buffers.

49 affected candidate tests were independently executed in the extracted judge source: tasks 9, explanation runtime 16, TTS 24. All passed. This includes true subprocess lock behavior, invalid schema/version, cancellation of a real sleeping child, duplicate public CLI ownership, source-change fingerprinting and Huihui atomic/odd-sample checks. No broad full-suite execution is claimed.

## Fresh source/media closure and historical bytes

The independent c2 closure/media/negative scripts were adapted only to c3's artifact locations and rerun:

- Both final session, proposal, voice-preparation, generation/import, plan, voice ledger and preview chains verify.
- All ten exact citations were checked against the frozen source bytes again. Source content, claims and narrative semantics are unchanged from c2: Fastify port 3000 / GET root / handler object, and p-queue concurrency one / queueing / completion / idle. Concurrency is not a per-second rate. Scripted timing and successful task outcomes remain illustrative.
- Both MP4s underwent full FFmpeg audio/video decode and all video PTS were enumerated at frame/24.
- All six original WAVs were independently decoded; complete mixes were rebuilt at exact sample offsets and matched byte-for-byte. All seven VTT cues were independently reconstructed from authored codepoint/sample ranges and rounding.
- 22 wrong-parent, wrong-source, altered-quote, timing/coverage, silent-downgrade and original WAV/receipt corruption cases were freshly rejected. Only private CAS bytes were mutated and restored.

| Case | Frames | Duration | Reference PCM samples | Decoded AAC samples |
|---|---:|---:|---:|---:|
| Fastify | 437 | 18.208333 s | 874000 | 874496 |
| p-queue | 505 | 21.041667 s | 1010000 | 1010688 |

AAC remains lossy with codec padding; this is technical placement/encoding verification, not listening or spoken-word alignment. The c3 movie bytes are actually identical to c2:

- Fastify MP4: `def34b8bae6c73c3b6b652354bca90d7ac6ed77933e1aeca743a59d40e002569`.
- p-queue MP4: `6dc36a303a1107a23b9bf7c2c9e6b977b1cfd21fb051568c6c557b3df11ef2d8`.

Exact c2→c3 comparisons also pass for full authored proposal/plan, complete editable trace, evidence/source files, generation manifests, import receipts, original WAVs, PCM, VTT and extracted AAC stream. New outer task identities reflect the updated engine dependencies, not changed facts or sound:

- Fastify c3 session: `29ba0054fe9811315935198873ffa7738e0200c1818a8929715080b226465e19`.
- p-queue c3 session: `5608ea53137664d2eae8c04d488762518689ee78afead653d4301eb7a4d152b2`.

`history.mts` independently read/resumed the two c2 sessions through c3 readers and exported them to fresh judge-only receipt directories. Every one of 53 Fastify and 63 p-queue payload files matched the original c2 bytes. All 46 original task records remained unchanged. The six import records likewise remained unchanged in the closure/negative replay.

## Evidence reused by impact; explicit limits

The c2 locale, pinned-font, author-input semantics and first-Huihui-import recovery review is reused because those source files are byte-identical. c2 independent crash/race proof is not portrayed as rerun in this review. c2 key-frame observations remain applicable because both entire MP4s are byte-identical; no new subjective visual pass is claimed. The authored Chinese profile still visibly states process illustration and no target execution, and keeps code/payload spelling and pending-review labels.

This round did not perform new public GitHub acquisition, Huihui synthesis, movie rendering, 300-second output, owner listening, ASR, physical-phone testing, power-loss testing, or every older contract regression. All of these remain outside the claimed evidence. Raw independent records: `identity.json`, `storage-checks.json`, `focused.log`, `checks.json`, `captions.json`, `history.json` and their scripts/logs.

## Conclusions

- Architecture and affected lock/snapshot safety: **PASS_BOUNDED**.
- Evidence/provenance and historical identity: **PASS_BOUNDED** for the tested complete closures and exact preserved artifacts.
- Content facts: **PASS_BOUNDED**, using unchanged source-backed examples and explicit illustrative assumptions.
- Owner listening, transcription, spoken alignment, continuous audiovisual experience and final acceptance: **UNVERIFIED / pending**.

No unresolved blocker/major was found by this role. No inference from citation matching to arbitrary-project semantic correctness, automatic authorship, or real target execution is made.
