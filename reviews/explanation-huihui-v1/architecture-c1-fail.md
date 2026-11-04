# Independent architecture / evidence / content-facts review

Candidate: `d3003aa01c9e25a0aad6feaff17869e740ac1b3b2f9dc4de16d920b34da1a243`.

Verdict: **CHANGES_REQUIRED**. One reproducible major recovery defect remains. The source/voice/plan closure and the two retained media examples passed the checks described below. This is not an owner listening or audiovisual acceptance.

## F1 — Major: interrupted creation of the TTS database blocks new Huihui import permanently

Locations: `src/tts/runtime.ts`, `openState` and the initial existing-database lookup in `importHuihuiTts`.

Creating SQLite opens a file before the schema executes. If the process stops in that interval, the file exists but has no `tts_requests` table. The next Huihui import opens the file read-only, queries the missing table, and throws `ERR_SQLITE_ERROR: no such table: tts_requests` before reaching the schema initialization path. An identical retry throws the same error. The new CAS-before-success transaction does not cover this initialization window.

Reproduction: `empty-db.mts` creates a fresh judge-only state from retained authentic generation artifacts, creates an empty `tts.sqlite` representing the pre-schema interruption, and calls the candidate import twice for generation `96423ff85b14dc4d251b383dd4323c1d192bc40d00947107c63ccf68e5007884`. Both attempts fail with the same missing-table exception. No speech synthesis, paid call, or target repository execution occurs. Raw output: `empty-db.json`, `empty-db.log`.

The parent supplied this failure lead; I reproduced it independently and did not read another judge's report. This report does not claim independent discovery or reproduce the reported cross-process concurrency variant.

Required correction: make valid empty/pre-schema initialization recoverable for the new local Huihui path and safe under concurrent first creation. Preserve old paid/local reservations and held rows; do not interpret arbitrary corruption or partially incompatible schemas as an empty database, reset a database, or silently bypass ledger integrity. Recheck real process contention and interruptions before/after initialization as well as the already-tested CAS/transaction windows.

## Frozen identity

- Independently verified all 453 listed files and all 629 extracted source files against their byte counts and SHA-256 hashes.
- Compared extracted source bytes with Git objects at `c877431c22a00e3662bcfe94ba74552662502563`: exactly the 12 declared files differ; the other 617 match.
- Source zip SHA-256: `202c843ec7ef9ec88776526829f4ceefdc2242e3b189af5ef7adc1c8565eff60`.
- `identity.cjs` / `identity.json` retain the verifier and result. An initial helper used the default Node child-process buffer and reported the large font as different; increasing the buffer to 32 MB and rerunning established byte equality. That was a judge harness limitation, not a candidate defect.
- Extracted source, dependency junction, copied databases, mutation fixtures and all new results are exclusively beneath this `judge-architecture` directory. Candidate source and evidence were not edited.

## Source and authored-content contract

Actual source, contract, OPERATOR and authored inputs were read. The manifest's replay/regression narrative was not used as proof and builder verification scripts were not executed.

The new opt-in request is `explanation-session-request/1.1`, fixed to `zh-CN` and `windows-winrt-huihui`; its start packet and narrated task profile are distinct. Silent request 1.0 remains a separate branch. Proposal authorship remains `session-agent`. Unsupported/needs-evidence do not gain a rendering/synthesis route merely by selecting a voice.

The verified chain is: pinned source packet → submitted proposal → author manifest → ordered beat texts → Huihui generation → v2 import receipt → voice preparation → exact authored plan/offsets → voice bindings/ledger → narrated preview → session receipt. The verifier checks parent manifest hashes, transcript equality and hashes, original audio hashes, generation parents, exact ordered beat coverage, plan/proposal identity, and preview voice/plan/environment bindings. Display labels do not become source evidence. An imported voice label alone is insufficient: session preparation requires the verified Huihui v2 generation parent.

The six caller-authored Chinese narration lines match the exact generation input, receipt input and proposal bytes. This is text/audio-input provenance, not transcription of the spoken waveform. Both session and voice records preserve speech-content/alignment and owner-listening pending/unverified labels. The implementation makes no Chen claim and no absolute Windows-subsystem offline/privacy claim.

### Fastify

- Repository `https://github.com/fastify/fastify`, commit `8c0f699144187dab3b600a626829c31368762256`.
- Three citations independently matched the captured README bytes and line ranges. README SHA-256 `882746f2c6e7c898ad7ba56d4db2fbbd891b75d73d39625cdf0bf4967263eb53`.
- Port 3000, `GET /`, and handler `reply.send({ hello: 'world' })` are supported. `hello: world` is an illustrative field/value display; wire serialization and headers are explicitly outside scope.
- Retained narrated render task `93a9d9bc88b48e5fd763851bc5f40aa898a8b95b27cae9f667516e1e9d252f48`.

### p-queue

