"""Exercise local reference-wave validation without a model or native dependencies."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'windows-local-chen.py'
CHECK = """
import importlib.metadata
import json
from math import isfinite
from pathlib import Path
import runpy
import sys
from types import SimpleNamespace
from unittest.mock import Mock, patch


class Waveform:
    def __init__(self, values, *, ndim=1, size=None):
        self.values = values
        self.ndim = ndim
        self.size = len(values) if size is None else size

    def any(self):
        return any(self.values)

    def __len__(self):
        return self.size


good = Waveform([0.12, -0.13])
resampled = Waveform([0.11])
cases = {
    'valid': (good, resampled, 24_000, None),
    'valid-at-limit': (Waveform([0.12], size=720_000), resampled, 24_000, None),
    'bad-rate': (good, resampled, 16_000, 'Unexpected local model output format'),
    'empty': (Waveform([]), resampled, 24_000, 'Local speech waveform is invalid'),
    'stereo': (Waveform([0.12, 0.23], ndim=2), resampled, 24_000, 'Local speech waveform is invalid'),
    'too-long': (Waveform([0.12], size=720_001), resampled, 24_000, 'Local speech waveform is invalid'),
    'nan': (Waveform([float('nan')]), resampled, 24_000, 'Local speech waveform is invalid'),
    'infinite': (Waveform([float('inf')]), resampled, 24_000, 'Local speech waveform is invalid'),
    'silent': (Waveform([0.0]), Waveform([0.0]), 24_000, 'Resampled local speech is non-finite or silent'),
    'resample-overflow': (good, Waveform([float('inf')]), 24_000, 'Resampled local speech is non-finite or silent'),
}
source, output, rate, error = cases[sys.argv[2]]
torch = SimpleNamespace(
    __version__='2.8.0+cu128', bfloat16=object(), manual_seed=Mock(),
    cuda=SimpleNamespace(is_available=lambda: True, get_device_name=lambda _device: 'test GPU'),
)
create_model = Mock()
create_model.return_value.generate_voice_clone.return_value = ([source], rate)
resample = Mock(return_value=output)
write_wav = Mock()
modules = {
    'torch': torch,
    'numpy': SimpleNamespace(asarray=lambda audio: audio,
                             isfinite=lambda audio: SimpleNamespace(all=lambda: all(map(isfinite, audio.values)))),
    'soundfile': SimpleNamespace(write=write_wav),
    'scipy.signal': SimpleNamespace(resample_poly=resample),
    'qwen_tts': SimpleNamespace(Qwen3TTSModel=SimpleNamespace(from_pretrained=create_model)),
}
versions = {'qwen-tts': '0.1.1', 'transformers': '4.57.3'}
request = {'text': '\\u65b0\\u95fb\\u3002', 'modelPath': 'model', 'referencePath': 'ref.wav', 'referenceText': 'reference'}
Path('request.json').write_text(json.dumps(request), encoding='utf-8')
with patch.dict(sys.modules, modules), patch.object(importlib.metadata, 'version', versions.__getitem__):
    try:
        runpy.run_path(sys.argv[1], run_name='__main__')
    except RuntimeError as raised:
        assert error is not None and str(raised).startswith(error), str(raised)
        write_wav.assert_not_called()
        if not error.startswith('Resampled'):
            resample.assert_not_called()
    else:
        assert error is None, 'malformed model audio reached the WAV writer'
        torch.manual_seed.assert_called_once_with(42)
        create_model.assert_called_once_with('model', device_map='cuda:0', dtype=torch.bfloat16,
                                             attn_implementation='eager', local_files_only=True)
        create_model.return_value.generate_voice_clone.assert_called_once_with(
            text=request['text'], language='Chinese', ref_audio='ref.wav', ref_text='reference', max_new_tokens=512,
        )
        resample.assert_called_once_with(source, 2, 3)
        write_wav.assert_called_once_with('speech.wav', output, 16_000, subtype='PCM_16')
"""


class LocalVoiceWorkerTests(unittest.TestCase):
    def test_local_waveform_validation_precedes_wav_write(self):
        for case in ('valid', 'valid-at-limit', 'bad-rate', 'empty', 'stereo', 'too-long', 'nan', 'infinite',
                     'silent', 'resample-overflow'):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as work:
                result = subprocess.run(
                    [sys.executable, '-B', '-I', '-c', CHECK, str(SCRIPT), case], cwd=work,
                    capture_output=True, text=True, timeout=15, check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                if case in ('valid', 'valid-at-limit'):
                    self.assertEqual(json.loads(result.stdout), {
                        'sampleRate': 16_000, 'samples': 1, 'torch': '2.8.0+cu128', 'gpu': 'test GPU',
                    })
                else:
                    self.assertEqual(result.stdout, '')


if __name__ == '__main__':
    unittest.main()
