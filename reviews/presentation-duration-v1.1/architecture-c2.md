# Independent c1 → c2 architecture / evidence / content-facts review

Architecture: PASS. Evidence: PASS. Content facts: PASS with one open minor picture/narration continuity observation. No blocker or major found in this bounded review. These decisions do not certify owner listening, continuous perceptual AV, automatic semantic understanding, or a real five-minute render.

## Identity and scope

Candidate SHA-256: `d3d0948fda6782cef33961a8c3b8695bb1ce0908c5b441b8ca325855487a80b4`.
Source commit: `94df39dc2886e90ad554d1e9fc724bc15be5578f`; Git tree: `41dfd08d6a0dd8fd92b782a9e1606eea1f274091`.

Read OPERATOR and actual contracts/source. Did not read builder verification logs/scripts, other judges, or their reports. Independently verified all 679 manifest entries twice, all 515 canonical Git blobs and all exact-archive bytes (exact and canonical archives have no content differences). Verified c1 manifest hash equals c2's previousManifestSha256. Candidate remains untouched; all independent writes are here.

Canonical c1→c2 diff has exactly six files: duration documentation, top-level CLI, presentation CLI/runtime, shared story-planner task reader, and presentation tests. No changes to schemas, compiler, frame state, composition, narration PCM/caption math, duration budgets or worker. Full independently obtained diff is source-diff.patch. The shared reader infers kind only after hashing the stored kind/input into the task ID; default callers retain their expected kind. Presentation then checks recognized kind and strict input schema. Resume for succeeded tasks verifies and returns cached; incomplete tasks must recompute the same ID before execution. This is task-level retry, not partial frame continuation.

## Independent execution

- New long movie: `e9d3b84616c8d7f3a39f7db6cda4e4ea460a2fb99f468b0fe0c254610b0d356f`, 1,842 frames / **76.75 seconds**, fully decoded by FFmpeg with error-fatal flags. FFprobe confirms H.264 and mono 48 kHz AAC.
- Read verified task `934471e420c6ba960d3120a4c60eb3bc5bbf656cbbc0c62312645ae1fc01291c`; every exported file matches its checked task/CAS closure. Recompiled proposal+plan equals persisted trace. Rechecked every citation against the included pinned source bytes, line range and exact quote.
- Independently decoded all 12 original recordings, compared normalized PCM exactly, checked receipt/text/hash identity and complete measured sample placement, rebuilt the entire padded reference mix exactly. Independently encoded AAC from that mix and extracted AAC from final MP4: bytes identical. Also extracted old c1 AAC: identical to c2. Original recordings, receipts, normalized clips, mixed PCM, subtitle bytes, clip cue positions, and exact transcripts are unchanged. Cue equality is not transcription or voice authentication.
- Compared all 98 new export files against old export: 86 identical. Changed files comprise revised plan/trace/parent bindings and media/sample evidence; timing and source narration were not silently rewritten. The only causal event change is request: frame 610 / request beat → frame 756 / keep-request beat. Listen 161, match 1061, respond 1519 remain unchanged; all 12 beat durations remain unchanged.
- Checked all 1,842 frame timestamps against n/24 (maximum rounding error 0.000000333334 s). Four declared absolute ranges [0,479], [480,959], [960,1439], [1440,1841]. Independently extracted and viewed frames 479/480, 959/960, 1439/1440, 1683/1841. Their numeric comparison to same-frame committed PNGs has RMS 3.48–4.18/255, consistent with lossy encoding; it is not a perceptual score. No sampled seam resets observed. Temporary pre-concat parts were not retained, so not independently reprobed.
- C1 and C2 long tasks both read and return cached resume with omitted kind. Wrong kind, malformed ID and absent ID reject with PRESENTATION_TASK_KIND, PRESENTATION_TASK_ID and EXPLAIN_TASK respectively.
- Typecheck passes. 25 tests pass across presentation and explanation-runtime after rerunning with native local hard-link permission. Initial sandbox attempt retained in targeted.log: 17 failures and 9 passes, including EPERM at hard-link publication; not suppressed. The additional story-preview test was in that initial failed run only and was not rerun, to avoid generating fresh media. No fresh long film was rendered. Successful rerun is targeted-local.log.

## Original finding and remaining minor observation

C1 CF-1's local symptom is repaired: within the unchanged keep-request cue (31.291667–36.085375 s), the request now appears at frame 756 (31.5 s), moves until frame 780 (32.5 s), then holds. Actual c1/c2 video frames at 610,634,700,751,755,756,762,768,774,780,820,866 were independently extracted. Contact sheets list these in row-major order. This proves movement somewhere within that cue; it does not establish word-level alignment across the whole 4.79-second recording.

**C2-CF-1 — minor, open:** moving the sole request event later leaves the entire previous request cue (24.875–29.823354 s) with an empty client card and no GET token, while caption/narration says “Now follow the illustrated client as it sends a GET request to that root path.” Actual frame 700 shows the omission; c1 at the same frame showed GET. The next cue calls it the “same” request, but c2 only first reveals it at 31.5 s. This is an adjacent visual/word continuity gap, not a false claim about Express or a source-integrity failure. Do not advertise all neighboring narration and motion as synchronized.

For a subsequent repair while retaining old audio/subtitles/mix: explicitly represent request preparation/send during the first cue and continued travel/arrival during keep-request, with one request identity and no unexplained reset. A configurable transition interval or explicit staged visual state is preferable to moving the same one-second animation between two cues. Verify both cue windows and retain the existing source/receipt bindings. This is a recommendation, not an implemented repair.

## Facts, assumptions and reused evidence

Included Express README is still pinned to commit `43fca52d28a422c8be48fd489cbd4f2d6152bab6`, SHA-256 `3cf5f3e224dbb9b5e2bc0ac255871de453762ae7a277f868da5f4a69d6ff2509`. Quotes support GET /, Hello World, and port 3000. Source/proposal bytes and diagram parameter values are unchanged. Request paths and durations are authored teaching choices, not recorded HTTP execution or measured latency. Viewed frames preserve “Local voice • Illustration • No observed execution.” Local Zira technical fixture is still distinct from Chen and owner-approved narration. No arbitrary-project support or autonomous semantic correctness inferred.

Reuse c1 evidence by impact: unchanged contract/compiler/duration/worker/narration files support retaining c1's v1.0/v1.1 compatibility, boundary rejection, budget and 300-second PCM/VTT arithmetic results. Those tests were not rerun here and are not new 300-second media evidence. Short Express/rembg facts and artifacts retain their prior review; this turn did not newly render/decode them. Newly changed inference/read paths received source review, 25 tests and direct historical reads. Cancellation/real interrupted resume were not independently repeated here; do not substitute OPERATOR claims for execution.

Actual rendered length established this turn is 76.75 seconds only. Actual five-minute rendering, speech transcription, identity authentication, naturalness, hearing, continuous perceptual AV and final owner acceptance remain unverified/pending. No target repository executed, no paid call, no deployment.

Raw evidence: identity.json, delta-results.json, probe-results.json, stitches-results.json, read-results.json, source-diff.patch, run/* extracted frames/audio/probe, targeted.log, targeted-local.log and typecheck.log. Machine-readable conclusion: report.json.
