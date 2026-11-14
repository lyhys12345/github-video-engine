# RSI first-owner integration: actual results, 2026-11-13

## Outcome and scope

The supported Windows first-owner engineering path now has explicit setup/voice guidance, a complete author handoff including the creative brief, and self-contained reviewed project import/replay. A clean source checkout installed dependencies from scratch; a real public URL reached an independently reviewed script and the required owner-approval stop. A separate synthetic silent fixture proved real rendering, editable export/import, offline replay and a bounded edit without any maintainer media or voice profile.

These are two deliberately separate branches. HTTPX has **not** been rendered or approved by the owner. The actual 18-second MP4s are conspicuously TEST ONLY routing fixtures, with synthetic fixture receipts and mocked GitHub responses. The session agent authored the HTTPX story from actual pinned public sources; the engine never dispatches an LLM or executes HTTPX. No paid service, voice model/reference, target installation, production film or deployment was used.

Baseline `8d8d8b06a057325ba719e67f81fd30c59c54a371`. See the fixed [contract](../reviews/rsi-first-owner-v1/contract.md), [first-owner guide](first-owner-quickstart.md), [initial code finding](../reviews/rsi-first-owner-v1/code-review-v1.md), and [independent script recheck](../reviews/rsi-first-owner-v1/script-review-final.md).

## What changed

- `doctor --first-owner` reuses capability checks, starts with planning, and leaves voice/language undecided until explicitly selected. It provides validated capture arguments, renderer prerequisites, required owner review, and export selectors. No inherited private Anna profile is probed for an undecided first owner; the ordinary configured-owner default remains unchanged.
- The URL author handoff and schema packet now explicitly include `creative-brief.json`. Existing legacy author inputs remain compatible; the session agent writes data rather than assigning JSON work to the user.
- A portable import restores the selected preview's validated committed script report at workspace-root `script-review.json` and returns exact `resume` arguments. It derives the report only after matching author/brief/source/preview closure, never approves changed content, and refuses a conflicting staged report. No external receipt file or original workspace is needed for same-candidate replay.
- Fresh silent imports no longer create an empty TTS database. Existing owned staged databases still undergo trusted schema/row checks; they are not deleted to force success.
- README, Skill and guides now describe optional silent/imported/local voices, actual visible versus export-only text, and supported visual feasibility before owner review. The stale active Chen-default prose was corrected to Anna for the configured owner only.

## Clean installation and prerequisites

The source-only detached checkout was `D:/gve-anna-render-temp/first-owner-checkout-8d8d8b0`, created from the trusted local Git repository with no `work` or `node_modules` copied. The reviewed source changes were copied as explicit hash-verified candidate files; this was not an unauthenticated remote clone or a fresh operating system. Pinned pnpm installation actually downloaded/added **219 packages, reused 0**, in an isolated store with `--frozen-lockfile --ignore-scripts` (31.5 s). No global configuration was changed. The source-tree, lock, install and local environment-script hashes are recorded in [install evidence](../reviews/rsi-first-owner-v1/install-evidence.json).

Public installed prerequisites: Windows x64, Node 24.22.1, pnpm 11.25.0, Git 2.53.0.windows.2, FFmpeg/FFprobe 8.1, Chrome 157.0.8103.51. Noto Sans SC is the shipped hash-verified font. Process-local setup removed inherited provider/token variables and used isolated home/profile/config/cache/temp locations. Missing private Anna was an expected blocker, not a fallback trigger.

The first isolated browser run timed out. Actual Chrome and Edge diagnostics reported inability to resolve local application data / a non-default debugging data directory. A one-variable test retaining Windows' ordinary `LOCALAPPDATA` allowed Chrome to start while home, other app data, temp and Remotion's explicit browser user-data-dir stayed isolated. The final media run used that documented OS compatibility variable. This narrows the isolation claim; it does not imply private media/config use or a new-OS certification. No installed browser account/profile was imported into the temporary automation profile. Earlier failures and diagnostic logs are retained.

Eleven physical first-owner CLI scenarios confirmed default planning and planning with disabled media tools; concrete HTTPX capture arguments; unresolved voice selection; silent/imported readiness; missing media, absent Anna and unsupported reference blockers; malformed URL/phase/conflicting flags. The proposed workspace was not created by doctor. Readiness checks do not launch the browser or prove a completed render.

## Real public URL and script review

A separate isolated session agent captured `https://github.com/encode/httpx`, then expanded the same fixed commit `b5addb64f0161ff6bfe94c124ef76f6a1fba5254` to README, official Client guide and `httpx/_api.py`. Source was read as untrusted data; no HTTPX package/example/request was executed. The agent authored the data, so the user provided no JSON. This manually tasked agent trial does not certify automatic host skill selection or Claude.

The initial 52-second script was independently **REVISE**: three central Client lifetime/pooling/cleanup beats were unsupported placeholders, screenshots were only proposed, silent text relied on missing visuals, and some animation claim links were weak. Its sources, script, author files and [raw review](../reviews/rsi-first-owner-v1/script-review-initial.md) remain intact.

The revised [26-second script and storyboard](../reviews/rsi-first-owner-v1/httpx-script-v2.md) explicitly narrows the story to GET input, source-level dispatch, and inspectable response status/headers/body. All five scenes use supported visible context, labels and actions, with **zero unresolved scenes**. It promises no nonexistent screenshot or persistent connection simulation. The same reviewer rechecked citations and renderer fields and issued a planning-only PASS; it did not watch or approve a video.

