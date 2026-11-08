# RSI blinded experiment utility

Run `node --import tsx scripts/rsi-experiment.ts freeze INPUT.json`. Input contains id, baseline/candidate text file paths, requirements/rubric text file paths, a new out directory and requiredModalities (script, frames, audio, continuous-av). No model or media rendering is called. Output is create-only; partial failed output is retained for diagnosis. Use a new directory after failure.

Give a fresh independent reviewer only the reviewer directory. Keep operator-manifest.json private until verdict. Packet labels are randomized; content itself may reveal identity and this cannot guarantee psychological blinding. Review reports contain experimentSha256, reviewer, verdict PASS/REVISE/UNVERIFIED, actual coverage, findings and preferred A/B/tie/neither. Run `node --import tsx scripts/rsi-experiment.ts review OPERATOR.json REPORT.json`. This verifies assignment and exact A/B bytes against the operator manifest before evaluating coverage and verdict. Reports are declarations, not authenticated proof of listening or independence.

PASS means the reviewed candidates meet the declared scope, not that the new candidate improved. Decode preference only after review: baseline preferred means regression; tie means no demonstrated improvement. Never count unreviewed audio or frames as passed. Script results do not establish rendered quality.

The exported nextExperiment function preserves requirements/rubric/baseline and increments a SHA-linked attempt, refusing attempt four. It is a building block, not an automatic repair orchestrator; callers preserve each new candidate/report and verify prior manifests. No script approval or video generation authority is created. Existing exact-owner-approval gate still applies.

2026-11-08 local pilot: frozen voice/world script packets under work/rsi-comparison-v1. New wording/shot plans are hypotheses requiring independent review. Reference v4 videos hashed separately, not rerendered. Comparison uses historical scripts as shared factual context; fresh fact verification and continuous audiovisual comparison remain unverified. Run tests/rsi-experiment.test.ts for byte binding, anonymization, stale report, rubric mutation, modality, attempt bound and tampered reviewer-file refusal.

The attempt bound applies to one declared chain, not a global spending quota: a trusted operator can start another experiment. There is no persistent autonomous dispatcher. Protect operator manifests and review provenance separately.
