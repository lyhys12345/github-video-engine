# Five-module RSI engineering cycle — 2026-11-13

Candidate source snapshot: `943ee43` (the final result/report commit may follow it). Scope: the five modules in [the audit](rsi-readiness-audit-2026-11-13.md), implemented as one connected local workflow. No paid service, target repository code execution, deployment, new production film or change to the accepted README film occurred. Existing private voice references and model weights remain outside Git.

## Delivered behavior

| Module | Implementation and actual evidence | Boundary |
| --- | --- | --- |
| Durable cinematic workflow | `src/showcase/` wraps the established reel renderer in persistent source and shot tasks. URL source capture, approved script, storyboard and exact media receipts are bound together. Real browser render was killed during shot two, resumed under the same task, and reused shot one. A one-shot edit reused unaffected work; stale approval was rejected. Export/import into a new workspace reproduced the synthetic MP4 hash. | The session agent still authors the supported manifest; arbitrary prose is not automatically converted to a good film. The real fixture is 12 synthetic frames with TEST_ONLY approval, not a production creative evaluation. |
| Capability-aware onboarding | Planning no longer needs browser/media/voice tools. `doctor --capabilities` checks the requested phase. Both an intentionally silent MP4 and a video with imported original-speed WAV were rendered, exported and imported. The original WAV hash is preserved. New exports bind the exact reviewed author and brief; pairing an old preview with a changed brief is rejected. | Imported text/speaker identity are declarations, not ASR or rights verification. Local synthesis retains the configured owner's voice and never silently substitutes another. Exact Anna/Chen references are not supplied to new users. |
| Local speech and timing diagnostics | `alignment report` decodes real WAV, measures internal silence, accepts versioned local timing evidence or the installed offline Windows recognizer, and retains confidence/missing words/action offsets. `alignment cues` produces a hash-bound caption draft. Actual approved ArtCraft audio measured 3.12 seconds and a 0.2185-second internal silence. | Native recognizer confidence was poor for part of this example. Uncertain timings remain null/review-required. The draft is not renderable approval, does not rewrite captions or retime audio, and does not establish naturalness. |
| Multimodal RSI | `rsi-media` freezes real A/B media, scripts, briefs and sources; records exact observations; persists a fixed-reviewer, three-attempt repair chain; detects replacement of accepted raw observations; and reports ties/regressions/pending results. Existing VoiceStudio, Worldknow and engine films were copied/hashed with extracted audio and a decoded frame. | These three real-media exercises used identical A/B controls. They validate packet integrity and restart behavior, **not a quality improvement or a creative holdout win**. Missing actual AV observation stays UNVERIFIED. |
| Release and portability checks | All 100 test entrypoints are explicitly classified; nested omitted tests, duplicate entries and stale entries fail the catalog. A manual-only Windows GitHub workflow is pinned and fails immediately on command errors. Fresh committed source was installed in a new directory with no previous node_modules/work databases; checks and an actual 12-second MP4 smoke passed. | Same Windows computer, existing pnpm cache and system Chrome/FFmpeg; not a new machine or macOS/Linux/Claude certification. GitHub-hosted workflow was not run. |

The shared Codex/Claude Skill routes to these actual CLI paths. It keeps independent script review and owner approval before new video generation. Historical architecture/setup pages now point to the current [support matrix](support-and-release.md).

## Executed checks

Counts below overlap; do not add them as distinct test coverage. The full integration/provider/Python regression was deliberately not run.

| Check | Actual result |
| --- | --- |
| `pnpm typecheck` | PASS in main working copy and fresh source directory. |
| `node scripts/check-agent-entrypoints.mjs` | PASS in both locations; static local files/frontmatter only. |
| `pnpm test:catalog` | PASS: 100 entries — 24 unit, 60 integration, 7 media, 1 optional, 2 Node, 1 Node-media, 2 provider, 3 Python. Classification is not execution. |
| `pnpm test:unit` | 24 files / 141 tests PASS in main; also PASS in the fresh directory with browser, FFmpeg, ffprobe and Anna profile paths deliberately nonexistent. Independent release reviewer also ran that group under missing-tool overrides. |
| Showcase contracts/approval/durable tests | 21 PASS by builder; independent recheck including public alias routing: 22 PASS across 4 files. |
| `tests/showcase-durable.media.test.ts` | 1 real test PASS, 72.53s; actual process kill, stale lease recovery, cache invalidation, full decode, exact candidate review and portable fresh import/rerender. |
| Capability, review and portability targeted suites | Independent final recheck: 9 files / 40 tests PASS. Re-export of the original reviewed author succeeded; changing only audience rejected the old render. |
| `tests/capability-narration.media.test.ts` | 1 real test PASS, 97.486s; silent and imported-English-WAV preview/portable round trips. |
| `tests/speech-alignment.test.ts` | 6 tests PASS using real FFmpeg and synthetic WAVs plus explicitly fixed imported timing evidence. Real Windows recognizer separately exercised on existing approved audio. |
| RSI media/repair/experiment suites | 10 PASS; independent recheck also 10 PASS. Contract fixtures contain synthetic bytes/reports and are not AV reviews. |
| `pnpm install --offline --frozen-lockfile --ignore-scripts` | PASS in `D:/gve-rsi-release-943ee43`: 219 packages reused, 0 downloaded, 33s, pnpm 11.25.0. |
| Fresh source `pnpm test:smoke` | 1 real test PASS, 53.80s: actual Remotion, fault after committed render, new CLI-process recovery, FFprobe/full decode, repeat-job deduplication and invalid-input rejection. |
| Actual owner voice preflight | Anna configured Python/CUDA readiness PASS after accounting for a 64.685s cold import; Huihui exact installed voice check PASS. Neither check generated or listened to new speech. |

