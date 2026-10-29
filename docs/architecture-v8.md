# Architecture v8: local GitHub video workflow

Architecture snapshot for the implemented M1–M4 workflow; acceptance is determined separately by frozen candidates and actual role reports. This document proposes no distributed service or new provider. Runtime cleanup work may still be in progress; consult the exact candidate/source manifest for the version certified by any execution record.

## Data and execution path

| Layer | Responsibility | Source |
| --- | --- | --- |
| Agent/operator | Preserve guidance; interpret pinned sources; author facts/Brief/concepts/script/storyboard/design; organize independent review | Operator runbook; v7 plan; active milestone contracts |
| M1 research/planning | Bounded public GitHub read-only snapshots; strict quote/source/ID validation; immutable plan revisions; exact delegated G1/G2 receipts | `src/providers/github-readonly.ts`, `contracts/planning.ts`, `workflow/store.ts` |
| M2 production preparation | Actual local SAPI line measurement; imported structured production package; static frames/animatic/motion; exact G3/G4 review boundaries | `contracts/production.ts`, `workflow/production.ts`, `providers/sapi.ts`, `renderer/production*.ts*` |
| M3 conditional authority | Bind owner AV deferral, source/plan/package/G3, actual preview inspections/audio/font, source/environment and retained full-render budget | `contracts/finalization.ts`, `workflow/finalization.ts` |
| M3 replaceable final renderer | Strict structured project/scenes/readthrough/captions; locked-font portrait motion; owned worker; clean/captioned silent full video and sample frames | `src/final-renderer/*` |
| M3 finishing/local delivery | Natural line audio allocation, narration/mux/subtitles/loudness/stream/full-decode validation; exact engineering lock; atomic new-only export and standalone editable closure | `renderer/final-finishing.ts`, `workflow/final-delivery.ts` |
| M4 operational layer | Durable task ownership, bounded attempts, integrity-checked cache, usage records, diff/limited corrections, read-only diagnosis and final evidence closure | `orchestrator/tasks.ts`, `assets/store.ts`, `operations/*`, `workflow/repair-db.ts`, `contracts/revision.ts` |
| Owned browser resources | Short per-worker temporary root, exact durable locator/sidecar, scoped environment and safe pre-discard cleanup shared by foundation, preview and full rendering | `core/owned-runtime.ts`, `core/process.ts`; [ADR 0004](adr/0004-owned-browser-runtime.md) |
| Independent gates | Every active role and required non-deferred criterion must PASS; version/hash completeness, no unresolved major/blocker | `evaluation/judge-gate.mjs`, `reviews/active-policy.json`, per-milestone gate files |

M0 remains the original `VideoSpec`/job-stage foundation in `orchestrator/engine.ts` and `database.ts`. M1/M2/M3 use their own contracts and workflow stores; the production task IDs are not M0 job IDs. CLI dispatch is `src/cli.ts` plus `workflow/{cli,production-cli,final-cli,diff-cli}.ts`.

## Durable identities and authorization

Source snapshots retain exact content hashes and pinned commit. Plan revisions hash the canonical `{snapshotHash,plan}` input; package/task identities bind relevant input and environment. CAS stores complete immutable bytes before SQLite references are committed. A crash may leave a complete unreferenced blob, which is not a successful task. Successful tasks and historical approvals/corrections remain immutable through normal engine interfaces; the filesystem is not defended against a malicious local administrator.

TaskRunner uses SQLite transactions, owner fencing and leases to prevent concurrent publication. Committed success is reused only after integrity checks. Attempts and accounting survive restarts; abandoned intervals without observations remain null. Preview/full-production scope limits aggregate attempts across environment revisions. Content/environment fingerprints must not be treated as a free attempt reset. Limited scene correction rounds are a separate ledger anchored to a genuinely approved baseline and plan budget.

G1/G2 approve exact plans; G3 permits bounded previews; G4 is the strict preview/full-production gate in the historical model. For the current owner-authorized engineering run, `final prepare` instead binds the separately recorded AV deferral plus exact G3 and actual technical preview evidence. This does not mutate historical G4. `final lock` validates all six M3 reports before recording engineering G5. Final local export remains pending owner review. No automatic G6, identity authentication, remote authorization service or publication is implemented.

