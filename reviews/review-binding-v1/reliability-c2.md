# review-binding-c2 / independent reliability-security recheck

- Result: **PASS**, within the engineering scope and limits below. Original RB-R1 exact-freeze mismatch resolved.
- Candidate: commit 3236062258f2c02cdc6f702d799de0a9a16a8eba, freeze/2.0, 2026-11-05 05:22:34 UTC. Review performed independently after C1 report; no peer reports read. Main AGENTS/common.md instructions retained.
- Independent source/state/output: this directory. ZIP extracted here; both project task states copied here. No frozen source or evidence changed; local dependency junction; no network, paid APIs, external publication or target code execution.

## Version recheck and impact

Independent verify.cjs walks all 689 extracted ZIP members and all 886 material manifest entries, checks byte lengths and SHA256, and checks both manifest digests plus archive digest against candidate.json. **Zero mismatches** (verification.json). C2 source versus the C1 independently tested extracted source differs only docs/fact-review-binding-v1.md and docs/fact-review-v1.md final newline CRLF/LF; normalization gives equal text. Every other 687 file is identical, including all implementation, contracts, tests, package and lock files. Of C1's 755 evidence entries, 753 remain SHA256-identical; the two tasks.sqlite file bytes differ. Independent logical comparison confirms all 40 fd and 55 Fastify task rows are exactly identical and task counts unchanged (evidence-continuity.json, task-continuity.json). SQLite file-layout/WAL/checkpoint bytes are not used as proof of a task change.

The renderer hash was independently recomputed using the actual providers/local.ts algorithm: recursively sorted src/** path/hash pairs, then package.json, pnpm-lock.yaml, examples/demo.v1.json, canonical JSON and SHA256. Result **0878c28fee4e25b963c5f69cd05b62a5c9adf6cb91ffc04ed1ccc225078ab460** matches C2 candidate. Both Fastify and fd stage task records and their child preview records were independently read from Judge-owned copied SQLite states: all succeeded, all four recorded codeHash values equal this recomputed frozen-source hash. This check reads underlying task inputs rather than trusting the builder's render-source-relation boolean.

## Behavioral revalidation

`node --import tsx c2-probe.ts`, exit 0: independently executed C2 extracted source against own copies of **both** Fastify and fd state; status verifies attribution and keeps semantic pending; resume is cached; fresh local export succeeds; exported packet/receipt independently passes verifyFactReview and matches each candidate receiptHash. See c2-probe.log and c2-probe-results.json. Local export uses authorized unsandboxed execution for Windows atomic hard links.

The C1 independent behavioral results remain applicable by the complete per-file impact comparison, not by a builder assertion: 27 focused tests + 27 recovery/tasks/owned-runtime tests, 7 lifecycle probes and 9 negative probes. Implementation/tests/contracts are byte-identical; 753 original evidence files match and all 95 task rows in the two changed SQLite containers remain exact. Only two source documentation newline encodings changed. Retained checks cover unchanged unreviewed historical identity, durable receipt and reverified export, stale/incomplete/unresolved refusal, revision without inherited review, cancellation/recovery, immutability and path boundaries. Original raw report and raw logs are preserved under ../gve-review-binding-freeze-v1/judge-reliability (relative to freeze parent); this C2 report supersedes only its overall UNVERIFIED exact-version finding.

## Limits and residuals

No unresolved blocker/major in this role. No new full production render, actual listening, rendered-pixel inspection or final owner acceptance; those remain pending. Attributed identity remains unauthenticated, approval:none. Cancellation regression uses real child processes/SQLite/files but mocked media payload; no direct kill during reviewed video frame rendering. No calendar expiry is asserted: stale here means packet/candidate mismatch. C2 is a tested-worktree byte archive with two documented newline differences from git archive; it does not silently claim literal git-archive bytes. No standard changed to resolve the finding.

