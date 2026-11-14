# Independent recheck of the media review digest

Reviewer: /root/speech_alignment  
Candidate checked: 2026-11-13  
Verdict: **PASS for the raw review integrity fix.**

The media review write path now derives `evidenceSha256` from the canonical raw observation report and includes this value in the report passed to the legacy repair chain. The chain commits the resulting report digest. Status verifies that the separate acceptance receipt agrees with the chain record, that its raw digest agrees with the chain report's evidence hash, and that the original raw report and reconstructed chain report recompute to their saved digests. Optional evidence hashes preserve existing text-only reports.

The additional regression replaces the raw file and updates the media-local acceptance receipt while leaving the chain intact. The recheck rejects the substitution. My independent run of `pnpm exec vitest run tests/rsi-media.test.ts tests/rsi-repair.test.ts tests/rsi-experiment.test.ts` passed all **10 tests** in 3 files. These local content hashes assume trusted chain history. They do not authenticate an observer or protect against a rewrite of the whole authority chain. Perceptual coverage remains **UNVERIFIED**.

| Checked file | SHA-256 |
| --- | --- |
| `src/workflow/rsi-experiment.ts` | `229b21e69e79abe56f32ca766caccdd6deb9b22f6cb050f123b003b3ea8f6994` |
| `src/workflow/rsi-media.ts` | `214d396225bfe88893cefea79677564d0d2e4ec0c6aeb4aae4395ed0f6367741` |
| `tests/rsi-media.test.ts` | `1514963196a449ba03473c24c190c5b6e5da9fc45b9099f61827ee36485dc9c4` |