The report-to-lock ordering is two phase: review frozen actual media/final-review binding, issue the real lock using those immutable PASS reports, verify exact lock/export postconditions and obtain affected-role acknowledgments separately. Appending acknowledgment hashes into the already-hashed reports would create a cycle and is not required. M4 final acceptance examines the complete post-lock closure and all six roles.

## Selected Shotcraft integration: Option C

Use the reviewed minimal replaceable visual closure from video-shotcraft commit `43bd349a136651865ecfa6ea1cf012f6e957d304`. `src/final-renderer/upstream/Polish.tsx` is retained with Apache-2.0 notices. The portrait graph derives the inspected edge-before-node, spring materialization and camera-settle choreography while using this engine's approved text/palette and measured timing. The final renderer adapter returns silent intermediates; the engine owns authorization, durable tasks/CAS, audio, verification, export and review.

This is not an installation of the entire Shotcraft Skill, SDK/Workbench or upstream export pipeline. No upstream installer/Skill instruction/Workbench, uncertain stock audio, remote font loader or target repository is executed. The editable export copies the required engine support closure and exact dependency lock. Real standalone install/rerender proof is required; copying source alone proves neither.

Final typography locks unmodified Noto Sans SC at Google Fonts commit `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`, SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`, with OFL/metadata. Actual FontFace readiness and glyph measurement precede rendering. This explicitly replaces the older Microsoft YaHei hint; fallback is not silently accepted.

## Architecture decisions and limits

| Decision | Reason and limit |
| --- | --- |
| Single local package and native CLI | Keeps the authorized single-machine workflow inspectable; no account system, queue cluster, website or deployment service. |
| Agent-authored structured creative inputs | Research interpretation and creative choices remain explicit; no claim of built-in model calls or autonomous arbitrary URL-to-video production. |
| Separate planning, preview and full-render contracts | Prevents a valid plan/preview from becoming full-production authority; historical source/artifact versions remain reviewable. |
| Minimal Shotcraft renderer adapter | Reuses observed motion techniques while leaving persistence/security/finishing under engine control; no wholesale upstream execution. |
| Whole-package rendering and scene-local text correction | Simple deterministic invalidation/retained budgets; no claim of partial-scene rendering cache, arbitrary edit DAG or broad NLE functionality. |
| Sentence/scene caption allocation | Honest synchronization to measured line timing; word alignment is not implemented. |
| Read-only operational audit | Diagnoses persisted relationships and CAS without grants/repairs; separate stores/files are not one atomic snapshot and external export hashes need a separate check. |
| Explicit fee coverage | Current known offline rates can calculate provider fee zero; historical unknowns, hardware/human/app/license/invoice totals are not converted to zero. |
| Current source plus retained frozen evidence | Regress affected paths after fixes and preserve old failures. Do not require costly rerender of unchanged historical artifacts or reuse old votes as current acceptance. |
| Owner-deferred perceptual AV | Allows explicit engineering continuation while keeping listening/continuous viewing and creative final approval UNVERIFIED. Objective technical/factual/security criteria remain mandatory. |

The generic final composition consumes identity/URL, supported scene data/captions, palette and measured timing. Actual synthetic Atlas sample frames demonstrate alternate input consumption, subject to matching source/font/dependency closure; they do not establish research, narration, approval or complete production for a second repository. Supported production remains a finite Chinese portrait graphic-explanation workflow with explicit fit/timing constraints. No cross-platform visual identity, arbitrary style/language, all process races, malicious-host tamper resistance or fresh-machine network install is certified without actual evidence.

Reference observation is bounded by actual records (`examples/rea/reference-observations.json`): primary static samples and limited auxiliary viewing were observed, with unheard/unviewed portions stated. No new reference-observation waiver is inferred from the owner's AV deferral. Third-party reference footage is analysis-only and not automatically licensed for output reuse.

## Verification ownership

M3 verifies actual full media, source/claims/assets, integration recovery, standalone editability and exact lock/export. M4 verifies current-source install/regressions, complete workflow recovery/cache/budgets/cost/diff/diagnostics and final evidence/delivery closure. Three accepted M4 slices remain bounded prior evidence. Final M4 requires product, reliability, evidence, video_quality, content_facts and security; raw failures and minority findings are preserved. Both technical completion and final human acceptance must be represented accurately and separately.
