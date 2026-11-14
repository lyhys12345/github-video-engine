# RSI result: guarded showcase revisions — 2026-11-13

Baseline: `fce903271f55d8595d426030eb2e2576dace5646`. This bounded cycle implements the [fixed acceptance contract](../reviews/rsi-showcase-revisions-v1/contract.md). Astra reviewed architecture and code; Sol implemented; Terra independently inspected actual anonymous frames. Root coordinated integration and validation. No production film or private voice input was changed.

## User-facing improvement

The session agent can turn feedback such as “make this detail larger” or “move this cut to the next caption” into a reviewable revision of an existing cinematic reel. The user supplies feedback, not JSON. The four public operations are:

1. `showcase feedback-context`: verifies the completed baseline, exact source/media/reviews and measured timeline.
2. `showcase revision-impact`: checks the agent-authored change plan and identifies changed shot inputs and cache eligibility under the saved environment.
3. `showcase revision-prepare`: publishes an immutable, unapproved draft with complete narration, a description and visual specification for every resulting shot, reasons, timing and change impact in `review.md`.
4. `showcase revision-finalize`: requires the prepared receipt digest, fresh exact owner authorization and independent script review, then creates an approved source checkpoint/manifest for ordinary render or resume. It does not render or advance the current movie pointer.

This version preserves narration text/audio/receipts, existing media/font, beat order and measured beat durations. It supports crops, panels, annotations/overlays, actions, cut timing within a beat, caption cue partitions and display settings. Narration, new footage, voice changes and overall duration edits require separate authoring. See the [workflow](showcase-revisions-v1.md).

## Actual checks

- Typecheck: PASS, including the final overlap guard. Static Codex/Claude entrypoint/link checks: PASS; no actual Claude session was run.
- Catalog: all **103** test entrypoints classified. This is inventory, not execution of all tests.
- Builder directed suite: **34 tests across 6 files PASS**. Independent Astra suite adding CLI routing: **35 tests across 7 files PASS**, 30.21 seconds. These counts overlap.
- Real media suite: **2 tests PASS**, approximately 80 seconds. The URL-workspace and standalone branches both created real synthetic MP4s and exercised actual CLI operations, fresh approvals, export and import.
- The successful media suite preceded the final destination-overlap guard in `revision.ts`. That guard did not change the renderer fingerprint. Builder and independent reviewer then exercised the final public CLI on preserved real fixtures: nested, ancestor and same-publication destinations rejected without writes; disjoint exact retry reused the same publication/source; stale workspace rejected. The full media suite was not rerun merely for that path guard.
- Independent draft-contract checks confirm a structurally valid unapproved draft cannot enter the existing approved renderer and cannot silently change caption/narration content.
- Real historical ArtCraft refinement v2 and OpenMAIC O-B inputs passed read-only validation before and after, and independently again: 17 and 15 closed source files. Original manifest/script hashes stayed identical; these were not new production renders.
- No full integration/provider/Python regression, fresh installation, hosted CI, cross-platform run or continuous audiovisual review was performed in this cycle.

Representative executed commands:

```text
pnpm typecheck
node scripts/check-agent-entrypoints.mjs
pnpm test:catalog
pnpm exec vitest run tests/showcase-revision.test.ts tests/showcase-draft-contract.test.ts tests/showcase-reel.test.ts tests/approved-reel.test.ts tests/showcase-durable.test.ts tests/asset-pack.test.ts tests/cli-routing.test.ts
pnpm exec vitest run tests/showcase-revision.media.test.ts
```

The media tests call the real public CLI for context/impact/prepare/finalize with browser, FFmpeg, ffprobe and voice settings deliberately unavailable. Rendering restores the actual local media tools. They also test stale source/shot/draft digests, unrelated review, an unapproved draft, old authorization, tampered files, incomplete staging, new global style impact, repeated requests and dropped standalone review.

## Actual media result

The URL fixture uses a generated 160×96 test pattern and a synthetic non-speech tone, not project footage or natural voice. Its TEST_ONLY approvals are explicit. It changes only the first shot's crop.

