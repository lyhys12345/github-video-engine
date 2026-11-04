# Independent targeted review — timing-check CLI exit repair

Candidate `candidate.json` SHA-256 `1951af4ca1208146aafefd1f1aa9e19bf1dd34da92b7f7fc1ffda5439aab2146`, matching requested version. All 77 listed lengths and SHA-256 independently verified; zero mismatches. The prior raw product report and images remain in `gve-timing-check-judge-product`. Candidate was not modified, no other judge report read, no target repository executed.

## Result: PASS for the previously reported exit-code problem

I extracted exact source and copied separate v1 original/retimed states to this adjacent isolated folder. I added only whitespace to retained spec bytes to produce new identities while preserving their declarations; this is a fresh diagnostic against existing retained parents, not a new video render.

- Failing original rembg declaration: fresh task `53be4251502ccffe57ab8fee201ccfb72470693466559d5e26699ce20c87c9ea` returned native Node exit **2**, `cached: false`, `state: succeeded`, `declaredTemporalChecks: failed`, and the full structured report. Repeating the same exact spec returned the same task, `cached: true`, verdict failed, native exit **2**. Captured stdout/stderr are `fresh-fail-*` and `repeat-fail-*`.
- Passing retimed declaration: fresh task `06082f1da80a05469e45c7ac2eccd78b2508a52edbec83b3d2c627d2dd97f8d6` returned exit **0**, `cached: false`, verdict passed; repeat returned exit **0**, same ID, `cached: true`, passed.
- `timing-check-status` and fresh `timing-check-export` on the failed task both returned **0** for successful retrieval while preserving `declaredTemporalChecks: failed`. The exported `timing-report.json` remains present in `failed-export`, SHA-256 `6f8de9e2187129f14287a77f2359030e61ab17d5251904eca7cd818f6f964cc9`. Status and export on the passing task also returned 0 and retained passed; its exported report SHA-256 `74812cbd9ad656ee1da441763106a20c81ea899fb44cb4b0138cb4a2cc7225c9`.
- Empty-object invalid spec returned native exit **1**, distinct from completed failed check exit 2 (`malformed-stdout.log` and `malformed-stderr.log`).

On this tool's PowerShell command wrapper, an uncaptured nonzero native process surfaced as wrapper exit 1; I explicitly captured `$LASTEXITCODE` immediately after Node and observed native 2 for both fresh and cached failing checks. Thus the above distinction is based on the actual child process code, not the wrapper's normalized return. This independent check used direct Node CLI; package-manager wrapper behavior was not independently rerun.

This addresses the original risk for shell consumers honoring the command's native exit status. Status/export 0 means report retrieval succeeded, not that declared checks passed; the verdict remains explicit in both responses. Author declarations and unchecked relationships remain scoped, and a passed report does not establish picture/source semantics or spoken alignment.

No new media, continuous viewing, listening, speech alignment or owner acceptance was assessed. Prior independent visual findings remain as recorded; this is a CLI semantics re-review only.
