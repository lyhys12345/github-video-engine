# Independent product / visual review — concurrency queue freeze v1

Candidate `candidate.json` SHA-256 `96ca6333184fcd68400a179fa2a9f7e24b9046f06cc283a3a278fdddec047e93`: all 433 listed file lengths and SHA-256 matched. Read OPERATOR and `docs/concurrency-queue-v1.md`; no other judges' conclusions consulted. Exact-source engine, copied state, exports and stills are isolated under this directory. The p-limit repository was not executed.

## Verdict

**Video/static causal presentation: FAIL for the specific premature completion title below.** Overall audiovisual quality, continuous viewer comprehension and listening remain UNVERIFIED. **Product: PASS for the specific independently tested revision/cache/export and invalid-input paths below; overall product acceptance remains UNVERIFIED.** Do not treat either scoped result as owner approval.

## Finding 1 — premature assertion all tasks settled (high, factual presentation)

Reproduce by decoding the actual `work/queue-exports/parallel/preview.mp4` at frame 455 (18.958 s), retained as `p-11.png`. Its title states “All four tasks have settled”; the same image shows `Running • 1/2`, `Settled • 3`, and Fetch details labeled `Running`. Thus the title asserts completion before the picture and counter show it. The 6th beat begins at frame 440; the final settle event is scheduled at frame 478. Frame 479 has the fourth task labeled leaving and counter 4; frame 527 shows all four settled. Keep the title conditional or defer it until the final settlement. This is an objective still-frame mismatch, independent of unreviewed subjective playback.

## Finding 2 — transition overlap and tiny task labels (moderate readability risk)

Synthetic contrast frame 190 (`s-05.png`) shows moving Tile C crossing and partially covering still-running Tile B. Frame 200 (`s-06.png`) shows Tile D entering over the same stationary card. On 360×640 samples, individual task labels and status text are very small; p-limit frame 100 also shows multiple entering cards visually stacked. At transition frames counters update to destination state while cards are labeled entering or leaving and may not yet reach their columns. The labels help explain the transition, but their small size and overlaps reduce clarity; actual mobile device, accessibility settings, and platform overlays were not tested. There are no burned-in subtitle captions on the selected stills; both films are intentionally silent and ship VTT sidecars.

## Actual media and visual observations

I independently ffprobed and fully decoded both actual MP4s (ffmpeg null decode exit 0). Primary: H.264, 720×1280, 24 fps, 528 frames / 22 s, SHA-256 `66063156d5e0ab56588b96a207438772174b2afe5845160767036afcefbec3a7`. Synthetic: H.264, 720×1280, 24 fps, 330 frames / 13.75 s, SHA-256 `c57d80356049c3422780cbf9a6599376c748a221b58c948fbb52a302fa25f052`. Both have video only, consistent with silent mode.

Extracted and individually viewed 360×640 PNGs from the MP4s. Primary frames 0, 100, 145, 175, 278, 288, 308, 370, 384, 410, 455, 479, 490, 527 (`p-01`…`p-14`). Synthetic frames 0, 110, 160, 180, 190, 200, 210, 329 (`s-01`…`s-08`). The waiting/running/settled columns, two versus three slots, release/reuse and rejected outcome are legible conceptually in selected static states; synthetic ending explicitly says demonstration pauses. Header identifies `Silent • Illustration • No observed execution` and timing is identified illustrative. The fixture can communicate the rough sequence, though genuine zero-background user comprehension and continuous motion were not observed. The real p-limit source factual interpretation remains a separate fact review.

## Independent CLI paths

Copied `work/queue-state`, extracted source-exact, and used local tools/dependencies. Existing p-limit plan submission returned original task `231c2cdb73a87f8dbc8dc4fac8287dc9a1377ee9ce0328ea69f168fd445b88f9`, cached true, 528 frames. Increasing first beat by one frame produced distinct noncached plan `e207224e2b17620445b5662511349f78ec2dc50b3345fc958ffa47e9eccb70a8`, 529 frames. Actually rendered and exported silent new preview `dd26dcd2b986fe43c8cff5f1c5c83ee34e7cc70295dcd5e3208ffa311f4cdcc4`, status succeeded/integrity verified, SHA-256 `de0a60b6d36392cb4f1fc2055887bc4c1686584a6de7d7d446cc9c583d8a58a0`; repeating render returned same ID and cached true. After edit original preview `78d3b19f4ca84c6033bcdecbdf4ea7d900184b459e39bbf970259639c766f63e` exported successfully with original SHA-256 `66063156d5e0ab56588b96a207438772174b2afe5845160767036afcefbec3a7`.

The independent CLI rejects capacity 0 (`PRESENTATION_SCHEMA` minimum 1), an unknown module ID (`PRESENTATION_SCHEMA`), and an unsupported cancellation event (`PRESENTATION_SCHEMA`, expected enqueue/start/settle), all exit 1. These are specific examples, not exhaustive rejection of all unsupported semantics. No paid service used.

Continuous viewing, listening, actual zero-background user study, broader unsupported scenarios, semantic/factual correctness across the source, and overall creative acceptance were not tested. Silent output does not establish narration quality.
