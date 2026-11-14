# Showcase revision workflow

Use this workflow to revise footage framing, cuts, caption layout or display styling after a completed showcase movie. The current session agent interprets the feedback and fills in the plan. Start with a verified movie checkpoint from the same local state.

```text
pnpm gve showcase feedback-context --workspace work/reel --task <baseline-render>
pnpm gve showcase revision-impact --workspace work/reel --task <baseline-render> --spec work/revision-plan.json
pnpm gve showcase revision-prepare --workspace work/reel --task <baseline-render> --spec work/revision-plan.json --out work/revision-draft
```

For a standalone reel, use `--data <state-directory>` in place of `--workspace`. A portable import preserves the original movie as historical evidence. Resume its source checkpoint locally to create a completed baseline render before choosing a revision. The workspace route checks the baseline against the current completed movie and pinned source. The standalone route selects an explicit baseline branch from the named state.

The context includes the verified source, script, media declarations, narration bindings, beat and shot selectors, and any raw video reviews associated with the exact baseline movie. Its JSON Schema describes the plan. `originalManifestSha256` hashes the original manifest file. `normalizedManifestSha256` hashes the stored manifest with normalized asset paths.

Write a `showcase-revision-plan/1.0` using the exact `baseline` object from the context. Include the feedback, its origin, the session agent’s interpretation, and one `scriptShots` description for every shot in beat and shot order. An `independent-review` origin requires the corresponding `videoReviewSha256` from the context. An optional digest for other origins must also match a review of this movie.

- A shot replacement selects a `beatId`, zero-based `shotIndex` and `expectedShotSha256` from the context. Supply the complete replacement shot and its reason. It can use existing source assets and change crops, panels, overlays, actions, weights and cut cues.
- A caption edit selects a `beatId` and `expectedCaptionSha256`. Supply a complete recording-relative cue partition that preserves the approved text and measured length. Use `captionCues: null` to remove existing authored cues and return to estimated display timing. Update any cue-based cuts or action anchors as needed.
- A display edit binds `expectedDisplaySha256` and supplies a reason plus the desired theme, layout or cinematic settings. `null` clears an optional layout or cinematic settings object.

The plan keeps the narration text, audio, receipts, media inventory, font, beat order and measured beat durations. Changed weights or cue boundaries can retime shots within a beat. The impact report recomputes the actual shot payloads using the saved audio timing and renderer fingerprint. A matching task ID is eligible for reuse in the saved environment. The renderer verifies cache hits during the later run. Impact and preparation require the existing local state and files. They make no model or media tool calls.

The immutable draft contains `review.md`, the exact revised script, the draft storyboard manifest, the plan, the before/after report and eligible inputs. Give the owner the readable review document and exact script digest. The draft contains no previously approved receipt and cannot render. The review document shows every line, resulting shot, rationale and affected interval. Revised labels and visuals require factual review against the pinned evidence.

## Finalize an authorized draft

Use the `bundle` and `receiptSha256` returned by `revision-prepare`. Provide a fresh `script-owner-authorization/1.0` receipt bound to the new `scriptSha256` and a passing independent `candidate-review/1.0` report at the script stage with the same `candidateSha256` and `ownerApprovedSha256`. If the owner receipt specifies `approvedDocumentSha256`, it must match the exact `review.md` bytes. The review reports identify their authors by local declaration. Do not fill a receipt without the actual corresponding decision.

```text
pnpm gve showcase revision-finalize --workspace work/reel --task <baseline-render> --package <draft-bundle> --digest <draft-receipt-sha256> --approval <new-owner-receipt> --review <new-independent-script-review> --out work/revision-final
pnpm gve showcase resume --workspace work/reel --task <approved-source-task-id> --out work/revision-preview
```

Finalization verifies the committed draft receipt and every file against the rederived plan and original checkpoint, then publishes an approved manifest and captures its source for a subsequent ordinary render. An exact retry reuses the same valid publication while the selected workspace baseline is still current. After rendering advances it, select the new current movie for another revision; the explicit standalone data route remains a branch selection. A damaged committed result or different inputs at the same output path cause an error. Keep the draft bundle and its adjacent receipt together.

In the original URL workspace the finalized `manifest` also works with `showcase render --workspace ... --spec ... --review <scriptReview>`. A finalized standalone manifest contains its exact independent review as a relative, hash-bound input and works with `showcase render --data ... --spec ...`. The new `sourceTaskId` also works with standalone `resume --data ... --task ...`. Source-bound revisions in an imported state can use that resume route.

Preparation and finalization leave the current movie pointer unchanged. Normal render or resume explicitly selects which approved source to produce next. Successful rendering updates the workspace pointer and keeps the original candidate and video reviews in their original tasks. Review the revised movie independently. Technical validation leaves source facts, perceptual checks and final owner acceptance pending.

Finalized revision manifests carry optional `scriptReview` and scripts carry `reviewPolicy`. Older strict readers may reject these additions. Use an engine version supporting this workflow; removing review fields to force an older path is not a supported downgrade.

This module does not automatically assess source resolution or crop aesthetics. A valid crop can magnify compression or clip useful context. Inspect representative frames at phone scale and resolve those visual findings before accepting a production candidate.

[Executed checks and independent reports](rsi-showcase-revisions-results-2026-11-13.md).
