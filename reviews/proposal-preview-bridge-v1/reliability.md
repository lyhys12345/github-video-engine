# Independent reliability review — proposal-preview-bridge-v1-c1

Verdict: **PASS for the declared mapped, silent audience-v1 bridge, within the tested boundaries below. FAIL for the separately retained legacy generic export helper. No full-system safety approval.**

Reviewed 2026-11-03. This review used source and contract, raw frozen inputs/results, independent scratch, existing tests and independent probes. Builder narrative and other judges' reports were not consulted. All mutations occurred under this judge-engineering directory. No target repository, network fetch, paid service, deployment or installation was executed.

## Identity and evidence

- candidate.json SHA-256: `fb1972acf1bc55e6052540049d877b2d68136fe0c0470a1e581afd8d5801e8ef`.
- All 433 listed files matched both length and SHA-256 before and after review: `hash-check.json`, `final-hash-check.json`. These establish consistency against this supplied manifest; they are not a third-party signature or proof of origin.
- source.zip comment matched commit `1350dc3ffbcd9bb8c6e89d1030449be4409fc53f`; independent ZIP/Git object reconstruction matched tree `533586f11090d5facc5c071f6b2ec11591ca8b3b`, 486 files: `archive-check.json`, `git-tree/judge-archive.mjs`.
- Tests ran the extracted exact runtime archive, source-exact.zip SHA-256 `99972b3e1882eeba036ea419a03d9fc371df408f177eace021080f181251daf1`. Standard source.zip SHA-256 is `287fb290f55f414d3a2912a3364d6be5ad134aa33753725e719134814adb5ed2`. Their 54 file differences are exclusively CRLF/LF differences; no other content differences were found: `archive-runtime-difference.json`.
- Runtime code hash `223f19fd2f73fe4a21bfba8c18762714a5f37777c8e158b895c24e3bdded5a57` equals the code hash stored in all three original preview task inputs: `media-results.json`.

## Tests personally run

`node node_modules/vitest/vitest.mjs run tests/proposal-mapping.test.ts tests/story-preview.test.ts tests/asset-pack.test.ts tests/animation-task-adversarial.test.ts`

All 18 tests in 4 files passed (64.95 seconds): `tests.log`. Dependencies were the previously authorized local dependency tree, linked into scratch. Test TMP/TEMP were private scratch. These include actual renderer/export subprocess and cancellation/recovery exercises; some adversarial boundaries use deliberate mocks. In particular, interruption between Story and asset in proposal-mapping.test.ts is injected at TaskRunner.run, not a real killed adapter process.

Independent `engine/judge-bridge.ts`, `bridge.log`, `bridge-results.json` additionally establish:

1. Reopened the original Express, edited Express, and rembg Story, asset and preview tasks through current verification APIs. Verified proposal/mapping digests, adaptation identity at every layer, asset manifest binding in preview input, and recursive closure.
2. Changed the original Express proposal narration, submitted new proposal hash `39fa756b37838547bfb12e0c8bb17882c8dd6521496bacb5487c55f375712ec0`, adapted with mapping hash `735552a305c15432c87799ec9efeba54632a4610ec97b11bb166446f18f02c20`. New Story `047a986d63e6660349342f307b4f2a8d5b3549d1d3c84bf932f69dc1bb4fad0d` and asset `0d341f206e562b29518ba240442315df8791518951f8851c603affda3bcfe3ba` differ from originals. Repeated unchanged adaptation reused both caches.
3. Started real mapped rendering. A concurrent identical request failed with TASK_BUSY. Aborted actual render with AbortController; task became cancelled at attempt 1 and premature export refused. Resumed the same task `ae1e9bdec37b4618c3fe360d296f3c017ae8fe5e280393a58d28af69b80fa7ea`, completed at attempt 2, then obtained verified cache hit.
4. Mapped Story legacy export, legacy asset export, and legacy preview export all refused. Occupied destination with user.txt refused and preserved the exact user bytes. Default receipt-v1 export succeeded, repeated export reused it, and exported proposal/map bytes matched the new digests. Receipt hash: `1530bb2f3159ae6898fe47d1dae2399e92200d1e72512bc5449865856ffedc16`.
5. Corrupted the copied upstream mapping CAS. Status, export, and cached rendering all rejected the damaged artifact. Restored only scratch bytes, then corrupted copied preview media CAS; status and cache again refused. Restored bytes and verified successful integrity. No task temporary directory remained after successful recovery.

Independent `engine/judge-negative.ts`, `negative.log`, `negative-results.json` reopened copied actual p-limit proposals. The real unsupported mapping rejected with MAPPING_UNSUPPORTED (no mechanism for selected profile). A counterfeit HTTP-shaped p-limit proposal also rejected with MAPPING_UNSUPPORTED (selected storyboard and exact excerpts do not fit audience-v1). Neither ran p-limit.

## Actual media verification

`engine/judge-media.ts`, `media.log`, `media-results.json`: all three frozen MP4 files passed full FFmpeg -xerror decode and FFprobe inspection. Each is one H264 video stream, 720x1280, 24 fps, no audio stream:

| Artifact | Duration / frames | SHA-256 |
|---|---|---|
| Express | 9 seconds / 216 | 9202e0577720604cf709c93467af2446ade1262bef98476ac244986fd193a306 |
| Express mapping edit | 9.5 seconds / 228 | a7bd5a39fd3030dff5b4fb3c1e655b9124a307a78a9bc34d6210e02db8e1f27d |
| rembg | 9 seconds / 216 | 69f0fd21b041cb24be7adbabcaedff312fe978f2a182cb7721841763e99df399 |

The frozen edited mapping produced distinct Story/asset/preview IDs; the full IDs are preserved in bridge-results.json. The independent proposal change also produced a new preview. This tests both mapping-edit and proposal-edit identity effects.

## Source reasoning and compatibility

The mapping schema closes proposal hash, repository binding and authoringRequestId; compile checks exact beats and narration/visual intent, selected claims and citations, permitted actions and entities, and bounded text rather than silent truncation. Unsupported patterns fail closed. Source freshness checks occur before and after adaptation stages. Story verification recompiles mapped material and checks exact persisted files. Asset verification reopens Story and checks material/sourceStory/graph. Preview verification checks the asset closure, input environment, output file closure, mapped metadata and recomputed captions. Mapped rendering is restricted to silent audience-v1 and review remains pending.

Existing nonmapped repository Story/asset/narrated preview tests passed alongside mapped tests. This is compatibility evidence for those exercised legacy contracts, not a complete migration test over every historical database/schema/version. No claim that hashes prove semantic correctness: quote existence and provenance remain distinct from semantic, editorial and audiovisual review.

## Retained failures and limitations

The old generic publishReviewExport remains unsafe under local directory replacement: both original race probes reproduced in this exact candidate. See security.md for severity, preconditions, exact impact and evidence. It is not used by the tested mapped export paths, which reject legacy publication explicitly.

UNVERIFIED: mapped adapt process hard-kill specifically; OS reboot/power-loss persistence; every possible interleaving or hostile same-user mutation; cross-platform filesystem behavior; privileged/file-symlink attacks; every historical database migration; fresh network capture; target repository runtime; pixel/animation editorial quality or continuous human playback; linguistic semantic truth of every narration sentence. Real mapped cancellation was AbortController; hard-kill/recovery evidence comes from shared existing runtime tests, not an invented mapped hard-kill result. The full frozen candidate was untouched and rehashed after review.
