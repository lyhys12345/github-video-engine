# M3 actual engineering results — independent gate pending

## Current source and complete media

Current codeHash is `09da69a3488985661f3356a0b9b4ee43cccc0b4a5f6d8b422cfb784abc1867df`. Actual194/194 tests in21files and typecheck passed (`work/m3-regression-snapshot.log`, `m3-typecheck-snapshot.log`). Mock media/worker/review fixtures are explicitly labeled. Independent installation passed192 tests and6 real CLI cases on the preceding75bd source; after the exporter-only change, exact09da passed59 affected tests/typecheck and a fresh public-CLI12second render/cache/audit/probe/full decode. Unchanged relevant source hashes retain the six-case result; counts are not added across repeats. See `work/m4-clean-install-validation/` and `exporter-update/`.

| Current identity | Actual value |
| --- | --- |
| Authorization task | `eb91408501825dcdc9a01e0c5f158eb66d4471485d51907ae8b8a363f598e0bb` |
| Full render task | `f98411c2e4fb4aabfeadd7c8c14db0bbec24ed9c4c367a79d7ced135baf5ced8` |
| Clean MP4 SHA256 | `6395243e1ae7cc63d7146d8cdafc07f94bcfed4a3c9d3cf7c1576ad52207e0e5` |
| Captioned MP4 SHA256 | `9cc10d7d68717bff68db5be7cf1b3e5fe4826ffe7a8b14072ae9f6be173c15a3` |
| Result artifact | `3c925abba946f34b64a8838c10c76b071494add2d0100113bc22e362ad801f7a` |
| Draft manifest | `557c021a192efa04641e33cbb5c486373840e28f5ea2bdeed4cd94751019ce6d` |

Actual new draft: `examples/rea/final-review-v2/`. Both57.4second/1722frame/1080×1920/30fps H.264/yuv420p limited-range/AAC videos passed FFprobe and whole decode. Narration has exactly2,755,200 PCM samples at48kHz; subtitles use7 sentence/scene cues, not word alignment. Actual duplicate render/export were cached; operations-audit/1.3 passed; external verification checked63files/34,184,623bytes against the independently retained manifest hash. The first draft/source remain preserved. Two total primary full-render scope attempts were spent across versions; the new task-local attempt1 is not a budget reset. Intermediate unused preparation receipts also remain.

## Current recovery and standalone proof

The shared owned-runtime repair covers M0/M2/M3; [ADR0004](adr/0004-owned-browser-runtime.md) records actual failures and the sidecar/locator decision. Real force-kill, cancellation, held-file retry, startup cancellation, scope/cache and source-history checks are retained in `work/m3-recovery-validation/`, `m3-cleanup-current-integration/`, `m3-cleanup-investigation/`, `m3-temp-safety-precheck/` and the clean installation evidence. Current M2 component recovery interrupted at54/210frames and resumed the same task to a real7second H.264/AAC MP4 with probe/decode and temporary-resource/CAS/history checks (`work/m2-cleanup-current-integration/validation-report.md`). Hard-crash incomplete temporary work can remain tracked until same-task resume; instantaneous garbage collection is not claimed. Earlier global profiles are retained as forensic evidence.

Failures are not hidden: V6 observer-race failure and supplemental observation of the same successful attempt both remain. The M2 seed-wrapper and SQLite readOnly sidecar errors were harness failures; four newly created sidecars were archived and removed only after all original bytes matched, restoring exact source inventory. Successful seeding read private database copies. No gate was granted by these technical fixtures.

The current editable export actually installed219 pinned cached packages/downloaded0 in a new directory outside engine ancestry, typechecked and ran its public render command twice sequentially. Both complete57.4second/1722frame/1080×1920 H.264/AAC outputs passed whole decode, PCM/subtitle/snapshot checks. Initial input/map and7 copied WAV hashes verified; all21/19 captured owned process birth identities exited and private payloads/sidecars were absent. The original63-file draft was reverified unchanged. Report: `work/m3-standalone-final-validation/verification.md`; structured results: `run-2026-10-26T16-36-29-097Z/final-summary.json`.

Only `/design/scenes/0/title` changed: “复制以后，去了哪？” → “复制之后，去了哪？”. Actual MP4 frames show the edit; opening-frame SSIM0.996032, the other six sampled frames hash-identical/SSIM1 in this case. Narration/SRT/VTT were byte-identical. This is a local proposed edit, not an approved engine correction or G3/G4/G5/G6. Whole-video byte identity is not promised. The separately reproduced input/map reread and mutable-WAV race is fixed by initial byte/audio snapshots; mock-media mutation tests and the real rerenders are distinguished. Source-code edits during a live standalone run are outside this snapshot guarantee.

