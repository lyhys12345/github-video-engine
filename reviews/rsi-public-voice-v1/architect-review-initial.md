# Independent architect review: initial candidate v1

Reviewer role: reliability / security / evidence. Date: 2026-11-13 local (2026-11-14 UTC). This reviewer authored architecture only, not candidate implementation. Candidate: `candidate-v1.json`, baseline `3e47abc547b307850f6577cc6939edb79987ac65`. Independently computed SHA256 and byte counts for all 35 frozen files: 35 matched, zero mismatches, before the announced worker repair. No shared candidate/test edits made. This report is preserved as initial review and must not be overwritten by a later PASS.

## Initial decision: NEEDS REPAIR / INCOMPLETE EVIDENCE

F1 — MAJOR, V2/V3/V6: candidate v1 worker denies every `socket.*` audit event before calling `platform.machine()`. On Windows, platform discovery can call `socket.gethostname`; this is not remote TTS dispatch, yet the candidate denies it. Source: `scripts/qwen-public-voice.py`, deny_network and initial platform check. Root independently reported an actual probe failure matching this source defect; raw failure path was identified as the public setup `probe-and-samples` evidence directory but has not yet been inspected by this reviewer. Required repair: narrowly block actual socket/network operations while allowing harmless local host discovery, add a regression reproducing the worker's startup/import path and denied connection attempt, then re-run real doctor and both languages. Do not mark this finding resolved merely because the code changed; review the next frozen candidate and raw outputs.

F2 — MAJOR, V6: the frozen suite does not exercise the new public adapter's important failure paths. `tests/tts.test.ts` has public input/receipt checks, but its timeout/abort/transport error tests exercise the remote mocked provider. `tests/public-voice-workflow.media.test.ts` exercises a real happy path, approval, portability and edited speech when enabled; it does not inject public worker timeouts, malformed output, invalid model/runtime or cancellation. New TS adapter owns separate prepare(), hashFile(), runWorker() and owned-temporary cleanup logic. Required repair: targeted deterministic tests for public-adapter missing/tampered model/config, invalid profile, worker error/timeout/cancel, no successful publication on failure, owned temporary cleanup and cache reuse/identity separation. Mocks with tiny model fixtures are acceptable if explicitly labeled. No gigabyte installation is needed.

## Source observations

- Public model revision and the two weight hashes agree with independently retrieved official Qwen metadata in architecture.md. Full committed inventory contains 11 runtime data files; setup uses immutable URLs, bounded downloads, allowlisted HTTPS redirects and SHA256 before publication.
- Public profile schema contains only Python/model paths. Worker calls CustomVoice, never clone/reference audio. Separate local worker loading, explicit presets and language routing are present. Legacy default remains Anna; English allowance is limited to the public provider.
- TS adapter fingerprints text, language, speaker, revision and hashes of model lock, dependency lock, Python executable and worker. Runtime checks installed distribution versions. This is compatible with the documented trusted-local-runtime boundary, not an OS sandbox or cryptographic proof of every installed module byte.
- Worker enforces finite mono output, duration bound, resampling to 16 kHz PCM, nonzero samples and bounded metadata. Receipt import revalidates exact generation parent and WAV identity. The 48 kHz compositor checks exact generated sample count.
- Public replay only uses a selected imported narrated preview with identical approval, pinned source, language, transcript and public receipt parent. Changed approvals return to normal generation, with engine cache potentially reusing unchanged recordings. This source review found no approval bypass or hidden fallback in these paths.
- Dependency setup explicitly permits one hash-verified python-sox source-build exception with pinned bootstrap and deterministic wheel output. Main install remains hash-locked/binary-only. Documentation discloses this exception and lack of SoX executable rather than claiming all upstream dependencies are wheels.
- Current worker has a fixed 384-token generation ceiling. Nonzero valid WAV does not prove completion of the whole declared text. Naturalness, pronunciation, exact speech content and continuous listening remain unverified; receipts correctly retain those limits.

## Evidence inspected directly

Read all new production Python scripts, public TS adapter, public replay, policy/brief/narration call sites, diffs in shared TaskRunner/TTS import/compositor, setup documentation and both requirements headers. Read targeted TS/Python test sources and raw `work/rsi-public-voice-focused.log`: typecheck has no diagnostic output, 9 suites / 74 tests pass, catalog reports 110 classified. These unit/integration results are not proof of real synthesis. The opt-in real-media test was inspected but no successful execution artifact was yet available to this reviewer.

## Contract status at this point

V1: source design consistent; actual reproducible setup evidence still to inspect.
V2: UNVERIFIED; actual v1 startup defect reported, both language outputs pending.
V3: source consistent except F1; final probe/generation validation pending.
V4: source gates/test intent consistent; actual synthetic approval/revision run pending.
V5: UNVERIFIED; actual render, export/import, model-free replay, edited audio evidence pending.
V6: FAIL pending F1/F2 repair and recheck.
V7: initial candidate hashes verified; future repair needs new frozen manifest and preserved reports.
V8: bounded setup/limits accurately described in inspected docs, except verification claims need final actual evidence.
V9: delivery not attempted/reviewed; root retains responsibility.

Full continuous listening, voice naturalness and final owner acceptance: UNVERIFIED, independent of engineering checks. Formal HTTPX script approval remains pending; no authority for formal project media is inferred.
