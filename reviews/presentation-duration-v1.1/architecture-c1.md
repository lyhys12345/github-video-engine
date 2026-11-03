# Presentation duration 1.1 — independent architecture / evidence / content-facts

**Architecture PASS; evidence PASS; content_facts PASS for this bounded engineering contract**, with one minor script/visual timing mismatch below. No blocker/major found by these roles. Actual speech transcription, listening quality, continuous perceptual AV, final owner acceptance and a real 300-second movie are **UNVERIFIED/not performed**. Role passes cannot waive those dimensions or another active judge.

Review date 2026-11-03. Read OPERATOR and `docs/presentation-duration-v1.1.md`, source contracts/runtime/worker, actual authored proposal/plan, recordings/import receipts, source bytes and final exports. Followed AGENTS and evidence/content-facts role boundaries. Did not read builder verification scripts, media/resource/test summaries or other judges. OPERATOR includes builder assertions; this report uses only independently established evidence below. All mutations were in this judge directory/copied state. No target repository execution, paid service, new film rendering, deployment or candidate modification.

## Frozen identity

- Candidate SHA-256 `7f5588b650b0a390ca560e103ac73beb3b0c2a742f4ed07261799fefc89635fd`.
- Source `b4b8ea9330e12c450b3d3bf07cccb03838883a70`; actual Git tree `4e370b33cd6cd5b2fd193078c45354cf016b7082` matches.
- All **984** manifest files match hash and byte count, before and after testing. All **515** canonical archive entries match Git blob IDs. Runtime exact archive differs in **62** files only by CRLF/LF. Tests use exact-runtime source.
- Independently derived engine codeHash matches all three final movie environment records. Raw identity: `identity.json`, reproduction `node identity.mjs`.

## Architecture, compatibility and limits

Schema 1.0 retains 1440-frame/60-second limit; 1.1 permits 7200 frames at 24 fps/300 seconds. Both retain 1–20 authored beats and the same two semantic modules. Duration is the authored sum; no forced 300-second padding or automatic story composition exists. New schema is included in plan input/hash. Existing task-kind names are retained rather than creating v2 kinds; strict version parsing, exact parent identity and optional internal extended render profile distinguish actual behavior. Existing compiled-trace schema stays 1.0 because its shape did not change. Directly read the two historical narration task IDs from the previous release with the current code: both still integrity-verified.

Extended mode activates only above 1440 frames. The internal fixed worker profile requires 720×1280/24 fps; `extendedRanges` enforces 1441–7200 frames and partitions contiguous inclusive absolute ranges of at most 480 frames. Remotion receives full timeline props and absolute frame ranges, so no scene/voice timeline is intentionally reset at a part boundary. Intermediate parts are checked for single H.264 video, dimensions, fps, actual frame count, color-range agreement and ≤12 MB each. A safe local concat list stitches in order; final `setpts=N/(24*TB)` yields a continuous video clock. Full-length PCM is muxed once, not once per segment.

Resource controls inspected: movie80MB, samples48×2MB, max60 committed files/result, plan payload24MB, preview180MB, voice63.6MB (two complete 28.8MB PCM sets plus metadata budget); sources individually25MB and combined32MB. Bytes are checked on read/write. The voice decoder has a one-second output ceiling margin and rejects reaching that ceiling; placement rejects excess samples, so `-fs` is a resource stop, not permission to accept truncated speech. Final-video `-fs` is followed by exact frame/duration and full-decode verification, so a size-truncated movie cannot be accepted merely because FFmpeg exits zero.

Disk admission requires 2.62GB work-volume free and320MB state-volume free. A two-second scratch observer enforces observed2.2GB/50,000 entries/free-floor budget. These are sampled controls, not hard OS allocation quotas. Worker30-minute soft deadline, parent31 minutes, task50 minutes, three attempts, individual final technical checks5 minutes. Retry restarts uncommitted rendering; no frame-resume is claimed. I inspected these controls but did not independently repeat resource-exhaustion or cancel/process-tree tests; builder observations are not adopted as fresh performance evidence. No five-minute rendering-speed or peak-RSS guarantee is established.

## Independent real-media and audio checks

