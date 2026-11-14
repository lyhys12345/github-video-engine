# RSI public voice cache v1 — independent architect final review

- Role: reliability/security/evidence Judge, judges-v2 common rules. Active architect clauses C1-C7; C8 delivery belongs to root after review.
- Candidate: candidate-v2.json SHA-256 bc1d56884d2e3899fc1a614015b7b39726c8ddb18142136a382646e408138829; baseline a89acece8debb68aca0a211382b56b6af7dfd164.
- Source: src/tts/qwen-public.ts SHA-256 eb5d46cd756bd38bf7ce2250a6c2b47f02a1856c7dad615654295ab143fc40db.
- Review date/environment: 2026-11-14; Windows x64, Node 24.22.1. Reviewer scratch: C:/Users/luyuh/Documents/Codex/rsi-cache-judge. Current nvidia-smi identifies NVIDIA GeForce RTX 3070.
- Verdict: PASS for this bounded architect review. No unresolved blocker/major. C8, separate product verdict and final human acceptance are not asserted by this report.
- Independence: provided architecture advice, wrote no candidate implementation/tests/contracts. Independently inspected source before final implementation summary, original evidence, evidence-producing harnesses and actual WAVs. Did not read another Judge report. Root conveyed a wording correction; candidate v2 was then independently checked in full. Preliminary report remains unchanged.

## Conclusion

Exact committed public narration now avoids the full model byte scan while keeping current profile/Python/small-input identity and artifact verification. Ordinary misses and doctor retain the original inventory/hash loop. TaskRunner remains cache accounting/ownership authority. The zero-attempt cache-only path rejects a vanished successful hint before claiming work, and its callback has a defensive unverified-execution guard.

The intentional behavior change is clear: cached recording reuse is not current model readiness. Independent copied-state checks confirmed a real cache hit with an absent model, byte-identical WAV/manifest, unchanged attempt and one additional cache receipt. Changed text, fresh-state generation and doctor rejected the absent model; no fresh-state directory or task appeared. Corrupting the reviewer-owned cached WAV caused INTEGRITY and a cache_failure receipt without regeneration.

## Clause decisions

| Clause | Verdict | Independent basis | Limits |
| --- | --- | --- | --- |
| C1 | PASS | Unchanged input/task-kind/manifest source; current real generation task and canonical manifest/WAV verification; explicit copied-WAV corruption failure and usage receipt | Hashes establish declared text binding, not heard speech accuracy |
| C2 | PASS | Full verification loop unchanged; instrumentation harness reviewed; all five baseline/current raw repeats checked against 11 locked files totaling 2,498,383,610 bytes versus zero model streams/bytes; doctor absent-model rejection independently rerun | Stream counter covers adapter model reads, not OS disk-cache misses; no cold-load speedup claim |
| C3 | PASS | Source state preflight, readTask snapshot/schema/identity and UsageTaskSchema examined; ordinary missing-model failure before state independently observed; source and deterministic race test establish attempts zero; legacy/future/malformed-state cases inspected in passing raw tests | Matching the exact unsupported-version error message is intentional maintenance coupling |
| C4 | PASS | Worker timeout/offline/cleanup unchanged; independent pre-abort preserves exact cancellation reason with no state; real cache hit/failure accounting inspected; mocked cancellation and timeout cases passed in raw regression log | No OS-sandbox claim or newly certified arbitrary concurrent filesystem mutation |
| C5 | PASS | Raw measured source hashes and harnesses verified; original DB hash still unchanged; successful fresh task/WAV/manifest read through actual adapter reader; both original/fresh real WAVs independently FFprobed and fully FFmpeg-decoded | Judge did not repeat expensive fresh GPU synthesis; producer raw evidence and actual resulting task/artifacts inspected |
| C6 | PASS | Frozen 19-case adapter test source and 65-test five-suite raw log examined; meaningful cases cover corruption, model tamper, repair, identity, cancellation, race and state versions; independent actual missing-model/corruption/pre-abort checks supplement them | 65 builder tests were not rerun by Judge and are not counted again; mocked subprocess tests are not GPU tests |
| C7 | PASS for architect responsibilities | All 34 candidate files independently matched byte count/SHA; all 16 evidence-copy originals matched; own raw results saved separately; failures retained and bounded claims checked | Separate product Judge and root delivery remain distinct decisions |

