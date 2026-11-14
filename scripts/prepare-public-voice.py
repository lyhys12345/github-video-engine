#!/usr/bin/env python3
"""Verify public Qwen model data and write the local voice profile."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "config" / "public-voice-v1" / "model-lock.json"
REPOSITORY = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
REVISION = "85e237c12c027371202489a0ec509ded67b5e4b5"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def regular_path(path):
    require(re.fullmatch(r"[A-Za-z]:", path.drive), "Use ordinary paths on a local Windows drive.")
    for entry in (path, *path.parents):
        require(not entry.is_symlink() and not entry.is_junction(),
                "Symlink or junction in the profile/model path.")
    return path


def model_files():
    lock = json.loads(LOCK.read_bytes())
    require(lock["schemaVersion"] == "qwen-public-model-lock/1.0" and lock["license"] == "Apache-2.0"
            and lock["repository"] == REPOSITORY and lock["revision"] == REVISION,
            "Unexpected public voice model lock.")
    files = lock["files"]
    names = set()
    for file in files:
        name = file["path"]
        require(re.fullmatch(r"(?:speech_tokenizer/)?[a-z_.]+\.(?:json|safetensors|txt)", name)
                and ".." not in name and name not in names, "Invalid locked file path.")
        require(type(file["bytes"]) is int and file["bytes"] > 0
                and re.fullmatch(r"[0-9a-f]{64}", file["sha256"]), "Invalid model hash or byte length.")
        names.add(name)
    require(len(files) == 11, "Unexpected public model file count.")
    return files


def allowed_url(url):
    parsed = urllib.parse.urlsplit(url)
    host = parsed.hostname or ""
    require(parsed.scheme == "https" and parsed.username is None and parsed.password is None
            and parsed.port in (None, 443) and (host == "huggingface.co" or host.endswith(".huggingface.co")
                                                or host.endswith(".hf.co")),
            "Only HTTPS Hugging Face model data hosts are supported.")


class ModelRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        allowed_url(new_url)
        return super().redirect_request(request, response, code, message, headers, new_url)


def validate_file(path, file):
    regular_path(path)
    require(path.is_file() and path.stat().st_size == file["bytes"],
            "Missing file or unexpected byte length for " + file["path"])
    with path.open("rb") as source:
        require(hashlib.file_digest(source, "sha256").hexdigest() == file["sha256"],
                "Unexpected SHA-256 for " + file["path"])


def download_file(directory, file, opener):
    target = directory / file["path"]
    partial = target.with_name(target.name + ".partial")
    url = f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/" + urllib.parse.quote(file["path"], safe="/")
    allowed_url(url)
    checksum, size = hashlib.sha256(), 0
    with partial.open("xb") as sink, opener.open(url, timeout=60) as response:
        allowed_url(response.geturl())
        for block in iter(lambda: response.read(1024 * 1024), b""):
            size += len(block)
            require(size <= file["bytes"], "Download exceeded locked byte length for " + file["path"])
            checksum.update(block)
            sink.write(block)
    require(size == file["bytes"] and checksum.hexdigest() == file["sha256"],
            "Download size or SHA-256 did not match " + file["path"])
    os.link(partial, target)
    partial.unlink()


def validate_tree(directory, files):
    names = {file["path"] for file in files}
    root_entries = {p.name for p in directory.iterdir()}
    require(root_entries == {name.split("/")[0] for name in names},
            "Model directory must contain only the pinned model files and speech_tokenizer directory.")
    tokenizer = regular_path(directory / "speech_tokenizer")
    require(tokenizer.is_dir() and {p.name for p in tokenizer.iterdir()} ==
            {name.split("/")[1] for name in names if "/" in name}, "Unexpected speech_tokenizer contents.")
    for file in files:
        validate_file(directory / file["path"], file)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", required=True, help="Exact model directory on this machine")
    parser.add_argument("--download", action="store_true", help="Explicitly download the locked public model into a new directory")
    parser.add_argument("--profile", default=str(ROOT / "work" / "qwen-public-profile.json"), help="New machine-local profile JSON")
    args = parser.parse_args()
    try:
        require(sys.platform == "win32" and sys.version_info[:2] == (3, 12) and sys.maxsize > 2**32
                and sys.prefix != sys.base_prefix, "Use the dedicated Windows x64 CPython 3.12 virtual environment.")
        model = regular_path(Path(os.path.abspath(args.model_dir)))
        profile = regular_path(Path(os.path.abspath(args.profile)))
        python = regular_path(Path(os.path.abspath(sys.executable)))
        require(not profile.exists(), "Profile already exists. Choose a new path.")
        require(model not in profile.parents, "Store the profile outside the model directory.")
        files = model_files()
        if args.download:
            model.mkdir(parents=True, exist_ok=False)
            (model / "speech_tokenizer").mkdir()
            opener = urllib.request.build_opener(ModelRedirect())
            for file in files:
                download_file(model, file, opener)
                print(json.dumps({"verifiedFile": file["path"], "bytes": file["bytes"], "sha256": file["sha256"]}), flush=True)
        validate_tree(model, files)
        profile.parent.mkdir(parents=True, exist_ok=True)
        with profile.open("x", encoding="utf-8") as sink:
            json.dump({"schemaVersion": "qwen-public-local/1.0", "pythonPath": str(python), "modelPath": str(model)}, sink)
            sink.write("\n")
        print(json.dumps({"status": "verified-model-profile-written", "profile": str(profile), "files": len(files),
                          "revision": REVISION, "runtimeCheck": "pnpm gve doctor --first-owner --phase preview --voice qwen-public --language zh-CN"}))
        return 0
    except (OSError, ValueError) as error:
        print(json.dumps({"status": "setup-failed", "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
