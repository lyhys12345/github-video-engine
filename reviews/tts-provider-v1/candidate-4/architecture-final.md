# Independent architecture-final review

Verdict: **PASS for bounded engineering scope**. No unresolved major/blocker. Reviewer: tts_architect. Date: 2026-11-02.

Candidate: `candidate-4`; manifest SHA256 `128b35b24242d281de299843f2863c2b52f1a4aefe8b29e740fd0a49d1599e28`. Contract: frozen `reviews/tts-provider-v1/contract.md`. All 135 frozen files matched manifest hashes; all 135 files in the independent execution copy remained hash-identical after testing.

## Independent evidence

- `work/tts-architect/candidate4/manifest-check.json`: 135 files checked, zero mismatches.
- `work/tts-architect/candidate4/test-result.json`: independent actual execution of frozen TTS, voice-handoff and core suites, **46 passed / 0 failed**. All remote behavior uses injected fake transports; successful remote fixtures contain historical local MP3 bytes.
- `work/tts-architect/candidate4/independent-proof.json`: immutable-copy check and typecheck PASS (`node ../../../../node_modules/typescript/bin/tsc --noEmit`, exit 0).
- `work/tts-architect/repro-cancel-final.ts` and `candidate4/cancel-recheck.json`: independently authored original failure case now rejects promptly after abort, even when stream cancellation never settles; zero remote calls.

Execution used an independent source copy at `work/tts-architect/candidate4/source`, reusing installed dependencies through Node ancestor resolution and a loader-only shim in its own node_modules. No source/test/config fixture was changed. Local tests needed approved execution outside the sandbox because the sandbox denied the existing CAS hard-link operation; there was no network or credential escalation. No live secret was retrieved and no actual provider request occurred.

## Contract assessment

| Criteria | Result | Evidence and reasoning |
| --- | --- | --- |
| TTS-01 Offline safety | PASS | CLI/runtime review and actual dry-run/default-denial/import/cache tests. Explicit paid flag, bounded budget and entitlement attestation precede key retrieval/dispatch; no voice/model fallback. |
| TTS-02 Secrets/transport | PASS | Fixed HTTPS endpoint, redirect:error, bounded text/body/deadline and sanitized transport errors. Original cancellation cleanup defect is fixed and independently rechecked. Environment-only production credential path; no key in durable records. |
| TTS-03 Identity | PASS | Canonical input covers provider/adapter, exact text, explicit voice/model/settings and the single supported format; strict schemas reject unrecognized inputs. Tests establish invalidation and exclusion of label/budget/attestation noise. |
| TTS-04 Budget | PASS | SQLite BEGIN IMMEDIATE checks cumulative immutable reservations; concurrent requests cannot exceed the per-state estimate cap. Budget estimate is explicitly caller-supplied and actual billing remains null. |
| TTS-05 Uncertain outcomes | PASS | Reservation precedes dispatch; all postdispatch failures or interrupted reservations remain held across reopen. No automatic replay/reconciliation. Tests cover HTTP errors, timeout, abort, failed stream and absent terminal record. |
| TTS-06 Audio/receipts | PASS | ffprobe plus full ffmpeg decode, container/stream/duration bounds, CAS receipt binding and distinct local-import provenance. Actual local MP3 lifecycle executed successfully. |
| TTS-07 Cache | PASS | Receipt/CAS byte hashes and sizes verified on every hit, including credential-free repeat. Corrupt audio/receipt fails closed without another POST. |
| TTS-08 Handoff | PASS | Exact current shot narration check, immutable new export directory, measured technical handoff with caller-declared transcript and pending listening; changed narration rejected. |
| TTS-09 Evidence | PASS | Final freeze contains test helper and schemas; 46 tests plus typecheck independently pass on hash-identical copied source. Earlier failed candidate/report preserved. |

## Findings closed and limits retained

The original candidate-1 timeout defect and incomplete frozen test dependencies were reported independently in `work/tts-architect/candidate1-review.md`. Candidate-4 closes both: nonblocking cancellation cleanup rejects the original adversarial case, and the frozen helper/schema dependencies allow the complete suite to run.

The live Chen voice ID, available model, account/API entitlement, actual invoice charges and subjective audio quality remain **UNVERIFIED**. `confirmed-api-access` is a caller attestation, not automated provider verification. The budget is a local conservative-estimate guard, not an account-wide or provider-enforced cap. Imported or mocked audio does not establish new Chen synthesis. Owner listening/G6 remains pending; no historical acceptance is rewritten. No paid calls, key creation, voice cloning or deployment occurred.
