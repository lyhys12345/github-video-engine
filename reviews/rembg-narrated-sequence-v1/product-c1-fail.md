# Independent visual review — rembg narrated timing sequence

Candidate `candidate.json` SHA-256 `9f56f1752350bd65a63a16ae1f114f89ba538f4edb23b6a0b002d760dde88ca0`, matches requested version; all 778 listed hashes and lengths independently checked, zero mismatches. OPERATOR read; no other judge report used. Candidate not modified and no target repository executed. Raw PNGs and this report are outside the freeze.

## Verdict: FAIL — comparison caption and comparison picture do not overlap (major)

The first scene's global VTT declares `Compare the cutout and the mask.` from 17.125 to 19.644 seconds. Actual sequence frame 411 (17.125 s, `f-05.png`) displays the caption and original input but neither comparison result. Frame 430 (`detail-04.png`) has the caption and only the mask illustration; frames 450, 470, and 471 (`detail-05`, `detail-06`, `end-01`) likewise show only the mask. At frame 471 (19.625 s) the comparison caption is still visible and the cutout is absent. At frame 472 (19.667 s, `end-02.png`) the subtitle is gone and the side-by-side cutout and mask only begin fading in; frame 490 (`end-05.png`) shows both more clearly. Thus the comparison prompt finishes before the first inspected side-by-side comparison frame; a viewer cannot simultaneously use the subtitle and the two pictures to compare. The earlier cutout appeared separately around frames 210–230, but that does not resolve this particular concurrent comparison mismatch.

The same timing occurs in the second child: frame 1047 (`second-01.png`) has the comparison caption and mask only; 1048 (`second-02.png`) begins side-by-side with the caption absent, and 1066 shows the two outcomes (`second-03.png`). The VTT's second cue is 41.125–43.644 seconds. These observations concern burned text and actual decoded frames; the audio was not listened to, and no word-level spoken timing claim is made.

**Repair and re-review:** ensure both distinctly labeled illustrations are visible simultaneously while the comparison subtitle is visible for a useful interval; adjust authored events/beat duration and cue timing as needed, preserving source truth and versioning. Re-render, inspect actual MP4 frames through the start of the comparison cue, illustration reveal, cue end and final hold for both children; verify the card and global cue ledger still match. Continuous owner viewing and listening are separate and still required for pacing and speech alignment.

## Other observations

The seam itself is explicit: first scene frame 539 shows both outcomes; frames 540, 557, 575 show `CASE 2 OF 2 / Separate example / Timing revision`; 576 restarts the input, 583 has no caption and 584 shows the new first caption. The label prevents a silent state reset, though `Separate example` does not explicitly say the same example is replayed with one-frame timing changed; minor wording risk for an audience-facing film. `Local voice • Illustration • No observed execution` is visible in child images. At 360×640 the commands are very small and subtitles sit close to the lower edge; real device and player overlay checks remain unverified.

## Actual media, scope and limits

Independently ffprobed and fully decoded the exported MP4: SHA-256 `9b6378a0bf91fd371ac0f2f83b783cee6f59495d34f4278e31a3f02c852c93bd`, H.264 720×1280, 24 fps, 1116 frames / 46.5 s, and 48 kHz AAC; full ffmpeg decode to null exited 0. Individually viewed 360×640 frames 7, 99, 195, 315, 411, 520, 539, 540, 557, 575, 576, 583, 584, 675, 891, 1100, 1115 (`f-01`…`f-17`); 210, 220, 230, 430, 450, 470 (`detail-01`…`detail-06`); 471, 472, 473, 480, 490 (`end-01`…`end-05`); and 1047, 1048, 1066 (`second-01`…`second-03`).

This was not continuous viewing or listening. Voice identity, speech content, exact speech-to-caption alignment, naturalness, actual device playback, user comprehension and owner acceptance remain UNVERIFIED. AAC presence and successful decode do not establish audible speech. Local English Zira technical fixture is caller-declared, not an approved Chen voice.
