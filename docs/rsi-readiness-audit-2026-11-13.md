# RSI readiness audit and first repair cycle — 2026-11-13

Base revision: `27d6916a1d89a3403a3a627aea0407018bd55839`. Scope: inspection of the current local engine and skill, three delegated code audits, two reproducible reliability repairs, and targeted validation. This is not an exhaustive source/security audit, a new video evaluation, or an industry certification.

## Assessment

The repository has a real execution foundation: versioned contracts, pinned source evidence, persistent jobs, atomic content-addressed artifacts, explicit approval receipts, recovery, editable exports and bounded RSI attempts. Preserve these.

The principal product gap is consistency between the polished showcase production path and the standard URL workflow. Successful owner-produced videos do not yet prove that an unfamiliar user can produce equivalent results from a clean checkout. Source review, media review and actual user satisfaction are different evidence.

## Completed in this cycle

1. **Release workspace ownership after environment setup fails.** Before the fix, `runNarrativeWorkspace` acquired its lock before calling `environment()`, outside the protected try/finally. A missing browser caused BROWSER_MISSING, then a same-process retry incorrectly reported another owner. Environment setup is now inside the protected scope. The real-filesystem regression checks two failures, removal of the lock, and successful reacquisition. Added to the explicit default test list.
2. **Keep the finding reviewer throughout an RSI repair chain.** Previously attempt one could receive REVISE from A and attempt two receive PASS from B. The apply path checked reviewer continuity, but ingestion and saved terminal review auditing did not. Both now reject replacement. Tests check rejection without corrupting the chain, acceptance of the original reviewer, and rejection after a saved terminal reviewer is changed with a recomputed report hash.
3. Clarified showcase documentation: original-speed video is the default; authored action anchors can retime source footage. Narration remains at original speed.

These checks enforce consistency of declared reviewer IDs, not authentication of agent identity. A process that can rewrite the entire trusted local chain is outside that integrity guarantee. Existing mismatched historical chains are rejected rather than silently rewritten.

Independent scoped code/test review: [raw report](../reviews/rsi-industry-audit-2026-11-13/fix-review.md). The independent reviewer tested the fixed version, not the pre-fix version. Builder repros and reports are distinct from independent review.

## Prioritized modules

| Order | Module | Current evidence / gap | Observable acceptance |
| --- | --- | --- | --- |
| 1 | One durable path for high-quality reels | `scripts/render-showcase-reel.ts` owns cinematic layouts, cue cuts and action anchors; `src/workflow/narrative-run.ts` still uses story previews. Showcase is not integrated with TaskRunner/CAS or common portable export. | Register a versioned showcase adapter in the existing runtime. Exact source/script/media/review bindings; repeat reuse; interrupted render recovery; one-shot edit invalidates only affected work; export/import in a fresh workspace. Reuse existing approved material for technical checks. New script/video candidates still require their own approval. |
| 2 | Capability-aware onboarding and configuration | Doctor checks storage and media executables, not voice readiness. Planning also requires browser/FFmpeg. A brief can represent en-US, no voice, reference voice and BYO voice, while the unified narrated path currently accepts zh-CN/local profiles only. | A capability manifest and phase-specific preflight report what can run before requirements are offered. Research/script work needs no render environment. Clean checkout without owner work files reaches script review; unsupported choices explain the exact missing adapter. Add user-supplied finished narration and a real silent path before claiming support. |
| 3 | General speech/caption/action alignment | The speech checkpoint measures whole recordings and tail gaps, not internal silence. Showcase caption cues are authored estimates. The existing forced-alignment experiment contains fixed REA/rembg inputs and MLX assumptions. | An optional local adapter takes arbitrary approved transcript/audio, stores confidence and phrase boundaries, flags internal gaps/missing words and action offsets. Retain original audio, low-confidence review and intentional pauses. Actual naturalness still requires listening; timing metrics never substitute for it. |
| 4 | Multimodal RSI evaluation | Current freeze/repair stores A/B text files, despite supporting modality labels. The actual MP4/WAV/frames and all associated media are not frozen as an evaluation bundle. | Versioned immutable evaluation package with candidate media, exact script/brief/sources, raw reports and observed modality coverage. Blind baseline/candidate comparison on two project categories plus a held-out repository; track regressions and ties. Keep the fixed rubric and three-attempt bound. Missing AV capability remains UNVERIFIED. |
| 5 | Maintainable release and portability | Default test command uses a manually enumerated list; 16 of the original 83 test files were not listed, including some intentional separate media tests and several important workflow tests. No tracked GitHub Actions workflow was found. Claude entry checks are static. | Classify every test as deterministic, integration, real media or optional provider, fail on unclassified tests, and add clean-checkout release validation. Publish a tested OS/host/capability matrix. Keep media checks targeted during development. Verify Claude separately when available; never infer it from Codex. |

