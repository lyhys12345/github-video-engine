# Current-story Chen short segments — bounded architecture and acceptance

Architecture/final reviewer, 2026-11-01. Prepared before implementation review. User authority as relayed by the coordinator: use the previously approved Chen voice for current narration, make one short REA and one short rembg segment, calibrate timing/subtitles/transitions; no full movie; any paid work needs advance approval. Historical AV UNVERIFIED and final owner listening/continuous audiovisual acceptance remain unchanged. This is a bounded follow-on feature, not a reopened M1–M4 milestone gate.

## Exact source selection

The accepted asset closure proves local captured assets, source linkage and timing receipts. Its final review explicitly says current story recordings are absent and does not approve a film. Current source scripts are `examples/story-planner-v1/rea.json` (SHA256 d67deb6074686b773f97bb18bca3c613af514eb8a04c5c93ba1eb88bd8369607) and `examples/story-planner-v1/rembg.json` (bae703f6860331f912d72c3af5a99b129ffd1c6a6fc4abe43535d7e31eff56c4). All narration below is selected verbatim, without rewriting or silently recycling old speech.

REA: original shot-5 only, in its original sentence order:

> 官方的小恐龙案例，就拿到了游戏的 index.js。沿着这份代码，可以找到加速分支：没撞上、也没到上限时，每更新一次，速度就加一点。

rembg: original shot-3 followed immediately by original shot-4:

> 它先让模型预测前景蒙版，用蒙版标记需要保留的区域。再用蒙版处理原图，背景变透明，主体得以保留。

Working duration estimates are approximately 17 and 13 seconds, respectively; they are not measurements or rigid maxima. Render each separate segment from its actual measured recording, with small lead/tail holds. Keep each below 30 seconds unless the natural unmodified recording itself demonstrates a need to revise the estimate. Never speed up or truncate speech to fit an estimate. No complete-story render is authorized by this contract.

## Voice identity and provenance

Historic local metadata: `work/owner-revision-1/teaser-v4-voice/manifest.json` and `examples/rea/revision-1/teaser-v4/REVIEW.md`. Provider: ElevenLabs logged-in Free account web UI. Displayed voice: **Chen Mandarin Chinese**. Model: **Eleven v4**. Stability 0.5; similarity 0.75; clone strength 0; no emotion tags; original speed, no time stretching. Historic source filename: `ElevenLabs_2026-10-28T05_31_51_Chen Mandarin Chinese_pvc_sp100_s50_sb75_v4.mp3`. The local `clip-01.mp3` hash was independently rechecked and is 2234c4fea3427cca45b156ade7051fc9b0f240ab8a55e767e17ef6d3fb53ba05. Historic review reports 28.368938 seconds and 252 free credits consumed, 9706→9454. These are historical facts, not a current balance guarantee.

No provider voice ID is recorded in those local manifests. Do not invent one or treat another voice whose name contains Chen (notably Microsoft HsiaoChenNeural) as the same voice. The coordinator reports seeing the same Chen/v4/settings and 9454 free credits in the current UI; retain a fresh UI/settings/generation receipt with the new audio. Local historical metadata still says owner listening pending; the latest user preference supplies voice-selection authority, not a retroactive listening verdict for the old artifact.

Generate one continuous source MP3 per segment with exact text, preserve original bytes and hashes, and save the displayed provider/settings and balance before/after. Free credits may be consumed within the user-authorized current scope; do not purchase, upgrade, subscribe or enter paid billing. If only a paid route is available, finish local preparation and request explicit approval before that route.

## Rendering architecture

Use the existing local renderer/task/export machinery where useful, and a generic presentation layout for these short pieces. Preserve source snapshots and claims from the asset pack. The old diagnostic renderer remains diagnostic; its large provenance/parameter panels are not the intended on-screen narration layout. Small visible disclosure labels remain; full sources/limitations go in inspectable sidecars. Use the existing accepted visual palette/type family and reserve the bottom region for readable subtitles.

