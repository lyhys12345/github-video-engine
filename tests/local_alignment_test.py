"""Offline unit checks; fake spans do not establish actual alignment accuracy."""
import argparse
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/propose-local-alignment.py'
spec = importlib.util.spec_from_file_location('alignment', SCRIPT)
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)


class LedgerTests(unittest.TestCase):
    def test_exact_latin_punctuation_numbers_offsets(self):
        text = "中 REA index.js 12.50 don't rembg。"
        ledger = a.token_ledger(text)
        self.assertEqual([t['text'] for t in ledger['tokens']], ['中', 'REA', 'index', 'js', '12', '50', "don't", 'rembg'])
        self.assertEqual(''.join(s['text'] for s in ledger['discardedSeparators']), '  . .  。')
        for token in ledger['tokens'] + ledger['discardedSeparators']:
            self.assertEqual(text[token['codepointStart']:token['codepointEnd']], token['text'])
            self.assertEqual(text.encode()[token['utf8Start']:token['utf8End']].decode(), token['text'])
        self.assertEqual(a.token_ledger('ＲＥＡ １２')['tokens'][0]['text'], 'ＲＥＡ')

    def test_reject_combining_mark_symbol_and_control(self):
        for text in ('e\u0301', '中😀', 'a\x00b'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                a.token_ledger(text)

    def test_reject_phase_boundary_inside_word(self):
        with self.assertRaisesRegex(ValueError, 'inside'):
            a.phase_mapping([{'captionText': 'rem'}, {'captionText': 'bg中'}], a.token_ledger('rembg中'))

    def test_phase_offsets_and_raw_hashes(self):
        phases = [{'captionText': '中，'}, {'captionText': 'REA。'}]
        mapped = a.phase_mapping(phases, a.token_ledger('中，REA。'))
        self.assertEqual([p['firstToken'] for p in mapped], [0, 1])
        self.assertEqual(mapped[0]['captionTextSha256'], a.text_hash('中，'))
        self.assertEqual(mapped[1]['codepointStart'], 2)


class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.ledger = a.token_ledger('甲乙')
        self.phases = a.phase_mapping([{'captionText': '甲'}, {'captionText': '乙'}], self.ledger)
        self.items = [{'text': '甲', 'startSeconds': .1, 'endSeconds': .8},
                      {'text': '乙', 'startSeconds': 1.2, 'endSeconds': 1.8}]

    def assess(self, items):
        return a.assess_items(items, self.ledger, self.phases, 2, 2)

    def test_midpoint_gap_anchors_preserved(self):
        result = self.assess(self.items)
        self.assertEqual(result['errors'], [])
        self.assertEqual(result['boundariesSeconds'], [0, 1, 2])
        self.assertEqual(result['cuts'][0]['leftEndSeconds'], .8)
        self.assertEqual(result['cuts'][0]['rightStartSeconds'], 1.2)
        self.assertAlmostEqual(result['gaps'][0]['durationSeconds'], .4)

    def test_order_not_bag(self):
        result = self.assess([dict(self.items[0], text='乙'), dict(self.items[1], text='甲')])
        self.assertTrue(result['errors'])

    def test_invalid_nan_negative_reversed_range_overlap(self):
        for replacement in ({'startSeconds': float('nan')}, {'startSeconds': -.1},
                            {'startSeconds': .9}, {'endSeconds': 2.1}):
            with self.subTest(replacement=replacement):
                result = self.assess([dict(self.items[0], **replacement), self.items[1]])
                self.assertTrue(result['errors'])
                self.assertIsNone(result['cuts'][0]['cutSeconds'])
        result = self.assess([self.items[0], dict(self.items[1], startSeconds=.7)])
        self.assertIn('overlap at item 1', result['errors'])
        self.assertIsNone(result['cuts'][0]['cutSeconds'])

    def test_zero_duration_is_flagged_not_fabricated(self):
        result = self.assess([dict(self.items[0], endSeconds=.1), self.items[1]])
        self.assertEqual(result['errors'], [])
        self.assertEqual(result['flags'][0]['kind'], 'zero-duration-item')
        self.assertEqual(result['cuts'][0]['leftEndSeconds'], .1)

    def test_prospective_four_frame_threshold_flags_without_moving_cut(self):
        for cut, expected_frames, flagged in ((.1, 3, True), (.11665, 3, True), (.11667, 4, False)):
            with self.subTest(cut=cut):
                items = [dict(self.items[0], startSeconds=0, endSeconds=cut),
                         dict(self.items[1], startSeconds=cut)]
                result = self.assess(items)
                self.assertEqual(result['errors'], [])
                self.assertEqual(result['boundariesSeconds'][1], cut)
                self.assertEqual(result['prospectiveCueFramesAt30Fps'][0]['durationFrames'], expected_frames)
                self.assertEqual(any(f['kind'] == 'prospective-cue-under-four-frames' for f in result['flags']), flagged)

    def test_empty_items_fail_with_null_cut(self):
        result = self.assess([])
        self.assertTrue(result['errors'])
        self.assertIsNone(result['cuts'][0]['cutSeconds'])

    def test_repair_annotation(self):
        self.assertEqual(a.repair_annotation([100, 80, 200, 300], [100, 100, 200, 300]),
                         [{'index': 1, 'rawMilliseconds': 80, 'repairedMilliseconds': 100, 'deltaMilliseconds': 20}])
        with self.assertRaises(ValueError):
            a.repair_annotation([float('nan')], [0])

    def test_recorder_captures_before_and_after_upstream(self):
        class Vector:
            def tolist(self):
                return [100, 80]
        class Base:
            def parse_timestamp(self, words, vector):
                return self.fix_timestamp(vector)
            def fix_timestamp(self, vector):
                return [100, 100]
        processor = a.recorder_type(Base)()
        self.assertEqual(processor.parse_timestamp(['甲'], Vector()), [100, 100])
        observation = processor.observations[0]
        self.assertEqual(observation['rawTimestampMilliseconds'], [100, 80])
        self.assertEqual(observation['repairedTimestampMilliseconds'], [100, 100])
        self.assertEqual(observation['changes'][0]['deltaMilliseconds'], 20)


class ModelLayoutTests(unittest.TestCase):
    # Fake locked bytes exercise validation only; this is not a real model load.
    def fixture(self, root, omitted=()):
        names = ('README.md', 'chat_template.json', 'config.json', 'generation_config.json',
                 'merges.txt', 'model.safetensors', 'model.safetensors.index.json',
                 'preprocessor_config.json', 'tokenizer_config.json', 'vocab.json')
        records = []
        for name in names:
            if name in omitted:
                continue
            path = root/name
            path.write_bytes(b'{}' if path.suffix == '.json' else b'fake-data-only-test')
            records.append({'path': name, 'bytes': path.stat().st_size, 'sha256': a.sha256(path)})
        return {'repository': a.REPOSITORY, 'revision': a.REVISION, 'downloadOnly': True,
                'remoteCodeDownloaded': False, 'files': records}

    def test_pinned_ten_file_layout_without_tokenizer_json_accepted(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp') as temporary:
            root = Path(temporary)
            lock = self.fixture(root)
            self.assertFalse((root/'tokenizer.json').exists())
            self.assertEqual(len(lock['files']), 10)
            a.validate_model(root, lock)

    def test_missing_vocab_or_merges_rejected_even_with_matching_file_set(self):
        for name in ('vocab.json', 'merges.txt'):
            with self.subTest(name=name), tempfile.TemporaryDirectory(dir='/private/tmp') as temporary:
                root = Path(temporary)
                lock = self.fixture(root, omitted=(name,))
                with self.assertRaisesRegex(ValueError, 'model config/tokenizer/weights missing'):
                    a.validate_model(root, lock)


class CliTests(unittest.TestCase):
    def args(self, root):
        return ['--model', str(root/'model'), '--model-lock', str(root/'model-lock.json'),
                '--runtime-lock', str(root/'runtime-lock.json'), '--receipt', str(a.CANONICAL_RECEIPT),
                '--audio', str(root/'rea.mp3'), '--plan', str(root/'plan.json'),
                '--recording', 'rea', '--out', str(root/'out'), '--check']

    def test_existing_output_preserved_without_preflight(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp') as temporary:
            root = Path(temporary)
            (root/'out').mkdir()
            (root/'out'/'marker').write_text('keep')
            with patch.object(a, 'preflight', side_effect=AssertionError('must not preflight')), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(a.main(self.args(root)), 1)
            self.assertEqual([p.name for p in (root/'out').iterdir()], ['marker'])

    def test_missing_model_retains_failure_and_never_runs(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp') as temporary:
            root = Path(temporary)
            with patch.object(a.h, 'run_process', side_effect=AssertionError('must not run')), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(a.main(self.args(root)), 1)
            failure = json.loads((root/'out'/'failure.json').read_text())
            self.assertIn('missing local directory', failure['error'])
            self.assertFalse((root/'out'/'draft.json').exists())

    def test_source_hash_rejected_before_model_runtime_or_process(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp') as temporary:
            root = Path(temporary)
            (root/'model').mkdir()
            for name in ('model-lock.json', 'runtime-lock.json', 'plan.json'):
                (root/name).write_text('{}')
            (root/'rea.mp3').write_bytes(b'wrong')
            with patch.object(a, 'validate_model', side_effect=AssertionError('must not load model')), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(a.main(self.args(root)), 1)
            self.assertIn('canonical audio size/hash mismatch', json.loads((root/'out'/'failure.json').read_text())['error'])

    def test_worker_guard_audit_preflight_order(self):
        events = []
        with patch.object(a.h, 'require_current_process_network_denial', side_effect=lambda: events.append('guard')), \
             patch.object(a.h, 'install_network_audit', side_effect=lambda: events.append('audit')), \
             patch.object(a, 'preflight', side_effect=lambda args: (events.append('preflight'), (_ for _ in ()).throw(ValueError('stop')))[1]):
            with self.assertRaises(ValueError):
                a.worker(argparse.Namespace())
        self.assertEqual(events, ['guard', 'audit', 'preflight'])

    def test_audition_pcm_slice_exact(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp') as temporary:
            root = Path(temporary)
            data = bytes(range(256))*500
            import wave
            with wave.open(str(root/'decoded.wav'), 'wb') as target:
                target.setnchannels(1); target.setsampwidth(2); target.setframerate(a.RATE); target.writeframes(data)
            clips = a.make_auditions(root, {'cuts': [{'cutSeconds': 2, 'afterPhase': 0}]},
                                     [{'text': '甲'}, {'text': '乙'}], {'frames': len(data)//2})
            clip = clips[0]
            self.assertEqual(clip['cutRelativeSample'], 24000)
            with wave.open(str(root/clip['path']), 'rb') as source:
                actual = source.readframes(source.getnframes())
            self.assertEqual(actual, data[clip['sourceClipStartFrame']*2:clip['sourceClipEndFrame']*2])


if __name__ == '__main__':
    unittest.main()
