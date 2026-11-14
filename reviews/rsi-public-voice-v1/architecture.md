# Public voice v1: architecture and primary evidence

Date: 2026-11-13. Architect-only investigation at repository HEAD `3e47abc547b307850f6577cc6939edb79987ac65`. No implementation edits, package installation, model download, synthesis, tests or listening were performed for this report. Official HTTPS text/API metadata were read. This is a design recommendation, not a review PASS or runtime validation.

## Decision

Use `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`, with explicitly selected built-in Serena for Chinese and Ryan for English, in an independent Python environment and model directory. An appropriate public provider name is `qwen-public`; final profile naming belongs to the implementation contract. Public profiles must contain no reference audio, reference transcript, private voice path or clone API invocation. Preserve Anna/Chen as explicit legacy choices and preserve the established owner default unless the current user instruction explicitly changes it; onboarding should clearly expose the public choice without silently changing a persisted approved voice.

This is the smallest integration risk because the existing Windows adapter already calls qwen-tts 0.1.1 and Torch 2.8.0+cu128. Target support should initially be Windows + compatible NVIDIA CUDA + native BF16, with actual RTX3070 verification. CPU, macOS, Linux and arbitrary GPUs are not certified by this module. The design's language scope is zh-CN and en-US. Do not claim success on either until real output exists.

## Primary sources, inspected facts and limits

