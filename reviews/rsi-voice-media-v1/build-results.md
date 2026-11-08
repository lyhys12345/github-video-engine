# VoiceStudio approved candidate — actual build results

2026-11-08. Approved script SHA256 `da6bb1a7af0aef52ac7c6a1128cec8563cce8bedd7b4dbd91f8931692d5a50c7`; exact five narration lines retained. Latest owner continuation authorized generation, not final acceptance or public publication.

Actual local output: `work/rsi-voice-media-v1/candidate-v3/review.mp4`, SHA256 `1aa5d67a7e22356a87848da530a571ddd073de633c12943280c1341bb14b7250`. 47.0 seconds, 1410 frames, 720x1280 at30fps, H264/AAC. FFprobe property checks and full FFmpeg `-xerror` decode passed. Final exact decoded keyframes saved alongside. No paid APIs or target-repository execution.

Five newly generated local Chen-style narration WAVs total39.52s; two existing official sample excerpts make6.65s. Original-speed full narration retained with frame-alignment silence only. Exact PCM sequence hash `7bc6b277153fa0bad231dbc57058e59a52ab48d2828afe1527038f95b988f9fc`. Metadata/transcript receipt matching does not prove audible pronunciation.

Commands executed: `node --import tsx scripts/render-approved-reel.ts --spec work/rsi-voice-media-v1/render-manifest-v4.json --out work/rsi-voice-media-v1/candidate-v3`; `pnpm exec vitest run tests/approved-reel.test.ts` (7 pass); `pnpm exec tsc --noEmit` (pass). Parent independent combined approved-reel/candidate-review run11 pass is overlapping, not18 tests. No full regression.

Independent frame review found clipped heading, poor README crop, obscured mechanism inputs and broken caption boundaries. Repaired all4, preflight rechecked, then final rendered once. First new frames-only attempt failed sandbox localhost EACCES; authorized local browser rerun succeeded; failure preserved. Candidate-v1/v2 and historical dissent remain intact.

This is a reusable experimental reel adapter, not full durable narrative-run integration. Original relative-input manifest is not a portable media bundle. Local voice references/models are not redistributable here. Caption timings remain estimates; continuous motion, naturalness/listening and owner acceptance remain UNVERIFIED/PENDING. Raw independent final reviews are separate reports, not replaced by this builder summary.
