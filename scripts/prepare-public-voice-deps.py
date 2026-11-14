#!/usr/bin/env python3
"""Prepare one reviewed pure-Python SoX wheel. Default: explicit public download; --source uses a local verified archive."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import urllib.parse
import urllib.request

SOURCE_URL = "https://files.pythonhosted.org/packages/3d/a2/d8e0d8fd7abf509ead4a2cb0fb24e5758b5330166bf9223d5cb9f98a7e8d/sox-1.5.0.tar.gz"
SOURCE_SHA = "12c7be5bb1f548d891fe11e82c08cf5f1a1d74e225298f60082e5aeb2469ada0"
SOURCE_BYTES = 63905
WHEEL_NAME = "sox-1.5.0-py3-none-any.whl"
WHEEL_SHA = "5bc5674ef014aab6bb1f2d3ec200cdd417961a31b9e655afc0678241a6ae62f3"
WHEEL_BYTES = 40165
VERSIONS = {"pip": "25.0.1", "setuptools": "80.9.0", "wheel": "0.45.1"}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def regular_path(path):
    for part in (path, *path.parents):
        require(not part.is_symlink() and not part.is_junction(), "Symlink/junction paths are unsupported.")
    return path

def digest(path):
    regular_path(path)
    require(path.is_file(), "Expected a regular archive/wheel file.")
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

def verify(path, size, sha):
    require(path.stat().st_size == size and digest(path) == sha, "Public dependency size or SHA-256 mismatch.")

def allowed_url(url):
    parsed = urllib.parse.urlsplit(url)
    require(parsed.scheme == "https" and parsed.hostname == "files.pythonhosted.org"
            and parsed.port in (None, 443) and parsed.username is None and parsed.password is None,
            "Only the public HTTPS files.pythonhosted.org data host is allowed.")

class PublicRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, url):
        allowed_url(url)
        return super().redirect_request(request, response, code, message, headers, url)

def download(path):
    allowed_url(SOURCE_URL)
    partial = path.with_name(path.name + ".partial")
    size = 0
    opener = urllib.request.build_opener(PublicRedirect())
    with partial.open("xb") as sink, opener.open(SOURCE_URL, timeout=60) as response:
        allowed_url(response.geturl())
        for block in iter(lambda: response.read(1024 * 64), b""):
            size += len(block)
            require(size <= SOURCE_BYTES, "Public source download exceeds pinned size.")
            sink.write(block)
    verify(partial, SOURCE_BYTES, SOURCE_SHA)
    os.link(partial, path)
    partial.unlink()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wheel-dir", required=True, help="New directory for the verified wheel, source and build log")
    parser.add_argument("--source", help="Optional exact already-downloaded SoX source archive; never executed until its pinned hash is checked")
    args = parser.parse_args()
    try:
        require(sys.platform == "win32" and platform.python_version() == "3.12.14"
                and sys.maxsize > 2**32 and sys.prefix != sys.base_prefix,
                "Use a dedicated Windows x64 Python 3.12.14 virtual environment.")
        require(all(importlib.metadata.version(k) == v for k, v in VERSIONS.items()),
                "Install the exact build-requirements-windows.txt first.")
        out = regular_path(Path(os.path.abspath(args.wheel_dir)))
        require(not out.exists(), "Wheel directory exists; choose a new directory.")
        local = regular_path(Path(os.path.abspath(args.source))) if args.source else None
        if local:
            verify(local, SOURCE_BYTES, SOURCE_SHA)
        out.mkdir(parents=True, exist_ok=False)
        source = out / "sox-1.5.0.tar.gz"
        if local:
            with source.open("xb") as sink:
                sink.write(local.read_bytes())
            verify(source, SOURCE_BYTES, SOURCE_SHA)
        else:
            download(source)
        build_tmp = out / "build-tmp"
        build_tmp.mkdir()
        # Trusted, hash-verified pure Python source only. No package dependency resolution or build isolation downloads.
        env = {key: value for key, value in os.environ.items()
               if key.upper() in {"SYSTEMROOT", "WINDIR", "COMSPEC", "PATH", "LOCALAPPDATA", "APPDATA", "USERPROFILE"}}
        env.update(SOURCE_DATE_EPOCH="1735689600", PYTHONUTF8="1", PYTHONNOUSERSITE="1",
                   PIP_NO_INDEX="1", PIP_DISABLE_PIP_VERSION_CHECK="1", TEMP=str(build_tmp), TMP=str(build_tmp))
        command = [sys.executable, "-I", "-m", "pip", "--isolated", "--no-cache-dir", "wheel",
                   "--no-index", "--no-deps", "--no-build-isolation", "--wheel-dir", str(out), str(source)]
        with (out / "build.log").open("xb") as log:
            process = subprocess.Popen(command, cwd=out, env=env, stdout=log, stderr=subprocess.STDOUT,
                                       creationflags=subprocess.CREATE_NO_WINDOW)
            try:
                code = process.wait(timeout=180)
            except subprocess.TimeoutExpired:
                taskkill = Path(os.environ["SystemRoot"]) / "System32" / "taskkill.exe"
                subprocess.run([str(taskkill), "/PID", str(process.pid), "/T", "/F"], capture_output=True, timeout=15)
                process.wait(timeout=15)
                raise ValueError("Public dependency build timed out; no success receipt was written.")
        require(code == 0, "Public dependency build failed; inspect the preserved build.log.")
        wheel = out / WHEEL_NAME
        verify(wheel, WHEEL_BYTES, WHEEL_SHA)
        receipt = {"schemaVersion": "public-voice-wheel-build/1.0", "sourceUrl": SOURCE_URL,
                   "sourceSha256": SOURCE_SHA, "sourceBytes": SOURCE_BYTES, "sourceMode": "local" if local else "download",
                   "wheelSha256": WHEEL_SHA, "wheelBytes": WHEEL_BYTES, "python": platform.python_version(),
                   "buildPackages": VERSIONS, "sourceDateEpoch": 1735689600,
                   "scope": "reviewed pure-Python upstream source built locally; no claim of binary-only upstream availability"}
        with (out / "receipt.json").open("x", encoding="utf-8") as sink:
            json.dump(receipt, sink, indent=2)
            sink.write("\n")
        print(json.dumps({"status": "verified-public-wheel", "wheelDirectory": str(out), **receipt}))
        return 0
    except (OSError, ValueError, importlib.metadata.PackageNotFoundError, subprocess.SubprocessError) as error:
        print(json.dumps({"status": "setup-failed", "error": str(error)}), file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
