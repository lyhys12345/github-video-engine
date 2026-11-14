# Independent scoped speech module review

Reviewer: /root (architecture/integration), 2026-11-13.
Verdict: PASS for bounded local diagnostics and unreviewed timing proposals.

Reviewed the request/approval binding, full WAV decode and silence measurement, Windows recognizer adapter, ordered transcript comparison and caption-draft guards. The implementation checks exact audio/transcript/approval inputs, preserves approved words and original recordings, identifies missing/unmatched or low-confidence evidence, and marks every output as proposed/unreviewed. A caption draft requires the original request, exact saved report hash and matching source-audio clock. It is not directly renderable.

Independently executed `pnpm exec vitest run tests/speech-alignment.test.ts`: 6/6 passed, with actual FFmpeg in the test environment. Code and tests cover imported timing, malformed/range bindings, measured silence and caption proposals. No observed blocker within this scope.

The implementer's real installed Windows recognizer run on an existing approved ArtCraft line produced a 3.12-second report with an internal 0.2185-second low-level interval. Its proposed phrase timing had very low confidence and another phrase had no usable timing. I inspected the saved report and code; I did not listen to the recording. This demonstrates local execution and honest uncertainty, not accurate forced alignment or natural speech quality.

No new production voice/video, paid API, target repository execution, full audio/visual review or cross-platform host certification. Imported timing provenance is caller-declared; local file hashes do not authenticate the speaker or a reviewer's attention. Stronger optional recognizers can later implement the existing imported-timing contract without loosening these guards.

