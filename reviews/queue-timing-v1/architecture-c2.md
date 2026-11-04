# Independent c2 profile/scope compatibility review

Candidate SHA-256: `66226c461f7e9390ca5c38e450648abef2d168494090d91733036e0e6fe3bd7a`.

**PASS_BOUNDED. No blocker or major found.** Profile 3 explicitly preserves the unchecked occlusion scope in detached reports, including failed reports. Old profile 1/2 reports remain readable/exportable without changed IDs or bytes. The new profile does not add occlusion detection, semantic review or listening approval.

## Identity and actual changes

Verified all **199** manifest entries for unique safe paths, length and SHA-256; both old/new candidate and ZIP identities; and all **610** extracted source paths. Exactly three declared files differ from c1, with **607 byte-identical**: timing-check implementation, operator contract and presentation test. The previous c1 source-to-Git-base verification is reused by impact; no new Git-tree claim is substituted for it. Final identity recheck passed.

The implementation adds historical profile 2 support, chooses profile 3 for newly submitted queue specs, and emits report schema 1.2 with top-level `occlusion: "unchecked"` only for profile 3. Stored profile/spec combinations are still checked. Old profile 1 reports derive schema 1.0, and old queue profile 2 reports derive schema 1.1 without the new field. Queue movement, event ownership/interruption, task/cue/parent binding and longest-overlap calculations are unchanged. This is a versioned report-scope repair, not a changed visual model.

I read OPERATOR, actual contract/source diff and inputs. I did not read the archived product report or builder verification scripts/results. Independent executions used copies of my own c1 judge states, with media tools disabled. Only judge-owned scripts, copies, logs and exports were written.

## Independently executed checks

All seven c1 queue diagnostic tasks were read and exported under the new implementation. Their report objects and raw exported bytes exactly match my original c1 results. None acquired an `occlusion` field, a different schema or a rewritten task ID.

Submitting each exact original specification created a **new uncached profile 3 task**. All seven then passed verified cache, status and export checks. Each new report has schema 1.2 and `occlusion: "unchecked"`, including both failed declarations. After excluding only task ID, profile, report schema and the added occlusion field, the reports exactly equal their c1 predecessors: raw specification digest, parent bindings, task/cue references, event windows, interruptions, intervals, overlap values and verdicts are unchanged. The measured outcomes remain five passing declarations and two failures (11-frame overlap with a 12-frame minimum; zero overlap for an early settlement cue).

One retained profile 1 rembg report was independently read, exported and resubmitted. Its original ID, verified-cache behavior and exact report digest remain unchanged, with no invented occlusion field. The new implementation therefore preserves eight directly tested historical reports in this round. The broader four-report HTTP/image compatibility checks from c1 were not all rerun.

Six separately created, hash-consistent task/CAS report forgeries were rejected with `PRESENTATION_TIMING_INTEGRITY`:

- Missing profile 3 occlusion field.
- Occlusion changed to `passed`.
- Wrong report schema for profile 3.
- Changed computed overlap.
- Profile 2 report with an added profile 3 scope field.
- Profile 1 paired with a queue specification.

These test deterministic rederivation and profile isolation rather than merely corrupting file hashes. I did not change old task rows to construct the forgeries.

Five actual CLI processes confirmed profile 3 pass/cache exit 0; profile 3 failed/cache exit 2; readable failed profile 2 and profile 3 status exit 0; and the unchanged failed profile 1 cache exit 2. Typecheck passed and the focused presentation/queue tests passed **36/36**.

All original records in my copied states remained unchanged: **39 queue-state task rows and 457 CAS files**, plus **39 legacy-state rows and 303 CAS files**. Counts are instances across copies, not globally unique objects. New profile 3 reports and negative fixtures were added without migration or overwrite.

## Facts, reused evidence and remaining limits

The shared card model, captured sources, timing algorithm and rendered composition are unchanged. I reuse my c1 independent task-binding/interruption checks, 22 negative checks, 1,662 current and 528 historical frame-model comparisons, and four decoded/viewed movie boundary frames. These were not represented as new c2 media tests. The c1 p-limit facts and explicitly fictional tiling fixture remain subject to the same illustrative task/order/outcome/time assumptions.

The repair improves the evidence carried by a detached new report: it explicitly says occlusion was unchecked. It does not measure pixel overlap or visibility of all text, prove spoken-word alignment, validate the editorial relationship, or establish full-cue containment. Existing reports intentionally lack the new field; absence must not be interpreted as approval. The exact existing historical reports are preserved rather than silently relabeled.

New queue diagnostics still require plan 1.3. Historical rendering or diagnosis support is not widened. No new media render, full decode, pixel inspection, audio reconstruction, ASR, owner listening, full repository suite or process-kill recovery test was performed this round. No target repository was executed and no paid service was used.

Raw evidence: `identity.mjs/json`, `checks.mts/json/log`, exact profile 1/2/3 exports, `focused.log`, and `typecheck.log`. The checks completed without a harness assertion failure. Native Windows access was confined to judge dependency linkage and the existing atomic publication operations.
