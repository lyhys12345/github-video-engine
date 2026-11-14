# Independent architect final review — public local voice v1

**Verdict: PASS for the bounded engineering requirements V1–V8 within the assigned reliability/security/evidence role.** No unresolved blocker or major finding. V9 Git/Drive delivery is a separate root-agent obligation, pending at the time of this report. This is not approval of a formal repository film or of subjective audiovisual quality.

Reviewer: architect, independently reviewing implementation; authored architecture and review evidence only. Initial findings remain in `architect-review-initial.md`. The reviewer did not modify production code, tests or the frozen candidate and did not use another judge's vote as proof.

## Exact candidate and review boundary

Final manifest: `reviews/rsi-public-voice-v1/candidate-final.json`.

SHA256: `7e3e0778e9646509908587af58b2fde1ecbbc0753a4947bd23994d7c9e6b9e0b`.

Baseline: `3e47abc547b307850f6577cc6939edb79987ac65`. Independently recomputed bytes and SHA256 for all **38 source/config/test/document files and 14 frozen evidence files: 52 matched, zero mismatches**. Result is preserved in `architect-candidate-final-check.json`. Relative to the reviewed candidate v3, only three documentation files differ; implementation and tests are unchanged. The final results document and setup/support wording were read and checked against raw evidence.

The scope is one explicitly selected public preset adapter on the tested Windows x64 / Python 3.12.14 / RTX 3070 / CUDA 12.8 path, zh-CN Serena and en-US Ryan. No fresh physical machine, CPU, macOS/Linux, other GPU, voice naturalness or complete promotional-film certification is implied.

## Findings and rechecks

**F1 — resolved.** Candidate v1 denied harmless `socket.gethostname` during Windows `platform.machine()`, preventing startup. The original raw traceback is preserved. Final worker permits that local event while retaining the broader socket audit denial. The reviewer inspected the fix and subprocess regression, independently reran that one test successfully in the public venv, and inspected the real corrected CUDA probe plus both real generated WAVs. All copied direct-sample workers and final source match SHA256 `1ce1b69f8ed426a7814e159ff077d6d5594bce3593cc87ea396781164a08714c`.

**F2 — resolved.** Candidate v1 lacked public-adapter-specific failure-path tests. Final `tests/qwen-public-adapter.test.ts` adds seven tests using real tiny local files, TaskRunner/artifacts and owned temporary directories, with an explicitly mocked Python subprocess. Read the implementation and raw 7/7 result. Coverage includes missing/altered/foreign model data, unsupported language, worker timeout, in-flight cancellation, deletion of partial output and owned scratch, zero successful artifact publication on failures, incorrect speaker/sample metadata, silent audio, distinct text/language identity, and exact cache reuse. These are contract tests, not GPU synthesis evidence. Actual GPU evidence is separate below.

The initial browser failure was retained rather than relabeled as success. Read-only inspection found existing 45-second startup, 660-second subprocess and 900-second task deadlines in the relevant renderer path; see `architect-browser-deadline-note.md`. The exact initial launch cause remains unproven. Existing owned recovery and a later complete registered run succeeded; no new renderer fix is claimed.

## Independently checked evidence

### Public assets and isolated setup

- Independently retrieved all nine small model/tokenizer/config files from the official immutable revision and hashed them: all match the committed lock (`architect-official-small-files.json`). Both large weight hashes and lengths agree with independently read official Hugging Face metadata recorded during architecture research.
- Independently hashed all eleven files in the actually installed public model directory: all match the committed lock (`architect-installed-model.json`). No extra model-code file is accepted by the adapter.
- Inspected the public venv's `pyvenv.cfg`: Python 3.12.14, `include-system-site-packages = false`, created using the public bundled interpreter. Inspected public-only profile containing model/Python paths, pinned installation report, key wheel hashes, `pip check` result, wheel inventory and real isolated SoX bootstrap/build receipts. Package downloads/cache use and pre-existing Node/browser/media tools are disclosed. This is isolated installation on the existing host, not a clean-machine certification.
- Setup uses fixed data allowlists, immutable URLs, bounded bytes, hashes before publication and explicit online installation. The main installation is wheel/hash locked; python-sox is an explicit reviewed source-build exception with pinned source/bootstrap and verified deterministic wheel hash. Generation never invokes setup.

### Actual generated speech

Read corrected raw probe: RTX 3070, capability 8.6, CUDA 12.8, Python 3.12.14. Independently read/hash WAV bytes and verified mono 16-bit PCM at 16 kHz with nonzero samples:

| Sample | Samples / duration | SHA256 |
| --- | --- | --- |
| Ryan / en-US | 40960 / 2.56 s | 76f55f68788a26b5417600b144bf7c46c0c0383bad8e568b30482534b9326408 |
| Serena / zh-CN | 26880 / 1.68 s | 919935eaeeb8c51e930cfbea4340debfa0345d6129bf181c65cb6afce734bbe9 |

