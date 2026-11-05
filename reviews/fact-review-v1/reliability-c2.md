# Fact review C2 / independent reliability and security

- Decision: PASS for the independently checked reliability and security criteria. FR-R1 closed.
- Frozen manifest SHA-256: a4013b74981c70af65e228d96c89e6fb76ebec2919adbb8875a004216bd2a93a. All eight declared files matched. The manifest does not enumerate the full dependency closure.
- Environment: Windows, Node 24.22.1, Vitest 3.2.4, 2026-11-04 Pacific time. Independent directory C:/Users/luyuh/Documents/Codex/fj21104. Candidate and original evidence were read-only. No other judge report used.

| Criterion | Decision | Evidence |
| --- | --- | --- |
| FR-R1, original C1 BOM first-line citation | PASS | The original independent fixture and test were copied byte-for-byte from the C1 scratch directory. The BOM-prefixed CRLF source, exact first-line citation and public fact-review dispatch now succeed. bom.log. |
| Neighboring provenance and review coverage | PASS | Frozen suite 27/27. Wrong quote/hash/line/source/bytes and invalid UTF-8, tampered or stale packets and incomplete/unknown/duplicate receipt entries still reject. Existing non-BOM and CRLF fixtures remain covered. Inspection confirms inference reasoning and beat purposes are exposed. tests.log. |
| Historical accepted author, render, revision | PASS | Copied real fd state. Three checked status objects were unchanged before and after review sidecar publication. Re-exported historical MP4 matched its prior SHA-256. real.log. |
| Receipt binding, retries, tamper isolation | PASS | Exact repeat reused the same receipt hash. Stale receipt from the original manuscript rejected for revised author and produced no output. Different payload at the same path refused. Altered earlier publication was not reused, and a fresh verified bundle was published. real.log. |
| Output paths | PASS | State child, state ancestor, junction ancestor and unrelated existing directory refused. Junction target and unrelated marker unchanged. real.log. |

Commands, all exit 0 on the completed independent copy:

- node node_modules/vitest/vitest.mjs run tests/fact-review.test.ts tests/url-intake.test.ts
- node node_modules/vitest/vitest.mjs run tests/judge-bom.test.ts -t 'separates hidden-file'
- node node_modules/tsx/dist/cli.mjs judge-real.mts

The initial independent copy omitted the existing font assets and URL story fixture. The retained *-first.log runs record those setup failures. The final results used the corresponding candidate files, with no candidate or original-state changes. The real probe reused captured fd source and media and performed no live GitHub intake, target execution, new rendering, deployment or paid calls. It did not test concurrent hostile path replacement or reviewer authenticity. Semantic conclusions and owner acceptance remain outside this verdict.
