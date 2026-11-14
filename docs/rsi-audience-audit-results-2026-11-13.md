# RSI audience audit: actual results, 2026-11-13

## Delivered scope

Added `showcase audience-audit` to the CLI and canonical GitHub Explainer Skill. It produces a separate, versioned review packet for an existing approved candidate. It measures actual font-ready Remotion DOM geometry, extracts original candidate frames and short audiovisual excerpts, compares caption/source-action windows, and preserves optional speech-report provenance. It never treats packet creation as creative, factual, speech or owner approval.

The source baseline was `193c01919c942030376dbe8d181686d602e7a1ca`. The fixed [acceptance contract](../reviews/rsi-audience-audit-v1/contract.md), [workflow](showcase-audience-audit-v1.md) and [ordered next modules](product-completion-roadmap.md) describe scope and support boundaries. Original production films were not edited or replaced. No paid API, new voice generation, target repository execution, or formal new film was used.

## Executed validation

| Execution | Actual result |
| --- | --- |
| Six targeted Vitest files: audience, CLI routing, existing quality, revision, reel and speech alignment | 30/30 passed; builder final run 7.61 s. Includes invalid/stale bindings, missing timing, independent panel playback and old contract behavior. These unit/CLI tests do not prove real viewing. |
| Real Chromium renderer test | Builder final 1/1 passed in 44.92 s; actual font/DOM/PNG inspection, long captions, narrow labels, annotation overlap, cue edges, moving panels, cancellation/cleanup and audit-off PNG parity. |
| TypeScript | `pnpm typecheck` passed. |
| Test catalog | `pnpm test:catalog` passed: 107 classified files. This inventories tests; it does not mean all 107 were executed. |
| Canonical Skill validation / host entrypoint links | Passed. Static checks do not certify an actual Claude session. |
| Two existing real project CLI audits | Both exited 0 and produced `REVIEW_REQUIRED` packets; 12 selected original frames and two short AV clips. |
| Existing durable checkpoint audit | Exited 0; 3 original/current frames. Complete SQLite schema and all table rows unchanged. |
| Old guarded-revision finalization retry | Reused the existing approved output; `renderTasksStarted=0`. |
| Original input integrity | All 10 pre-recorded candidate/manifest/script/approval/selected-audio hashes remained unchanged. All 69 final packet inventory entries passed hash and size verification. |

The first builder browser run failed an assertion: a synthetic caption exceeded the supported 80-character input limit and genuinely clipped outside the stage, while its expectation only accounted for layout overflow. The corrected fixture stays within the supported limit; clipping has a distinct scenario and `text-clipping-risk` finding. This first failed execution is preserved in the builder account; it is not counted as a pass. Full repository regression, new formal-film generation, physical-phone testing and continuous audiovisual review were not performed.

Actual principal commands (from repository root):

```text
pnpm exec vitest run tests/showcase-audience.test.ts tests/cli-routing.test.ts tests/showcase-quality.test.ts tests/showcase-revision.test.ts tests/showcase-reel.test.ts tests/speech-alignment.test.ts
node node_modules/vitest/vitest.mjs run tests/showcase-audience-render.media.test.ts
pnpm typecheck
pnpm test:catalog
node scripts/check-agent-entrypoints.mjs
pnpm gve showcase audience-audit --request work/rsi-audience-audit-v1/artcraft-request.json --out work/rsi-audience-audit-v1/artcraft-audit-final
pnpm gve showcase audience-audit --request work/rsi-audience-audit-v1/openmaic-request.json --out work/rsi-audience-audit-v1/openmaic-audit-final
pnpm gve showcase audience-audit --request work/rsi-audience-audit-v1/checkpoint-request.json --out work/rsi-audience-audit-v1/checkpoint-audit
```

The Skill Creator validator was executed with the real local Python environment. FFprobe inspected both final clips; source hash and SQLite snapshot checks used Python. The original-line speech reports used the existing free local Windows recognizer; no new model was downloaded.

## Real media and review findings

| Project | Original / selected coverage | Actual exported media | Packet inventory SHA-256 |
| --- | --- | --- | --- |
| ArtCraft result refinement v2 | 735 frames, 24.5 s; selected 127, 136, 150, 158, 170, 178, 197 | Original-derived [124,204) clip, 2.667 s, H.264 1080×1920 30 fps with AAC | `b3b1f87ba3b7828e748fcd2fab7cc03510c9b5073d2d61fc2553f47295e04ed0` |
| OpenMAIC O-B | 1375 frames, 45.833 s; selected 270, 300, 313, 350, 390 | Original-derived [270,390) clip, 4.000 s, H.264 1080×1920 30 fps with AAC | `735c5907d257185a087bada0a99478d538e48ec2cd0c6380bc1847e11a87b2ef` |
| Prior synthetic durable checkpoint | 12 frames; selected 0, 5, 11 | Three frame pairs; no new AV excerpt | `5851363c904dd97eef0c8a5f1686087282c0f2283f0fc0e74956a9074a925e31` |

