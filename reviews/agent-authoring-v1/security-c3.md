# C3 security affected-scope recheck

- Candidate SHA256 `287d61ce50ffe2f5788a7cf304d66b3fb7a4233f504ef5c672cc6a21e8f763e7`; source tree `8f8e13d800b677f5205e48aa4909c676eeb45dda`. All126 frozen entries unchanged after review. No target code or unrelated files/processes used. Own sources/scripts/barriers under judge-facts/engine only.
- **PASS for the bounded new authoring interface repair of SEC-1/SEC-2 and preservation of expected file bytes/directory identity while native handles are held.**
- **Legacy generic export: FAIL under the original concurrent-local-writer precondition; both C2 findings remain reproducible.** An all-system security PASS or all-export-races-fixed claim is unsupported.
- **Additional membership boundary confirmed:** the new path does not prevent extra directory entries after its final enumeration, even before handles close. It cannot promise an atomic exact member set at return against a writer with access to the directory. This is not the old deletion/relocation defect, and expected files remain intact.

## Original findings and rechecks

### SEC-1 / SEC-2 on new exactFiles authoring: repaired

`src/workflow/review-export.ts:33` routes exactFiles to publishExactReview. It does not create, rename or recursively clean a JavaScript .gve-review-* stage. The C2 original script was copied unchanged and run: its assert.rejects now fails because the stage-write injected exception is never reached. That exit1 is preserved, not hidden or counted as a successful negative test. Own follow-up retains both original stage replacement hooks and records writeHook=0/renameHook=0, successful output and exact expected bytes.

Native ExactFiles uses directory-relative NT handles, refuses reparse/nonregular components, exclusively creates payloads, and holds each expected file handle until coverage checking. An existing directory is opened and compared through retained read handles. A separate helper process was paused by a barrier inserted only in its copied test helper after payload creation, before coverage. From the judge process, renaming the output directory, overwriting safe.txt and unlinking safe.txt all fail EBUSY. Releasing the barrier yields correct output. Adding a foreign sentinel at this point is possible; enumeration sees it, returns nonzero, and preserves safe.txt and sentinel without recursive cleanup. These are actual Windows operations, not filesystem mocks.

Raw evidence: native-results.json/native.log, engine/judge-native.ts. Normal uninstrumented path tests also cover existing unrelated files, junction ancestors, exact replay and nested new parents. 10 current authoring/ingress Vitest tests and2 shared-helper Node mechanism tests pass.

### SEC-1 / SEC-2 on legacy generic export: not repaired

The options.exactFiles=false/omitted branch still renames stage at review-export.ts77 and recursively removes a plain directory found at the stage pathname at line92. Own `judge-legacy-race.ts` differs from the C2 original only in selecting this legacy branch and naming its result file.

1. After a real first staged write, the original stage is renamed aside, a fresh ordinary directory with own user-sentinel is created at its pathname, and an error is injected. The finally cleanup deletes the replacement directory. `sentinelExists:false`.
2. Immediately before stage→output rename, stage is replaced with another ordinary directory containing only the sentinel. The actual rename succeeds and API returns success, output contains only user-sentinel.txt and lacks safe.txt. Original expected bytes remain in the renamed-aside stage.

Both remain **major under a noncooperating writer able to modify the export parent**. Current docs explicitly require an exclusively controlled trusted parent for legacy project export. That limitation narrows permitted use; it does not fix the implementation, protect a shared writable parent or retrospectively turn C2 failures into passes. Evidence: legacy-race-results.json/log; all originals and sentinels are synthetic judge scratch. No remote README execution or privilege escalation was demonstrated.

### SEC-3 — observed boundary: expected-file locks do not freeze directory membership

Location: scripts/mechanism-publish-windows.ps1 lines158–162. A directory handle without write/delete sharing protects directory identity and expected file handles protect their bytes, but another process can still create a new child entry.

Own second barrier pauses after `Directory.EnumerateFileSystemEntries` has consumed the expected set and before the count assertion/handle disposal. The judge process adds user-sentinel.txt. Rename/overwrite/delete of expected files remain EBUSY, but adding the extra entry succeeds. Helper returns0; final directory has safe.txt plus user-sentinel.txt; expected file bytes remain unchanged. `postcoverage-results.json` retains both control and injected runs.

Consequently the defensible guarantee is expected-object preservation and a coverage check at an observation point. Neither the check nor held directory handle provides a continuously frozen/atomic complete member set. A repeated later enumeration merely moves this window. If the gate requires exact membership at return under a hostile co-writer, this guarantee is **not met** and needs stronger output isolation or a revised protocol. The present bounded repaired guarantee does not claim it. This boundary also shows why the helper comment saying retained handles disallow other writers must not be read as forbidding all new child creation.

## Other boundaries and scope

Source ingress code and proposal schema/binding logic are unchanged in the 7-path source diff. Current tests independently recheck read-only API shape via mock transport, path/mode/blob/encoding/limit negatives, injection-marker inertness, stale bindings, exact quotes, immutable historical proposals and offline audits. The new source change in agent-authoring.ts only moves work-package.json/review.json to the last write positions. New authoring publication is local Windows only, no unsafe fallback. Cancellation after the native process starts is observed after it completes; complete or partial output is retained, as documented.

No new live network capture this round; previous five pinned-file recaptures are retained by matching source digests. No installed-dependency attestation, full suite/typecheck, all-OS/filesystem validation, exhaustive timing/random stress, active owner cancellation halfway through native helper, signed export immutability or arbitrary hostile local administrator boundary certified. Existing files become mutable once handles close. Full-system legacy export safety remains failed for the demonstrated concurrent-writer scenario.
