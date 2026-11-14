# Independent final showcase guard recheck

Reviewer: /root/speech_alignment  
Candidate checked: 2026-11-13 after the URL routing and source-bound resume repair  
Verdict: **PASS for the reviewed guard and storyboard contracts.**

- The root `explanation showcase` alias requires an explicit workspace and exactly two command words before reading any inputs. Workspace resume validates the selected source or render task against the current pinned source provenance SHA-256 and the corresponding task fingerprints before the durable renderer can update the workspace pointer. The test stages a standalone source in the same task database and confirms the workspace route rejects it.
- In a URL workspace, script approval binds the exact source commit and the digest of the normalized technical storyboard, including annotations, caption partition, font and source footage. Independently reran the fixture that rejects both a different pinned commit and a modified operational annotation under the stale approval. The test preserves standalone historical rendering and does not grant new owner authorization.
- `pnpm exec vitest run tests/showcase-durable.test.ts tests/showcase-reel.test.ts tests/approved-reel.test.ts tests/cli-routing.test.ts` passed **22 tests** in 4 files after the final guard changes. The builder's latest synthetic recovery/import artifact remained independently inspected as recorded in the initial scoped review. No independent new render, listening, or continuous AV judgment was performed.
