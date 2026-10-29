# M4 revision engineering — actual results

Scope is `reviews/M4/revision-contract.md` RD-01–08; independent candidate reviews are separate from these implementation results. No full M4 or final human acceptance is implied.

## Executed tests

`pnpm test` actually passed **126 tests in 13 files** (`work/revision-regression-initial.log`). This comprises the previous94 plus10 diff,14 correction and8 revision-audit tests. Runtime tests use real SQLite/CAS/files/owned subprocesses; their voice/image/Judge fixtures are explicitly MOCK. `pnpm run typecheck` passed (`work/revision-typecheck-fixed.log`). No new full MP4 smoke/acceptance rerun is claimed here.

The cache-integrity tests reproduced two actual defects before the final fix: corrupted committed diff bytes and a corrupted historical child package were still returned as cached success. `work/revision-tests-builder/cache-integrity-initial.log` retains the 11PASS/2FAIL run. The replay path now verifies parent/child/diff/evidence bytes and bindings; the updated14-case correction suite and full126 rerun pass. The prospective patch had not executed when automatic approval review earlier failed because account usage was exhausted; it was applied through the ordinary tool only after a later turn could execute again. Two builders also stopped on that limit, so the root reran and inspected their files instead of claiming their stopped work passed.

Other retained failures include initial strict-TypeScript narrowing errors in the diff builder, a typed SQLite test argument error, and audit fixtures whose declared media manifests and output lists disagreed. Fixtures were corrected to represent their explicit mock manifests; production audit guards were not loosened. Logs remain in the three work/revision-*-builder directories.

## Actual isolated correction and rendering

`node --import ./node_modules/tsx/dist/loader.mjs work/m4-revision-real.mjs` exited0. It copied the accepted usage archive's53 state files to `reviews/M4/revision-1/real/state`; original source bytes/set remained unchanged. Initial state had3 production packages and10 tasks. Production DB0→1 migration retained all old package/approval/task records and20 old task events.

The real public CLI rendered baseline static frames, committed one editorial title proposal for scene electron-trace, replayed the same request, exported an exact diff, refused ordinary-import rollback, refused dynamic preview without the child's G3, rendered all static frames again, reused that new task on duplicate submission, listed repair history and ran read-only audit. All successful and expected-failure exit codes/stdout/stderr are in `real/executions.json` and sibling files.

The only canonical package change was `/scenes/2/title`: “一段富文本的四站旅程” → “富文本的四站路径”. This is an agent-proposed wording simplification based on the observed real frame, not a fabricated objective quality failure or a new source claim. The proposal consumes **one of three approved rounds**. Exact request replay consumes none. Baseline hash is `b6d1ca0d760e8bd788b71b52756577bd2ee559883cdedbdfc24a782fcbb6be40`; child hash is `e3d5efb9ae6d81ed9602bb68da25afe26c272dd255a09cf03219e92c5910d2a6`.

All7 PNGs are real720×1280 outputs; only electron-trace changes bytes, while6 scene hashes remain identical. Root viewed the actual before/after PNGs and confirmed the requested shorter title is visible. The renderer actually reran the whole package; unchanged hashes are not claimed as scene cache reuse. Original artifacts remain. The new package inherits no G3/G4 and no approval rows changed. No new formal video was produced by this test.

`real/proof.json`, `before-frame.png`, `after-frame.png`, `diff-export.json`, retained SQLite/CAS state and raw CLI files provide the actual evidence. The final public read-only audit reported1.2/PASS and left its source file bytes/set unchanged. Maximum-round exhaustion, conflict/concurrency and rollback/corruption boundaries were separately exercised using explicit mocked-media SQLite tests; the real rendering probe consumed just one actual correction.

## Scope still outstanding

M3 full video/local delivery and complete M4 acceptance are not delivered by this correction slice. The owner has explicitly deferred actual hearing/continuous perceptual AV review to final owner review in `reviews/owner-av-deferral-2026-10-26.json`. Historical M2 G4 UNVERIFIED remains; this is separate engineering authority, not a forged G4 PASS. Technical media, facts, security, persistence and editable-delivery checks still apply. No paid API, deployment or target repository execution occurred.
