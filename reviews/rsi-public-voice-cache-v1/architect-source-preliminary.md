# RSI public voice cache v1 — architect preliminary source review

- Roles: independent reliability, security and evidence Judge under judges-v2 common instructions; source review only at this stage.
- Active clauses: C1-C4. C5-C8 remain pending final frozen candidate and raw evidence review.
- Baseline: a89acece8debb68aca0a211382b56b6af7dfd164.
- Source checked: src/tts/qwen-public.ts, SHA-256 eb5d46cd756bd38bf7ce2250a6c2b47f02a1856c7dad615654295ab143fc40db (independently computed).
- Date/environment: 2026-11-14; Windows PowerShell, read-only repository inspection through scoped escalation.
- Independent output: reviews/rsi-public-voice-cache-v1/architect-source-preliminary.md.
- Overall verdict: UNVERIFIED pending frozen tests and actual evidence. No source blocker/major found.
- Independence: supplied architecture guidance but wrote no implementation/tests/contracts. Read implementation directly and checked unchanged supporting code. No peer Judge report read. This is not a final acceptance report.

## Conclusion

The code implements the bounded cache optimization without changing task identity or generation manifest. Ordinary misses retain complete model verification before writable TaskRunner construction. Successful hints use zero permitted attempts and normal TaskRunner cache verification/accounting. If the hint disappears, TaskRunner rejects before claiming an attempt; the callback also rejects replay-only execution defensively. Final generation reading still verifies canonical manifest, exact input/task binding and audio bytes.

The intentional model-readiness semantic change is explicit in the contract and draft docs: valid cached artifacts can survive unavailable model weights; configured profile, Python and small current identity inputs remain required. No observed source path starts unchecked synthesis or silently regenerates corrupt cached artifacts.

## Clauses and evidence

| Clause | Source finding | Independently inspected evidence | Limitation |
| --- | --- | --- | --- |
| C1 | Satisfied by source inspection | Input/KIND/manifestFor/readPublicVoiceGeneration unchanged; TaskRunner.run existing cache branch verifies artifacts and records receipt | Final tests and real byte-identical reuse pending |
| C2 | Satisfied by source inspection | prepareIdentity returns lock and current identity; verifyModel retains inventory and full hash loop; probe always calls it; only replayOnly skips it | Model byte counters and real miss/probe observations pending |
| C3 | Satisfied by source inspection | state/sidecars checked; readTask bounded immutable snapshot checks identity/schema; UsageTaskSchema parses task state; ordinary miss verifies model before TaskRunner; attempts zero rejects races | Exact unsupported-version message is maintenance coupling; regression tests pending |
| C4 | Satisfied by source inspection | checkAbort before TaskRunner and final return; worker timeout/offline/cleanup code unchanged; no global mutable state or background process introduced | Cancellation, timeout and usage behavior not independently executed in this preliminary pass |
| C5-C8 | UNVERIFIED | Final frozen candidate and raw evidence not yet supplied | No final PASS |

## Inspection record

- Get-FileHash -Algorithm SHA256 -LiteralPath src/tts/qwen-public.ts; success; matched supplied SHA above.
- git diff -- src/tts/qwen-public.ts and full file read; success.
- Read supporting TaskRunner.run, TaskRunner constructor/schema migration, readTask, UsageTaskSchema, baseline adapter tests, contract and current guide/results draft.
- Verified TaskRunner success branch occurs before max-attempt check; absent task with maxAttempts zero rejects before setting a row or starting a receipt. Running/permanent-failure states also reject before ownership claim.
- Verified exact EXPLAIN_STATE plus Unsupported task state version fallback only denies optimized cache eligibility: subsequent full verification and TaskRunner retain valid legacy migration and future-version/schema enforcement. Other schema/integrity failures propagate.
- Earlier exploratory read used the nonexistent tests/public-voice-adapter.test.ts name; this produced a file-not-found result. Located and read the correct tests/qwen-public-adapter.test.ts afterward. No tests were run by this preliminary inspection.

## Findings

No blocker/major established. The version-error-message coupling is a documented maintenance risk, not a demonstrated defect; valid legacy, future version and malformed state tests must remain in final evidence.

## Security boundaries

The cache hint is not trusted as an artifact or as permission to synthesize. Existing task/artifact verification remains authoritative. Profile and model locations remain local Windows paths; no additional download, network call, paid API, private asset, daemon or target-repository execution was added. Concurrent adversarial replacement outside the existing filesystem trust assumptions was not penetration tested.

## Judge limitations

No GPU execution, listening, media decode, timing validation, final test review or frozen-candidate evidence verification in this preliminary pass. Builder timing messages are not acceptance evidence. Final review must bind code/tests/docs and inspect raw results independently. Existing hash-check-to-worker filesystem race assumptions are unchanged; this pass does not claim an OS sandbox.
