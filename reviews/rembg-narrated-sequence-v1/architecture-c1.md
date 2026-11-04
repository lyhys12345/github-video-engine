# Independent architecture / evidence / content-facts review

Candidate: `9f56f1752350bd65a63a16ae1f114f89ba538f4edb23b6a0b002d760dde88ca0`.

Verdict: **PASS within the tested technical and bounded factual scope** for architecture, evidence, and content-facts. No blocking or major finding. This is a rembg illustrative sequence and timing revision, not a new rembg execution, automated narrative-authoring demonstration, or owner approval of voice/visual quality.

## Identity and independence

Read the candidate OPERATOR/contract and actual artifacts. Did not use builder conclusions or other judges' reports as evidence. All 778 declared files independently match their SHA-256 and byte counts. The 577 extracted source files match Git blob identities at `894c5ca612e74481d8015c2e8012a75e8098040e`; source ZIP SHA-256 is `c64fcc514af3737c0e8a4082ceb5348c045fb9889701533f3669522bd803b026`. Rechecked the candidate after tests. Frozen files were not modified. Only this judge directory contains extraction, copied state, test mutations, and output.

The sequence/runtime/narration/contracts and focused test file are byte-identical to my previous independently reviewed voice-ledger legacy candidate (individual hashes in identity.json). I reuse that review's 54 focused tests, TypeScript check, strict legacy-profile rejection and prior-version compatibility evidence by impact; I did not rerun that whole suite this round. The new rembg media and copied-state checks below were actually executed this round.

## Source and content facts

Both children bind rembg `https://github.com/danielgatis/rembg`, commit `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`, snapshot `954ac356952f3716fdffffd10cab455ffd1b364bb968c089b7b0bbb23930436e`, evidence `f62e67dfb6598e15b3bd3d72b250a66d4887ac6403c38c7f969f859c69f8f8f7`. Captured README bytes hash to `8455c52c60130199ab61858d359f2d25440dd95772844e2b3a037e490b31179d`; exact quotations/line selections match its local bytes. This is verification of the pinned captured provenance, not a fresh remote fetch or target execution.

README lines 127–131 support removal from a local file using `rembg i path/to/input.png path/to/output.png`; lines 148–152 support mask-only output using `rembg i -om path/to/input.png path/to/output.png`. The five narration statements concern the same illustrated input, standard command, removal of the background, mask-only option, and comparison. These bounded claims fit the cited examples. They do not establish actual pixel processing, model internals, quality, speed, or a measured output.

The paper-bird/1 asset is explicitly illustrative, engine-authored geometry. Its canonical content independently hashes to `1ecf28d75d12af4e3d0c5eb8b23a99d1576fbf0a59885ef5484ff8bce9a7e690`. The proposal disclaims real pixel/model/effect measurements. Actual inspected output frames include the chapter card and a mask scene carrying “Local voice · Illustration · No observed execution.” These labels and provenance must remain with the example.

Both scenes use plan `ccd0ee2c4450499630513d62d22d8d7532e6df072ede1f741f775f19546f8380` and byte-identical state traces. Local events occur at frames 12/108/208/327/422/472 (input, cutout selection, cutout, mask selection, mask, comparison). Second-scene projection adds 576 frames. The two scenes are the original and a timing revision of one example, not two distinct projects or independent experimental results.

## Actual media and exact voice chain

Actual output task: `68b137ce13a8ddab9253bf964faf209c4984f2c5f3d9cb57d2fc352725a96d25`; MP4 SHA-256 `9b6378a0bf91fd371ac0f2f83b783cee6f59495d34f4278e31a3f02c852c93bd`.

- Full video/audio decode succeeded. All 1,116 frame timestamps match the 24 fps sample clock (2,000 samples/frame); both streams start at zero and declare 2,232,000 samples, **46.500 seconds**.
- Independently decoded all ten recording instances (five unique original recordings reused twice), checked receipt/text/audio hashes, exact proposal narration, normalized clip PCM, and reconstructed both child mixes and the full sequence. All 4,464,000 PCM bytes match; SHA-256 `26364a2ec12866b90d1152e79fb9331d181964c77ddd639a6fd90311efcd1023`.
- Independently encoded reconstructed PCM using the frozen encoding settings. The entire extracted ADTS AAC stream is byte-identical: 349,044 bytes, SHA-256 `28d4f5cb972ab6df2d8079f6c8a4f8ce6545d56b2bf149b6b0fe8d0f844bedaa`. Decoded recording-range correlations are approximately 0.999899–0.999993. Raw AAC decoding exposes 320 codec-padding samples beyond the declared interval; this is recorded rather than mistaken for extra intended narration.
- All 10 VTT cues match expected text and global time projection. The chapter occupies frames [540,576), samples [1080000,1152000); all 72,000 samples are zero in both the intended PCM and decoded output.
- First original recording interval [14000,161793) becomes [16000,163793): exactly +1 frame / +2,000 samples. The other four cue intervals, all original audio and receipt bytes, and normalized clips are unchanged. This is an offset edit, with no speed change or truncation.

Both voice ledgers are version 1.0. Receipts label Microsoft Zira Desktop / Windows SAPI technical fixture recordings. No Chen identity, Chinese naturalness, newly generated speech, ASR transcription, or subjective listening acceptance is established. Exact caller-text/receipt binding is not an independent transcription of the spoken words. Full-sequence human listening and owner audiovisual acceptance remain pending.

## Copied-state behavior and negative cases

With FFmpeg and FFprobe paths deliberately disabled, both full child reads, sequence status, cached successful resume, export, and repeated export succeed. All 64 exported files match the frozen bundle exactly. The read-only operations leave the 312 copied state files unchanged. All 33 original task JSON rows from input-state remain byte-identical.

Ten independent refusal checks passed: wrong second-child manifest; plus status/resume/export for each of (a) an extra PCM sample, (b) a changed original receipt byte, and (c) a changed captured source byte. Mutations occurred only in the judge's copied CAS and were restored in finally blocks. Final verified status succeeds; original artifact bytes and task rows remain intact. See checks.json for actual error codes.

The first harness run incorrectly required the entire database/file inventory to remain unchanged even after requesting a deliberately invalid new assembly. That assertion conflated a newly recorded failed attempt with mutation of an existing task. The original checks.log is retained. The harness was corrected to check preexisting artifact bytes and task JSON rows; the subsequent successful run is checks-rerun.log. This was a judge assertion error, not a candidate defect.

I did not independently rerun cancellation during a live owned FFmpeg process or create a fresh rendered sequence. Builder cancellation/retry claims are not adopted here. I decoded and reconstructed the supplied actual media. No target repository code, paid provider, or fresh speech synthesis was executed.

## Raw evidence

identity.mjs / identity.json / identity-final.log; media.mjs / media.json / media.log; aac-trace.mjs / aac-trace.json / aac-trace.log; checks.mts / checks.json / checks.log / checks-rerun.log; extracted sample frames and independent audio files in this judge directory. All conclusions above are bounded by those executed checks and explicitly identified prior evidence.
