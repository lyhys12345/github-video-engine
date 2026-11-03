# C3 evidence affected-scope recheck

- Role: evidence, independent preview_facts_judge. Read current OPERATOR.md, extracted contract/source and raw artifacts; no peer reports or builder test logs used. Applicable judges-v2 rules retained from C2 and current source.
- Candidate SHA256: `287d61ce50ffe2f5788a7cf304d66b3fb7a4233f504ef5c672cc6a21e8f763e7`.
- All **126** frozen file lengths/digests match; post-review 126 hashes still match. Candidate not modified. Archive reconstruction verifies 472 Git files, source tree `8f8e13d800b677f5205e48aa4909c676eeb45dda`; ZIP comment matches declared source commit `e8372d8ae87dbd6ceb4c1028594a27cb03164c11`. This is tree-byte verification, not commit-signature authentication.
- Own source/work copy and scripts are under judge-facts/engine. Windows/Node24/previously authorized local dependencies; no install, target execution, paid service or publication. Review completed 2026-11-03 12:04 UTC.
- **PASS for version/evidence/reproducibility. Security outcomes are deliberately scoped in security.md; this is not an all-system repair certification.**

## Independent evidence

| Check | Result | Raw record |
| --- | --- | --- |
| Full freeze + archive | 126 entries match, 472-file tree matches | hash-check.json, post-review-hashes.json, archive-check.json |
| Full archived source delta | Exactly 7 modified paths; no runtime change hidden by report summaries | source-delta.json |
| Authoring/ingress regressions | 2 Vitest files, **10 tests PASS**, exit0 | tests.log |
| Shared native helper regression | 2 Node mechanism tests, **2 PASS**, exit0 | mechanism-tests.log |
| Exact original C2 script | Copied unchanged; old expected-rejection assertion exits1 because no movable staging path exists and injected failure never happens | original-c2-probe-on-c3.log, engine/judge-race.ts |
| Both old hooks on new path | Hooks retained with updated observation: writeHook=0, renameHook=0, exact expected bytes published | native-results.json, engine/judge-native.ts |
| Actual native-held operation | Independent copied-helper barrier, other process attempts rename/delete/overwrite: denied; normal completion succeeds; sentinel added before enumeration causes refusal and both files retained | native-results.json/log |
| Boundary after enumeration | Extra child added after enumeration while handles remain open; helper succeeds, expected bytes unchanged plus sentinel retained | postcoverage-results.json/log; not misreported as immutable membership |
| Original legacy failure reproduction | Same C2 probe logic, only exactFiles option omitted to choose legacy mode: both deletion and incorrect-success findings still reproduce | legacy-race-results.json/log |
| Real frozen proposal chain | 7 proposals /46 exact quotations and hashes/version bindings verified | proposal-chain-results.json, sources.log |
| Offline current state | 7 actual copied-state status/export replays and 3 audits pass; fetch throws if used | offline-replay-results.json/log |

The seven source changes are docs/agent-authoring-v1.md, docs/url-intake-v1.md, scripts/mechanism-publish-windows.ps1, src/mechanism/publish.ts, src/workflow/agent-authoring.ts, src/workflow/review-export.ts, tests/agent-authoring.test.ts. The authoring change orders work-package.json/review.json last. New exactFiles uses native exact review; legacy generic path remains distinct. Source ingress/schema/source-binding logic is unchanged and independently exercised by the current tests.

The C2 5-file fresh GitHub source recapture is retained by identical current source digests, not counted as new C3 network execution. Current proposal/source bytes and all46 quotes were rechecked locally. Full regression375/typecheck claims in OPERATOR are not independently certified here; no builder logs were read. No need to rerun costly unchanged media work for this planning-only revision.

## Limits

The original unchanged probe's exit1 is a harness expectation mismatch after removal of its injection point, not evidence of current exporter failure. Separate adapted hooks and native barriers establish the repair. The legacy probe intentionally still reproduces defects. The new path does not freeze directory membership; see postcoverage evidence. Existing installed dependency bytes, all-platform behavior, final visual/media quality, full stress/timeout/cancel campaigns and source-author authentication are unverified. Nothing here erases C2 findings or certifies the old generic exporter under concurrent local writers.
