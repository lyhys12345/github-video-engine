# narrative-audio-c2-caption-safe / independent reliability + security

- Result: PASS for the caption-safe narrated technical excerpt engineering slice; no blocker/major found. Speech content, listening, alignment, facts, continuous perceptual AV and owner acceptance remain unverified/pending.
- Judge: audio_security_judge; Windows, local Node24.22.1/ffmpeg/ffprobe; 2026-11-05. Independent output C:/Users/luyuh/Documents/Codex/audio-security-judge-c2.
- Candidate commit c8a0c814535eaa33e24c3546719cb4709b6ad2ae. candidate.json SHA256 de9393b86b79f7c1239b2a0c30f02b4c637edb9817824a5a4437dc8d9c8b7b8f.
- Contract: source/docs/narrative-audio-caption-safe.md, preserving old1.0 as separate legacy profile. Prior AGENTS/common/report rules remain applied. No peer report read before verdict; no candidate modification, target execution, source-snapshot execution, network, paid API or publication.

## One-page conclusion

Fresh independent checks reproduce the freeze identity and all media/PCM properties for all nine narrated bundles, including baseline, edit, relocated, restarted and recovered outputs. The new renderer's half-open caption timing is confirmed directly from 3780 decoded video frames. The bottom160-pixel region has caption-colored bright pixels exactly on the ledger intervals and none outside them, including all cue start/end boundaries, gaps and lead. All nine movies contain exactly one H264 and one AAC stream with no subtitle stream. HTML has no track element; VTT remains editable export data.

The old1.0 audio implementation, common decoder, movie stream verifier, TaskRunner and process wrapper are byte-identical to the previously reviewed C1. The new1.1 implementation retains independent schema/task-kind IDs and adds a reserved caption viewport, fixed file names, pinned font and expansion-disabled textfiles. It does not weaken the old1.0 three-stream or other old silent/narrated defaults.

## Clauses and evidence