- Revised author SHA-256: `1d9d1a6b78621e69510e92025eb9930642b52146834f907ebaaa530859f6ac33`.
- Script SHA-256: `ddc9aef7418a89c7b011ca516c5384d60d848ce684964ea22bdbb41994799b55`.
- Fact packet SHA-256: `6fe3d3fc70c773ec87e47afcb9d0009223f38379c1c03836b74efcd4afb8d901`.

Actual planning and no-receipt preview commands reached `awaiting-script-review`; a new status process recovered the state. Read-only final state contains only 11 historical/current planning tasks (1 capture, 8 Story plans, 2 narrative plans), no media tasks, no TTS database, no rendered preview and no owner receipt. The independent script receipt deliberately omits `ownerApprovedSha256`. The separate structured fact worksheet remains pending; the written source review is not silently converted into a fact-review receipt.

An additional real-project `preview --review` negative probe was **rejected by automatic approval review before process launch** because the real script lacked owner approval. It was not retried or bypassed. Existing executed synthetic CLI tests cover PASS-without-owner and all four media-phase stops; the real branch's no-receipt stop and subsequent read-only state were actually checked. Do not claim the rejected command executed.

## Real synthetic editable-media closure

The committed test runs public CLI child processes. Its preload supplies only exact synthetic GitHub responses during fixture capture and refuses network afterward. All fixture data and test-only receipts are explicitly labelled; they are not source or owner acceptance for HTTPX.

The final frozen run passed in **124.15 seconds**. It verified missing approval stops `speech`, `animation`, `voice` and `preview`; a passing script receipt without owner approval still stops. It then used a synthetic fixture receipt to render a real silent preview, exported the selected closure, made the original workspace and its receipt unavailable, imported the package into a new directory, and replayed using only returned arguments and exported data. The restored MP4 is byte-identical.

Changing the imported brief or animation rejects the old receipt. A changed animation stops for new review, then a new fixture-only receipt permits rerendering. Only `match-route` and final assembly rerendered; the two unaffected source scenes, all Story plans and the narrative plan were reused. Original media and package bytes remain unchanged; no TTS database exists before or after import/replay/edit.

| Artifact | Actual measured result |
| --- | --- |
| Baseline / restored MP4 | H.264, 720×1280, 30 fps, 540 frames, 18.000 s; only a video stream; full FFmpeg decode exit 0 |
| Edited MP4 | Same media format/duration; full decode exit 0; different bytes |
| Baseline / restored SHA-256 | `b71b245c42eae10fee67cd7b5bbbeee58b5721db44f48451a0d58eb1a474bd2c` |
| Edited SHA-256 | `524508bab51de9054ec94db009f6605395d44356b2f23a71876fdbc298b1ba82` |
| Portable package | 93 files, 1,837,801 bytes, 12 selected tasks, 0 local speech receipts |
| Package digest | `88cb50c9264ed61f855eb9a0c6775342e44ffdeed4634b7fc141b1a2282c224d` |

Actual paths are in [media probes](../reviews/rsi-first-owner-v1/media-probes.json); raw fixture outputs remain under `D:/gve-anna-render-temp/first-owner-isolation-8d8d8b0/tmp/gve-fo-JjT4tO/`. The `w` and `i` directories hold the original and imported/editable copies; `p` is the transfer package. No MP4, package, database, model, voice reference or machine configuration is added to Git.

## Tests, repairs and limitations

Final clean-checkout validation: **36/36 targeted tests across eight files**, plus **1/1 real-media test**, TypeScript, 108-entry test catalog, canonical Skill validation and static entrypoint checks passed. These are 37 distinct tests; earlier 28/8/17-test reruns overlap and are not additional cases. The catalog counts classified files, not executed tests. Full regression was not run.

Actual final commands included:

```text
pnpm install --frozen-lockfile --ignore-scripts --store-dir <ISOLATED_STORE>
pnpm gve doctor --first-owner
pnpm gve doctor --first-owner --phase preview --voice none --language en-US
pnpm exec vitest run tests/capabilities.test.ts tests/cli-routing.test.ts tests/narrative-run.test.ts tests/project-portable.test.ts tests/creative-brief-runtime.test.ts tests/narrative-workspace.test.ts tests/test-catalog.test.ts tests/byo-api-feedback.test.ts
pnpm exec vitest run tests/first-owner-workflow.media.test.ts
pnpm typecheck
pnpm test:catalog
node scripts/check-agent-entrypoints.mjs
```

An early development render correctly rejected `PREVIEW_INPUT_CHANGED` when another implementer changed source during its fingerprinted run. Candidate freezing resolved that development coordination problem. The subsequent stripped-environment browser timeout and its OS-variable repair are preserved separately. The independent code Judge's initial **FO-J1 FAIL** found unconditional empty TTS database creation on silent import; the product fix and after-import/replay/edit assertions resolve that finding rather than weakening the contract. Initial script REVISE likewise remains alongside the narrower final candidate.

This is a supported technical integration, not polished social-video acceptance. The existing portrait diagnostic renderer still has a fixed Chinese source notice even with English authored labels; this is disclosed in the script. Some parent storyboard text/transitions are export-only. Newcomers must choose a supported visual plan or provide authorized assets for the showcase route, which has separate audio requirements. Actual English localization, natural speech, continuously watched audiovisual quality, macOS/Linux, another physical machine, real Claude and audience response are not certified. Anna/Chen references remain private, and original-code distribution licensing remains an owner decision.

The formal HTTPX video remains at owner script review. Next improvements should build on this bounded first-owner closure: evidence-backed demo selection, clearer blocked-stage navigation, and complete diagnostic-language localization before describing English technical output as polished release media.
