# Independent architecture / evidence / content-facts review

Candidate: `c7d77570db042dde55e892e86e898308260c0b968037d47e2be5ffab3d3e4e77` (`presentation-narrated-sequence-freeze/1.0`).

Decision: **PASS for the bounded engineering and supplied-fixture scope** in architecture, evidence, and content facts. No reproduced blocker or major. This is not an audiovisual, speech-transcription, voice-identity, semantic-automation, or owner-acceptance pass.

## Independence and identity

Read OPERATOR and the sequence contract, actual implementation, proposal, captured source, receipts and trace. OPERATOR's builder statements were treated as claims, not evidence; no builder verification script, builder audit result, or other judge report was used. Candidate metadata was used to locate artifacts and verify identity. All executions used extracted engine source and judge-owned state/output copies. Target p-limit code was read as text only. No paid calls, synthesis, target execution, or candidate modification occurred.

`identity.mjs` / `identity.json`: independently hashed all **756** declared files and the candidate itself. The source ZIP hash matches. Extracted source matches Git base `2565101cfe36088c7bb72db9e8e21ba760591cb2` for the 563 base paths except the declared changes; the added audio helper gives 564 source files. Declared prior and current hashes were independently checked against Git blobs and extracted bytes. Changes are only sequence implementation, new sequence-audio helper, sequence contract and presentation tests.

## Actual PCM, AAC, timing and captions

`media.mjs` / `media.json`, `aac-trace.mjs` / `aac-trace.json` are independent checks, not imports of builder scripts.

- Actual sequence: **2,156 frames / 89.833333… seconds**, not a five-minute or four-scene demonstration. Two same-project p-limit children have 1,059 and 1,061 frames, separated by 36 frames.
- Full FFmpeg decode of both streams succeeded. All 2,156 video PTS equal `frame × 2,000`; video and audio each declare start PTS 0, time base 1/48,000 and duration 4,312,000 ticks. Thus presentation duration is exactly the combined sample/frame budget.
- Independently decoded all twelve retained original recording instances to 48 kHz mono PCM16. They exactly match each child clip PCM and its SHA-256/sample count. Receipt bytes/audio bytes, caller text hash and corresponding proposal narration were checked. Reconstructed both full child mixes and the complete combined PCM byte-for-byte, including gaps and tails.
- Combined PCM is **8,624,000 bytes**, SHA-256 `07412f6f233ff7d297886d150dcc12e96b064e6c7030cae2c921ef4957379b69`.
- Card interval `[1059,1095)` frames equals `[2118000,2190000)` samples. All **72,000** PCM samples are zero. The actual decoded AAC card interval is also zero in this fixture.
- Independently encoded the full reference PCM with local AAC at 128 kbit/s. The entire ADTS packet stream is byte-identical to audio extracted from the supplied MP4: **1,040,823 bytes**, SHA-256 `f6f8126bf0894dc2e4e15be7215c23954fb4b9ca1eb9158ec94635cee39668fd`. This checks the whole final encoded track, not just selected sound spans. It does not make AAC lossless.
- Raw AAC decoding exposes **64 trailing packet-padding samples** after the declared track interval. This is accurately disclosed by OPERATOR and does not truncate or replace any original reference samples. Recording-span normalized correlations are 0.9999085037–0.9999802214; these are waveform checks, not intelligibility or naturalness ratings.
- All twelve global caption cues match child ledger text, source cue index, local sample/frame coordinates and exact scene offsets. Independently regenerated every VTT cue and matched bytes. Cue IDs are scene-namespaced; no cue overlaps the card. Global nearest-millisecond projection is explicit in the new contract. Legacy local caption sidecars remain byte-identical; global 1.3 VTT is a new projection and is not promised to preserve old outward-rounded VTT bytes.
- Extracted six actual boundary frames in this judge directory. Viewed frame 1077 (clean separate-example card) and 1099 (new scene with the original illustrative/no-observed-execution label and caption). This is sampled visual inspection, not continuous playback or owner AV review.

## Sources and content facts

