# Showcase pixel-budget preflight

Use this advisory check when a completed showcase reel or proposed revision enlarges source screenshots, reframes footage or changes panel layout. It answers where the available source pixels are stretched and how much of a selected crop is hidden by cover fitting. It does not determine whether a shot is attractive, text is readable or important content was cropped out.

```text
pnpm gve showcase quality --workspace work/reel --task BASELINE_RENDER
pnpm gve showcase quality --workspace work/reel --task BASELINE_RENDER --spec work/revision-plan.json
```

For standalone runs, replace `--workspace` with `--data STATE`. The optional plan uses the existing `showcase-revision-plan/1.0` contract from [guarded revisions](showcase-revisions-v1.md). The session agent authors it from the user's feedback. Invalid or stale bindings are rejected. This command returns JSON on stdout; save the report alongside the working plan if useful. It does not publish a draft, render media, synthesize narration, approve a candidate or change the current movie.

The command opens task state through a read-only SQLite connection and does not migrate schemas or create missing state. Normal SQLite read-lock/WAL bookkeeping may still occur; this is not a promise of zero operating-system side effects.

The completed baseline is required: its exact source assets and dimensions were checked during the successful render, and the quality command revalidates the bound source bytes. It does not launch a fresh FFprobe process. This is not an arbitrary-image inspection command or a preflight for the first render of a new project.

## What the numbers mean

The calculation shares viewport and crop geometry with the current renderer. It evaluates every displayed integer frame, using actual shot timing and panel reveal/motion, crop animation, panel media overrides and contain/cover fitting. The report identifies the worst frame instead of evaluating only the endpoints. A panel revealed at progress 1 never appears in the shot, because the end frame is exclusive.

The 1x warning threshold uses the small comparison tolerance disclosed in the JSON to suppress floating-point rounding noise. Two pixel budgets are distinguished:

- Output: 1080x1920 pixels. Enlargement above 1 means one source pixel covers more than one output pixel. It can expose limited resolution; it does not prove visible blur.
- Assumed phone presentation: 360x640 CSS pixels at device pixel ratio 1, exactly one third of the output dimensions. This is a stated reference view, not a measurement of the viewer's phone or a guarantee of TikTok/Xiaohongshu rendering.

Cover can hide part of the already selected crop to fill a panel. The reported clipping is additional fit-induced loss, not a semantic judgment about the complete original image. Contain keeps the selected crop visible and may leave unused panel space. Overlay occlusion, source compression, small text, deliberate pixel art and usefulness of the remaining context still require visual judgment.

For a warning, consider higher-resolution source capture, a less aggressive crop, a smaller destination panel, or contain fitting when preserving context matters. These options have tradeoffs. The check never silently changes the storyboard, and switching to contain may restore the very empty-space problem the owner wants to avoid. Show the affected frame at phone scale and choose deliberately.

## Compatibility and approvals

Quality reports are separate from immutable revision bundles. Existing prepared drafts, receipts and review document hashes are not rewritten; finalization still requires exact fresh owner authorization and independent script review. A geometric advisory is neither of those decisions.

The evaluator describes current renderer geometry separately from the saved baseline renderer environment. Sharing the geometry helper changes the renderer source fingerprint once, even though the extraction preserves visual behavior. A new render under that fingerprint will not reuse old-environment shot caches; old completed artifacts remain available. Reports are not exact replays of every historical renderer version.

The canonical Skill calls this check for relevant visual feedback and still requires frame inspection. Source facts, actual listening, continuous audiovisual review and final owner acceptance remain separate.

[Actual test results and independent reviews](rsi-showcase-quality-results-2026-11-13.md).
