# Independent explanation-session architecture, evidence, facts and usability review

Candidate SHA-256: `4bd20c8aa55ce315d68e0e9b835fca4b5289dc1006a3d6fb043790f09283b898`.

**CHANGES_REQUIRED — one major author-handoff defect.** Source binding, the inspected factual claims, bounded silent media and completed-stage recovery passed the checks below. The exported author packet sends its recipient to the wrong workflow, so this candidate does not yet pass the advertised usable session handoff. No claim of automatic authoring or final audiovisual acceptance is made.

## F1 — Major: the new session packet prescribes an unavailable old workflow

Locations: `src/workflow/explanation-session.ts:104`, `:248`, `:263`; `src/workflow/agent-authoring.ts:140` and `:143`.

The session's start packet directly reuses `authoringPacket`. Its `work-package.json` tells the author to submit via `project submit-proposal` and export via `project export-proposal`; it also advertises `capture-text`. However, `executeStart` commits only the session task and captured snapshot. The workflow project is first created inside `executeAuthor`, reached through the different `explanation proposal` interface. Immediately following the packet's next instruction therefore fails with `WORKFLOW_NOT_FOUND`. The packet also exports the old proposal schema/draft, but no session submission-envelope schema/draft carrying disposition, session ID, language and the session's required fields.

This is not hypothetical: `checks.mts` reproduces the failure in a start-only private state. `fresh-handoff.mts` separately creates a genuinely new, uncached start using simulated read-only transport replaying the retained real Fastify README. That start reports `awaiting-author`, creates no workflow database, and its prescribed old submission command fails with `WORKFLOW_NOT_FOUND`. `fresh-handoff.json/log` retains the result and packet instructions. The transport is explicitly a local fixture, not an independent network fetch.

The new protocol documentation describes the correct `explanation proposal` command, but contradicting that documentation in the actual handoff packet breaks the point at which the session author is expected to continue independently. The builder examples bypass the faulty instruction by knowing the new protocol already.

Required repair: produce a session-specific work package with the correct stage command, an exact session-submission schema and usable draft/envelope, returned parent bindings, and an honest needs-evidence continuation. Do not direct a session author into the standalone project capture/export workflow. Keep standalone project authoring behavior intact.

Versioning matters: `verifiedStart` regenerates the packet and verifies its saved digest. Changing the packet in place under the same profile can invalidate existing successful start receipts. Use an explicit new packet/session profile and retained legacy reconstruction, or another explicit compatibility design preserving original task and packet bytes. Do not rewrite historical receipts.

Recheck: start in an empty state; follow only the exported packet's instructions and schemas to an accepted author checkpoint and plan; exercise needs-evidence and unsupported outcomes; verify old start/status/export bytes under the declared compatibility policy.

## Identity and independent execution

Verified all **296** manifest files (unique safe paths, lengths, SHA-256), exact source ZIP, and **621 source files** against Git base `9e2a004eb96c20ca9e2703e4fce380a83b200a02` plus the nine declared changes. Final identity recheck passed. Source edits chiefly add the session contracts/runtime/CLI and expose existing authoring/plan helpers.

Read the actual operator/contract, complete session implementation and contracts, affected helper code, three author submissions and two mapped plans. Builder author/verification scripts and other judge reports were not used as proof. All execution used copied frozen state and judge-owned files. No target repository code, package installation from a target project, paid provider or deployment was run.

Independent replay of Fastify, p-queue and fd exercised verified start status, exact-request cached start/packet publication, accepted author cache, final status, completed resume, receipt export and repeat export. Network and media-tool environment paths were disabled for the session checks; independent FFmpeg/FFprobe calls separately decoded the retained media. The existing 13 task rows and 77 CAS objects in the copied state remained unchanged after the tests; added submissions were new records.

Twelve negative checks rejected wrong session, snapshot, language, requested audience, authorship, quote, source hash, proposal hash, excess requested duration, an unsupported render, and damaged captured snapshot on downstream status and completed resume. A new needs-evidence author checkpoint was accepted with no proposal hash and could be resumed as a verified cached result.

Typecheck passed. The touched intake/authoring/presentation/queue regression suites passed **47/47** tests. These passing technical tests do not cover or waive F1.

