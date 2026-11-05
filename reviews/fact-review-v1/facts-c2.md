# C2 independent architecture / facts recheck

- Candidate: C:/Users/luyuh/Documents/Codex/fc21104; FACT-REVIEW-C2-FREEZE.json, frozen 2026-11-04T20:08:20.6316794-08:00.
- Role/scope: independent recheck of C1 fact packet coverage, source/receipt boundaries; existing Judge common rules. Not full product, security, rendered-media or owner acceptance.
- Time/environment: 2026-11-05 04:08–04:10 UTC; Windows, Node/tsx.
- Output: C:/Users/luyuh/Documents/Codex/fact-judge-c2/.
- Conclusion: PASS for this scoped recheck. C1 F1 major and F2 minor are resolved by direct independent evidence. No remaining blocker/major found within this scope. C1 report remains unchanged.
- Independence: no peer reports or C2 builder summary read; inspected frozen source and reran independent scripts. No candidate modifications.

## Version verification

All eight entries in FACT-REVIEW-C2-FREEZE.json match actual SHA256, recorded in freeze-check.json. fact-review.ts hash is 8c230b6dff9b7a25a03d627732b84d4a0a1d0fbba632cef6e15122095f6aa2a5. First shell mismatch count mistakenly compared each actual value to literal `expected`; corrected property-to-property comparison found zero mismatches. The raw JSON always recorded actual and expected matching values.

## Original failure and neighboring boundaries

C1 probe rerun without behavioral changes (only candidate/output paths changed):

- REA now has 34 review units plus 8 claims; rembg has 23 review units plus 4 claims.
- Original unsupported object-label/disclosure marker now appears in serialized packets for both fixtures, instead of disappearing.
- Story-context, each object, each actor and each operation are now explicit required review items. Their complete structures are visible in unit text.
- Dropped every newly covered item individually: 12 REA cases and 9 rembg cases all rejected as incomplete coverage.
- C1 packet receipts against C2 packets reject, even though unchanged candidate Story hashes match; expanded packet hashes invalidate old coverage.
- A receipt marking story-context unsupported yields review-unresolved and lists story-context. It does not grant approval.
- Original quote/invalid line/changed bytes/missing item/stale narration checks still reject for both fixtures.
- Authentic quotations plus invented universal-performance semantics still remain pending-independent-review. No automatic truth judgment introduced.

Proposal neighboring regression uses the actual frozen fd proposal/source fixture from the prior voice candidate, without modifying it:

- Inference basis.reasoning is preserved exactly (C1 F2 resolved).
- Missing open-questions, either beat title, or either beat-context is individually rejected (5 additional cases).
- Actual proposal yields 13 units; all new items participate in receipt coverage.

## Evidence

Commands actually run, exit 0:

1. node C:/Users/luyuh/Documents/Codex/fc21104/node_modules/tsx/dist/cli.mjs C:/Users/luyuh/Documents/Codex/fact-judge-c2/probe.mts
2. node C:/Users/luyuh/Documents/Codex/fc21104/node_modules/tsx/dist/cli.mjs C:/Users/luyuh/Documents/Codex/fact-judge-c2/boundaries.mts

Raw independent artifacts: probe.mts, checks.json, rea-packet.json, rembg-packet.json, boundaries.mts, boundaries.json, freeze-check.json. All TEST ONLY receipts remain structural fixtures, never actual semantic endorsements.

## Boundaries and preserved limitations

This resolves the completeness defects identified in my C1 report. The public CLI still uses proposal checkpoints; Story API is a separate API. I did not rerun the builder's 27-test suite, typecheck, full CLI export or render tests, so freeze assertions about those remain builder-reported here.

The eight-file freeze is still a partial identity, not a full source/dependency archive; C1 F3 limitation remains. Baseline local fixtures are byte-pinned and verified by the candidate API; they were not independently re-fetched remotely. No REA/rembg target code was run. Semantic correctness remains attributable reviewer work; result consistently retains semanticTruth:not-machine-verified, identityAuthentication:not-provided and approval:none. This PASS is not approval of every factual assertion, speech, media, deployment or final human acceptance.
