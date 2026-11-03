# rembg-sync-candidate-2 / security

- Role/version: `security`, frozen `reviews/judges-v2/roles/security.md` and `common.md`.
- Active scope: P1–P3, P5–P7, and R1–R6 insofar as authorization, data integrity, trusted execution and retained pending states are concerned.
- Candidate manifest SHA-256: `4c96c26e364dca2c1eda1efce5bbf0196de774866779af577bd81be39613f566`.
- Review window: 2026-11-02 approximately 17:19–17:25 America/Los_Angeles (completed 2026-11-03 01:25 UTC). macOS arm64, existing Node v24.11.0 and dependencies, no installation.
- Independent scratch: `/private/tmp/sync-security-ss_ytxs7`; output: `work/unreviewed-preview-v1/judges/candidate-2/security/`.
- **Conclusion: PASS within the bounded local short-preview security scope.** No unresolved blocker or major found.
- Independence: read frozen contracts, implementation and raw artifacts before forming this conclusion; no peer reports or builder narrative summary read. Initially assigned security/evidence, then explicitly narrowed to security before findings; no evidence-role report produced. Frozen/shared files were not edited.

## One-page conclusion

The new proposal consumer reads bounded JSON and a fixed sibling `decoded.wav`, validates source/text/phase/PCM bindings, recomputes cuts, and emits explicitly unreviewed state. Proposal command strings and tool paths are inert metadata. A controlled independent probe substituted shell commands into those fields: timeline computation succeeded with unchanged cuts and no marker file appeared. The process wrapper also passed literal shell metacharacters as data and terminated its own deliberately timed-out child.

The reviewed route uses the distinct owner-declared 1.1 sidecar. The exact owner record retains “六处已听审，切点均合适” with its six-boundary question and leaves independent listening, whole-film review and G6 unapproved. I recomputed both actual frozen timelines and obtained exact equality with their recorded artifacts. This verifies data routing and authority labeling, not whether the owner listened or whether timing sounds good. The owner's actual utterance is supplied as task authority; the stored record and input hashes agree with it.

All 388 source and 429 evidence manifest entries matched bytes, SHA-256 and regular-file expectations. Both nine-file captured renderer implementation sets match frozen source. The two actual MP4 hashes match their evaluation records. Command records show local engine Remotion worker plus FFmpeg/ffprobe, not rembg target execution, a model worker, paid provider invocation or publication. This is a local trusted-tool review, not an OS-isolation certification or a guarantee about arbitrary hostile media or arbitrary caller-selected paths.

## Clauses and evidence

All paths below are relative to `work/unreviewed-preview-v1/candidates/candidate-2/` unless identified as this report's output.

| Clause | Result | Evidence and method | Limitation |
| --- | --- | --- | --- |
| P1 / R2 authorization and bounded work | PASS | `evidence/{unreviewed-preview,owner-reviewed}/commands.json`, input, evaluation and runtime input; static call-graph inspection of `src/short-segment/render.ts`, worker and composition. Seven local tool calls per mode, 977-frame timelines, same source audio hash. | No new renderer/model execution; no claim of observing every historical OS syscall. |
| P2 / R1–R3 mode and review authority | PASS | Frozen contracts and owner record; actual timeline reconstruction; focused tests reject mixed timing paths, promoted status, renderable=true and fabricated review fields. Owner-boundary binding check confirms draft/audio/plan and all six audition hashes. | Caller-reviewed timing remains independently unverified. Full AV/G6 pending. |
| P3 untrusted draft data | PASS | Strict bounded schemas; fixed `decoded.wav`; recomputed exact ledger/offsets/phases/cuts; actual PCM inspection; focused adversarial tests. Independent probes reject traversal paths, >5000 tokens, >40 command arguments, nonzero provider calls/charges and synthesized-audio claim. | Does not authenticate model quality or hearing. Recorded historical network-isolation strings are evidence fields, not controls enacted by this consumer. |
| P5 / R5 immutable revision and binding | PASS | All 817 manifest entries verified; captured implementations match source; draft-only revision invalidation tests pass and retain previous fixture bytes. `render.ts:80–84` rechecks implementation and preview inputs/copies before success. | Source freeze is externally verified; output replacement by an unrelated hostile local process is outside this single-user contract. |
| P6 / R4 trusted media handling | PASS for security scope | Local hard-coded renderer entry, validated data props, locked local font, fixed FFmpeg argument arrays, explicit output directory/no-overwrite flags. Both MP4 evaluation hash bindings independently recomputed. | Technical codec/PCM/visual judgments belong to other roles; I did not rerender or listen. |
| P7 / R5–R6 verification | PASS | Independently reran 50 applicable assertions across the proposal and owned-runtime suites, plus 13 new checks against actual frozen inputs and controlled process fixtures. | One Windows-only file-lock test skipped on macOS; full suite only reviewed from frozen logs, not repeated here. |

## Boundary table