Evidence: `architect-direct-samples.json` and original direct-sample probe/stdout/FFprobe records under `D:/gve-anna-render-temp/public-voice-20261113/probe-and-samples-v2`. No listening claim is made.

### Complete registered technical fixture and editable closure

Read the actual passing registered test log (`public-cli-media-v2.txt`, 523.448 s test duration) and its raw CLI outputs at `D:/gve-anna-render-temp/public-voice-20261113/tmp/gve-pv-5t65Qw`. Source transport and approval receipts are explicitly TEST ONLY. The test contains three narrated supported scenes and two visibly unproduced placeholders; this is a partial technical preview, not an approved formal film.

Independently reran full FFmpeg video/audio decode on the baseline, imported replay and edited MP4: all exit 0. Independently hashed all three actual movies:

- Baseline and offline replay: `1edea3ffe86c1b1c619092ea7fa846defdc2a0b631eccb06b54049faca8fadc7`.
- Edited: `13bbf0affad2ea6119ab47c2a6c7295375cf744dc9880dd78de91f009e2c9863`.

Raw FFprobe records show 540 H.264 frames / 18 seconds and mono AAC 48 kHz / 18 seconds. The ledger records original speech of 2.56 / 3.28 / 2.80 seconds inside the four-second authored scenes, complete decoded sample counts and playbackRate 1. Independently compared baseline/edit ledgers: only `match-route` changes transcript/audio; `send-request` and `return-body` retain exact audio hashes. All scene bounds fit. No time stretching or clipping is indicated by these sample/PCM checks; declared transcript hashes still do not verify spoken content.

Independently hashed every **105-file** portable package member: zero mismatches. Manifest SHA256 `cb3f474e4e2df435697227bab3f42c2d82b5f5a264d762ecde8f81b7514f776a`. Checked package paths contain no model weights, Python executables/wheels, executable source, local profiles or runtime databases. Inspected source assertions and successful raw run proving original workspace hidden and profile unavailable during import/replay. Offline replay preserves task/movie identity; changed text rejects old approval, a new TEST ONLY receipt permits one new recording, and two unchanged recordings are reused. Original package bytes and baseline survive. Independent raw verification is saved in `architect-registered-media-check.json`.

Also inspected successful same-workspace recovery artifacts separately; their package digest differs because metadata differs. They are not substituted for the registered full test.

### Tests, approval and disclosure

Read raw 74-test focused JS result, seven public-adapter results, four public Python results, actual registered media pass, typecheck, 112-entry catalog, Skill and static entrypoint validation. The reported 86 distinct targeted tests correctly excludes repeated subsets and independent rechecks. Existing creative-brief-runtime test explicitly changes the brief and rejects an old candidate receipt; actual media test rejects changed-text approval. Source still gates formal media on exact reviewed input and never promotes test approval into owner approval.

Read the preserved broad Python failure: unchanged macOS-oriented alignment tests use `/private/tmp` and error seven times on Windows (19 tests run). These are not counted as module passes; no full-repository regression is claimed. Initial checksum, probe, adapter-fixture and Chrome failures remain present and accurately bounded in the final results document.

## Contract disposition

| Criterion | Assigned-role disposition |
| --- | --- |
| V1 | PASS — official public assets, immutable complete lock, explicit bounded provisioning, reference-free synthesis and disclosed terms. |
| V2 | PASS — isolated public installation and actual zh/en synthesis on the stated host; no private voice asset is part of the profile/path. |
| V3 | PASS — explicit profile, language-aware legacy gate, unchanged owner default, parent-bound receipts, cache identities and fail-closed checks. |
| V4 | PASS — exact approval remains required; stale brief/text reject; fixture approvals are labeled TEST ONLY. Formal HTTPX remains unapproved. |
| V5 | PASS — actual video/audio, original sample placement, 105-file editable closure, profileless replay, approved changed-scene synthesis and unchanged-scene reuse. |
| V6 | PASS — specific failure-path gaps repaired; targeted and actual evidence distinguished; failures preserved. |
| V7 | PASS within this reviewer's role — final hashes verified, initial dissent retained and same reviewer rechecked repairs. The separate product/media role is not inferred from this verdict. |
| V8 | PASS within reliability/evidence scope — setup, supported limits, public selection, licensing observations and pending perception match inspected evidence. |
| V9 | PENDING SEPARATE DELIVERY — commit/push and Drive verification are not covered by this pre-delivery verdict. |

Remaining human acceptance: exact speech content, pronunciation, naturalness, continuous audiovisual review, real-project factual acceptance and final owner approval remain UNVERIFIED/pending. Python audit hooks/offline flags are not an OS sandbox. The review assumes a trusted installed engine/runtime against malicious local administrator modification, as documented. No paid API, target-project execution, private voice dependency or silent fallback was identified in the inspected bounded path.
