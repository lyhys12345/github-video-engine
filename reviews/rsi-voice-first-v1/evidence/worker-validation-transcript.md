# Voice worker validation

Recorded from completed tool calls in the implementation agent's transcript. No raw console output was redirected to files during execution. This record preserves the result summaries and tool references. The later public adapter rerun repeats 19 of the original 54 JavaScript tests.

Working directory for every listed run: `D:/gve-flagship-publish`.

## Python regressions

The runner resolved `pythonPath` from `work/local-anna-profile.json` to `D:\gve-chen-pilot\venv\Scripts\python.exe`. Both commands ran against the actual D: source: `python.exe -B tests/qwen_public_voice_worker_test.py`, followed by `python.exe -B tests/windows_local_voice_worker_test.py` in the same process session. Tool session `25640`, final chunk `fb3d35`, exited 0.

```text
...
----------------------------------------------------------------------
Ran 3 tests in 1.641s

OK
.
----------------------------------------------------------------------
Ran 1 test in 7.625s

OK
```

The second suite's single unittest method exercises ten separately reported subtest cases. Total coverage is three public worker methods and ten local worker cases. The three public `.` markers establish that all three methods ran with no skips. The real supported-Windows x64 test requires CPython 3.12, starts a child with only `SystemRoot`, `WINDIR`, and `PATH`, asserts `PROCESSOR_ARCHITECTURE` is absent, then invokes the worker `main()` and verifies its failure is the intentional `read_runtime_lock` stub rejection.

## Focused JavaScript regressions and TypeScript

Command: `node node_modules/vitest/vitest.mjs run tests/qwen-public-adapter.test.ts tests/tts.test.ts tests/narration-voice-policy.test.ts tests/capabilities.test.ts`. Node `v24.22.1`. Tool session `6240`, final chunk `09207d`, exited 0.

```text
✓ tests/qwen-public-adapter.test.ts (19 tests) 16536ms
✓ tests/tts.test.ts (25 tests) 11027ms
✓ tests/capabilities.test.ts (7 tests) 5327ms
✓ tests/narration-voice-policy.test.ts (3 tests) 6ms

 Test Files  4 passed (4)
      Tests  54 passed (54)
   Start at  00:48:38
   Duration  38.02s (transform 1.16s, setup 0ms, collect 2.86s, tests 32.90s, environment 1ms, prepare 1.12s)
```

Command: `node node_modules/typescript/bin/tsc --noEmit`. Tool session `34557`, final chunk `407c8e`, exited 0 with no output.

## Public adapter and typecheck after the model stream change

Command: `node node_modules/vitest/vitest.mjs run tests/qwen-public-adapter.test.ts`. Tool session `82703`, final chunk `46d3f7`, exited 0.

```text
✓ tests/qwen-public-adapter.test.ts (19 tests) 15852ms

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  00:51:10
   Duration  17.59s (transform 716ms, setup 0ms, collect 1.22s, tests 15.85s, environment 0ms, prepare 247ms)
```

Command: `node node_modules/typescript/bin/tsc --noEmit`. Tool session `55463`, final chunk `b6e65c`, exited 0 with no output.

## Test catalog

Command: `node scripts/test-suite.mjs check`. Tool chunk `136780`, exited 0.

```json
{
  "status": "pass",
  "classified": 113,
  "groups": {
    "unit": 28,
    "integration": 61,
    "media": 11,
    "optional": 2,
    "node": 2,
    "node-media": 1,
    "provider": 2,
    "python": 6
  }
}
```