| Entry | Trust/allowed actions | Actual control | Personally verified | Evidence / remaining limits |
| --- | --- | --- | --- | --- |
| Draft JSON | Data only; may influence preview cuts after validation | 8 MB file bound; strict schemas, array/text limits; no dynamic import, eval or command use | Malformed and state-promotion rejection; injected command/tool strings inert | `unreviewed-alignment.ts`, independent probe; no guarantee for unconstrained external JSON parsers |
| Draft sibling PCM | Local source identity evidence | Literal sibling name; bounded regular file; complete RIFF accounting and signed16 mono16k identity | Actual frozen PCM parsed; hash/frame identity used in exact timeline recomputation | No new decoding/inference performed |
| Source pack and caller config | Trusted local caller selects files; source contents are data | Relative pack path guard, bounded regular leaves, digest/size checks, duplicate rejection; new separate output directory | Frozen contents/hash closure verified; static path/read review | Caller-selected paths and intermediate-directory trust are not a multi-user sandbox |
| Review declaration | Owner's six internal cut statement only | Separate owner record and strict 1.1 timing; pending independent/whole-AV/G6 states | Hashes, exact wording, actual sidecar/timeline route verified | No independent hearing claim |
| Renderer/tool subprocess | Existing trusted local engine/browser/FFmpeg only | Fixed entrypoint; `spawn(..., shell:false)`; timeout and owned process-group termination; 1800-frame worker ceiling; concurrency 2 | Literal-metacharacter command probe and timeout; raw actual commands inspected | Tools may inherit local environment; no remote hostile-code containment claim or OS network-denial claim for Chrome renderer |
| Runtime deletion | Only task-owned temporary tree | Token/root/owner/sidecar matching; symlink and forged path refusal | Owned-runtime tests exercise sibling preservation, forged path, symlink, marker mismatch, concurrent cleanup and killed-child orphan | Windows-specific lock behavior not run |
| External actions | No paid API, model/target run or publishing | Actual route has no provider invocation or external write action | Static route and recorded commands consistent with prohibition | No global credential or host/network forensic scan; no secrets used as probes |

## Check records and reproducibility

Artifacts beside this report:

- `manifest-check.json`: 388 source plus 429 evidence entries, zero mismatches; manifest digest matches assigned digest.
- `focused-tests.log`: Node v24.11.0, Vitest 3.2.4, exit 0; **50 passed, 1 skipped**, two files. Skipped test requires Windows; no test is counted as actual media rendering or listening.
- `security-independent.ts` / `independent-checks.log`: exit 0; **13 checks**, exact actual timeline reconstruction in both modes, schema/path/resource rejection, command strings inert, shell metacharacters literal, timeout rejects and closes owned process.
- `owner-binding-check.json`: draft, original voice, visual plan and six audition hashes match the owner record.

Reproduction uses an isolated copy of frozen `source/` with the existing dependency directory linked; do not run against or modify the frozen source. From that copy:

```sh
PYTHONDONTWRITEBYTECODE=1 '/Users/luyuhao/Documents/ChatGPT/github gen video/github-video-engine/work/tools/node-v24.11.0-darwin-arm64/bin/node' node_modules/vitest/vitest.mjs run tests/unreviewed-preview.test.ts tests/owned-runtime.test.ts
PYTHONDONTWRITEBYTECODE=1 '/Users/luyuhao/Documents/ChatGPT/github gen video/github-video-engine/work/tools/node-v24.11.0-darwin-arm64/bin/node' --import tsx security-independent.ts
```

The independent script is copied into the scratch source root and reads absolute frozen evidence paths; its only child executions are trusted Node for literal output and a bounded timeout fixture. It intentionally does not call `renderShortSegment`.

Actual output SHA-256 bindings checked:

- Explicitly unreviewed preview: `4c7c2e856dee456779a5acbcb6e106ba34db56a4400cba6767b7a9cc04f78c2f`.
- Owner-boundary-reviewed route: `a045b9b610c6752026b26539116bd4fe8d8c986b768bb2d7c3574ed0e4aff960`.
- Shared source audio: `31c470430fff5f25995b98ff7194af8057c488acd426d6b6cd0cfa5dbb03b4d5`.

## Findings and recheck

No demonstrated blocker, major or minor security defect within this candidate's declared threat model. No fixes made. This is a fresh check of candidate 2, not acceptance inherited from earlier media or reports. Changes to validator, render route, subprocess wrapper, source or sidecar require affected-role recheck.

## Judge limitations

No new rendering, model inference, target-project execution, paid/network calls or publication occurred. This role did not certify dependency supply-chain security, universal media parser safety, a remote service/multi-user boundary, or continuous perceptual AV quality. Trusted local tools and operator-controlled paths remain explicit assumptions. Existing failed PCM control evidence was retained and manifest-checked, but numerical PCM preservation is left to evidence/reliability roles. None of these checks creates final owner acceptance or G6 approval.
