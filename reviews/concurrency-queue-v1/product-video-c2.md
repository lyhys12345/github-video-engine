# Independent targeted product / visual re-review — concurrency queue c2

Candidate `candidate.json` SHA-256 `11aced43f326d05abdafad047e96abe967ec123c9993160bcdd2d69e01e4f9c3`. Independently checked all 665 declared file lengths and SHA-256, zero mismatches. C2 operator identifies C1 manifest `96ca6333184fcd68400a179fa2a9f7e24b9046f06cc283a3a278fdddec047e93`; the C1 failure was retained, not overwritten. No other judge report was read. Tests used exact-source extraction and copied state within this directory; target repository was not executed.

## Targeted verdict

**Original frame-455 completion mismatch: PASS for inspected boundary frames.** The original C1 title asserted four tasks had settled while one still ran. C2 frames 454–456 show `Final stage in progress` with the actual displayed counters. At 497 it still says in progress while the last card is leaving; at 498–499 all four cards are settled and the title reads `All four tasks have settled`. In the independently viewed serial clip, frames 400 and 421 show in progress and 422/454 show the completed title only when all four are in settled. The synthetic clip at 244 is still in its prior phase; 245/329 explicitly say the demonstration pauses, while one task waits and three run. These are observations at the specified frames, not a proof of every frame or of narrative quality.

**Product migration: PASS for the exercised scope.** Overall product and audiovisual/owner acceptance remain UNVERIFIED. Continuous viewing, listening, naturalness, actual user comprehension and real phone/platform playback were not performed.

## Actual images and media

Independently decoded the three final C2 MP4s to 360×640 PNGs and individually inspected parallel frames 454, 455, 456, 497, 498, 499 (`p-01`…`p-06`); serial frames 400, 421, 422, 454 (`s-01`…`s-04`); synthetic frames 180, 190, 200, 244, 245, 329 (`t-01`…`t-06`). The C2 parallel 455 image replaces the contradictory completion wording with in-progress text while Running 1/2 and Settled 3 remain visible.

The prior synthetic Tile B overlap is improved at 190: departing Tile C is outside the B card. At 200, entering Tile D still covers a narrow portion of Tile B's left edge, but B label remains visible in the sampled frame. Text is larger than C1 yet individual task/status text remains small at 360 pixels; mobile accessibility and player overlays remain untested. Illustrative and silent labels remain visible. These selected stills do not establish smooth transitions or zero-background understanding in continuous playback.

Independent ffprobe and full ffmpeg decode to null succeeded for all three: parallel H.264 720×1280 24fps, 528 frames / 22 s, SHA-256 `f4e900b7c1e9133a8e8f5d5e67c8c105a44e750c8a74f3167c522734d11c7449`; serial 455 frames / 18.958333 s, SHA-256 `6a3bad6f5adf765accceba58ef404a9a8a796d0974a1a22a5ad56c0c3d2ff778`; synthetic 330 frames / 13.75 s, SHA-256 `b770fffb27b9cbfa0e6689e1b8aeaead5ccb6422608c3bbba726a29876234af3`. No claim of hearing audio: the checked previews are silent.

## Actual version and CLI checks

In isolated copied `queue-state`, original 1.2 p-limit movie task `78d3b19f4ca84c6033bcdecbdf4ea7d900184b459e39bbf970259639c766f63e` status returned succeeded and integrity verified. Fresh default export succeeded and re-exported MP4 SHA-256 `66063156d5e0ab56588b96a207438772174b2afe5845160767036afcefbec3a7`, matching C1.

Submitting a changed 1.2 plan (first beat +1 frame) and invoking `presentation render` on the prior 1.2 plan task each exited 1 `PRESENTATION_MIGRATION`, explicitly directing author to 1.3 and explaining existing task availability. The actual 1.3 plan submission returned task `675151c892e30fd650165898eeb5fb2e509d473f652f26b64476e5a700d02344`, cached true; its render command returned cached succeeded preview `7c2d5ad6b5c66b2650648ada3aa9cfa17b7903a2c3a3d15a0b0f4e1b74857f35`. Fresh default export succeeded and hashed to the same C2 parallel MP4 above. This establishes availability and cache replay, not a fresh 1.3 encode or interrupted recovery. No unsupported-path, new parameter edit, broader user study, full factual audit, or active cancellation was performed in this targeted re-review.


