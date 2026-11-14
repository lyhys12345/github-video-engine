# Independent product, code, reliability, evidence and security review

Verdict: PASS for this bounded implementation. No blocker or major finding remains. This is not a production-video acceptance or a perceptual-quality verdict.

Reviewer: independent agent crop_quality_architect. I examined the candidate directly, wrote and ran independent probes, and did not read another reviewer's vote. I did not modify candidate source, contracts, tests, historical publications or original evidence. Reviewer-owned scripts and reports are the only repository files I wrote.

## Candidate binding

The exact ten-file source/test freeze is `independent-reviewed-candidate-sha256.txt`, SHA-256 d9a4e948dcf8edd34b789bf0cadb341133e13131e4b5cb7f84fcdec08e3c6629. I checked each file against that manifest before and after the final geometry probe and again before writing this report. The code freeze excludes subsequent documentation/result reports; reviewed documentation/catalog hashes are recorded separately in `independent-doc-hashes.json`.

## Checks I independently executed

- `independent-probe.mjs`: 240 seeded cases, 583 visible panels and 14,621 visible frame evaluations passed an independently authored arithmetic oracle. Expected values do not call shared geometry helpers. Cases cover standard, immersive and cinematic layouts/insets; animated crop and panel motion; contain/cover; image/video media overrides; reveal; visible source rectangles; destination rectangles; clipping and fill. Worst-frame selection, output scale and phone scale agreed.
- The same probe opened a live WAL database read-only and observed an uncheckpointed committed row. It rejected mutation, preserved schema/version/event count, did not create a missing directory, rejected a legacy version-zero database without changing its file bytes, and confirmed ordinary TaskRunner still migrates that database. Normal SQLite cooperation/locking is not treated as a forbidden product-state mutation.
- `independent-cli-probe.mjs D:/gve-anna-render-temp/gvsquality-AvhG1o`: repeated baseline reports matched; standalone and workspace routes matched; optional plan digest and proposed composition matched the bound final fixture. Stale baseline, unrelated review digest, stale shot selector and forbidden output flag were rejected. FFmpeg, FFprobe, browser and narration executable settings were deliberately unavailable. Task records, task events, usage records, schema, user_version and workspace pointer were identical before and after all calls.
- Results are preserved as `independent-probe-result.json` and `independent-cli-result.json`. Both probes use unique isolated scratch directories and perform no production render or destructive cleanup. Run from the repository with `node --import tsx reviews/rsi-showcase-quality-v1/independent-probe.mjs`; the CLI probe additionally needs a retained synthetic fixture root. GVE_REVIEW_REPO and GVE_REVIEW_SCRATCH can override paths.

## Evidence I inspected, not independently reran

- Builder final directed log: 17 tests across four files passed. Includes hand-calculated fit/scale, an interior worst-frame maximum, reveal=1, a last-displayed-frame case, source-edge tolerance, threshold tolerance, missing state and unsupported schema.
- Builder final real-media log: one synthetic image plus 30-fps video test passed in 31.88 seconds. Source of the final retained fixture is `D:/gve-anna-render-temp/gvsquality-AvhG1o`; completed movie SHA-256 is 532ebd3048e1943ab4600810fe84dfefd1bbca83fe7602fb7d3bf80b21f0b295. I inspected test code and final JSON evidence. It tests damaged source bytes, stale workspace binding, real false dimensions, deterministic reports, no state changes and unavailable media tools, and preserves decoded output/phone frames. My independent CLI run subsequently exercised this same final fixture.
- Root runtime regression log: 26 tests across three files passed. Recorded TaskRunner/inputs hashes match the frozen candidate. I inspected this log; I did not count it as my own execution.
- Root retained old-draft finalization evidence `legacy-before.json` and `legacy-after.json` is byte-identical. Both retain source task b3e0fcf97bf5d225bd16e743f9d4506a5fdc5d5c2756e7b12ab5d479194fcd1b and receipt dabc748b2b670757296e6c55952ab068d2e3fa030d4afcbfa5f5372e28287571 with reused=true. I inspected the refactoring against the original code: old buildRevision payload fields, review document construction and draft task identity remain unchanged. I did not independently execute that finalization retry.

## Contract assessment

Q1: PASS. The CLI opens the existing store in read-only mode and reuses completed-baseline, current-workspace and exact revision-plan/review validation. No route starts a task, media subprocess, publication or pointer update.

Q2: PASS for panel-local arithmetic. Shared helpers preserve original viewport sizes, crop easing, independent motion easing, visibility and CSS source/crop/destination geometry. It evaluates integer frames strictly before endFrameExclusive. Per-panel media overrides are correctly selected. Never-visible panels report null metrics. No OCR or perceptual score is manufactured. Occlusion by other panels/overlays is explicitly outside panel-local scope.

Q3: PASS. The versioned report distinguishes 1080x1920 output from assumed 360x640 CSS pixels/DPR1, exposes threshold tolerance, binds media hashes and exact plan, states freshMediaProbe=false, and separates current geometry version from saved renderer environment. Advice is concrete but cannot authorize edits or establish blur, readability or aesthetics.

Q4: PASS within examined evidence. Immutable revision construction remains unchanged and retained pre-change retry evidence matches. Default TaskRunner write/migration behavior survives; read-only access does not ignore live WAL. Renderer-source fingerprint invalidation is intentional and documented rather than silently presented as old-environment cache reuse.

Q5: PASS. Independently executed arithmetic/state/CLI checks and inspected directed plus real-media evidence cover required technical cases. No synthetic test outcome is represented as production quality.

Q7 implementation/docs integration: PASS. Canonical Skill, dedicated user documentation, revision documentation and test catalog contain the new optional relevant workflow and its limitations. GitHub persistence and Drive handoff are release actions owned by the root agent, not actions performed or verified in this review; retain that distinction in the final release report.

## Limits and remaining review boundaries

I did not independently inspect rendered pixels, listen to audio or conduct continuous audiovisual review; Q6 belongs to the separately assigned actual-frame specialist. I did not read that specialist's verdict and do not infer it from test results. Source facts, natural voice, viewer retention, production aesthetics and final owner acceptance remain outside this arithmetic review. No paid calls or new production movie were performed by this reviewer.
