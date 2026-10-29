# M4 usage ledger — executed evidence

Scope: `reviews/M4/usage-contract.md` UC-01–08. Independent review is a separate step; these engineering results do not certify full M4 or M2 G4. Candidate and raw reports live under `reviews/M4/usage-1/`.

## Executed verification

- `pnpm test`: **94 tests passed in 10 files**, `regression-history-fixed.log`. These are fast contracts/workflow/runtime/audit tests. They use real SQLite, filesystem/CAS and owned subprocesses; the voice/image/callback fixtures in these tests are simulated. No real MP4 smoke/acceptance suite was rerun for this ledger change.
- `pnpm run typecheck`: actual result is recorded in `typecheck-final.log` for the final candidate, separately from test counts.
- `pnpm exec vitest run tests/usage.test.ts`: an added forged-history regression initially failed, proving the aggregator accepted an old successful terminal before another attempt. `history-initial.log` is retained. The validator now rejects it; the full 94-case rerun includes the regression.
- Initial integration regressions and the old invalid expired-owner test fixture are retained in `regression-initial.log` and `usage-integration-initial.log`. Subsequent fixed runs are separate files. The expired-owner fixture now expires an actually running held callback, rather than contradicting a previously committed terminal receipt.
- The crash test actually starts and kills its own Node child, waits for the lease to expire and resumes via another runner. Prior receipt JSON is retained; the abandoned interval is recorded with null duration. It uses a simulated callback, not a killed production video render. Historical M0/M2 real render-recovery evidence is separate.

## Real local providers, isolated state

`work/m4-usage-real.mjs` copied the preserved approved G2 state into `reviews/M4/usage-1/real-execution/state/`. The original 55 source files were hashed before/after and unchanged. The copy's known legacy tasks database migrated 0→1: **8 old task JSON rows and 16 task events retained**, with no fabricated historical usage.

The actual public `production readthrough` command generated **7 Windows SAPI PCM WAVs**. FFprobe inspected each audio stream and hashes were checked. A duplicate submission returned the same task with `cached:true`; it did not add an attempt. The readthrough remains measured-not-yet-listened, 1722 frames at 30 fps (57.4 s); no hearing/AV quality PASS is claimed.

On that same isolated copy, actual `production stills` generated **7 Remotion PNGs at 720×1280 plus a contact sheet**. The duplicate was cached with the same task identity. No new video production or approval was requested. All 8 PNG signatures, dimensions and hashes were inspected; no aesthetic PASS is inferred from them.

`real-provider-proof.json` and `real-usage-rows.json` bind the two providers to six accounting receipts: 2 starts, 2 terminal records and 2 cache hits. Recorded local execution intervals were 1013.0559 ms for SAPI and 5206.3552 ms for static rendering. Both explicit local policies calculate zero provider fees. **Eight historical attempts remain unknown; the all-covered total, actual paid total and full project cost remain null.** These intervals are one run's measured observations, not benchmark claims.

The public read-only audit passed on the copied state, kept source file bytes/set unchanged in the readthrough proof, and reported partial coverage. Its final two-provider report is `real-audit-both-providers.json`. The proof helper initially failed because SQLite rows have null prototypes while parsed JSON rows do not; `provider-proof-initial-error.log` preserves that verification-script failure. Comparing exact id/data strings fixed the helper; no runtime history was rewritten.

## Limits

Only this Windows/Node 24/local Chrome environment was exercised. No paid APIs, target repository execution, deployment, billing invoices, full project fees or qualified AV review. A calculated local zero rate does not certify software licensing. Cached read verification time is unmeasured, distinct from zero provider work. The preserved M0 MP4 and accepted operations preflight remain separate historical candidates. New source does not inherit their exact-version approvals. Formal milestone and final user acceptance remain incomplete.
