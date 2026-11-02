# Independent visual review — asset closure candidate 1

- Role: bounded visual reviewer; contract AC-04 and visual portion of AC-09.
- Candidate: `candidate-1/candidate.json`, SHA-256 `dd63c4ad8455a59cde4b981587166e052473cd153baa440b9d981e95e17b975a`.
- Verdict: **PASS for the nine inspected diagnostic frames**, subject to the limitations below. This is not a verdict on the entire asset package or a film.
- Independence: inspected the actual frozen images after reading the contract and before reading any other candidate-1 review. Did not modify source or evidence.

## Direct observations

Opened all nine frozen PNGs with `view_image` at their 720×1280 raster size. REA shot 7 frames 2400, 2648, and 2896 show the stated update-count-to-speed illustration, with the numerical display and gauge changing from 1.00× through 2.61× to 4.00× and a small figure appearing. All three visibly say the scene is manually arranged, includes inference, is not an actual execution record, and that animation values are illustrations unsupported as numeric values by the source. The image does not establish real REA execution or the actual effect of the rule.

rembg shot 5 frames 702, 749, and 795 display original × mask → foreground. The early frame shows the input and mask, the middle shows a dim output appearing, and the late frame shows the retained figure without the original blue background. The prominent labels say synthetic illustration/mask and that the rembg model was not run. The diagram communicates the intended operation at these sampled stages; it is not a measured segmentation result.

Synthetic shot frames 10, 50, and 90 show opacity 0.00, 0.52, and 1.00, with the target absent, dim, and visible. The frame explicitly labels itself a synthetic opacity test, non-project evidence and artificially set 0→1. It no longer presents itself as an REA example. The gauge is a generic indicator rather than a realistic opacity control, a diagnostic design limitation rather than a contract failure.

The sampled text and diagram elements are legible at the inspected raster dimensions, and no critical sampled content is visibly clipped. The frames use generous empty space and diagnostic labels; no cinematic quality judgment is implied.

## Evidence binding

Recomputed SHA-256 for the nine PNGs and their nine referenced frozen SVGs against `candidate-1/frozen/evidence/png/raster-binding.json`; all 18 matched. The binding records Edge headless 156.0.4314.58 and 720×1280 viewport. PNG hashes in early/middle/late order:

- REA: `92ba65e4e9c6a605f51149471b063d0a8a0563b5e650f0631d950c01c88e7635`, `3814f56463edfe5f265aec1be8ab467e0b4f88aa4b63f08518aa2c0486143abb`, `6bfe369fb2bdcb442ee1758a4dc5ad38e203397cc46ce9414bbafbc8775353e0`.
- rembg: `0a982a0a111295fe548fb46cdb7ed09cc48668131d5490c422ddfd8727236e72`, `3a04b7025164e0b753cdf480e575e88504cca3585df00c204ee776e34044b192`, `d2e06b6802783aef109822afeb28717122c53dca98c3864662d27574dd6eaf23`.
- Synthetic: `193edec6d4d13c387bb9d47df5d74b2dded754c725b57ef8d0eaa46ba7856eda`, `dbead2b674404dae4800e77a9a33291d253eed1a6b2696b01c4abb614a7d294e`, `6d0c83cedc6f7bc991c96a143d4a026a2122f4daefa76731c8b9bc8e3c083667`.

## Limits

Only these still images were viewed. No continuous animation or video was watched, no audio was heard, and no audiovisual synchronisation, natural narration, full-story comprehension, mobile-device legibility, creative acceptance, or reference-style match is certified. Traceability and integrity of every source, claim, package file and task lifecycle are outside this visual review and require their own evidence review. Historical UNVERIFIED and final owner AV acceptance remain unchanged.
