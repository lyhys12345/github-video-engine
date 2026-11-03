#!/usr/bin/env python3
"""Local Qwen3 reference conditioning. No training, provider API, or fallback."""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import inspect
import json
import math
import os
from pathlib import Path, PurePosixPath
import platform
import signal
import subprocess
import sys
import time
import wave

REPOSITORY = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit"
REVISION = "e7dd0585652209fa0d7783659aad4e8a324de11c"
PARAMETERS = {"seed": 42, "temperature": 0.7, "top_k": 50, "top_p": 1.0,
              "repetition_penalty": 1.05, "max_tokens": 256, "lang_code": "Chinese",
              "stream": False, "split_pattern": None}
EFFECTIVE = {**PARAMETERS, "repetition_penalty": 1.5}
OFFLINE = {"HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1",
           "HF_HUB_DISABLE_TELEMETRY": "1", "DO_NOT_TRACK": "1"}
SANDBOX = "/usr/bin/sandbox-exec"
SANDBOX_POLICY = "(version 1)(allow default)(deny network*)"
FORBIDDEN_SUFFIXES = {".py", ".pyc", ".pyo", ".pkl", ".pickle", ".pt", ".pth",
                      ".bin", ".so", ".dylib", ".sh", ".exe"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def local_path(value, base=None, directory=False):
    require(isinstance(value, str) and value, "path must be a nonempty local string")
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = (base or Path.cwd()) / path
    # Inspect components before resolving: resolve() alone would conceal symlinks.
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        require(not part.is_symlink(), f"symlink rejected: {part}")
    require(path.is_dir() if directory else path.is_file(), f"missing local {'directory' if directory else 'file'}: {path}")
    return path


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    with path.open("x", encoding="utf-8") as target:
        json.dump(value, target, ensure_ascii=False, indent=2, allow_nan=False)
        target.write("\n")


def no_remote_config(value):
    if isinstance(value, dict):
        require("auto_map" not in value, "remote-code auto_map rejected")
        for item in value.values():
            no_remote_config(item)
    elif isinstance(value, list):
        for item in value:
            no_remote_config(item)


def validate_model(model, lock):
    require(lock.get("repository") == REPOSITORY and lock.get("revision") == REVISION,
            "model repository/revision mismatch; no fallback allowed")
    require(lock.get("downloadOnly") is True and lock.get("remoteCodeDownloaded") is False,
            "model lock must attest data-only download")
    files = lock.get("files")
    require(isinstance(files, list) and files, "model lock has no files")
    expected = set()
    for record in files:
        name = record.get("path", "")
        relative = PurePosixPath(name)
        require(name and not relative.is_absolute() and ".." not in relative.parts and
                "\\" not in name and str(relative) == name, "unsafe model lock path")
        require(name not in expected, f"duplicate model lock file: {name}")
        expected.add(name)
        require(relative.suffix.lower() not in FORBIDDEN_SUFFIXES, f"executable/unsafe model file rejected: {name}")
        file = local_path(str(model / name))
        require(file.stat().st_size == record.get("bytes"), f"model size mismatch: {name}")
        require(sha256(file) == record.get("sha256"), f"model hash mismatch: {name}")
        if file.suffix.lower() == ".json":
            no_remote_config(read_json(file))
    actual = set()
    for entry in model.rglob("*"):
        require(not entry.is_symlink(), f"model symlink rejected: {entry}")
        if entry.is_file():
            actual.add(entry.relative_to(model).as_posix())
        else:
            require(entry.is_dir(), f"special model entry rejected: {entry}")
    require(actual == expected, f"model file set mismatch: missing={sorted(expected-actual)}, extra={sorted(actual-expected)}")
    require("config.json" in expected and any(n.endswith(".safetensors") for n in expected),
            "model config/weights missing")
    require("speech_tokenizer/config.json" in expected and
            any(n.startswith("speech_tokenizer/") and n.endswith(".safetensors") for n in expected),
            "local speech tokenizer missing")


def validate_runtime(lock):
    require(lock.get("schemaVersion") == "local-voice-runtime-lock/1.0", "unsupported runtime lock")
    require(lock.get("pythonVersion") == platform.python_version(), "Python version mismatch")
    require(lock.get("runtime") == "mlx-audio" and lock.get("runtimeVersion") == "0.6.4", "unsupported runtime")
    packages = lock.get("packages")
    require(isinstance(packages, dict) and packages, "runtime packages missing")
    require(packages.get("mlx-audio") == "0.6.4", "mlx-audio package lock missing")
    for name, version in packages.items():
        require(importlib.metadata.version(name) == version, f"runtime version mismatch: {name}")
    records = lock.get("distributionRecords", {})
    require(isinstance(records, dict), "invalid distributionRecords")
    for name, expected in records.items():
        record = importlib.metadata.distribution(name).read_text("RECORD")
        require(record is not None and hashlib.sha256(record.encode()).hexdigest() == expected,
                f"runtime distribution RECORD mismatch: {name}")


def preflight(profile_path, text_path):
    profile_path = local_path(str(profile_path))
    text_path = local_path(str(text_path))
    profile = read_json(profile_path)
    require(profile.get("schemaVersion") == "local-reference-profile/1.0", "unsupported profile schema")
    require(profile.get("authorization") == "user-declared-permission", "reference permission declaration required")
    require(profile.get("referenceTranscriptVerification") == "caller-declared-not-independently-transcribed",
            "reference transcript verification declaration required")
    base = profile_path.parent
    paths = {key: local_path(profile.get(key), base, directory=(key == "modelPath"))
             for key in ("modelPath", "modelLockPath", "runtimeLockPath", "referencePath")}
    require(sha256(paths["referencePath"]) == profile.get("referenceSha256"), "reference hash mismatch")
    require(isinstance(profile.get("referenceText"), str) and profile["referenceText"].strip(), "full reference transcript missing")
    with wave.open(str(paths["referencePath"]), "rb") as audio:
        require(audio.getframerate() == 24000 and audio.getnchannels() == 1 and
                audio.getsampwidth() == 2 and audio.getnframes() > 0 and audio.getcomptype() == "NONE",
                "reference must be a nonempty PCM16 mono 24kHz WAV")
        ref_duration = audio.getnframes() / audio.getframerate()
    text = text_path.read_text(encoding="utf-8")
    require(1 <= len(text) <= 300 and text.strip() and "\x00" not in text,
            "input text must be 1–300 UTF-8 characters, nonblank and without NUL")
    model_lock = read_json(paths["modelLockPath"])
    runtime_lock = read_json(paths["runtimeLockPath"])
    validate_model(paths["modelPath"], model_lock)
    validate_runtime(runtime_lock)
    binding = {"profileSha256": sha256(profile_path), "referenceSha256": sha256(paths["referencePath"]),
               "referenceTextSha256": hashlib.sha256(profile["referenceText"].encode()).hexdigest(),
               "textSha256": sha256(text_path), "scriptSha256": sha256(Path(__file__)),
               "modelLockSha256": sha256(paths["modelLockPath"]),
               "runtimeLockSha256": sha256(paths["runtimeLockPath"]),
               "referenceDurationSeconds": ref_duration, "modelRepository": REPOSITORY,
               "modelRevision": REVISION, "requestedParameters": PARAMETERS,
               "effectiveParameters": EFFECTIVE,
               "effectiveParameterNote": "mlx-audio 0.6.4 generate ICL clamps repetition_penalty to at least 1.5; lang_code selects Chinese",
               "authorization": profile["authorization"],
               "referenceTranscriptVerification": profile["referenceTranscriptVerification"]}
    return profile, paths, text, binding


def run_process(command, *, env=None, timeout=600, stdout=None, stderr=None):
    process = subprocess.Popen(command, env=env, stdout=stdout, stderr=stderr, start_new_session=True)
    try:
        code = process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
        raise TimeoutError(f"subprocess exceeded {timeout} seconds") from None
    require(code == 0, f"subprocess failed with exit code {code}")


def check_sandbox(env):
    require(sys.platform == "darwin" and Path(SANDBOX).is_file(), "macOS sandbox-exec required; failing closed")
    # Binding a local socket needs network permission without contacting any service.
    probe = "import socket,sys\ntry:\n s=socket.socket();s.bind(('127.0.0.1',0))\nexcept PermissionError:\n sys.exit(0)\nsys.exit(23)"
    run_process([SANDBOX, "-p", SANDBOX_POLICY, sys.executable, "-I", "-c", probe], env=env, timeout=20,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def tool_path(name):
    value = os.environ.get("GVE_" + name.upper())
    require(value, f"GVE_{name.upper()} must specify an absolute executable")
    path = local_path(value)
    require(Path(value).is_absolute() and os.access(path, os.X_OK), f"invalid {name} executable")
    return path


def validate_audio(out, ffprobe, ffmpeg, env):
    path = local_path(str(out / "audio.wav"))
    with wave.open(str(path), "rb") as audio:
        duration = audio.getnframes() / audio.getframerate()
        require(audio.getnchannels() == 1 and audio.getsampwidth() == 2 and 0 < duration <= 30,
                "generated WAV must be nonempty mono PCM16 and at most 30 seconds")
    with (out / "ffprobe.json").open("x") as report, (out / "ffprobe.stderr.log").open("x") as log:
        run_process([str(ffprobe), "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
                    env=env, timeout=30, stdout=report, stderr=log)
    probe = read_json(out / "ffprobe.json")
    streams = probe.get("streams", [])
    require(len(streams) == 1 and streams[0].get("codec_type") == "audio", "ffprobe audio stream invalid")
    probed = float(probe["format"]["duration"])
    require(math.isfinite(probed) and 0 < probed <= 30 and abs(probed-duration) < 0.05, "ffprobe duration invalid")
    with (out / "ffmpeg-decode.log").open("x") as log:
        run_process([str(ffmpeg), "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"],
                    env=env, timeout=60, stdout=subprocess.DEVNULL, stderr=log)
    return {"path": "audio.wav", "sha256": sha256(path), "bytes": path.stat().st_size,
            "durationSeconds": duration, "fullDecode": "PASS"}


def require_current_process_network_denial():
    """Prove this process is already denied networking before installing Python hooks."""
    import socket
    connection = None
    try:
        connection = socket.socket()
        connection.bind(("127.0.0.1", 0))
    except PermissionError:
        return
    finally:
        if connection is not None:
            connection.close()
    raise ValueError("worker requires existing OS network denial; local socket bind succeeded")


def install_network_audit():
    def deny(event, args):
        if event.startswith("socket."):
            raise PermissionError("local voice worker forbids Python socket operations")
    sys.addaudithook(deny)


def worker(args):
    require_current_process_network_denial()  # Current worker, not a nested sandbox or audit hook.
    install_network_audit()  # Before importing model/runtime dependencies; supplemental to OS sandbox.
    os.environ.update(OFFLINE)
    profile, paths, text, binding = preflight(args.profile, args.text_file)
    import mlx.core as mx
    import numpy as np
    from mlx_audio.tts.utils import load_model
    mx.random.seed(PARAMETERS["seed"])
    load_options = {"model_type": "qwen3_tts"}
    # This pinned runtime's **kwargs does not implement trust_remote_code. Do not claim it does.
    remote_code_option = "trust_remote_code" in inspect.signature(load_model).parameters
    if remote_code_option:
        load_options["trust_remote_code"] = False
    model = load_model(paths["modelPath"], **load_options)  # Path object bypasses hub path resolution.
    require(getattr(model.config, "tts_model_type", None) == "base", "only Base reference model allowed")
    require(model.tokenizer is not None and model.speech_tokenizer is not None and
            model.speech_tokenizer.has_encoder, "local text/speech tokenizer or encoder missing")
    options = {key: value for key, value in PARAMETERS.items() if key != "seed"}
    chunks, rate, token_count = [], None, 0
    for result in model.generate(text=text, ref_audio=str(paths["referencePath"]),
                                 ref_text=profile["referenceText"], **options):
        require(rate is None or rate == result.sample_rate, "inconsistent generated sample rate")
        rate = int(result.sample_rate)
        data = np.asarray(result.audio, dtype=np.float32).reshape(-1)
        require(data.size > 0 and np.isfinite(data).all(), "empty or nonfinite generated audio")
        chunks.append(data)
        token_count += int(result.token_count)
        require(rate > 0 and sum(chunk.size for chunk in chunks) / rate <= 30, "generated audio over 30 seconds")
    require(chunks, "model returned no audio")
    audio = np.concatenate(chunks)
    require(np.max(np.abs(audio)) > 0, "model returned silent audio")
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    out = Path(args.out)
    with (out / "audio.wav").open("xb") as target:
        with wave.open(target, "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(rate)
            output.writeframes(pcm.tobytes())
    write_json(out / "worker.json", {"bindings": binding, "tokenCount": token_count,
                "trustRemoteCodeArgumentSupported": remote_code_option,
                "pythonSocketAudit": "installed-before-runtime-imports",
                "localPathType": "pathlib.Path", "forcedInstalledArchitecture": "qwen3_tts"})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--check", action="store_true", help="validate local inputs/runtime and OS network sandbox without loading model")
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.worker:
        worker(args)
        return 0
    out = Path(os.path.abspath(args.out))
    created = False
    started = time.monotonic()
    try:
        require(not out.exists() and not out.is_symlink(), "output directory already exists; refusing overwrite")
        local_path(str(out.parent), directory=True)
        out.mkdir()  # Atomic collision protection; parent must already exist.
        created = True
        profile, paths, text, binding = preflight(args.profile, args.text_file)
        env = {**os.environ, **OFFLINE, "PYTHONNOUSERSITE": "1"}
        check_sandbox(env)
        ffprobe, ffmpeg = tool_path("ffprobe"), tool_path("ffmpeg")
        common = {"schemaVersion": "local-reference-receipt/1.0", "bindings": binding,
                  "method": "reference-conditioning", "finetuned": False, "modelExtracted": False,
                  "originalElevenLabsModelObtained": False, "remoteProviderCalls": 0, "providerChargeUsd": 0,
                  "similarity": "UNVERIFIED", "naturalness": "UNVERIFIED", "transcriptAccuracy": "UNVERIFIED",
                  "ownerReview": "pending", "networkIsolation": {"os": "macOS sandbox-exec deny network*",
                  "probe": "local socket bind rejected", "pythonAudit": "supplemental worker socket deny"}}
        if args.check:
            write_json(out / "check.json", {**common, "status": "CHECKED", "modelLoaded": False,
                                          "audioGenerated": False})
            print(json.dumps({"status": "CHECKED", "out": str(out)}))
            return 0
        with (out / "worker.stdout.log").open("x") as stdout, (out / "worker.stderr.log").open("x") as stderr:
            run_process([SANDBOX, "-p", SANDBOX_POLICY, sys.executable, "-I", str(Path(__file__).absolute()),
                         "--worker", "--profile", str(Path(args.profile).absolute()),
                         "--text-file", str(Path(args.text_file).absolute()), "--out", str(out)],
                        env=env, timeout=600, stdout=stdout, stderr=stderr)
        report = read_json(out / "worker.json")
        require(report.get("bindings") == binding, "worker input bindings differ from preflight")
        # Detect changes to any input while the worker was running before creating a success receipt.
        require(preflight(args.profile, args.text_file)[3] == binding, "inputs changed during generation")
        audio = validate_audio(out, ffprobe, ffmpeg, env)
        write_json(out / "receipt.json", {**common, "status": "SUCCESS", "audio": audio,
                   "worker": report, "elapsedSeconds": time.monotonic()-started})
        print(json.dumps({"status": "SUCCESS", "out": str(out), "durationSeconds": audio["durationSeconds"]}))
        return 0
    except Exception as error:
        failure = {"schemaVersion": "local-reference-failure/1.0", "status": "FAILED",
                   "errorType": type(error).__name__, "error": str(error),
                   "elapsedSeconds": time.monotonic()-started, "automaticRetries": 0}
        if created:
            write_json(out / "failure.json", failure)
        print(json.dumps(failure, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
