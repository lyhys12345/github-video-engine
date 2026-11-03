# rembg synchronized short candidate 2 / CONTENT_FACTS

- Role: content_facts, frozen `source/reviews/judges-v2/roles/content-facts.md` and `common.md`; active under `unreviewed-preview-v1-contract.md` P1/P8 and `rembg-sync-candidate-2-contract.md` R1/R3/R6 as relevant to honest content and review claims.
- Candidate root: `work/unreviewed-preview-v1/candidates/candidate-2`; all evidence/source paths below are relative to that root unless stated otherwise.
- Manifest SHA-256: `4c96c26e364dca2c1eda1efce5bbf0196de774866779af577bd81be39613f566`; base commit `966358c807f14a84ea90986bcc13fcfd1132d1d0`.
- Review date: 2026-11-02 America/Los_Angeles; end evidence clock 2026-11-03T01:24:27Z, report written immediately afterward. Exact start clock was not recorded. Local read-only shell, Python standard-library data checks, and `view_image`; output only in this role directory.
- Conclusion: **PASS for the activated factual/text/source/disclosure scope of this bounded engineering candidate.** Actual spoken transcript, independent listening, perceptual timing and continuous audiovisual quality remain **UNVERIFIED / owner review pending**. This is not G6 or all-role approval.
- Independence: formed factual findings from pinned source bytes, script/subtitles, current PNGs and current review records. No current candidate peer report or builder summary was used. A broad metadata search incidentally returned snippets from historical prior-candidate final-review files; those snippets are explicitly excluded as evidence. Current role findings do not depend on those votes.

## Conclusion

The seven written narration/subtitle segments are consistent with the pinned rembg implementation and with an explicitly authored, simplified mask illustration. The inspected images show the same illustrated foreground, a white foreground mask, mask application, a checkerboard transparency region, a replacement background and an illustrative magnifier. Every inspected content frame carries “图形教学重建 · 非目标项目实际执行录像” and “合成插画与蒙版示意 · 未运行 rembg 模型”. The closing subtitle separately states that no model was run. There is no performance benchmark, measured success-rate claim, or claim that these illustration pixels were a rembg model result.

The six-boundary owner response is retained verbatim and is correctly limited to six subtitle cuts. The sidecar's reviewed method is not presented as independent listening or whole-film acceptance. No unresolved blocker or major factual finding was identified. This scoped PASS must not erase deferred audio/AV UNVERIFIED states or historical reviews.

## Clauses and evidence

| Clause | Decision | Direct evidence and method | Limit |
| --- | --- | --- | --- |
| P1 unchanged written content/source | PASS | Both source packs have story SHA `c668636e711494926cfc8adc4e2a12fa60c7b2b66acf4318c3ad3cf5c5376ba9`; both SRT files are byte-identical, SHA `ed79080b50d42017c5a11f09a2f821a6306f239dcfbe933b3abe815f522669be`; independent text concatenation check matches all seven story shots. Both captured source-audio files hash to `31c470430fff5f25995b98ff7194af8057c488acd426d6b6cd0cfa5dbb03b4d5`. | Hash/text equality is not listening or proof that every spoken word matches. |
| P8 factual source sufficiency | PASS | Personally read `evidence/owner-reviewed/source-pack/sources/implementation.txt`, especially 99–157 and 270–395; cross-checked all eight cited line spans in both provenance files. Source SHA `2e1977b6d16d5369e2c20c5ca5d9ba2e2c0228f8beef39c5d2296df1879df62b`, recorded official URL pins rembg commit `c5b48b0417a0254df7d461efa14573597f369a83`. | Local pinned snapshot review; no network freshness claim, platform benchmark or target execution. |
| P8 visible illustration disclosure | PASS | Personally opened seven owner-reviewed content PNGs spanning every caption, plus two unreviewed content PNGs; exact paths below. Checked preserved provenance and authored geometry implementation. | Sample-based factual review, not continuous playback assessment. |
| R1/R3/R6 owner-review scope honesty | PASS | `evidence/owner-boundary-review-2026-11-02.json` records question explicitly excluding film/G6 and response “六处已听审，切点均合适”; `evidence/owner-reviewed/cue-timing.json` reviewBasis repeats boundary-only scope; evaluation retains independentTimingReview UNVERIFIED and owner acceptance pending. | Owner declaration accepted as scoped evidence; I did not listen to auditions. |
| P8 / R6 deferred speech/AV/G6 | UNVERIFIED / pending, explicitly deferred | Generation receipt says submitted-text declaration, not independently heard/transcribed; evaluations preserve listening/continuous AV pending. AGENTS and contracts explicitly defer owner AV. | No factual PASS for unheard spoken content; no full AV or G6 PASS. |

## Claim table

Source for C1–C5 is the pinned official `rembg/bg.py` snapshot above. Times are output SRT ranges, identical in both modes.

