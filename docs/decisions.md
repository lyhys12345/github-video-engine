# Architecture decisions

## ADR-001: One package, separate modules

Use one strict TypeScript package in a pnpm workspace with named module boundaries. Separate packages become useful only when independent publishing or ownership appears. No network service or empty package is needed for the local vertical slice.

## ADR-002: Node 24 built-in SQLite

Use `node:sqlite` instead of a native third-party SQLite extension. This avoids an extra compiler toolchain and keeps real transactional storage. Node 24.x is required and was tested at 24.22.1. Built-in SQLite API stability must be reviewed before broad runtime upgrades. WAL data must be treated as part of the database; do not copy a live database file alone for backup.

## ADR-003: Immutable files plus durable checkpoints

Use SHA-256 blobs and atomic same-volume hard links, then a SQLite step commit. A filesystem and database cannot share one transaction; the safe crash outcome is unreferenced files, not a database reference to a partial success. Storage must support hard links. The engine intentionally fails instead of falling back to overwrite-based publication. This computer's restricted execution context blocks links; tests and rendering ran with the authorized normal local process permissions.

## ADR-004: Renderer isolation and explicit media normalization

Remotion bundles only trusted local renderer source and launches its own headless browser. The orchestrator controls it as a subprocess with deadlines and process-tree cleanup. Explicit FFmpeg normalization was added after real FFprobe inspection found `yuvj420p` despite requesting yuv420p from Remotion. The extra encode costs time, but makes M0's compatibility contract inspectable and consistent.

## ADR-005: Conservative cache and bounded recovery

Input/environment fingerprints prevent stale reuse; stored blobs are checked before every reuse. Two total attempts prevent unbounded retry loops. M0 favors an explicit new submission after source/tool changes over resuming with changed semantics. A future administrative retry operation must preserve history and receive a separate design review. A changed asset declaration invalidates downstream rendering; style changes can reuse resolution.

## ADR-006: Pinned dependencies and webpack compatibility

Remotion packages are all 4.0.538. React/ReactDOM, Zod, TypeScript, tsx, Vitest and types are pinned; `pnpm-lock.yaml` locks transitives. `webpack` is overridden to 5.112.2 because the installed `schema-utils` peer requirement was newer than Remotion's transitive webpack pin. `pnpm peers check` was run after this fix. `allowBuilds.esbuild=true` uses pnpm 11's explicit install-script policy. No global tool upgrade is part of M0.

## Remotion licensing and supported platforms

Inspected the installed `remotion@4.0.538/LICENSE.md` and [official license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). This is a custom license, not an unconditional MIT grant. Its free tier covers individuals, qualifying small/nonprofit entities and noncommercial evaluation; other entities need a company license. This local engineering evaluation makes no paid API call and purchases no license. Reassess applicability before commercial operation or redistribution; future Remotion major versions may change terms.

The pinned renderer publishes compositor packages for Windows x64, macOS x64/arm64 and Linux x64/arm64. Package availability does not prove this engine works on each platform. **Only Windows x64 was actually tested here.** The current [official installation requirements](https://www.remotion.dev/docs/) list macOS 15+ and Linux glibc 2.35+ with extra dependencies, and exclude Alpine/nixOS. This engine uses Node 24.x and an existing Chrome executable; it does not invoke automatic browser downloads. The exact local browser file identity and FFmpeg versions are captured in each job manifest.

## Deferred decisions

No distributed workers, authentication, remote asset fetches, arbitrary templates, AI providers, repository execution, reference analysis, queue service, web app, cloud deployment, account billing or M1 are implemented. Store garbage collection, power-cut durability tests, live backup, cross-platform certification, retry administration, schema migration and stronger browser/font inventory remain future engineering work.
