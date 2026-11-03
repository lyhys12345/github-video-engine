#!/usr/bin/env python3
"""Explicit data-only model download OR local runtime-lock preparation; never inference."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import sys
import urllib.parse
import urllib.request

CONFIG = Path(__file__).resolve().parents[1] / "config" / "local-voice-v1"
REPOSITORY = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit"
REVISION = "e7dd0585652209fa0d7783659aad4e8a324de11c"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def new_path(value):
    path = Path(os.path.abspath(value))
    require(not path.exists() and not path.is_symlink(), "output already exists; refusing overwrite")
    require(path.parent.is_dir(), "output parent directory must exist")
    for part in path.parents:
        require(not part.is_symlink(), f"output symlink rejected: {part}")
    return path


def no_remote_config(value):
    if isinstance(value, dict):
        require("auto_map" not in value, "remote-code auto_map rejected")
        for item in value.values():
            no_remote_config(item)
    elif isinstance(value, list):
        for item in value:
            no_remote_config(item)


def checked_model_lock():
    lock = json.loads((CONFIG / "model-lock.json").read_text())
    require(lock.get("repository") == REPOSITORY and lock.get("revision") == REVISION,
            "only the fixed official Hugging Face repository/revision is supported")
    require(lock.get("downloadOnly") is True and lock.get("remoteCodeDownloaded") is False,
            "data-only model lock required")
    require(isinstance(lock.get("files"), list) and lock["files"], "empty model lock")
    names = set()
    for record in lock["files"]:
        name = record.get("path", "")
        path = PurePosixPath(name)
        require(name and not path.is_absolute() and ".." not in path.parts and "\\" not in name
                and str(path) == name and name not in names, "unsafe/duplicate model path")
        require(path.suffix in {".json", ".txt", ".md", ".safetensors"}, "only locked model data files allowed")
        require(type(record.get("bytes")) is int and record["bytes"] > 0
                and re.fullmatch(r"[0-9a-f]{64}", record.get("sha256", "")), "invalid model length/hash lock")
        names.add(name)
    return lock


def allowed_url(url):
    parsed = urllib.parse.urlsplit(url)
    host = parsed.hostname or ""
    require(parsed.scheme == "https" and parsed.username is None and parsed.password is None
            and parsed.port in (None, 443) and (host == "huggingface.co" or host.endswith(".huggingface.co")
                                             or host.endswith(".hf.co")),
            "only HTTPS Hugging Face data/CDN URLs allowed")


class HFRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        allowed_url(new_url)
        return super().redirect_request(request, response, code, message, headers, new_url)


def download_file(out, record, opener):
    target = out / record["path"]
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_name(target.name + ".partial")
    url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/" + urllib.parse.quote(record["path"], safe="/")
    allowed_url(url)
    checksum, count = hashlib.sha256(), 0
    # Create first so network errors also retain an explicit .partial artifact.
    with partial.open("xb") as sink:
        request = urllib.request.Request(url, headers={"User-Agent": "local-voice-data-preparer/1"})
        with opener.open(request, timeout=60) as response:
            allowed_url(response.geturl())
            for block in iter(lambda: response.read(1024 * 1024), b""):
                count += len(block)
                require(count <= record["bytes"], f"download exceeds locked size: {record['path']}")
                checksum.update(block)
                sink.write(block)
    require(count == record["bytes"] and checksum.hexdigest() == record["sha256"],
            f"download length/hash mismatch: {record['path']}; partial retained")
    if target.suffix == ".json":
        no_remote_config(json.loads(partial.read_text(encoding="utf-8")))
    os.link(partial, target)  # Atomic no-overwrite publication after validation.
    partial.unlink()


def prepare_model(value):
    out = new_path(value)
    lock = checked_model_lock()
    out.mkdir()
    opener = urllib.request.build_opener(HFRedirect())  # No token/key discovery, authentication, or repository code.
    for record in lock["files"]:
        download_file(out, record, opener)
        print(json.dumps({"verifiedFile": record["path"], "sha256": record["sha256"], "bytes": record["bytes"]}))
    return {"status": "VERIFIED", "modelPath": str(out), "files": len(lock["files"]),
            "modelLockSha256": digest(CONFIG / "model-lock.json"), "inferenceStarted": False}


def collect_runtime_lock(template):
    require(template.get("schemaVersion") == "local-voice-runtime-lock/1.0", "unsupported runtime lock")
    require(platform.python_version() == template.get("pythonVersion"), "Python version mismatch")
    require(template.get("runtime") == "mlx-audio" and template.get("runtimeVersion") == "0.6.4",
            "unsupported runtime")
    packages = template.get("packages")
    require(isinstance(packages, dict) and packages.get("mlx-audio") == "0.6.4", "invalid package lock")
    records = {}
    for name, expected in packages.items():
        require(importlib.metadata.version(name) == expected, f"runtime version mismatch: {name}")
        record = importlib.metadata.distribution(name).read_text("RECORD")
        require(record is not None, f"runtime RECORD missing: {name}")
        records[name] = hashlib.sha256(record.encode()).hexdigest()
    return {"schemaVersion": template["schemaVersion"], "pythonVersion": template["pythonVersion"],
            "runtime": template["runtime"], "runtimeVersion": template["runtimeVersion"],
            "packages": packages, "distributionRecords": records}


def prepare_runtime(value):
    out = new_path(value)
    source = CONFIG / "runtime-lock.json"
    lock = collect_runtime_lock(json.loads(source.read_text()))
    lock["sourceRuntimeLockSha256"] = digest(source)
    lock["requirementsSha256"] = digest(CONFIG / "requirements.txt")
    with out.open("x", encoding="utf-8") as target:
        json.dump(lock, target, indent=2, ensure_ascii=False)
        target.write("\n")
    return {"status": "LOCKED", "runtimeLockPath": str(out), "sha256": digest(out),
            "packages": len(lock["packages"]), "networkUsed": False, "inferenceStarted": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--model-out", help="explicit network action: download locked public model data into a NEW directory")
    action.add_argument("--runtime-lock-out", help="offline action: verify pinned versions and write a NEW machine-local RECORD lock")
    args = parser.parse_args()
    try:
        result = prepare_model(args.model_out) if args.model_out else prepare_runtime(args.runtime_lock_out)
        print(json.dumps(result))
        return 0
    except Exception as error:
        print(json.dumps({"status": "FAILED", "errorType": type(error).__name__, "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