## Actual independent checks and evidence

1. `node --import tsx C:/Users/luyuh/Documents/Codex/rsi-cache-judge/check.mjs`, cwd repository, exit 0. Verified all 34 v2 files, all 16 raw evidence copies, actual real cache reuse, task/receipt preservation, missing-model negatives, corrupted cached WAV failure and fresh task/artifact integrity. Results: architect-independent-check.json. Only reviewer-owned copied state was mutated.
2. FFprobe on both actual WAVs and `ffmpeg -v error -xerror -i <wav> -f null -`; both fully decoded, exit 0. Results: architect-media-check.json. Original WAV 76f55f68...6408: 40,960 samples/2.56 s. Fresh WAV 8c1827f8...696a: 34,560 samples/2.16 s. Both mono PCM16, 16 kHz; exact full hashes in the result file.
3. `node --import tsx C:/Users/luyuh/Documents/Codex/rsi-cache-judge/evidence.mjs`, exit 0 after correcting a reviewer-only newline assumption. Independently matched baseline Git source bytes to bfa8cadf...6ebe, recomputed model byte total, medians and ratio, checked unchanged original DB, and verified pre-aborted operation creates no state. Results: architect-evidence-check.json.
4. Median raw adapter elapsed times independently recomputed: baseline 4,038.312 ms; candidate 85.215 ms; ratio 47.3897. Same-machine repeated measurements, filesystem-cache effects and overlap with another CUDA validation are explicitly disclosed. These are observed cache-path timings, not whole-video, controlled hardware, or fresh-synthesis guarantees.
5. Read frozen verification-targeted.log: five suites / 65 passed, including 19 adapter cases. Read typecheck.log and root-checks.json for typecheck, 112-entry catalog and patch checks. No full regression claim.

## Findings and preserved failures

No blocker/major established. The exact version-error-message fallback remains a minor maintenance coupling already documented and regression-covered. It only declines optimized cache eligibility; normal TaskRunner migration/version/schema enforcement remains authoritative after model validation.

Producer failures remain in evidence/candidate/fresh-sandbox.log and fresh-approved.json: PUBLIC_VOICE_RUNTIME and a provisional harness timeout. The successful final test changed both text and deadline; these do not prove the earlier failure repaired or isolate its cause. Final successful output, task identity and decoder results are independently supported.

Reviewer execution also had one failed assertion: the first baseline-source comparison unnecessarily converted Git LF bytes to CRLF. Direct Git bytes matched the recorded baseline SHA exactly; removing the reviewer transformation made the evidence check pass. No product/evidence change was made for this. Exploratory reads also tried a nonexistent tests/qwen-public-cache.test.ts name; the correct frozen adapter test was then inspected.

The final results document now says the source task declares its text, avoiding an unsupported listening claim. This is a documentation correction only; all source/tests/raw evidence hashes remain as originally reviewed.

## Delivery and limitations

The v2 manifest certifies the exact local Windows bytes reviewed. Git may normalize text line endings; this report does not certify that an arbitrary fresh clone matches those raw byte hashes. Root should record reviewed-byte versus staged-blob SHA-256 and restrict any difference to verified CRLF-to-LF normalization in its separate C8 delivery audit. No blanket source attribute change is needed for this acceptance.

No listening, pronunciation, naturalness, forced alignment, full continuous AV, CPU/platform expansion or formal project video approval. Existing model-check-to-worker filesystem trust assumptions are unchanged. The original model directory was not modified by this review. No paid service, target execution, publication or private voice dependency was introduced. Final owner acceptance remains pending.