`probe.mts` independently loaded all final source→proposal→plan→voice→movie closures, recompiled traces, verified every exported file against checked CAS, compared exact source lines/hashes, and verified all **21** original/receipt/normalized clips across the long and two short movies. For the long twelve clips, the exact declared text and source WAV bytes also match `duration-zira-input.json` and `work/operator/wav/<beat>.wav`. Local receipts explicitly declare Microsoft Zira technical fixtures. No Chen or independently authenticated/recognized speaker is asserted.

Each original recording was independently decoded completely at original speed to48kHz mono PCM16; every byte matches its normalized clip. Each zero-filled full timeline was independently rebuilt using complete clips at integer sample offsets; all bytes match exported reference PCM. All clip texts exactly equal current proposal narration and receipt text; VTT was independently regenerated from sample windows. This is data/transcript-declaration verification, not actual speech transcription.

Stronger final-audio check: independently encoded each rebuilt PCM as AAC128k, extracted ADTS AAC from that new file and from the final movie, and compared complete bytes. **All three AAC streams match exactly.** Thus these movies carry the expected encoding of the verified, untruncated mix; this does not prove pronunciation, naturalness or word alignment.

| Actual movie | Frames / seconds | MP4 SHA-256 | Independently reproduced AAC SHA-256 |
| --- | --- | --- | --- |
| Extended Express |1842 /76.75|`2a30788d303b0910977570cacd5cedc3f2d4b50e13f313b27441288529b8ed17`|`82b17c04b0e1a59159275bd071550a1b2870d0fe573f765a45192769e5d3817a`|
| Short Express |480 /20|`a085206167bcce3564826ba9dadc88f5de125f4efbeebc8898180cc5854f8b86`|`26b198769d09ecc856dc0ebd0b7607314cf224bce01fca2ae81e23bd2e01e81b`|
| Short rembg |540 /22.5|`a98ad137285eccdd6cc69d4361e124724fddb70c7b763c34c57d0b7827a98b7d`|`03bd68bf964080f526193a4437f9bef489dff989a8a6bce534d9aa3d1abfabaf`|

All three movies independently fully decode, with720×1280 H.264/24fps and one48kHz mono AAC stream. Both short movie hashes equal their prior-release values. Per-clip exact hashes/endpoints/receipts and source claims: `probe-results.json`; independent files in `run/`.

The long voice spans twelve declared clips. Sample-accurate placement windows in seconds (display rounded): read-example0.208333–4.896917; listen6.166667–10.585313; show-port11.833333–17.906771; root-path19.125–23.623688; request24.875–29.823354; keep-request31.291667–36.085375; registration37.375–42.233521; match43.5–48.843417; inspect-handler50.25–54.723667; send-call56–61.358688; response62.666667–68.640063; read-result70.125–75.678479. Last recording ends before76.75, without trimming; remaining samples are silence. Burned captions use outward frame bounds and VTT outward millisecond bounds. They remain explicitly clip-level measured windows, not word-level speech alignment.

## Four video ranges and actual joins

Final manifest ranges are `[0,479]`, `[480,959]`, `[960,1439]`, `[1440,1841]`: 480+480+480+402=1842. Independently checked **every final video frame timestamp** against n/24; maximum absolute difference was3.34×10^-7 seconds (printed timestamp precision), with no missing or duplicate timestamp position.

Independently extracted MP4 frames479/480,959/960,1439/1440,1683 and1841. Compared each to its committed same-frame Remotion PNG after RGB decode: RMS pixel error3.48–4.18/255, PSNR35.71–37.29dB, consistent small re-encoding differences. These metrics are supporting comparisons, not perceptual acceptance thresholds. Personally viewed `run/stitches-contact.png` at240×426/tile and long `run/duration-contact.png` at180×320/tile. The three joins preserve the same current scene/subtitle and the final frame preserves Hello World; no sampled segment restart or swapped part was seen. All sampled frames retain `Local voice · Illustration · No observed execution`. Blank trailing contact-sheet cells are layout padding. `stitches-results.json`/`stitches.mjs` preserve exact records.

