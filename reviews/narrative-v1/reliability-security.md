# narrative-planning-c1 — independent reliability / security

- Roles: reliability (J2), security (J6); active under candidate contract R1/S1. Definition: frozen reviews/judges-v2/common.md and roles/reliability.md, security.md.
- Candidate: narrative-planning-c1; commit label 6b60d8321c8a6479af36a1943275331850069a32; base c411d3c.
- candidate.json SHA256: 5be0f36f9b43cbaecc125d802ef7c8b1501365dfccd6c0eea79a7060eccc73f1.
- Environment: Windows, Node v24.22.1; review completed 2026-11-04 22:34 America/Los_Angeles.
- Independent output: C:/Users/luyuh/Documents/Codex/gve-narrative-security-review.
- Verdict: PASS (both roles, authored planning slice only). No unresolved blocker/major found.
- Independence: read main AGENTS/common, candidate contract and raw code/test/evidence. No peer judge report used. Candidate and its original evidence were read-only. Scratch copies only were changed. Builder OPERATOR entry was used to locate data, not as proof.

## Evidence and results

| Clause | Result | Independent evidence / method | Limit |
|---|---|---|---|
| R1 frozen closure | PASS | freeze-check.json: 715 source files and ZIP entries plus 264 materials match SHA256 manifests; archive SHA matches candidate | Commit is a version label; exact reviewed bytes are manifest-bound |
| R1 relocation/offline replay | PASS | actual.mts, actual-offline.json: copied both express/rembg relocated-state; fetch globally throws; status integrity verified; exact exported narrative bytes match frozen input; 2 unresolved scenes remain | No new network capture performed |
| R1 duplicate/recovery | PASS | scratch/tests/narrative.test.ts added J6 test; duplicate submission returns same task ID, cached true; output/state overlap and unrelated destination refused; unrelated user file unchanged | No broad stress benchmark |
| R1 source/receipt corruption | PASS | tests-verified.json: stale thesis/transition/screen/ending/timing/disposition receipts refused; child hash/shot/narration/claim/binding changes refused; damaged source CAS causes status rejection; prior valid checkpoint retained after stale edits | Structural fixtures distinguish these from real semantic review |
| S1 inert verified capture | PASS | workflow/narrative.ts uses captureNarrativeStart and verified source descriptors/bytes; source path forgery refused; changed repository/project binding refused | Does not authenticate a human reviewer |
| S1 bounded IDs/output | PASS | independent ../, slash, backslash, drive and dot scene IDs refused; export overlap/unowned path refused; publication reconstructs complete trusted file map | Existing publication locking architecture reused |
| S1 attribution boundary | PASS | actual replay retains approval none; original tests retain identityAuthentication not-provided and pending owner acceptance; unresolved review does not erase scene gaps | No semantic-truth or approval claim |
| Historical compatibility | PASS within tested affected scope | tests-verified.json: narrative, explanation-portable, fact-review and agent-authoring, 53/53 PASS. history-diff-stat.txt and inspected diff show additive narrative command branches/helper/function/type import; old commands not replaced | Full-suite regression not independently executed; no full-suite PASS inferred |

## Fault injection: export tampering and recovery

Independent test created a valid narrative export, replaced only that publication's narrative.json with the literal `tampered`, then exported to the same owned destination. The engine did not reuse the damaged publication. It preserved the damaged old directory and emitted a new publication directory whose narrative bytes exactly equal canonical committed plan bytes. A subsequent status still verifies the committed task. This satisfies fail-closed reuse and recovery without destroying evidence. Publication receipt/tree validation is in src/story-planner/asset-pack.ts.

The first probe expected all same-destination exports to reject after tampering and therefore failed one judge assertion (tests-final.json: 52/53). After inspecting the publisher contract and actual returned fresh directory, the probe was corrected to assert the meaningful invariant: never return/reuse damaged output, preserve old bytes, recover exact new bytes. No candidate implementation was changed. That original result is preserved; tests-verified.json is 53/53 PASS.

## Execution records and limitations

1. freeze-check.json was produced by independent PowerShell/.NET SHA256 and ZipFile reads; no freeze script was executed. Candidate source/material hashes all match. Python launcher was unavailable, so verifier was reimplemented read-only.
2. The first test invocation used the wrong cwd; tests.json preserves its 52 fixture-location failures. The next long scratch path hit explicit Windows path-length checks plus sandbox EPERM for CAS hardlinks/symlinks; tests-correct-cwd.json preserves those environment failures. They are not counted as product test passes or confirmed defects.
3. A short isolated scratch directory and authorization-reviewed local execution allowed normal Windows CAS links. Command: node_modules/.bin/vitest.cmd run tests/narrative.test.ts tests/explanation-portable.test.ts tests/fact-review.test.ts tests/agent-authoring.test.ts --reporter=json --outputFile=.../tests-verified.json. Exit 0; 53 tests passed. Raw JSON/log and independent added assertions are saved.
4. Actual offline command: scratch/node_modules/.bin/tsx.cmd actual.mts; exit 0. Runs trusted engine code against copied frozen state, with global fetch throwing. No Express/rembg target code, package install, paid API, deployment, publication to an external service, or private data used.
5. No new media, frames, sound, AV, whole-video output, reviewer identity authentication, final owner acceptance, concurrency stress certification or distributed security guarantee is claimed. Existing historical UNVERIFIED / owner AV deferral records are unchanged. Actual AV/G6 remain pending.

## Boundary table

| Entry | Allowed action | Verified control |
|---|---|---|
| GitHub captured source | Inert bytes only | Verified capture/CAS; runtime never executes target source |
| Authored Story source descriptors | Select verified captured descriptors | Arbitrary caller path and cross-project binding rejected |
| Authored narrative/receipt | Bounded schemas, exact candidate/packet attribution | Stale receipt refused; identity is not authentication or approval |
| Local output path | Owned publication outside state | Overlap/unowned file refusal; tampered publication is not reused; exact recovery |

No unresolved findings. Additional affected full-suite failure evidence would require re-evaluation; no missing full-suite result is silently promoted to success.
