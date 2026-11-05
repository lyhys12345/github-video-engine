# Fact review C1 / independent reliability and security

- Decision: FAIL. One major compatibility finding.
- Frozen manifest SHA-256: a36040b61bcefcb8f0e005c109e52d3ad4a32e283d6956fa5c157e9744df1620. Independently checked all six declared entries, see hashes.log. The manifest does not enumerate the complete dependency closure, so this decision is scoped to the supplied checkout and declared hashes.
- Roles: reliability and security, judges-v2 common. Criteria: exact provenance, receipt completeness/binding, safe publication, compatibility with accepted checkpoints.
- Environment: Windows, Node 24.22.1, Vitest 3.2.4, 2026-11-04 Pacific time. Independent source/state/output copies in C:/Users/luyuh/Documents/Codex/fj1104. Read the contract and frozen manifest before implementation summary and reviewed no other judge report. Shared sources and original evidence remained read-only.

## Findings

FR-R1 Major — The public fact-review path rejects a valid and already accepted first-line citation in a UTF-8 BOM source. Reproduction takes the existing URL fixture (its source-2 is a BOM-prefixed CRLF blob), changes the citation to startLine/endLine 1 and quote to U+FEFF followed by // Demo, then runs the public explanation subcommand dispatcher. The real author stage accepted the proposal with awaiting-plan. fact-review threw FACT_REVIEW “Exact citation mismatch: default”. This is a compatibility failure for captured exact bytes already allowed by the session. Existing authorship uses Buffer.toString('utf8'), which preserves the BOM. The new fact reviewer uses TextDecoder without ignoreBOM:true, which removes it. Evidence: tests/judge-bom.test.ts, bom.log. Fix should align citation normalization, then rerun this case and the unchanged suite. Preserve fatal UTF-8 validation and exact-hash checks.

Scope limitation from inspection: the structured packet exposes claims, complete narration and visual objects. Inference reasoning and beat purpose are hash-bound by the proposal but absent from the review text. The latter can become a displayed heading. The documented remit here covers claims/narration/visual units and defers presentation, so this is not counted as a second failing criterion. No inference of truth, reviewer authentication, or production approval is granted.

## Validation

| Criterion | Result | Evidence |
| --- | --- | --- |
| Invalid quote/range/hash/bytes/source, tampered packet, unknown/duplicate/omitted receipt item, stale candidate | PASS | tests.log. Independently ran the two frozen Vitest files, 24 passed. |
| Compatibility with exact BOM-first-line accepted citation | FAIL | bom.log. Independent variation of fixture, one test failed at the public subcommand after author acceptance. |
| Old author/render/revision checkpoints, old MP4 | PASS | real.log, judge-real.mts. Copied real fd state, unchanged status objects and unchanged re-exported MP4 SHA-256. |
| Reuse and tamper isolation | PASS | real.log. Same complete output reused and receipt hash identical. Stale receipt rejected before output. Different payload rejected at same destination. Tampered file in previous publication was excluded from reuse, left in place and replaced by a new independently returned receipt/bundle. |
| Output path boundary | PASS | real.log. Child and ancestor of state, junction ancestor and unrelated existing directory refused. Unrelated marker byte-identical and junction target untouched. |

Commands from the independent directory:

- node node_modules/vitest/vitest.mjs run tests/fact-review.test.ts tests/url-intake.test.ts (exit 0).
- node node_modules/vitest/vitest.mjs run tests/judge-bom.test.ts -t 'separates hidden-file' (exit 1, reproducible candidate failure).
- node node_modules/tsx/dist/cli.mjs judge-real.mts (exit 0).
- tests-first.log reflects execution started before the independent fixture copy completed. real-first.log and real-second.log preserve two judge assertion errors: the shared publisher intentionally reconstructs a fresh verified version for a tampered previous version, and publication serializes canonical JSON. The final probe asserts fresh versus reused and semantic JSON equality.

No target code executed, paid API called, deployment made, or audio reviewed. Live GitHub intake was unnecessary: the BOM case used the repository's mocked Git transport, and real compatibility reused an actual fixed fd source and local media. TOCTOU and concurrent hostile mutations were not independently injected.
