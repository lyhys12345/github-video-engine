# PASS with unresolved findings regression

Actual red test reproduced candidateReviewDecision returning passed for PASS with a supported-format finding and exact owner approval. Added guard after coverage/UNVERIFIED checks: unresolved findings return revise-and-resubmit for both script and video. Exact candidate matching and owner approval remain unchanged. Raw reports preserved.

Validation: tests/candidate-review.test.ts + tests/creative-brief.test.ts + tests/rsi-experiment.test.ts, 3 files / 10 passed. Typecheck and diff check passed. Independent agent reran same 10, not additive, and PASS scoped to gate correctness. No new video/full regression. Findings field is unresolved work; informational observations belong in raw review prose, not cleared by a PASS label.
