# Builder evidence for candidate 1

Candidate manifest: `candidate-1/candidate.json`, SHA-256 `dd63c4ad8455a59cde4b981587166e052473cd153baa440b9d981e95e17b975a`, 509 frozen files. This is the bounded authored story asset integration feature. It does not reopen historical milestones, supply current narration recordings, generate a movie or certify listening/continuous audiovisual quality.

The new `story asset-plan`, `asset-status` and `asset-export` commands join captured source bytes, authored story/animation, deterministic research/timeline/diagnostic SVG samples, provenance and portable voice technical handoff through the existing task/CAS system. Original story and animation APIs remain supported. The complete API and limitations are in frozen `docs/story-asset-pack-v1.md`.

Final focused regression: 35 tests / 10 files PASS, raw result `candidate-1/frozen/evidence/regression-final.json`. Typecheck PASS, raw log `candidate-1/frozen/evidence/typecheck-final.log`. Initial sandbox runs failed because existing atomic CAS `fs.link` receives EPERM in this sandbox; unchanged animation adversarial tests reproduced the same failure. The authorized unsandboxed local test run passed; original failed JSON and successful 10-test run are retained in frozen evidence. No non-atomic fallback was introduced.

Real public CLI observations are in frozen `evidence/actual/commands/`, with complete input/result/task history in `evidence/actual/proof.json`. Cases:

| Case | Successful task ID | Export |
| --- | --- | --- |
| REA, all current narration recordings pending | `821871e486cdcdc2f4315e6db5e1bf5b58fe35c94c6fd3b0520d75ba151b4fdc` | `evidence/actual/rea/bundle` |
| rembg, all current narration recordings pending | `940a4ed8aa317e29183c29a2d3b94984383d9b6564940e8b6ddf3e9382122fb0` | `evidence/actual/rembg/bundle` |
| Dedicated synthetic opacity fixture, actual one-second tone explicitly not speech | `16cf7da6e78af899f93f4bd702624958d1d33d9ca56b7572b7ee7a2e352ee52c` | `evidence/actual/synthetic/bundle` |

Each identical plan reused its task with `cached: true`. All packages produced early/middle/late samples for every shot. The synthetic fixture has its own source, story, claim and rationale; no REA citation is presented as evidence for opacity. Numeric animation choices are visibly disclosed as authored illustration parameters and inspectable in provenance.

Actual sequential source, animation parameter, narration/declaration and audio-byte edits produced four distinct new task IDs. The stale narration declaration failed before audio capture. A real invalid audio file produced a durable failed task with no successful result. Old successful inputs remained readable, and repeated export to a new path preserved the original manifest hash. All IDs, raw outputs, error output and state snapshots are retained in the proof.

A real child process cancelled after the first successful CAS artifact commit. The task persisted `cancelled`, with no successful result. Repeating the original public planning entry point recovered the exact same task ID on attempt 2. Task events `task_started`, `task_failed`, `task_resumed`, `task_succeeded` are preserved. The test also exercised this cancellation path independently.

Portability regression copied committed state, removed original input locations, and spawned a fresh process with an invalid FFprobe executable. Status/export still succeeded from committed bytes and bound receipts. Valid-hash substitutions of source/audio/SVG/derived handoff and omission of a mandatory output were rejected by status/export and repeat planning. Output overwrite and state/output overlap were rejected.

Nine actual PNGs are in frozen `evidence/png/`: speed, mask and dedicated opacity early/middle/late sequences. `raster-binding.json` links every PNG to its exact frozen exported SVG hash and installed headless Edge version/flags. They are diagnostic review evidence, not runtime movie frames or continuous AV evidence. Independent Terra opened all nine and returned bounded visual PASS; the raw report is outside the frozen candidate at `visual-candidate-1.md`. Independent architecture/final review remains a separate report and decision.

Measured handoff does not independently authenticate speech. Current REA/rembg recordings remain absent and pending; the synthetic tone is never treated as narrated words. Status/export validate the bound measurement receipt and exact captured audio hash without reprobe. Estimated animation timing is retained; no automatic retiming, stretching or truncation occurs. No paid API, target repository execution, deployment or full movie generation occurred.