These checks plus source inspection establish actual76.75-second stitching. They do not establish all possible transitions or a rendered300-second film. Intermediate part files are not retained in the final export, so this role did not independently probe those original temporary parts; final frame sequence and same-frame sample correspondence are the available independent evidence.

## 300-second boundary: calculation only

My own `boundaries.mts` accepted schema1.1 totals96,1440,1441,1464,1800,7199,7200 frames; exercised the exact `extendedRanges` function used by the worker; rejected1.0/1441 and1.1/7201, invalid/noninteger ranges. For7200 it produced15 contiguous ranges ending7199. No browser render was performed for this boundary.

Allocated an actual28,800,000-byte synthetic PCM buffer, placed14,400,000 samples, verified its final nonzero sample1347 survives the reconstructed mix and the cue reaches00:05:00.000. One extra sample and one extra offset-frame both reject. Also rejected80MB+1 movie,2MB+1 PNG and61 files. This is a real in-memory arithmetic/budget test, **not actual five-minute media or real five-minute narration**.

## Sources, facts and assumptions

Personally examined source-bound claims/script and captured primary README lines. Express source remains commit `43fca52d28a422c8be48fd489cbd4f2d6152bab6`, SHA `3cf5f3e224dbb9b5e2bc0ac255871de453762ae7a277f868da5f4a69d6ff2509`: L45–47 supports listen3000; L41–43 supports root GET handler and `res.send('Hello World')`. Long script expands those same facts and illustrative staging, without adding latency, throughput, target execution or generalized guarantees. Registration is explained after request movement but says it registers the handler; it does not claim registration occurs in reaction to the request.

Short rembg source remains commit `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`, SHA `8455c52c60130199ab61858d359f2d25440dd95772844e2b3a037e490b31179d`: L127–131 supports local-file removal command; L148–152 supports mask-only `-om`. Engine-authored same-bird cutout/mask is schematic, no actual model/output-quality result. All citations matched exact raw captured bytes; this review did not freshly fetch GitHub or execute either project. Data/citation matching alone would not establish a false future parameter's meaning; these actual values were checked.

**Minor CF-1: held frame described as moving.** `keep-request` narration/subtitle says “as it moves toward the server” during31.291667–36.085375s, while the authored request event is frame610 and its one-second movement completes by634 (26.4167s); beat `keep-request` starts746 and has no event. The request card is stationary throughout that clip, as source/frame-state and sampled actual frames show. This is a local script/visual synchronization mismatch, not an incorrect Express behavior claim or a duration-integrity failure. Revise that sentence to describe holding/tracking the same request, with a new exact recording/binding, or explicitly animate a supported continued movement in a future candidate. Do not claim word/phrase-level AV alignment passed. Parent was notified; independent visual/editorial role may assess its own impact. No source or candidate was changed here.

## Tests, tamper checks and limitations

- Typecheck passed; independent focused suite **21/21** (`presentation.test.ts`9, `short-segment.test.ts`12), with local native hard-link permission. `typecheck.log`, `targeted.log`. No full default-suite rerun claimed.
- Six copied-state CAS tamper/restore checks rejected raw audio, original receipt, normalized PCM, full mix, VTT and source-byte damage; exact restoration revalidated the movie. Eleven independent boundary/resource rejection cases also passed; total17 rejection cases. Focused native tests additionally cover stale parents/text/coverage and revision preservation.
- Commands: `node identity.mjs`; `node --import ./source/node_modules/tsx/dist/loader.mjs probe.mts`; same loader with `boundaries.mts`; `node stitches.mjs`. All raw results/logs are adjacent. Original manifest still matches after testing.
- Did not generate any new movie, listen/transcribe, exercise300-second browser rendering, repeat cancellation/resource observers/native publication races, inspect a new model or provider, or certify audio rights. Actual SAPI provenance remains declared in recorded inputs/receipts. Old Chinese/Chen desired narration has not been supplied by these English technical fixtures.
- Three technical/source-role passes are bounded to measured76.75s media plus computed300s capacity. They do not mean five-minute product completeness, automatic arbitrary-project creation, semantic truth of arbitrary future input, pleasant narration, or final owner acceptance.