Fresh source was created with `git archive 943ee43` and expanded to `D:/gve-rsi-release-943ee43`. No owner profile, reference audio, models, original state or prior node_modules was copied. During planning checks, GVE_BROWSER/GVE_FFMPEG/GVE_FFPROBE/GVE_ANNA_PROFILE pointed to nonexistent files. A real read-only GitHub capture of `sindresorhus/escape-string-regexp` pinned commit `a7f7dabaf336bda98d2166848af15d9168b10bcf` and produced a session authoring packet without media tools or a model call. The CLI packet alone is an authoring checkpoint. The delegated session author then read the pinned files and authored a five-scene plan (three supported document diagrams and explicit evidence/adapter gaps). A second public CLI run, still with media tools unavailable, persisted narrative task `55ddbffdc7ccb05656c94482bc7ab007894549584311ce812f08ed17ca4a7d5a` and author SHA-256 `b500b38159994bcaaf5c7c326483027d6ea5422473287ef94f70067fc8323918`. Its actual status is `checkpoint-complete`, `through: planning`, `scriptReview: pending`, with no approval or generated media. The executor dispatched zero model calls; authoring was performed by the session agent, not by that deterministic command. The proposed preferences and script still need their real review/approval before production.

## Inspectable outputs

- Fresh-source smoke: `D:/gve-rsi-release-943ee43/demo-output/demo.mp4`, 693326 bytes, H.264 720×1280, 30 fps, 12.000 seconds, video-only. SHA-256 `cedecc5ea4bf87b50dbea013af9b535de78cecbd4b6ad0578e614a0d1c23c938`. Adjacent evaluation, job status, recovery proof and distinct sampled frame hashes are retained.
- Durable showcase fixture: `D:/gve-anna-render-temp/gvs-3MFT8M`; output SHA-256 `65a36f3c19d4414a71af2104362cc2a090c73856f44c7ec09e4ebc7b02026241`. Separate frame-only run actually published frames 1 and 8. See [exact validation](showcase-runtime-validation-2026-11-13.md).
- Silent/imported narration fixture: `test-output/workflow-byo-HGoQm6` and `test-output/workflow-cap-media-package-HOj9x6`. The independent reviewer reopened each portable import and probed actual streams.
- Speech report/draft: `work/rsi-five-modules/speech-alignment/`; exact report SHA-256 `3e0bb4a123fee5301c1eee652a7cf68923044eb5710f000f10fcaf19c5f2e42f`.
- Real-media RSI controls: `work/rsi-five-modules/media-real/result.json`; all three media integrity checks verified, all perceptual reviews UNVERIFIED, zero improvement claimed.
- Fresh-install logs copied to `work/rsi-five-modules/clean-release/`; originals remain in the release directory.

Local work/logs/databases/generated artifacts are deliberately ignored by Git. They do not travel with a clone. Source, repeatable test fixtures, documentation and the scoped raw reviews do travel.

## Findings fixed and evidence retained

Independent review caught an old preview being exported under a changed creative brief, raw RSI observations replaceable without changing the legacy report digest, a nested test silently omitted by the initial inventory, and URL showcase resume capable of selecting standalone material. Fixes bind committed author/brief/review, bind the raw observation digest into the inherited review chain, recurse the test inventory, and verify resume provenance plus the approved storyboard. Changed author data no longer inherits a prior script receipt.

Other integration corrections included conditional omission of optional approval data (the canonical serializer does not accept undefined values), cold voice-runtime preflight timeout diagnostics, and explicit URL alias argument guards. A too-short 0.25-second imported test tone correctly failed caption readability; the synthetic fixture was lengthened to 1.2 seconds without relaxing that guard. Source edits during early media runs correctly invalidated fingerprints; final media checks ran on frozen source. Original failures and scoped REVISE reports were not converted into PASS.

Independent reports and rechecks: [showcase](../reviews/rsi-five-modules-v1/showcase-review-recheck.md), [capability/approval](../reviews/rsi-five-modules-v1/capability-review-recheck.md), [speech](../reviews/rsi-five-modules-v1/alignment-review.md), [RSI media](../reviews/rsi-five-modules-v1/media-review-recheck.md), [release](../reviews/rsi-five-modules-v1/release-review-recheck.md), [fresh-directory inspection](../reviews/rsi-five-modules-v1/fresh-install-review.md). The reports state what each reviewer actually executed or inspected.

## Remaining product validation

The five engineering modules are implemented; this is not a claim of industry certification, authenticated reviewers, guaranteed voice quality, or audience retention. Remaining work needs different evidence: actual improved approved A/B films with continuous listening/viewing, a genuinely unfamiliar creative holdout, new-user onboarding on another computer, macOS/Linux and actual Claude sessions, and operator-run hosted CI. The owner must choose original-code distribution terms; third-party media/model/reference permission remains separate. No new license or voice redistribution right is assumed.

Next RSI cycle should use one owner-approved production storyboard, retain the accepted reference, and compare the actual new media through the new frozen packets. The engineering loop is bounded; low-confidence or unavailable modalities remain visible instead of being waived to reach a completion percentage.
