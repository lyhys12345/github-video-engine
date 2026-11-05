# C2 caption-safe independent product/video recheck

- Candidate: narrative-audio-c2-caption-safe, SHA-256 de9393b86b79f7c1239b2a0c30f02b4c637edb9817824a5a4437dc8d9c8b7b8f, commit c8a0c814535eaa33e24c3546719cb4709b6ad2ae. Hash independently confirmed 2026-11-05. Original candidate untouched.
- Scope: C1 occlusion and first C2 draft 60-frame delay; actual final MP4 caption pixels, adjacent cue boundaries, two gap cards, source visibility and text readability. Overall AV role remains UNVERIFIED: no listening, continuous playback, perceptual alignment, current facts or owner acceptance. Sampled visual recheck passes; no confirmed major in this scope.
- Inputs: source/docs/narrative-audio-caption-safe.md, candidate.json, evidence/failures.json, timing-failure-source-proof.json, burned-caption-layout.json and actual exported baseline/edit excerpt.mp4 for both projects. C1 review and original rendered frame evidence retained at evidence/c1-original-visual-review. Read OPERATOR before conclusion but did not rely on its claims. No peer reports consulted.

## Findings and method

Previously C1 libass simulated default subtitle placement obscured source footer; this was a player-dependent risk, not proof of C1 rendering breach. In final C2, actually decoded frames show burned captions in the separate dark lower strip, below complete source rectangle. At sampled frames source footers remain visible, Chinese caption glyphs are recognizable and neither source nor captions visibly clipped. Viewing was static at 360x640 per frame in contact sheets; this is not a device-wide readability guarantee.

Draft failure evidence early-frames/60.png shows no caption and 120.png shows the first caption, as recorded. The historical cause is reported in timing-failure-source-proof.json; not independently reconstructed here. Final frames show the intended cue boundary at frame 60, not a 60-frame delay. The following boundaries were actually decoded from each final MP4, visually inspected in order, and matched cue half-open [start,end):

| Movie | First cue adjacent pairs | Second cue adjacent pairs | Gaps |
| --- | --- | --- | --- |
| Express baseline | 59/60, 138/139 | 149/150, 232/233 | 285, 375 |
| Express edit | 62/63, 141/142 | 149/150, 232/233 | 285, 375 |
| rembg baseline | 59/60, 139/140 | 149/150, 229/230 | 285, 375 |
| rembg edit | 62/63, 142/143 | 149/150, 229/230 | 285, 375 |

At each pair, first/last active frames and neighboring absent frames match the declared intervals; frames 285 and 375 show NOT PRODUCIBLE scene 3/4 cards without voice captions. Edit shifts only the first cue by three frames in the sampled evidence. Sampling does not establish every frame or audio silence. No assertion of natural listening, transcript truth, speech-to-caption alignment or third-party player behavior is made.

Reproduction: ffmpeg at C:/Users/luyuh/scoop/shims/ffmpeg.exe, input actual bundle MP4 identified by result.json basename, `-vf select='eq(n\,59)+...',scale=360:640,tile=5x2 -vsync 0 -frames:v 1` for the indices above, exit 0. Independent scratch outputs: c2-review-0.png through c2-review-3.png in the same directory as this report, ordered Express baseline/edit then rembg baseline/edit. Full image viewing performed; not merely metadata checks. No original evidence or candidate changed.
