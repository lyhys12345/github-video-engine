# Independent review — continuous explainers candidate 1

**FAIL — CX-04 causal mask application is not implemented.** This candidate remains immutable historical evidence; it must not be delivered as accepted. Final listening, precise spoken alignment, voice quality and continuous audiovisual acceptance remain UNVERIFIED / owner pending.

Exact manifest SHA256: `fd76dc72f57f2eb358041508c6bf365ce43a8f353e48306b3f04790a33f1cc04`. All 542 files were independently hashed before and after checks with no mismatch. Raw independently executed checks, probes, commands, isolated tests and rejection evidence are in `independent-candidate-1/`. No builder summary was used to establish technical results.

## Findings

**CX04-MASK, major.** Frozen `src/short-segment/continuous.ts:55` draws the original scenery through `remaining-bg`; line 64 defines that clip as a moving rectangle. The subject is rendered separately and remains visible. The displayed black/white mask is merely an overlay; its geometry does not control which original image pixels survive. Thus the visible process is a background wipe plus preserved foreground, not the contract's same-image, same-mask operation. Builder independently self-reported this after freezing; this review confirms it from the actual frozen source. Required fix: define the original image once, apply the actual foreground mask to that same image, and derive the edge magnification from that masked image. Rerender all affected outputs under a new candidate and recheck actual samples.

**CX04-SPEED, minor.** Frozen `continuous.ts:21` switches from auto speed to `0.5 + 0.5*sin(0)` manual fraction at the test boundary. In the frozen timeline the boundary is frame 955; the auto value at 954 is approximately 11.985 while frame 955 starts at 9.000. This resets the movement rate despite the continuous-scene objective. Begin manual control at the actual final automatic speed and transition smoothly. The visual reviewer has been notified to inspect the new boundary.

## Checks that actually passed

Independently reprobed and fully decoded all four narrated MP4s and both silent 3-second rule proof MP4s. Main REA is 51.866667 seconds / 1556 frames; main rembg is 32.566667 seconds / 977 frames. Narration revision is 32.033333 seconds / 961 frames; asset revision is 32.566667 seconds / 977 frames. All narrated outputs have 1080×1920 H.264 yuv420p at 30fps plus stereo AAC 48kHz, within declared bounds. Both rule clips have 90 valid silent frames.

For every narrated output, independently decoded the original MP3 and lossless narration WAV and compared every original PCM sample after the 400ms lead. Samples are unchanged at original speed, with only digital silence before and after. Exact narration equals selected current story shots, phase captions, timeline text, voice declaration and matching fresh generation receipt recording/hash. Source closure hashes were checked independently.

Eight frozen short-segment/continuous tests passed in a reviewer-owned source copy. Independently called the frozen render API against copied stale-voice and altered-unclosed-asset fixtures: the actual expected receipt/hash errors occurred before output creation. The narration revision changes only the opening words in story; asset revision preserves exact source audio, narration WAV, timeline, captions, visual plan, story and compiled animation bytes. Revision predecessor MP4/evaluation hashes and source-preservation fixture hashes were recomputed. Rule before/after plans differ only in authored endpoint 12→9, preserving 6, .001 and the `<13` condition; actual clip hashes differ. Its revision decision marks plan changes and stale media/review.

The first independent media-check attempt stopped on an overly strict reviewer equality assertion (`50.83424999999999` versus `50.83425`). The checker was corrected to a 1e-9 numerical tolerance, with the attempt retained in `attempt-1.txt`; candidate bytes were not changed.

These technical passes do not cure the causal-visual failure or establish perceptual AV quality. A new freeze and affected independent reviews are required.
