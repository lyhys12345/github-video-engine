# RSI public speech cache — results, 2026-11-14

Baseline: `a89acece8debb68aca0a211382b56b6af7dfd164`. This bounded cycle improves repeated public narration requests. It does not change the renderer, approve a real project script, synthesize a formal video or introduce a paid service.

## Change

The adapter derives the same generation identity from the current small inputs before deciding whether full model verification is necessary. Exact successful recordings retain TaskRunner's cache verification/accounting and the public generation manifest check. Every actual synthesis miss and doctor call still verifies the full locked model inventory.

A deliberate behavior change: a valid committed recording may be reused while model weights are absent or damaged. This does not establish that new synthesis is ready. The local profile and Python executable are still needed for this same-workspace identity lookup; model/profile-free portable replay is unchanged. Cached WAV/manifest corruption fails visibly rather than regenerating in the background.

A cache-only call cannot turn into unchecked synthesis if its earlier successful task disappears. The existing zero-attempt limit fences that race. Valid legacy version-0 state retains TaskRunner's existing migration path; unsupported state still fails. Narrow compatibility handling of the existing version-error message is a maintenance coupling to cover with regression tests.

## Real measurement

Measurements use the same Windows host, Node 24.22.1 and a copied historical public Ryan task, not a fresh computer or a full-video benchmark. The original task and its media are preserved. The same-process repeated reads are affected by operating-system filesystem caches; report measured repeats, not a universal speedup.

The source task declares the text “A request arrives.” It is a 2.56-second mono PCM16 WAV at 16 kHz, 40,960 samples, SHA-256 `76f55f68788a26b5417600b144bf7c46c0c0383bad8e568b30482534b9326408`. It fully decodes. The task is `48f1df1174dc5b435703864f41a117d716503d84714ad7c1afc492a1561f304f`, generation manifest SHA-256 `83aca4afb1a9e9323a145f104e73cd64bb290c1d604236a3bc8a3dfd4dd8ed70`.

Baseline five cache calls: 15,035.1 / 3,433.0 / 4,927.3 / 3,661.6 / 4,038.3 milliseconds; median 4,038.3 ms. Each actually streamed 11 model files totaling 2,498,383,610 bytes. The median model-read window was 3,941.0 ms; standalone artifact verification was approximately 23 ms. Candidate source SHA-256 `eb5d46cd756bd38bf7ce2250a6c2b47f02a1856c7dad615654295ab143fc40db` measured 120.74 / 85.21 / 105.53 / 82.38 / 83.93 milliseconds; median 85.215 ms. Every call read zero model-weight streams/bytes, retained the same task/WAV/manifest hashes and reused the successful record. This observed cache path was about 47 times faster (97.9% less elapsed time); it is not a whole-video or first-synthesis speed claim. The final repeats overlapped a separate fresh CUDA validation process; retain this condition rather than treating the measurements as a controlled hardware benchmark.

The task stayed at attempt 1 with one started and one terminal receipt. Five exact repeats added five cache-hit receipts; a further hit with an explicit absent-model profile added one more. Changed text with that profile failed `PUBLIC_VOICE_MODEL` in both existing and fresh state, and the doctor voice probe failed with the same code. No new generation task/attempt or fresh-state directory was created. The original public model directory was never renamed or changed.

## Actual fresh synthesis and failures

The final adapter generated new TEST ONLY English speech, “Test only.”, using the previously installed public Ryan preset on the RTX 3070. The 2.16-second WAV has 34,560 mono PCM16 samples at 16 kHz and SHA-256 `8c1827f8e7c6f706a04c5a21477d04c25e4d2df99272d5a0f801da5c89d6696a`. FFprobe and full FFmpeg decoding passed. It took 57.52 seconds for the adapter call, including verification; the durable worker task measured 53.42 seconds. One attempt succeeded with zero external provider charge. Owned temporary directories were cleaned and the original database hash stayed unchanged. No first-synthesis speed improvement is claimed.

Failures remain separate: the first sandboxed provisional generation returned `PUBLIC_VOICE_RUNTIME`; a scoped run of the same longer test phrase reached a 60-second harness deadline. Its owned runtime directory and sidecar were removed. The final successful run used a different shorter test phrase and a 180-second harness deadline. Those changes do not isolate or prove a repair of the original failure. Raw logs remain alongside the final proof. A sandboxed doctor also could not exercise the hard-link storage probe; the separately scoped real CLI doctor successfully checked storage and correctly rejected the absent model.

## Tests actually run

65 tests passed across five targeted Vitest suites: public adapter 19 (including 12 new cases), TTS 25, TaskRunner 11, capabilities 7 and narration voice policy 3. The adapter tests use actual tiny model files, SQLite and artifact stores with a mocked Python subprocess; they do not establish GPU performance or speech quality. The separate real RTX/FFprobe/FFmpeg checks above used the actual installed worker.

The tests cover cache bytes/receipts, same-size/same-mtime model tamper, corrupted WAV/manifest, repaired missing-model retry, changed identity, cancellation, a disappearing-success race, valid legacy migration and malformed/future state rejection. TypeScript compilation, the 112-entry test catalog and patch checks also passed. No complete repository regression, new video render or new speech-alignment test was run. The previously recorded unrelated Windows Python-suite errors remain outside this change.

## Independent review and remaining limits

The frozen source/tests/docs and compact raw evidence are listed in `reviews/rsi-public-voice-cache-v1/candidate-v2.json`. Independent reliability/security/evidence and product verdicts are recorded separately in [architect review](../reviews/rsi-public-voice-cache-v1/architect-review-final.md) and [product review](../reviews/rsi-public-voice-cache-v1/product-review-final.md). The preliminary source review is preserved; source reasoning alone was not treated as executed-test acceptance.

The narrow fallback matching the existing unsupported-version error message is an intentional compatibility coupling, covered by legacy/future-state tests. The cache path still snapshots SQLite and verifies recording bytes, so timing varies with state size, disk and host load. Fresh synthesis still hashes and loads the model; there is no CPU or additional-platform certification, background daemon, model-stat trust cache or long-lived GPU worker.

Speech completeness, pronunciation, naturalness, forced alignment and continuous AV remain unverified. No formal project video or owner approval was generated. Script review before formal production, local Anna preference, public preset selection and existing imported editable-project replay are unchanged.

Raw baseline/candidate evidence remains in `C:/Users/luyuh/Documents/Codex/rsi-public-voice-cache-20261114`; compact final evidence and review records are in `reviews/rsi-public-voice-cache-v1`. Model files, audio, machine profiles, SQLite databases and handoff remain outside Git. GitHub and Drive delivery are checked separately after independent review.
