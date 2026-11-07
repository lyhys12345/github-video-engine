#!/usr/bin/env python3
"""Explicit local Qwen3-TTS inference worker. Input/output are local files."""
import json, os, sys
from pathlib import Path

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
def deny_network(event, args):
    if event in ('socket.connect', 'socket.getaddrinfo'):
        raise RuntimeError('network access denied during local voice inference')
sys.addaudithook(deny_network)

import importlib.metadata
import torch
import soundfile as sf
from scipy.signal import resample_poly
from qwen_tts import Qwen3TTSModel

request = json.loads(Path('request.json').read_text(encoding='utf-8'))
if importlib.metadata.version('qwen-tts') != '0.1.1' or importlib.metadata.version('transformers') != '4.57.3' or torch.__version__ != '2.8.0+cu128':
    raise RuntimeError('Unsupported local voice runtime versions')
if not torch.cuda.is_available():
    raise RuntimeError('CUDA is unavailable; no fallback voice was used')
torch.manual_seed(42)
model = Qwen3TTSModel.from_pretrained(request['modelPath'], device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='eager', local_files_only=True)
waves, sample_rate = model.generate_voice_clone(text=request['text'], language='Chinese', ref_audio=request['referencePath'], ref_text=request['referenceText'], max_new_tokens=512)
if len(waves) != 1 or sample_rate != 24000:
    raise RuntimeError('Unexpected local model output format')
audio = resample_poly(waves[0], 2, 3)
sf.write('speech.wav', audio, 16000, subtype='PCM_16')
print(json.dumps({'sampleRate': 16000, 'samples': len(audio), 'torch': torch.__version__, 'gpu': torch.cuda.get_device_name(0)}, ensure_ascii=True))
