# review-binding-c1 / independent reliability-security Judge

- Role: independent reliability/security, common.md v2. Read main AGENTS.md and common.md first. No peer reports read. Builder implementation note read only as scope description; conclusions use own checks.
- Input: candidate.json commit 3236062258f2c02cdc6f702d799de0a9a16a8eba, frozen source-exact.zip and evidence; Windows Node 24.22.1; 2026-11-05 05:16–05:21 UTC.
- Independent output/state: this directory; source-exact.zip extracted to source; fd state copied to fd-state. Shared source/evidence not modified. Local dependency junction only; no network, paid API, publication to external service, target code execution, audio/pixel acceptance.
- Overall: **UNVERIFIED** for exact candidate freeze; behavioral reliability/security checks PASS within stated limits. No confirmed product blocker/major. Freeze manifest has two byte mismatches requiring reconciliation before treating full freeze as verified.

## Conclusion

Receipt is embedded in render input identity and can be reconstructed/reverified without its original filesystem path. Independent real fd status/resume/export succeeds, exports packet/receipt/result, preserves semantic/editorial/AV/owner pending, and does not inherit review into the changed unreviewed revision. Existing unreviewed task identity remains exact. Stale and unresolved receipts are refused by the real narrated-render entry before rendering. Successful task record mutation is refused by the SQLite immutability trigger. No authentication is claimed: identityAuthentication=not-provided and approval=none.

## Criteria and evidence

| Criterion | Result | Evidence / method | Limit |
| --- | --- | --- | --- |
| Frozen version | UNVERIFIED | hash-check.json; doc-mismatch.json; complete 689 source + 755 evidence digest scan | 687 source + 755 evidence match; two docs differ only final CRLF/LF, zip equals specified commit |
| Unreviewed historical identity | PASS | probe-results.json: exact old row unchanged and task id equals sha256 canonical production task input | One genuine fd historical task directly sampled |
| Durable receipt and export | PASS | probe-results.json, task-shape.json; independent copy status/cached resume/export; exported receipt directly verifyFactReview checked | No need for original receipt file; local export only |
| Status reverify | PASS | status reconstructs packet from accepted source/proposal/presentation; persisted update rejected as immutable (negative-results.json) | No malicious DB trigger removal simulated |
| Stale/incomplete/unresolved refusal | PASS | negative-results.json; stale/missing/duplicate/unknown direct verification; unsupported/unverified remain unresolved; stale/unsupported real render call refused | No new media render needed for refusal checks |
| Revision does not inherit | PASS | direct status of e66bdad4... has no factReview; code verified childRender built only from new explicit reviewInput | Existing genuine revision used |
| Cancellation/recovery | PASS, bounded | probe abort signal then cached resume; recovery.log: 27 tests pass, real sleeping children, SQLite/process crash, lock and orphan tests | Media in recovery suite mocked; reviewed-render mid-frame kill not directly repeated |
| Path boundaries | PASS, bounded | invalid ../tasks.sqlite task id refused; url-intake and owned-runtime security regressions pass; receipt parsed bounded UTF8 JSON and export names fixed literals | No exhaustive OS ACL adversary model |

## Independent commands and outputs

Run from source. `node node_modules/vitest/vitest.mjs run tests/fact-review.test.ts tests/url-intake.test.ts`: sandbox result 19 pass/8 environment EPERM failures (focused.log); authorized unsandboxed rerun **27 pass**, exit 0 (focused-unsandboxed.log).

`node --import tsx judge-probe.ts`: sandbox local export hard-link EPERM preserved in probe.log; unsandboxed rerun **7 checks pass**, exit 0, probe-unsandboxed.log/probe-results.json. No frozen file changed.

`node --import tsx judge-negative.ts`: **9 checks pass**, exit 0, negative.log/negative-results.json. First attempted copied DB mutation correctly hit immutable success trigger; script then asserts that rejection. No frozen DB mutated.

`node node_modules/vitest/vitest.mjs run tests/recovery.test.ts tests/tasks.test.ts tests/owned-runtime.test.ts`: **27 tests pass**, recovery.log, real SQLite/process/files with explicitly mocked stage/media payloads.

## Finding RB-R1 — exact freeze mismatch (version evidence gap)

Source manifest lists docs/fact-review-binding-v1.md as 2658 bytes SHA256 9fc037e6cefb964ea59d5bdcbff078230b44090b6b9c3ba8af1c6a4fbf0b1998 and docs/fact-review-v1.md as 3761 bytes SHA256 bcf9cd0556199ea24b98b14128f0fd8b8fcd5d6a910662f3f51dd90078f2de14. ZIP/commit have 2657 and 3760 bytes respectively, digests 0d8d471c8212456a940a5206d78234d0def88a0566da2904ec9d11fb7282bcc7 and b2e8272a11961882243196f7d8c51fd24d2def126afb476e5e294fc8049a556d. Read-only git show confirms ZIP equals specified commit; live builder docs equal manifest. Independent normalization confirms only final CRLF versus LF. No functional code difference demonstrated, but common.md requires one frozen version and forbids silently accepting mismatch. Reconcile/reissue manifest and candidate metadata, then rerun complete digest check. This is UNVERIFIED exact-version evidence, not a claimed security exploit.

## Self limits

No actual listening, frame inspection or owner acceptance. Attributed review does not authenticate the person/agent or prove semantic truth. Direct lifecycle sampled fd; Fastify all evidence digests verified but lifecycle not rerun here. No new full production render. No claim that a receipt has a calendar expiry: stale means candidate/packet mismatch. Full regression builder report is not substituted for independent checks above.
