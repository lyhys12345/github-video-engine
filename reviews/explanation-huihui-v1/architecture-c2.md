# Independent c2 architecture / evidence / content-facts recheck

Candidate SHA-256: `cda440feac3e46dfc2651be598f95c215fda9fe09f674a0cee3979d1fb83d0fa`.

Verdict: **PASS_BOUNDED** for this role's affected engineering scope. The c1 F1 major initialization-recovery finding is **fixed in the independently exercised cases**. No new blocker/major found. Owner listening, speech transcription/alignment and continuous perceptual audiovisual acceptance remain **UNVERIFIED / pending**.

## Identity and scope

Independently verified all 715 manifest files and 631 extracted source files. Compared source bytes against my verified c1 extraction: the actual 15 changed/new paths exactly match `changedFromC1` (13 edits, two new locale modules; the other 616 files match). c1's Git-base comparison to `c877431c22a00e3662bcfe94ba74552662502563` is reused, not described as a new Git-tree execution. Source zip SHA-256: `00107966a7b841a011f975e6079e4ff992f914f19dae0696351341e864513865`.

I read the changed source, contracts and OPERATOR. No other judge report or builder verification script was read/run as proof. OPERATOR's claims were treated as assertions to verify. All test scripts, copies, fault injection and publications are under this judge directory. No candidate edit, paid call, target repository execution, new synthesis, new movie render, remote fetch, deployment or reference-audio loading.

## F1 recovery recheck — actual independent processes

`bootstrap.mts` and `bootstrap-worker.mts` are independently authored judge scripts using retained authentic Fastify generation audio and fresh copied state. `bootstrap.json` / `.log` record seven passing cases:

1. Exact c1 reproduction: zero-byte `tts.sqlite`; read-only status reports `TTS_STATE`; import succeeds and an identical second import returns the same cached receipt.
2. A real worker process exits immediately after first opening the actual zero-byte SQLite file (exit 76). A separate ordinary worker process imports successfully, then a third returns the cached receipt. One request and one outcome remain.
3. A real worker writes schema/request/outcome and exits immediately before COMMIT (exit 77). At the injection point the database is 24,576 bytes and a rollback journal exists. A separate ordinary worker recovers it and commits a single success; repeat is cached with the same receipt.
4. A first real worker pauses after opening an actual zero-byte file. A second real process completes import; releasing the first yields a cache hit with the exact same winner receipt. One request/outcome pair remains.
5–7. Unrelated table, partial schema and corrupt-file fixtures fail closed and retain their original database bytes.

The implementation opens a writer for the Huihui v2 path, permits SQLite journal recovery, distinguishes no user schema objects from unrelated/partial schemas, and puts initial schema creation plus zero-fee request/outcome in the same transaction after CAS publication. Historical paid/generic reservations and v1/v2 held rows are not rewritten or auto-replayed. This is atomic database success registration with possible unreferenced CAS on failure, not a cross-filesystem/database transaction or power-loss durability proof.

54 focused tests independently passed in extracted source: TTS 24, URL/session 7, concurrency queue 23. Their executed fault cases additionally cover CAS abort, insertion rollback, same-process contention, old held behavior and the 16,001-sample technical WAV decoding to 48,003 samples. These test signals are not spoken recordings or an owner listening judgment. The c1 judge's independent CAS/rollback/held tests are reused where the relevant later commit/read semantics remain the same; the new earlier initialization window was freshly exercised above.

Two initial runs of the new subprocess harness failed before the intended child import because Windows requires a file URL or relative ESM import specifier for the tsx loader. The corrected harness uses a relative loader path and completely fresh state names. Initial logs are preserved as `bootstrap-initial.*` and `bootstrap-loader-failure.*`; they are judge harness failures, not concealed candidate failures.

## Versioned locale identity and preserved history

The new visual choice is the explicit `presentation-ui-zh-cn/1` profile. It enters new narrated-session input, child preview identity and manifests; reader branches leave absent historical fields absent. New starts use author packet 1.2, while historical 1.1 packets regenerate with their original content.

Fresh independent receipt exports using c2 readers matched every c1 payload byte:

| Case | Old narrated payload files | Old author-packet files |
|---|---:|---:|
| Fastify | 53 | 14 |
| p-queue | 63 | 12 |

The preserved c1 narrated IDs are `93a9d9bc88b48e5fd763851bc5f40aa898a8b95b27cae9f667516e1e9d252f48` and `4e04b502b750fece31e45d27ec129ad762a9f0f83dbead9e44dd854c4fdd7c8b`. New c2 session IDs are `24167a7868f70330a859f9a1c4b29a168b294506d64ca9f97497d8a99b3c223b` and `26213d8370ae1d8fc778fc2a5c9d57f1777cd9730f2176c07455563537b8eaf1`.

The retained same-plan p-queue comparison has different localized/legacy preview IDs (`9f70f587470a386ffdf729d3d7e2e81b7b9b5bb5b683988333a4050d412fec57` versus `80ec808ea60444565b818c64ffbda472f3410123b1a4b13eead790a49b48ed8f`) with byte-identical authored plan, proposal, trace, PCM and VTT. I independently full-decoded that third legacy-selection video. I did not generate the comparison movie myself.

