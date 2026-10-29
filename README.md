# GitHub Video Engine

A local TypeScript engine for evidence-backed GitHub project explainer videos. The long-term workflow is repository research → grounded story and storyboard → editable motion design → evaluation → human review.

**Current state:** durable jobs, immutable artifacts, read-only research, versioned planning contracts, local Remotion/FFmpeg rendering, and the public evidence-planning CLI are implemented. M0–M4 engineering records are historical; final creative/continuous audiovisual acceptance remains separate. The latest development regression ran **233 tests across 23 files**, including 16 planning-runtime tests. Counts are tied to their recorded source versions, not a claim that a fresh checkout has already been tested.

The `explain` path is an explicitly experimental **18-second mechanism-plan compiler**. It consumes agent-curated semantic evidence graphs; it is not automatic URL understanding or the approved approximately three-minute REA story. A versioned production narrative contract supporting content-led pacing up to five minutes remains future work. See [planning runtime](docs/planning-runtime-v1.md), [current engineering result](reviews/planning-runtime-v1/RESULT.md), and [repository scope](docs/repository-setup.md).

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
