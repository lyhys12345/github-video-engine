# Independent final review — Chen segments candidate 2

**PASS for bounded technical delivery and sampled visuals under CS-01 through CS-07.** The sole prior minor, VQ-01 (`index.js` wrapping), is fixed and independently reinspected. No unresolved blocker, major or reported visual minor remains in this bounded scope. Actual listening, pronunciation/voice naturalness, precise subtitle synchronization, continuous audiovisual rhythm and final owner acceptance remain **UNVERIFIED / pending**. This is not full-film or perceptual audiovisual acceptance.

Candidate: `candidate-2/manifest.json`, SHA256 `c506ec666531ae9f793ac351ad726340caba620ce2758b04b21321bf8dbf6ef6`. All **225 frozen files** were independently verified for hash and size before the checks; every hash was recomputed afterwards with zero mismatches. Candidate 1 and its report remain unchanged historical evidence. Reviewer code, raw commands, independent probes, test logs and impact records are retained in `architecture-evidence-candidate-2/`.

## Actual affected checks

Executed the independent `check.mjs` and `impact.mjs` from the reviewer directory. Independently compared both manifests and inspected the actual frozen `frame.ts` diff. The only changed rendering behavior is subtitle wrapping that preserves Latin filename tokens. The exact current narration, original audio, PCM narration track, timeline/cues, SRT, visual plan, generation receipt, segment binding and all REA source-pack bytes are unchanged. Only REA sample PNGs/SVGs at frames **12, 84 and 155** changed. Every one of the **87 rembg delivery files** is byte-identical to candidate 1, including its original implementation snapshot; rembg was not falsely attributed to the updated renderer.

Independently reran the frozen short-segment tests in a reviewer-owned isolated source copy: **4/4 passed**, including the added filename-wrap regression. Independently reprobed both source recordings and final MP4s, fully decoded both MP4s with FFmpeg `-xerror`, and rechecked exact original PCM preservation after the 400 ms lead. All checks passed. The padded PCM contains every decoded source sample in order at original speed, with only digital silence before and afterwards. These are media-integrity checks, not listening evidence.

| Output | Measured source | Final duration / frames | Media |
| --- | --- | --- | --- |
| REA original shot-5 | 13.792625 s | 14.8 s / 444 | 1080×1920, 30 fps, H.264 yuv420p, AAC stereo 48 kHz |
| rembg original shots-3→4 | 11.311 s | 12.333333 s / 370 | 1080×1920, 30 fps, H.264 yuv420p, AAC stereo 48 kHz |

Both source-pack closures were independently reverified (51 REA files and 32 rembg files), and source-shot narration, caption text and segment declarations match exactly. The candidate-1 CS-01/02/05 factual/provenance findings continue to apply to unchanged content. New CS-03/04/06 checks pass on this candidate's exact media and source freeze. CS-07 is supported by this independent technical review and the visual recheck below. No paid call, external generation or target repository execution was performed by this reviewer.

## Actual visual recheck

After completing my own technical checks, I read `work/chen-visual-judge/review-candidate-2.md` and independently verified its SHA256: `85f6f4793619b05d9c6f7e233ba09d93a45c9f5554845daf703c6f44b0353254`. It binds the same candidate manifest and records opening actual new REA PNGs at 12/84/155/156 plus regression frames 211/303/382, and independently extracting/opening frame 84 from the new MP4. `index.js` stays together, the caption remains complete and readable, and neighboring transition/regression frames remain sound. Its candidate-1 full sampled review remains applicable to byte-identical rembg. VQ-01 is closed.

## Delivery boundary

New voice generation provenance remains Chen Mandarin Chinese / Eleven v4, stability .5, similarity .75, clone strength 0, original playback speed. The unchanged receipt records **113 free credits**, balance 9454→9341, and no paid action. The retained screenshot directly shows the current rembg generation/settings; recorded coordinator operations and receipt additionally support REA provenance. Neither reviewer heard the clips or independently transcribed them.

Subtitles and action transitions use explicitly labeled **text-weighted estimates within measured audio duration**. They have been checked for structural consistency and sampled readability, not exact spoken-word alignment. Presenting this result as perceptually synchronized, naturally spoken or continuously reviewed would exceed the evidence. Historical AV UNVERIFIED and final owner review remain intact.

Final REA MP4 hash: `625fc020b78d285f862e20d17e52d63d368a03afbe9c19d05916f7a384b6a29a`. Reused rembg MP4 hash: `d5ce80c94486f0040c3d2af48fb0ce6f83461159052dae45f8c47cf87de44c62`. This verdict applies only to the exact candidate and its recorded scope.
