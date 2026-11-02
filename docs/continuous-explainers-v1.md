# Bounded continuous explainers

The two current local deliveries are `examples/continuous-explainer-v1/rea-v5/segment.mp4` (51.8667 seconds, 1556 frames) and `examples/continuous-explainer-v1/rembg-v4/segment.mp4` (32.5667 seconds, 977 frames). Both preserve the full new Chen recording at its original playback speed. Each has a 0.4-second lead, a minimum 0.6-second tail, 1080×1920 H.264 yuv420p at 30 fps, and AAC stereo audio at 48 kHz. This is a pair of bounded teaching explainers, not full-film acceptance. Current completion and independent review are recorded separately in the candidate manifest and raw reports.

One schema, timeline compiler, composition and renderer serve both operations. `presentation: continuous-explainer` adds a measured output band and ordered `hook/inspect/connect/execute/test/resolve` stages. `kind` selects the generic rule-building or mask-application operation; there is no project-ID dispatch. The older bounded segment presentation remains supported.

REA keeps the same source-to-rule-to-runner workspace throughout. The source condition `<13` and update increment `.001` remain separate from the authored demonstration range `6→12`. The moving road integrates the current speed. Manual control begins at the actual last automatic speed, then follows a labeled authored slider trajectory. rembg defines one original illustration and one subject geometry, applies a real luminance mask to that same original, and magnifies a crop of the same masked source. Checkerboard transparency and the later new background sit behind the retained foreground. Both visibly disclose instructional reconstruction and the absence of target-project execution.

The current generation receipt associates each exact submitted text with its captured MP3 hash, selected Chen identity, reported free UI settings and actual measured source duration. Continuous mode rejects a caller-only transcript change when the captured voice hash is bound to a different receipt text. This proves submitted-text/byte binding, not listening or speech transcription. Original MP3s, the receipt, screenshot and FFprobe output remain in `work/chen-continuous-voice`.

Captions use text-weighted allocation within the measured continuous recording. The JSON records source-time and output-frame windows, and the SRT and burned-in captions share that cue table. Filenames, spoken decimal words and common mechanism terms remain together; small final lines are balanced. Timing is explicitly estimated, not forced alignment. Listening, exact spoken synchronization, pronunciation, voice naturalness, continuous audiovisual rhythm and final human acceptance remain pending. Historical G4 UNVERIFIED records are preserved.

New renders may instead provide `cueTimingPath` in the segment input. The strict timing sidecar binds the exact audio SHA-256, transcript SHA-256 and measured duration, and supplies one reviewed boundary per caption phase plus the final audio boundary. It accepts either manual-listening boundaries or reviewed forced-alignment boundaries. Stale hashes, duration drift, missing/non-monotonic boundaries and sub-four-frame cues fail before rendering. The sidecar and its hash are copied into the output and fingerprint; this improves timing evidence without claiming transcription accuracy, voice quality or final owner acceptance. Omitting it preserves the explicitly estimated text-weighted fallback.

To recreate the current source inputs in a clean versioned directory, first inspect `scripts/prepare-continuous-stories.ts` and `scripts/prepare-continuous-inputs.ts`. They refuse to overwrite existing source bundles/input files. Current rendering uses the trusted local browser and FFmpeg runtime:

```powershell
node --import tsx scripts/render-short-segment.ts work/continuous-explainer-v1/inputs/rea-segment-input.json <new-rea-output-directory>
node --import tsx scripts/render-short-segment.ts work/continuous-explainer-v1/inputs/rembg-segment-input.json <new-rembg-output-directory>
```

The renderer rejects destination reuse, captures the complete verified source closure, locks the font and implementation bytes, measures the original audio, renders actual frames, muxes without speech retiming, probes the exact final frame count/format/duration and fully decodes the final MP4. A source change during a render rejects that result. Browser startup and the owned worker have bounded watchdogs. Sandbox browser launch failed in retained v1 attempts; normal local browser permissions completed later attempts. Processes are terminated by their owned PID tree, never by browser name.

`scripts/prepare-continuous-revisions.ts` preserves the originals and prepares independent narration and asset fixtures. Narration revision uses a genuinely new exact-text Chen recording and its matching receipt. Asset revision changes only the consumed `visual-style.json` color and re-closes its source manifest; narration, caption/timeline, source story and compiled bytes remain unchanged. An unreclosed asset is rejected. `scripts/verify-continuous-rejections.ts` records actual stale-voice and asset-tamper failures before output creation.

Current revision outputs are `rembg-narration-v2` and `rembg-asset-v2` beside the primary deliveries. The separate `work/continuous-explainer-v1/revisions/rule-proof-v3` contains before/after actual silent three-second MP4s: only the authored demonstration endpoint changes `12→9`, while the factual condition/increment remain `<13` and `.001`. These are explicitly bounded revision proof clips, not narration deliveries. `revision.json` records changed dependency hashes and invalidates the old output/review binding. `actual-revision-verification-candidate-3.json` verifies each separate axis and preserved original media hashes.

The earlier candidate and pre-fix media remain preserved. Candidate 1 failed review because its visually similar background wipe did not actually apply the displayed mask, and the automatic-to-manual handoff reset speed. Candidate 2 applies the actual mask, preserves speed and integrated travel at handoff, and repairs the observed caption wrapping. All affected outputs are rerendered from the same corrected implementation before freezing. No paid API, publication or target repository/model execution occurs in this workflow.

Candidate 3 additionally keeps “助手” and “没撞上” together in REA captions. It rerenders the full affected REA video and fresh rule excerpts. Exact old/new rendering-function comparisons cover every frame of the three rembg media (977/961/977 frames); all SVG bytes are identical, so their existing MP4s and captured implementations are explicitly reused. Only 355 REA frames change, within the two observed caption clauses. The impact report and frozen manifest distinguish the new top-level caption implementation from each reused output's original captured implementation.

Focused validation:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/short-segment.test.ts tests/continuous-segment.test.ts tests/frame-preview.test.ts tests/voice-handoff.test.ts
```

Frozen source, dependencies, font, exact source/audio closures, commands, probes, decode results, sampled images, revision receipts and independent raw reports are under `reviews/continuous-explainer-v1`. Freeze hashes identify each candidate; old verdicts do not transfer to changed source or media.
