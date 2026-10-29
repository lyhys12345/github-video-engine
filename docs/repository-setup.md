# Repository scope and portable checkout

This repository is the maintained source checkout. Local execution archives are deliberately outside the Git snapshot. `.gitignore` does not delete them, and the original files edited during preparation were copied to ignored `work/github-prep/originals/` before edits.

Included: TypeScript source, configuration, pnpm lock/workspace files, tests, versioned schemas, editable example inputs and compositions, source-grounded REA story drafts, architectural documentation, selected gate policies/review instructions/result summaries, and licensed font/source fixtures.

Excluded: `node_modules`, pnpm caches, runtime/job databases and sidecars, `.gve`, `work`, test/acceptance/demo outputs, generated preview/comparison directories, rendered video/audio/images, copied standalone delivery projects, frozen candidates and reviewer scratch data. Environment files and private-key patterns are ignored. The initial source repository does not ship generated media or claim to reproduce historical reviews from missing local archives.

The tests need small read-only source fixtures. These were copied unchanged from the existing local archive into `fixtures/sources`; four example graphs now reference the portable paths. Their source hashes and exact citations were preserved. Included gate files under `reviews/M1`, `reviews/M2`, `reviews/M3` and the historical owner AV deferral are runtime/test policy inputs, not new approval grants. Existing final AV/creative acceptance remains separate.

`.gitattributes` keeps ordinary checkout text in LF form and disables text conversion for provenance fixtures and font assets, whose exact byte hashes matter. Both experimental renderer entry points now use `GVE_DATA` when set, otherwise project-local `.gve/experiments/` state roots, rather than the author's absolute workspace path. The original state directories are untouched.

Use Node24 and pnpm11.25.0, then `pnpm install --frozen-lockfile`, `pnpm run typecheck` and `pnpm test`. The npm configuration no longer sets a path into the author's parent workspace; pnpm uses its normal configured store. Local Chrome/Chromium and FFmpeg/FFprobe are required only by the corresponding media commands/tests. Windows state/checkout paths should be short, and real hard-link/junction tests need ordinary local filesystem permissions.

For no-media usage follow `pnpm gve explain` in `planning-runtime-v1.md`. This is the experimental mechanism-plan path, not automatic research-to-full-film generation. The repository's historical composition builders may retain author-machine state paths or research-archive dependencies; use documented public CLI entry points for portable operation. No claim is made that every old investigative script is runnable from a fresh checkout.

The bundled Noto font is approximately17MB and is retained because rendering uses its pinned bytes. Its OFL is included. Generated videos and other media exports remain local. Third-party source fixture MIT notices and Shotcraft-derived animation attribution are retained. No license for the project's original code is invented by placing it in a private repository.

Historical Markdown reports preserve original results and may reference local-only logs, databases, media and frozen evidence. They are historical records, not proof that the current checkout was independently executed. New clean-checkout verification must report the commands actually run and any environmental failures separately.
