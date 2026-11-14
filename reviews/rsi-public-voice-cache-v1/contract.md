# RSI public voice cache v1 — acceptance contract

Baseline: a89acece8debb68aca0a211382b56b6af7dfd164. Date: 2026-11-14 (America/Los_Angeles). User: continue RSI. Scope: reduce avoidable model I/O on repeated public narration while retaining committed audio integrity, provenance, bounded failures and user approval. No paid API, target repository execution or formal project video. This is a bounded engineering improvement, not a new milestone or perceived-quality acceptance.

## Explicit behavior change

Replaying an exact successful public speech task checks its current small identity inputs and committed WAV/manifest, but does not prove current model readiness. Therefore a valid cached recording can be reused when model weights are absent or damaged. The configured profile and Python executable are still required for current identity lookup. Existing portable model-free replay remains separate. Doctor and every new synthesis still fully verify all locked model files. No persistent metadata-only hash cache or background worker is introduced.

## Required acceptance

C1. Existing task fingerprints and generation manifest versions remain unchanged. Exact text, language/preset, model lock, worker, requirements and Python identity determine reuse. Artifact hashes and manifest bindings remain mandatory; corruption must fail, not silently regenerate or succeed. TaskRunner remains cache receipt and ownership authority.
C2. Successful exact hits do not read model file bytes or invoke the synthesis worker. Every real miss and doctor call must hash the complete locked model inventory and reject missing, foreign, linked or same-size altered bytes. Cache results cannot be advertised as doctor readiness.
C3. Ordinary invalid-model misses fail before creating a new task or spending attempts; repairing model data makes retry possible. Unsafe or malformed existing state is not swallowed as a cache miss. A successful-hint-to-miss race must fail closed without starting a worker or consuming an attempt. Use the existing TaskRunner cache-only attempts bound and an unreachable-worker guard; never auto-fallback to unchecked synthesis.
C4. Cancellation, timeouts, cleanup and successful cache usage accounting remain enforced. No global mutable verification cache, shared long-lived process, implicit model download or voice fallback.
C5. Real existing public WAV reused in isolated copied state, baseline/candidate repeat timings recorded, identical task/artifact hashes and attempt count. Test with explicit unavailable model profile: exact hit succeeds, changed test-only text and doctor fail, no new speech record. Fresh short test-only synthesis on valid model succeeds and WAV fully decodes. No formal video required because renderer is unchanged.
C6. Focused deterministic tests cover changed identities, model tamper, bad cached artifacts, pre-aborted operation, missing/invalid state, hint race and usage receipts. Mocked subprocess tests identified. Preserve initial failures; no full regression inflation.
C7. Freeze exact candidate and evidence; architect independently reviews reliability/security/evidence, separate product Judge checks behavior, public user docs and actual audio metadata. Both must resolve blocker/major findings; preserve raw reports. Listening, naturalness, forced alignment and continuous AV remain UNVERIFIED.
C8. Save source/tests/docs/compact raw reports, push GitHub and verify remote. Update existing Google Drive handoff with history intact. No model, WAV, private profile, reference audio, database or handoff in Git.

## Roles

Sol implements the adapter/tests; separate Sol measures real baseline/candidate in owned scratch. Astra provides design and independently reviews frozen code and evidence without implementing it. Terra independently reviews user-facing semantics and evidence without reading another Judge's verdict first. Root integrates documentation, freezes candidates, fixes assigned documentation findings and delivers. Review scope is this module, not a repetition of completed M0–M4.

