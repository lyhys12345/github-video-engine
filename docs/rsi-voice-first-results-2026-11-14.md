# RSI first-synthesis stability and delivery pace — 2026-11-14

Baseline: `57795ea0c7b70bb34adfee04f064542928167f7a`. This cycle separates the wait for a recording from how quickly its narration is spoken. It makes no formal project video and does not call a paid service.

## Implemented changes

- Public Windows architecture detection uses the interpreter build (`sysconfig.get_platform()`) instead of a shell-derived machine string. The existing Windows x64, CPython 3.12, pinned-runtime and CUDA checks remain.
- Public and Anna/Chen model-file verification use bounded 1 MiB reads. Every byte is still hashed and compared; file metadata checks remain. Reference recordings and Python executables keep their previous read buffers.
- Anna/Chen reject non-finite, incorrectly shaped, empty or over-budget source waveforms before resampling/PCM output, then reject non-finite/silent resampled output. The existing final WAV checks remain.
- The Skill and briefing guidance preserve a user's delivery preference separately from video duration and generation latency. This owner's slightly brisk, natural Anna preference is scoped to this owner. Notes do not become an unsupported model speed parameter or approve a film.

Worker changes are part of existing generation identity via worker SHA. Existing profiles remain valid, but a new worker can create a different generation task for unchanged text. Previously verified recordings are not relabeled as newly generated.

## What the performance experiment established

Six initial scratch launches failed before runtime import because `platform.machine()` was empty in the scrubbed environment. A Node subprocess reproduction returned the native build `win-amd64` in that same environment. Adding only the architecture environment variable allowed the original worker to run for a conditional baseline; it is not a shipped workaround. This does not establish the cause of failures in earlier cycles.

Four subsequent fresh-process public Serena trials ran sequentially with the same 39-character input, model, seed, BF16, SDPA and token budget. All produced the same WAV hash and 9.040-second duration, and fully decoded. The OS file cache was not flushed.

| Trial | Intra/inter-op threads | Imports: Torch / SciPy+Qwen | Load | Synthesis | Worker total |
| --- | --- | --- | --- | --- | --- |
| Default 1 | 4 / 12 | 12.66 / 22.50 s | 4.44 s | 62.39 s | 106.43 s |
| Candidate 4/2 | 4 / 2 | 4.22 / 14.60 s | 3.49 s | 54.91 s | 79.39 s |
| Warm default 2 | 4 / 12 | 4.92 / 11.99 s | 3.38 s | 58.62 s | 81.04 s |
| Candidate 2/1 | 2 / 1 | 4.16 / 12.36 s | 3.65 s | 66.80 s | 89.09 s |

The first import-time difference happened before thread settings were applied. The comparable 4/2 hash-plus-worker difference was only 0.55% in one trial, and 2/1 was slower. Neither tuning was adopted; no inference speedup is claimed. The scratch profiler used 8 MiB Python reads for its preceding model hash, so its hash-plus-worker figure is not an actual engine endpoint benchmark.

A separate Node 24.22.1 experiment checked all 11 locked model files (2,498,383,610 bytes), with exact inventory, ancestor, size, inode, timestamp and SHA checks. Three interleaved repeats per buffer used a warmed filesystem cache:

| Buffer | Full verification times | Median | Observed chunks |
| --- | --- | --- | --- |
| 64 KiB | 3.522 / 4.199 / 2.963 s | 3.522 s | 38,131 |
| 1 MiB | 1.616 / 1.776 / 1.587 s | 1.616 s | 2,391 |

The observed median saving is 1.91 seconds, or 54.1%, **for model verification only**. One mid-stream cancellation per variant returned `ABORT_ERR`; the 1 MiB variant did not consume the entire weight file after cancellation. This is not a 54% reduction in whole-recording latency, streaming first-sample time or a machine-cold guarantee. Model inference and imports still dominate.

## Actual engine recordings and Anna audition

The final public adapter completed in its normal scrubbed environment, without restoring the architecture variable. The first restricted execution had synthesized audio but failed at the sandbox's hard-link publication boundary. A scoped local retry resumed the same task at attempt 2 and published successfully, retaining the first failure and both attempt receipts. The successful fresh worker call took 72.336 s; an exact cache repeat took 55.88 ms. These are actual endpoint observations, not a controlled before/after wall-time comparison.