| Requirement | Verdict | Method / raw evidence | Limits |
| --- | --- | --- | --- |
| Frozen identity | PASS | audit.cjs/audit.json independently hashes candidate and manifests, verifies all741 source and1434 material bytes/hashes; zip.json compares741 archived source entries with zero mismatches. All header hashes equal candidate. | Did not independently inspect Git object store. |
| Clock / complete raw recordings / gap silence | PASS | Own full raw decode of two source recordings in each of nine bundles; exact byte reconstruction of whole1344000-byte mixed PCM equals originals at recorded positions plus zeros. 672000samples=420frames*1600 at48k/30fps. Express126000/131520samples; rembg126960/126720samples. Each recording and caption stays inside scene/clip. | Digital silence proven on lossless PCM, not zero-valued AAC boundary samples. No listening inference. |
| Media streams and full decode | PASS | Own ffprobe and full ffmpeg decode on nine movies:420frames30fps,48k audio, strict2 streams, no subtitle. New assembly uses verifyMovie default narrated2 plus explicit no-subtitle assertion. | Codec checks do not prove perceptual quality. |
| Caption temporal boundary / silence during lead/gaps | PASS | Own caption.cjs/caption-frame-audit.json decodes all420frames per movie and measures >200 gray pixels in bottom720x160 crop. All3780frames match startFrame<=frame<endFrame. Express162 active frames/movie, rembg160, zero mismatches. Minimum active-frame bright-pixel count262; threshold20. | Pixel presence detector does not OCR exact wording or demonstrate natural speech alignment. |
| Caption command/data safety and spatial bounds | PASS (code) | narrative-audio-safe.ts keeps authored text in fixed owned caption-i-j.txt with expansion=none, pinned font.ttf and generated integer filter parameters; no prose shell/filter interpolation. shell:false unchanged. Complete source viewport576x1024 at72,96 ends1120; bottom160 reserved. Text rejects control/unsupported classes and >3lines*22chars; no truncation. Text source partitions remain exact and source font hash checked by makeMovie/fontBytes. | No new adversarial FFmpeg rendering of arbitrary punctuation; decoded candidate pixels plus code inspection support safety. No third-party player claim. |
| Legacy1.0 compatibility | PASS (impact analysis) | legacy-comparison.json: narrative-audio.ts, narration.ts, story-planner/preview.ts, orchestrator/tasks.ts, core/process.ts all byte-identical C1/C2. Narrative safe uses schema1.1 and task kind v2; old schema1.0/task kind v1 remains. Shared makeMovie sourceLayout option only changes explicitly requested caption-safe-1 branch; old default viewport unchanged. | No new legacy render run; old fresh C1 media results retained only for unchanged behavior. |
| Modified text / receipt / source / overflow / gap / caption tamper refusal | PASS (code + raw historical checks) | Frozen evidence/express/negatives.json and rembg equivalent preserve seven rejected cases. Exact current text, local receipt/audio hashes, clip-scene bijection, full-char partition and sample/frame bounds checked before assembly. checked() verifies CAS/input fingerprint, re-inspects execution and compares PCM/VTT/ledger/packet hashes. Both original and edited actual bundles pass own decode and frame audit. | Did not execute frozen engine negative tests afresh; raw cases are corroboration, distinct from my independent decoder runs. |
| Cancellation/recovery | PASS (durable-state review) | Own state.cjs opens frozen relocated tasks.sqlite readOnly; recovery-state.json contains same-ID attempt1 cancellation then attempt2 success, new owner and consistent terminal receipts. Recovered movie independently satisfies full PCM, stream and caption-frame checks. TaskRunner/process wrapper unchanged and signal/owned-tree cleanup remains scoped. | Controlled cancellation only; no force-kill claim. Transient cancelled result:null/outputs:[] reviewed through initialization code and frozen recovery.json, not independently observed live. |
| Edit identities / honest pending status | PASS | Actual result/edit-result task/packet identities differ; PCM position shifts and decoded caption windows match each edited ledger. New schema, task kind and execution packet include viewport/font/wrapped lines/frame intervals. Facts/listening/owner states remain pending. | Current semantic truth not approved. |

## Actual verification

- node C:/Users/luyuh/Documents/Codex/audio-security-judge-c2/audit.cjs: exit0. Own code/crypto/decoders; audit.json.
- node C:/Users/luyuh/Documents/Codex/audio-security-judge-c2/caption.cjs: exit0; 3780decoded frames, zero schedule mismatch; caption-frame-audit.json.
- node C:/Users/luyuh/Documents/Codex/audio-security-judge-c2/state.cjs: exit0; read-only SQLite extraction; recovery-state.json and state.log.
- PowerShell read-only ZipFile/SHA256 comparison:741entries, zero mismatch; zip.json.
- PowerShell SHA256 pairwise unchanged-file comparison: five specified shared/legacy modules identical; legacy-comparison.json.
- Builder affected72/full483/mechanism evidence exists but is not represented as my execution. No engine runtime/test suite was run in this independent review.

## Findings / limits / recheck

No blocker/major found. C1 selectable-caption behavior remains historical; this PASS applies only to C2's explicit1.1 burned-caption profile. The old docs/narrative-audio.md describes1.0 and is intentionally not the new caption-safe contract.

Frame pixel detection establishes on/off timing and reserved-band visibility for these exact artifacts, not universal glyph rendering, OCR correctness, readability at every player scale or speech alignment. Spatial safety is supported by fixed geometry and bounded text layout; video-quality/product judges remain responsible for human visual inspection and source content legibility. Natural listening and final owner acceptance remain pending.

Changes to source, mappings, font, movie or receipts require a new freeze and affected regressions. A stale receipt accepted at runtime, a mismatched CAS output accepted, a clipped original, nonzero lossless gap mix, shifted caption boundary or extra stream would change this verdict.