`locale-boundary.mts` validates actual stored localized inputs before rejecting an unknown profile, verifies absent-profile parsing produces different canonical input, and compares all 505 queue-frame model states against c1. All states and default English title behavior match. Localized final heading still uses the interim heading before frame 371; only at/after the last animation's completion is the authored all-ended heading shown. Locale changes do not replace task/entity IDs, alter reducers or invent measured execution.

Historical silent/unsupported and earlier Huihui v1-success artifacts were not newly exported this round. Their unaffected earlier evidence is reused only as such; old c1 narrated success and packets above were freshly re-exported. All 42 original task records and six TTS request/outcome rows in the private c2 state were unchanged after the re-run of the closure/negative suite.

## Source, text, audio and factual changes

Both c2 proposals preserve all c1 claims/citations and exact narration text. The captured README bytes and pinned commits are the same:

- Fastify `8c0f699144187dab3b600a626829c31368762256`: three exact citations supporting port 3000, GET root route and the `{hello: 'world'}` handler response example.
- p-queue `7f272ab5ff2254c0dc2537b7977e88ede1cd55e8`: seven exact citations supporting concurrency one, queued async functions, completion-linked promises and idle requiring no queued/running tasks.

The claims were rechecked against the frozen source lines; no new GitHub acquisition was performed. The c1 semantic assessment is reused for unchanged claims. p-queue concurrency remains simultaneous in-flight work, not a per-second rate. Timing, task order depiction and successful outcomes remain illustrative assumptions. HTTP payload display remains a field/value illustration, with wire serialization outside scope.

The author changed beat purposes and ordinary entity/task labels to Chinese. Fixed dictionary strings describe local narration, process illustration and no target execution; queue labels translate waiting/running/fulfilled/rejected without declaring observed success. Source-bound code and names remain literal: GET /, Fastify, port 3000 and `hello: world` are not translated into other data. This is caller-authored text plus a fixed UI dictionary, not automatic translation or semantic narration generation. A Han-character check is only a script/display constraint; it does not certify good Chinese or factual entailment.

For each real project, the following c1→c2 files were independently compared byte-for-byte and match: all three original WAVs, generation manifests and import receipts; full mixed PCM; VTT. Extracted AAC access-unit streams also match exactly. Event trace arrays and timeline values match. Full trace documents contain revised labels/proposal bindings, so no claim is made that the entire c1→c2 trace document is byte-identical.

## Fresh media, timing and negative tests

The adapted independent c1 checks were rerun on both c2 localized bundles. Every original WAV was decoded again, complete PCM mixes rebuilt byte-for-byte, both videos fully decoded and all video PTS enumerated at frame/24. Both retain natural sample duration and placement:

| Case | Frames | Seconds | Reference PCM samples | Decoded AAC samples | Aligned PCM/AAC SNR |
|---|---:|---:|---:|---:|---:|
| Fastify | 437 | 18.208333 | 874000 | 874496 | 44.31 dB |
| p-queue | 505 | 21.041667 | 1010000 | 1010688 | 41.89 dB |

AAC remains lossy with bounded codec padding. SNR and exact extracted AAC equality demonstrate retained encoding/data, not speech intelligibility or transcription. All seven VTT cues were independently rebuilt from codepoint/sample declarations and rounding; no word-boundary alignment was inferred. No new 300-second movie was made.

All 22 source/closure/input negative cases were rerun and refused: wrong preparation manifest, proposal, commit, offset order/count, one-frame overflow, duration limit, altered quote, silent downgrade and original WAV/receipt corruption, for both projects. Original private CAS bytes were restored and valid status passed afterward.

Locale negatives separately reject excessive title width, control characters, missing Han display prose and unsupported emoji glyphs for both modules; queue task and column widths are also rejected. Actual stored input schemas reject unknown locale profiles. Raw results are in `checks.json`, `captions.json`, `compatibility.json`, `locale-boundary.json` and their logs.

## Font and visual boundary

Noto Sans SC font bytes are unchanged and pinned at SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`. The existing accompanying OFL 1.1 license file remains unchanged. Glyph availability and deterministic slot-width checks run before render; browser font loading and width measurement remain explicit. This is not universal Unicode coverage or automatic word understanding. Source, font, locale dictionary/geometry changes in future must be treated as a new reviewed profile/implementation; a future translation edit must not silently reuse the old render contract.

Four PNGs were independently extracted from actual c2 MP4s; Fastify frame 171 and p-queue frames 44/212 were visually inspected. They show Chinese title/entity/state labels and the visible Chinese no-execution notice; p-queue cards use larger label/state text while retaining the same state/slot positions. This is limited factual/key-frame observation, not a full product readability, physical-phone or continuous audiovisual pass.

## Role conclusions

- Architecture and affected recovery: **PASS_BOUNDED**, c1 F1 closed by direct recheck.
- Evidence/provenance: **PASS_BOUNDED**, exact source/text/generation/import/audio/plan/preview chain verified for both retained real examples, history retained.
- Content facts: **PASS_BOUNDED**, unchanged supported mechanisms and explicit illustrative assumptions; no arbitrary-project automatic semantic support claimed.
- Owner listening, speech-content transcription, spoken alignment, full subjective audiovisual experience and final acceptance: **UNVERIFIED / pending**.

Scope is impact-based c1→c2 review. It does not claim newly repeating every earlier project, historical contract, live synthesis cancellation, full fresh rendering or external-source acquisition.
