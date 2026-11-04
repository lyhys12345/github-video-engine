# Independent product / visual review — silent sequence freeze v1

Candidate `candidate.json` SHA-256 `74929d7e32245343e3373d8ec6fdf3d5cea241113e7552352b281ae2c90f8bda`. Independently verified all 555 listed file sizes and hashes; zero mismatches. OPERATOR describes caller-authored ordering of silent child scenes without inferred causality. Candidate was not modified. Independent images and this raw report are in the adjacent `gve-sequence-judge-visual-v1` directory. Other judges' findings were not consulted.

## Verdict: FAIL — scene identity / continuity ambiguity (major product presentation issue)

The actual assembled frames hard-cut between independent examples while retaining essentially the same diagram and style, with no visible scene number, restart, or statement of relationship. This creates a credible risk that a zero-background viewer reads a new independent example as a dynamic change or reversal in the previous one. This is a judgment from inspected stills, not a claim that actual viewers were tested or that I watched the video continuously.

**p-limit forward, frame 527 → 528 (21.958 → 22.000 s):** `p-02.png` shows all four tasks settled under limit 2; `p-03.png` immediately shows empty columns under limit 1 and `One slot from the README example`. The different capacity title is visible, but there is no indication that this is a separate staged scenario or reset. A viewer can plausibly interpret an in-place concurrency change and disappearance of all prior results. `p-01`, `p-04`, `p-05` show surrounding one-second context as isolated frames.

**p-limit reversed, frame 454 → 455 (18.917 → 18.958 s):** `rev-02.png` ends with four settled at limit 1; `rev-03.png` begins empty limit 2. The same issue occurs in reverse. The labels say one or two slots but do not explain why prior tasks disappeared or identify independently staged examples.

**rembg, frame 539 → 540 (22.458 → 22.500 s):** `r-02.png` shows the same bird with cutout and mask comparison; `r-03.png` cuts directly to the same bird returning to the original-input stage. The new heading says to fix an original image, but no transition explains this is a separate original/revision replay; a viewer may interpret a reversal within one process. The user-facing videos are silent; the retained per-scene captions are sidecars rather than a global subtitle track, so they do not supply an in-video explanation at the join.

**Minimal generic repair:** add a brief, visible, caller-authored scene boundary card or overlay before each independently staged child, e.g. `New example — limit 1` / `Replay: revised illustration`, using neutral wording when the relationship has not been authored. Preserve each child video and do not infer comparison or causal continuity automatically. For first-use viewers, the label must remain legible long enough to register and be carried in any global captions if later introduced. Re-review actual assembled MP4 at forward 527/528, reversed 454/455 and rembg 539/540 equivalents, their new label onset/offset, and enough surrounding frames to verify the reset is explained. Continuous viewing and owner review remain separate.

## Independently inspected media

Used ffprobe and ffmpeg full decode to null on all three assembled MP4s: exit 0. Primary p-limit: SHA-256 `179d57cc513534a3cfc656bcb0408f1867a5c1dae4eafad52a6a0ab387d6cfa8`, 983 H.264 frames, 720×1280, 24 fps. Reversed: `079743716957d937cfd5c6a7c4b9d2fc3f68b93fca1a5408341a99dbfe9eb536`, 983 frames. rembg: `35e4aeeac1d9314b7eaee3bd2687d09ecf61941379dc9e2d1055cc31ca5af78f`, 1128 frames. Each has video only. Extracted and individually viewed 360×640 frames: forward 503, 527, 528, 529, 552; reversed 430, 454, 455, 456, 479; rembg 515, 539, 540, 541, 564. The small per-card labels and rembg command lines are hard to read at this scale; actual devices, player overlays and accessibility settings were not tested.

No continuous watching or listening, subjective pacing, viewer comprehension study, semantic source audit or owner acceptance was performed. The sequence is silent and is not a narrated final film. Hash and decode results do not establish continuity of meaning.