Task `618ec5394e00a5c2dd6ec9fa905fae8233ca681bc2c70b3b76e9cd71490ad6c6` produced 9.040 s of mono PCM16 at 16 kHz, with the same SHA-256 `fcafb9ae49253debc8a45385ce3d837a68f744e9f66f82cdf7ae196eadc495ae` as the profiled original worker. Full decoding passed; owned worker and task temporary directories were empty. The manifest SHA is `dafe23bbcd38efecc45ef4a0ad028a38c4d20bf8de9f6d669a0416c9e52cc480`, and the new worker SHA is `aede4741e67518b10f820054fb59308de669fc97ab3c182d6bbb5ae6a0771090`. This demonstrates successful normal-environment generation and retry, not heard-content or naturalness acceptance.

Anna A and B completed through the production adapter. A resumed its original failed-publication task at attempt 2; B succeeded at attempt 1. Both output exactly one committed generation artifact, verified imported TTS receipts and empty owned temporary directories. A took 58.55 s for generation/import and produced 5.440 s of audio; B produced 5.200 s. This single pair is 0.240 s (4.4%) shorter for B, without playback speed changes. This is not a general rate guarantee or a naturalness verdict.

The local listening files are `D:/gve-anna-render-temp/voice-first-20261114/anna-a.wav` (174,124 bytes, SHA-256 `7cc5a7d176ce567af767ceeb6ec1051a630583cd43c823b4233d95df1b2da42d`) and `anna-b.wav` in that same directory (166,444 bytes, SHA-256 `69768d0d224df9ef376fa19e4bc6c726c98b5ad6cf453562ccce22cc2631ad9e`). Both originals and listening copies fully decoded with FFmpeg exit 0 and exact matching hashes. The private profile hash was unchanged. Audio remains local and is not included in Git.

A separate public task was cancelled after observing its worker request. It rejected 372 ms after the abort signal, retained cancelled state with zero outputs/no result, and left owned worker and task temporary directories empty. The two earlier hard-link failures remain recorded, followed by successful retry on the same task IDs; no artifact was committed by the failed attempts.

The intended A/B keeps spoken characters identical and playback rate 1:

- A: 把项目链接发给它，先看看脚本。确认没问题，再生成视频。
- B: 把项目链接发给它，先看看脚本，确认没问题再生成视频。

These are TEST ONLY delivery auditions, not a project script or video approval. Native punctuation can affect pauses but is not a dependable speed control. The installed 0.6B CustomVoice ignores instruction text; the Base cloning interface exposes no native rate parameter. We do not change the voice/reference, add `atempo`, shorten token budgets, drop words, or automatically choose the shortest clip. Spoken-content completeness and naturalness remain unverified without listening.

## Executed validation

54 distinct JavaScript tests passed across the public adapter (19), TTS (25), capabilities (7) and narration policy (3). The 19 public adapter tests were rerun after the read-buffer change and passed; they are not added again. Four Python unittest methods passed: three public-worker tests and one Anna/Chen method containing ten waveform subcases. The latter uses mocked inference and arrays. These are 58 top-level tests, with the ten subcases reported explicitly rather than inflating the total.

TypeScript typecheck passed. The inventory check classified 113 entries. The canonical Skill validator passed. A real `brief-check` saved the pace notes while leaving the example `needs-clarification`, `scriptApproval: pending`, and voice availability untested. It did not approve media.

The implementer did not redirect full test stdout initially. Its retained transcript extract identifies actual tool sessions, command summaries, counts and exit codes; it is labeled an extract, not an untouched console log. No full repository regression was run.

## Review and boundaries

Independent review decisions are recorded separately in `reviews/rsi-voice-first-v1/acceptance.md` after freezing this report. At freeze time those decisions have not yet been made. Existing source/model/reference/runtime checks, timeouts and declared limitations remain. Anna's pre-existing hash reader still has no abort-signal parameter; this cycle does not claim that Anna hash cancellation improved. Owner listening, pronunciation, content completeness, subtitle alignment and formal video approval remain separate.

Raw experiments are under `C:/Users/luyuh/Documents/Codex/voice-first-20261114`; the production adapter and audition paths are recorded in `reviews/rsi-voice-first-v1/evidence/final-adapter/`. Private reference/profile/model files and generated audio remain local. Only source, tests, docs and compact text evidence are intended for Git. The Google Drive handoff remains outside the repository.