1. [Official Qwen project](https://github.com/QwenLM/Qwen3-TTS): Apache-2.0 source license; CustomVoice has built-in speakers; its table lists Chinese and English among supported languages. Serena is Chinese-native and Ryan English-native. CustomVoice generation accepts text/language/speaker without a reference. Upstream recommends an isolated Python 3.12 environment. Its published examples are not proof of performance on this host.
2. [Official Qwen inference source](https://raw.githubusercontent.com/QwenLM/Qwen3-TTS/main/qwen_tts/inference/qwen3_tts_model.py): `generate_custom_voice` clears `instruct` for the 0b6 model (lines 732-733 at inspection). Do not expose emotion/instruction control as a supported 0.6B capability. This is stronger evidence than the broader model-card claim.
3. [Official project package declaration](https://raw.githubusercontent.com/QwenLM/Qwen3-TTS/main/pyproject.toml): qwen-tts version 0.1.1, Python >=3.9; pinned transformers 4.57.3 and accelerate 1.12.0, with gradio, librosa, torchaudio, soundfile, sox, onnxruntime and einops dependencies. Several transitive versions are unspecified upstream, so merely pinning qwen-tts is not a reproducible environment.
4. [Official PyPI release metadata](https://pypi.org/pypi/qwen-tts/0.1.1/json): wheel `qwen_tts-0.1.1-py3-none-any.whl`, SHA256 `11a290d8dabc7ef91a90c54478c8ab19b3edb1d85c0882313721892bdc4af15d`. Prefer the wheel, not source installation or arbitrary repository execution.
5. [Official PyTorch installation archive](https://pytorch.org/get-started/previous-versions/#v280): Torch 2.8.0 and torchaudio 2.8.0 have Linux/Windows CUDA 12.8 wheels from `https://download.pytorch.org/whl/cu128`. A matching wheel set, GPU/driver and actual synthesis still require validation.
6. [Official immutable model tree](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice/tree/85e237c12c027371202489a0ec509ded67b5e4b5) and [official API metadata](https://huggingface.co/api/models/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice?blobs=true): model is labeled Apache-2.0, with safetensors weights and a bundled speech tokenizer. Metadata read returned the immutable revision and file sizes below. License labels are provenance evidence; they are not a guarantee about all possible generated utterances or speaker likeness rights.
7. [Official Kokoro Chinese model card](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh): Apache-2.0, 82M, Chinese and English, with public voice tensors; its example adds `misaki[zh]`, `soundfile` and espeak-ng. It is a reasonable future lighter option, but would introduce another model/phonemization/runtime stack here. No Kokoro inference was tested.

## Immutable model inventory

Pinned repository revision: `85e237c12c027371202489a0ec509ded67b5e4b5`. Never use `main` for provisioning or inference identity. The inference allowlist contains exactly these 11 files. The speech tokenizer is already bundled, so a separate mutable tokenizer download is unnecessary.

| Path | Bytes | SHA256 from official LFS metadata |
| --- | ---: | --- |
| config.json | 4908 | Compute from immutable downloaded bytes during provisioning |
| generation_config.json | 245 | Compute from immutable downloaded bytes during provisioning |
| merges.txt | 1671839 | Compute from immutable downloaded bytes during provisioning |
| model.safetensors | 1811626576 | bc3c7e785eb961179c25450d1acff03f839e0002f2f3a5aeb67b5735c0fa2adb |
| preprocessor_config.json | 127 | Compute from immutable downloaded bytes during provisioning |
| speech_tokenizer/config.json | 2336 | Compute from immutable downloaded bytes during provisioning |
| speech_tokenizer/configuration.json | 76 | Compute from immutable downloaded bytes during provisioning |
| speech_tokenizer/model.safetensors | 682293092 | 836b7b357f5ea43e889936a3709af68dfe3751881acefe4ecf0dbd30ba571258 |
| speech_tokenizer/preprocessor_config.json | 234 | Compute from immutable downloaded bytes during provisioning |
| tokenizer_config.json | 7344 | Compute from immutable downloaded bytes during provisioning |
| vocab.json | 2776833 | Compute from immutable downloaded bytes during provisioning |

The Git `blobId` values for small files are not SHA256 checksums. The release must commit a complete file lock with SHA256 and byte length for all 11 files, immutable URLs, source/license links and model revision. Verify weight hashes against the values above before model loading. Keep model bytes, venv, profiles with absolute machine paths and wheel caches ignored/outside Git. Store license attribution/documentation separately; do not claim license terms are contained in a model file named LICENSE when the inspected tree has no such file.

## Provisioning and runtime contract

Provisioning is explicitly online and separate from generation. It should make a new isolated venv without system-site-packages, use Python 3.12, download only the approved model-file allowlist at the pinned revision, install reviewed pinned wheels from PyPI/official PyTorch, then verify hashes and produce a local profile. Do not copy the existing Chen environment or reference directory. A known existing Python executable may create the venv, but the resulting environment must not import its private/site packages.

A release-quality reproducible installation requires an exact transitive requirements lock plus wheel hashes (and any unavoidable explicitly disclosed build prerequisite). Prefer `--require-hashes` and `--only-binary=:all:`. No `pip -U`, editable source install, unaudited third-party loader, automatic FlashAttention build, target-project execution or hidden dependency installation in generation. Record exact Python, wheel versions, GPU, driver/CUDA availability and model size. If a dependency lacks a wheel, report and bound that exception rather than silently running a source build. Probe imports and required features, not just package versions. `pip freeze` alone does not authenticate wheels.

Use a separate reviewed worker with `generate_custom_voice`, local model path, `local_files_only=True`, `trust_remote_code=False`, offline/telemetry flags before imports, sanitized environment and a network-denial audit hook. The hook is not an OS-level network sandbox. Use the established eager BF16 implementation first; SDPA is optional only after host validation, and FlashAttention is not required. Validate supported speaker/language, choose fixed generation settings and bound text, token count, timeout and output size. Treat hitting a token ceiling as a potential truncated utterance, not proof of completeness.

Return one finite, nonempty mono PCM16 WAV at 16 kHz, resampled from model 24 kHz output; validate real decoded length and nonzero signal. This fits the current renderer's 48 kHz placement accounting. Keep pending owner listening explicit. Identity/cache binding must include exact text, language, speaker, immutable model lock, runtime/dependency identity, worker hash and generation settings. Fixed seed is useful but does not promise byte-identical results across hardware/software.

## Existing integration surfaces inspected

- `src/workflow/narration-voice-policy.ts`: finite voice list and owner default; blanket local zh-CN restriction. Make language eligibility depend on the selected public profile without enabling English for Anna/Chen/Huihui accidentally.
- `src/workflow/creative-brief.ts`: strict profile enum and blocker call. Preserve approved voice binding; mismatched runtime selection still blocks. Public voice availability is separate from script approval.
- `src/providers/capabilities.ts`: doctor currently sends every non-Huihui local voice to the clone probe. Route public voice to its own readiness probe and actionable setup errors. Doctor readiness is not synthesis or listening proof.
- `src/workflow/narration-voice.ts`: dispatch, imported WAV receipts, `samples * 3` placement conversion. New worker must meet 16 kHz generation contract or this conversion must become explicit and tested.
- `src/workflow/narrative-run.ts`: approved brief chooses a profile but current NarrationSource does not carry language. Thread language to generation and receipt identity, or use language-specific immutable profile names; never silently synthesize English as Chinese.
- `src/tts/local-chen.ts`: existing pattern for local-file hash checks, worker isolation, TaskRunner/caching and local-import receipts. Do not reuse its clone-specific profile, hardcoded Base model hash, reference rights fields or fallback branch for public synthesis.
- `scripts/windows-local-chen.py`: existing worker requests Chinese voice cloning and emits 16 kHz. Public generation needs a separate CustomVoice call. Its availability probe checks native BF16; preserve clear platform limitations.
- `config/local-voice-v1/runtime-lock.json`: this inspected lock is for historical mlx-audio, not the current Windows Qwen environment. Do not present it as the public Windows runtime lock.

## Bounded acceptance evidence

A1. Fresh public-only setup succeeds using documented pinned installation in a new venv/model directory. No Anna/Chen profile, reference audio or private path exists in the public configuration; demonstrate this without reading unrelated private assets. Evidence includes provisioning commands/logs, complete model lock, dependency lock and machine details.

A2. Real short Chinese and English utterances generate through the engine adapter with public preset identifiers; verify WAV format, nonzero samples, media duration, actual runtime and exact text/model/speaker/language receipt hashes. Save outputs and metadata. Listening quality and perfect pronunciation remain pending human review unless actually listened to.

A3. A synthetic engineering story yields a real voiced editable package/MP4 through the existing standard integration path, with WAV receipts, captions, editable source/manifest and decoded audio/video checks. It must not be the unapproved HTTPX real project. Portable output must open/revalidate without access to the synthesis model or a private voice reference; regeneration may still need the public runtime.

A4. Targeted tests cover supported/unsupported language-profile combinations, explicit selection, missing profile/runtime/model, altered config or weight hash, unknown speaker, cache separation by speaker/language/text/model, correct sample rate, nonzero/finite audio, abort/timeout and no fallback. Preserve relevant existing tests. Avoid turning mocked synthesis tests into claims of real model validation.

A5. Script review gate remains intact: no authoring or voice setup action constitutes owner script approval. Formal project generation waits for that approval. Engineering Judge decisions are labeled as delegated engineering authority. Final continuous audiovisual/voice-quality owner acceptance remains separately pending.

A6. Freeze source/lock hashes before independent review; review raw source and raw verification artifacts rather than implementer summaries. Fixes create a new candidate and regress affected checks. Final Git/Drive publication scope is the root agent's responsibility under latest explicit user authority; do not commit model binaries, venv, private profiles or reference files.

## Main failure modes to audit

- Enabling the new enum without updating all doctor/brief/runtime dispatch paths routes a public voice into the reference-conditioned clone adapter.
- Dropping language while building NarrationSource produces wrong-language speech and cache collisions.
- Hashing only weight tensors leaves mutable tokenizer/config semantics unbound; merely storing self-reported hashes does not pin approved content.
- Model loader auto-downloads when a tokenizer/config is absent; use pinned local-only paths and test missing files fail closed.
- User-controlled profile paths, symlink/reparse ancestors and replacement between validation and model load can defeat a naive file check; explicitly state the trusted-local-user threat boundary or prevent these cases.
- A model import succeeding does not prove VRAM capacity, synthesis, completed speech or intelligibility. A nonzero WAV/ffprobe pass is technical evidence only.
- Reusing a cached receipt from another voice/text/language or changing an approved profile silently undermines authored approval and editability.
- Forking an existing private venv or using its unpinned package set is not a fresh-user reproducible installation.
