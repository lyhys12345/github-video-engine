# Independent architecture / evidence / content-facts review

Candidate SHA-256: `a07052f525a69e67981ab88edd46e203a29fe95ecfd5991de487fbf948409d43`.

**PASS for the stated temporary-path stability repair and tested historical compatibility. No blocker or major issue found.** This is not a certification of bit-identical final sequence rendering: independently decoded sequence pictures still differ across the two supplied executions. The operator explicitly discloses that limitation.

## Frozen identity and code boundary

Independently checked all **1,708 manifest entries** (unique bounded relative paths, sizes and SHA-256), ZIP hash `b491e1f2293e6f4015fc0876ddd6d0620e0e064d72ab1f46fcbe304bb10efacf`, and all **577 source files** against Git base `894c5ca612e74481d8015c2e8012a75e8098040e`. Only the declared `src/presentation/runtime.ts` differs: old SHA `3fe04af28af56e39fde5dcbf8dc5ced6b081cfa5c963ec0443fe20cf1322eea2`, new SHA `bc34eca2d75eeb9d8a4c2abc5ba659d2bba88425aefbcd9b16c925496c01e150`.

Read OPERATOR and actual code/contracts. Other judge reports and builder audit scripts/results were not used as proof. Inspected frozen task databases/events, payloads, and the first direct execution-log entries; performed the checks below with independent scripts. Frozen candidate files were never modified. Tests used extracted engine code and copied state under this directory, not rembg/Express target code. No paid provider, fresh speech generation, or external publication occurred.

## Version and identity behavior

The new literal `mediaMetadataProfile: ffprobe-no-location/1` is optional only for historical parsing, without a schema default. All newly submitted silent and narrated previews explicitly include it in their persisted input and task fingerprint. `previewManifest()` includes the input fields. `verifyMovie()` still verifies the unmodified probe and fully decodes the original media; only afterwards does the new writer copy probe/format and remove `format.filename`. The public verifier and old Story preview path were not changed.

New-profile reads reject absent/non-object/array format and any own `filename` key, including null. Unknown profiles fail input parsing. Manifest reconstruction, media SHA, geometry, frame count, voice/plan/source references, captions, and CAS checks remain in force. The reader does not silently remove bad fields to accept new data.

Successful historical tasks retain their original raw manifest and filename. Their status, export and cached resume continue through the historical branch; no artifact reserialization or backfill is performed. Historical failed/cancelled preview tasks explicitly refuse resume before dispatch and require a new submission. Old sequence specifications still bind their exact historical child-manifest SHA. New code/environment identity and the metadata profile create new task IDs as intended; cross-version identity equivalence is not claimed.

## Independent checks of the two supplied executions

Each frozen arm contains two new narrated rembg child tasks, one silent Express child, and one sequence assembly. None of these IDs exists in the common pristine input database. All eight arm-specific task records have `attempt=1`, a successful result, separate owners/start-finish times, and `task_started` followed by `task_succeeded` events. I independently recomputed every task fingerprint from persisted kind/input. All **40 pristine task JSON rows** remain identical in both arms. These durable records support separate work executions rather than repeat cache-only requests; this reviewer did not personally rerun the six costly renders or witness their original processes. The operator's specific six temporary pathname observations were not independently re-observed live.

Both arms have identical IDs and manifests for:

- rembg original: task `53e9d8ba441c7206c65471cf7489366e7b3792aedbd1fa437de8761313eeb09e`, manifest `80d1da62c1c7fe0daa6ef1e3a7b024b76d894d4a73fbb1fa675e958d1921d963`.
- rembg first-recording offset variant: task `7cdb29e216894f69e6d2b0a85e744a96be6a7a80279d47fb9451bc5fa1c6d01c`, manifest `79290fd4f72259830e27971e31e2e3e48714a12adb62a4b63d51c0360f28236a`.
- silent Express: task `2c8d31fb2f692c6771953410df5740d992f8a883301236050fe743a4b8c68173`, manifest `a4e2c74f2f0b690c42c73af069c1c27eb29b8cda49da76a2a048bc08031eeed3`.

For each rembg scene, all **29 exported payload files** match A/B exactly. All except preview-manifest are also byte-identical to the previously reviewed rembg c2 scene, including media, samples, sources, proposal, plan, trace, recordings/receipts, PCM and subtitles. Manifest differences from c2 are precisely the profile, omitted filename, new task identity, and changed `environment.codeHash`; the latter correctly reflects the changed engine source. No factual or media alteration is hidden by normalization. Both new rembg manifests omit filename. Silent Express movie and manifest hashes independently match in both states as well.

