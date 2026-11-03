# Independent security review — proposal-preview-bridge-v1-c1

Verdict: **PASS for the declared mapped receipt-v1 bridge under its local trusted-store boundary; FAIL for retained legacy generic export. This is not a blanket safe-export or full-system PASS.** Frozen identity and reproducibility are in reliability.md and final-hash-check.json.

## Findings

### SEC-1 — major — legacy failure cleanup deletes a substituted user directory

Source: `engine/src/workflow/review-export.ts`, generic branch starting line 29, cleanup line 92. With exactFiles omitted/false, staging cleanup uses pathname-based recursive rm. A noncooperating local writer with write access to the export parent can replace the staging directory between an earlier operation and cleanup. The finally block then recursively deletes the replacement user directory.

Independent original probe: `engine/judge-legacy-race.ts`, `legacy-race.log`, `legacy-race-results.json`, case failure-cleanup-stage-replacement. After the first actual stage write, the controlled filesystem interleaving renames the real stage aside, creates a replacement regular directory with user-sentinel.txt, and injects failure. Actual filesystem cleanup runs: sentinelExists is false. Original stage bytes remain in the renamed directory. This is genuine deletion of the scratch user sentinel, using a deterministic injected boundary; it is not a probabilistic second-process race measurement.

### SEC-2 — major — legacy publication can move a substituted directory and falsely report success

Source: same generic branch, rename at line 77. Between stage population and rename, a writer with parent-directory access can substitute a regular user directory. Generic publication renames it to output and reports success without verifying the expected payload closure.

Independent original probe: same script/log/results, case publication-stage-replacement. The substituted directory contains only user-sentinel.txt. Returned success is true; final publishedFiles contains only user-sentinel.txt, expected safe.txt is absent, and user data was relocated. The original stage is preserved separately by the probe. No privilege escalation or remote repository code execution is required or implied: the precondition is local write access to the relevant parent.

These findings remain present in this candidate. New mapped interface restrictions do not repair this generic helper. Remediation should remove unsafe pathname cleanup/publication or constrain the legacy entry points to a safe publisher; checks before rename alone cannot establish atomic safety.

## New mapped bridge assessment

- The mapped Story export refuses the generic Story path (`runtime.ts:138`); mapped asset rejects legacy-v2 (`asset-pack.ts:159`); mapped preview requires receipt-v1 (`preview.ts:305-306`). All three were independently exercised and rejected.
- Default mapped receipt export succeeded and repeated export reused verified expected bytes. An unrelated occupied directory was rejected and its USER bytes preserved. New mapped exported proposal/mapping bytes match the immutable hashes retained upstream.
- Receipt publication keeps payload in its identified staging directory instead of renaming a possibly substituted payload path; receipt publication uses no-replace hardlink semantics and validates expected closure. Ownership/locking and identity checks support recovery; destructive failure cleanup is avoided in this path. Existing story-preview tests exercised child export termination/recovery, foreign/forged or modified receipts and stage replacement preservation. The review does not infer atomic directory membership from prepublication checks.
- Receipt/owner files are not authentication against a same-user actor who can rewrite the store and receipt. A retained trusted receipt digest and verified expected task closure are necessary. A hardlinked draft/published file is still writable; same-user modification can cause denial of service or invalidation. Hash binding does not make payload bytes immutable or the producer independently trusted.
- Input proposal and captured repository text are inert data for schema checking and compilation; the review ran no captured target code. Adapter profile/source compatibility rejected both true unsupported p-limit and a counterfeit HTTP-shaped proposal. Frozen source bindings, selected claims, canonical material and current source checks flow into task identity; mapped output checks reopen upstream sources and material rather than trusting caller metadata alone.
- Direct independent corruption of a copied mapping CAS rejected status/export/cache; media CAS corruption rejected status/cache. Tests additionally exercise coherent hash-valid substitution at other asset layers. A changed proposal or mapping produces distinct downstream identities and unchanged input reuses verified cache. Live duplicate render request was refused; actual cancelled mapped render resumed with attempt 2.

## Boundaries and UNVERIFIED

This is scoped safety evidence, not an exhaustive proof against an adversary with arbitrary write access to all local state or the process. Manifest matching proves consistency with the supplied manifest only. The selected-profile source-shape checks are bounded validators, not a general semantic proof that prose is true; proposal semantic review stays pending. No remote-origin authentication or fresh network fetch was performed.

No separate mapped-adapter hard-kill, power-loss, cross-platform, full historical database migration, file-symlink privileged test, or exhaustive final-check-to-publication TOCTOU test was performed in this review. Real mapped rendering cancellation and recovery were tested; shared runtime tests provide actual child-kill evidence separately. No claim is made that user-accessible directories become immutable after success or that every legacy export is repaired. Full logs, scripts and scratch output are retained, including the two failing legacy reproductions. All 433 frozen hashes and lengths still match after completion.
