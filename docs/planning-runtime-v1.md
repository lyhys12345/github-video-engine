# Public evidence planning runtime

`pnpm gve explain` integrates the existing evidence→semantic graph→mechanism compiler with durable SQLite tasks and immutable content-addressed artifacts. It generates **no video, audio, browser capture or target execution**.

This is explicitly an **experimental 18-second mechanism plan**, using the existing six typed operations and one connected dependency chain. It is not the approved three-minute REA story, automatic repository understanding, a production creative engine, or an approval. The semantic interpretation is agent-curated. Exact quotes prove provenance; a reviewer must still assess whether the claims follow from them. Production narrative timing/creative plans are a subsequent contract, not silently squeezed into the old experiment.

Run from the engine root:

```powershell
pnpm gve explain plan --spec examples/evidence-planner-v1/rea-evidence.json --root . --data work/planning-runtime-v1/state --out work/planning-runtime-v1/rea
pnpm gve explain plan --spec examples/evidence-planner-v1/rembg-evidence.json --root . --data work/planning-runtime-v1/state --out work/planning-runtime-v1/rembg
pnpm gve explain status --task <task-id> --data work/planning-runtime-v1/state
pnpm gve explain export --task <task-id> --data work/planning-runtime-v1/state --out work/planning-runtime-v1/new-export
pnpm gve explain diff --before <old-task-id> --after <new-task-id> --data work/planning-runtime-v1/state
```

Plan validates flags, graph, source paths, original bytes, UTF-8, hashes and exact citation lines before opening the task database. Each source is captured once and validated against those captured bytes. All source/semantic/compiler input changes create a different fingerprint; output path is excluded. Repeating an unchanged input verifies and reuses committed artifacts. Input/compiler failures never silently fall back to a template.

Every successful task stores `graph.json`, `portable-graph.json`, `compiled-plan.json`, `review.md`, original source bytes, and `manifest.json` in CAS. A human-readable packet escapes untrusted Markdown/HTML and labels documented claims, inferences, rationale, citations and draft status. Consumption checks compiled-plan equality against the current deterministic compiler as well as all stored bindings. This increment supports compiler version `evidence-planner-1`; incompatible future compiler changes must be an explicit migration or fail, not silently reinterpret historical plans.

An export reserves a new output root exclusively. The complete package appears atomically as its `bundle/` subdirectory, and is never published file by file. `.explain-owner.json` is ownership metadata, not an approval. Same-task complete byte-identical exports are reusable; unrelated, partial, linked, conflicting or edited outputs are refused. Windows transient rename locks have bounded retries only while the destination remains absent. Successful planning and successful export are separate outcomes: export failure preserves the already committed plan and can be retried via `explain export` to a new path.

Windows planning state paths have an explicit conservative preflight: generated TaskRunner/CAS paths must be at most250 UTF-16 code units, leaving headroom under traditional Win32 limits. For this runtime the longest suffix is83 characters, so the resolved `--data` path must be at most167 characters. Both the accepted boundary and a deeper real CLI refusal are tested. Too-deep writes fail with `EXPLAIN_STATE_PATH_TOO_LONG`, recommending shorter `--data`, before creating the database, artifacts or output. This does not promise all Windows long-path APIs are supported; status/export do not receive this write-only guard and may read existing long-path state where the filesystem supports it. Use a short local work directory when needed.

Use `bundle/portable-graph.json` with `--root <export>/bundle` to re-verify or plan from copied source snapshots, even after the original workspace files are gone. Because the explicit source paths differ, this import may have a different fingerprint, while preserving the evidence and mechanisms. Original source URLs and hashes are retained. No export reads the mutable originals.

Status/export/diff do not instantiate TaskRunner or open the inspected SQLite file. They capture a bounded stable database/WAL byte snapshot, query their own temporary copy read-only, then verify committed CAS bytes and plan lineage. Missing state is never created or migrated. A changing database snapshot is retried three times, then reported as busy. State snapshots are bounded to64MB per database/WAL; documents to2MB each/12MB total/eight sources.

Diff compares two committed task IDs. It reports source, claim, operation, object, actor and global metadata changes and propagates affected operations along dependencies. These are **semantic invalidation suggestions**, not claims that any rendered media was reused. All records remain drafts with review pending.

Tests: `pnpm exec vitest run tests/explain-runtime.test.ts` (also included in `pnpm test`). Real child CLI processes, filesystem/CAS and SQLite are used; stale-owner recovery uses an explicitly injected stale row after a simulated retryable failure, not a claimed hard-process-crash test. No new samples are produced. Original failing logs and actual acceptance results live under `work/planning-runtime-v1` and `reviews/planning-runtime-v1`.