## Three original evidence sets and factual scope

| Repository | Pinned commit | Independently checked content |
| --- | --- | --- |
| fastify/fastify | `8c0f699144187dab3b600a626829c31368762256` | Three exact citation records: port 3000, GET `/`, and `reply.send` with an object whose hello field is world. |
| sindresorhus/p-queue | `7f272ab5ff2254c0dc2537b7977e88ede1cd55e8` | Seven exact citation records: concurrency one means simultaneous task count; the two async functions are submitted without awaiting each add; add promises settle with task results and onIdle waits for no pending/running work. |
| sharkdp/fd | `cc4e40fa4e32d61733cd72926e233a3fb6c8d56d` | One exact citation record: the README's recursive search for entries containing the example pattern `netfl`. |

For every cited record I independently checked the actual exported source bytes, SHA-256 and complete inclusive line range, rather than accepting the proposal's quote field. The sources are retained captures with pinned repository/commit URLs. I did not independently refetch the three GitHub commits during this review.

The Fastify display `hello: world` is a simplified illustrative field/value, not a wire-format claim; the proposal explicitly excludes wire serialization/headers. Its successful listener/request path is an assumption. The p-queue example has one concurrency slot, two illustrated tasks and hypothetical fulfillment/times; it does not claim a rate of one start per second or measured network results. The fd disposition correctly identifies recursive traversal/filtering as outside the three available presentation families. Its export contains original evidence, the authored proposal inside `authoring-submission.json`, and the reason; no MP4 is produced. Unsupported is an author-declared judgment with checked citations, not a program-proved semantic classification.

I deliberately submitted a p-queue proposal with the false statement “At most one task starts in each second” while leaving exact citations intact. It passed structural/provenance submission and remained `semantic: pending`. This confirms the documented semantic boundary; it is not counted as a validator defect, and that false proposal was never rendered. A source hash match must not be presented as factual approval.

## Actual media, recovery and user-facing boundaries

Independently ran FFprobe with frame counting and complete FFmpeg video decode for both retained outputs:

- Fastify: **216 frames / 9 seconds**, 720×1280, single video stream, SHA-256 `d9ca83051168d8ded42926ceaa8498458b3ea01fb9006b4ccf32e4173a90dc9f`.
- p-queue: **240 frames / 10 seconds**, 720×1280, single video stream, SHA-256 `1c70ea53dfdf9434b6c9c1683da37406d47b23e95fbfe150c10ebfa80da03815`.

Both fit their requested limits and are silent, as explicitly requested. I viewed retained Fastify reply and p-queue waiting/final-state PNGs. They carry “Silent · Illustration · No observed execution”; queue timing is marked illustrative. I did not newly extract those PNGs or perform continuous perceptual review. Silent proposal narration is available as authored text/sidecar material, not synthesized speech. Language is an authoring constraint; the contract openly excludes automatic translation of built-in labels.

I inspected the retained task rows/events for the p-queue outer render and child preview: both show a cancelled failure followed by attempt-2 success under their original IDs. I independently exercised completed-stage resume with rendering disabled. I did **not** independently cancel a new renderer or observe worker termination this round; the historical cancellation execution is retained evidence, not my own live execution.

Request identity includes normalized repository/ref, audience, language, cap and voice mode. A successful HEAD request intentionally reuses its pinned capture on repeat; it is not a request to refresh HEAD. A fresh explicit ref is needed for another source revision. The start task ID identifies that request within state; the separate snapshot/commit/manifests identify the evidence. The session remains limited to bounded public-root GitHub intake, explicit agent-authored proposals/plans and existing renderers. It is not arbitrary-repository automatic narration or an attained 90% product-readiness claim.

No new render, speech generation, owner listening, independent network capture, full repository suite or live interrupted-render recovery test was performed. Historical reviews remain untouched. After F1 is repaired and independently rechecked, this slice can be judged as a bounded silent session integration; broader authoring convenience, source supplementation and voice integration remain future work.

Raw evidence: `identity.mjs/json`, `checks.mts/json/log`, `fresh-handoff.mts/json/log`, exact private packet/export directories, `focused.log`, and `typecheck.log`.
