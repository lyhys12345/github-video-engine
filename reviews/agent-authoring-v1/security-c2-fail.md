# session-agent-authoring-v1-c2 — security review

- Role: security, judges-v2. Candidate manifest SHA256 `d086228c725521a8f9832d4d7aba19502d936321393af16b7908914c061926d9`; declared source tree independently reconstructed as `9dc98f1f92620fa46f0be49f86b977e96e8d1827`. All 122 frozen entries match before/after.
- Scope: bounded read-only source ingress, untrusted content, paths, snapshot/proposal binding and local export. OPERATOR and contract/rules read. No other builder/peer results read; target repositories never executed. All mutation/injection uses judge-facts scratch.
- **Verdict: FAIL — two independently reproduced major local export integrity/data-preservation failures.** These need a new frozen candidate and original-probe recheck. They are not remote README command execution; the prerequisite is a noncooperating local writer able to rename/create entries in the chosen export parent.

## SEC-1 — major: failure cleanup deletes a replacement ordinary directory

- Location: extracted `src/workflow/review-export.ts:75–79`, publishReviewExport finally.
- Control expected: cleanup must not recursively delete unrelated replacement contents merely because the pathname was once staging. Parent/reparse/type checks do not establish the directory's original ownership or identity.
- Controlled reproduction: engine/judge-race.ts hooks the real filesystem boundary only in the test process. After the first normal staged file write, rename the owned `.gve-review-*` directory aside; create a fresh ordinary directory at the same pathname with `user-sentinel.txt`; then throw an injected failure. All paths are own synthetic scratch. The actual unmodified publisher finally executes.
- Actual: replacement directory/sentinel are deleted. Original safe staged bytes survive only in the renamed `-original` directory. `race-results.json` records sentinelExists=false and originalStagePreserved="safe". The check rejects junctions but accepts this distinct plain directory.
- Impact: a concurrent directory replacement can cause deletion of files that this export never created. Existing source/path protections do not prevent it after staging creation.
- Required recheck: rerun this exact failure probe against the new candidate, retain replacement bytes, and cover replacement at cleanup/publish boundaries. A precheck followed by pathname rm is not an atomic ownership guarantee.

## SEC-2 — major: substituted staging directory is published with incorrect success

- Location: `src/workflow/review-export.ts:64–65`, rename(stage,output) then published=true; there is no postpublication closure/identity verification.
- Controlled reproduction: same script intercepts immediately before the actual rename. Rename the correctly populated stage aside and put a plain directory containing only `user-sentinel.txt` at its path, then perform the original rename.
- Actual: publishReviewExport returns success. Final output contains only the sentinel; expected safe.txt is absent. Unrelated directory has been relocated to the output. `race-results.json` records returnedSuccess=true, publishedFiles=["user-sentinel.txt"].
- Impact: authoring packet/proposal export may report success for data that does not contain the requested frozen evidence, and move unrelated local contents. The exactExisting check validates destination only, not the stage subsequently renamed. Postpublication detection alone would still leave relocation; any solution must describe its actual filesystem guarantees.
- Required recheck: original final-rename substitution probe plus ordinary same-content replay, conflicting existing contents, cancellation, parent/link replacement and safe retention after failures.

These are deterministic controlled interleavings, not claims about attack probability. The adversary already has write access to the export parent; no escalation into arbitrary private directories or secret exposure was demonstrated. Ordinary single-process export and cooperative repeat-export pass. A trusted-single-user deployment limits exposure, but does not make engine deletion or false successful publication of replacement files correct; these findings must not be hidden by a blanket PASS.

## Checked boundaries and passing evidence

| Boundary | Controls and independent evidence | Limits |
| --- | --- | --- |
| Public source HTTP ingress | githubGetJson restricts HTTPS api.github.com constructed repository paths, GET only, no credentials/redirects, 15-second deadline and bounded response stream | API metadata/transport upstream trust retained; no hostile service certification |
| Supplemental source file | Safe extension/path, 1–3 unique uncaptured files, at most4 components, regular100644/100755 Git blobs, no symlink/submodule/truncated tree, SHA1 Git blob+size+base64+UTF8/NUL checks, 200KB/file, 8files/1.2MB total | Commit/tree identity checked from API responses; Git commit/tree object signatures/hashes are not independently reconstructed by capture code |
| Negative source tests | Independent 9-test run includes traversal/extension/budget/mode/submodule/blob corruption/tree truncation/encoding rejection, stale capture and proposal binding | Transport mock declared; not live API failure injection |
| Untrusted README/proposal | Stored only as text/strict JSON; no evaluation/import/install. Fixed numeric exported source filenames; control/Bidi display escaping; prompt-like marker fixture remains absent | Raw source/proposal still intentionally untrusted. No model integration/authenticated authorship. Human/session reader must resist embedded instructions |
| Binding/history | Exact hashes and complete quotes, duplicate/unknown reference checks, immutable proposal CAS/table, snapshot/request invalidation and historical replay | Provenance does not prove semantics; deliberate false rate claim correctly stays pending, independently rejected by content reviewer |
| Local export normal path | Data/output overlap rejected; existing output requires matching bytes/files; links/nonregular ancestors rejected; existing changed or unrelated files not overwritten in normal tests | SEC-1/2 demonstrate unclosed stage TOCTOU races; not safe under noncooperating parent writer |
| Offline replay | All7 actual frozen proposals exported from own copied state with fetch throwing; 3 project audits ok | This is not a production sandbox, and local database/OS administrators remain trusted |

Raw evidence: tests.log (2files/9tests pass), engine/judge-race.ts, race.log and race-results.json (both findings reproduced, exit0), engine/judge-replay.ts and offline-replay-results.json, source-recapture-results.json. No malicious target code, paid API or unrelated files used. Candidate remained unchanged; own sentinel deletion was the intentional controlled observation.

## UNVERIFIED / remaining scope

No full regression/typecheck, exhaustive HTTP rate-limit/stream/cancellation campaign, random concurrency stress, file-symlink privilege matrix, alternative OS/filesystem, post-return immutability, signed source authorship or multi-user isolation certification. Live source bytes were independently fetched at the same commits, but full capture-text Git-tree traversal was only fixture-tested this round. Internal filesystem helpers assume operator-controlled storage. Fixes must preserve safe offline replay without claiming that repeated prechecks eliminate TOCTOU.
