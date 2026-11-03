# Independent product / video review: 300-second pressure fixture

Candidate `candidate.json` SHA-256 `98777f3546a282dafd003727886db869a355a687a8caa57ee745a3db2b6220f4`. Independently checked all 696 declared file sizes and SHA-256: 696 match, zero failures. Read operator and relevant source materials, not other judges' conclusions. All scratch, exports and images are in this review directory. Target repository was not executed.

## Verdict and sample scope

**Product: PASS for tested pressure-fixture status, export and boundary paths; overall product acceptance UNVERIFIED.** Actual frozen media is a 300-second technical pressure fixture: 12 authored 600-frame beats, deliberately extended stationary holds and local English Zira recordings. It is not a finished film, a claim of good pacing, or evidence of source-project runtime execution. Other use cases, platforms, user hardware and performance/resource guarantees were not tested here.

**Video quality and owner acceptance: UNVERIFIED.** Only technical decode and specific stills were inspected. Continuous viewing, listening, speech accuracy/naturalness, exact alignment, creative pacing, editorial quality and owner acceptance were not performed. The reported subtitle text is caller-declared, and an AAC stream does not prove intelligible voice. The actual screen, player overlays and caption safety on a user device or platform were not tested.

## Actual CLI checks

Extracted exact source into isolated `engine`, copied `work/live` to isolated `state`, linked existing local dependencies. Actual default `presentation status` for `121013df08a7fedc4be5926b2f0cc6fc131fdf9f9eadc07e2cba6f2d810ebc15` succeeded, kind narrated, 7200 frames, integrity verified. Fresh default export succeeded as receipt-v1 with review pending in `export-check`; its independently hashed MP4 equals the frozen `fb7714b662a98422967c5ec299405fd60aa61168ddd2b558fb0d1e946b4c3c17`.

Actual `project presentation-plan` with the 7200-frame frozen spec returned cached true and plan task `67a4a989b680f25f7815b937423355dab1b1a40316bf2048e6be25d38dd4a460`. The 7201-frame spec exited 1 `PRESENTATION_DURATION`, with maximum 300 seconds. The 7200-frame successful movie is real; the CLI check reused its existing plan and did not independently rerender. No independent late audio-overflow or cancellation test was performed.

## Media and actual image inspection

The frozen MP4 SHA-256 is `fb7714b662a98422967c5ec299405fd60aa61168ddd2b558fb0d1e946b4c3c17`. Independent ffprobe counted 7200 video frames, H.264 720×1280 at 24 fps, AAC 48 kHz and duration 300.000 seconds. Full ffmpeg decode to null completed exit 0. These checks do not establish a subjective audiovisual pass.

From that actual MP4 I extracted 360×640 PNGs and individually viewed frame 0, seam pairs 479/480, 3359/3360, 6719/6720, and final frames 7198/7199 (`frame-01.png` through `frame-09.png`). At those three sampled joins no obvious one-frame scene discontinuity was visible; this does not verify every join or audio continuity. The last two frames visibly carry the final caption about the Hello World response, consistent with the final VTT cue 04:54.416–04:59.971. The sampled frames show sparse client/server cards and large unchanging holds. These are expected for the stated pressure fixture and are not an endorsement of finished-film pacing. Small bottom captions may be obscured by device or platform overlays; that has not been tested.
