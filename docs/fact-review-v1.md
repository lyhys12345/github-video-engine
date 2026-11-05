# Fact review sidecar

`github-video explanation fact-review --task <accepted-proposal-checkpoint> --data <state> --out <new-directory> [--spec <receipt.json>]` exports a source-bound review packet and receipt schema; with a receipt it also verifies the attributed judgments. The command checks the committed proposal, citations and exact source bytes again. Every required item must have a verdict, rationale and limitations. Read `result.status`: an unresolved receipt can still exit with code 0 because the command successfully processed it.

This is an evidence and review handoff, not automated semantic verification. Reviewer identity is not authenticated; receipts do not grant approval and do not update the session's pending semantic review. Do not mistake accurate quotations for proof that a claim is true. A new proposal or packet requires a new receipt. The Story adapter is an API only, not a public Story workflow; downstream captions, actual frames and presentation parameters still require separate review.

The real narrated fd revision was rendered and decoded with Windows Huihui, not the previously preferred Chen voice. Its audio was not listened to, and naturalness and word-level alignment remain pending owner review. See the independent reports in `reviews/fact-review-v1` and `reviews/voice-revision-v1` for the candidate-specific evidence and limitations.
