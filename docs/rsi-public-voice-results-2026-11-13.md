# RSI public local speech — actual results, 2026-11-13

Baseline: `3e47abc547b307850f6577cc6939edb79987ac65`. This cycle adds the explicit `qwen-public` option to the existing narrative pipeline. It does not replace the owner's Anna default, call a paid TTS service, execute a target repository or approve a formal video. See [setup](public-local-voice-v1.md) and [acceptance contract](../reviews/rsi-public-voice-v1/contract.md).

## What changed

- Public preset speech: Serena for zh-CN, Ryan for en-US, from Qwen3-TTS 0.6B CustomVoice. No reference recording/profile from the owner is needed.
- Fixed model revision `85e237c12c027371202489a0ec509ded67b5e4b5`, 11 data files, complete size/SHA-256 lock, 89 pinned runtime/build wheels and explicit provisioning. A separate reviewed python-sox source-build exception is documented and its resulting wheel is hash-checked.
- Doctor/first-owner, creative briefs, language gates, persisted speech tasks, zero-provider-dispatch accounting and generation-bound WAV receipts support the public option. Legacy English remains blocked.
- Imported exact approved projects can reuse their verified public recordings without a model/profile. Changed words need fresh approval and public synthesis; unchanged recordings retain their identities.
- Canonical Skill and English onboarding explain the selection, installation, approval stop and limits. Public setup remains optional; imported recordings and the existing owner-local choices remain available.

## Actual environment and media

A new Windows x64 Python 3.12.14 venv with no system-site-packages was created under `D:/gve-anna-render-temp/public-voice-20261113`. Public model files and wheels were obtained and checked against official metadata, then the pinned wheel set was installed offline with `--require-hashes --only-binary :all:`. `pip check` passed. This used the public bundled Python interpreter and existing Node/Chrome/FFmpeg; it is not a new-machine or other-OS certification. Model/venv/profile/reference files are not committed.

Actual device: RTX 3070, native BF16, CUDA 12.8. Core runtime: torch/torchaudio 2.8.0+cu128, qwen-tts 0.1.1, transformers 4.57.3, accelerate 1.12.0. The worker uses SDPA; neither FlashAttention nor a SoX executable was needed for this exercised path. Upstream warnings were preserved.

| Real recording | Format / duration | SHA-256 |
| --- | --- | --- |
| Ryan: “A request arrives.” | Mono PCM16, 16 kHz, 2.56 s | `76f55f68788a26b5417600b144bf7c46c0c0383bad8e568b30482534b9326408` |
| Serena: “请求已经到达。” | Mono PCM16, 16 kHz, 1.68 s | `919935eaeeb8c51e930cfbea4340debfa0345d6129bf181c65cb6afce734bbe9` |

Both actual WAVs passed FFprobe and full FFmpeg decode. Cold worker wall times were 19.68 s / 12.99 s; these exclude the complete CLI/render workflow. Repeated model verification and loading add substantial local I/O overhead. Content completeness, pronunciation and naturalness remain unverified by listening.

## Real editable voiced closure

The public CLI test used an explicitly TEST ONLY synthetic source transport, authored fixture and fixture-only approval receipts. It did not approve or generate the real HTTPX project.

The fixture contains five scenes: three supported, narrated routing illustrations and two visibly unproduced boundary placeholders. It proves a partial technical preview and editable closure, not a complete promotional film. Its dense small provenance text is not a mobile-quality acceptance result.

The successful registered test produced an 18.000 s MP4: 540 H.264 frames, AAC mono at 48 kHz. The three original recordings measure 2.56 / 3.28 / 2.80 s, each within its authored four-second scene, at playback rate 1. No clipping, stretching or automatic timing extension was used.

