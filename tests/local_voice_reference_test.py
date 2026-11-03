"""Focused local-reference validation tests; these do not synthesize or judge audio."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import wave

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "local-chen-reference.py"
spec = importlib.util.spec_from_file_location("local_chen_reference", SCRIPT)
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)


class LocalReferenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.model = self.root / "model"
        (self.model / "speech_tokenizer").mkdir(parents=True)
        self.files = {"config.json": b'{"tts_model_type":"base"}',
                      "model.safetensors": b"not-real-weights-validator-fixture",
                      "speech_tokenizer/config.json": b"{}",
                      "speech_tokenizer/model.safetensors": b"fixture-tokenizer"}
        for name, content in self.files.items():
            (self.model / name).write_bytes(content)
        self.lock = {"repository": voice.REPOSITORY, "revision": voice.REVISION,
                     "downloadOnly": True, "remoteCodeDownloaded": False,
                     "files": [{"path": name, "bytes": len(content),
                                "sha256": hashlib.sha256(content).hexdigest()}
                               for name, content in self.files.items()]}
        self.model_lock = self.root / "model-lock.json"
        self.model_lock.write_text(json.dumps(self.lock))
        self.runtime_lock = self.root / "runtime-lock.json"
        self.runtime_lock.write_text("{}")
        self.reference = self.root / "reference.wav"
        with wave.open(str(self.reference), "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(24000)
            audio.writeframes(b"\x00\x01" * 240)
        self.text = self.root / "text.txt"
        self.text.write_text("这是一段新的中文测试。", encoding="utf-8")
        self.profile = {"schemaVersion": "local-reference-profile/1.0",
                        "modelPath": str(self.model), "modelLockPath": str(self.model_lock),
                        "runtimeLockPath": str(self.runtime_lock), "referencePath": str(self.reference),
                        "referenceSha256": voice.sha256(self.reference), "referenceText": "完整参考原文。",
                        "authorization": "user-declared-permission",
                        "referenceTranscriptVerification": "caller-declared-not-independently-transcribed"}
        self.profile_path = self.root / "profile.json"
        self.save_profile()

    def tearDown(self):
        self.temp.cleanup()

    def save_profile(self):
        self.profile_path.write_text(json.dumps(self.profile), encoding="utf-8")

    def run_cli(self, out):
        return subprocess.run([sys.executable, str(SCRIPT), "--profile", str(self.profile_path),
                               "--text-file", str(self.text), "--out", str(out), "--check"],
                              capture_output=True, text=True, timeout=20)

    def test_validation_bindings_do_not_load_model(self):
        # Only runtime metadata validation is substituted. No fake generation or success receipt.
        with patch.object(voice, "validate_runtime"):
            profile, paths, text, binding = voice.preflight(self.profile_path, self.text)
        self.assertEqual(profile["referenceText"], "完整参考原文。")
        self.assertEqual(binding["referenceSha256"], voice.sha256(self.reference))
        self.assertEqual(binding["effectiveParameters"]["lang_code"], "Chinese")
        self.assertEqual(binding["requestedParameters"]["repetition_penalty"], 1.05)
        self.assertEqual(binding["effectiveParameters"]["repetition_penalty"], 1.5)
        self.assertNotIn("mlx.core", sys.modules)

    def test_same_length_model_hash_mismatch(self):
        file = self.model / "model.safetensors"
        file.write_bytes(b"X" * file.stat().st_size)
        out = self.root / "hash-failure"
        result = self.run_cli(out)
        self.assertEqual(result.returncode, 1)
        self.assertIn("model hash mismatch", result.stderr)
        self.assertTrue((out / "failure.json").is_file())
        self.assertFalse((out / "receipt.json").exists())
        self.assertFalse((out / "check.json").exists())
        self.assertFalse((out / "audio.wav").exists())

    def test_missing_model_fails_without_success_receipt(self):
        self.profile["modelPath"] = str(self.root / "missing-model")
        self.save_profile()
        out = self.root / "missing-failure"
        result = self.run_cli(out)
        self.assertEqual(result.returncode, 1)
        self.assertIn("missing local directory", result.stderr)
        self.assertTrue((out / "failure.json").exists())
        self.assertFalse((out / "receipt.json").exists())

    def test_existing_output_untouched(self):
        out = self.root / "existing"
        out.mkdir()
        marker = out / "receipt.json"
        marker.write_text("preserve old evidence")
        result = self.run_cli(out)
        self.assertEqual(result.returncode, 1)
        self.assertIn("output directory already exists", result.stderr)
        self.assertEqual(marker.read_text(), "preserve old evidence")
        self.assertEqual(list(out.iterdir()), [marker])

    def test_reference_hash_mismatch(self):
        self.profile["referenceSha256"] = "0" * 64
        self.save_profile()
        with self.assertRaisesRegex(ValueError, "reference hash mismatch"):
            voice.preflight(self.profile_path, self.text)

    def test_extra_model_file_rejected(self):
        (self.model / "extra.txt").write_text("unlocked")
        with self.assertRaisesRegex(ValueError, "model file set mismatch"):
            voice.validate_model(self.model, self.lock)

    def test_symlink_rejected(self):
        target = self.model / "model.safetensors"
        target.unlink()
        target.symlink_to(self.text)
        with self.assertRaisesRegex(ValueError, "symlink rejected"):
            voice.validate_model(self.model, self.lock)

    def test_traversal_code_and_auto_map_rejected(self):
        for name in ("../escape", "/absolute", "module.py", "model.pkl", "weights.bin"):
            with self.subTest(name=name):
                lock = {**self.lock, "files": [{"path": name}]}
                with self.assertRaises(ValueError):
                    voice.validate_model(self.model, lock)
        with self.assertRaisesRegex(ValueError, "auto_map"):
            voice.no_remote_config({"nested": [{"auto_map": {"AutoModel": "remote.Code"}}]})

    def test_runtime_version_mismatch(self):
        with self.assertRaisesRegex(ValueError, "Python version mismatch"):
            voice.validate_runtime({"schemaVersion": "local-voice-runtime-lock/1.0",
                                    "pythonVersion": "0.0.0"})

    def test_text_length_bounds(self):
        for text in ("", " " * 5, "字" * 301, "bad\x00text"):
            with self.subTest(length=len(text)):
                self.text.write_text(text)
                with self.assertRaisesRegex(ValueError, "1–300"):
                    voice.preflight(self.profile_path, self.text)

    def test_sandbox_absence_fails_closed(self):
        with patch.object(voice.sys, "platform", "linux"):
            with self.assertRaisesRegex(ValueError, "failing closed"):
                voice.check_sandbox({})

    def test_python_audit_blocks_socket_in_separate_process(self):
        code = ("import importlib.util,socket;"
                f"s=importlib.util.spec_from_file_location('voice',{str(SCRIPT)!r});"
                "m=importlib.util.module_from_spec(s);s.loader.exec_module(m);"
                "m.install_network_audit();socket.socket()")
        result = subprocess.run([sys.executable, "-I", "-c", code], capture_output=True, text=True, timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("forbids Python socket operations", result.stderr)

    def worker_command(self):
        return [sys.executable, "-I", "-B", str(SCRIPT), "--worker",
                "--profile", str(self.root / "deliberately-missing-profile.json"),
                "--text-file", str(self.text), "--out", str(self.root / "worker-output")]

    def test_real_unsandboxed_worker_rejected_before_input_or_model_load(self):
        # Run this suite outside Codex's enclosing sandbox for an unambiguous OS test.
        result = subprocess.run(self.worker_command(), capture_output=True, text=True, timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("worker requires existing OS network denial", result.stderr)
        self.assertNotIn("missing local file", result.stderr)
        self.assertFalse((self.root / "worker-output").exists())

    @unittest.skipUnless(sys.platform == "darwin" and Path(voice.SANDBOX).is_file(), "macOS sandbox required")
    def test_real_sandboxed_worker_passes_guard_and_reaches_input_validation(self):
        result = subprocess.run([voice.SANDBOX, "-p", voice.SANDBOX_POLICY, *self.worker_command()],
                                capture_output=True, text=True, timeout=10)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing local file", result.stderr)
        self.assertIn("deliberately-missing-profile", result.stderr)
        self.assertNotIn("worker requires existing OS network denial", result.stderr)
        self.assertFalse((self.root / "worker-output").exists())

    def test_mocked_guard_order_precedes_audit_and_preflight(self):
        # This verifies call order only, separately from the two real OS tests above.
        events = []
        def stop_preflight(*args):
            events.append("preflight")
            raise ValueError("stop before model import")
        args = argparse.Namespace(profile="unused-profile", text_file="unused-text")
        with patch.object(voice, "require_current_process_network_denial", side_effect=lambda: events.append("guard")), \
             patch.object(voice, "install_network_audit", side_effect=lambda: events.append("audit")), \
             patch.object(voice, "preflight", side_effect=stop_preflight):
            with self.assertRaisesRegex(ValueError, "stop before model import"):
                voice.worker(args)
        self.assertEqual(events, ["guard", "audit", "preflight"])

    @unittest.skipUnless(sys.platform == "darwin" and Path(voice.SANDBOX).is_file(), "macOS sandbox required")
    def test_real_os_sandbox_denies_local_socket_bind(self):
        voice.check_sandbox(dict(voice.os.environ))


if __name__ == "__main__":
    unittest.main()
