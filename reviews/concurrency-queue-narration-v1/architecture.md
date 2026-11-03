# Independent architecture / evidence / content-facts review

Candidate: `gve-queue-narrated-freeze-v1/candidate.json`.

Result: **PASS for the bounded architecture, evidence-integrity, and supplied-content-facts scopes below.** No blocker or major defect found. This is not owner audiovisual acceptance, a speech transcription result, or proof of arbitrary-project semantic automation.

## Identity and independence

Candidate SHA-256: `4b2d7debf53bbc7bffe7a590613dfe01b316fa3f823599ef5df50392cccf20b1`.
Source commit: `c78de74ec764211baab03bdd98ac15d5f513a970`.
Git tree: `4304139991c185f39a85fa9a92e748ce0b9130ca`.

Independently checked all 699 frozen manifest files (hash and size), all 541 archived tracked files against actual Git blobs, and the declared tree. All matched. Every `src` file is byte-identical to the earlier independently reviewed queue c2 source. Repeated the identity check after all probes; no frozen changes. Git objects were read from the main github-video-engine repository, not from the non-Git work directory.

Read OPERATOR, actual contracts/runtime and SAPI script. OPERATOR claims were not treated as verification. Did not read builder verification summaries/scripts or other judges' reports. Wrote and executed independent probes only in this judge directory, against copied state. No target repository execution, paid service, new speech synthesis or new movie rendering.

## Actual media and audio lineage

| Fixture | Actual video | Narration clips | Status |
| --- | --- | --- | --- |
| Real p-limit source; illustrative four-task/two-slot schedule | 1,059 frames, 44.125 seconds, 24 fps | 6 | Verified |
| Explicitly fictional tiling contrast; five tasks/three slots | 603 frames, 25.125 seconds, 24 fps | 4 | Verified |

Both movies independently passed full FFmpeg `-xerror` decode. All 1,662 video frame PTS equal their expected frame index / 24, without gaps. Both exports exactly equal their verified immutable task/CAS closures, and recompiled proposals/plans exactly reproduce stored traces.

For each of the ten clips, verified the exact proposal narration, local-import input, receipt bytes/hash, original audio bytes/hash, SAPI input text and ZIRA token declaration. Each original is independently probed 22,050 Hz mono. Each original was independently decoded to 48,000 Hz mono PCM16; the entire result exactly equals the stored normalized clip. All samples fit within their beats with playbackRate 1. Rebuilt both complete mixes from zero-filled buffers and measured sample offsets; both are byte-identical to stored PCM. Independently encoded each rebuilt mix to AAC and extracted the final movie AAC: both elementary AAC streams are byte-identical to those independently encoded references. This proves final AAC corresponds to the reconstructed inputs through the stated encoder; it does not mean lossy AAC equals PCM samples.

The primary last clip ends at sample 2,097,601 (43.700020833 seconds), before the 44.125-second movie end. The synthetic last clip ends at sample 1,185,297 (24.6936875 seconds), before the 25.125-second movie end. No imported clip truncation or playback-rate acceleration was found.

Independently rebuilt both VTT files from exact text and measured sample positions; bytes match. Tested the actual encoded caption panel immediately before, at, just before end, and at end for all ten cues: 40 boundary frames match expected presence/absence. This pixel check establishes caption visibility, not OCR or speech-word alignment. Actual boundary contact sheets were also visually inspected for displayed text, source/illustration labels and terminal state.

All ten transcripts remain caller-declared. Text/receipt/audio binding does not establish that the spoken words match the text. The SAPI script and input specify Microsoft Zira Desktop, rate 0; they were inspected, not rerun. No claim of Chen identity, independent voice authentication, naturalness, listening approval or word-level alignment is made. Artifacts correctly retain speechContentReview unverified, semanticReview pending and ownerListening/ownerAcceptance pending.

## Sources, facts and temporal meaning

The real project is sindresorhus/p-limit pinned to `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`. README SHA-256 is `dbe29b10fca55743e35fe2b3d768024cd135d1bac4bd60aee566a5e1f3af294f`; index.js is `edde12a4a4dbdbe8d27161cdd0853db0bab435d5dc6c15f9f4dedc27ee9bca60`. These bytes were independently authenticated against pinned GitHub contents in my earlier queue review and are unchanged here; there was no fresh remote fetch this round. All quote ranges and hashes were rechecked locally this round.