- 1080×1920 H.264 with AAC, 30 fps, 12 frames / 0.400 seconds; full decode passed.
- Baseline MP4 SHA-256: `5fd96229af52dd6860ab5641154508ae401a25ef54cb8c9cf75c379b737775c0`.
- Revised MP4 SHA-256: `45387ed497e93bc4738f379315ebe9fa1272792c81b6501259428f1b51ce5457`.
- **One shot rendered; one shot reused.** The unchanged shot retained its task ID and attempt 1. The exact original PCM remained `ff897d27697643876908df847d38b553b9502a11824c3c08e501ffc7408f6c49`.
- Independently decoded first-shot PNG changed from `14798c2b16d9aadbcfd661220b26718fb0826f3e0986b11ccd535af0faab14f3` to `f8843171d3dbace79257e2a865bc4f251331007a29b3c7b35ab1c98e999d1f91`. Both second-shot PNGs retain the former hash.
- Portable export/import retained the exact approved script review, pinned source, narration and receipts. Baseline movie review was not promoted to approval of the revised movie.

Terra actually viewed all four anonymously named PNGs. It found A to be the tighter upper-left close-up, with the second shot visually unchanged and readable, stable surrounding text/layout. A was the revised fixture. It also observed enlarged pixels and edge clipping. This is PASS for selective visual editing, not for production aesthetics or audience retention. No audio was heard and no uninterrupted video was watched. The low-resolution pattern makes crop quality tradeoffs visible; the engine currently has no automatic crop-resolution quality gate.

## Findings and repairs

The original independent code verdict was REVISE. Normal standalone manifest rendering initially lost the finalized independent script report; it now carries an exact `scriptReview` asset, and a new script `reviewPolicy` prevents stripping that field and silently downgrading to legacy. The initial revised storyboard could omit shots; the plan now requires a description for every resulting shot, and the review document shows complete visual specifications.

The first real media run failed because preparation receipts used formatted JSON while finalization expected canonical byte serialization. The repair retains exact receipt SHA-256 verification and compares the parsed receipt structure to the derived expected inventory. The subsequent two-case media run passed. A later self-review found that final output could overlap its prepared draft; final CLI validation rejects that overlap before publication.

Committed-draft tampering now refuses instead of being treated as an incomplete export that can be republished. An explicit `rejectDamagedPublication` option preserves the old publisher behavior for existing callers while enforcing the revision contract. Original reports and failed fixture directories remain preserved.

## Evidence and limitations

- [Original independent code findings](../reviews/rsi-showcase-revisions-v1/code-review.md), [first recheck](../reviews/rsi-showcase-revisions-v1/code-review-recheck.md), [final independent closure/CLI check](../reviews/rsi-showcase-revisions-v1/code-review-final.md), [actual frame review](../reviews/rsi-showcase-revisions-v1/frame-review.md).
- Local URL evidence: `D:/gve-anna-render-temp/gvsrev-57vXJS/revision-evidence.json`; actual revised MP4 resides in its `revised` published bundle. Four midpoint PNGs are adjacent.
- Local standalone evidence: `D:/gve-anna-render-temp/gvsstand-obdf0u`.
- Earlier failed fixture roots: `gvsrev-pdt0eZ` and `gvsstand-F0iNqD` under the same temp directory.
- Local integration summaries, historical manifest validation and anonymous frame packet: `work/rsi-showcase-revisions-v1/`. These generated files are not uploaded to GitHub.

Hash binding is local integrity, not reviewer/owner identity authentication. Facts and production creative/owner acceptance remain pending. Workspace revision commands guard the current baseline; subsequent ordinary render/resume is an explicit approved branch selection, not a transaction spanning two CLI invocations. A historical portable movie needs a local render checkpoint before revision. Older strict readers may refuse the new optional manifest/script fields; stripping approval-related fields is unsupported.

The next quality-focused improvement should evaluate effective resolution and context loss before accepting a crop, using actual representative footage and owner-approved storyboards. This cycle proves safe selective revision and preserves the genuine visual limitation instead of claiming a cinematic improvement from a synthetic pattern.
