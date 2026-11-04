# Independent sequence-v1 architecture / evidence / content-facts review

Candidate SHA-256: `74929d7e32245343e3373d8ec6fdf3d5cea241113e7552352b281ae2c90f8bda`.

**Architecture: PASS within the silent sequence 1.0 contract. Evidence binding: PASS. Supplied content facts and explicit assumptions: PASS within the bounds below.** No blocker or major was found in these reviewed roles. This is not an overall product/visual-quality gate or owner acceptance. It does not judge whether the hard cuts provide a satisfactory audience experience.

## Scope and identity

Read OPERATOR, actual `docs/presentation-sequence-v1.md`, sequence implementation, CLI integration, relevant existing readers and tests. Did not use builder verification scripts/results or another judge's report as proof. OPERATOR's run claims were treated only as instructions/context.

Independently matched all 555 manifest file hashes and lengths. The archive hash matches the manifest. All 552 extracted source files match either their Git blobs at base `369eea89f8eb50f2c65e693042b03f8b1968592d` or one of the six declared changed-file SHA-256 values. There were no missing base files or unexplained source changes. The exact candidate digest matches the assignment. The final identity recheck also passed. `identity.json` contains the per-file results.

All execution and state mutation occurred under this judge directory. The two frozen state directories were copied before probes. Dependencies were reused locally through scratch junctions. No target repository code, network fetch, paid service or candidate mutation was performed. An unavailable Windows `python` alias was replaced with built-in ZIP extraction; no dependency was downloaded.

## Contract and source/version binding

Sequence 1.0 is intentionally narrower than a narrated story composer: 2–4 complete successful silent previews; distinct scene IDs and preview IDs; explicit caller-authored order; hard cuts between independent illustrations. Narrated mode/children and arbitrary extra file-path fields fail. The combined movie has no audio and no global subtitle track. Retained child VTTs are explicitly scene-local. These limitations are stated in the operator and contract documents.

Each child is verified by the existing immutable presentation reader, including its plan/proposal/source/trace closure. Its manifest digest must equal the caller's expected digest. Exact canonical binding comparison covers projectId, repository, commit, snapshotHash and evidenceFingerprint; repository name alone is insufficient. New assembly also verifies the project's currently selected snapshot before dispatch and again before committing. Completed historical sequences remain readable after the project selects a newer snapshot, but their original child closure must still verify.

The sequence input records the ordered child IDs, expected manifests, plan task/hash, proposal hash, original movie hash and half-open frame spans, plus assembly implementation and FFmpeg/FFprobe version identities. The task fingerprint binds that full input; ordinary task reads independently recompute it. The final manifest is rebuilt and compared byte-for-byte with the stored result, and output hashes/lengths are checked. All review fields remain pending. The unchanged authoring identity implementation preserves old proposal request bindings; no capability-version bump silently invalidates those proposals.

The new implementation performs deterministic validation and media assembly. It contains no model call, scene invention, automatic narration generation, causal inference, semantic approval or execution of the source project. Caller-authored is a declared provenance field, not independently authenticated authorship. Source quote matching proves the submitted excerpt matches stored bytes; it does not prove general entailment.

## Actual outputs independently verified

| Output | Frames | Seconds | Verified audio streams |
| --- | ---: | ---: | ---: |
| p-limit, two slots then one | 983 | 40.958333 | 0 |
| p-limit, one slot then two | 983 | 40.958333 | 0 |
| rembg original and revision | 1128 | 47.000000 | 0 |

All three actual MP4s passed independent full FFmpeg `-xerror` decode. Each is a single video stream, 720×1280; all 3,094 frame PTS equal frame index / 24 within the printed timestamp precision. Summed frame counts match the child traces and contiguous manifest spans. Actual frame count—not only the declared total—was checked.

Compared the first and final frame of each child against its expected combined-movie position: 12 comparisons across the three sequences. After identical downscaling to 180×320 RGB, minimum PSNR was 46.2616 dB. This supports correct ordering and absence of unexpected trimming at those sampled edges; it is not perceptual-quality acceptance. Separately extracted and visually inspected four actual encoded frames around each join: before two frames and after two frames. The frames show the declared hard cuts and scene-state reset. Original illustration/no-observed-execution labels remain visible. No continuous playback or owner visual review was performed.

