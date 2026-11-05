# narrative-source-clock-c1 / independent reliability + security judge

- Roles: reliability (J2), security (J6), judges-v2/common and roles read. Active roles retained as candidate lists.
- Candidate SHA256: 196682a1b6255f38fd151561ae4f444063836d208a7cb537e75ead72249ab6e2; commit e1c6fcb8dc13dee521b8612b80321ccc993e3eee.
- Contract: frozen docs/narrative-continuity.md; same-child, adjacent half-open source-clock technical excerpts, silent 14/15 seconds, current review pending; no arbitrary cross-child adapters or target execution.
- Environment: Windows, Node v24.22.1, pinned existing dependencies; review 2026-11-05 approximately 07:54–07:59 UTC. Independent output C:/Users/luyuh/Documents/Codex/continuity-security-judge.
- Verdict: PASS for the bounded continuity reliability/security contract. No unresolved blocker/major found. This does not approve current media, factual interpretation, perceptual AV, full film, or final owner acceptance.
- Independence: read frozen contract/source/evidence; no peer judge reports read. Builder OPERATOR was read as input, not proof. Candidate/source/evidence never modified; trusted engine executed only in this judge copy. No target repository code executed, no installation/network/deployment/paid service used.

## Evidence and actual checks

| Clause | Result | Independent evidence | Method and limitation |
| --- | --- | --- | --- |
| Exact frozen version | PASS | raw.json first item; judge.ts | Candidate SHA, 3 declared manifest/archive hashes, all 733 source + 644 material files recomputed. ZIP SHA checked; ZIP members not independently re-extracted. |
| Relocated reopen | PASS | raw.json; followup-raw.json | Both projects opened copied SQLite/CAS in fresh location. 420/450 frames; current review pending, approval none. |
| Source clock/state/entity binding | PASS | raw.json | For each real project independently perturb boundary, all four expected state commitments, entity kind and duplicate entity mapping; all rejected. |
| Path boundary | PASS | raw.json, followup-raw.json | ../ entity ID rejected by strict schema. Persisted artifact traversal storage rejected by CAS path/hash validation. This is local single-user scope, not remote enterprise isolation certification. |
| Persistent task binding | PASS | followup-raw.json | Change copied successful task clock/state/entity/environment fields without changing task ID: rejected identity mismatch. Direct normal SQLite update first rejected by immutable trigger (followup.log). To inject adversarial disk edits, temporarily drop/recreate exact triggers in private copy before status; frozen schema unchanged. |
| Artifact failure and repair | PASS | followup-raw.json; source-media-tamper.json | One byte changed in each excerpt movie and each source-child movie; integrity error, no accepted status. Restore original bytes; reopened statuses valid. Read-only status did not rewrite original task data. |
| Recovery export | PASS | export-recheck.json/.log | Both restored states exported successfully to fresh judge directories using permitted hard-link operation. Original restricted-sandbox failures retained. |
| Unsupported cross-child refused | PASS | raw.json, followup-raw.json | End-to-end foreign task ID rejected; directly call bridge validator with otherwise real verified child/parts but different right-child ID, rejected adjacent same-child requirement. |
| Historical reset contract | PASS | followup-raw.json | Copied prior freeze final-relocated-state for Express/rembg, independently reopened original reset task IDs with statusNarrativeExcerpt; no reinterpretation as continuity/current approval. |
| Regression | PASS | focused-tests-permission-correct.log | Frozen narrative test file: 27/27 passed, exit 0; includes reset/coverage/commitments/identity cases. |

## Raw attempts preserved

Scripts: engine/judge.ts, engine/followup.ts, engine/export-recheck.ts, engine/source-tamper.ts. Run commands from engine: `node --import tsx <script>`; focused regression: `node node_modules/vitest/vitest.mjs run tests/narrative.test.ts`.

- runtime.log/raw.json: 2 export failures only, caused by Windows restricted-sandbox EPERM at atomic hard-link publication; all other checks passed.
- followup.log: initial attempt at normal task UPDATE rejected by successful-task immutable trigger; no data change.
- followup2.log: deliberately dropping triggers prevented state read (Unexpected state schema). This was test-harness setup, not product defect. Subsequent script restores source SQLite then restores exact triggers immediately after each injected update; followup3.log/followup-raw.json contain meaningful binding/integrity results.
- followup3.log: 2 EPERM export failures preserved; read validation/repair/history checks passed. export-recheck.log exit 0 under correct permission, fresh outputs for both projects.
- focused-tests.log: restricted hard-link EPERM caused 25 fixture failures, 2 pure tests passed. focused-tests-permission-correct.log: 27 passed, exit 0.
- source-tamper.log: source-child movie integrity rejection and restoration for both projects, exit 0.

## Findings and scope limitations

No confirmed blocker/major within the declared contract. Windows atomic hard-link publication requires the appropriate local execution permission; restricted sandbox failure is explicitly observable rather than falsely reported successful. Successful rerun does not erase failed logs.

Current media remains pending and owner acceptance pending. Tests did not run repository targets, authenticate identities, prove semantics of synthetic objects, perform continuous perceptual AV review, or test unrelated cancellation/concurrency/process-kill behavior. Full-suite results are not signed here; independently rerun focused tests are the stated regression evidence. No claim is made about arbitrary attacker recomputation of every trusted hash/identity or a hostile local administrator replacing the trusted engine. Existing provenance hashes bind data; they are not signatures.

No repair to candidate requested. Any source change requires a new frozen version and affected regression.
