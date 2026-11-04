# Independent c1 → c2 architecture/evidence/contract review

Candidate SHA-256: `1951af4ca1208146aafefd1f1aa9e19bf1dd34da92b7f7fc1ffda5439aab2146`.

**PASS_BOUNDED; no blocker or major found.** The CLI exit-code repair works for both newly computed and verified cached failures, and preserves historical task identity and report bytes. This verdict concerns the documented author-declared timing diagnostic, not semantic review, transcription or listening acceptance.

## Frozen identity and actual change

Independently verified all **77** manifest entries (safe unique paths, lengths and SHA-256), both candidate identities and the old/new exact source ZIP hashes. Compared fresh extracts of both source archives: **603 files; 600 byte-identical; exactly three declared differences**. The c1 source identity had already been independently checked against Git base `9720af310bccfb32d2ecceabe86b663d937d0a7d`; that unchanged base evidence is reused rather than represented as a new Git-tree execution.

The only changes are `src/cli.ts`, `docs/presentation-timing-check-v1.md` and `tests/presentation.test.ts`. The executable boundary prints the existing result and sets `process.exitCode = 2` only for action `timing-check` with `declaredTemporalChecks === 'failed'`. Status/export do not trigger this condition. Error handling remains the existing structured-error path. The checker, shared visual predicates, report schema, spec bytes, task fingerprint and parent/CAS verification are unchanged. No profile bump is necessary for an exit-only change that does not redefine diagnostic derivation.

I read OPERATOR, actual contract, implementation and source diff. I did not read the preserved product-judge report or use builder replay logs/scripts as proof. The candidate manifest/operator necessarily contain stated results; the findings here come from the independent checks below.

## Independently executed process and history tests

I copied my own c1 judge states into this judge directory. For each of the four cases, I ran the new executable against the exact old specification, status and export, then created a fresh specification by adding one newline and ran it twice. The newline changes raw-spec identity without changing the declared relationship. All **22 direct CLI processes** met the asserted result and exit contract:

| Case | Existing c1 cache | New uncached run | New cache | Status | Export |
| --- | --- | --- | --- | --- | --- |
| rembg original comparison, failed | 2 | 2 | 2 | 0 | 0 |
| rembg retimed comparison, passed | 0 | 0 | 0 | 0 | 0 |
| Express HTTP, passed | 0 | 0 | 0 | 0 | 0 |
| Express earlier HTTP cue, failed | 2 | 2 | 2 | 0 | 0 |

Malformed JSON and a missing specification each exited **1**. stdout remained parseable JSON for successful diagnostic execution, including completed failed declarations. Actual `pnpm gve` and `pnpm --silent gve` cache-hit invocations both propagated **2**. The normal wrapper adds an ELIFECYCLE footer; the silent wrapper's stdout parsed as JSON with the expected failed verdict and cached flag.

Each c1 task retained the exact original ID and report object. Exported timing reports were also compared byte-for-byte with my previous c1 exports, not only semantically compared. Report SHA-256 values:

| Case | Preserved report SHA-256 |
| --- | --- |
| rembg original | `86570eb31d869acd50fc292855bccc5f537d40951a740f51dc57dd0e4e3be487` |
| rembg retimed | `f1025fdae5a777eda5ebbad08de038b6c7f8cdb5f9eb487b0662e46c9b9c7c76` |
| Express HTTP | `94bab79b6ab5f51818f6872defd5fe1e11bea9e634157e2d333592607ec6fdc8` |
| Express earlier HTTP | `ac37fd355b2ca3b271b6b3d875332b81b490a6db1f58050060a0fa807031678e` |

All original records in the four private copies were preserved: **161 task JSON rows and 1,389 CAS file instances**, counted across copies rather than deduplicated globally. The raw exported specs remained identical to their original bytes. Existing failed reports remain persisted successful diagnostic tasks with failed declarations; they are not rewritten into different task states merely to change shell behavior.

Typecheck passed and the affected presentation/queue suite passed **35/35** tests. Final identity recheck passed after testing. Source was not modified; test-generated scratch is excluded from the source-file inventory.

## Reused c1 evidence and exact limits

The shared predicate/event-window, source-binding, undeclared-relationship and falsified-report protections are byte-identical to c1. I reuse my c1 independent 1,820-frame model comparison, 19 negative checks, event interruption and 61/62-frame boundary tests by impact assessment. They were not all rerun in c2. My c1 test harness exercised the library API, not the executable exit contract; that earlier bounded pass did not establish shell-gate safety. This review now directly establishes the fixed executable behavior without revising the old report.

The underlying scope remains unchanged: longest continuous overlap of authored caption frames with modeled HTTP/image visual state; not whole-cue containment, speech/sample/word alignment, automatic language inference or semantic approval. Undeclared relationships remain unchecked and speech alignment unverified. A successful status/export operation is a retrieval success, not a passing timing verdict. Queue timing is unsupported. No fresh media render, full decode, pixel review, owner listening, full repository suite or process-kill cancellation test was performed this round. No captured target project was executed and no paid service was used.

## Raw evidence and harness notes

`identity.mjs` / `identity.json`, `process-checks.mjs`, `process-raw.json`, `process-summary.json`, `process-checks.log`, `focused.log`, `typecheck.log`, and `pnpm*-native.*` retain actual checks, argv, stdout/stderr and results.

The first identity harness attempted to compare against my previously used c1 test checkout and detected additional test-output files. I corrected the harness to compare fresh ZIP extracts; this was a harness inventory issue, not a candidate mismatch. Default sandbox creation of the dependency junction and pnpm subprocess execution were denied; narrow native executions in judge scratch succeeded. Initial pnpm logs are retained separately from successful `*-native` logs. Neither condition required editing candidate artifacts or relaxing the assertions.
