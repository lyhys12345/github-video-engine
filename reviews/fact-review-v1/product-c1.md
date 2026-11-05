# Fact audit 1104 / J1 product and interface

- Judgment: PASS for the explanation-proposal fact-review sidecar, with two minor interface findings. This judgment covers the review workflow and result semantics. The receipt cases used TEST ONLY data.
- Version: FACT-REVIEW-FREEZE.json SHA-256 a36040b61bcefcb8f0e005c109e52d3ad4a32e283d6956fa5c157e9744df1620. All six listed hashes matched before review. The manifest covers the declared changed files, not the complete source/dependency tree. See freeze.log.
- Input: a copied Windows state with a real pinned sharkdp/fd proposal (commit cc4e40fa4e32d61733cd72926e233a3fb6c8d56d), author checkpoint 373bebdb743050fb4984ad1cebef787e07e237b6a37d30880c7ee0bd2655584c. Candidate hash 233b937d6f971c6c1cf586b8657daedcabdde162b30a75d3add8c59652267ca7, packet hash e1bd167f28ff7aec219719054a6e10d6d22cd6ee2b11f65dd4c665dbfa448950.
- Independent output: C:/Users/luyuh/Documents/Codex/gve-fact-product-judge. November 4, 2026, Windows / local Node CLI. Candidate files and original state left untouched. Read freeze and code before the implementation notes. No other judge reports consulted.

| Requirement | Result | Direct evidence |
| --- | --- | --- |
| Public CLI creates an inspectable fact-review packet | PASS | packet-cli.log, publication bundle returned in JSON. Bundle exposes packet, JSON Schema and result. No receipt gives pending-independent-review, semanticTruth not-machine-verified, and approval none. |
| Review work covers material with and without explicit claim links | PASS | required-items.log, actual packet, actual source proposal. Compared complete required ID set to source proposal, plus exact text equality for both narration beats. Three claim IDs, use case, two entities, one mechanism, two narration units, two visual units. Each citation provides source hash and URL, exact quote, line range and bounded context. Packet scope explicitly says to examine assertions omitted from claim links. |
| Completion is attributable, bounded and distinct from approval | PASS | all-supported.log and status-after.log. A synthetically all-supported receipt returns attributed-review-complete, a reviewer and receipt hash, identityAuthentication not-provided, semanticTruth not-machine-verified, approval none. Session status stays semantic pending. |
| An unresolved or incomplete review cannot masquerade as complete | PASS | unresolved.log and missing.log. One unsupported and one unverified item give review-unresolved with both IDs; incomplete receipt returns FACT_REVIEW and creates no output directory. Exit codes 0, 0, 1 for supported, unresolved and incomplete, respectively. |

## Independent checks

Invoked node node_modules/tsx/dist/cli.mjs src/cli.ts explanation fact-review --task CHECKPOINT --data COPIED_STATE --out OUTPUT, optionally with --spec RECEIPT. Opened the bundle returned by the command and inspected the result and review material. Ran explanation status afterward. Windows hardlink creation for receipt publication used approved local execution against the isolated copy. Neither remote source code nor speech/media ran. I did not adjudicate the factual claims or inspect rendered captions. Story-runtime CLI integration is outside this proposal-sidecar judgment.

## Findings

1. Minor, command discoverability. Top-level --help omits fact-review, including when passed after the explanation subcommand. The invalid-input explanation usage and candidate instructions show the command, and the documented entry works. See top-help.log. Recheck both top-level and subcommand help when wiring release docs.
2. Minor, status vocabulary. A well-formed unresolved review exits 0, while the generic publication field output.review is pending even after an all-supported receipt. The machine-readable factual result is result.status and grants no approval. A caller using only process status or the generic publication field can misread the outcome. Document the three result states and their distinction from successful file publication. See exit-codes.log, all-supported.log and unresolved.log.

