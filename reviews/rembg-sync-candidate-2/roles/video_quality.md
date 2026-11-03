# rembg-sync-candidate-2 / video_quality

- Role: video_quality, frozen `source/reviews/judges-v2/roles/video-quality.md`, common rules and report template.
- Active scope: P4, P6, P8; corresponding R2–R4 and R6 video-quality obligations.
- Candidate manifest SHA-256: `4c96c26e364dca2c1eda1efce5bbf0196de774866779af577bd81be39613f566`.
- Review: 2026-11-02, approximately 17:23–17:29 America/Los_Angeles, local macOS, read-only frozen input. Output: `work/unreviewed-preview-v1/judges/candidate-2/video_quality/`.
- Overall role verdict: **UNVERIFIED** for full continuous audiovisual quality and listening. **PASS for the bounded technical and inspected-sample visual subset.** No observed blocker/major in that subset.
- Independence: read frozen AGENTS, common/role rules and both P/R contracts before substantive evidence; no peer reports or votes read. Evaluations were treated as claims, independently checked where stated. No repository target execution, render, inference, network, spending or frozen edits.

## One-page conclusion

Both real clips are technically intact and retain the same complete original recording at original speed. Each MP4 independently probes as 977 frames, 30 fps, 1080×1920, H.264/yuv420p, 32.566667-second video, with 48 kHz stereo AAC. Both fully decode with exit 0 and empty error logs. A fresh FFmpeg decode/resample of the original source matches the frozen planar PCM reference; both narration stems contain this entire PCM sequence byte-for-byte after 19,200 silent samples (0.4 seconds), followed by 29,315 silent samples (0.610729 seconds).

Inspected actual PNGs communicate a coherent bounded explainer: picture → foreground mask → apply mask → retain the same subject → change background and inspect edges. Text and subject fit within the native portrait frame. The long captions remain within two-line panels. Teaching/simulation and model-not-executed disclosures remain legible during content. Candidate 1's orange “自动对齐·待听审” badge is independently visible at exact first/middle/last frames 0/488/976, including outside the content fades. Candidate 2 legitimately lacks that badge on the owner-declared reviewed route; its metadata still limits the evidence to the user's six internal boundaries.

The owner's exact “六处已听审，切点均合适” statement is scoped to six auditions. It does not establish this judge's listening, full transcript accuracy, whole-clip perceptual timing, film acceptance or G6. This judge did not perform continuous playback or listen to any audio. Those dimensions remain UNVERIFIED. AGENTS' owner AV deferral permits conditional engineering to proceed while retaining this status; this is not an all-role or G4/G6 PASS. A later Terra PNG supplement remains separately required by contract and was not used as proof for this independent report.

## Clauses and evidence

Paths below are relative to frozen candidate `work/unreviewed-preview-v1/candidates/candidate-2/` unless identified as judge output.

| Clause | Verdict | Evidence / method | Limit |
| --- | --- | --- | --- |
| P4 honest unreviewed output | PASS | `evidence/unreviewed-preview/{timeline.json,evaluation.json,alignment-draft.json,captions.unreviewed.srt}`; actual samples 0,488,976 show pending badge; timeline has purpose owner-review-preview, explicit unreviewed method/confidence; evaluation retains timing/content UNVERIFIED, owner/G6 pending | Badge inspected at listed samples, not every frame visually |
| P6 / R2 / R4 actual media | PASS technical subset | Independent FFprobe frame counts, FFmpeg full decode and PCM comparisons in judge `checks.json`, `*-probe.stdout`, `*-decode.stderr`, `independent-pcm.json`; both exact source-audio hashes present in validated manifest closure | AAC is lossy; exact PCM claim applies to intermediate narration stems, not encoded AAC. No listening implied |
| P8 visual inspection | PASS sample subset | Native 1080×1920 actual PNGs viewed through image viewer; 25 total frame observations across both clips, including six adjacent cut pairs on owner-reviewed clip | Not a real-time playback assessment; no continuous motion or perceptual pacing verdict |
| R3 limited reviewed confidence | PASS | `evidence/owner-reviewed/{cue-timing.json,timeline.json,evaluation.json}`: caller-declared reviewed timing, independent UNVERIFIED and owner pending; separate owner record has exact six-boundary response and explicit whole-film/G6 limits | Owner statement accepted as the contract's supplied scope; no independent hearing inference |
| R6 / P8 continuous AV, independent listening | UNVERIFIED, explicitly deferred | Role rules and frozen AGENTS owner-deferral authority; owner record retains independentJudgeListening UNVERIFIED and wholeFilmListening/G6 pending | Requires actual final owner AV review; sample/technical PASS cannot substitute |
| Freeze identity relevant to this review | PASS | Manifest SHA matches supplied SHA; all 429 evidence-file byte counts and SHA-256 values match; all six frozen rule/contract files checked against source manifest | Not a full independent implementation/security audit |

