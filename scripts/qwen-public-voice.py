#!/usr/bin/env python3
"""Run the allowlisted Qwen CustomVoice presets against local files."""
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import sys
import sysconfig


def deny_network(event, _arguments):
    # Python platform.uname() reads the host name locally without opening a socket.
    if event.startswith("socket.") and event != "socket.gethostname":
        raise RuntimeError("Network access is disabled for the local voice worker.")


os.environ.update(
    HF_HUB_OFFLINE="1",
    TRANSFORMERS_OFFLINE="1",
    HF_HUB_DISABLE_TELEMETRY="1",
    DO_NOT_TRACK="1",
)
sys.addaudithook(deny_network)

PRESETS = {"zh-CN": ("Serena", "Chinese"), "en-US": ("Ryan", "English")}
MAX_AUDIO_SAMPLES = 30 * 24_000
CORE_PACKAGES = {
    "torch": "2.8.0+cu128",
    "torchaudio": "2.8.0+cu128",
    "qwen-tts": "0.1.1",
    "transformers": "4.57.3",
    "accelerate": "1.12.0",
}


def read_runtime_lock():
    versions = {}
    for line in Path("requirements.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip().removesuffix("\\").strip()
        if not line or line.startswith(("#", "--")):
            continue
        name, version = line.split()[0].split("==")
        if name in versions:
            raise RuntimeError("Duplicate pinned voice runtime distribution.")
        versions[name] = version
    if any(versions.get(name) != version for name, version in CORE_PACKAGES.items()):
        raise RuntimeError("The public voice runtime lock does not match the worker.")
    return {name: importlib.metadata.version(name) == version for name, version in versions.items()}


def main():
    # Read the interpreter build architecture without relying on the scrubbed host environment.
    if sys.platform != "win32" or sysconfig.get_platform() != "win-amd64" or sys.version_info[:2] != (3, 12):
        raise RuntimeError("The public voice runtime needs Windows x64 and CPython 3.12.")
    if not all(read_runtime_lock().values()):
        raise RuntimeError("The installed voice runtime differs from its pinned dependencies.")

    import numpy as np
    import torch
    import wave
    from scipy.signal import resample_poly
    from qwen_tts import Qwen3TTSModel

    if not torch.cuda.is_available() or not torch.cuda.is_bf16_supported(including_emulation=False):
        raise RuntimeError("An NVIDIA CUDA GPU with native bfloat16 support is required.")

    if sys.argv[1:] == ["--probe"]:
        print(json.dumps({
            "status": "ready",
            "python": platform.python_version(),
            "gpu": torch.cuda.get_device_name(0),
            "capability": list(torch.cuda.get_device_capability(0)),
            "cuda": torch.version.cuda,
        }, ensure_ascii=True))
        return
    if sys.argv[1:]:
        raise RuntimeError("Unsupported public voice worker invocation.")

    request = json.loads(Path("request.json").read_text(encoding="utf-8"))
    speaker, language = PRESETS[request["language"]]
    model_path = Path(request["modelPath"])
    if not model_path.is_absolute() or not model_path.is_dir():
        raise RuntimeError("Expected the locked local model directory.")
    torch.manual_seed(42)
    model = Qwen3TTSModel.from_pretrained(
        str(model_path), device_map="cuda:0", dtype=torch.bfloat16,
        attn_implementation="sdpa", local_files_only=True, trust_remote_code=False,
        use_safetensors=True,
    )
    speakers = model.get_supported_speakers() or []
    languages = model.get_supported_languages() or []
    if speaker.lower() not in speakers or language.lower() not in languages:
        raise RuntimeError("The locked model does not expose the selected voice and language.")
    waves, rate = model.generate_custom_voice(
        text=request["text"], speaker=speaker, language=language, max_new_tokens=384,
    )
    if len(waves) != 1 or rate != 24_000:
        raise RuntimeError("Expected one 24 kHz model waveform.")
    audio = np.asarray(waves[0])
    if audio.ndim != 1 or not 0 < audio.size <= MAX_AUDIO_SAMPLES or not np.isfinite(audio).all():
        raise RuntimeError("Speech waveform is invalid or exceeds the scene budget.")
    resampled = resample_poly(audio, 2, 3)
    pcm = np.rint(np.clip(resampled, -1, 32767 / 32768) * 32768).astype("<i2")
    if not pcm.any():
        raise RuntimeError("Speech output contains only digital silence.")
    with wave.open("speech.wav", "wb") as wav:
        wav.setparams((1, 2, 16_000, 0, "NONE", "not compressed"))
        wav.writeframes(pcm.tobytes())
    print(json.dumps({"speaker": speaker, "sampleRate": 16_000, "samples": pcm.size}))


if __name__ == "__main__":
    main()
