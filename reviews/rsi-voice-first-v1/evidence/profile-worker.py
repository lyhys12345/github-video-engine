from pathlib import Path
from hashlib import sha256
from time import perf_counter
import argparse
import json
import os
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = Path("D:/gve-flagship-publish")
PROFILE = Path("D:/gve-anna-render-temp/public-voice-20261113/qwen-public-profile.json")
WORKER = REPO / "scripts/qwen-public-voice.py"
LOCK = REPO / "config/public-voice-v1/model-lock.json"
REQUIREMENTS = REPO / "config/public-voice-v1/requirements-windows.txt"
EXACT_WORKER_SHA = "1ce1b69f8ed426a7814e159ff077d6d5594bce3593cc87ea396781164a08714c"
EXACT_LOCK_SHA = "4951f1df7f2581651052e740594dbabf8c1c20af0cec1c731db5909e173a572a"
EXACT_REQUIREMENTS_SHA = "00f3bc66834e1162b14d398bc44e8213ef2c53e16d54d87029ea25d677bd9500"
TEXT = "新的请求已经到达。我们先核对输入，再检查处理结果，最后把确认的信息交给下一步。"

def digest(path):
    with path.open("rb") as file:
        return sha256(file.read()).hexdigest() if path.stat().st_size < 1024 * 1024 else digest_large(file)

def digest_large(file):
    checksum = sha256()
    for chunk in iter(lambda: file.read(8 * 1024 * 1024), b""):
        checksum.update(chunk)
    return checksum.hexdigest()

def instrument(source, thread_count):
    candidate = (
        f"    torch.set_num_threads({thread_count})\n    torch.set_num_interop_threads(2)\n"
        if thread_count else ""
    )
    changes = (
        ('import importlib.metadata\n',
         'from time import perf_counter\n_started = perf_counter()\n_last = _started\nimport importlib.metadata\n'),
        ('\ndef deny_network',
         '\ndef mark(phase, **info):\n    global _last\n    now = perf_counter()\n'
         '    print(json.dumps({"phase": phase, "elapsedSeconds": now - _last, '
         '"processSeconds": now - _started, **info}), file=sys.stderr, flush=True)\n'
         '    _last = now\n\n\ndef deny_network'),
        ('    if not all(read_runtime_lock().values()):',
         '    mark("platform_startup")\n    if not all(read_runtime_lock().values()):'),
        ('    import numpy as np\n    import torch\n',
         '    mark("runtime_lock")\n    import numpy as np\n    import torch\n'
         '    mark("numpy_torch_import", torch=torch.__version__, cuda=torch.version.cuda, '
         'torchSource=torch.__file__, intraOp=torch.get_num_threads(), interOp=torch.get_num_interop_threads())\n'
         + candidate),
        ('    if not torch.cuda.is_available()',
         '    mark("other_runtime_imports", intraOp=torch.get_num_threads(), interOp=torch.get_num_interop_threads())\n'
         '    if not torch.cuda.is_available()'),
        ('    torch.manual_seed(42)',
         '    mark("cuda_readiness", gpu=torch.cuda.get_device_name(0), '
         'capability=list(torch.cuda.get_device_capability(0)), python=platform.python_version())\n'
         '    torch.manual_seed(42)'),
        ('    speakers = model.get_supported_speakers() or []',
         '    torch.cuda.synchronize()\n    mark("model_load", '
         'torchGpuAllocatedMiB=torch.cuda.memory_allocated() / 2**20)\n'
         '    speakers = model.get_supported_speakers() or []'),
        ('    waves, rate = model.generate_custom_voice(',
         '    mark("preset_validation")\n    waves, rate = model.generate_custom_voice('),
        ('    if len(waves) != 1 or rate != 24_000:',
         '    torch.cuda.synchronize()\n    mark("inference", '
         'torchGpuPeakAllocatedMiB=torch.cuda.max_memory_allocated() / 2**20)\n'
         '    if len(waves) != 1 or rate != 24_000:'),
        ('    print(json.dumps({"speaker": speaker,',
         '    mark("wav_output")\n    print(json.dumps({"speaker": speaker,'),
    )
    for before, after in changes:
        if source.count(before) != 1:
            raise ValueError(f"Unexpected instrumentation anchor: {before!r}")
        source = source.replace(before, after)
    return source

def verified_model(model, lock):
    started = perf_counter()
    actual_files = {file.relative_to(model).as_posix() for file in model.rglob("*") if file.is_file()}
    expected_files = {file["path"] for file in lock["files"]}
    if actual_files != expected_files:
        raise ValueError(f"Locked model filenames mismatch: {actual_files ^ expected_files}")
    for entry in lock["files"]:
        path = model / entry["path"]
        if path.stat().st_size != entry["bytes"] or digest(path) != entry["sha256"]:
            raise ValueError(f"Locked model data mismatch: {entry['path']}")
    return perf_counter() - started

