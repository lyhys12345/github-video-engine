# Independent showcase revision code recheck

Reviewer: /root/rsi_revision_architect. Date: 2026-11-13. Original report code-review.md is preserved. No source edits or new media renders by this reviewer.

Disposition: PASS for the repaired code paths and independently executed targeted regression scope below. No remaining blocker/major identified in that scope. Full module acceptance still requires the separately running synthetic media fixture, its output closure inspection, historical-manifest compatibility evidence, and anonymous frame review. No creative, listening, continuous AV or owner-acceptance PASS.

## Candidate identity

SHA-256 of inspected source at recheck:
- src/showcase/revision.ts: b53bdd79a72b6ebbbc69ffefe59f18d3c1d7465262e2a645b2e87a2b0cb01805
- src/showcase/revision-plan.ts: 5898018ad7b2f4e95d5490f2a9b00825ed004e3ee224b90634c93c4da426572c
- src/showcase/revision-baseline.ts: 591fb5cabfeb42ad604ec7de37e980cb455437ce29bc6f34768f82a841f69fee
- src/showcase/inputs.ts: 7ea017e70e435bc4554c7ef6975d78ccc9495bfb933d10a4368ade24e3c54c3a
- src/showcase/cli.ts: a9889eca494b25c1fed95a19cb5287c79663c7c1e4524575fbfc61cb4575d001
- src/renderer/showcase-reel-contract.ts: e6a1f8a10d5052cd1ba76a296bfb51df59f6ba38c5e3277014f738f96734002e
- src/story-planner/asset-pack.ts: 5850d20911f04588a5b396f2d8037a6ff74e2bdcae77cf455ed88928bc86a2f2

## R1 recheck — fixed by inspection; end-to-end media exercise pending separately

The finalized standalone manifest now contains scriptReview with the exact review digest. sourceEntries reads and normalizes this asset; readShowcaseSpec derives standaloneReviewSha256 from it. inputEntries rejects a mismatch between these bindings and disallows simultaneous standalone and URL provenance. validateSource validates the exact passing script review.

New revision scripts include reviewPolicy: independent-script-review-required. Because this marker is inside the script whose hash the owner authorizes, removing the optional manifest review cannot silently downgrade that approved script to legacy standalone behavior. Existing historical scripts without the marker keep their old compatibility path. Revision preparation removes prior owner/reviewer bindings. URL finalization still uses exact source provenance and fresh review; portable SourceInput retains both supported closure variants.

The new media test explicitly covers ordinary finalized-manifest rendering producing the same sourceTaskId, removed review rejection, mismatched review binding rejection, and exact review retention on export/import. These assertions were read; execution belongs to the separate builder media run and is not claimed here.

## R2 recheck — fixed and regression executed

applyShowcaseRevisionPlan rejects a scriptShots count different from the exact flattened beat/shot count. reviewDocument iterates every resulting shot in beat order, associating its description with beat ID, zero-based index and full resulting shot specification. Both changed and unchanged shots are therefore inspectable. The independent targeted run passed the missing-description rejection regression.

## Additional closure/retry inspection

Finalization now requires the preparation receipt digest. It derives the matching receipt filename from the prepared staging bundle, checks the supplied digest, and compares the complete canonical task/file inventory against the recomputed baseline and plan before checking every draft file. Extra, missing, damaged or linked files are refused. In-memory reconstructed payloads are used for final publication/source capture, so mutable original author paths are not trusted.

prepare/finalize hold the existing workspace lock and enforce the exact current render/source/candidate and pinned source capture. Finalize does not advance the movie pointer or render. Exact output retries use existing receipt checks, while changed review/approval bytes produce different publication identity and cannot replace an occupied output. The strict damaged-publication option remains opt-in; unrelated callers retain existing recovery behavior.

Impact uses reconstructed saved measured audio timing, exact before/after shot payloads and the saved renderer fingerprint. Global presentation edits can invalidate all shot payloads. The result states cache eligibility under that saved environment; actual reuse and decoded media remain separate evidence.

## Independently executed validation

Command:

    pnpm exec vitest run tests/showcase-revision.test.ts tests/showcase-draft-contract.test.ts tests/showcase-reel.test.ts tests/approved-reel.test.ts tests/showcase-durable.test.ts tests/asset-pack.test.ts tests/cli-routing.test.ts

Actual result: 7 files / 35 tests PASS, 30.21 seconds, exit code 0. Scope includes strict revision selectors and unsupported edits, original narration preservation, invalid cue placement, draft non-renderability, exact approvals, pinned workspace provenance, shot-local cache keys, ordinary showcase structure/timing, public URL CLI argument guards, and existing asset-pack closure/recovery. The asset-pack suite exercised its existing local media/probe paths; this reviewer did not launch the new showcase media renderer.

Typecheck PASS was reported by the builder, not independently rerun here. The revision media suite was inspected but not duplicated while the builder performed its sole run. Full integration/provider/Python regression was not run. Historical real manifests and resulting media/package closure will be recorded in separate follow-up evidence rather than retroactively treating this scoped report as broader validation.
