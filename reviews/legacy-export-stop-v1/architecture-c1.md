# Independent review: legacy PlanningPackage export shutdown

Candidate SHA-256: `a9f84cbf89c2cc45e5d4ed08a81ee4e639c358bd2395cecea599f0378be6d383`.

Verdict: **PASS_WITH_MINOR** for the bounded shutdown and normal compatibility scope. No blocker/major found. One stale instructional document should be annotated. This is removal of the affected public publishing path, not a repair certification of the retired implementation or all exporters.

## Frozen source and scope

Verified candidate, source ZIP, source manifest, OPERATOR, all 19 evidence files and both declared historical-reference hashes. Verified 641 extracted source files. Independently archived Git base `8864a9b8aa027cd8b9488dc88c5514539104a07e` into judge scratch and compared every source file: exactly the nine declared changes, the other 632 byte-identical. Raw verifier/result: `identity.cjs`, `identity.json`.

Source ZIP SHA-256: `8922583574831be49adf2c136839a0e9a0307663c97e9e2f819d5a587ed62c01`.

Read actual changed source, OPERATOR and affected docs. Builder test summaries are not proof for this report and builder verification scripts were not executed. No attack or concurrency reproduction was authored or run. No target code, paid service, new synthesis/render, external publication or review-bypass mechanism was used. New files and normal API exports reside only in this independent judge directory.

## M1 — Minor: historical design still presents the disabled command as runnable

`docs/M1-design.md:12` lists `pnpm gve project export ...` under “可运行入口”. Line 16 still says identical exports can be reused. This document does not currently label that command as retired. Current CLI help, operator runbook, URL intake documentation and authoring documentation correctly describe the shutdown, so this is not a code-path or data-preservation failure.

Recommended correction: add an explicit current-status annotation identifying this section as the historical M1 interface and stating that legacy PlanningPackage file export now returns `LEGACY_EXPORT_DISABLED`; do not rewrite old judge FAIL reports or suggest an unsafe fallback. This avoids presenting historical capability as a current instruction. No candidate documentation was changed by this judge.

## Actual shutdown behavior

Source inspection confirms three fail-closed entry points:

- `workflowCommand` rejects `project export` after positional syntax checking, before data resolution, ancestors/database checks, or `WorkflowStore` construction.
- `WorkflowStore.export` immediately calls `rejectLegacyReviewExport`, with no revision lookup or filesystem operation.
- `publishReviewExport` requires `options.exactFiles === true`. Omitted/false options immediately return permanent `LEGACY_EXPORT_DISABLED`.

The former default branch's staging creation, path-based rename and recursive cleanup are removed, not merely guarded behind a new trust flag. There is no new CLI unsafe flag, same-user trust confirmation or fallback publisher. The explicit existing native authoring path remains; its implementation is unchanged. The receipt-based explanation exporter is separate and unchanged.

The disabled command no longer creates/re-exports generic PlanningPackage `review-input.json` and `review.md`. It still refuses when an output directory already exists and matches previous content. Old revision/source/approval records and preexisting directories are not migrated, erased or reclassified. The two legacy security findings remain historical failures; this bounded mitigation makes their retired product path unavailable.

## Fresh independent normal checks

`normal-checks.mts` contains normal API/CLI scenarios only:

1. Default helper, helper with `exactFiles:false`, and workflow CLI API each reject both a missing destination and an existing owner-authored review directory: six calls, all permanent `LEGACY_EXPORT_DISABLED`.
2. A normal Store method invocation with a revision-call counter rejects without calling `revision`: no Store constructor or database is needed for this check.
3. A real public Node CLI invocation with absent state/output parents exits 1, has empty stdout and explicit permanent `LEGACY_EXPORT_DISABLED` stderr. Both named paths and their missing output parent remain absent.
4. Exact file inventories/hashes of the private copied state and the existing owner review directory are unchanged across disabled calls.
5. Both retained real Fastify and p-queue explanation tasks status successfully; first receipt exports and ordinary duplicate exports succeed with verified reuse. All 53 Fastify and 63 p-queue payload files match the original reviewed c3 exports byte-for-byte.
6. Both projects' actual `openAuthoring` and `exportAuthoringProposal` APIs publish through the explicit native path. Ordinary duplicate exports preserve every byte. Author packets contain 10/8 files and proposal exports 6/5 files respectively. Proposal hashes match the session's source-bound proposal, and semantic/editorial/audiovisual review remains pending.
7. All 46 original task records and all rows in the six workflow tables (`approvals`, `authoring_proposals`, `events`, `projects`, `revisions`, `sources`) remain identical after the normal export checks.

Raw results: `normal-checks.json`, `normal-checks.log`, retained normal export directories. The real source/audio/media were not re-generated, re-fetched or creatively re-reviewed; receipt-byte equality is the evidence applicable to this publication-only delta.

## Selected tests and compatibility

Independently ran TypeScript `tsc --noEmit` successfully. Ran only the selected normal workflow tests matching `persists source|refuses |public project CLI reads`: **5 passed, 7 intentionally skipped**, as recorded in `normal-tests.log`. These cover ordinary source/plan revision persistence and deduplication, refusal with missing/existing outputs, state byte retention and public history/status behavior. The public history test's delegated G1/G2 records are explicitly synthetic fixtures in isolated test directories; they are not real approvals of this candidate or owner acceptance.

No full suite, adversarial export test, filesystem replacement race or old SEC-1/SEC-2 reproduction was run. This restriction follows the assigned scope and does not weaken the direct evidence that the old publishing branch is gone and its normal entry points refuse before relevant writes.

The unchanged native publisher's previously documented membership/after-handle-release limits remain. This review does not certify all other export implementations, privileged-host resistance, absolute filesystem isolation or a new safe generic publisher. Existing `project evidence/research`, TTS and unrelated final-output paths are not newly audited here.

## Conclusions

- Shutdown architecture / normal safety boundary: **PASS_BOUNDED**.
- Historical state/artifact preservation and current explicit exports: **PASS_BOUNDED** for executed paths.
- Documentation: **minor M1**, stale historical design instructions need an explicit annotation; active operator docs/help are accurate.
- Former concurrency failures: preserved historical evidence, mitigated here by retiring the reachable publisher, not retroactively converted to PASS.
- Product 90% completion, semantic automation, owner listening and final audiovisual acceptance: not established by this change.
