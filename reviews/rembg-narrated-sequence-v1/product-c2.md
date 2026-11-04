# Independent targeted visual re-review — rembg narrated sequence c2

Candidate `candidate.json` SHA-256 `e2a6b556ec7f4c22a0df2138d15ea69bacd86a2385f38c8be3829d67f41f13aa`, matching requested version. All 858 listed file sizes and SHA-256 independently match. The c1 FAIL report and images remain separately preserved. No other judge report consulted; frozen candidate not modified.

## Targeted result: PASS for the prior comparison caption/picture mismatch

In the actual c2 first child, frame 471 shows the preceding mask, 472 begins the dual-panel reveal, and 495–497 show both labeled illustrations without the comparison subtitle. Frames 498, 528 and 558 all show fully visible `Cutout illustration` and `Mask illustration` side by side with `Compare the cutout and the mask.`; at 559 the subtitle is gone while the panels remain. In the second child, 1091 shows preceding mask, 1092 begins the dual reveal, 1115–1117 show the full panels without the subtitle, 1118, 1148 and 1178 show both panels and the comparison subtitle, and 1179 retains panels after subtitle disappears. The sampled beginning/middle/end and immediately adjacent frames directly address the original c1 failure.

In addition to manually inspecting those frames, I independently decoded every frame in windows 498–558 and 1118–1178 to 360×640 PNGs. For each window, ffmpeg SSIM compared the dual-panel region and caption region of all 61 frames against the corresponding manually inspected starting frame. Minimum SSIM over the first 61 reported comparisons was 0.980031 (first panels), 0.978842 (first caption), 0.978481 (second panels), 0.978842 (second caption). This supports persistence of very similar pixel regions throughout each window; it is an approximate image comparison, not a claim of frame-by-frame human viewing or proof of speech alignment. Images `w-001`…`w-122` and raw `ssim-*.txt` remain alongside this report. A failed attempt to run a System.Drawing comparison was discarded; it is not counted as evidence.

The chapter card at frames 584 and 619 explicitly says `Separate example / Same case, new timing`, addressing the prior minor ambiguity over whether it is the same material replayed. Frame 620 starts the input again. Commands remain very small at 360×640 and captions near the bottom; real devices/player overlays and accessibility were not tested.

## Media and manual inspection

Independently ffprobed and fully decoded the frozen assembled MP4 to null, exit 0: SHA-256 `6739d2bdc5207299331f0324f85c1e386ff9b95a6340a2742b0ce28bafee2449`, H.264 720×1280, 24 fps, 1204 frames / 50.166667 s, with 48 kHz AAC. I independently extracted and individually viewed 360×640 frames 471, 472, 495, 496, 497, 498, 528, 558, 559, 583, 584, 619, 620, 1091, 1092, 1115, 1116, 1117, 1118, 1148, 1178, 1179, 1203 (`f-01`…`f-23`).

No continuous viewing or listening, voice content/identity verification, automatic or manual speech-word alignment, actual user/mobile playback, subjective pacing or final owner acceptance was performed. AAC decode and caption/picture overlap do not establish audible speech or sync. Overall audiovisual acceptance remains UNVERIFIED; this is a pass only for the specific previously reported static timing failure.
