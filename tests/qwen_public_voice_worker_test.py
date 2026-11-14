"""Check the isolated public voice worker without loading Torch or a model."""
import os
from pathlib import Path
import subprocess
import sys
import sysconfig
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "qwen-public-voice.py"


class WorkerTests(unittest.TestCase):
    def run_check(self, check, env=None):
        result = subprocess.run(
            [sys.executable, "-B", "-I", "-c", check, str(SCRIPT)],
            capture_output=True, text=True, timeout=15, check=False, env=env,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_hostname_is_local_and_network_operations_are_blocked(self):
        self.run_check("""
import runpy
import socket
import sys

runpy.run_path(sys.argv[1])
assert socket.gethostname()
for event in ("socket.connect", "socket.bind", "socket.getaddrinfo", "socket.gethostbyname", "socket.sendto"):
    try:
        sys.audit(event)
    except RuntimeError as error:
        assert str(error) == "Network access is disabled for the local voice worker."
    else:
        raise AssertionError(event + " unexpectedly passed the audit hook")
""")

    @unittest.skipUnless(
        sys.platform == "win32" and sysconfig.get_platform() == "win-amd64" and sys.version_info[:2] == (3, 12),
        "requires the supported Windows x64 interpreter",
    )
    def test_x64_runtime_reaches_lock_with_scrubbed_environment(self):
        windows = os.environ["SystemRoot"]
        self.run_check("""
import os
import runpy
import sys

assert 'PROCESSOR_ARCHITECTURE' not in os.environ
main = runpy.run_path(sys.argv[1])['main']
main.__globals__['read_runtime_lock'] = lambda: {'fixture': False}
try:
    main()
except RuntimeError as error:
    assert str(error) == 'The installed voice runtime differs from its pinned dependencies.'
else:
    raise AssertionError('expected rejection at the mocked runtime lock')
""", env={"SystemRoot": windows, "WINDIR": windows, "PATH": str(Path(windows) / "System32")})

    def test_arm64_python_build_is_rejected_even_if_host_reports_amd64(self):
        self.run_check("""
import platform
import runpy
import sys
import sysconfig
from unittest.mock import patch

main = runpy.run_path(sys.argv[1])['main']
with patch.object(sys, 'platform', 'win32'), patch.object(sys, 'version_info', (3, 12)):
    with patch.object(platform, 'machine', return_value='AMD64'), patch.object(sysconfig, 'get_platform', return_value='win-arm64'):
        try:
            main()
        except RuntimeError as error:
            assert str(error) == 'The public voice runtime needs Windows x64 and CPython 3.12.'
        else:
            raise AssertionError('expected unsupported interpreter rejection')
""")


if __name__ == "__main__":
    unittest.main()
