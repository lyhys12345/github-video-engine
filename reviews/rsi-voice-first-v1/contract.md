# RSI first-synthesis and natural pace — contract

Date: 2026-11-14 (America/Los_Angeles). Baseline 57795ea0c7b70bb34adfee04f064542928167f7a. Owner asks for faster/stabler first local speech, slightly faster natural speaking, independent review/repair, GitHub push and Drive handoff. Formal video still requires exact script/storyboard approval. No paid service or untrusted target execution.

## Scope and acceptance

F1. Measure imports, model load, synthesis, output and adapter/model verification separately where possible. For speech trials use fresh worker processes, fixed text/model/preset/seed and sequential GPU use. Any adopted comparative performance claim needs at least three interleaved baseline/candidate measurements of its affected stage; pure verification measurements do not launch a GPU worker. Rejected tuning trials need their actual counts and no improvement claim. Disclose OS file-cache effects, unchanged verification cost and any baseline-only prerequisite workaround. No streaming-first-sample, machine-cold or whole-video claim.
F2. Reproduce and fix the observed public worker architecture check failure in a scrubbed Windows environment. Use native interpreter build information, retain Windows x64/CPython gates and pinned runtime. Actual final adapter must work in its normal isolated environment, not require the benchmark's restored architecture variable. Do not retroactively claim the cause of prior cycles' failures.
F3. Adopt only measured bounded input-I/O or worker tuning. Fixed settings belong in hashed worker source, never an untracked environment knob. Keep model/ref/seed, BF16, public SDPA/Anna eager, token budgets, deadlines, offline behavior and full model hash verification for every miss/doctor. No persistent service or weakened checks. Old profiles remain accepted; changed worker hash creates new provenance/task identity.
F4. Preserve cancel/timeout/cleanup and corrupt-input rejection. Add relevant invalid-source waveform checks before Anna PCM conversion where needed; finite, one-dimensional, bounded nonempty source and output; no successful partial/silent artifact. Targeted mocked tests separate from actual GPU verification.
F5. Generate local Anna TEST ONLY punctuation A/B after the performance sequence, identical spoken characters, same reference/seed/model, playback rate 1. Record exact inputs, real WAVs, durations and metadata/decodes. Native punctuation only proposes different pauses; if duration is not shorter, do not claim faster. No atempo, clipping, dropped words, reference rewriting or default-voice switch. Listening, content completeness and naturalness remain pending owner review if unavailable to Judge.
F6. Preserve the owner's brisk-natural request in existing briefing notes/voice guidance and scoped owner preference, with no universal forced pace or unsupported API argument. Keep formal script approval and caption retiming requirements; audition does not approve a film. Skill-creator validation and a small independent behavior review cover this guidance.
F7. Freeze exact code/tests/docs/raw evidence, retain failures, independent Astra reliability/security/evidence and Terra product/pace review; both resolve major/blocker findings. No full-regression inflation or unheard quality PASS.
F8. Commit/push only source/docs/tests/compact raw reports; exclude model, reference, profile, audio/video and handoff. Verify remote and exact staged-byte mapping if Git normalizes line endings. Update same Google Drive handoff preserving history.

## Roles

Sol profiler owns scratch instrumentation and sequential public GPU benchmark. Sol implementer owns workers and tests. Root owns scoped brief/Skill guidance, Anna auditions after GPU handoff, docs, freeze and delivery. Astra designs and independently reviews, without writing candidate code. Terra independently reviews behavior and actual metadata, without reading Astra's verdict first. Owner listening/final acceptance remains separate.

No new project video is in this engineering scope. A slower or failed tuning experiment is evidence to reject that tuning, not permission to lower correctness or speed up playback.


## Measurement-led scope decision

Torch thread variants were rejected after the warmed default and two candidate settings gave marginal or worse overall times. The adopted latency experiment is full model verification with a bounded 1 MiB stream buffer, measured three times per variant with identical hash/metadata checks. No improvement is claimed for model inference or the entire generation endpoint. The architecture-gate fix is a separately reproduced startup reliability repair.
