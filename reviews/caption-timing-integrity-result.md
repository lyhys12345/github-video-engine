# Caption timing integrity: engineering checkpoint, AV UNVERIFIED

2026-11-02 continuation from `2a3b66d8e51f3afb24b02882e95cd5a9275daf31`. The requested handoff, AGENTS, README and TTS contract were read before development. Remote main matched that commit; the newly cloned checkout was clean. Work is on `codex/caption-timing-integrity`, uncommitted and unpushed. The enclosing workspace's pre-existing empty Git repository was preserved.

The prior sidecar could be reused after changing caption segmentation while keeping the full transcript and phase count unchanged. Sidecar 1.1 now requires ordered SHA-256 values for each exact raw caption text, validates at the timeline entry as well as the renderer, and rejects legacy 1.0 with a re-review requirement. Adding hashes to an old declaration does not establish a new review. Output states explicitly distinguish caller-declared timing from independent timing review (UNVERIFIED) and owner acceptance (pending). Timing-only revisions now invalidate timeline/captions as well as frames, MP4 and review approval. The estimated fallback remains unchanged.

## Frozen review and current status

Candidate manifest: `work/caption-timing-integrity/candidate-1/manifest.json`, SHA-256 `5fdf0e8433c3892c241f9e688dcfe30a4fbb5dbe62462b4fcfb92811b7eaa287`. It captures 361 source/document/input files and 15 evidence files. The contract recorded the four active roles before freezing. Astra designed; Sol implemented; four fresh Astra contexts independently reviewed the same frozen candidate. No new PNG/media was produced, so there was no Terra PNG review to claim.

| Independent role | Verdict | Scope |
| --- | --- | --- |
| Product | PASS | Bounded engineering contract; real timeline/SRT scenarios and renderer/CLI rejection paths |
| Reliability | PASS | Bounded engineering contract; independent fault cases, persistent partial-output state and old-output integrity |
| Evidence | PASS | Bounded engineering evidence, recovered recording identity, source/test version and original logs |
| Video quality | UNVERIFIED | Declaration mechanism checked; actual listening, exact sync and continuous AV evidence missing |

**Overall: UNVERIFIED; no all-role PASS or audiovisual release.** J4-AV-01 remains a major evidence gap, not a proven perceptual defect. J3-MINOR-01 preserves the limitation that the earliest failed focused test has an explicitly labeled summary/excerpt rather than complete stdout. No missing historical log was reconstructed. Owner audiovisual acceptance and G6 remain pending.

Original independent reports, scripts and logs are under `work/caption-timing-integrity/judges/candidate-1/<role>/`. [The machine-readable result](caption-timing-integrity-candidate-1.json) binds each raw report hash and records all four verdicts. Historical candidates and UNVERIFIED reports were not rewritten.

## Real checks on this machine

Frozen-source typecheck passed; the exact full test list from frozen package.json passed **37 files, 307 tests, 2 platform skips (309 total)**. Tests include explicit mock/synthetic cases and real SQLite/files/processes/FFmpeg operations; these are not new film or listening evidence. Source and frozen evidence hashes were rechecked after testing and remained unchanged. Raw commands, exits, environment and output are in `work/caption-timing-integrity/candidate-1-validation/`.

Local Node 24.11.0 was downloaded from nodejs.org and checked against its published SHA-256 list. Project dependencies use frozen pnpm 11.25.0 lockfile installation with lifecycle scripts disabled. The ordinary install was rejected by automatic approval review; the safer no-script installation succeeded. Local npm-packaged FFmpeg 4.4 and FFprobe n4.4.1 were used; the latter needed its executable bit set explicitly after no-script installation. No system Node installation was changed.

Failed first-machine attempts remain recorded: early full tests encountered FFprobe EACCES, macOS temporary-path/ancestor issues and experimental SQLite warnings in CLI stderr; the pnpm doctor wrapper hit sandbox IPC EPERM; pnpm refused the frozen copy's external node_modules symlink. The successful frozen run used direct pinned tsc/Vitest executables, a short real `/private/tmp` directory and suppression of only ExperimentalWarning. The direct `node --import tsx src/cli.ts doctor` passed SQLite WAL, atomic hard-link and runtime-path checks; doctor finds the browser executable but does not launch or visually validate it. No production cancellation code was changed.

For this checkout's local environment, source `work/cross-machine-2026-11-02/env.sh` before direct Node commands. This helper and downloaded tools remain machine-local under ignored work/. Failed attempts are evidence of their own environments, not current successful checks.

## Original recordings recovered

Existing ElevenLabs History MP3 downloads matched the checked-in generation receipt exactly:

| Recording | Bytes | SHA-256 | Measured seconds |
| --- | ---: | --- | ---: |
| REA | 830285 | `67fd6babc763d5f2b8e7e754238286738a5d5ce025b7f7e1517d363abc612c10` | 50.834250 |
| rembg | 521831 | `31c470430fff5f25995b98ff7194af8057c488acd426d6b6cd0cfa5dbb03b4d5` | 31.555875 |
| rembg revision | 513054 | `3952cd7489a39bceef4a1efb09c975f930a8fa63981fc459d15465b73ad4f51f` | 31.007313 |

Restored files, actual probes, technical decode receipts and the download comparison are in `work/chen-continuous-voice/`. Two same-text alternative downloads did not match; their actual hashes and unmatched status were retained and independently checked. They were not restored under historical names. Hash identity and complete decoding do not prove transcript accuracy or listening quality; no exact API voice/model ID or entitlement was inferred.

REA/rembg timing-review drafts in that directory bind the exact audio/text/phases, but leave internal cue boundaries and reviewer declarations blank. They deliberately use a non-renderable draft schema; they are neither reviewed sidecars nor forced alignment. REA needs seven internal boundaries and rembg six, measured against the recovered source audio at original speed.

The next synchronization step needs actual listening or reliable alignment with recorded boundary review, then a new frozen short-video candidate and independent inspection of its exact audio/MP4/SRT/timeline. No new short clip was rendered from this code. No narration was regenerated, paid API called, API key created, target repository/model executed, full film produced, or deployment/publication performed. Raw recordings, frozen source and review evidence remain local and ignored by Git; they require separate transfer for another machine.