## Check record

Own inspection script is retained as `check.py`. Exact command arrays, exit codes and raw stdout/stderr paths are in `checks.json`; all media probe/decode/extract commands exited 0. `independent-pcm.json` records the fresh source conversion command and byte-match result. `visual-observations.json` records frames actually viewed, source-rule hash checks, observations and explicit no-listening/no-continuous-playback flags.

MP4 hashes:

- unreviewed-preview: `4c7c2e856dee456779a5acbcb6e106ba34db56a4400cba6767b7a9cc04f78c2f`.
- owner-reviewed: `a045b9b610c6752026b26539116bd4fe8d8c986b768bb2d7c3574ed0e4aff960`.

Actual viewed frame indices:

- Unreviewed preview: 0, 488, 583, 584, 800, 976.
- Owner-reviewed: 0, 56, 99, 100, 215, 216, 273, 329, 330, 400, 401, 492, 583, 584, 692, 799, 800, 958, 976.

Owner-reviewed exact endpoints 0 and 976 were decoded from its existing MP4 into this judge's output directory (`owner-reviewed-0.png`, `owner-reviewed-976.png`); no video was rendered. Other samples came from each frozen `evidence/<mode>/samples/` directory. Images were presented natively at 1080×1920 through `view_image`; phone/platform overlay conditions were not emulated.

## Timecode observations

| Time / frame | Dimension | Observation | Impact / severity | Evidence |
| --- | --- | --- | --- | --- |
| 0.000, 16.267, 32.533 / 0,488,976 | Honest preview marking | Orange pending badge visible in candidate 1, with dark fade endpoints; no overlap with middle-frame title or caption | P4 satisfied in required samples; no defect | unreviewed samples |
| 1.867 / 56 | Understanding | Project name, goal, original subject and concise question visible | Introduces input and desired result clearly | owner-reviewed sample |
| 3.300→3.333 / 99→100 | Cut 1 | Caption and heading switch together; subject remains visible | No sampled discontinuity/crop; auditory cut unverified | owner-reviewed samples |
| 7.167→7.200 / 215→216 | Cut 2 | Mask inset persists while caption changes to white/black semantics | Readable teaching sequence | owner-reviewed samples |
| 10.967→11.000 / 329→330 | Cut 3 | Caption changes to applying mask; inset visible at transition start | Sample is consistent with subsequent mask overlay | owner-reviewed samples |
| 13.333→13.367 / 400→401 | Cut 4 | Aligned mask shown, new caption introduces reveal | No clipping; animation evolution between these frames not assessed | owner-reviewed samples |
| 19.433→19.467 / 583→584 | Cut 5 | Checkerboard and same subject retained; longest caption fits within panel | No text overflow; candidate 1 badge also remains separate | both clips' samples |
| 23.067 / 692 | Understanding | New background and magnified same edge visible | Supports boundary-check teaching | owner-reviewed sample |
| 26.633→26.667 / 799→800 | Cut 6 | Caption changes to explicit synthetic demonstration/no model execution | Disclosure is readable and not contradicted by image | owner-reviewed samples; candidate 1 frame 800 |
| 31.933 / 958 | Disclosure | Closing caption and central caveat say synthetic teaching, real effects depend on model/image | No execution-proof claim | owner-reviewed sample |
| 0–32.567 seconds, both clips | Continuous motion/audio | No continuous watching or hearing performed | UNVERIFIED, owner-deferred dimension, not a proven defect | explicit reviewer limitation |

## Findings and recheck

No confirmed blocker or major in the inspected visual/technical scope. No new aesthetic standard was introduced. The current frozen visual plan and story are the comparison basis; the same-subject mechanism and teaching disclaimer are visibly represented. External reference-video style matching was not newly verified and is not claimed.

The smaller disclosure footer is legible at native dimensions but sits near the bottom; platform overlay occlusion was not tested. This is a viewing-condition limitation, not an invented contract failure. Sampled subtitles and principal teaching content have useful margins.

This is a fresh candidate-2 review, not an overwrite of historical failures or UNVERIFIED reports. No fix was requested or applied. If audio, timing, badge placement or rendering changes, bind a new candidate and repeat the affected exact frame pairs and full technical checks. Actual continuous watching/listening could change the deferred judgement and must be recorded with its real scope.

## Judge limitations

Most likely omissions are transient animation defects between samples, perceptual pacing, actual intelligibility, audible clipping/pauses, and speech-to-caption semantic alignment. A successful decoder, identical PCM sequence, supplied transcript or owner boundary report does not settle any of those. No full-film, all-role, independent listening, G4 or G6 acceptance is granted.