- Baseline and model-free replay movie SHA: `1edea3ffe86c1b1c619092ea7fa846defdc2a0b631eccb06b54049faca8fadc7`.
- Registered package digest: `cb3f474e4e2df435697227bab3f42c2d82b5f5a264d762ecde8f81b7514f776a`, 105 files, three speech imports. The original workspace was renamed away and the configured public profile was explicitly unavailable for import/replay.
- Changing “A route matches.” to “The handler runs.” rejected the old exact approval. A new TEST ONLY receipt allowed one new recording; the other two generation/receipt identities were reused.
- Edited movie SHA: `13bbf0affad2ea6119ab47c2a6c7295375cf744dc9880dd78de91f009e2c9863`. Original movie and package stayed intact. Baseline, replay and edit fully decoded.
- Real registered artifacts: `D:/gve-anna-render-temp/public-voice-20261113/tmp/gve-pv-5t65Qw`. The raw verification, baseline/edited frames and original CLI outputs remain there. Portable files contain no Python runtime, model weights or local voice profile.

A separate same-workspace recovery also completed this closure after the first browser launch failed. Its package digest is different (`37682122…97b1f`) because execution metadata differs; do not confuse it with the registered final run.

## Tests actually run

**86 distinct targeted tests passed:** 74 existing/extended JS tests across nine suites, seven new public-adapter tests, four public Python tests, and one registered real-media test. Repeated subsets and independent rechecks are not added again.

The registered media test was `pnpm exec vitest run tests/public-voice-workflow.media.test.ts`, with its documented opt-in public-profile environment. It passed in 523.448 s (528.50 s total). The seven adapter tests use real miniature files and the real task/artifact store with a mocked Python process; they test missing/tampered data, timeout, cancellation, partial cleanup, invalid audio/metadata and cache separation. They are not GPU tests.

Actual other checks: `pnpm typecheck`, `pnpm test:catalog` (112 classified entries), the canonical Skill validator, static agent-entrypoint validation and source/doc patch checks. The public setup helper also actually downloaded and built the pinned SoX source in a second clean bootstrap venv, producing the same wheel SHA.

Failures remain visible:

1. Initial bootstrap copied a malformed wheel checksum; installation rejected it. Official PyPI metadata established the corrected hash, and the isolated build passed.
2. The first real worker probe blocked harmless `socket.gethostname` during Windows platform discovery. A narrow exemption and subprocess regression fixed it; other audited socket operations remain denied.
3. The first adapter test fixture had an invalid fake executable; six tests failed. Correcting that fixture produced seven passing tests, with no product-code relaxation.
4. The first registered movie run failed at Chrome startup. Controlled diagnostics succeeded and the previous validated Windows media wrapper allowed same-workspace recovery plus the final full registered rerun. The exact initial Chrome cause remains unproven; no claim of a renderer bug fix.
5. An additionally invoked broad Python lane stopped in unchanged macOS-oriented `local_alignment_test.py`: 19 cases ran, seven errored on hard-coded `/private/tmp` under Windows. These were not repaired, hidden or counted as public-module successes. No full repository regression was run.

## Independent review and limits

[Astra's original findings](../reviews/rsi-public-voice-v1/architect-review-initial.md) remain preserved beside its final review; [Terra's onboarding preflight](../reviews/rsi-public-voice-v1/product-preflight.md) remains separate from final product/media review. The architect independently checked official model bytes, installed hashes, frozen source, actual WAVs, full movie decodes and every portable file. The product reviewer inspected real baseline and edited frames, including the caption change and unproduced scene markers. Final reports in `reviews/rsi-public-voice-v1` cover bounded engineering requirements; Git/Drive delivery is verified separately.

Current support is Windows NVIDIA CUDA, short zh-CN/en-US preset utterances (one line, at most 120 Unicode code points, output at most 30 s). No CPU/macOS/Linux, other GPU or real Claude session certification. Runtime checks and Python audit hooks are not an OS sandbox. Actual hearing, full continuous AV, factual acceptance of a real repository story and final owner acceptance remain pending. The public presets do not provide guaranteed 0.6B emotion control or reproduce Anna/Chen.

Next useful work is reducing repeated model verification/loading overhead without weakening integrity and validating a lighter CPU path separately. A real project still needs its complete updated script/storyboard and exact owner approval before video generation.
