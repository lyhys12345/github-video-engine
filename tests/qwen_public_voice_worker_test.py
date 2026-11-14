"""Check the isolated voice worker's local lookup and network-denial behavior."""
from pathlib import Path
import subprocess
import sys
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "qwen-public-voice.py"


class WorkerNetworkTests(unittest.TestCase):
    def test_hostname_is_local_and_network_operations_are_blocked(self):
        check = """
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
"""
        result = subprocess.run(
            [sys.executable, "-B", "-I", "-c", check, str(SCRIPT)],
            capture_output=True, text=True, timeout=15, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()