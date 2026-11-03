# Independent architecture / evidence / content-facts review

**Architecture PASS; evidence PASS; content facts PASS within the declared technical pressure-fixture scope.** No blocker or major found. This now supplies independently measured evidence for an actual **300.000-second video**, rather than only a 300-second arithmetic boundary. It does not establish a creative five-minute film, natural pacing, accurate speech transcription, authenticated voice identity, continuous perceptual AV or final owner acceptance.

## Frozen identity and source

Candidate SHA-256 `98777f3546a282dafd003727886db869a355a687a8caa57ee745a3db2b6220f4`; source `f4fa26bd5604e8053cadc9369e0214baa87f66a7`; tree `7a96030a1c443614cc12f3368d4f01f11123a40c`.

Read OPERATOR, duration and narration contracts and relevant actual engine code. Did not use builder verification summaries/scripts or other judges as proof. Independently verified every one of 696 manifest files, all 523 Git blobs, and exact runtime archive bytes. Exact and canonical archives match byte-for-byte. Verified again after review; candidate unchanged. All 121 src files match the previously reviewed duration-c2 canonical source. Engine source review and its unaffected prior compatibility/security tests can therefore be reused; no new full suite or typecheck claimed here.

Extracted source and copied state into this judge directory. Trusted engine dependencies installed from local cache offline with scripts disabled. No target repository code executed, no paid service, no target execution, no fresh rendering. Independent scripts and results are retained here.

## Actual task and full media

Checked task `121013df08a7fedc4be5926b2f0cc6fc131fdf9f9eadc07e2cba6f2d810ebc15`, its plan `67a4a989b680f25f7815b937423355dab1b1a40316bf2048e6be25d38dd4a460`, and voice `3cb06c7d09fa8dd2d8d709d2fbe65ce1cfe60bd84a97be8d9bb65f285995b5d6` through the current verified reader. All exported files equal their verified CAS closure; proposal+plan recompile exactly to committed trace. Current engine environment code fingerprint matches final manifest. Completed resume independently returns the same verified cached task without rendering.

Final MP4 SHA-256 `fb7714b662a98422967c5ec299405fd60aa61168ddd2b558fb0d1e946b4c3c17`, 2,311,273 bytes. Independently measured H.264 yuv420p 720×1280, 24/1 fps, 7,200 decoded video frames, video duration 300.000000 s; AAC mono 48 kHz audio duration 300.000000 s. FFmpeg error-fatal full decode passes for both streams.

All 7,200 video presentation timestamps were independently checked against n/24; maximum printed timestamp rounding difference 0.000000333334 s. First frame PTS 0, last PTS 7199/24; a final frame extends to 300 s. No duplicate/gap found in this timestamp sequence.

All 15 retained intermediate MP4s were independently probed and fully decoded: each contains one H.264 stream, 480 frames at 24 fps, 20 seconds. Expected absolute ranges are [0,479], [480,959], ... [6720,7199]. They cover 7,200 frames once; 15 parts have 14 internal joins. Extracted each part's first and last frame, compared with its corresponding final-video frame, and viewed the final 30-image boundary contact sheet. Maximum raw-part→final RGB RMS difference is 1.6011/255; minimum PSNR 44.0426 dB. This is numerical correspondence through the final lossy encode, not perceptual certification. At sampled joins there is no unintended scene reset. Absolute state and titles remain consistent; deliberate beat-title changes are allowed.

Raw evidence: media-results.json, run/frame-pts.json, run/duration-probe.json, run/boundary-*.png, run/part-*-*.png and run/boundaries-contact.png. Analysis uses retained original parts, not builder-prepared screenshots.

## Original recordings, full PCM, AAC and subtitles

Independently read and verified all 12 original receipts/audio, exact caller-declared text and hashes against the saved proposal. Independently decoded every raw recording at original rate to 48 kHz mono PCM16 and required byte identity with each stored normalized clip. All 12 complete clips fit their authored beats. Reconstructed the full 14,400,000-sample / 28,800,000-byte zero-padded mix from these clips; byte-identical to stored narration.pcm.

