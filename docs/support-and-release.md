# Supported environments and release checks

The engine is a local toolkit driven by the user's current Codex or Claude Code session. It is not a hosted model service. Capability, execution, perception and distribution permission are separate checks.

Current executed evidence: [five-module RSI results, 2026-11-13](rsi-five-modules-results-2026-11-13.md).

## Check this computer first

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm gve doctor --capabilities --phase planning
pnpm gve doctor --capabilities --phase preview --voice imported --language en-US
```

Planning requires Node 24 and writable local storage with SQLite/hard links. It can run before a browser, FFmpeg or a voice runtime is installed. Media phases check their own dependencies. The capability report contains explicit ready, blocked and not-checked states and actionable reasons; it does not generate media or validate user content.

Local synthesis uses the configured owner profile, currently Windows CUDA Anna/Chen or explicitly selected Windows Huihui. A clone does not include the owner's reference audio, Python environment or model. Imported finished WAV and intentionally silent output avoid that private GPU dependency; they still require the applicable local rendering tools. A reference-voice or paid narration API preference is not a working adapter merely because it is representable in a brief.

## Verification matrix

| Surface | Evidence | Remaining boundary |
| --- | --- | --- |
| Windows x64, Node 24.22.1 | Current development/targeted integration environment. Detailed cycle results are recorded separately. | This is not a Windows-version or hardware certification. |
| Windows CUDA owner voice | Existing owner-approved local outputs; capability probe checks configured runtime. | Reference/model not distributed; current probes are not a fresh subjective voice assessment. |
| Imported WAV / silent preview | New explicit modes, with source/receipt binding and platform-aware preflight. | See real-media cycle results; do not infer macOS/Linux media support from TypeScript compilation. |
| Windows offline speech recognition | Actual installed desktop recognizer produced timing/recognition diagnostics. | Low-confidence ASR is a review aid, not guaranteed forced alignment or naturalness validation. |
| macOS / Linux | Portable contracts and some non-synthesis paths can be represented. | No new native-host execution in this cycle; mark unverified until run. |
| Codex | Current session engineering; historical URL-authoring runs are separate evidence. | An automated CLI is not proof a fresh agent will complete every repository's story. |
| Claude Code | Shared skill routing/static entry validation. | No current authorized Claude session tested; do not borrow Codex's result. |
| GitHub-hosted CI | Manual-only workflow checked into the repo with pinned Action commits. | Not executed simply by adding the YAML; account/runner costs belong to its operator. |

No original-code license is selected by these checks. The owner still decides distribution terms, and third-party media/fonts/models/voice references retain their own requirements.

For changes to an existing approved reel, use [guarded showcase revisions](showcase-revisions-v1.md). The session agent turns feedback into an explicit, reviewable change plan; unsupported narration or new-asset edits remain separate authoring work. Preparing a draft makes no media and preserves the accepted baseline.

## Test inventory

`tests/catalog.json` explicitly classifies every `*.test.ts`, `*.node.ts` and `*_test.py` entry. Support/child files are not entrypoints. A new, stale or duplicated entry fails `pnpm run test:catalog` before a suite starts.

- `pnpm test`: local unit, integration and deterministic Node suites.
- `pnpm run test:unit`: fast local contract/filesystem checks; no model calls.
- `pnpm run test:integration`: local workflow/process checks; may need installed media tools.
- `pnpm run test:media`: actual media suite, explicitly requested.
- `pnpm run test:smoke`: existing real Remotion/recovery/decode smoke.
- `pnpm run test:optional`: existing local project-dependent tests; report skipped fixtures honestly.
- `node scripts/test-suite.mjs node-media` and `provider`: opt-in media/provider harnesses. Do not run a provider suite without checking its local prerequisites and authorization.
- `pnpm run test:python`: existing Python test entrypoints; set `GVE_TEST_PYTHON` if required.

Development uses affected suites. Release validation uses a fresh source snapshot, frozen dependency installation, typecheck, skill routing, capability checks and selected real media/recovery tests. Passing a subset must not be reported as a full regression.

The GitHub workflow is `workflow_dispatch` only, with read-only repository permission and no publishing job. It does not run on push. It defaults to unit checks; the operator may explicitly enable the synthetic media smoke, which provisions FFmpeg. Pinned package and Action versions do not pin the hosted OS image or FFmpeg package; the generated runtime inventory identifies what actually ran.

For the remaining first-owner and cross-host acceptance work, see the [product completion roadmap](product-completion-roadmap.md). New feature plans are not claims of implemented or independently accepted support.
