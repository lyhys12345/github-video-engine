# VoiceStudio A/B review build

Owner approval: current user “可以”, approving candidate-2 and the recommended A+B production, as conveyed by parent agent. C is not generated. Approved-document hash and exact derived script hash are recorded separately for each variant. Historical candidate-2 no-media status remains unchanged; the new approval records supersede it only for A+B review generation, not publication/final acceptance.

Both use the same offline local Chen profile, official sample WAVs, real fixed-commit screenshots and rendering adapter. A opens with the missing-role-line problem and inserts the two samples after narration line2. B opens with the same samples. No voice-speed changes, no cut narration, no paid APIs, no target-repository execution. The common sample excerpts are2.93/3.72seconds rather than the script's rough2seconds each; retained existing owner-reviewed cuts, not independently listened natural-cut proof.

Real Model Manager screenshot: https://raw.githubusercontent.com/debpalash/VoiceStudio/2e195d72d3794a88b7cb37f87a3e92a20193574e/docs/media/electron/models.webp
SHA256 `cfbbfbfa4b20b2b3f35243880bf5fb15b59ad1ad97b11aae944cee812f2eac0d`. Used by both variants. The license badge remains visible; no commercial-use claim is made.

Judge required A's actual engine selector instead of generic UI: repaired with this real asset, then reviewed again. B uses the same selected-engine image. Both final sampled preflights passed. One intermediate preflight failed bundling an extension-resolved server helper; fixed by isolating a browser-safe active-segment helper; failure directory retained. No unsuccessful run counted as passed.

Directed unit tests:9 passed; TypeScript typecheck passed. Tests cover exact script/receipt/text binding, caption preservation, PCM padding, middle/opening/end sample ordering and no stale captions during samples/gaps. Full regression not run.

The manifests saved here are provenance copies, not portable runnable media packages: relative paths refer to the local source directories. Source audio/model/reference and large media remain local. Caption timing is estimated; naturalness and continuous audiovisual quality remain UNVERIFIED pending owner review. Independent raw reports preserve exact scope.

Final actual outputs, both720x1280/30 H264/AAC, full FFmpeg decode passed:
- A `work/voice-style-ab-v1/A/candidate-v1/review.mp4`,44.933333s/1348frames; SHA256 `b04a90046eab212f2f761252227ea50a1b1e8b86fda5e3393ac476cba05ed3fa`.
- B `work/voice-style-ab-v1/B/candidate-v1/review.mp4`,46.933333s/1408frames; SHA256 `1fdebd2b2760bd14bae167b367fe3d180248893062eb61cb11ea3dfaf47e6658`.

Actual command for each: `node --import tsx scripts/render-approved-reel.ts --spec work/voice-style-ab-v1/<A-or-B>/manifest.json --out work/voice-style-ab-v1/<A-or-B>/candidate-v1`. Final encoded frames were separately extracted via FFmpeg for Judge checks. See independent raw reports for scope; builder media checks alone do not claim perceptual approval.