- Repository `https://github.com/sindresorhus/p-queue`, commit `7f272ab5ff2254c0dc2537b7977e88ede1cd55e8`.
- Seven citations independently matched the captured README bytes and line ranges. README SHA-256 `da4c31fd3a51c874e450ba734ad91852c54100ec47d41aa9f8efea9d43dbcc24`.
- Concurrency one denotes simultaneous in-flight tasks, not starts per second. Two added async functions, completion-linked add promises and idle requiring no queued/running work are supported by the cited API documentation.
- Submitted order labels, frame timing and both tasks fulfilling are explicitly illustrative assumptions, not live network outcomes. The depicted queue trace preserves capacity one and releases a slot before admitting the second task.
- Retained narrated render task `4e04b502b750fece31e45d27ec129ad762a9f0f83dbead9e44dd854c4fdd7c8b`.

No new remote refetch was performed. The audit establishes consistency with frozen source bytes and the pinned-commit evidence contract, not an independent live GitHub acquisition attestation. Exact citation matching is not a general semantic entailment checker.

## Independent media and timing checks

`checks.mts` independently compiled the two authored plans and matched the full persisted traces; used FFmpeg to decode every original WAV; reconstructed each complete mix from exact cue sample offsets; and compared every PCM byte and hash with the retained clips/mix. Both complete MP4s passed full video/audio decode. FFprobe enumeration checked every video frame PTS against frame/24.

| Case | Video frames | Container seconds | Reference PCM samples | Decoded AAC samples | PCM/AAC SNR |
|---|---:|---:|---:|---:|---:|
| Fastify | 437 | 18.208333 | 874000 | 874496 | 44.31 dB |
| p-queue | 505 | 21.041667 | 1010000 | 1010688 | 41.89 dB |

AAC stream durations are 18.208000 and 21.041000 seconds. The AAC decoded output includes bounded codec padding; it is lossy and not asserted byte-equal to PCM. The aligned SNR check is technical evidence, not naturalness or speech-content approval.

Every original clip retains its natural sampling duration; measured 16 kHz sample counts become exactly three times as many 48 kHz samples. All clips fit their authored beats, all mix samples outside placement are zero, and complete clips are copied without truncation or playback-rate change. The user maximum and presentation-version budgets remain enforced. This review did not create or validate a new 300-second Huihui movie.

`captions.cjs` independently reconstructed all three Fastify and four p-queue VTT cues from codepoint partitions and absolute sample placement, including profile-specific millisecond rounding. Both exported VTTs match byte-for-byte. The split p-queue cue is explicitly caller-timed; no word-boundary/alignment inference was made. Source labels and sample events were checked separately from subtitle text.

Four frames were independently decoded from the actual MP4s and viewed: Fastify 171/315; p-queue 44/212. They display the intended root-route/reply and one-slot/handoff states, Chinese captions, and the visible `Illustration / No observed execution` disclaimer. English headings/UI labels remain; p-queue task-card text is comparatively small. These observations are not a full product/readability pass or continuous audiovisual review. A future Chinese UI/profile revision must receive its own frozen-candidate review.

## Independent negative and recovery checks

`checks.json` records 22 rejected cases: for each project, wrong preparation manifest, wrong proposal hash, wrong commit, reordered offsets, one-frame voice overflow, missing offset, out-of-budget plan, altered quote, silent downgrade, corrupted WAV and corrupted receipt. Mutations touched only the private judge state and original bytes were restored. Valid status succeeded after restoration.

Both retained completed render checkpoints and both voice-preparation checkpoints resumed as cached, without network, synthesis or rerender. All 20 original task records remained byte-identical, with no new task records. All six TTS request/outcome records remained identical. Fresh live cancellation/resume of WinRT/Chromium was not repeated by this judge; builder cancellation claims are not elevated to independent execution evidence here.

`atomic.mts` used authentic retained Fastify generation in another new judge-only state. Independently tested:

- Abort immediately after receipt CAS: no request reservation remains.
- SQLite trigger abort during outcome insertion: both request and outcome roll back.
- Two concurrent same-process imports: one winner, one cached result, exact same winner receipt.
- Repeating a successful import: same receipt, no duplicate request.
- Explicit synthetic historical v1 held row: status stays held, read remains refused, new v2 import does not alter the old row or create its outcome.

Those cases pass, but do not cover or waive F1's earlier initialization window. The same-process race is not presented as a multi-process concurrency test.

31 candidate focused tests were independently executed in extracted judge source, all passing. This includes the technical 16,001-sample fixture decoding to exactly 48,003 samples and the existing generic/paid reservation tests with mocked transports. Synthetic test WAVs are not presented as authentic spoken Huihui recordings. Actual historical v1 success and historical silent/unsupported artifacts were not freshly replayed in this review; their unchanged branch semantics were inspected, and the held-row case above was executed. No claim of a complete historical regression suite is made.

## Role conclusions and limits

- Architecture/recovery: **CHANGES_REQUIRED**, F1 major.
- Evidence/provenance: **PASS within the tested two-project closure**, with remote acquisition not independently repeated.
- Content facts: **PASS for the bounded documented mechanisms and explicitly illustrative examples**; no arbitrary-project semantic automation or live target execution claim.
- Owner speech-content, naturalness, continuous audiovisual and final acceptance: **UNVERIFIED / pending**.

No candidate edits, paid dispatch, target repository execution, voice reference loading, publication or deployment. Final approval requires a new frozen candidate fixing F1 and impact-based independent recheck; successful current subchecks must not conceal the global recovery failure.
