# Candidate 7 / evidence — PASS, affected-scope recheck

Candidate `url-to-preview-candidate-7`; manifest SHA-256 `274c43e69592159e7e271dcc471155c46319e7189df8b11942c8f444bfda3d62`. All **628 file hashes and byte counts** independently matched. Current engine hash independently recomputed: `c1c985d497bb140aab35ba2163f601952ed8c2d2b0d25cbc5aec02246636e0c8`. Windows/Node 24.22.1, 2026-11-03; output `C:/Users/luyuh/Documents/Codex/gve-final-race-fix/judge-facts-c7`.

Unchanged AGENTS, common/role definitions, acceptance contract and owner deferral remain the review basis. No other judge or candidate handoff/builder report read. Frozen candidate/shared source unchanged; independent source copy and existing trusted dependencies only. No target execution, paid API, installation or publication.

## Delta and new verification

`c6-to-c7-delta.json` records the complete manifest comparison. Exactly four source-tree files differ from C6: implementation `src/workflow/final-delivery.ts`, and tests `final-delivery.test.ts`, `animation-export-child.ts`, `animation-task-adversarial.test.ts`. No preview, receipt publication, source intake, audience renderer, story, audio or schema implementation changed.

The final-delivery implementation separates an absent destination observation from verification of an existing directory, permitting a concurrent complete matching delivery to be reused after the original ENOENT. It retains rejection of incomplete/different destinations. The animation changes repair a test child that previously awaited a promise without an active event-loop handle; the new timer keeps it alive so the parent can prove an actual SIGKILL rather than mistake natural exit for interruption.

Independent current execution:

- `node node_modules/vitest/vitest.mjs run tests/final-delivery.test.ts tests/animation-task-adversarial.test.ts`: **16 tests / 2 files passed**, exit 0 (`independent-affected-tests.log`). Final-delivery provider/media/approval fixtures are explicitly MOCK; real filesystem/CAS/SQLite/export behavior is tested. The animation interruption uses a real child and asserts `{code:null,signal:'SIGKILL'}`.
- `node --import tsx judge-missing-race.ts`: exit 0, **four own boundary probes** (`missing-race-results.json`, `missing-race.log`). Immediately after the missing-target observation, an unrelated directory, regular file, junction or changed-manifest directory appears. Each yields FINAL_EXPORT_CONFLICT; its user sentinel survives unchanged; owned temporary stages are removed. The source is unmodified; a judge-owned fs observation hook schedules the race.
- `node independent-check.mjs`: exit 0 (`independent-chain-results.json`). Rechecks current engine/task IDs, publication receipt digest and complete file closure, replay binding, Story graph/source hashes, five exact citations, research source lines, all six audio hashes/transcripts, full PCM reconstruction and final AAC correspondence.

## C6 evidence retained by impact analysis, not claimed as rerun

C6 manifest `a4c4534fcd6849064cfdf4dbdf920e6422664ae64f19d69ecf6868fe675e8c1b`; own prior reports/logs at `C:/Users/luyuh/Documents/Codex/gve-c6-fix/judge-facts-c6`. Its **23 tests / 6 files**, seven receipt probes and original race rechecks remain applicable to unchanged preview/source/receipt modules. They were **not** rerun wholesale for C7 and are not added to the 16 current tests as a fabricated C7 run count. The global engine fingerprint changed, so current task identities/receipt closures were freshly recomputed rather than retaining old IDs.

`media-identity.json` establishes both actual current MP4s are byte-identical to C6: Express `67743696a508df46118c2036e2f1d004e854abf6d9580b1f20893dae1c353559`, rembg `cc30912595fc5c25bfb5582a1db3981df09dbac233e26de14b33283a2fa1ae8c`. Therefore C6's independently executed complete FFmpeg decode, FFprobe, and four sampled images per movie are retained by exact media identity. This review did not newly watch or fully decode video frames; it did freshly decode audio for receipt/PCM checking. Express remains 837 frames/27.9 s; rembg 747 frames/24.9 s, 720×1280 30 fps H.264 yuv420p plus mono 48 kHz AAC.

No evidence mismatch or unresolved affected-scope blocker found. Historical logs and failed prior reports remain unchanged. Listening, spoken-text verification, aligned subtitles, continuous perceptual AV and final owner/G6 remain **UNVERIFIED/pending**. Final-delivery MOCK mechanics do not certify real final production media or human acceptance. Receipt-v1 still requires trusted retained digest/closure verification at use; legacy/local-writer limitations are not erased by this unrelated fix.
