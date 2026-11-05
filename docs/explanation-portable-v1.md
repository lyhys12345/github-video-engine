# Portable reviewed explanation data

Portable v1 transfers a reviewed narrated **short preview** as data into a new local state. It contains the exact source snapshot, original proposal/presentation, original attributed review receipt, original per-beat audio and historical audio receipts. It contains no SQLite databases, runtime code, renderer script or dependencies. No imported file is executed and no source URL is fetched.

1. `pnpm gve explanation portable-export --task <reviewed-narrated-preview> --data <original-state> --out <new-export-directory>`
2. Copy the returned `output.bundle` directory to the receiving machine/path. Keep the separately returned `packageDigest` as the expected value.
3. `pnpm gve explanation portable-import --root <copied-bundle> --expected <packageDigest> --data <new-local-state> --out <new-edit-handoff>`
4. Copy the returned handoff bundle's `edit.json`, edit its supported presentation parameters, beat frames, event timing, offsets or caption ranges, and run `pnpm gve explanation portable-render --task <import-task> --spec <edited.json> --data <new-local-state> --out <new-proposed-preview>`.

The receiving machine needs this trusted engine, Node 24, its installed dependencies, a local browser and FFmpeg/FFprobe. The data package supplies neither executable code nor runtime setup. Existing ordinary `explanation export` bundles are not this format; create a versioned portable export from the original verified state. Version 1 accepts narrated reviewed previews up to 60 seconds and keeps the original duration limit. It does not authorize a formal full film.

`--expected` verifies the caller-held manifest bytes and every listed audio/receipt byte. It is not a signature or proof of source/reviewer identity. A person who changes a whole package and chooses a new digest can describe a different claimed history. Import therefore rechecks source hashes and pinned URLs, source/workspace fingerprints, exact quote lines, all proposal references and the original presentation review binding, while explicitly leaving identity and source authenticity unauthenticated. Unlisted files, executable scripts, databases, linked package entries, unsafe overlap and missing or altered assets are refused before an import task is created.

Three identities remain separate:

- Original authored data and its attributed review receipt retain their original bytes and hashes as historical evidence.
- The portable package digest and actual local import task identify an immutable local data/audio snapshot. Local project IDs derive from that task, so importing another package cannot overwrite the original author's project namespace.
- Local execution rebinds proposal/plan identity and imports the exact audio as a new caller-declared local recording, measures/decodes it locally and uses playbackRate 1. The new voice receipts and complete execution mapping enter the proposed render identity and its new review packet.

The hidden-file Chinese presentation uses an explicit separate `portable-imported-original-audio/1.0` path. Its synthetic-tree rules, source citations, ignore-rule disclaimer, layout and narration-fit checks remain enforced. Existing Huihui-generation profiles retain their original strict generation requirement. Imported audio is not certified as WinRT-generated, a particular speaker or a transcription match. Source audio and original receipts are preserved, but old generation tasks are not recreated or marked successful.

Every imported render is `PROPOSED_LOCAL_EDIT_NOT_AUTOMATICALLY_APPROVED`, with current review, listening and owner acceptance pending. `portable/current-fact-review-packet.json` covers the new local proposal, visual parameters, voice receipts, offsets and captions; the old receipt is stored separately as `portable/historical-review-receipt.json`. It cannot be passed as current approval. This first version does not bind a new current review receipt, change the manuscript or replace its audio. Those require a separately authored/reviewed input and matching audio workflow; users cannot relabel an old recording by editing the portable render specification.

After import, rendering reads the immutable local import task and CAS snapshots, not the received package path, original state, previous absolute export paths or original generation tasks. Repeating the same render rechecks the local closure and reuses the checkpoint. A changed parameter/timing/caption creates a new proposed candidate; old outputs remain available. Use a new output directory for each exported candidate. Actual audio content, naturalness, word alignment, rendered pixels, continuous audiovisual quality and final owner/G6 acceptance remain unverified by these technical checks.
