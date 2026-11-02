# Bounded TTS provider integration v1

This feature creates or imports one narration clip. It does not render a film, approve a voice, transcribe speech, or replace historical recordings/reviews. Owner listening and G6 remain pending. The current Chen voice API ID, model ID and account entitlement are **UNVERIFIED**; a display label or historic filename never selects an API voice.

`TtsProvider` is a small provider interface. `ElevenLabsProvider` implements the official HTTP convert endpoint using native fetch. `local-import` independently captures existing audio. All network tests inject an explicitly fake transport; successful fake HTTP responses contain historic local MP3 fixture bytes. They are engineering simulations, not verified ElevenLabs generation.

## Offline operations

```
pnpm gve tts dry-run --spec examples/tts-provider-v1/elevenlabs.example.json
pnpm gve tts import --spec import.json --audio existing.mp3 --data work/tts-state
pnpm gve tts status --task <fingerprint> --data work/tts-state
pnpm gve tts export --task <fingerprint> --data work/tts-state --out work/new-voice-export --story current-story.json --shot <shot-id>
```

Dry-run validates exact inputs without reading credentials, opening state, or making requests. Status/export/import never fetch credentials or use network. Import config is `{schemaVersion:"1.0",provider:"local-import",text:"exact caller-declared narration",voiceLabel:"source identity / pending listening",sourceSha256:"64 lowercase hex characters",mediaType:"audio/mpeg"}` (valid JSON requires quoted field names). WAV and FLAC are also accepted. The byte hash and measured container must match. Import provenance stays `local-import`; importing cannot reconcile a held remote request or claim API generation.

Export requires an exact current story shot narration match. It writes a new directory containing original audio bytes, receipt, voice bindings and the existing technical voice handoff. It rejects existing output directories. The handoff records duration/fit, partial coverage, caller-declared transcript and pending listening; it never trims or stretches audio. An interrupted export may leave a partial directory for inspection; retry uses a new output directory and does not generate audio.

## Remote generation boundary

`generate --spec <json> --data <state> --allow-paid --budget-micros <positive-integer>` is an explicit remote opt-in. Development did not run this against the real provider. Never run it merely to test the adapter. Set `ELEVENLABS_API_KEY` in the calling environment only after separately authorizing spend and confirming exact voice/model entitlement. There is no key CLI flag, stored key, account/key creation, cloning, automatic voice search, implicit fallback, or automatic retry.

The sample config is deliberately blocked by `entitlement:"unverified"`. Replace the placeholder with a confirmed exact voice ID and pin the account-supported model/settings. Set `confirmed-api-access` only after checking account access, model TTS support and applicable voice/model pricing. This value is a caller attestation, not a provider verification performed by this implementation. Library voices cannot be used via API on the free tier according to the linked official guide. The adapter does not claim zero retention or set enterprise-only zero retention options.

`estimatedMaxChargeMicros` is a caller-attested conservative per-request estimate in micro-USD (including model and voice rate), **not a measured invoice or guaranteed provider price cap**. `--budget-micros` sets an immutable cap for one state directory. SQLite `BEGIN IMMEDIATE` serializes reservation checks across workers. The sum includes all successful, failed, unknown and in-flight reservations permanently. It is a local estimate guard, not an account-wide/provider-enforced quota; creating another state directory creates another guard. The implementation does not know actual invoices, credit balances, free allocations, or account rate changes. Actual provider charge remains `null`.

Before POST, an immutable reservation binds the fingerprint and upper estimate. Every dispatch is at most once per fingerprint in that state directory. Any timeout, HTTP failure, interrupted stream, invalid audio, cancellation, crash or persistence failure retains its reservation; later attempts fail closed. Inspect the provider's usage manually. This release intentionally has no replay/reconciliation command and assumes no undocumented provider idempotency.

## Integrity and limits

Canonical identity contains provider/adapter version, exact unnormalized narration, exact voice/model, every configured voice setting and output format; local imports also bind source hash/type. Labels/entitlement assertions/budget changes do not trigger another remote generation. A successful cache hit verifies receipt and audio CAS bytes/hash/size on each read and never retrieves a key or dispatches. Corruption fails closed. Receipt and reservation live outside the existing TaskRunner automatic retry/local-zero usage accounting; no historic usage schema or frozen candidate is rewritten.

The fixed origin is `https://api.elevenlabs.io`, redirect mode is `error`, timeout 60 seconds, response limit 25 MB, narration limit 5,000 UTF-16 code units, audio duration `(0,600]` seconds. Only `mp3_44100_128` is currently supported remotely. The response must be audio/mpeg; ffprobe requires one audio-only stream with matching container and ffmpeg decodes every packet before CAS commit. These checks do not establish speech identity, transcript accuracy, or subjective quality. No private response/error bodies or transport exception text enter receipts. Available sanitized request IDs are recorded.

## Official references checked 2026-11-02

- [Create speech: endpoint, explicit voice/model/settings, output format and determinism limitations](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [List voices: IDs, filtering and pagination](https://elevenlabs.io/docs/api-reference/voices/search)
- [Voice Library: API access and subscription restriction](https://elevenlabs.io/docs/eleven-creative/voices/voice-library)

Verification: `pnpm typecheck`; `pnpm exec vitest run tests/tts.test.ts tests/voice-handoff.test.ts tests/core.test.ts`. No real provider request/entitlement verification or owner listening is claimed.
