> New computer / continuation: read the project handoff in Google Drive: https://drive.google.com/file/d/1YtEYD-TT-qk87WjYjGPi05OIQpTespxd/view .

# GitHub Video Engine

## Watch the workflow

[![GitHub Video Engine workflow video](docs/media/engine-workflow-poster.png)](docs/media/engine-workflow.mp4)

[Watch or download the 70-second video](docs/media/engine-workflow.mp4) · 中文旁白 / Chinese narration

Using **The World We Know / 山海所知**, this walkthrough shows repository research, script and storyboard approval, feedback-driven revision, and delivery of a narrated MP4 with editable project files. Product footage comes from the actual map. Workflow screens are labelled reconstructions, and scene reordering was demonstrated using an exported project copy.

Run the skill in a configured Codex engine checkout with the local media dependencies installed. The session agent authors the story and project-specific visuals. Local narration requires separately configured model files and an authorized reference recording. See [setup and usage](docs/codex-user-path-v1.md) and [voice configuration](docs/narration-voice-preference.md). Sampled-frame review and full-file decoding passed; continuous audiovisual acceptance remains pending.

Map and repository shown in the case study: [Greenere/the-world-we-know](https://github.com/Greenere/the-world-we-know).

A local TypeScript engine for evidence-backed GitHub project explainer videos. The long-term workflow is repository research → grounded story and storyboard → editable motion design → evaluation → human review.

**Current state:** durable jobs, immutable artifacts, read-only research, versioned planning contracts, local Remotion/FFmpeg rendering, and the public evidence-planning CLI are implemented. M0–M4 engineering records are historical; final creative/continuous audiovisual acceptance remains separate. The latest development regression ran **233 tests across 23 files**, including 16 planning-runtime tests. Counts are tied to their recorded source versions, not a claim that a fresh checkout has already been tested.

For the Codex user path, open this trusted engine checkout as the Codex project and ask: `请把 https://github.com/OWNER/REPO 做成可编辑的中文有声技术预览。` The project instructions select its repository skill; the session Agent reads the captured sources and authors the plan. You do not write JSON. Continue in the same chat with ordinary feedback. See [Codex user workflow and observed execution limits](docs/codex-user-path-v1.md).

The GitHub explainer skill presents a source-backed script and shot-by-shot storyboard for user review before generating video. The user can request changes and explicitly approve the resulting version. The normal `explanation run` CLI checks a script review receipt bound to the author files and requires approval of that same revision before media stages. The session agent obtains independent reviews and applies revisions. `explanation video-review` checks the receipt against the rendered MP4 and reports whether to revise, obtain missing evidence or proceed to owner review. Lower-level operator commands have their own review policies. Final output quality and source semantics still require review.

The owner's default narration is the previously accepted **local Chen-style approximation**, without paid voice services. The unified runtime can use a separately configured Windows CUDA model and reference audio; if unavailable it stops rather than silently switching voices. The old Windows Huihui voice is available only as an explicitly requested per-run alternative. See [narration voice preference](docs/narration-voice-preference.md).

The lower-level operator path remains `project intake`, `project evidence`, and `project story`; see [URL intake](docs/url-intake-v1.md).

An opt-in [bring-your-own OpenAI-compatible API author adapter](docs/byo-api-author-v1.md) connects one structured provider response to source-bound planning. It defaults off, reads keys only from the process environment and requires explicit per-call activation/budget. Local HTTP mock/CLI tests pass; real providers and API-authored media remain unverified.

[Explicit BYO API feedback](docs/byo-api-feedback-v1.md) connects one ordinary feedback request to a validated narration/visual plan, guarded application and keyless local preview continuation. Local mock plus real short-media/history/cache checks pass; real model interpretation remains unverified.

Claude Code has a shared-workflow project entry via `CLAUDE.md` and `.claude/skills`; see [Claude Code setup and current verification limits](docs/claude-code-user-path-v1.md). Local entry checks passed; real Claude model execution remains unverified because its CLI was unavailable in the tested environment.

The `explain` path is an explicitly experimental **18-second mechanism-plan compiler**. It consumes agent-curated semantic evidence graphs; it is not automatic URL understanding or the approved approximately three-minute REA story. An additive experimental story contract now supports content-led timing up to five minutes, persisted asset packs, continuous segment rendering and a bounded TTS adapter; see HANDOFF.md and docs/story-planning-v1.md for the current checkpoint. See [planning runtime](docs/planning-runtime-v1.md), [current engineering result](reviews/planning-runtime-v1/RESULT.md), and [repository scope](docs/repository-setup.md).

## Requirements

- Node.js **24.x** and pnpm **11.25.0**.
- A local filesystem supporting atomic same-volume hard links; Windows x64/NTFS is the tested environment.
- Rendering and media integration tests additionally require local Chrome/Chromium and FFmpeg/FFprobe. The engine does not automatically download a browser.
- No paid API key is required. Research does not install or execute target repositories.

On Windows use a short checkout and state directory. `explain plan` conservatively limits the resolved `--data` path to 167 UTF-16 units and fails before writes if it is too deep. Other native renderer path limits remain documented in [decisions](docs/decisions.md).

## Install and verify

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
```

`pnpm test` includes real SQLite, filesystem/process and FFmpeg fixture checks, alongside clearly labeled mocked-media/approval tests. Some Windows tests require ordinary local permissions for hard links and junctions; restricted sandboxes can reject those operations. Test fixtures are generated locally and ignored by Git.

To verify the media runtime separately:

```sh
pnpm run doctor
pnpm run test:smoke
pnpm run test:acceptance
```

Use `pnpm run doctor`, not pnpm's unrelated built-in `pnpm doctor`. Smoke/acceptance generate fresh local media and can take several minutes; they are not required for read-only review or planning-only work.

## Evidence planning without generating media

```sh
pnpm gve explain plan --spec examples/evidence-planner-v1/rea-evidence.json --root . --data .gve/explain --out work/rea-plan
pnpm gve explain plan --spec examples/evidence-planner-v1/rembg-evidence.json --root . --data .gve/explain --out work/rembg-plan
pnpm gve explain status --task <task-id> --data .gve/explain
pnpm gve explain export --task <task-id> --data .gve/explain --out work/re-export
pnpm gve explain diff --before <old-task-id> --after <new-task-id> --data .gve/explain
```

The output's `bundle/` contains immutable source snapshots, exact citations, the semantic graph, compiled plan, portable graph, review packet and hash manifest. Source/semantic changes invalidate affected plans; duplicate valid inputs reuse a verified durable task. Status/export use a copied stable SQLite/WAL snapshot and do not create missing state. Diff reports semantic dependency guidance, not rendered-media reuse. Claims still need human/Judge semantic review: matching quotes prove provenance, not truth.

## Other implemented commands

```sh
pnpm gve research --repo https://github.com/owner/repository --out work/snapshot.json
pnpm gve render --spec examples/demo.v1.json
pnpm gve jobs status
pnpm gve jobs resume <job-id>
pnpm gve jobs cancel <job-id>
```

The historical operator workflow also exposes `project`, `production`, `final`, `diff` and `audit`. See [operator runbook](docs/operator-runbook.md) for contracts, approvals, recovery, usage accounting and immutable delivery. No command grants final human approval automatically.

Environment overrides: `GVE_DATA`, `GVE_BROWSER`, `GVE_FFMPEG`, `GVE_FFPROBE`. They are local paths/settings, not shell commands or credentials.

## Source layout

| Path | Purpose |
|---|---|
| `src/contracts`, `schemas` | Versioned Zod/JSON Schema contracts |
| `src/orchestrator`, `src/assets` | SQLite task ownership, retries, recovery and content-addressed artifacts |
| `src/providers`, `src/workflow` | Read-only inputs, production workflow and review gates |
| `src/evidence-planner` | Provenance checks, mechanism compiler and public planning runtime |
| `src/renderer`, `src/final-renderer`, `src/evaluation` | Trusted local Remotion rendering, finishing and media checks |
| `tests` | Unit, real filesystem/process/CLI and explicit media integration tests |
| `fixtures/sources` | Portable, hash-bound, read-only REA/rembg text fixtures and licenses |
| `examples` | Editable input contracts, story drafts and historical composition source |
| `docs`, `reviews` | Architecture, decisions, policies and concise review results |

This is one pnpm workspace package with logical module boundaries. No cloud services, database server, web application or distributed queue is required.

## Repository and licensing boundaries

The repository contains maintained source, documentation, tests, contracts, licensed font assets and selected policy/result records. Runtime databases, caches, source-research scratch, frozen candidate archives, media exports and copied standalone delivery projects remain local and are ignored. No local file is deleted by `.gitignore`. Historical reports may link to those local-only evidence paths; absence from Git is not a rewritten historical PASS. Legacy example render scripts may retain author-machine paths and are not advertised as portable public entry points.

The bundled Noto Sans SC font retains its SIL Open Font License. Remotion has its own license; review [licensing and platform decisions](docs/decisions.md) before commercial use. Upstream REA/rembg fixture notices are retained in `fixtures/sources`; model weights are not included. Derived motion code retains attribution under `src/final-renderer/ATTRIBUTION.md` and `src/final-renderer/upstream/LICENSE`. No new license for this project's original code is inferred by this private repository preparation.

Known limits include agent-curated semantics, a bounded visual vocabulary, incomplete production narrative automation, Windows path constraints, and pending final perceptual review. Code generation, successful decoding and test counts do not establish audience retention or cinematic quality.

完整叙事的 Agent 入口与机器可读 next actions：[操作说明](docs/agent-narrative-workflow.md)。从 GitHub URL 开始，按当前已提交检查点执行 explanation next；内容解释和创作仍需真实 Agent/人工输入，事实和视听保持待审。

统一 URL→作者等待→检查点恢复→完整有声可编辑预览入口：[explanation run](docs/narrative-run-v1.md)。已用全新 Marked 工作目录实跑，并验证离线缓存、跨场景编辑及原目录不可见时的可移植重导出。
