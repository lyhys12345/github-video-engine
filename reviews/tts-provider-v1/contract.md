# TTS provider v1 bounded engineering acceptance contract

Version: tts-provider-v1, 2026-11-02. This records the architecture matrix sent to the implementer before implementation; it does not amend historical M1-M4 acceptance or pending owner AV review.

Scope: explicit ElevenLabs adapter, local import, durable CAS/cache/accounting and exact-narration handoff; future local model comparison remains future work. No paid calls, credentials access/creation, voice cloning, deployment, or replacement of historical artifacts in this engineering validation. A mocked transport is evidence of adapter behavior, not ElevenLabs account access or voice quality.

## Mandatory criteria

TTS-01 Offline safety: dry-run/status/import/export do not retrieve a key or access network. Remote generation requires explicit paid authorization, a positive request estimate and cumulative local budget, an explicit voice ID/model, and affirmative API access attestation. No fallback to another voice or model.

TTS-02 Secrets and transport: keys come only from the runtime environment, never config/CLI arguments/receipts/logs. Production requests target fixed ElevenLabs HTTPS endpoints with redirects forbidden. Request text, response bytes and lifetime are bounded. Provider errors must not expose injected key-bearing response bodies or exception strings.

TTS-03 Identity and invalidation: canonical fingerprints include provider/adapter version, exact narration, voice/model, explicit settings, output format and every accepted output-affecting parameter. Changing any of these invalidates reuse. Display labels do not establish voice identity. Budget/approval changes do not authorize automatic duplicate POSTs.

TTS-04 Budget durability: reservation occurs durably before POST, with atomic cumulative accounting under concurrency. Reserved, unknown and successful request upper estimates consume the local cap; no negative/unsafe/overflow numbers. These are caller-attested conservative estimates, including applicable voice/model rates, not invoices or guaranteed provider-side caps. Actual charge stays unknown absent actual billing evidence. State-directory scope is documented.

TTS-05 Uncertain outcome: at most one POST per canonical request within retained state. Timeout, disconnect, abort, server error, invalid audio, crash or persistence failure after dispatch do not silently refund or replay. Unknown/in-flight state remains held across restart and blocks automatic retry. No claim of provider-side idempotency. Imported audio does not silently reconcile an unknown paid request.

TTS-06 Audio and receipts: success requires bounded nonempty, decodable audio-only content with finite positive measured duration. CAS is immutable. Persistent receipt binds input fingerprint, audio hash/bytes/media type/duration, provider/model/voice, provenance and provider request ID if available. Local import provenance remains distinct from remote synthesis. Caller-declared transcripts are not speech verification.

TTS-07 Cache integrity: subsequent processes can reuse a completed request without provider work. Every hit verifies durable receipt and content hash/size. Missing or corrupt CAS/receipt fails closed without regeneration or overwriting history.

TTS-08 Handoff: exported binding must match the current exact story/shot narration and receipt. Changed narration cannot reuse old speech. Measured timing never implies listening approval; do not stretch or truncate automatically. Owner perceptual review remains pending.

TTS-09 Evidence: freeze candidate hashes, independently rerun local/mock tests and typecheck. Cover budget and duplicate concurrency, restart cache/unknown, tamper rejection, secret redaction, response bounds/timeouts/redirect refusal and fingerprint invalidation. Preserve raw evidence and review findings. Live Chen API entitlement, available model/voice identity and subjective quality remain UNVERIFIED until separately observed; simulated results cannot close them.

## Official references inspected 2026-11-02

- https://elevenlabs.io/docs/api-reference/text-to-speech/convert — explicit voice ID/model/settings/output; language_code unsupported by multilingual_v2; zero retention enterprise-only.
- https://elevenlabs.io/docs/api-reference/models/list — TTS capability and current per-request limits/rate metadata.
- https://elevenlabs.io/docs/api-reference/voices/get and https://elevenlabs.io/docs/api-reference/voices/search — available identity/metadata must be checked rather than inferred from a name.
- https://elevenlabs.io/docs/eleven-creative/voices/voice-library — Voice Library voices are unavailable via API on free tier; actual Chen account entitlement has not been checked.

All mandatory engineering criteria must pass with no unresolved major/blocker. Excluded live-service and perceptual claims remain explicitly unverified and are not counted as engineering failure or fabricated PASS.