The p-limit forward/reverse outputs preserve the same child identities in opposite order and have distinct sequence IDs and movie hashes. Repeated assembly for all three exact specs returned the original task IDs with `cached: true`, verified integrity. Status and completed resume also worked with both media-tool environment paths deliberately set to nonexistent executables. This demonstrates those completed read paths do not require media execution.

## Facts and assumptions of the supplied scenes

p-limit is pinned to `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb`. Its README and implementation hashes match the independently authenticated pinned bytes in my prior queue review; this round rechecked the local hashes, all exact citation ranges and quote text, rather than refetching remotely. Both supplied plans use queue schema 1.3. One has four illustrative tasks/two slots; the other four tasks/one slot. The one-slot statement is supported by the README example. Admission below capacity, pending functions not yet called, and releasing capacity after fulfillment or rejection while preserving the caller's rejection are supported by the retained snippets.

Neither concurrency limit means starts per second. Names, interval lengths, outcome order and the two-slot parameter are explicitly illustrative. The two clips have different teaching durations and task names: their duration difference is not a controlled performance comparison and must not be described as a speed benchmark. The scenes reset at the join; they are not one continuous observed program execution.

rembg is pinned to `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`. Both child proposals cite the retained README's ordinary local-file command and `-om` mask-only example. Exact source bytes, quote ranges, source identity and proposal hashes were rechecked. The paper bird and monochrome shape are illustrative renderings, not images produced by running rembg or evidence of segmentation quality.

The rembg pair is specifically an original/revision fixture. Both already compare cutout and mask; the revision adds timing/one explanatory beat. It is not a newly authored cutout-only scene followed by a mask-only scene. This limitation is honestly disclosed by OPERATOR and confirmed by actual proposal text. It establishes assembly/revision compatibility for a second real source, not novel cross-mechanism storytelling.

## Independent adverse checks

Seventeen checks rejected as expected:

1. Unknown arbitrary file-path input.
2. One scene.
3. Five scenes.
4. Duplicate scene IDs.
5. Duplicate preview IDs.
6. Narrated mode.
7. Unsupported automatic-AI authorship declaration.
8. Wrong expected child-manifest hash.
9. A real rembg child mixed with a p-limit child, with both valid task/CAS closures available in scratch: SOURCE rejection.
10. New assembly after changing the selected current snapshot: STALE rejection, while the original historical sequence still verified.
11–14. Tampered child source text, proposal, preview manifest and movie: integrity rejection.
15–16. Tampered sequence movie and sequence manifest: integrity rejection.
17. Attempt to modify a successful task input under its original ID: the existing SQLite immutability trigger rejected the write, and the original record remained unchanged. This last rejection is a storage-layer result, not a claimed execution of the downstream task-reader hash check on a mutated record.

All six changed CAS files were restored byte-for-byte and verified reads resumed. Current snapshot and task data remained/restored as recorded. Raw codes and messages are in `negative-results.json`. The initial negative harness did not anticipate the immutability trigger and exited when that protection fired; `negative-first-run.log` is retained, and the corrected harness explicitly asserts the rejection. This was a judge harness correction, not a candidate code change.

## Tests, raw evidence and remaining limits

Independently executed TypeScript no-emit: PASS. Executed the frozen presentation, concurrency-queue and story-preview focused tests: 33/33 PASS in three files. Logs are retained. The test suite generated files only inside the isolated source copy's ignored `test-output`; the final identity script excludes that known generated directory and dependencies while rechecking all 552 archive source paths. `identity-with-generated-test-output.json` preserves the overinclusive intermediate scan so it is not mistaken for candidate corruption.

Raw evidence: `identity.json`, `probe-results.json`, `negative-results.json`, `cache-results.json`, `focused-tests.log`, `typecheck.log`, associated independent scripts, and `run/*-seam.png`. The evidence includes exact proposal claims, assumptions, bindings, frame spans and endpoint comparisons.

Not executed in this review: a fresh encode; original mid-encode cancellation/recovery; new export publication; four-scene output; a 300-second assembled movie; independent adversarial 7,200/7,201-frame assembly fixtures; continuous subjective playback; listening. The aggregate frame/byte guards were inspected in source, but the maximum assembly boundary was not independently exercised. Existing frozen three-movie decode results do not fill those gaps. No audio, AAC, global-caption or speech-alignment result is claimed for this silent candidate.

The original hard-cut presentation remains subject to independent product and visual-quality review. These scoped architecture/evidence/content conclusions do not waive another role's findings or certify an overall release. A 1.1 candidate must receive an impact-based recheck against its own frozen hashes and actual updated media.
