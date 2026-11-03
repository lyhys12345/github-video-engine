# Mechanism v3 — independent engineering evidence/facts/security review

- Reviewer: preview_facts_judge; scope assigned by parent: frozen hashes, existing focused local fixture tests, v2 failure fixes, existing-file protection and XML legality. Applicable rules: source/AGENTS.md, judges-v2/common.md and report-template.md; pilot contract: source/docs/mechanism-pilot.md.
- Candidate: `C:/Users/luyuh/Documents/Codex/gve-mechanism-v3`.
- Manifest: `candidate-hashes.json`, SHA256 `ee744816c2177d15b5cffc59471f407df0aa2bc0c5098a82b2dcfe34d6d18a16`.
- Review completed: 2026-11-03 11:18 UTC. Environment: Windows, Node v24.22.1, existing trusted tsx dependencies, system Windows PowerShell/native Windows API, System.Xml, local FFmpeg.
- Independent output: `gve-mechanism-v3/judge-facts`; test source copy: `review-engine`; fixture state restricted to `review-engine/judge-temp`.
- Verdict: **PASS for the assigned bounded engineering checks.** No blocker/major found in the tested fixes. Broader product/source-semantic and audiovisual acceptance remain **UNVERIFIED**, not implied by this result.
- Independence: did not read any v3 peer judge report. Read implementation verification.md and existing logs as claims before final tests, not as proof; this was not a blind review. Did not modify candidate files, execute captured target code, access network, spend money or deploy.

## Results and evidence

| Check | Verdict | Independent evidence | Limits |
| --- | --- | --- | --- |
| Frozen identity | PASS | hash-check.json and post-review-hashes.json: all 102 listed SHA256 values match, both before and after tests | List contains 15 source-tree entries; this is not a complete repository or dependency lock/freeze. Hash identity is not provenance authentication. |
| Existing focused tests | PASS | independent-tests.log: 2 tests, 2 pass, 0 skip/fail; Node `--import tsx --test tests/mechanism-pilot.node.ts tests/mechanism-publication.node.ts`, exit 0 | Assertion-rich Node tests, not a full suite. Trusted local dependencies reused by junction. |
| Native publication race | PASS | Existing publication test actually starts a second Node process while a test copy of native publisher pauses after creating and retaining the real directory handle; rename is denied; foreign sentinel remains; publication resumes successfully | Instrumented barrier on copied helper, not a claim of randomized stress coverage or all filesystem types. Ordinary and Unicode-path CLI calls are uninstrumented. |
| Static junction and existing destinations | PASS | Publication test rejects junction ancestors/output, refuses existing output, and preserves existing sidecar plus foreign sentinel | Existing Story/CAS subsystem is unchanged and not given a new blanket security certification. |
| Failure after partial output | PASS | failure-probe-results.json / failure-probe.log: own `same.txt` then case-colliding `SAME.TXT` causes native exclusive-create failure; first bytes remain; manifest absent; retry refuses partial output | Intentionally preserved incomplete output; not atomic rollback. No process-kill/power-loss durability test this round. |
| Path / existing-file protection | PASS | Own probes: existing user file unchanged; `../outside`, `sub/file`, `x:stream`, trailing dot/space rejected before output creation | Seven own probe cases total including partial collision; all synthetic local scratch. |
| Invalid XML inputs and escaping | PASS | Publication test rejects U+FFFE, U+FFFF, NUL, lone high surrogate before output creation; valid Chinese/emoji and markup-looking text escaped | Input examples plus static review of complete XML Char predicate, not exhaustive Unicode enumeration. |
| Frozen SVG validity / output closure | PASS | verify-xml.ps1 / xml-results.json / xml-check.log: all 25 SVGs parsed by System.Xml with DTD prohibited; both manifests' payload and compiler hashes match; all 25 frozen PNGs decode with FFmpeg | Did not rerasterize SVGs with browser or compare pixels. PNG decode alone does not establish rendering equivalence or readability. |
| v2 invalid XML evidence | PASS (artifact reproduction) | Same strict parser rejects frozen reproduction/invalid-xml/beat-001-start.svg containing historical invalid character | Did not independently rerun v2 CLI/race harness in this round. Its log is historical builder evidence, not counted as my execution. |
| Facts/binding rejection regression | PASS (fixture contract) | mechanism-pilot test verifies exact source hash mismatch rejection, forged standalone task/binding rejection, quote/numeric citation rejection, trace 6→6.001→7→13→manual4 and illustrative fill 5→8→11→hold→2 | These establish fixture byte bindings and deterministic authored arithmetic; they do not newly establish historical web-source truth or execute the target. |