## Remaining release steps

Freeze exact source/media/static state/proofs and run all six independent M3 roles. After their gate passes, actually issue engineering G5, create a new local export and obtain separate affected-role postcondition acknowledgments. M4 final workflow/cost/audit closure and its six-role gate remain separate. Actual listening/continuous viewing, subjective voice/pacing/mix and owner G6 remain pending under the explicit authorization.

---

## Historical first integration record

The following original intermediate record is retained verbatim for version history. Its pending-work descriptions are superseded by the current results above; its original source/output identities remain historical evidence.

The owner explicitly authorized deferring listening and continuous perceptual AV review to final review on 2026-10-26. The exact authorization is `reviews/owner-av-deferral-2026-10-26.json`. Historical M2 G4/J3/J4 UNVERIFIED reports remain unchanged. This record grants no G4 PASS or G6, paid service, deployment, or target repository execution.

## Executed baseline

The integrated source passed 171 tests in 17 files and TypeScript checking. Logs: `work/m3-regression-integrated-initial.log`, `work/m3-typecheck-integrated.log`. Filesystem/SQLite/controller tests using simulated media or review reports are identified in their tests; those do not establish real rendering or perceptual quality.

The public final CLI actually prepared conditional authority, rendered, repeated the identical request, exported, repeated the export, and passed read-only operations-audit/1.3 against `work/m3-live-state`. Actual command/result records are in `work/m3-primary-evidence/` and `work/m3-primary-*.log`.

| Identity | Value |
| --- | --- |
| Approved production package | `b6d1ca0d760e8bd788b71b52756577bd2ee559883cdedbdfc24a782fcbb6be40` |
| Authorization task | `234fd002507c8af2f6ed0a9b84ae150134f49395f4584e56ac703a0b0a8df9ae` |
| Full render task | `f180f88ae848e9a3b28f444c2c0c3834233e2e3bb4cac0da782ea8cdd8b41201` |
| Clean MP4 SHA256 | `01ca4f4c631dcf76759d5e054a3ba4c6e570dd0a009323a1d6ef0479c32e5741` |
| Captioned MP4 SHA256 | `9cc10d7d68717bff68db5be7cf1b3e5fe4826ffe7a8b14072ae9f6be173c15a3` |

Actual media: 57.4 seconds, 1722 frames, 1080×1920, 30 fps, H.264/yuv420p limited range and AAC. Both MP4s were FFprobe inspected and fully decoded. Objective PCM and encoded-AAC loudness/peak checks ran; these are not listening. The final PCM has exactly 2,755,200 samples at 48 kHz. A real first finishing failure lost 1441 trailing samples; the corrected output preserves its entire original PCM prefix and adds silence only. Raw failure and comparison are retained in `work/m3-real-finishing/`.

The local engineering draft is `examples/rea/final-review/`, with clean/captioned MP4, narration, SRT/VTT, cover, evidence, timeline/usage/version records and editable source. It is explicitly awaiting owner review, not final accepted delivery. G5 engineering lock and all six independent M3 reports are still pending.

## Active verification and known finding

Real force-kill and cooperative cancellation/restart experiments operate separate explicitly identified validation stores, preserving primary attempts/history. The first interruption reached 25 rendered frames; captured owned processes exited, but the owned Puppeteer temporary profile remained. This is a real cleanup defect under investigation; no successful cleanup is claimed for that case. Evidence: `work/m3-recovery-validation/`.

The exported editable source was copied outside the engine ancestry to `C:/Users/luyuh/Documents/Codex/work/m3-editable-clean-20261026`. Initial restricted pnpm link creation failed with EPERM (retained log). A native offline frozen-lockfile installation then installed 219 packages from the existing local store, downloaded zero, and its TypeScript check passed. This proves a fresh project dependency tree using the local cache, not a clean-machine/network installation. Actual standalone rendering and edited-output verification remain pending.

## Remaining acceptance

Finish real interruption/cancellation/recovery and fix/retest findings; actually rerender the separate editable project; inspect actual portrait sample frames; freeze exact evidence/source and complete all six required independent roles; create a bound engineering G5 receipt and final local package. M4 full workflow/cost/version/recovery audit remains separate. Actual listening, continuous playback, subjective pacing/voice quality and final G6 remain with the owner.
