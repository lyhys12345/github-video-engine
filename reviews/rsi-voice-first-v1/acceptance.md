# RSI first voice generation — engineering acceptance

Recorded 2026-11-14T09:04:24.224936+00:00 by the root orchestrator after independent review. Baseline `57795ea0c7b70bb34adfee04f064542928167f7a`; candidate `candidate-v1.json` SHA-256 `23965b8284b11ab97f9f9d58932914788402156873f4f23401ba4100fd5b51c1`. This is a bounded RSI improvement, not a new production-film approval or full-product completion.

## Independent decisions

Both active roles PASS their engineering scope on the same frozen candidate, with no unresolved blocker or major. Original findings and limitations remain in the reports:

- `astra-final.md` SHA-256 `f3fb3acb3039a57b0fd54df1f04cc2be9455cde63f4978ac06f1a991d5136b7e`.
- `terra-final.md` SHA-256 `12a768f8f04aab7c3876985521202549f397369d6885abd2c696ef561b7892d9`.

- Astra: F1–F4 and F7 reliability/security/evidence.
- Terra: F5–F7 product/pacing/approval boundaries and F1 claim scope.
- Root: F8 delivery is verified after commit/push and Drive readback; the local delivery receipt and Drive handoff record the actual commit. This pre-commit document does not claim that external delivery has already occurred.

## Demonstrated

Model verification median 3.522 → 1.616 seconds in three interleaved measurements per buffer, with full model hashing retained. This saves about 1.91 seconds in that stage only. Thread tuning was rejected; no inference or overall generation speedup is claimed. The public architecture gate works with the normal scrubbed environment. A production 9.040-second public recording fully decoded, resumed the same failed-publication task, and reused the exact cache; public cancellation cleaned owned scratch directories without a result. Anna source waveform validation rejects invalid values before PCM output.

54 distinct JavaScript tests plus 4 Python unittest methods passed; one Python method contains 10 waveform subcases. The adapter's 19-test rerun is not added again. Typecheck, test inventory, brief-check and Skill validation passed. Recorded test transcript is a faithful extract, not raw full stdout; no full repository regression ran. Judge reruns and methods are separately recorded.

Anna test-only punctuation A/B has identical spoken characters, voice/reference/seed and 1.0× playback: A 5.440 seconds; B 5.200 seconds. Original and listening-copy bytes and full decodes were verified. Recordings stay local, not in Git. No shortest-take auto-selection or new voice default.

## Still pending / next work

Actual listening, spoken-content completeness and naturalness remain UNVERIFIED pending owner review. A shorter clip does not establish any of these. Formal video still requires approval of the exact script/storyboard and later timing/caption alignment. No formal video, paid service or untrusted target execution occurred.

The large remaining first-generation cost is model/runtime import and synthesis. A future bounded experiment may assess local session reuse or batching, but needs lifecycle/ownership/cancellation/memory evidence before implementation. No persistent service was added in this cycle. Anna's pre-existing model hash reader still has no abort signal; that limitation was not changed or claimed fixed.