This ordering is a product recommendation, not a claim that these modules have been implemented. Module 1 should first expose a minimal adapter contract and small contract-level tests, then pause for approval if a new script/video is needed for perceptual comparison.

## Additional useful features after that path is stable

- **Reference/brand profiles:** persist typography, palette, caption rules, desired pacing and user reference preferences; allow the story and shots to follow project evidence instead of forcing a fixed template.
- **Multi-platform / language variants:** platform-safe framing and real English narration support, sharing approved facts and reusable assets. Current arbitrary strings in a brief do not prove actual output support.
- **Incremental natural-language revisions:** extend existing feedback support to the showcase adapter, with a preview of changed claims, scenes, voice regeneration and cache impact before applying.
- **Storage operations:** inspect artifact reachability/size, diagnose corrupt cache, propose quarantine or rebuild; garbage collection defaults to dry-run and protects accepted media and audit evidence.
- **Stage-specific dependency fingerprints:** the current global source code hash invalidates more rendering work than necessary; move carefully to explicit adapter dependencies with invalidation tests.
- **Publishing experiment kit:** extend the existing cover/subtitle/platform-copy exports with two hook variants and a place to import actual user-supplied performance results. No automatic posting and no claim that Judge preference predicts retention or stars.

Do not add account systems, distributed services or a marketplace merely to appear enterprise-ready.

## Remaining release decisions and documentation debt

- The tracked root has no license for the project's original code. The owner must choose a distribution license; do not invent authorization for upstream code, fonts, footage, model weights or voice references.
- Anna/Chen references and local profiles remain private and absent from Git. A fresh clone must not promise these exact voices.
- Some architecture/setup pages retain M0-era statements (for example, no M1/providers or generated media) that are no longer a current capability inventory. Preserve historical reports, label them as historical and establish one current capability source of truth.
- The Google Drive handoff currently tops out at the 2026-11-10 migration, whereas the inspected repository includes Nov 11 skill/renderer changes. Repository revision and actual runtime evidence take precedence over stale handoff claims.

## Validation record

Before the fixes, the seven selected RSI/review/brief/reel test files passed 30 tests. That result did not cover either newly reproduced bug.

Final repaired candidate:
- `pnpm run typecheck`: PASS.
- `node scripts/check-agent-entrypoints.mjs`: PASS; static local routing/frontmatter only.
- `pnpm exec vitest run tests/narrative-run-recovery.test.ts tests/narrative-run.test.ts tests/rsi-repair.test.ts tests/rsi-experiment.test.ts tests/candidate-review.test.ts tests/creative-brief-runtime.test.ts tests/creative-brief.test.ts tests/showcase-reel.test.ts tests/approved-reel.test.ts`: **9 files, 40 tests PASS**, 28.15 seconds.
- Independent reviewer reran `tests/rsi-repair.test.ts tests/narrative-run-recovery.test.ts`: **2 files, 3 tests PASS**; this overlaps the 40 above, not additional distinct coverage.
- `git diff --check`: PASS before save.
 No paid service, target repository execution, new audio/video rendering, fresh external-owner install, full regression, actual Claude session, or continuous audiovisual review was performed in this audit. Existing approved media and local references were not changed.

The next RSI cycle should record one hypothesis, a frozen baseline and exact acceptance criteria; make a small implementation; run targeted checks; obtain independent review; fix/recheck; then save a Git checkpoint. New videos still require approval of their complete script and storyboard.
