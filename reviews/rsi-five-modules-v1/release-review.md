# Independent scoped release review

Scope: test inventory matching, declared unit group dependencies and manual GitHub Actions workflow. Examined the shared Windows working tree before candidate freeze. No application source, test source, original evidence or workflow was modified during this review.

## Finding

The initial catalog guard used a top-level `readdir("tests")` while Vitest included `tests/**/*.test.ts`. A temporary fixture added `tests/sub/omitted.test.ts` alongside a catalogued top-level test. The classifier returned exit 0 and counted one classified entry. A nested test following the existing Vitest naming convention would therefore be omitted silently from catalog-backed runs. Resolve by recursively enumerating regular test files and add a regression for the nested unclassified case.

## Checks

- Compared `git ls-files tests` against the catalog. All 93 tracked files matching the three declared entrypoint patterns were classified. The separately named `mechanism-rename-attempt.node.mjs` is an explicitly spawned race-test helper, with no standalone tests.
- `node scripts/test-suite.mjs check` failed as expected when the two new showcase tests were present in the working tree before catalog insertion. There were no stale or duplicate entries in that snapshot.
- Invoked Vitest directly with the then-current catalog's `unit` file list and deliberately nonexistent `GVE_BROWSER`, `GVE_FFMPEG`, `GVE_FFPROBE` and `GVE_ANA_PROFILE` paths. All 23 files and 140 tests passed. The direct invocation held the selected set fixed while the catalog guard was waiting for the showcase entries.
- Workflow inspection confirmed manual dispatch, read-only repository permission, pinned action revisions, a pinned Node/pnpm combination and a frozen lockfile install. Media smoke is opt-in and installs FFmpeg. It depends on a browser present on the hosted image, as tested by the legacy doctor before the smoke. The unit stage has no explicit voice, browser or FFmpeg provisioning.

The builder replaced the top-level scan with a recursive inventory and added a nested omission case. I reran `tests/test-catalog.test.ts`; it passed after the fix. The remaining missing entries at that point were the two new showcase files awaiting insertion in the final catalog.

Hosted Actions and a fresh install were not executed as part of this scoped review. The owner of module 5 is running the clean local snapshot checks.