def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def gpu_sample():
    sample = subprocess.run(
        ["nvidia-smi", "--query-gpu=name,driver_version,utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
        capture_output=True, text=True, timeout=10, check=False,
    )
    return sample.stdout.strip()

def run(variant, ffmpeg, ffprobe, profile, lock):
    name, _, thread_count = variant.partition(":")
    trial = ROOT / name
    trial.mkdir()
    model_dir = Path(profile["modelPath"])
    worker_path = trial / "worker.py"
    source = WORKER.read_text(encoding="utf-8")
    worker_path.write_bytes(instrument(source, int(thread_count or "0")).encode("utf-8"))
    shutil.copyfile(REQUIREMENTS, trial / "requirements.txt")
    write_json(trial / "request.json", {"language": "zh-CN", "text": TEXT, "modelPath": str(model_dir)})
    windows = os.environ["SystemRoot"]
    env = {
        "SystemRoot": windows, "WINDIR": windows, "PATH": str(Path(windows) / "System32"), "PROCESSOR_ARCHITECTURE": os.environ["PROCESSOR_ARCHITECTURE"],
        "TEMP": str(trial), "TMP": str(trial), "HF_HOME": str(trial / "hf"),
        "NUMBA_CACHE_DIR": str(trial), "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1",
        "HF_HUB_DISABLE_TELEMETRY": "1",
    }
    gpu_before = gpu_sample()
    verify_seconds = verified_model(model_dir, lock)
    summary = {
        "variant": name, "torchThreadLimit": int(thread_count) if thread_count else None,
        "textLength": len(TEXT), "language": "zh-CN", "textSha256": sha256(TEXT.encode("utf-8")).hexdigest(),
        "modelRepository": lock["repository"], "modelRevision": lock["revision"],
        "modelFileCount": len(lock["files"]), "modelBytes": sum(file["bytes"] for file in lock["files"]),
        "modelLockSha256": digest(LOCK), "workerOriginalSha256": digest(WORKER),
        "workerInstrumentedSha256": digest(worker_path), "runtimeLockSha256": digest(REQUIREMENTS),
        "pythonSha256": digest(Path(profile["pythonPath"])), "logicalCpuCount": os.cpu_count(),
        "gpuBefore": gpu_before, "modelHashSeconds": verify_seconds, "workerTimeoutSeconds": 300,
    }
    print(f"{name} locked {summary['modelBytes']} bytes in {verify_seconds:.2f}s, starting worker", flush=True)
    worker_started = perf_counter()
    with (trial / "worker.stdout.txt").open("wb") as output, (trial / "worker.stderr.txt").open("wb") as errors:
        try:
            result = subprocess.run(
                [profile["pythonPath"], "-B", "-I", "worker.py"], cwd=trial, env=env,
                stdout=output, stderr=errors, timeout=300, check=False,
            )
            summary["workerExit"] = result.returncode
        except subprocess.TimeoutExpired:
            summary["workerExit"] = "timeout"
    summary["workerWallSeconds"] = perf_counter() - worker_started
    summary["verifyAndWorkerWallSeconds"] = verify_seconds + summary["workerWallSeconds"]
    summary["phases"] = [
        json.loads(line) for line in (trial / "worker.stderr.txt").read_text(encoding="utf-8", errors="replace").splitlines()
        if line.startswith('{"phase":')
    ]
    summary["gpuAfter"] = gpu_sample()
    if summary["workerExit"] == 0:
        wav = trial / "speech.wav"
        probe = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries", "stream=codec_name,channels,sample_rate,duration", "-of", "json", str(wav)],
            capture_output=True, text=True, timeout=30, check=False,
        )
        full_decode = subprocess.run(
            [ffmpeg, "-v", "error", "-xerror", "-nostdin", "-i", str(wav), "-f", "null", "-"],
            capture_output=True, text=True, timeout=30, check=False,
        )
        summary["probeExit"] = probe.returncode
        summary["fullDecodeExit"] = full_decode.returncode
        summary["probe"] = json.loads(probe.stdout) if probe.returncode == 0 else probe.stderr
        summary["wavSha256"] = digest(wav)
        if full_decode.returncode:
            summary["fullDecodeError"] = full_decode.stderr
    else:
        summary["workerErrorTail"] = (trial / "worker.stderr.txt").read_text(encoding="utf-8", errors="replace").splitlines()[-15:]
    write_json(trial / "verification.json", summary)
    print(json.dumps(summary), flush=True)
    return summary

def main():
    args = argparse.ArgumentParser()
    args.add_argument("variants", nargs="+")
    args.add_argument("--ffmpeg", required=True)
    args.add_argument("--ffprobe", required=True)
    options = args.parse_args()
    if digest(WORKER) != EXACT_WORKER_SHA or digest(REQUIREMENTS) != EXACT_REQUIREMENTS_SHA:
        raise ValueError("Unexpected upstream worker or runtime lock")
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    if digest(LOCK) != EXACT_LOCK_SHA:
        raise ValueError("Unexpected upstream model lock")
    for variant in options.variants:
        run(variant, options.ffmpeg, options.ffprobe, profile, lock)

if __name__ == "__main__":
    main()
