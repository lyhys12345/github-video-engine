import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("public_deps", Path(__file__).resolve().parents[1] / "scripts/prepare-public-voice-deps.py")
deps = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(deps)

class Response(io.BytesIO):
    def geturl(self):
        return deps.SOURCE_URL

class Source:
    def __init__(self, content):
        self.content = content
    def open(self, _url, timeout):
        return Response(self.content)

class PublicVoiceDependencySetup(unittest.TestCase):
    def test_rejects_same_length_tamper(self):
        with tempfile.TemporaryDirectory() as root:
            p = Path(root) / "source.tar.gz"
            p.write_bytes(b"good")
            deps.verify(p, 4, hashlib.sha256(b"good").hexdigest())
            p.write_bytes(b"evil")
            with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                deps.verify(p, 4, hashlib.sha256(b"good").hexdigest())

    def test_redirects_cannot_leave_fixed_public_host_or_include_credentials(self):
        deps.allowed_url(deps.SOURCE_URL)
        for url in ["http://files.pythonhosted.org/a", "https://evil.example/a",
                    "https://user:secret@files.pythonhosted.org/a",
                    "https://files.pythonhosted.org.evil.example/a",
                    "https://files.pythonhosted.org:444/a"]:
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    deps.allowed_url(url)

    def test_bad_download_keeps_partial_without_published_archive(self):
        # Mocked transport, real file publication guards. No network or package build.
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / "source.tar.gz"
            with patch.object(deps.urllib.request, "build_opener", return_value=Source(b"bad")):
                with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                    deps.download(target)
            self.assertFalse(target.exists())
            self.assertEqual(target.with_name("source.tar.gz.partial").read_bytes(), b"bad")

if __name__ == "__main__":
    unittest.main()