The four factual claims describe concurrent-execution limits, admission below the active limit, waiting functions not yet called, and releasing a slot after fulfillment or rejection while preserving the caller's rejection. They are supported by the supplied README/index.js excerpts. They do not claim a starts-per-second rate, CPU/thread parallelism, observed latency or a performance benchmark. Two slots, task labels, timing, order and outcomes are staged example inputs, not measured p-limit execution. The final cue explicitly states that timing and order are staged. That cue was edited from c2 and has a new proposal/audio binding; no mismatched old text recording was silently reused.

The synthetic contrast is not a second real library. Its source explicitly begins `SYNTHETIC FIXTURE`, repository identity is fictional, and its `cccc...` commit is a fixture identifier. The first cue explicitly says synthetic/fictional; actual frames retain the synthetic title and illustration/no-observed-execution labeling. Its documented claims refer only to the fixture document. Generalizing from it to a real external implementation would be unsupported.

Relative queue events and source claims remain unchanged from queue c2. Narration causes longer beat lengths, hence different absolute event positions. Primary enqueue/start frames are 187/217/234; release/start pairs 534/543 and 705/714; last settlements 906/929. The terminal all-settled title begins at frame 949, after the last 20-frame settlement motion. Before it, the title remains in progress. Synthetic enqueue/start frames are 157/184/197/210; reject/start 293/303; its ending at frame 473 correctly pauses with Tile E waiting, A/B/D running and C rejected. State capacity and task uniqueness were checked across every frame. Event-to-clip sample offsets match the stored event ledger. These are deterministic illustrative animation times, not measured library wall-clock times or demonstrated alignment to individual spoken words.

## Negative and revision checks actually executed

Seventeen independent negative cases rejected as expected:

- Missing or duplicate clips: VOICE_COVERAGE.
- Altered caller text and its hash: VOICE_TRANSCRIPT.
- Wrong receipt or original-audio hash: VOICE_RECEIPT.
- Overflow placement: VOICE_DOES_NOT_FIT, with no truncation fallback.
- Wrong parent manifest/proposal: PRESENTATION_INTEGRITY or VOICE_PARENT.
- Playback rate 1.1: schema rejection.
- Cross-project voice and old voice after a one-frame plan revision: VOICE_PARENT before rendering.
- Tampered copied CAS original audio, receipt, normalized clip, mixed PCM, captions and source: integrity rejection; restoring exact bytes restored verified reads.

Actually created a one-frame longer final beat in copied state. Old voice binding was rejected. Explicitly rebinding the same originals produced new voice identity; a second identical bind was cached. The original narrated movie remained verified. No edited movie was rendered in this review.

## Evidence reuse and limits

This round independently executed media/PCM/AAC/caption/timing/closure/negative/revision probes. Earlier queue c2 source-level semantic, legacy-reader and focused-test evidence applies only where current src bytes are identical; those earlier tests and typecheck were not rerun here. The frozen builder cancellation/retry and test-count claims are not independently re-executed evidence in this report. Original render cancellation, peak resources, full continuous viewing, listening, transcription, subjective pacing and owner acceptance were not tested here.

The current content-facts PASS is a bounded review of these two supplied documents/plans and their explicit assumptions. Hashes and citation matching do not validate arbitrary authored semantics. There is one real project plus one synthetic contrast, not two independent real-project demonstrations.

## Reproduction and raw evidence

From this directory, `node identity.mjs` performs the frozen identity check. With the locked local dependencies present, the independent probes are `node --import ./source/node_modules/tsx/dist/loader.mjs probe.mts`, followed by `timeline.mts` and `bindings-probe.mts` using the same invocation. They operate on `run/state`, the copied workspace, and write local analysis outputs. No target-project code is executed.

Raw results: `identity.json`, `probe-results.json`, `timeline-results.json`, `bindings-results.json`, their corresponding scripts/logs, `run/*-probe.json`, rebuilt PCM/reference AAC and actual encoded-frame contact sheets. The exact text, hashes and sample ranges for all ten clips are retained in `probe-results.json`. `timeline-results.json` retains every tested caption boundary and absolute event/sample offset. All prior reports remain untouched.
