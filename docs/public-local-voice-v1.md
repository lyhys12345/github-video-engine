# Free public local narration

Choose `qwen-public` when you want local speech without the maintainer's private voice files. This option uses the public Qwen3-TTS 0.6B CustomVoice model: Serena for `zh-CN` and Ryan for `en-US`. It needs no reference recording, voice account or paid TTS API. It is a public preset, not the Anna/Chen approximation used in earlier demos.

Installation downloads public dependencies and about 2.50 GB of model data. Generation runs locally. The bounded supported environment is Windows x64, Python 3.12.14 and a compatible NVIDIA CUDA GPU with native BF16. RTX 3070 verification is recorded in this cycle's results; do not infer CPU, macOS/Linux or other GPU support. Allow additional disk space for the virtual environment and CUDA wheels.

## One-time setup

First complete the [engine installation](first-owner-quickstart.md#install-and-check-the-supported-path): Node 24.x, pinned pnpm 11.25.0 and `pnpm install --frozen-lockfile --ignore-scripts`. Rendering also needs Chrome/Chromium, FFmpeg and FFprobe; the voice installation below does not install them.

Work inside this trusted engine checkout. Install Python 3.12.14 and use its real executable; the Windows Store `python` alias is not a working interpreter. Create a new virtual environment without system-site-packages. Do not copy the maintainer's environment or profile.

The following PowerShell commands use the Python launcher. If it is unavailable, replace `py -3.12` with your installed Python 3.12.14 executable.

```powershell
py -3.12 -m venv work/public-voice/venv
work/public-voice/venv/Scripts/python.exe --version
work/public-voice/venv/Scripts/python.exe -m pip --isolated --no-cache-dir install --require-hashes --only-binary :all: -r config/public-voice-v1/build-requirements-windows.txt
work/public-voice/venv/Scripts/python.exe scripts/prepare-public-voice-deps.py --wheel-dir work/public-voice/wheels
work/public-voice/venv/Scripts/python.exe -m pip --isolated --no-cache-dir install --index-url https://pypi.org/simple --extra-index-url https://download.pytorch.org/whl/cu128 --find-links work/public-voice/wheels --require-hashes --only-binary :all: -r config/public-voice-v1/requirements-windows.txt
work/public-voice/venv/Scripts/python.exe scripts/prepare-public-voice.py --model-dir work/public-voice/model --download --profile work/qwen-public-profile.json
$env:GVE_QWEN_PUBLIC_PROFILE = (Resolve-Path work/qwen-public-profile.json).Path
pnpm gve doctor --first-owner --phase preview --voice qwen-public --language zh-CN
```

Check that the interpreter reports Python 3.12.14 before installing. The launcher selects an installed 3.12 interpreter, not necessarily this patch; use its explicit executable if you have several versions.

The runtime needs the small python-sox wrapper, which has no official wheel for this release. The separate dependency helper explicitly downloads its pinned public source, checks its hash, builds it with pinned setuptools/wheel and a fixed timestamp, and checks the resulting wheel hash. This is a reviewed pure-Python source-build exception; the main installation accepts only locked wheels. It does not install the SoX executable. A missing SoX-executable warning from upstream is separate from the exercised CustomVoice generation path.

Both helpers preserve failed output and refuse to overwrite existing destinations. Use a new directory for a retry. The dependency helper accepts `--source /path/to/sox-1.5.0.tar.gz` for an already obtained exact archive, still verifying its pinned hash. Inference never invokes these setup steps.

The model setup helper verifies the fixed public model inventory and creates a local machine profile; you do not need to write profile JSON. `--download` is the explicit online action. To validate a complete existing model directory and create a profile, omit that flag. A profile is not a substitute for the model files or virtual environment needed to generate new speech.

The fixed model is [Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice at 85e237c](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice/tree/85e237c12c027371202489a0ec509ded67b5e4b5). Setup verifies the bytes and SHA-256 of weights, tokenizer and configuration against the committed lock. Generation uses local files and does not fetch missing dependencies or switch voices. Doctor readiness verifies prerequisites; it does not create or listen to speech.

## First-generation behavior

A new recording still verifies the complete local model and starts a fresh synthesis process. Model files are read in bounded 1 MiB chunks; this reduces verification overhead without omitting hashes or trusting modification timestamps. Existing exact recordings follow the separate reuse path below. The measured gain applies to model verification, not the whole speech generation time.

The Windows x64 check uses the Python interpreter's build platform. It does not require a shell-provided `PROCESSOR_ARCHITECTURE` variable, which is absent in the engine's isolated worker environment. The supported platform and dependency requirements are unchanged. Do not restore unrelated host environment variables to bypass a readiness error.

Worker source changes produce a new generation fingerprint, so unchanged text may need a new recording after this update. Existing profiles and verified imported recordings remain usable; a new worker does not retroactively approve old speech. Details, failed experiments and remaining latency are in the [first-generation results](rsi-voice-first-results-2026-11-14.md). Faster generation is separate from [speaking pace](narration-voice-preference.md#speaking-pace-and-natural-delivery).

## Use it with the skill

Tell the session agent, for example:

> Explain this GitHub URL for developers who have never used it. Use English and the free public local Ryan voice (`qwen-public`). Show me the full script and storyboard before generating any video.

Or request Chinese with Serena. The agent records the choice and language in your creative brief, authors the exact script and captions, and waits for your approval. It uses `GVE_NARRATION_VOICE=qwen-public` for the approved run. Your existing owner's default remains Anna when no new preference is selected; new-user onboarding does not silently select it or silently replace a missing voice.

Each scene currently accepts one line of at most 120 Unicode code points. Generation uses a bounded token budget and rejects audio above 30 seconds; a valid WAV does not prove the model spoke every requested word. Keep scenes short and listen for omissions.

The pipeline measures complete recordings before rendering. If a recording is longer than its scene, the agent must revise timing or wording and obtain the required approval for the changed candidate. It must not clip or speed up speech to pass a duration check. Captions are authored or separately aligned; a correct transcript hash does not prove that every spoken word or caption boundary is correct.

The 0.6B adapter uses fixed public presets. It does not expose reliable emotion/instruction control, custom voice cloning, automatic translation or every upstream language. Listen to the generated words and delivery before publishing.

## Export, replay and edit

Use the [normal project export/import](first-owner-quickstart.md#receive-and-continue-the-editable-project). A supported complete narrated package contains the selected original recordings, receipts, video, captions, editable author files, sources and review binding. It excludes model weights, Python dependencies, local profiles and credentials.

After import, exact unchanged recordings may be reused from the verified selected project. Generating changed words needs the separately installed public model/runtime on the destination. A changed script or voice cannot reuse old approval merely because a previous movie exists. Keep the original package and review history.

## Reuse recordings without rereading the model

Repeating an unchanged public narration task reuses its verified recording. The engine checks the current text, language/preset, worker, requirements, model lock and Python executable identity, then validates the committed WAV and generation manifest. A successful cache hit does not reread the model weights or launch Python synthesis.

That recording can still be reused if the model files are temporarily missing or damaged. This is playback of an existing artifact, not proof that your speech runtime is ready. The local profile and Python executable remain necessary for this same-workspace lookup. Fully verified imported project replay is a separate path that can work without either.

New narration, a changed voice/language or a changed generation identity requires full model verification before synthesis. Doctor also continues to verify the complete model. A damaged cached recording or manifest fails visibly; it is not silently regenerated. If another process changes a successful task during lookup, retry after it finishes; the cache-only path cannot start unchecked generation.

This optimization speeds repeated recordings, not the first synthesis or the renderer. It does not approve a changed script, certify spoken-word completeness or replace listening review. See the [measured cache results](rsi-public-voice-cache-results-2026-11-14.md).

## Optional real integration test

After the prerequisites above pass, this opt-in test generates synthetic technical media and exercises export/import/edit. It uses a mocked GitHub source and TEST ONLY approval receipts, never your real project's approval. The verified run took about nine minutes on this host.

```powershell
$env:GVE_QWEN_PUBLIC_PROFILE = (Resolve-Path work/qwen-public-profile.json).Path
$env:GVE_PUBLIC_VOICE_MEDIA = "1"
pnpm exec vitest run tests/public-voice-workflow.media.test.ts
```

Without `GVE_PUBLIC_VOICE_MEDIA=1`, this test is intentionally skipped. Keep normal Windows browser environment variables intact; isolated harness experiments are not normal installation steps.

## Published upstream terms and operating limits

The [official model card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice/blob/85e237c12c027371202489a0ec509ded67b5e4b5/README.md) labels the model Apache-2.0; [Qwen's source license](https://github.com/QwenLM/Qwen3-TTS/blob/main/LICENSE) is Apache-2.0. These are published upstream terms, not a guarantee about all possible utterances or uses. Third-party runtime dependencies retain their own licenses. This repository commits setup code and locks, not the model or voice recordings.

Offline environment flags, local-only loading and a Python network audit hook constrain normal inference. They are not an OS-level security sandbox and do not protect against a malicious local administrator changing the installed runtime. Before new synthesis or a successful doctor check, the supported dependency and model checks must pass; missing files, unsupported languages or an unavailable GPU produce explicit errors, never a paid fallback. Verified recording reuse follows the separate cache and imported-replay rules above.

Actual installation, generation, edit/cache, media verification and independent review are recorded in the [cycle results](rsi-public-voice-results-2026-11-13.md). Technical checks do not establish naturalness, perfect pronunciation, continuous audiovisual quality or final human acceptance.
