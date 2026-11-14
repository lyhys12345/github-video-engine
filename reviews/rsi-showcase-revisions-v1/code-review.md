# Independent showcase revision code review — original findings

Reviewer: /root/rsi_revision_architect. Read-only source review on 2026-11-13 while implementation tests were still being completed. No source edits, renderer execution or creative/AV PASS. This report must remain unchanged; fixes require a separate recheck.

Disposition: REVISE. Two concrete integration/product findings below. Full frozen-candidate execution and coverage assessment remain UNVERIFIED.

Reviewed implementation: src/showcase/revision.ts, revision-plan.ts, revision-baseline.ts, inputs.ts, cli.ts, portable.ts, runtime.ts, timeline.ts; renderer showcase-reel-contract.ts and showcase-timing.ts; publishAssetFiles receipt validation change. Initial tests/showcase-revision.test.ts was read but not executed during active writes.

Observed file digests (SHA-256):
- revision.ts: 88cf1370ffd35cafdad5cbffbb34d860114440f3f11abb2e815c448eeeefd746
- revision-plan.ts: 6f5fd4e6280b333eaad9424daa66973aa86e9c40a649018ac86eb3c334db3a7c
- inputs.ts: ea1b5b5839ee079410297b2e39a3870e3cf60b5a57befb3d845287be48b018e1

## R1 — P2: direct rendering of a finalized standalone manifest drops its script review

finalizeShowcaseRevision returns both an approved sourceTaskId and manifest.json. The captured source correctly includes standaloneReviewSha256 and the exact provenance/script-review.json. However, the existing public showcase render --data STATE --spec FINAL/manifest.json path calls readShowcaseSpec, which reconstructs SourceInput with only schemaVersion, sourceManifestSha256 and manifest. It neither reads the adjacent script review nor retains its digest. The finalized standalone draft therefore becomes a second renderable source without its independent review closure; subsequent export cannot retain that review. This contradicts the complete finalized manifest/render/evidence path. Resume by sourceTaskId and portable export/import of that source correctly retain the closure.

Required repair: make the supported manifest render route retain and validate the exact script-review binding, or explicitly reject this finalized-manifest route and require its captured source checkpoint. Add a regression covering render/readback/export review closure; do not fabricate a review or weaken legacy standalone compatibility silently.

## R2 — P2: revised storyboard descriptions need not cover the actual shots

ShowcaseRevisionPlan.scriptShots accepts any array of 1–200 descriptions. applyShowcaseRevisionPlan copies this directly into the exact script, and reviewDocument presents it as the revised storyboard. There is no relation to the actual flattened shot count or selectors. A two-shot movie can consequently produce and approve a revision containing one description. The initial unit test actually uses this shape (two media/shots, one scriptShots entry). The timing table alone does not describe the untouched shot's visual content.

Required repair: require one explicitly ordered description per resulting shot, or use exact beat/shot associations. Present the full resulting storyboard for review, including unchanged shots, so the owner can inspect what the newly bound script actually authorizes. Add a missing/extra-description rejection test.

## Findings that appear sound from code inspection

- Baseline reload checks source/render closure, actual saved timeline IDs/text/audio hashes and rounding, rebuilt complete timeline/props, and shot fingerprints without media tools.
- URL workspace prepare/finalize hold the shared lock and reject noncurrent or foreign pinned capture baselines.
- Draft removes owner approval and old script review; fresh script binds the updated storyboard. Finalize checks exact script owner/reviewer hashes and optional readable-document digest.
- Draft verification checks the entire expected file set and exact bytes; final output is built from the reconstructed in-memory payload rather than trusting changed local asset paths.
- Payload publication uses rejectDamagedPublication, so a damaged known published receipt is rejected rather than silently replaced.
- Existing cache keys and immutable runtime are reused; the impact report correctly states eligibility under the saved environment, not guaranteed future hits.
- New standalone review closure is included by inputEntries and validated; portable SourceInput serialization retains it.

## Pending validation

Freeze source and run targeted unit/integration/public CLI checks after repairs. Inspect stale workspace, foreign provenance, draft extra/missing/tampered files, approval failures, exact retry, interrupted publication, optional review closure and historical manifest compatibility. Actual synthetic render/cache/decode/portable evidence and anonymous frame inspection remain separately required by the contract. No inference of perceptual quality or owner acceptance is made.
