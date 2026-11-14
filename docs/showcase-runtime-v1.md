# Durable showcase runtime

Use the existing URL workspace when producing a cinematic or source-footage reel for a repository. Run the ordinary planning entry until the pinned source handoff is available, then author the showcase manifest, exact script/storyboard, and local narration receipt bindings. The session agent fills these files.

```text
pnpm gve explanation run --repo https://github.com/OWNER/REPO --workspace work/reel --through planning
pnpm gve explanation showcase --workspace work/reel --spec work/reel/showcase-author/manifest.json --review work/reel/showcase-author/script-review.json --out work/reel-review
pnpm gve showcase status --workspace work/reel
pnpm gve showcase resume --workspace work/reel --task <render-task-id> --out work/reel-review
```

The existing [showcase manifest](showcase-reel.md) defines the shot, crop, panel, cue, and action-anchor fields. For the URL workspace route, the exact script JSON contains `sourceBindingSha256` from the source handoff, `storyboardSha256`, the ordered `lines`, and the approved `shots`. Run `pnpm gve showcase storyboard --spec <draft-manifest>` to compute the visual-plan digest before approval. Use temporary SHA-256 placeholders for the script and approval references in the draft. The digest covers the ordered shot instructions, layout, caption partitions, font, and footage. It excludes file locations, preview-frame selection, and finished narration bytes. After script approval, replace the two draft hashes with the final script and receipt hashes. Supply its ordinary exact-hash `script-owner-authorization/1.0` receipt in the manifest and a passing `candidate-review/1.0` script report via `--review`. Both approvals bind the exact script file and its declared visual-plan digest. A storyboard edit requires a fresh approval even when the renderer can reuse unchanged shots. The renderer reopens the verified URL capture, checks the repository, request, commit and source binding, and snapshots the pinned documents with the script review. Source facts remain unverified until separately checked. The other `explanation run` preview profiles remain available.

For an already-approved standalone showcase, use `pnpm gve showcase render --data work/showcase-state --spec <manifest> --out <new-dir>`. The legacy script uses the same adapter and defaults to a sibling `<out>.state` directory. Commands print the task ID and the output's verified bundle path. In a URL workspace, `current-showcase.json` points to the latest completed MP4. It is independent of the ordinary narrative preview pointer.

Speech is rendered at its original speed with at most one frame of PCM rounding per line. Finished narration inputs must be local WAV, MP3 or FLAC with an exact local-import receipt. Technical media validation checks the actual source dimensions and declared 30 fps footage, then the assembled MP4's video and AAC streams, frame count, duration, and full decode. A technical success leaves continuous audiovisual review, listening, and owner acceptance pending.

`showcase status --data <state>` shows available tasks including the source snapshot. Use `--task <id>` for attempt, error, lease, and event details. Once an abandoned lease expires, `showcase resume --data <state> --task <render-id>` retries the same input without author files. A completed render can be re-exported with `resume --out` without opening a browser. If initial capability detection failed before the render task existed, resume the source checkpoint and repeat any requested still flags. An exact re-render request reuses the overall candidate. A shot-local visual edit reuses unaffected shots whose actual frame interval, relevant captions, display state, fonts, assets, and renderer fingerprint stay the same. Changes to reel-wide geometry, theme, timeline, or rendering dependencies can affect multiple shots.

`--frames-only` publishes PNGs and a timeline. `--still-frames 0,30` selects absolute frames and `--skip-stills` publishes the movie without PNGs. Rendering produces CAS-backed shot segments, then stream-copies the picture and muxes original-speed narration. The task only publishes completed files through the existing atomic publication receipt. Changes to the renderer algorithm may produce different MP4 bytes from the historical monolithic script.

## Review and portability

Record an independent video report against the exact delivered MP4 using `pnpm gve showcase review --data <state> --task <render-task-id> --review <candidate-review.json>`. Each raw report remains bound to its own candidate. A partial audiovisual report remains unverified, and independent review cannot mark owner acceptance complete.

```text
pnpm gve showcase export --workspace work/reel --task <render-task-id> --out work/reel-package
pnpm gve showcase import --package <exported-bundle-path> --digest <exported-digest> --workspace work/reel-imported
pnpm gve showcase resume --data work/reel-imported/state --task <imported-source-task-id>
```

The editable `source/manifest.json` sits beside its relative source assets. The portable bundle includes the candidate MP4, PCM, stills, script/storyboard approval, source footage and fonts, finished narration, receipts, pinned repository provenance and any candidate-specific raw video review. Export only packages materials you are authorized to share. It copies neither the local voice reference/profile nor the original workspace databases. Import requires the index digest, rejects links and extra files, checks every file hash, and verifies the exact script and media closure. It rebuilds a source checkpoint in a fresh state store and retains the original candidate and reviews as historical evidence. Re-rendering in the destination uses its own tools and renderer fingerprint. Caps are 5 minutes, 512 MB of source assets, 256 MB per video artifact and 768 MB per portable bundle.

## Verification

```text
pnpm exec vitest run tests/showcase-reel.test.ts tests/approved-reel.test.ts tests/showcase-durable.test.ts
pnpm exec vitest run tests/showcase-durable.media.test.ts
```

[Technical validation record](showcase-runtime-validation-2026-11-13.md)