REA visual beats: official example / `index.js` → highlight the acceleration condition and `+0.001` → show that rule driving the running game. Retain attribution to the official example, teaching reconstruction disclosure and inferred assistant-location process as appropriate. Source describes the test `speed < 13` before adding, not an exact clamp at 13. If illustrative update rate or speed scaling is used, label it as authored/time-compressed; a display multiplier is not a source-supported numeric fact. Current `rea-animation.json` has a semantic mismatch: rule-build sits on shot-7, whose current narration concerns evidence records. Move the selected segment's causal demonstration to its actual source shot-5 mapping; do not blindly reuse the old shot number.

rembg visual beats: original illustrated image → predicted foreground mask → same mask applied to same original → retained subject against transparency checkerboard. White means keep, black means transparent. Show the mask's actual role rather than merely fading the whole card. The current sidecar puts mask-apply on shot-5 (background reuse narration); this selected segment needs the application on shot-4. Clearly label the image/mask as synthetic illustration and the operation as explanation, not an actual rembg model run.

One continuous rembg clip spans two source shots. Represent it honestly in a segment-level binding containing `sourceShotIds`, exact concatenated narration, source audio hash, and source-time cue windows. Existing per-shot `VoiceBindingSchema` must not be fed a duplicated full clip under two different per-shot transcript declarations. Derived lossless cuts are permitted only with explicit original-time ranges and full current narration per shot; retain the source clip and do not fabricate listening/transcription verification.

## Mandatory bounded acceptance

1. **CS-01 Scope and exact text.** Exactly two independent short outputs, matching the selected source narration and original shot provenance. No full film, paid call, deployment or target repository execution. Document any narration change before generation.
2. **CS-02 Actual selected voice.** Fresh generation receipt ties each current source clip and hash to Chen/model/settings and exact submitted text. Preserve original audio and measured FFprobe result. A filename, old clip or caller transcript alone does not establish new spoken words or voice quality.
3. **CS-03 Audio-driven duration.** One measurable source audio stream per source clip, finite positive duration. Render at 30 fps with deterministic lead/tail holds; source audio remains at original playback speed and complete. Output probe and full decode pass. No `-shortest` truncation or guessed timeline that can remove words; any resampling/encoding and offsets are explicit.
4. **CS-04 Traceable timing and subtitles.** Save subtitle JSON/SRT and shot/action cue table against the exact source clip. Record the alignment method: provider timestamps, manual listening, speech alignment, or explicitly estimated clause allocation. Duration measurement alone cannot prove word timing. Every selected sentence appears in order, without duplicate/omitted caption text; cues remain within output duration, readable and nonoverlapping. Subtitle wrapping avoids clipping. Unheard estimated cues remain pending perceptual sync review, even if technically consistent.
5. **CS-05 Causal visible action.** REA's rule/condition visibly drives its illustration; rembg's same mask visibly controls foreground retention. Source facts, assistant inference and illustrative numbers are distinguished. Inspect actual rendered frames covering every subtitle, key causal states and both sides of each transition. Continuous rhythm and mobile-device perception are separately deferred if not actually observed.
6. **CS-06 Exact candidate evidence.** Freeze hashes of implementation, source stories/source snapshots, segment specs, original audio/provenance, timeline/subtitles, final MP4s, samples and technical logs before independent review. Report the actual render and probe/decode commands, measured durations, frame counts and media formats. Never substitute a summary for raw evidence.
7. **CS-07 Review honesty.** Independent final review checks architecture/source/timing bindings and technical output on that freeze; independent visual review opens actual sample images. Fixes produce a new candidate and affected rechecks. Required technical criteria need evidence; historical listening/continuous AV limits cannot be upgraded by test counts. Owner final audiovisual review remains explicit.

A bounded technical/visual acceptance may PASS with clearly scoped pending perceptual listening/synchronization if all nondeferred criteria pass. It must not be presented as exact spoken-word alignment, natural voice quality, continuous AV acceptance, or finished-film delivery. Root coordinates the authorized generation and implementation; this architecture reviewer has made no external generation call or expenditure.
