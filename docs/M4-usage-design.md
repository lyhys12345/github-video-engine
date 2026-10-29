# M4 usage ledger engineering slice

This is UC-01–08, not full M4 or a G4/production approval. The accepted operations-audit 1.0 candidate remains archived in `reviews/M4/preflight-4/frozen/`. The current audit report is **operations-audit/1.1**; usage receipts and summaries have their own schemaVersion 1.0. No new dependency, paid service, remote price lookup or repository execution is introduced.

## Durable accounting

`src/operations/usage.ts` owns strict policy, receipt and task validation plus bounded aggregation. TaskRunner owns SQLite transactions and execution. ProductionStore supplies the policy at its existing trusted provider call sites; the imported design/spec cannot select an arbitrary paid provider or price.

The tasks database upgrades from user_version 0 to 1 by adding `usage_events`, its unique receipt/boundary indices and update/delete guards. Only the exact known legacy schema or an empty new store is admitted. Unknown/partial layouts and future versions fail. Migration is transactional, rechecks the version under the write lock, and retains old task JSON, attempts and task events byte for byte. It never invents old receipts. CAS and the M0 job database are unchanged.

A start receipt commits in the same transaction as the ownership claim. A terminal receipt commits with the task result/failure. Receipt failure rolls the state transaction back; callback output already in CAS can remain unreferenced, but cannot become a successful task. On stale-owner recovery an observed abandoned start receives an `interrupted` terminal with **unknown duration**, then a distinct next attempt starts. Expired owners cannot publish terminal state. Missing legacy attempts remain explicitly missing.

Each receipt binds task fingerprint, input version, kind, attempt, owner, time and policy. SQL columns must agree with JSON. Successful attempts are immutable and cannot precede a later attempt. Unique starts/terminals, owner/policy/time agreement and latest state agreement are checked. SQLite guards protect normal application updates, not malicious administrators who rewrite both the database and its guards. This is not an externally signed billing journal.

## Money and time semantics

Only `windows-sapi-offline/local-zero-v1` and `remotion-local/local-zero-v1` currently have a calculated provider charge of zero. Generic callbacks without an explicit policy have **unknown charge**. Calculated local provider fees are not paid invoices, a commercial Remotion license, hardware, app/model usage, human time or a complete project cost. Public output keeps `actualPaidUsd` and `totalProjectCostUsd` null. If any attempt has unknown charge, the all-covered provider total stays null; the known subtotal is separately available.

Terminal `wallDurationMs` measures the observed local execution interval from the claim/start through work and result publication, before final cleanup. It is not CPU time or provider-exclusive time. Interrupted intervals are null; crash downtime is not fabricated. Cache receipt duration **0 is a no-provider-work sentinel**: the time spent reading/verifying cached files is not measured. Cache hit and cache integrity failure are counted separately, do not spend an attempt, and do not re-bill the original work. Historical uninstrumented cache reads are not inferred.

The low-level TaskRunner accounting policy is trusted application code. It is not a provider attestation and cannot prove that an arbitrary custom callback actually used the named provider. The two built-in production call sites identify their actual local tools. New paid providers would require a new rate/receipt contract and authorization.

## Interfaces and compatibility

```sh
pnpm gve production usage --id rea --data <existing-data-root>
pnpm gve audit --data <existing-data-root> --out <new-report.json>
pnpm run test:usage
```

`production usage` is the regular runtime interface: opening a legacy runtime may migrate its tasks schema. For observation that must leave the source unchanged, use `audit`; it reads bounded stable main+WAL copies and never instantiates the migrating runner. Audit supports both legacy 0 and current 1 layouts and rejects unsupported accounting schemas, missing immutable guards, duplicate/conflicting boundaries and SQL/JSON identity mismatches. It does not repair, resume, approve or rerender. Existing per-database snapshot limitations still apply; it is not a cross-database atomic snapshot.

Aggregation is bounded to 10,000 rows per covered table, 32 MiB combined task/receipt JSON and 100,000 declared attempts. Capacity exhaustion fails explicitly; it does not truncate to a green report. No archival/pruning strategy is implemented yet. TaskRunner validates the entire accounting store before applying a project display filter.

## Remaining milestone work

No full project cost model, paid provider, version-diff/local-revision workflow, full M3 output or cross-project production proof is delivered by this slice. M2 G4 still lacks qualified actual AV review; historical UNVERIFIED remains. Real local readthrough and static rendering in a copied approved G2 state validate provider wiring and receipts, not listening, visual quality or production authority.