Both children have the identical complete binding: p-limit commit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`, snapshot `e7f9962ebe218276d96fdd8cde01249a9db8cc69c4589d261719d532f358c2ce`, evidence fingerprint `e83b79689573995699abee34a68dd597a89a7992c70d5510802386136f2ad668`, project `queue-demo`. Source hashes are README `dbe29b10fca55743e35fe2b3d768024cd135d1bac4bd60aee566a5e1f3af294f` and index.js `edde12a4a4dbdbe8d27161cdd0853db0bab435d5dc6c15f9f4dedc27ee9bca60`. They match the previously reviewed pinned capture bytes; this review did not fetch the remote commit again.

Every supplied citation's source SHA and exact quoted line range was checked afresh. Manually inspected the captured admission/settlement implementation: admission checks activeCount against concurrency; pending functions have not been called; both success and rejection reach slot release while the result promise propagates to the caller. The six narration statements are consistent with those narrow facts and the disclosed illustrative scenario. Concurrency is an in-flight count, not starts per second. The staged tasks, capacity two, timings, order and outcomes are explicitly assumptions; the final spoken text declares staged timing/order. The trace preserves two slots, releases prices before stock starts, releases rejected stock before details starts, then completes catalog/details. The second child shifts those event times by two frames; it is a timing revision of the same example, not another library or benchmark.

The new sequence is caller-authored ordering of verified children. No automatic narration or semantic invention is performed. Voice receipts identify Microsoft Zira / Windows SAPI / rate 0 as a technical fixture and explicitly mark recorded speech unverified. No Chen claim appears. Source/transcript hashes bind declared text; they cannot establish that the waveform actually says that text or establish speaker identity. Machine review fields appropriately remain pending.

## Integrity and compatibility executed this round

`checks.mts` / `checks.json` / `checks.log`:

- Eight successful sequences were read, resumed from success, exported and exported again with both media-tool paths disabled: six historical tasks (two each of 1.0, 1.1, 1.2) from a copied c3 queue state, plus current 1.3 narrated and current 1.2 silent tasks. Historical spec/manifest/movie bytes and **204 child closure files** matched their retained originals. Repeated export was reused. Current 1.3 reconstructed PCM/VTT/ledger also exactly matched frozen export bytes.
- Twelve independently exercised negative cases rejected: narrated mode on 1.2, silent mode on 1.3, wrong child manifest hash, duplicate child, locale/title mismatch, tampered child mixed PCM, original receipt, voice binding, proposal, captured source, an actual silent child in narrated assembly, and an actual child with different evidence binding. Mutations occurred only in judge copies, were restored, and final narrated status again verified.
- Independent synthetic unit fixture combined voice ledger 1.0 and 1.1 with a non-integer-millisecond sample offset (124,025 samples). Verified provenance, escaping and global nearest-ms projection. ±1-sample child PCM length was rejected. This is a synthetic helper test, not evidence of a real 1.1 narrated sequence.
- TypeScript no-emit check passed. All **33** affected presentation/concurrency tests passed in this extracted copy. The initial restricted run had two Windows hard-link EPERM failures; the same tests were rerun under approved native filesystem permissions and all passed. These environment failures are not concealed as passing initial results.

Code inspection confirms exact binding equality, fail-closed mixed mode, parent manifest checks and caller-authored identity. PCM length must equal the complete scene frame interval. Cards insert silence; encoding consumes new full PCM once, with no speed filter, trimming, AAC joining or `-shortest`. Audio helper/runtime/decoder source fingerprints contribute to narrated task identity. Read/export reconstruct descendants and compare manifest values, rather than trusting a free-standing caption sidecar. Existing silent artifact layout and successful old task identity are preserved.

## Limits and follow-up evidence

No blocker/major found within the supplied contract and tested scope. Do not widen this result into untested claims:

1. Actual new media contains only p-limit and its timing revision; no second real project, four-scene or full 300-second narrated sequence was rendered here.
2. Both real voice ledgers are 1.0. Version 1.1 integration is supported by source inspection and synthetic projection tests, not a newly rendered real 1.1 child in this review.
3. No fresh sequence encode/cancel/retry race was run by this judge. Builder claims on cancellation were not adopted. Successful historical resume and duplicate export were actually executed.
4. No speech transcription, identity authentication, listening, continuous device playback or subjective AV/owner acceptance was performed.
5. The 160 MB child-closure cap, 80 MB MP4 cap and bounded ≤28.8 MB PCM are source-verified constraints. This review is not a peak-memory, low-disk, or timeout stress certification. The full default test suite was not run.
6. Old incomplete tasks remain subject to current version/toolchain identity rules; this round tested completed historical tasks only. Prior incomplete migration observations are not represented as current execution.

Raw scripts, JSON results, retained exported comparisons, selected frame images and logs are adjacent to this report. Candidate and its source files were not edited.