| ID / sentence or time | Category | What source supports | What it does not support / actual run evidence | Decision |
| --- | --- | --- | --- | --- |
| C0 0.400–3.333 “一张图，怎样只留下主体？” | Framing question | Sets the explanation's question, no measurable promise. | Does not promise perfect extraction of arbitrary images. | PASS |
| C1 3.333–7.200 “rembg 先让模型预测前景蒙版。” | Documented mechanism | Lines 322–328 create/use session and call `session.predict(img)` to obtain masks; 280 describes foreground masks and cutout flow. | Does not establish prediction accuracy or that this example ran the model. No target-run evidence is asserted. | PASS |
| C2 7.200–11.000 “白色区域保留，黑色区域变透明。” | Simplified binary-mask explanation | Lines 99–112 composite source image against transparent RGBA through mask; 146–157 apply alpha. The diagram labels white/black consistently. | Real soft edges can have intermediate alpha; statement is within a disclosed schematic, not a claim every model output is exclusively binary. | PASS |
| C3 11.000–19.467 “把这张蒙版盖回原图…同一个主体，没有重新画一遍。” | Documented basic cutout, illustrated | Lines 99–112 and 369–378 use original image and predicted mask. PNGs 365/492 and authored `source-photo` / `foreground-mask` geometry show same source foreground retained. | Optional edge decontamination/matting can modify edge colors. Narration does not claim pixel-for-pixel invariance across every optional mode or generation of new subject detail. | PASS |
| C4 19.467–26.667 “它现在可以放到新的背景里。” | General compositing inference / example | Lines 380–385 apply a background color to resulting cutout; retained transparent foreground is suitable for compositing. PNG 692 shows authored background replacement. | Does not establish arbitrary background generation by rembg or an observed model run. Provenance explicitly categorizes general background reuse as inference. | PASS |
| C5 same segment “放大边缘，再检查有没有多留或漏掉的细节。” and closing on-screen “真实效果取决于模型和图像” | Cautious inspection advice/inference | Source 284–292 describes matting and soft-edge refinements; 115–143 describes color fringing. Actual illustration magnifier reuses source geometry at authored scale 2.1 in `source/src/short-segment/continuous.ts`. | No measured defect, measured quality gain, success rate or actual rembg edge result. Scale 2.1 is authored illustration geometry, not performance. | PASS |
| C6 26.667–31.967 “这里用合成插画演示处理原理，并没有实际运行模型。” | Disclosure of authored demonstration | Source-pack provenance says `authored-diagnostic-illustration-not-observed-execution`; local rendering source constructs geometry/mask; visible PNG disclosures agree. | Cannot prove spoken delivery without listening; written and visual disclosure are verified. | PASS for written/visual facts; audio UNVERIFIED |
| C7 owner declaration / sidecar | Review provenance | Exact owner question/answer and explicit boundary-only scope; independent timing/whole film/G6 remain pending. | Does not establish transcript correctness, independent judge hearing, or whole-video acceptance. | PASS for scoped record |

## Actual image inspection

Used `tools.view_image` via `functions.exec` on these existing, manifest-bound actual PNGs; observed full 1080×1920 portrait images in tool output. No new rendering or image editing was performed.

- `evidence/owner-reviewed/samples/56.png` (1.867s): opening question, authored orange subject and landscape, both non-execution disclosures.
- `evidence/owner-reviewed/samples/158.png` (5.267s): prediction explanation and small white-on-dark foreground mask; matching caption and disclosures.
- `evidence/owner-reviewed/samples/273.png` (9.100s): white-retain/black-transparent label and caption; explicitly synthetic scene.
- `evidence/owner-reviewed/samples/365.png` (12.167s): white mask aligned over same subject; caption says apply mask to original.
- `evidence/owner-reviewed/samples/492.png` (16.400s): comparison wipe shows checkerboard transparency on one side, same orange subject preserved; no implication of new subject generation.
- `evidence/owner-reviewed/samples/692.png` (23.067s): replacement purple background, same subject and labeled ×2.1 illustrative magnifier; inspection advice, no claimed observed defect.
- `evidence/owner-reviewed/samples/879.png` (29.300s): closing caption explicitly says no model execution; orange “合成教学示意 · 真实效果取决于模型和图像”.
- `evidence/unreviewed-preview/samples/488.png` (16.267s): same disclosed mechanism example plus visible “自动对齐·待听审”.
- `evidence/unreviewed-preview/samples/879.png` (29.300s): closing disclosure and unreviewed-timing badge remain simultaneously visible.

## Asset and provenance checks

The artwork is authored SVG geometry, with provenance explicitly disclaiming observed execution; no borrowed photograph or model-generated image is represented as a real result. The frozen Noto Sans SC manifest pins its font and accompanying OFL; I read the OFL header and permitted embedding/redistribution language. Runtime font bytes are covered by manifest verification. The original audio source hash is retained in both modes and the receipt records the previously authorized Chen / ElevenLabs free-account generation context. This review does not newly authorize generation, identify an unrecorded provider voice ID, or certify commercial/publication rights. Provider terms for later commercial distribution are not established by the generation receipt; deployment/publication are outside this bounded local review. No rembg weights were used or rights to them claimed.

## Check record and findings

`python3 work/unreviewed-preview-v1/judges/candidate-2/content_facts/check.py` exited 0. The independent script and `check.log` are retained beside this report. It hashes all 388 source and 429 evidence manifest entries, checks byte sizes, compares all eight cited spans against their line ranges ignoring enclosing whitespace, and compares all story narration to caption text for both modes. It only uses standard-library file reads and does not import target code.

Earlier ad hoc checks initially appended `evidence/` twice to manifest evidence paths and compared terminal newline conventions inconsistently. Those were checker mistakes, corrected before conclusions; the retained check uses candidate-relative evidence paths and explicit whitespace normalization. They are not candidate defects.

No blocker/major/minor factual defect found in the reviewed scope. No remediation required. Any changed words, source snapshot, disclosure, geometry or audio creates a new evidence basis; recheck affected claims/captions/frames. No peer vote is used to waive missing perception.

## Self-limits

I did not play either MP4, hear audio, transcribe speech, measure mobile readability, execute rembg/model code, rerender, infer new alignment, access the network or spend money. Both media are retained as 977-frame / 32.5667-second candidates; duration/decoding claims are the separate technical reviewers' scope and are not treated here as hearing. This source review addresses the pinned revision and schematic narration, not current upstream capabilities. A full listening review could reveal spoken deviations not visible in declared text. A later actual-model demonstration, platform/performance claim, publication or changed audio would require new relevant evidence. The owner AV deferral and all historical UNVERIFIED findings remain in force.
