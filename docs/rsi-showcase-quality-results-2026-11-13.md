# RSI result: showcase pixel-budget preflight — 2026-11-13

Baseline: ec44382eec4b16ea9e8c44c3b614f40b6a142f1b. The [fixed contract](../reviews/rsi-showcase-quality-v1/contract.md) scopes this cycle to visual revision advice and compatibility. Sol implemented, Astra independently checked code/geometry/state behavior, and Terra independently viewed actual source/output/phone images. No production film, script, private voice input or model was changed.

## Delivered behavior

`showcase quality (--workspace W | --data S) --task BASELINE [--spec REVISION_PLAN]` returns a deterministic advisory report for a completed verified reel and optional proposed revision. It evaluates every displayed frame using the renderer's shared crop, viewport and panel geometry, including crop animation, media overrides, motion and reveal.

The report identifies worst enlargement and frame, visible source-pixel extent, additional cover clipping, contain fill and never-visible panels. It separates 1080x1920 output from an explicitly assumed 360x640 CSS-pixel/DPR1 phone view. A 1x threshold with 1e-9 numerical tolerance produces advice, not an aesthetic score or approval. See [commands and limitations](showcase-quality-v1.md).

The command uses hash-bound source declarations checked by the completed baseline render, not a fresh media probe. It opens existing task state read-only, refuses missing or unsupported state without creation/migration, starts no rendering/provider task and leaves the current movie unchanged. Existing draft publications and review hashes remain untouched.

## Executed checks

- `pnpm typecheck`: PASS on final frozen source.
- `pnpm exec vitest run tests/showcase-quality.test.ts tests/showcase-revision.test.ts tests/showcase-reel.test.ts tests/showcase-draft-contract.test.ts`: 4 files / **17 tests PASS**, 3.82 seconds.
- `pnpm exec vitest run tests/tasks.test.ts tests/usage.test.ts tests/showcase-durable.test.ts`: 3 different files / **26 tests PASS**, 32.55 seconds. The TaskRunner/inputs hashes stayed unchanged afterward. Combined: **43 distinct directed tests**, not a full regression.
- `pnpm exec vitest run tests/showcase-quality.media.test.ts`: **1 real media test PASS** on the final frozen candidate, 31.88 seconds. An earlier run also passed; it is a repeated run of the same test, not two unique tests. Actual PNG/image and 30fps video rendering, unavailable-tool quality queries, deterministic repeats, stale/review/shot/hash rejection, corrupted CAS rejection, no task/pointer changes and real false-dimension refusal are exercised.
- Independent geometry oracle: **240 seeded cases**, 583 visible panels and 14,621 visible frame evaluations. Expected values are calculated independently rather than by calling the production geometry helper. Independent SQLite checks cover live uncheckpointed WAL, refused writes, unchanged task/schema/version/event state, missing state and legacy read-only refusal/default migration.
- Independent final CLI probe: deterministic repeat, equivalent workspace/standalone branch, exact plan digest, proposed composition, stale baseline/review/shot refusal, forbidden output flag, unavailable media/voice tools and unchanged task/events/usage/schema/pointer all PASS.
- Canonical skill validator and local Codex/Claude entrypoint checks: PASS. This is static validation; no Claude session was run.
- `pnpm test:catalog`: **105** entries classified. Inventory is not execution of all entries.
- No full regression, new installation, hosted CI, cross-platform run, paid API, real voice synthesis or production movie generation was performed.

## Real output and visual inspection

Final fixture: `D:/gve-anna-render-temp/gvsquality-AvhG1o`. The input image is 240x160; the video is 320x240, 6 frames at 30fps. The final output is H.264/AAC, 1080x1920, 30fps, **12 frames / 0.400 seconds / 142201 bytes**, independently inspected by FFprobe. This is synthetic test media and tone, not a natural voice or project demo.

Actual MP4: `baseline/.asset-staging-fab42aec-ed07-433f-ab1e-793ea5bf1e9d-fbQ23N/review.mp4` under that fixture. SHA-256: `532ebd3048e1943ab4600810fe84dfefd1bbca83fe7602fb7d3bf80b21f0b295`.

Terra viewed the source image, output frames 0/3/5/11 and a 360px-per-frame phone strip before reading reports. It observed visible enlargement and clipped pattern edges, contain-fit empty space, and tiny secondary text at phone scale. The quantitative report was consistent with those sampled observations. The proposed contain composition was only calculated, not rendered; neither reviewer nor report claims otherwise.

The final rerun's source image/video, four PNGs and phone strip are byte-identical to the first packet `gvsquality-M5q3oB`. Root and Terra independently rehashed them; Terra also inspected the updated final reports and preserved both packet identities. Q6 PASS is limited to actual still inspection and qualitative agreement, not numerical proof of every frame or continuous audiovisual quality.

Representative reported values: first image panel reaches 8.54x output enlargement at frame 5; its greatest additional cover clipping is about 75% at frame 0. The moving video contain panel reaches 1.43x output enlargement and about 29% fill. The final video crop reaches 5.17x with about 44% additional cover clipping. These measurements do not assert that every affected design is unacceptable.

## Compatibility and limitations

Root executed the real pre-change revision-finalize CLI with the retained draft from `gvsrev-57vXJS`, before and after this change. Both reused the original receipt `dabc748b2b670757296e6c55952ab068d2e3fa030d4afcbfa5f5372e28287571` and source task `b3e0fcf97bf5d225bd16e743f9d4506a5fdc5d5c2756e7b12ab5d479194fcd1b` with zero render tasks. An initial setup attempt correctly refused a different external script-review file left by an earlier negative test; using the exact approval/review retained inside the immutable final bundle succeeded. No original file was altered to force compatibility.

Shared renderer geometry extraction changes the renderer source fingerprint once. New renders under the new environment may rerender shots, despite unchanged geometry; historical artifacts remain valid. Existing revision impact correctly describes eligibility under its saved environment, not guaranteed reuse under a changed renderer.

The quality check is panel-local, before overlay occlusion. It cannot assess source compression, text legibility, semantic context loss, deliberate pixel-art style, narrative pacing, audio or platform retention. Contain can restore context while increasing empty space. A below-threshold phone pixel ratio is not a readability pass. The fixed reference phone is not every device. SQLite may perform normal read-lock/WAL bookkeeping; no task/schema migration is authorized by this read-only query.

## Preserved evidence and next work

- [Independent code/state/geometry review](../reviews/rsi-showcase-quality-v1/code-review.md), [independent probe](../reviews/rsi-showcase-quality-v1/independent-probe.mjs), [probe results](../reviews/rsi-showcase-quality-v1/independent-probe-result.json), [CLI results](../reviews/rsi-showcase-quality-v1/independent-cli-result.json), [actual frame review](../reviews/rsi-showcase-quality-v1/frame-review.md).
- Candidate raw working-tree SHA-256 values: `reviews/rsi-showcase-quality-v1/independent-reviewed-candidate-sha256.txt`; these describe local reviewed bytes, which Git line-ending normalization may change on another platform.
- Local logs, historical retry results, final FFprobe output and packet hash comparisons: `work/rsi-showcase-quality-v1/`. Media remains local.

The next useful checks are phone-scale text/occlusion and empty-space review, followed by verification that visual action and spoken claims coincide. These require representative approved project material and actual inspection; pixel arithmetic alone cannot remove the PPT feel. No new production render is authorized by this engineering result.
