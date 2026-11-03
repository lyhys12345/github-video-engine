# rembg synchronized short / candidate 2 / product

- Role definition: frozen `reviews/judges-v2/roles/product.md` and `common.md`; active product scope P1–P4, P6 and corresponding R1–R6 product consequences.
- Candidate: `rembg-sync-candidate-2`, manifest SHA-256 `4c96c26e364dca2c1eda1efce5bbf0196de774866779af577bd81be39613f566`. Independently verified all 817 manifest source/evidence entries, including size and hash.
- Environment: macOS arm64, supplied Node 24.11.0, locked local FFmpeg/FFprobe. Review 2026-11-02 America/Los_Angeles (2026-11-03 UTC; exact start timestamp was not recorded). Scratch `/private/tmp/rembg-product-c2`; independent output `work/unreviewed-preview-v1/judges/candidate-2/product/`.
- Verdict: **PASS for the bounded product contract**. Owner final continuous AV, independent listening, and G6 remain pending/unverified; this verdict does not approve them.
- Independence: read contracts, actual frozen inputs, code, media, and raw validation records. No builder summary or peer judge report was used or read. Product only; no reliability verdict is issued from this context.

## One-page conclusion

Both promised short deliverables exist, independently decode, and contain 977 frames at 30 fps (32.566667 seconds, not an exact 32-second clip). Both retain the original text and the original audio bytes. Independently regenerated timelines and SRT strings exactly equal the frozen products. The preview retains its explicit pending badge and unreviewed artifacts; the second route uses the owner's explicit six-boundary declaration, while its confidence and review basis retain independent review and final acceptance limitations. No blocker or major product defect found.

A real public-entry invalid-input scenario rejects mixed timing modes with exit 1 before creating output; it does not fall back or claim success. The successful user scenario here is opening/validating the already-delivered frozen review artifacts and independently reproducing their timing/caption derivation. A new successful full renderer invocation was intentionally not run because this review's execution boundary prohibits new rendering. Existing actual media, raw commands and direct full decoding support the delivery conclusion; no mocked render is represented as an actual render.

## Contract coverage

| Clause | Verdict | Raw evidence / independent method | Limitation |
| --- | --- | --- | --- |
| P1 bounded clip and original inputs | PASS | Both `evidence/*/source-audio.bin` hashes match `31c47043…b03b4d5`; both MP4 probes and full decodes rerun; all seven caption texts rederived intact. | No target execution or new inference; no claim of hearing audio. |
| P2 explicit, exclusive modes | PASS | Read `src/short-segment/render.ts`, `plan.ts`, public `scripts/render-short-segment.ts`; public mixed-mode entry exits 1 with “mutually exclusive”; output absent. Independently exercised both accepted timeline consumers. | Full renderer success not reexecuted under no-render boundary. |
| P3 integrity and unresolved evidence | PASS | Exact-byte captured draft and PCM identity supplied to unreviewed validator; actual draft accepted and resulting timeline equals captured timeline. Wrong audio binding rejected independently in both routes. Source retains explicit validation, recomputation and unresolved proposal metadata. | Exhaustive fault/security review belongs to separate active roles. |
| P4 honest artifacts | PASS | Preview `captions.unreviewed.srt`, draft status and evaluation preserve pending/unverified states. Viewed actual preview PNGs 0, 488, 976: pending badge visible outside fades. At frame 488 captions and simulation disclosure readable. | No perceptual timing conclusion from PNGs. |
| P6 actual media | PASS | Independent FFprobe confirms H264 1080×1920, 30 fps, 977 frames and AAC; independent FFmpeg full decode exit 0 for both files. Direct WAV comparison finds all 1,514,685 original reference PCM frames after 19,200 silent lead frames, then 29,315 silent tail frames. | PCM reference is the frozen independently captured planar reference; did not regenerate or listen. |
| R1 owner scope | PASS | Separate exact question/response record says “六处已听审，切点均合适”; strict 1.1 sidecar cites record hash and explicitly limits scope to subtitle boundaries; audio/text/plan/phase/draft/audition hashes remain frozen. | Owner statement is attributed testimony, not this judge's hearing. Parent task supplies that this was the actual owner reply. |
| R2–R3 route separation/confidence | PASS | Owner input has cueTimingPath and no unreviewedAlignmentPath; rederived reviewed timeline matches exactly and remains caller-declared-reviewed-timing-independent-unverified, with ownerAcceptance pending. Viewed reviewed actual sample 492; no pending-preview badge is incorrectly carried to this route. | No whole-film acceptance implied by captions.srt filename. |
| R4 actual verification | PASS | Same independent probe/decode/PCM checks above; exact MP4 hashes match evaluations. | Sample checks are visual only. |
| R5–R6 preservation and acceptance boundaries | PASS within product scope | Both separate modes remain in frozen evidence; raw regression log records 38 files passed, 346 tests passed, 2 skipped. Product neither changes history nor aggregates other roles' status. | Did not rerun full suite; all-role aggregate is coordinator responsibility. |

## User operations and actual results

1. Opened frozen result folders and parsed actual MP4, timeline, caption and review records. Exact output MP4 hashes:
   - unreviewed-preview: `4c7c2e856dee456779a5acbcb6e106ba34db56a4400cba6767b7a9cc04f78c2f`.
   - owner-reviewed: `a045b9b610c6752026b26539116bd4fe8d8c986b768bb2d7c3574ed0e4aff960`.
2. Executed independent `raw/check.mts` with supplied Node and frozen tsx loader, importing frozen production validators. Exit 0. It uses actual captured inputs, compares both derived timelines and SRT bytes exactly, verifies complete narration text, 0.4-second lead, 977 frames, pending acceptance, and rejects wrong audio bindings. Raw output: `raw/check.log`.
3. Executed `PYTHONDONTWRITEBYTECODE=1 python3 /private/tmp/rembg-product-c2/media.py`. Exit 0. It checks manifest entries, reruns FFprobe and FFmpeg full decode of both actual MP4s, checks PCM inclusion and silence, and invokes the real public renderer script with an invalid mixed-mode configuration. Commands and parameters are preserved exactly in `raw/media.py`. Results: `raw/results.json`, both `raw/*-ffprobe.json`, both `raw/*-decode.log`, `raw/mixed-cli.log`.
4. Direct image inspection via image viewer of frozen `unreviewed-preview/samples/{0,488,976}.png` and `owner-reviewed/samples/492.png`. First/final preview frames show only the pending badge during intentional content fades; middle frames have readable captions and “合成插画与蒙版示意 · 未运行 rembg 模型”. This is sample-level visual inspection, not continuous video or listening review.

The first draft of the independent Python harness used an incorrect manifest evidence base (`evidence/evidence/...`) and stopped before media validation with FileNotFoundError. Corrected the harness to honor manifest-relative paths, then all 817 entries checked successfully. This was a reviewer harness issue, not a candidate defect; no candidate files were changed.

## Findings

No blocker, major, or minor product finding established. Rejection feedback is explicit and no render output is created for the mixed-mode boundary case. The reviewed and unreviewed outputs do not misstate owner review scope.

## Re-review and limitations

This report reviews candidate 2 and both preserved timing modes independently. It does not rely on an earlier judge verdict. No new rendering, inference, network operation, paid call, target project execution, source/evidence mutation, or listening was performed. Technical decoding does not establish speech correctness, caption perceptual alignment, or continuous AV quality. Those remain visible deferred owner tasks. A new successful render, actual owner final AV review, or a changed manifest would require corresponding fresh evidence; this product PASS cannot be reused for a changed candidate.
