# rembg synchronized short candidate 2 / evidence

- Role: evidence, judges-v2; active for P1–P8 and R1–R6 evidence integrity.
- Frozen manifest SHA-256: `4c96c26e364dca2c1eda1efce5bbf0196de774866779af577bd81be39613f566`.
- Candidate: `work/unreviewed-preview-v1/candidates/candidate-2`; base commit `966358c807f14a84ea90986bcc13fcfd1132d1d0`.
- Review date: 2026-11-02, approximately 17:22–17:33 America/Los_Angeles. macOS arm64, Node v24.11.0, existing dependencies; isolated scratch `/private/tmp/rembg-evidence-c2-independent/source`.
- **Conclusion: PASS for the evidence role's conditional engineering scope.** Independent listening/perceptual timing/continuous AV remain UNVERIFIED; final owner acceptance and G6 remain pending.
- Independence: read frozen contracts/common/role and primary artifacts; no peer report or builder summary was used as proof. No source, contract, test or original evidence edited. No render, model inference, network, paid operation or target-project execution.

## Findings

No blocker or major evidence defect found. All 388 source files and 429 evidence files match the frozen manifest's bytes and SHA-256, with no duplicate, missing or unlisted regular file. The `node_modules` symlink is an explicitly reused local dependency environment, not claimed to be a frozen clean installation.

Both distinct real MP4s are retained. Independent full decoding exits 0; fresh frame-counting probes confirm 977 frames, 1080 × 1920, 30 fps, H.264/yuv420p and 48 kHz AAC. Durations are 32.567 seconds at container precision. MP4 hashes are:

- unreviewed preview: `4c7c2e856dee456779a5acbcb6e106ba34db56a4400cba6767b7a9cc04f78c2f`
- owner-reviewed-boundary candidate: `a045b9b610c6752026b26539116bd4fe8d8c986b768bb2d7c3574ed0e4aff960`

The owner record preserves the exact supplied six-boundary answer and scope. Each audition hash matches its preserved WAV; each WAV payload exactly matches its declared slice of the preserved decoded source. Sidecar 1.1 is bound to the owner record hash and its voice/transcript/caption/boundary identities. This verifies record integrity, not independent hearing of the auditions or a platform-authenticated chat export. The direct owner statement was supplied as review authority by the coordinator.

## Clause evidence

| Clauses | Result | Evidence and method | Limits |
| --- | --- | --- | --- |
| P1, R1–R2 | PASS | Actual original source audio hash `31c470…b4d5` in both media closures, exact narration/plan/caption hashes, same source pack; independently verified six audition source slices and strict separate input modes. | Original speech provenance is historical declared generation evidence; no new synthesis or independent transcript listening claimed. |
| P2–P3, R1–R3 | PASS | Rebuilt each actual frozen timeline and SRT byte-for-byte/structurally from its actual captured draft or reviewed sidecar using frozen copied implementation. Independent focused tests reject stale identities, malformed clocks/tokens/cuts, mixed modes and fabricated review state. | Tests are local validator/unit tests; no model run or perceptual evidence. |
| P4, P8, R3, R6 | PASS for evidence honesty | Preview retains PROPOSED_UNREVIEWED draft, pending badge SVG evidence, unreviewed SRT, UNVERIFIED timing/content/listening; reviewed route retains caller-declared-reviewed-timing-independent-unverified. Actual PNG sample files are present and manifest-bound for independent visual review. | This role did not view PNGs or listen; visual/content judgment belongs to active specialists. It does not establish all-role PASS. |
| P5, R5 | PASS | Every frozen source/evidence file hash verified; all nine captured implementation files match frozen source and computed implementation fingerprint; both 35-file source-pack closures match manifests and actual implementation.txt matches captured factual fixture. Distinct outputs and prior PCM failure preserved. | Historical execution is not cryptographically attested; current actual byte closure plus own checks supplies reproducible evidence. |
| P6, R4 | PASS technical | Independently decoded/probed both actual MP4s and decoded original MP3 using explicit fltp reference; full 1,514,685 source frames match each narration stem exactly after 19,200 lead frames. Stem has 1,563,200 frames with 29,315 silent tail frames. | Exact PCM result applies to intermediate PCM stem; final AAC is lossy. Decoding and PCM equality are not listening. |
| P7, R5 | PASS | Raw frozen full-tests.log: 38 test files, 346 passed, 2 skipped; typecheck recorded exit 0. Own isolated run: 58 passed in 3 focused files, plus independent typecheck exit 0 and 98 evidence assertions. | Own 58 overlap the full regression and must not be added to its unique test count. No full suite rerun or clean dependency installation was performed. |

## Primary raw evidence checked

- `evidence/validation/results.json`, `full-tests.log`, `typecheck.log`, render logs and PCM comparison records.
- Both modes' `input.json`, `commands.json`, `runtime/worker-result.json`, captured implementation, timeline, caption file, source pack, source audio, narration WAV, MP4, probes and sample PNG inventory.
- `owner-boundary-review-2026-11-02.json`, `cue-timing-owner-reviewed-v1.json`, actual draft, decoded source and all six auditions.
- Historical preparation/readiness records remain expressly preparation-only; their old unreviewed/pending status is not treated as the current render or owner-boundary decision.

The initial PCM comparison failure remains valid as recorded: the default-format reference differs in 258 signed16 samples by at most 1 LSB. My independent explicit-fltp decode reproduces exact full-stem equality, and I independently reproduce the retained default-reference mismatch statistics. This narrows the comparison to matching resampler format negotiation; it does not rewrite the failed attempt as a pass.

## Independent reproduction and raw outputs

`check.py` is saved alongside this report. Run `python3 work/unreviewed-preview-v1/judges/candidate-2/evidence/check.py` from this checkout; it only reads frozen artifacts, runs trusted FFmpeg/FFprobe decoding/probing and writes judge-owned logs. It records exact media commands, exit codes, assertions and hashes in `independent-checks.json`; all 98 checks passed. `inventory-check.json` records complete inventory equality.

In the isolated source copy, using the repository's absolute `work/tools/node-v24.11.0-darwin-arm64/bin/node`:

1. `node node_modules/vitest/vitest.mjs run tests/unreviewed-preview.test.ts tests/continuous-segment.test.ts tests/short-segment.test.ts`: exit 0, 58/58; `own-focused-tests.log`.
2. `node node_modules/typescript/bin/tsc --noEmit`: exit 0; `own-typecheck.log` is empty as expected.
3. `node --import tsx actual-evidence-check.ts`: exit 0; `actual-evidence-check.log` records both actual frozen timeline/SRT derivations match. The script is retained here; copy it into the isolated source root to resolve imports.

Two judge-script setup errors were corrected before successful verification: an initial Python boolean-expression syntax error and an inventory-check invocation with the scratch cwd instead of repository cwd. Neither executed a candidate check successfully or changed frozen material; neither is counted as a candidate failure or passing check. The successful checks and tool exit statuses are recorded separately.

## Self-limitations

No audible/perceptual or continuous whole-film assessment was performed. Original voice identity, exact submitted generation text and actual owner hearing remain declared/historical evidence within their stated scopes. No clean installation, network access, fresh render or inference was attempted. No peer reports were read, so this report cannot certify other active roles or final acceptance. Broader security and factual interpretation remain separate specialist responsibilities. These limits do not waive P/R obligations; the explicit owner AV deferral leaves those acceptance items pending.
