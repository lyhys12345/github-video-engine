# C1 independent architecture / evidence / facts review

- Candidate: outputs/fact-audit-1104, FACT-REVIEW-FREEZE.json (2026-11-04T20:02:05.4860824-08:00).
- Review time: 2026-11-05 04:04–04:07 UTC, Windows / Node / tsx.
- Output: C:/Users/luyuh/Documents/Codex/fact-judge-c1/.
- Verdict: FAIL for a complete Story factual-review handoff; proposal-only CLI provenance/receipt boundaries inspected are sound. No claim of production approval or semantic truth certification.
- Independence: no peer judge reports read; no candidate files changed. I read FACT-REVIEW-AUDIT.md for declared scope before inspecting implementation, so its builder assertions are not independent evidence. Findings below are from code and my independent probe. Existing project common Judge instructions remain applicable; no separately accepted C1 milestone contract supplied.

## Outcome

All six freeze entries match actual SHA256. Independent script exercised real local REA and rembg fixtures through the candidate API, without running either target project. REA: eight sources/eight claims/22 narration and visual units. rembg: one source/four claims/14 narration and visual units. Both retain pending-independent-review. Fake quotation, invalid line, changed source bytes, missing receipt item and stale narration receipt are rejected in both fixtures. A fabricated universal accuracy claim with authentic quotations remains pending, correctly avoiding automatic entailment claims.

Packet hashes bind the candidate and packet material; receipts bind both hashes and require every enumerated item. Results explicitly disclose no authenticated identity, no machine verification of semantic truth and approval:none. The public CLI uses verifiedAuthor and parent workspace rather than accepting arbitrary caller-provided source paths. It exports a separate sidecar and does not promote semantic gate state. This is structurally appropriate.

However, the Story API does not expose all authored evidence graph content for review. That gap matters because objects/actors/operations/disclosure carry semantic content independently of narration and shot visual descriptions. Candidate hashing only notices changes; it does not make hidden text reviewable.

## Findings

### F1 — major: Story review omits authored graph semantics

Location: src/workflow/fact-review.ts:19 (storyFactReview); corresponding contracts in src/contracts/evidence-plan.ts.

Reproduction: in both valid REA and rembg Story inputs, set evidence.objects[0].label and evidence.disclosure to `GUARANTEES PERFECT RESULTS FOR EVERY INPUT`; re-parse with StorySchema; create packet. The marker is absent from the entire serialized packet. requiredItems contains only claim and narration/visual IDs. A structurally complete TEST ONLY receipt for this new packet yields attributed-review-complete. Recorded in checks.json, coverage.authoredUnsupportedObjectAndDisclosureVisible=false for both fixtures.

Expected for complete Story factual handoff: reviewers can inspect authored graph labels, roles, operations/parameters and disclosure or result explicitly scopes review coverage to the subset, with these fields marked unresolved/excluded. Actual: these inputs affect candidateHash but are not exposed or explicitly listed as excluded. Existing evidence-planner composition uses actor/object labels and disclosure, so they are not merely opaque runtime metadata. This is not an approval bypass: approval remains none, and Story API is not yet integrated into runtime. It is a real completeness gap in the advertised Story review handoff.

Fix/retest: expose graph semantic units and require their review, or sharply scope output coverage and avoid presenting it as full Story factual review. Re-run this exact marker test on REA/rembg plus changes to actor labels, operations, disclosure. Verify stale receipts still reject.

### F2 — minor: proposal inference rationale is omitted

Location: src/workflow/fact-review.ts:20, proposal claims mapping.

The projection retains basis.kind but discards basis.reasoning (and any further basis metadata). Story claims retain rationale through object spread, so the two adapters give unequal inference context. Reviewers see claim and sources but not the author's explanation for deriving the inference. This does not silently verify the claim; pending state is honest. Include complete basis metadata in reviewable claim content and tests.

### F3 — limitation: freeze is partial

FACT-REVIEW-FREEZE lists six files, not all dependencies/source fixture hashes/package resolution. Six entries verified, but this alone is not a whole executable candidate identity. Independent probes generated packet source hashes, and did not change candidate. For reproducible integrated gate use, parent should bind source archive/commit and relevant fixture/dependency versions. Do not upgrade this observation to a proven integrity failure.

## Evidence and semantic boundary checks

- Source bytes verified by SHA256 and exact citation range. I opened rembg-bg.py.txt around lines 319–333: session.predict(img) and masks loop support mask-prediction mechanism, not perfect results for all images. The authentic-quote/wrong-semantic test correctly remained pending.
- REA source fixtures are version-bound code URLs (f4cc6c85efe7f3513d587df3bd5086adb1bc6a76) plus a byte-pinned official example HTML URL. The HTML URL itself is not a commit URL; do not describe all sources as commit-pinned.
- rembg code is pinned to c5b48b0417a0254df7d461efa14573597f369a83.
- All source content remains untrusted data; no remote source re-fetch and no target execution occurred. Offline hashes establish consistency with the recorded fixture, not independent original retrieval authenticity.
- Three context lines are useful but do not establish exhaustive contradiction search. This limitation is appropriately declared.
- Complete structured receipt is evidence of attributed judgments, not evidence that judgments are correct. Test receipts explicitly say TEST ONLY and are not actual semantic endorsements.
- Rendered captions, actual frames, downstream plans, audio and ownership/rights were not reviewed. Public CLI accepts proposal checkpoints only; no claim that REA/rembg Story fixtures ran through that CLI.

## Checks

1. PowerShell Get-FileHash for all six frozen files; freeze-check.json records actual=expected.
2. `node <candidate>/node_modules/tsx/dist/cli.mjs C:/Users/luyuh/Documents/Codex/fact-judge-c1/probe.mts`, exit 0.
3. Probe writes rea-packet.json, rembg-packet.json and checks.json in this independent directory. It imports candidate APIs read-only; edits in-memory copies only. No Vitest or existing test suite results are represented as independently rerun.
4. Inspection of exportExplanationFacts lines 858–869: accepted proposal checkpoint revalidation; independent sidecar; optional bounded receipt; publication through existing asset helper.

## Recheck conditions

C2 must have a fresh freeze; rerun original F1 inputs and stale/missing/quote negative cases. Confirm every new review unit is required, receipt schema still excludes fake identity/semantic authentication, and all supported results preserve approval:none. No historical report or acceptance flag should be rewritten.