Independently encoded AAC128k from that reconstructed mix, extracted ADTS AAC, and compared it to AAC extracted from the final MP4: byte-identical. Thus final delivery carries the expected full mix through the same lossy codec; no stretching, concatenation omission or truncation was found. The decoded originals/PCM/mix and two AAC streams remain in run/. Receipt matching does not independently transcribe speech or authenticate Microsoft Zira. Technical label is caller-declared Microsoft Zira Desktop / Windows SAPI / rate 0, never Chen.

First cue starts at sample 16,000 (frame 8, 0.333333 s). Its exact text begins “This Express example shows how a root path request gets a response.” Last cue starts at sample 14,132,000 (frame 7066, 294.416667 s) and ends at sample 14,398,567 (299.970146 s). It retains all 266,567 samples; exactly 1,433 silent samples remain (0.029854 s). Final endFrame is 7,200. A one-frame-later placement independently rejects with VOICE_DOES_NOT_FIT: actual266567 > available266000, excess567 samples, rather than cutting audio.

Independently reconstructed the complete VTT from cue samples and exact transcripts and compared bytes. First VTT interval 00:00:00.333–00:00:05.022; last 00:04:54.416–00:04:59.971. These are outward-rounded clip placements. Independently decoded/viewed frame0/7 before first caption, frame8 with first caption, and frame7199 with the full final caption “The final card shows the response body from the example, the text Hello World.” The last visible frame caption is consistent with outward frame rounding; it does not imply speech continues beyond the measured PCM endpoint. Word-level alignment remains unverified.

## Sources, facts and assumptions

Pinned Express commit remains `43fca52d28a422c8be48fd489cbd4f2d6152bab6`; README SHA-256 `3cf5f3e224dbb9b5e2bc0ac255871de453762ae7a277f868da5f4a69d6ff2509`. Rechecked actual included source hashes, every cited quote and line range. GET / and response Hello World are supported by README lines41–43, port3000 by lines45–47. No fresh external fetch or repository execution is claimed.

This is 12 authored beats × 600 frames, with intentionally long visual holds. Request/response durations are editorial pressure-test timings, not HTTP latency or measured runtime. Viewed frames retain “Local voice • Illustration • No observed execution”. The fixed example and technical recordings are legitimate test input; they are not evidence of natural five-minute story creation or arbitrary URL understanding.

Minor editorial observation PRESSURE-CF-1: the prior cue/action gap persists in the retimed pressure fixture. The request-send line at 100.333333–105.281687 s accompanies an empty client/no GET token (actual frames2408/2500). Request only appears at frame3018 (125.75 s) during the next cue. That next cue has motion, but this is not a polished causal narration sequence. This does not invalidate technical time/transport pressure evidence; keep it explicit and do not claim creative or full AV acceptance.

## Rejections, limits and reuse

Nine independent negative checks pass: 7,201-frame plan rejected; legacy1.0 rejects300s; last clip+1frame rejects rather than truncates; damaged original recording, original receipt, normalized PCM, full mix, VTT and captured source each fail verified reading. Each CAS mutation was made only in the copied judge state, restored, and successful verification rechecked. boundary-binding-results.json records exact errors.

Maximums still come from unchanged contracts: ≤7,200frames, 20beats, ≤48samples, per-part12MB, final80MB, fullPCM28.8MB and bounded publication closure. Actual movie is below its file cap. This review measures output integrity, not original peak memory, resource admission, total elapsed render time or scratch behavior; those measurements were not independently observed during this run. It also does not repeat cancellation at300s or validate generalized machine performance. Prior76.75s cancellation evidence remains separate and is not relabeled300s evidence.

No new full suite/typecheck, fresh rendering, live cancel/restart, owner listening, automatic transcription or continuous perceptual watching was performed. The engine's unchanged prior bounded tests remain historical supporting evidence. Actual whole movie and all parts were fully machine-decoded in this turn.

Machine-readable conclusion: report.json. Main independent evidence: identity.json, engine-comparison.json, probe-results.json, media-results.json, boundary-binding-results.json, run/*, probe.log, media.log and negative.log. Scripts are identity.mjs, probe.mts, media.mjs, negative.mts and compare.mjs.
