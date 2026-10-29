# REA teaser v3 — actual preview review

Produced only the requested 24-second preview; no full film or publication.

## Actual execution

- Command: `node --import tsx examples/rea/revision-1/teaser-v3/render.ts`
- Remotion rendered 720 frames. FFprobe counted 720 H.264 frames, 1080×1920, 30 fps, 24.000 seconds; AAC stereo 48 kHz.
- Full FFmpeg decode exited 0.
- TaskRunner task: b2f1bf8c29e282d0424a930066c9974e7528f93d6642a2906bbf1f41166d06d6. First execution, cache false; output committed to CAS.
- MP4 SHA256: d3741a864760127962b7d434301d28e602dde679176d663ad2ad1f3c8ff1966b. Local copy hash matched manifest.
- Voice generated in logged-in ElevenLabs free web UI, Chen Mandarin Chinese, Eleven v4, no emotion tags; one continuous 22.909375-second source clip, no speed stretching. Source and provenance are under work/owner-revision-1/teaser-v3-voice.

## Changes

Opening demonstrates speed adjustment immediately. The same camera world travels from the game into the loaded-code clue, highlights the acceleration rule, and returns to the reconstructed adjustable demo. REA finds the code clue; the assistant interprets it and makes the demo. Footer explicitly identifies the animation as teaching reconstruction, not recorded execution.

## Actual visual inspection

Viewed exported frames 45, 100, 220, 360, 480 and 650 at full image size. Game, slider, highlighted rule and role attribution are visible; no sampled text clipping or overlapping captions. Opening and ending speed changes are represented consistently in the motion model. These frame checks do not substitute for continuous playback or listening.

## Owner review remains required

Full narration naturalness and audiovisual rhythm remain unverified by the model. Caption intervals were manually authored, not forced-aligned. The middle code explanation remains more static than the game and could still be the largest retention risk; no retention metric was measured. The code is simplified illustration, not a copied target source listing. The original evaluation.json retains its pre-review `sampled-frames-pending` marker and an inherited `23second` scope description; actual measured output is 24 seconds, and this report records subsequent frame inspection without rewriting committed artifacts. No milestone sign-off is implied.
