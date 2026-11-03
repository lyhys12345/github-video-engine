"""Data-preparation rejection tests; no network, model loading, or synthesized media."""
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "prepare-local-voice.py"
spec = importlib.util.spec_from_file_location("prepare_local_voice", SCRIPT)
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class PreparationTests(unittest.TestCase):
    def test_existing_model_directory_rejected_before_network(self):
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary).resolve()
            marker = out / "original.txt"
            marker.write_text("preserve")
            with patch.object(prepare.urllib.request, "build_opener") as opener:
                with self.assertRaisesRegex(ValueError, "refusing overwrite"):
                    prepare.prepare_model(str(out))
                opener.assert_not_called()
            self.assertEqual(marker.read_text(), "preserve")
            self.assertEqual(list(out.iterdir()), [marker])

    def test_small_file_hash_mismatch_preserves_partial_only(self):
        # In-memory bytes exercise checksum enforcement; this is not an actual download.
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary).resolve()
            response = io.BytesIO(b"tampered")
            response.geturl = lambda: "https://huggingface.co/locked-data"
            opener = Mock()
            opener.open.return_value = response
            record = {"path": "tokenizer.txt", "bytes": 8,
                      "sha256": hashlib.sha256(b"original").hexdigest()}
            with self.assertRaisesRegex(ValueError, "length/hash mismatch"):
                prepare.download_file(out, record, opener)
            self.assertFalse((out / "tokenizer.txt").exists())
            self.assertEqual((out / "tokenizer.txt.partial").read_bytes(), b"tampered")
            self.assertIn(prepare.REVISION, opener.open.call_args.args[0].full_url)


if __name__ == "__main__":
    unittest.main()
