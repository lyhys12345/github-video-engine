# Version differences and bounded local corrections

This implements RD-01–08 alongside the accepted usage ledger. It is engineering behavior, not full M4 acceptance or a claim that a proposed edit improves the video. Owner authorization `reviews/owner-av-deferral-2026-10-26.json` permits continued M3/M4 engineering with actual AV review deferred to final owner review; historical M2 UNVERIFIED is retained. Other technical, factual and safety requirements remain.

## Differences

`diff --kind plan|production --before input.json --after input.json [--out new.json]` reads regular bounded JSON files and creates no runtime store. Planning inputs are the existing `{snapshotHash,plan}` review exports. Production inputs are raw supported packages. Output `revision-diff/1.0` binds canonical hashes, JSON Pointer changes and stable IDs with add/remove/modify/move/order metadata. Different projects, unsupported versions, silent schema normalization and exceeded coverage fail explicitly.

The comparison conservatively identifies G1–G6/dependent work for changed plans and G3–G6/dependent media for changed production packages. It never grants approvals or proves measured media reuse, source truth or artistic quality. Each input is limited to 4 MB, depth40 and 100,000 traversal nodes; output is limited to 2,000 changes and 8 MB. An unchanged canonical input has no changes or proposed invalidation. Report creation is exclusive.

## Corrections

`production revise --id PROJECT --repair request.json --data DATA` supports one scene's title/subtitle/labels/sourceLabel. It requires an expected selected package hash, unique request ID, scene ID and an issue with requirement, observation and exact committed parent-package image/video Artifact. Scene layout, IDs, claim/script mappings, audio, timing, style, plan and authorization cannot be edited through this endpoint. It does not evaluate whether the observation is true or the replacement is good; later applicable review still applies.

The first correction anchors a scope to the project's currently G2-approved plan and a genuinely stored G3 baseline package/receipt. The immutable scope key depends on project and plan revision, not the changing child package. Its round ceiling is that approved plan's maxRevisionRounds. A committed correction consumes one creative round, even if its later rendering or quality review fails. Pre-commit validation/transaction failure consumes none. Execution retries remain separately bounded and accounted; the correction command never starts a renderer.

Scope creation, new package row, round receipt and selection commit in one SQLite transaction. CAS files are committed before that transaction; failed state publication may leave unreferenced immutable blobs, never a partially successful selected version. Parent selection is rechecked under the write lock; only one competing correction can select a child. Identical concurrent requests reuse one receipt. Different reuse of requestId is rejected.

Exact replay verifies committed parent/child/diff/evidence CAS before returning cached success. Replaying an older request reports its retained historical result and does not reselect it. Ordinary import cannot change an approved selected package or an existing correction chain. Importing old content, changing requestId, restarting or approving a later package does not reset its existing scope. A genuinely new approved plan requires applicable gates; this feature grants none.

The new package has no inherited G3/G4. Static rendering can prepare it; dynamic preview still requires G3 for that exact package. A preview task's existing per-package retry budget is distinct from creative rounds; additional child packages are bounded by the immutable correction ceiling. Current rendering reruns the whole package. Identical hashes for unaffected frames do not mean a scene-level render cache was used.

## Persistence and inspection

Production SQLite user_version0 upgrades atomically to1 by adding repair_scopes/repair_rounds, unique scope/request/round constraints and append-only guards. Only the known exact legacy layout or an empty new store is admitted. Old package, selected and approval records remain; future/unknown schemas fail. Local guard/hash checks are not cryptographic protection against a malicious administrator.

`production repairs --id PROJECT --data DATA` lists retained scopes/rounds. Normal runtime commands can migrate known stores. Read-only `audit --data DATA [--out new.json]` instead uses bounded stable main/WAL copies, supports production0/1 and outputs **operations-audit/1.2**. Existing tasks0/1 and M0 checks are preserved. It verifies SQL/JSON identities, chain/round budget, G2/G3/plan binding, exact supported scene replacement, task/media evidence, full CAS diff payload and selected chain. It does not migrate, repair or approve. Separate database/filesystem snapshots are not jointly atomic.

Historical unrecorded corrections remain unknown. Preparation imports made before any G3 are not retrospectively counted as creative correction rounds; they are retained as package history. Arbitrary script, global style, timeline or asset edits require a separate applicable revision workflow; this endpoint does not pretend to cover them. General scene-level recomposition, full project costs and arbitrary Windows path lengths remain outside this accepted subset.

```sh
pnpm gve diff --kind production --before before.json --after after.json --out difference.json
pnpm gve production revise --id rea --repair request.json --data local-state
pnpm gve production repairs --id rea --data local-state
pnpm run test:revisions
```