Both new sequence inputs are exactly equal and produce task ID `71536d5dd5cace2fc5d2f62505437e2766418949255080c3876d73f6e6941648`. The exact child manifest references have not been weakened or replaced by a lossy equivalence hash.

## Independent media and content checks this round

Both actual sequence MP4s passed complete two-stream decode and all **1,204 video PTS** checks. Each declares **2,408,000 samples / 50.166667 seconds**. Independently decoded original clip instances and reconstructed both child mixes and sequence PCM: all **4,816,000 bytes** match SHA `95d9ddeee52cc36542c93da047dd271175c6fae1536de9397c555da096b9158b`. All **10 VTT cues** match text/receipt hashes, exact captured proposal narration, sample/frame projection and caption ledger. Chapter [584,620) contains 72,000 zero samples in both source PCM and decoded AAC. Raw AAC includes 448 padding samples beyond the intended interval.

Independently re-encoded reconstructed PCM and compared the entire extracted ADTS stream for both arms: **350,728 bytes**, SHA `3ec6bb8a9ad4a098a9b90ea142d3d68317c2f268e9f1f9b492ee4225cae0470d`, exact. PCM/VTT/caption-ledger/AAC all match A/B and the prior c2 audio/timing evidence.

Captured source quotations were checked again against local source bytes. The retained rembg binding is commit `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`, with unchanged normal and mask-only command examples. The bird/mask/cutout are illustrative and source supports the bounded command/output-option explanation, not observed rembg execution. This review reuses the prior c2 content interpretation for byte-identical material; it did not refetch GitHub, execute targets, perform ASR, or approve owner listening. Caller text/hash matching is not transcription verification. Existing pending semantic/editorial/listening/owner flags remain.

## Copied-state and adversarial tests

With FFmpeg/FFprobe paths disabled, independently tested five child previews (two old rembg, two new rembg, new silent Express) plus old/new sequences: verified read/status, cached resume, exact export, and repeated export all pass. The old manifests retain filename and lack the new field; new manifests carry the profile and no filename. All original **393 copied state files** remain unchanged through these positive checks.

Created separate immutable, hash-consistent tasks through TaskRunner rather than altering successful historical rows. Eight new-profile attacks were refused: populated filename, null filename, missing format, array format, unknown input profile, missing manifest profile, wrong media SHA and wrong stream width. Two additional historical failed/cancelled fixtures refuse resume with `PRESENTATION_RESUME_INPUT` before the dispatch callback. Final checks preserve all original artifact bytes and **44 original task rows**. Raw errors and identities are in checks.json.

Independently ran TypeScript checking and the focused presentation/concurrency-queue/TTS tests: **54/54 pass**. First restricted run encountered Windows hard-link EPERM (6 failures, 48 passes); rerunning with native filesystem publication permission passed all tests. Mocked TTS tests did not call a paid service. The whole default suite and live cancellation of an active new-profile renderer were not run.

## Remaining limitation, not concealed by this verdict

Final sequence movies differ: A `f15bf2a6b363d07c386508c6bc5f2483685ec6b604a4d8365ca032ba9e494313`; B `954b07b0578208c8eb9ad85f8d30bbb939bc29728b3e60fecac78ec8b64161ec`. Independently decoded picture hashes also differ (see compare-media.json), so this is more than container metadata variation. Their manifest hashes correctly retain their actual movie digests. This patch demonstrates stable child identity and sequence input identity against the recorded FFprobe-path issue; it does not establish globally deterministic encoded or decoded sequence pictures, transferable output identity across machines, or automatic authoring. The two successful outputs live in separate states and were not overwritten or merged. If later work requires bit-identical re-rendered sequence pictures, that is an explicit additional gate.

Raw evidence: identity.mjs/json and logs, checks.mts/json/log, media.mjs plus media-a/media-b outputs, compare-media.mjs/json/log, typecheck.log, focused-native.log. Initial identity harness errors (wrong SQL table name; overly narrow expected diff excluding legitimate codeHash change) were corrected without changing the candidate; logs remain. This is a bounded technical review, not a subjective audiovisual PASS.
