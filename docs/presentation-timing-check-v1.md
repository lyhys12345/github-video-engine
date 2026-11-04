# Check an author's caption and visual timing

Use the independent timing checker when a caption needs to remain visible with a specific picture. For example, a comparison caption can require both result panels to be fully visible together for 24 frames.

```text
pnpm gve presentation export --kind plan --task PLAN --data state --out plan-export
pnpm gve presentation export --kind voice --task VOICE --data state --out voice-export
pnpm gve presentation timing-check --spec timing.json --data state
pnpm gve presentation timing-check-status --task CHECK --data state
pnpm gve presentation timing-check-export --task CHECK --data state --out check-export
```

Use the exact task IDs and raw SHA-256 digests of the exported plan manifest, voice manifest and `trace.json`. For a cue, select the zero-based index within its beat from `captionCues` in voice ledger 1.1 or `cues` in ledger 1.0. For an event, select the zero-based index within its beat from the compiled trace's `trace` array. Compute each record's SHA-256 over canonical JSON, recursively sorting object keys and preserving array order with no added whitespace. The engine's `canonical` and `sha256` utilities produce this digest.

```json
{
  "schemaVersion": "presentation-visual-cues/1.0",
  "planTaskId": "<sha256>",
  "planManifestSha256": "<sha256>",
  "traceSha256": "<sha256>",
  "voiceTaskId": "<sha256>",
  "voiceManifestSha256": "<sha256>",
  "checks": [{
    "id": "compare-with-caption",
    "cue": {"beatId": "compare", "indexInBeat": 0, "sha256": "<sha256>"},
    "event": {"beatId": "compare", "indexInBeat": 0, "sha256": "<sha256>"},
    "state": "image-comparison-full",
    "minContinuousFrames": 24
  }]
}
```

The profile supports `image-cutout-full` after `show-cutout`, `image-mask-full` after `show-mask`, `image-comparison-full` after `compare`, and `http-response-arrived` after `respond`. Picture predicates use the panel state and opacity computed for the renderer. Response arrival uses the same eased-progress threshold as the renderer's change to the response body. The selected event's interval ends at the next event, so a later visual occurrence cannot satisfy the declaration. The checker uses the same half-open frame ranges as burned subtitles and tests the longest continuous overlap. A declared minimum of 24 frames corresponds to one second at the presentation's 24 fps.

For automation, `timing-check` exits 0 when all declared checks pass and 2 when a completed report contains a failed check, including on cache hits. In both cases stdout contains JSON with the task ID and `declaredTemporalChecks`. Invalid input and operational errors use the CLI's error path. A persisted task with `state: "succeeded"` has a complete report, which may record `declaredTemporalChecks: "failed"`. Status and export exit 0 when they successfully retrieve either verdict. The report records cue and visual intervals and the measured overlap. An unfinished diagnostic reports `unchecked`. The report always marks undeclared relationships as unchecked, lists the count of cues without declarations and retains `speechAlignment: "unverified"`.

Exact UTF-8 specification bytes are part of the task identity. Repeat the same specification to reuse a verified result or recover an interrupted attempt. A revised declaration creates a new task and preserves earlier reports. Status and export reverify the report against its retained parent artifacts. The export contains the original specification, timing report, compiled trace and both exact parent manifests. A specification admits up to 32 distinct checks and at most 32,000 bytes. Unsupported states, bad references and parent digest changes are rejected.

The timing checker analyzes modeled visual states and measured or authored cue positions. It runs independently of rendering, so an unmet declaration does not change preview eligibility, voice bindings, audio, subtitles or review status. The check does not assess the decoded movie, what was spoken, or whether the declared relationship was editorially appropriate.