## Fix analysis

`v2-v3-delta.json` records changed/new manifest entries. The security-relevant changes are mechanism plan XML guards, renderer escaping validation/code-point-safe truncation, the new publisher/native helper, and preview/prepare entry points using that helper. The state model and existing Story runtime listed hashes are unchanged. Only changed/new listed entries are compared; the manifest is not an exhaustive source-tree delta.

The old reproduction harness pauses after pathname-based mkdir and substitutes a junction. v3 no longer reopens that new directory by its pathname: native `NtCreateFile` creates the final component and returns the retained handle in the same operation. Existing ancestors are opened component-by-component relative to retained handles, with reparse points rejected. Handles use read sharing without write/delete sharing. Payload files use relative native create-new rather than overwriting. The test's second process confirms the original rename-and-substitute attempt fails while the output handle is retained.

The prepare command publishes its single sidecar through the same helper, so the reviewed sidecar overwrite/junction issue is also blocked. It may already have produced Story/CAS state before sidecar publication fails; no transactional rollback across the two systems is promised. Existing user sidecar bytes remain intact.

The publisher has no failure-path recursive delete. Files written before a later error are intentionally retained. Preview assembles payloads before publication and appends manifest last. The native helper itself is a general internal utility and relies on its caller's order; it does not authenticate a manifest or make published bytes immutable. A writer with equivalent filesystem authority can still alter children or outputs after their handles close. This review certifies tested non-overwrite/non-redirection behavior, not an adversarially immutable or signed storage boundary.

XML checking follows XML 1.0 allowed scalar ranges, including surrogate handling, and rejects invalid text before any preview creation. Escaping remains separate. The renderer's truncation now slices code points instead of possibly splitting a surrogate pair. Exact quotations are validated as XML text too. The frozen historical bad SVG is rejected and all 25 current SVGs pass the same independent strict parser.

## Reproducibility and preserved failures

1. `review-engine` contains a source/fixture copy; `node_modules` is a junction to the previously authorized trusted local toolchain. Copying unneeded whole source/dependencies was stopped; incomplete extra `engine` directory is setup scratch, not execution evidence.
2. First focused run failed because the incomplete scratch copy lacked package.json's ESM declaration (`import.meta.dirname` undefined). Saved as `initial-scratch-setup-failure.log`; copied the unchanged candidate package.json and tsconfig.json, then reran the exact tests successfully. This is an isolated setup failure, not a changed candidate implementation.
3. Own failure probe's first sandboxed attempt could not reach the native directory-creation point. Saved `failure-probe-sandbox.log`; reran with authorized local native execution, fresh scratch, and obtained the intended partial-write failure. The successful seven cases are in `failure-probe-results.json`.
4. Own probe command: `node --import tsx judge-failure.ts` from review-engine, exit 0. Source is retained in `review-engine/judge-failure.ts`; no frozen files patched.
5. XML/PNG verification: `verify-xml.ps1`, exit 0. REA 16 SVG/PNG pairs and fill 9 SVG/PNG pairs; payload/compiler closures also independently verified.
6. After all work, the entire 102-entry candidate manifest was rehashed; no mismatch.

## Explicit UNVERIFIED / out-of-scope items

- No current network/source recapture, independent complete historical claim audit, target execution, browser rerasterization, human visual-quality judgment, continuous video, listening or final owner acceptance.
- No Linux/macOS implementation: code rejects non-Windows. No UNC/network-share, removable-media, alternative Windows filesystem or cross-version OS qualification.
- No native-helper crash/power-loss durability campaign, permission-revocation or exhaustive malicious same-user writer campaign. No proof that checksummed artifacts remain immutable after return.
- No full repository suite/typecheck or existing Story/CAS security recertification. Manifest does not freeze the entire loaded dependency/source graph; trusted toolchain and local unlisted source/fixture files remain a reproducibility limitation.
- v2 reproduction script/log reviewed and its invalid XML artifact parsed, but original v2 executable race was not rerun here. New version race was personally exercised through the existing fixture test.

These limits do not negate the measured repair of the assigned Windows publication and XML failures, but must accompany any aggregate PASS claim.