The independent Terra reviewer first saw original phone-sized frames without machine verdicts, then compared machine output and finally rechecked fixed output. All 12 final original PNGs match those blind samples exactly. The preserved [initial](../reviews/rsi-audience-audit-v1/real-frames-initial.md), [comparison](../reviews/rsi-audience-audit-v1/real-frames-comparison.md), and [final](../reviews/rsi-audience-audit-v1/real-frames-final.md) reports record what was actually seen.

A real reporting defect was fixed: the JSON listed missing cue bindings, but the readable review only showed an aggregate count. It now names sampled or clipped unassessed cues, notably OpenMAIC “你也可以加入。” and ArtCraft “把动作调好。”, with exact intervals. The reviewer confirmed the correction. The evaluator fingerprint was also expanded to bind the actual DOM inspector, worker and local renderer; nested renderer and browser hashes remain separately recorded.

ArtCraft's selected frames support raised-arm editing and a later bent leg, but the first frame of the bend cue alone does not clearly demonstrate bending. OpenMAIC shows a question and discussion messages; the full-interface question is too small for reliable phone reading, and the selected joining cue does not show someone joining. Tiny source labels/counters persist. These observations are preserved as future approved editing proposals, not silently applied to accepted films. Overlay overflow is a geometric risk: the visual reviewer saw no obvious clipped label glyphs in the samples. Large sampled bottom captions had no obvious clipping or overlap.

The independent Astra [code/evidence review](../reviews/rsi-audience-audit-v1/code-review.md) found no unresolved blocker or major within the bounded technical scope. It independently reran the same 30 targeted tests (7.03 s), the real Chromium test (39.89 s), and TypeScript; rehashed all 69 packet files and 20 frozen source/test files; and compared every checkpoint table cell and schema entry. These are repeat runs of 31 distinct tests, not 62 distinct tests. Builder and Judge browser execution accounts explicitly preserve tool-transcript results rather than claiming redirected raw logs. The Judge's delivery conditions require the final GitHub/Drive steps and preserve separate actual-frame and unheard-audio limitations.

## Speech and evidence limitations

The ArtCraft 4.32-second line and OpenMAIC 11.92-second line were actually processed by the local recognizer. Available phrase confidences were below the original 0.65 threshold or timing was absent. Consequently all four authored action expectations retain speech `UNVERIFIED`. Caption/source-window overlap is computed successfully, but this does not establish spoken-word timing, fact correctness, event semantics, voice naturalness or viewer comprehension. A better optional local recognizer with independent timing annotations is a next module, not a completed feature.

Embedded text inside screenshots/videos remains `UNASSESSED` by DOM analysis. Sampled-frame geometry is neither OCR nor continuous visual inspection. Current-renderer inspection is reconstructed for historical films; the manifest-to-historical-movie association is explicitly declared, not authenticated producer history. Original decoded candidate frames remain distinct evidence. The checkpoint path uses saved producer records read-only.

The original SQLite snapshot remained `dcc54f19cbf82b9129fe83e74cb0d8e01b338479cf9ced2d2f0103b36d8a07a5`: 12 tasks, 24 task events, 24 usage events, schema version 1. Old revision retry retained receipt `dabc748b2b670757296e6c55952ab068d2e3fa030d4afcbfa5f5372e28287571` and did not start a render.

## Retained artifacts and next work

Local original evidence, initial and final runs, requests, speech reports, extracted MP4/PNGs and logs are under `work/rsi-audience-audit-v1/`. They are ignored and are not a distributable voice/media pack. Source, tests, documentation, independent raw text reviews and compact verification records are saved in Git. Frozen source hashes describe this inspected Windows working copy; Git line-ending normalization or another platform may produce a different evaluator hash and require a fresh audit. No private voice reference, local voice configuration or model is included.

Use each final packet's `review.md`, original candidate images/clips, current inspection images and `bindings.json` inventory together. Publication uses an exclusively reserved directory and a final inventory marker; it is not an atomic directory replacement. An interrupted directory without a verified marker is incomplete and cannot be reused as a successful packet.

Next priorities: first-owner clean-checkout onboarding; evidence-backed official demo selection; reliable optional speech observation; consistent repair/restart navigation; platform delivery variants; real supported-host acceptance. See the [roadmap](product-completion-roadmap.md) for concrete exit criteria. The current bounded audit does not make the full product industry-ready or replace final owner/audience review.
