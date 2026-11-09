# Source-footage showcase adapter

Experimental `showcase-reel/1.0`: `node --import tsx scripts/render-showcase-reel.ts --spec <manifest> --out <new-dir> [--frames-only]`.

1080x1920/30fps, three restrained palettes, real images/video as principal content. Each approved narration beat distributes its complete original-speed PCM among weighted shots with no intershot silence. Only sub-frame audio padding is added. Per-shot normalized source crops and optional synchronized focal panels preserve source context while making details readable. Each video uses an explicit30fps start/end source-frame interval; it plays once at original speed then holds its last selected frame (no hidden loop/speedup). Labels distinguish official demos, edited excerpts and explanatory annotations. No invented interface.

Exact script hash/owner approval, ordered narration hashes and local TTS receipt bindings are mandatory. Caption chunks must reproduce exact approved text. Timing remains proportional display estimation, not measured word alignment or listening verification. Input images/video are hash-bound; declared source dimensions/frame metadata must be prepared from real media probe. This tool is an experimental rendering adapter, not a complete durable-job or portable export implementation.

`--frames-only` creates real preview PNGs without an MP4. Final encode checks1080x1920/H264/AAC/frame count/duration with FFprobe and full FFmpeg decode. A successful decode is not a visual/listening PASS. Script approval and independent media review remain separate gates. Do not infer consent to publish.

Directed tests: `pnpm exec vitest run tests/showcase-reel.test.ts tests/approved-reel.test.ts`; `pnpm exec tsc --noEmit`. No full regression claimed. Private voice references, model weights and large media remain local.
