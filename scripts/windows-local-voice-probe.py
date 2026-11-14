#!/usr/bin/env python3
"""Check the pinned local worker dependencies without loading weights or synthesizing."""

import importlib.metadata
import sys


def deny_network(event, _args):
    if event in ('socket.connect', 'socket.getaddrinfo'):
        raise RuntimeError('network access denied in the local voice probe')


sys.addaudithook(deny_network)

import torch
import soundfile
from scipy.signal import resample_poly
from qwen_tts import Qwen3TTSModel

if (
    importlib.metadata.version('qwen-tts') != '0.1.1'
    or importlib.metadata.version('transformers') != '4.57.3'
    or torch.__version__ != '2.8.0+cu128'
):
    raise RuntimeError('Unsupported local voice runtime versions')

if not torch.cuda.is_available() or not torch.cuda.is_bf16_supported(including_emulation=False):
    raise RuntimeError('CUDA with native bfloat16 support is unavailable')

print('gve-local-voice-runtime-ready')
