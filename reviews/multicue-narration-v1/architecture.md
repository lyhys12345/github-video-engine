# Independent multi-caption contract and compatibility review

Scope: the fixed implementation in `C:/Users/luyuh/Documents/Codex/gve-multi-caption-v1`, reviewed through an isolated exact source copy. Result: **PASS for the reviewed contract, source-level factual declarations, temporal boundaries, and exercised backward compatibility. No blocker or major defect found.** New rendered multi-caption media, speech alignment, listening and owner acceptance are not covered by this PASS.

This directory is called `prejudge-architecture` because work began while implementation was changing. The final results below were executed after the parent confirmed the candidate's four changed files were fixed. The earlier short-cue probe was superseded: the implementation added duration guards while that probe was being prepared. That temporary mismatch is not reported as a candidate defect.

## Identity and independence

There is no Git repository or `candidate.json` freeze manifest in the supplied directory. I therefore recorded an independent SHA-256 list of 201 source/test/configuration/document files, made an exact local snapshot, and checked all listed candidate bytes again after execution: zero changed files. This establishes the exact reviewed implementation, not a full media/package freeze or a Git tree identity.

Changed source files relative to current main are only `src/presentation/narration.ts` and `src/presentation/runtime.ts`. The reviewed four-file identities are:

| File | SHA-256 |
| --- | --- |
| src/presentation/narration.ts | 7b5ab29ed6b6953520bda585644ffd6f4ab17ec2e6ae401db1fbf62e73b59ab4 |
| src/presentation/runtime.ts | 6bc2346628f5c7b3be06001f04e47d83e4dba820a30c3435532c62a79ca4ebc0 |
| tests/presentation.test.ts | 0868a6a7a36f8dd6b55a500f40610000e5a02b8496381adc7bd2f0ddab911e15 |
| docs/presentation-narration-v1.md | a8cff6cf6d8b6b39156270e391059b5bbfc9681bbc73672100c9a43ffe39e982 |

Read actual source, contract documentation and tests, not builder verification logs or other judges. Candidate source was not modified. Tests, generated state and probes were confined to this review directory. Local dependencies were reused through junctions; no network installation or target-project execution occurred.

## Contract and factual boundaries

Binding 1.1 retains one complete original recording per beat and exact full-text receipt/hash binding. It adds up to 40 captions per recording and at most 20 recordings. Full transcripts are bounded to 2,000 JavaScript string code units, consistent with the proposal string bound; caption character offsets explicitly use Unicode code points. This avoids splitting surrogate pairs. The displayed substring is edge-trimmed, while character ranges must still partition the complete original text. Display trimming is documented and does not alter the bound original transcript or PCM.

The new ledger distinguishes complete recording placements (`cues`) from derived caption placements (`captionCues`) and records `captionTiming: caller-declared`. VTT explicitly says caller-declared caption timing and transcript, with speech alignment unverified. Original event timing continues to reference the complete recording start. Neither supplied intervals nor exact hashes prove spoken words, speech-to-word alignment, factual entailment, voice identity or naturalness. Existing review flags remain unverified/pending. These are appropriately bounded claims.

Minimum duration is a declared technical guard: at least 0.5 seconds and at most 20 weighted characters per second, counting non-ASCII code points twice. It is not empirical proof of readability in every language. Unsupported/invalid timing fails instead of modifying audio speed, removing words or truncating the recording.

## Time projection and independent probes

Sample intervals are integer, half-open, 48 kHz, relative to the decoded recording. They must fit that recording, remain ordered, and remain disjoint after projection. Explicit gaps are allowed. The renderer projects starts with floor(sample / 2,000) and ends with ceil(sample / 2,000); authored VTT uses nearest millisecond. Thus the visible frame may begin early and end late by less than one 24 fps frame, while each VTT endpoint differs by at most 0.5 ms. This is documented outward rounding, not a claim that subtitle and audio samples have identical boundaries. Adjacent non-frame-aligned ranges that overlap after projection are intentionally rejected. Frame-aligned adjacent ranges are accepted.

My contract probe executed five positive groups and 20 negative cases. It checked exact text partition, non-BMP text and a transcript beyond the old caption length, old/new identical recording placement and complete PCM mix, correct VTT declarations, and allowed gaps. Negative cases covered omitted/duplicated/out-of-range text, missing/empty/over-budget caption arrays, invalid or reversed sample bounds, sample/frame overlap, recording overflow, sub-millisecond collapse, wrong text/hash/proposal, speedup and beat overflow. All rejected.

A separate boundary probe tested exact 0.5-second minimum, ASCII and CJK weighted minima, and one-sample-short rejection for all three. It tested the exact 14,400,000-sample / frame 7,200 endpoint without exceeding 300 seconds. Across 100 independently checked non-frame-aligned interval placements, maximum observed outward frame error was 0.9965 frame and maximum VTT rounding error 0.5 ms. This was numerical projection testing, not new encoded-video observation.

## Backward compatibility actually executed

Ran candidate readers and the previously reviewed old engine reader against copied historical state for four real existing narrated tasks:

| Existing task | Files compared | Result |
| --- | --- | --- |
| p-limit narrated 44.125 s | 80 | byte-identical |
| Synthetic contrast narrated 25.125 s | 62 | byte-identical |
| Express narrated 20 s | 51 | byte-identical |
| rembg narrated 22.5 s | 62 | byte-identical |

All 255 files matched, including original media, voice imports, PCM, VTT, source closure and manifests. Both readers returned verified integrity. Historical ledgers remain `presentation-voice-ledger/1.0` with no injected `captionCues` or `captionTiming`. This was actual retained-task read/closure comparison, not a claim that a new bind after a code change keeps the old task ID. New bind identity intentionally contains the current implementation digest; explicit new captions/timing also participate in identity.

The focused suite's actual local integration exercised new 1.1 binding, repeated cached binding, changed cue timing producing a different task identity but unchanged PCM, preserved old reads, parent invalidation, receipt rejection and restoration after CAS damage. Historical failed-render recovery and a new movie render were not rerun.

## Executed checks and reproducibility

- TypeScript no-emit check: PASS, captured in `typecheck.log`.
- `vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts tests/tts.test.ts`: 52 / 52 PASS, three files, captured in `focused-tests.log`.
- `contract-probe.mts`: 5 positive groups, 20 negatives, stable candidate bytes.
- `boundary-probe.mts`: three duration thresholds, three one-sample rejects, exact 300-second endpoint, 100 projection cases.
- `legacy-probe.mts`: four historical tasks, 255 exact files.
- `reviewed-files.json` and `final-identity.json`: 201 matching files, zero final changes.

Run the probe scripts from this directory with `node --import ./snapshot/node_modules/tsx/dist/loader.mjs <script.mts>`. Run the focused tests with cwd `snapshot`. Local native Windows permissions were needed for dependency junctions and the test suite's fixture operations; no candidate mutation or external service was involved.

Raw result files: `contract-results.json`, `boundary-results.json`, `legacy-results.json`, `focused-tests.log`, `typecheck.log`, `reviewed-files.json`, `final-identity.json`. The scripts and isolated snapshot are retained.

## Remaining acceptance boundary

No new multi-caption movie was rendered, decoded, frame-inspected or listened to by this reviewer. No new real-project narrated content was fact-checked. The previous real-project source evidence is unchanged, but this contract review does not establish that a future author selected correct subtitle timing or truthful narration. An actual new MP4, its VTT and burned caption boundary checks, audio lineage/full decode and delegated factual/AV review remain necessary for end-to-end media acceptance. No automatic content-review flags or legacy final-export paths were changed or exercised by this work.
