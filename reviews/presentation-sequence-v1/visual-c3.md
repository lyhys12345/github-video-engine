# Independent targeted visual re-review — silent sequence c3

Candidate `candidate.json` SHA-256 `2a4658749ff29b3302a580e13fdd572219fe5e2b6b2dcdf577a4733a35ac1c2d`, matching the requested frozen version. Independently checked all 677 listed file sizes and SHA-256: zero mismatches. Previous c1/c2 findings and reports remain in their adjacent review folders; no other judge report was used. Candidate files were not modified.

## Targeted finding: PASS on inspected localized seam frames

The prior c2 rembg example used Chinese child titles but an English-only boundary card. In actual c3 rembg frames 540, 557, 575 (`r-02`, `r-03`, `r-04`), the card reads `示例 2 / 2`, `独立示例`, `修订版示意`. At 360×640 the characters were discernible, and I saw no missing glyph boxes, overlapping lines or clipping. It communicates a distinct example in the same language as the surrounding Chinese scenes. Frame 539 shows the prior cutout/mask comparison; 576 shows the new scene's original-input opening; 600 shows the new scene one second later. This resolves the specific language/reset ambiguity in the inspected frames.

English forward frames 528/545/563 show `CASE 2 OF 2 / Separate example / One slot` between prior frame 527 and new frame 564. Reverse frames 455/472/490 show `CASE 2 OF 2 / Separate example / Two slots` between frame 454 and 491. Both cards are legible in the inspected 360×640 PNGs, with no visible clipping or missing glyphs. The observed cards span the 36-frame range reported by the frozen manifest, i.e. 1.5 seconds at 24 fps. This is not a finding that real users can read and understand the text within that duration.

## Actual media and limits

Independently extracted and individually viewed six 360×640 images per actual exported MP4: forward frames 527, 528, 545, 563, 564, 588 (`p-01`…`p-06`); reverse 454, 455, 472, 490, 491, 515 (`rev-01`…`rev-06`); rembg 539, 540, 557, 575, 576, 600 (`r-01`…`r-06`). These cover prior scene end, card onset/middle/end, next scene onset and one second later.

Independent ffprobe and full ffmpeg decode-to-null succeeded for all three; each had one video stream and no audio. Forward p-limit SHA-256 `76d5dc105b81e88e1a550acd12fb68b9530a00342c5b47c35988262f7e4e0c0d`, 1019 frames; reverse `245c8e573a91122792f613fc22c3413d87d03b3045e1c645fa091759113bc4c5`, 1019 frames; rembg `abe1f8cfe43821ce5bc65fe700a3fac3815f55c0630471471dccab8f4d97f6f8`, 1164 frames. No continuous viewing or listening, actual phone/playback overlay check, audience comprehension study, subjective pacing or final owner acceptance was performed. Overall audiovisual acceptance remains UNVERIFIED; this result addresses only the specified localized static seams.
