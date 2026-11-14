# Audience audit for existing showcase videos

Use this workflow after an approved showcase candidate exists, when phone text, foreground overlap or narration/action correspondence needs investigation. The current session agent prepares the request from exact artifacts and the review question. The owner does not write JSON. Keep original videos and approvals intact.

```text
pnpm gve showcase audience-audit --request work/audience-request.json --out work/audience-audit
```

The output directory must be new. The report and its evidence packet are separate from the candidate and existing immutable revision packages. A generated `review.md` gives a readable entry point; `report.json`, `bindings.json`, sampled original frames/clips and current-renderer inspection files retain exact evidence and provenance. Publication reserves a new directory, moves the completed evidence files into it, and writes `bindings.json` last as the completion marker. This is not an atomic rename of the whole directory. An interrupted publication may leave an incomplete directory: without the final marker and a valid file inventory it is not a completed packet. Existing output directories are refused; preserve the interrupted evidence and retry to a new path. A successful command means the audit packet was produced, not that the video passed viewing or listening.

## Request and evidence

Use `showcase-audience-audit-request/1.0`. All referenced files carry exact SHA-256 values; relative paths resolve from the request. A `checkpoint` source identifies existing data state, render task and candidate hash. A `historical` source binds an approved manifest and an existing MP4. The historical path measures original narration and reconstructs current renderer props; its association with the historical movie is explicitly declared, not a fabricated completed runtime checkpoint. Inspect the original extracted frames alongside the reconstruction.

`sampleFrames` lists at most 16 distinct global 30fps frame numbers. Optional `clips` contains up to six exact half-open frame windows, each at most 120 frames. Clips preserve selected existing content for review; they are not new production films. Choose cue edges, motion changes and suspected text/overlap failures rather than only flattering frames. The report names sampled and unsampled coverage.

An optional expectation binds an `id`, `beatId`, zero-based `shotIndex` and `panelIndex`, exact `cue: {index,text}`, `media: {id,sha256}`, a half-open `sourceWindow`, and a plain-language `event`. The agent must inspect source evidence before describing the event. A window of frame numbers cannot prove what happens in those frames. Cues without expectations remain outside that check; absence of an expectation is not evidence of correctness.

Optional `speechAlignment` entries name a line and bind exact existing speech request/report files. See [speech diagnostics](speech-alignment.md). The original audio, transcript, script approval and source clock must match. Recognition, forced alignment, low confidence, missing words and null timings retain their different meanings.

## What the checks establish

The renderer inspection measures the real Showcase Reel DOM after font and layout readiness. Text Range rectangles, actual element bounds and foreground regions support warnings about small editorial text at the assumed phone view, wrapping/overflow, clipping and overlap. These are current-renderer measurements at requested frames. A different historical renderer may differ; extracted original frames remain the actual candidate evidence.

A text-box intersection is an occlusion risk, not proof of alpha-pixel or glyph occlusion. Editorial font size is a size-risk heuristic, not a readability score. Source screenshots and video contain text that the DOM cannot see: embedded UI text is explicitly unassessed by this automated layer and needs actual visual inspection. Do not infer that a lack of DOM warnings means the complete frame is readable.

Correspondence checks calculate which source video frame a selected panel displays during the selected cue, including source anchors, clamping, reveal and explicit panel media/range overrides. They compare this actual playback mapping with the authored source window. A temporal match verifies only that declared mapping. It does not verify the event semantics, underlying project fact, word spoken, or the exact perceived timing.

Caption display times are distinct from observed speech. Existing local recognizer evidence may help propose a speech window, but low-confidence/missing timing and naturalness remain unverified. Forced alignment uses the supplied transcript and does not independently confirm content. The audit never upgrades these to human listening or complete audiovisual review.

## Review and repair

1. Freeze the candidate, request and evidence packet. Give an independent reviewer the exact original phone frames/clips and necessary source evidence. Ask for concrete findings and scope; do not supply the expected verdict.
2. Compare the independent observations to machine findings. Investigate false negatives, false positives and unsupported assertions. Code fixes create a new frozen evaluator and require affected rechecks; keep original reports.
3. For a production edit, use [guarded revisions](showcase-revisions-v1.md) or the owning authoring workflow, show the complete changed script/storyboard and obtain exact approval before producing the new candidate. A test diagnostic or report does not authorize a new formal film.
4. Preserve the revised candidate and re-review the same findings. Missing modalities remain unverified. Do not silently change thresholds, replace the reviewer or reinterpret a temporal match as semantic approval.

The existing [pixel-budget preflight](showcase-quality-v1.md) complements these checks for crops and proposed revisions. The [completion roadmap](product-completion-roadmap.md) separates current capabilities from the next onboarding, demo-selection, observed-speech and delivery modules.
