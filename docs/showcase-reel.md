# Source-footage showcase adapter

Experimental `showcase-reel/1.0`: `node --import tsx scripts/render-showcase-reel.ts --spec <manifest> --out <new-dir> [--frames-only]`.

1080x1920/30fps, three restrained palettes, real images/video as principal content. Each approved narration beat distributes its complete original-speed PCM among weighted shots with no intershot silence. Only sub-frame audio padding is added. Per-shot normalized source crops and optional synchronized focal panels preserve source context while making details readable. Each video uses an explicit30fps start/end source-frame interval; it plays once at original speed then holds its last selected frame (no hidden loop/speedup). Labels distinguish official demos, edited excerpts and explanatory annotations. No invented interface.

Exact script hash/owner approval, ordered narration hashes and local TTS receipt bindings are mandatory. Caption chunks must reproduce exact approved text. Timing remains proportional display estimation, not measured word alignment or listening verification. Input images/video are hash-bound; declared source dimensions/frame metadata must be prepared from real media probe. This tool is an experimental rendering adapter, not a complete durable-job or portable export implementation.

`--frames-only` creates real preview PNGs without an MP4. Final encode checks1080x1920/H264/AAC/frame count/duration with FFprobe and full FFmpeg decode. A successful decode is not a visual/listening PASS. Script approval and independent media review remain separate gates. Do not infer consent to publish.

Use `--still-frames 0,30,60` for a targeted preflight after an edit, or `--skip-stills` to encode without repeating preview PNGs. Neither option changes the movie or its final decode checks. A preflight is not a substitute for inspecting frames decoded from the final MP4.

Directed tests: `pnpm exec vitest run tests/showcase-reel.test.ts tests/approved-reel.test.ts`; `pnpm exec tsc --noEmit`. No full regression claimed. Private voice references, model weights and large media remain local.

Contain layouts first clip the exact declared source crop into an inner box, then center that box; adjacent source content cannot leak into margins. Before rendering, FFprobe verifies actual source dimensions and video frame count/rate against each declaration. This catches mismatched cropped/source metadata before creating a candidate.

Optional `layout: immersive` removes the standard progress display and uses more of the portrait canvas for the source media. Omitting it preserves the standard layout. Panels can select their own hash-bound `mediaId` and source-frame range, reveal at a fraction of the shot, and move between two bounded rectangles with `motion`. This supports carrying the same actual input into a comparison or a clearly labeled process illustration. Label, arrow and ring overlays are editorial annotations; they must not imply unobserved product operations. Source footage still plays once at original speed, and a moving panel does not prove that its underlying image changes.

Optional narration `captionCues` specify contiguous recording-relative frame intervals instead of proportional `captionChunks`. Their complete text must equal the approved line, and their final frame must equal the measured, frame-rounded recording length. These authored cues remain display estimates, not forced alignment or a perceptual synchronization guarantee. Do not supply both caption modes.

For pacing review, inspect the real encoded frames as well as the manifest. Distinguish a frozen source frame, an editorial transition that carries new meaning, and actual source motion. Pixel freeze detection is supporting evidence only: overlays and camera movement can reduce its score without improving comprehension. Keep each failed preflight and each revised candidate separate, and bind the final independent review to the exact MP4 hash.


## Cue-based cuts, cinematic layout and preview frames

Author optional narration `captionCues` against the actual recording at 30 fps. They must partition the approved text and cover the measured recording from frame zero. For example, a cue starts on the first spoken syllable after a pause. Cue indices are zero-based within a beat.

- Set `startCue` on every shot in a beat to cut at the start of each named cue. The first shot starts at cue zero. Without these fields the existing weight-based schedule applies.
- Set a video shot's `actions` to entries such as `{"cue":2,"sourceFrame":165}`. At that cue start, the main video and panels inheriting its range show source frame 165. The engine interpolates between source anchors and shot endpoints, adjusting the source video speed while keeping speech at its original speed. Explicit panel ranges remain independent. Source frames must be nondecreasing and lie within the shot's source range.
- Set `layout: "cinematic"` and optionally `cinematic: {"safeInset":76,"captionSize":42,"accent":"#D4BD95"}`. Sizes use pixels at 1080×1920. The existing font and panel crop/fit settings apply.
- Set `preview: {"frames":[75,400],"shotMidpoints":false,"actionFrames":true}` to export selected absolute timeline frames and the action anchors. `--frames-only` stops after preview generation. `--still-frames` overrides the list and `--skip-stills` disables output.

The renderer uses authored phrase boundaries. Verify speech timing by listening when exact perceptual sync is required.