#!/usr/bin/env python3
"""Propose unreviewed local forced alignment of canonical original recordings."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import inspect
import json
import math
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import time
import unicodedata
import wave

ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / 'scripts/local-chen-reference.py'
_spec = importlib.util.spec_from_file_location('local_voice_helpers', HELPER_PATH)
h = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(h)
require, sha256, read_json, write_json = h.require, h.sha256, h.read_json, h.write_json
REPOSITORY = 'mlx-community/Qwen3-ForcedAligner-0.6B-8bit'
REVISION = '0e1a68e91d815300c7c9754b2a7639378b23db15'
RATE = 16000
CANONICAL_RECEIPT = ROOT / 'fixtures/continuous/generation-receipt.json'
ORIGINALS = {
    'rea': ('67fd6babc763d5f2b8e7e754238286738a5d5ce025b7f7e1517d363abc612c10', 830285),
    'rembg': ('31c470430fff5f25995b98ff7194af8057c488acd426d6b6cd0cfa5dbb03b4d5', 521831),
}


def text_hash(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def is_cjk(ch):
    c = ord(ch)
    return any(a <= c <= b for a, b in ((0x4e00, 0x9fff), (0x3400, 0x4dbf),
        (0x20000, 0x2a6df), (0x2a700, 0x2b73f), (0x2b740, 0x2b81f),
        (0x2b820, 0x2ceaf), (0xf900, 0xfaff)))


def token_ledger(text):
    """Exact pinned Chinese tokenization with explicit offsets and separator loss."""
    tokens, separators, run = [], [], []
    byte_offsets = [0]
    for ch in text:
        byte_offsets.append(byte_offsets[-1] + len(ch.encode('utf-8')))
    def emit(indices):
        a, b = indices[0], indices[-1] + 1
        return {'text': text[a:b], 'codepointStart': a, 'codepointEnd': b,
                'utf8Start': byte_offsets[a], 'utf8End': byte_offsets[b]}
    def flush():
        if run:
            tokens.append(emit(run))
            run.clear()
    for i, ch in enumerate(text):
        category = unicodedata.category(ch)
        if is_cjk(ch):
            flush()
            tokens.append(emit([i]))
        elif category[0] in 'LN' or ch == "'":
            run.append(i)
        elif ch.isspace() or category.startswith('P'):
            flush()
            separators.append(emit([i]))
        else:
            raise ValueError(f'unsupported combining mark/symbol/control U+{ord(ch):04X} at codepoint {i}')
    flush()
    require(tokens, 'transcript has no alignable tokens')
    return {'tokens': tokens, 'discardedSeparators': separators,
            'normalization': 'none; exact case, Unicode and number spelling retained'}


def phase_mapping(phases, ledger):
    result, offset = [], 0
    tokens = ledger['tokens']
    for index, phase in enumerate(phases):
        text = phase['captionText']
        end = offset + len(text)
        require(not any(t['codepointStart'] < end < t['codepointEnd'] for t in tokens),
                f'phase {index} boundary falls inside a non-CJK token')
        indices = [j for j, t in enumerate(tokens) if offset <= t['codepointStart'] and t['codepointEnd'] <= end]
        require(indices, f'phase {index} has no alignable token')
        result.append({'index': index, 'label': phase.get('label'), 'text': text,
            'captionTextSha256': text_hash(text), 'codepointStart': offset, 'codepointEnd': end,
            'firstToken': indices[0], 'lastToken': indices[-1]})
        offset = end
    return result


def validate_model(model, lock):
    require(lock.get('repository') == REPOSITORY and lock.get('revision') == REVISION,
            'model repository/revision mismatch; no fallback allowed')
    require(lock.get('downloadOnly') is True and lock.get('remoteCodeDownloaded') is False,
            'data-only model lock required')
    records = lock.get('files')
    require(isinstance(records, list) and records, 'empty model lock')
    expected = set()
    for record in records:
        name = record.get('path', '')
        relative = PurePosixPath(name)
        require(name and not relative.is_absolute() and '..' not in relative.parts and '\\' not in name
                and str(relative) == name and name not in expected, 'unsafe/duplicate model path')
        require(relative.suffix in {'.json', '.txt', '.md', '.safetensors'}, 'only locked model data files allowed')
        expected.add(name)
        path = h.local_path(str(model / name))
        require(not path.stat().st_mode & 0o111, f'executable model data rejected: {name}')
        require(type(record.get('bytes')) is int and record['bytes'] > 0
                and path.stat().st_size == record['bytes'], f'model size mismatch: {name}')
        require(sha256(path) == record.get('sha256'), f'model hash mismatch: {name}')
        if path.suffix == '.json':
            h.no_remote_config(read_json(path))
    actual = set()
    for path in model.rglob('*'):
        require(not path.is_symlink(), f'model symlink rejected: {path}')
        if path.is_file():
            actual.add(path.relative_to(model).as_posix())
        else:
            require(path.is_dir(), f'special model entry rejected: {path}')
    require(actual == expected, 'model file set mismatch')
    require({'config.json', 'tokenizer_config.json', 'vocab.json', 'merges.txt', 'preprocessor_config.json'} <= expected
            and any(p.endswith('.safetensors') for p in expected), 'model config/tokenizer/weights missing')


def preflight(args):
    paths = {key: h.local_path(getattr(args, key), directory=(key == 'model'))
             for key in ('model', 'model_lock', 'runtime_lock', 'receipt', 'audio', 'plan')}
    require(sha256(paths['receipt']) == sha256(CANONICAL_RECEIPT), 'receipt must match repository canonical fixture exactly')
    receipt, plan = read_json(paths['receipt']), read_json(paths['plan'])
    require(args.recording in ('rea', 'rembg'), 'only original rea/rembg recordings supported')
    recordings = [r for r in receipt.get('recordings', []) if r.get('name') == args.recording]
    require(len(recordings) == 1, 'canonical recording missing/duplicated')
    recording = recordings[0]
    require((recording.get('sha256'), recording.get('bytes')) == ORIGINALS[args.recording], 'canonical original recording identity changed')
    require(paths['audio'].stat().st_size == recording.get('bytes')
            and sha256(paths['audio']) == recording.get('sha256'), 'canonical audio size/hash mismatch')
    text = recording.get('text')
    require(isinstance(text, str) and text.strip() and '\x00' not in text and len(text) <= 5000, 'invalid exact canonical text')
    phases = plan.get('phases')
    require(isinstance(phases, list) and 2 <= len(phases) <= 32
            and all(isinstance(p, dict) and isinstance(p.get('captionText'), str) and p['captionText'] for p in phases),
            'plan must have 2–32 nonempty caption phases')
    require(''.join(p['captionText'] for p in phases) == text, 'exact plan phase concatenation must equal canonical recording text')
    measured = recording.get('measuredSeconds')
    require(isinstance(measured, (float, int)) and math.isfinite(measured) and 0 < measured <= 60, 'invalid recorded duration')
    ledger = token_ledger(text)
    mapped = phase_mapping(phases, ledger)
    validate_model(paths['model'], read_json(paths['model_lock']))
    h.validate_runtime(read_json(paths['runtime_lock']))
    bindings = {f'{key}Sha256': sha256(paths[key]) for key in ('model_lock', 'runtime_lock', 'receipt', 'audio', 'plan')}
    bindings.update({'scriptSha256': sha256(Path(__file__)), 'helperSha256': sha256(HELPER_PATH),
        'textSha256': text_hash(text), 'captionTextSha256': [p['captionTextSha256'] for p in mapped],
        'audioBytes': paths['audio'].stat().st_size, 'canonicalMeasuredSeconds': measured,
        'modelRepository': REPOSITORY, 'modelRevision': REVISION, 'recording': args.recording})
    return paths, text, ledger, mapped, bindings


def probe_source(audio, out, ffprobe, env):
    command = [str(ffprobe), '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(audio)]
    write_json(out/'source-probe-command.json', {'argv': command})
    with (out / 'source.ffprobe.json').open('x') as report, (out / 'source.ffprobe.stderr.log').open('x') as log:
        h.run_process(command, env=env, timeout=30, stdout=report, stderr=log)
    value = read_json(out / 'source.ffprobe.json')
    streams = value.get('streams', [])
    require(len(streams) == 1 and streams[0].get('codec_type') == 'audio', 'source must contain exactly one audio stream')
    duration = float(value['format']['duration'])
    require(math.isfinite(duration) and 0 < duration <= 60, 'source container duration out of bounds')
    return duration, command


def decode_source(audio, out, ffmpeg, env):
    command = [str(ffmpeg), '-v', 'error', '-xerror', '-nostdin', '-i', str(audio),
               '-map', '0:a:0', '-ac', '1', '-ar', str(RATE), '-c:a', 'pcm_s16le', str(out / 'decoded.wav')]
    write_json(out/'decode-command.json', {'argv': command})
    with (out / 'decode.stderr.log').open('x') as log:
        h.run_process(command, env=env, timeout=60, stdout=subprocess.DEVNULL, stderr=log)
    return pcm_info(out / 'decoded.wav'), command


def pcm_info(path):
    with wave.open(str(path), 'rb') as source:
        require(source.getframerate() == RATE and source.getnchannels() == 1 and source.getsampwidth() == 2
                and source.getcomptype() == 'NONE' and source.getnframes() > 0, 'decoded audio must be PCM16 mono 16kHz')
        frames = source.getnframes()
        require(frames / RATE <= 60, 'decoded PCM exceeds 60 seconds')
        data = source.readframes(frames)
        require(len(data) == frames * 2, 'truncated PCM frames')
    return {'path': 'decoded.wav', 'sha256': sha256(path), 'pcmSha256': hashlib.sha256(data).hexdigest(),
            'frames': frames, 'sampleRate': RATE, 'channels': 1, 'sampleWidthBytes': 2,
            'durationSeconds': frames / RATE, 'fullDecode': 'PASS', 'trimmed': False, 'retimed': False}


def repair_annotation(raw, repaired):
    require(len(raw) == len(repaired), 'raw/repaired timestamp vector length mismatch')
    changes = []
    for i, (before, after) in enumerate(zip(raw, repaired)):
        require(isinstance(before, (int, float)) and isinstance(after, (int, float))
                and math.isfinite(before) and math.isfinite(after), 'nonfinite timestamp vector')
        if before != after:
            changes.append({'index': i, 'rawMilliseconds': before, 'repairedMilliseconds': after,
                            'deltaMilliseconds': after - before})
    return changes


def recorder_type(base):
    """Record upstream repair without changing or bypassing its implementation."""
    class RecordingProcessor(base):
        def __init__(self):
            super().__init__()
            self.observations = []
        def parse_timestamp(self, word_list, timestamp):
            observation = {'wordList': list(word_list), 'rawTimestampMilliseconds': timestamp.tolist()}
            self.observations.append(observation)
            return super().parse_timestamp(word_list, timestamp)
        def fix_timestamp(self, data):
            repaired = super().fix_timestamp(data)
            self.observations[-1]['repairedTimestampMilliseconds'] = list(repaired)
            self.observations[-1]['changes'] = repair_annotation(self.observations[-1]['rawTimestampMilliseconds'], repaired)
            return repaired
    return RecordingProcessor


def assess_items(items, ledger, phases, source_seconds, pcm_seconds):
    """Return auditable diagnostics; unresolved cuts stay null and cannot publish a draft."""
    errors, flags, gaps = [], [], []
    tokens = ledger['tokens']
    if [i.get('text') for i in items] != [t['text'] for t in tokens]:
        errors.append('postprocessed item texts do not match exact ordered token ledger')
    valid = []
    for n, item in enumerate(items):
        start, end = item.get('startSeconds'), item.get('endSeconds')
        good = (type(start) in (int, float) and type(end) in (int, float)
                and math.isfinite(start) and math.isfinite(end) and 0 <= start <= end
                and end <= min(source_seconds, pcm_seconds))
        valid.append(good)
        if not good:
            errors.append(f'invalid/nonfinite/reversed/out-of-range item {n}')
        if good and start == end:
            flags.append({'kind': 'zero-duration-item', 'itemIndex': n, 'seconds': start})
        if n and good and valid[n-1]:
            previous = items[n-1]['endSeconds']
            if start < previous:
                errors.append(f'overlap at item {n}')
            elif start > previous:
                gaps.append({'leftItem': n-1, 'rightItem': n, 'startSeconds': previous,
                             'endSeconds': start, 'durationSeconds': start-previous})
    cuts = []
    for phase in phases[:-1]:
        left, right = phase['lastToken'], phase['lastToken']+1
        cut = {'afterPhase': phase['index'], 'leftItem': left, 'rightItem': right,
               'leftEndSeconds': None, 'rightStartSeconds': None, 'cutSeconds': None,
               'policy': 'midpoint of [last-left-token end, first-right-token start]'}
        if right < len(items) and right < len(valid) and valid[left] and valid[right]:
            a, b = items[left]['endSeconds'], items[right]['startSeconds']
            cut.update({'leftEndSeconds': a, 'rightStartSeconds': b, 'gapSeconds': b-a})
            if a <= b:
                cut['cutSeconds'] = (a+b)/2
        cuts.append(cut)
    boundaries = [0] + [c['cutSeconds'] for c in cuts] + [source_seconds]
    if any(x is None for x in boundaries):
        errors.append('unresolvable phase cuts')
    elif any(b <= a for a, b in zip(boundaries, boundaries[1:])):
        errors.append('phase cuts are not strictly increasing')
    prospective = []
    if not any(x is None for x in boundaries):
        for index, (start, end) in enumerate(zip(boundaries, boundaries[1:])):
            start_frame = math.floor(start * 30 + .5)
            end_frame = math.ceil(end * 30) if index == len(phases)-1 else math.floor(end * 30 + .5)
            frames = end_frame - start_frame
            prospective.append({'phaseIndex': index, 'fps': 30, 'roundedSourceStartFrame': start_frame,
                                'roundedSourceEndFrame': end_frame, 'durationFrames': frames})
            if frames < 4:
                flags.append({'kind': 'prospective-cue-under-four-frames', 'phaseIndex': index,
                              'fps': 30, 'durationFrames': frames})
    return {'errors': errors, 'flags': flags, 'gaps': gaps, 'cuts': cuts, 'boundariesSeconds': boundaries,
            'prospectiveCueFramesAt30Fps': prospective,
            'prospectiveFramePolicy': 'JS Math.round(source seconds * 30); final source end uses ceil as existing renderer; diagnostic only',
            'coverageEndpoints': '0 and final source container duration are technical coverage, not speech boundaries',
            'tokenMatchMeaning': 'forced model copies supplied words; exact token match is not independent ASR or speech verification'}


def make_auditions(out, assessment, phases, pcm):
    directory = out / 'auditions'
    directory.mkdir()
    with wave.open(str(out / 'decoded.wav'), 'rb') as source:
        data = source.readframes(source.getnframes())
    clips = []
    for cut in assessment['cuts']:
        sample = round(cut['cutSeconds'] * RATE)
        start, end = max(0, sample - round(1.5*RATE)), min(pcm['frames'], sample + round(1.5*RATE))
        name = f'boundary-{cut["afterPhase"]+1:02d}.wav'
        with wave.open(str(directory / name), 'wb') as target:
            target.setnchannels(1)
            target.setsampwidth(2)
            target.setframerate(RATE)
            target.writeframes(data[start*2:end*2])
        n = cut['afterPhase']
        clips.append({'path': 'auditions/'+name, 'sha256': sha256(directory/name),
            'sourceClipStartFrame': start, 'sourceClipEndFrame': end, 'sourceClipStartSeconds': start/RATE,
            'sourceClipEndSeconds': end/RATE, 'cutRelativeSample': sample-start,
            'proposedCutSeconds': cut['cutSeconds'], 'quantizedCutSeconds': sample/RATE,
            'leftText': phases[n]['text'], 'rightText': phases[n+1]['text']})
    return clips


def worker(args):
    h.require_current_process_network_denial()  # MUST precede audit, preflight and runtime import.
    h.install_network_audit()
    os.environ.update(h.OFFLINE)
    paths, text, ledger, phases, binding = preflight(args)
    out = Path(args.out)
    pcm = pcm_info(out / 'decoded.wav')
    expected = read_json(out / 'preflight.json')
    require(expected['bindings'] == binding and expected['decodedAudio'] == pcm, 'worker input bindings changed')
    from mlx_audio.stt.utils import load_model
    from mlx_audio.stt.models.qwen3_asr.qwen3_forced_aligner import ForceAlignProcessor
    processor_path = Path(inspect.getfile(ForceAlignProcessor))
    processor_sha = sha256(processor_path)
    model = load_model(paths['model'], model_type='qwen3_forced_aligner')
    segment_ms = float(model.config.timestamp_segment_time)
    require(math.isfinite(segment_ms) and segment_ms > 0, 'invalid model timestamp segment time')
    resolution = {'modelTimestampSegmentTimeMilliseconds': segment_ms,
        'rawClassifierResolutionSeconds': segment_ms/1000, 'upstreamRepairOutputUnit': 'integer milliseconds',
        'returnedItemsDisplayDecimalPlaces': 3,
        'note': 'Returned three-decimal seconds do not imply millisecond alignment accuracy; repaired values may leave the classifier grid.'}
    processor = recorder_type(ForceAlignProcessor)()
    model.aligner_processor = processor
    require(processor.tokenize_chinese_mixed(text) == [t['text'] for t in ledger['tokens']], 'installed tokenizer differs from exact ledger')
    try:
        result = model.generate(audio=str(out / 'decoded.wav'), text=text, language='Chinese')
        items = [{'text': item.text, 'startSeconds': item.start_time, 'endSeconds': item.end_time} for item in result.items]
        write_json(out / 'worker.json', {'bindings': binding, 'decodedAudio': pcm, 'postprocessedItems': items,
            'processorObservations': processor.observations, 'processorFile': str(processor_path),
            'processorFileSha256': processor_sha, 'timestampResolution': resolution, 'forcedInstalledArchitecture': 'qwen3_forced_aligner',
            'localPathType': 'pathlib.Path', 'postLoadTokenizerTrustRemoteCode': True,
            'remoteCodeConstraint': 'data-only exact file allowlist, no auto_map, OS network denial; not a false trust_remote_code=False claim'})
    finally:
        if processor.observations:
            # Also retain partial diagnostics if generation or serialization fails.
            with (out / 'processor-observations.json').open('x', encoding='utf-8') as target:
                json.dump(processor.observations, target, ensure_ascii=False, indent=2, allow_nan=True)
                target.write('\n')
    require(preflight(args)[4] == binding and pcm_info(out/'decoded.wav') == pcm
            and sha256(processor_path) == processor_sha, 'worker inputs/runtime processor changed during alignment')


def parser():
    value = argparse.ArgumentParser(description=__doc__)
    for key in ('model', 'model-lock', 'runtime-lock', 'receipt', 'audio', 'plan', 'out'):
        value.add_argument('--'+key, required=True)
    value.add_argument('--recording', required=True, choices=('rea', 'rembg'))
    value.add_argument('--check', action='store_true')
    value.add_argument('--worker', action='store_true', help=argparse.SUPPRESS)
    return value


def main(argv=None):
    args = parser().parse_args(argv)
    if args.worker:
        worker(args)
        return 0
    out = Path(os.path.abspath(args.out))
    created, started = False, time.monotonic()
    try:
        require(not out.exists() and not out.is_symlink(), 'output directory already exists; refusing overwrite')
        h.local_path(str(out.parent), directory=True)
        out.mkdir()
        created = True
        paths, text, ledger, phases, bindings = preflight(args)
        env = {**os.environ, **h.OFFLINE, 'PYTHONNOUSERSITE': '1'}
        h.check_sandbox(env)
        ffprobe, ffmpeg = h.tool_path('ffprobe'), h.tool_path('ffmpeg')
        duration, probe_command = probe_source(paths['audio'], out, ffprobe, env)
        require(abs(duration-bindings['canonicalMeasuredSeconds']) <= .005, 'source container duration differs from canonical receipt')
        shutil.copyfile(paths['audio'], out/'source-original.mp3')
        require(sha256(out/'source-original.mp3') == bindings['audioSha256'], 'source copy hash mismatch')
        pcm, decode_command = decode_source(paths['audio'], out, ffmpeg, env)
        require(preflight(args)[4] == bindings, 'inputs changed during decode')
        provenance = {'bindings': bindings, 'sourceAudio': {'path': 'source-original.mp3',
            'sha256': bindings['audioSha256'], 'bytes': bindings['audioBytes'], 'containerDurationSeconds': duration},
            'decodedAudio': pcm, 'containerMinusPcmSeconds': duration-pcm['durationSeconds'],
            'commands': {'probe': probe_command, 'decode': decode_command},
            'tools': {name: {'path': str(path), 'sha256': sha256(path)} for name, path in (('ffprobe',ffprobe),('ffmpeg',ffmpeg))}}
        write_json(out/'preflight.json', provenance)
        if args.check:
            write_json(out/'check.json', {**provenance, 'status': 'CHECKED', 'modelLoaded': False,
                'audioSynthesized': False, 'sourceDecodedOnly': True,
                'networkIsolation': 'macOS sandbox-exec deny network* probe passed'})
            print(json.dumps({'status': 'CHECKED', 'out': str(out)}))
            return 0
        command = [h.SANDBOX, '-p', h.SANDBOX_POLICY, sys.executable, '-I', str(Path(__file__).absolute()), '--worker']
        for key in ('model', 'model_lock', 'runtime_lock', 'receipt', 'audio', 'plan'):
            command.extend(['--'+key.replace('_','-'), str(paths[key])])
        command.extend(['--recording', args.recording, '--out', str(out)])
        write_json(out/'worker-command.json', {'argv': command, 'offlineEnvironment': h.OFFLINE, 'timeoutSeconds': 600})
        with (out/'worker.stdout.log').open('x') as stdout, (out/'worker.stderr.log').open('x') as stderr:
            h.run_process(command, env=env, timeout=600, stdout=stdout, stderr=stderr)
        report = read_json(out/'worker.json')
        require(report['bindings'] == bindings and report['decodedAudio'] == pcm, 'worker bindings differ from preflight')
        require(preflight(args)[4] == bindings and pcm_info(out/'decoded.wav') == pcm
                and sha256(out/'source-original.mp3') == bindings['audioSha256'], 'inputs changed during alignment')
        require(sha256(h.local_path(report['processorFile'])) == report['processorFileSha256'], 'processor changed during alignment')
        observations = report['processorObservations']
        require(len(observations) == 1 and observations[0]['wordList'] == [t['text'] for t in ledger['tokens']], 'processor observation mismatch')
        require(len(observations[0]['rawTimestampMilliseconds']) == 2*len(ledger['tokens']), 'unexpected timestamp vector length')
        changes = repair_annotation(observations[0]['rawTimestampMilliseconds'], observations[0]['repairedTimestampMilliseconds'])
        require(changes == observations[0]['changes'], 'repair annotation mismatch')
        assessment = assess_items(report['postprocessedItems'], ledger, phases, duration, pcm['durationSeconds'])
        assessment['timestampRepairs'] = changes
        write_json(out/'diagnostics.json', assessment)
        require(not assessment['errors'], 'alignment invalid; inspect diagnostics.json; unresolved cuts remain null')
        clips = make_auditions(out, assessment, phases, pcm)
        draft = {**provenance, 'schemaVersion': 'local-forced-alignment-draft/1.0', 'status': 'PROPOSED_UNREVIEWED',
            'renderable': False, 'independentTimingReview': 'UNVERIFIED', 'speechContentReview': 'UNVERIFIED',
            'ownerAcceptance': 'pending', 'method': 'local-forced-alignment-proposal', 'language': 'Chinese',
            'remoteProviderCalls': 0, 'providerChargeUsd': 0, 'modelSynthesizedAudio': False,
            'networkIsolation': {'os': 'macOS sandbox-exec deny network*', 'probe': 'local bind rejected',
                'workerGuard': 'current-process bind rejected before audit/preflight/import', 'pythonAudit': 'supplemental'},
            'tokenLedger': ledger, 'phases': phases, 'postprocessedItems': report['postprocessedItems'],
            'assessment': assessment, 'boundaryAuditions': clips,
            'processorFileSha256': report['processorFileSha256'], 'timestampResolution': report['timestampResolution'], 'elapsedSeconds': time.monotonic()-started,
            'technicalValidationOnly': 'Actual correctness requires listening. Supplied transcript is not independently verified.'}
        lines = ['# Local alignment listening review', '', 'Status: PROPOSED_UNREVIEWED. Timing and speech content UNVERIFIED; owner acceptance pending.',
            '', 'Original source: [source-original.mp3](source-original.mp3). Full decoded source: [decoded.wav](decoded.wav).',
            '', 'These are proposed midpoint cuts, not verified speech boundaries. Coverage starts at 0 and ends at container duration.',
            f'Timestamp repairs: {len(changes)}; zero-duration items: {sum(f["kind"] == "zero-duration-item" for f in assessment["flags"])}; prospective short cues: {sum(f["kind"] == "prospective-cue-under-four-frames" for f in assessment["flags"])}; gaps: {len(assessment["gaps"])}.',
            f'Raw timestamp classifier resolution: {report["timestampResolution"]["modelTimestampSegmentTimeMilliseconds"]} ms. Three-decimal display does not imply millisecond accuracy.', '']
        for n, clip in enumerate(clips, 1):
            lines += [f'## Boundary {n}: {clip["proposedCutSeconds"]:.6f} seconds',
                f'[Listen ±1.5 seconds]({clip["path"]}) · source {clip["sourceClipStartSeconds"]:.6f}–{clip["sourceClipEndSeconds"]:.6f}s · cut sample {clip["cutRelativeSample"]} in clip.',
                '', 'Left: '+clip['leftText'], '', 'Right: '+clip['rightText'], '', 'Listening verdict: UNVERIFIED', '']
        with (out/'review.md').open('x', encoding='utf-8') as target:
            target.write('\n'.join(lines)+'\n')
        write_json(out/'draft.json', draft)
        print(json.dumps({'status': 'PROPOSED_UNREVIEWED', 'out': str(out), 'renderable': False}))
        return 0
    except Exception as error:
        failure = {'schemaVersion': 'local-forced-alignment-failure/1.0', 'status': 'FAILED',
            'errorType': type(error).__name__, 'error': str(error), 'automaticRetries': 0,
            'elapsedSeconds': time.monotonic()-started}
        if created:
            write_json(out/'failure.json', failure)
        print(json.dumps(failure, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
