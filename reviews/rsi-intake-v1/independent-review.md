# Independent review: RSI creative intake (2026-11-08)

Reviewer: separate session agent rsi_intake_review; did not modify implementation.
Scope: first creative requirements module, not whole RSI, video quality or media acceptance.

## Initial findings and verification

- Review performed on creative-brief.ts and integration diffs in narrative-run.ts, narrative-workspace.ts and explanation-cli.ts.
- Actual independent command: pnpm exec vitest run tests/creative-brief.test.ts tests/candidate-review.test.ts tests/narrative-complete.test.ts. Result: 3 files, 10 tests passed. Includes real brief-check CLI invocation and overwrite refusal. No media/network/paid API called.
- Candidate approval binding: adding/changing brief bytes changes authored input hash; old candidate review rejected. Duration uses complete-profile total including lead/gaps. Media gate checks unresolved preferences, unsupported voice/language and mismatched runtime selection before synthesis/render.
- feedback-apply and author-revision clone the original file map and remove only old speech artifacts, preserving creative-brief.json.
- Finding (initial): feedback-apply cannot accept --review, so with a brief it pauses for review and repeated feedback-apply cannot finish. Builder asked to document exact normal-run resume after revised-script review rather than bypass approval.
- Finding (initial, parent identified): project-portable author allowlist omitted creative-brief.json; exporting brief-present candidates would fail. Builder fixing.
- Needed clarification: decision is a global field; mixed user-specified and inferred preferences must stay proposed until the user confirms or delegates. Do not falsely label defaults user-specified.

## Limits

Legacy candidates without a brief still run under existing policy; this does not make all historical inputs compliant. Style/audience/platform are saved and hash-bound but require agent semantic review. Brief check does not test local voice availability. No-voice/custom reference/BYO API are represented as desired requirements but currently blocked by narrated adapter. zh-CN only. This review has not listened to or rendered a video, proven audience retention, or validated creative improvement. Initial tests exercise policy/hash/CLI, not a complete brief-present runtime; requested a bounded nonmedia integration check.

Final recheck pending builder fixes/docs.

## Final bounded recheck

Verdict: PASS for configuration schema/persistence, hash binding and documented runtime integration scope. Not an end-to-end rendering or creative quality PASS.

- Rechecked frozen source/docs after fixes. project-portable.ts AuthorNames now accepts creative-brief.json; schema acceptance test rejects foreign execute.js.
- docs/creative-brief-v1.md documents unsupported voice modes/language, non-authenticated declaration fields, global decision semantics and manual approved normal-run resume for feedback children. SKILL.md explicitly prohibits removing brief to bypass the review checkpoint.
- Final independent execution: pnpm exec vitest run tests/creative-brief.test.ts tests/candidate-review.test.ts tests/narrative-complete.test.ts: 3 files / 11 tests PASS. git diff --check PASS. No full regression or media generation.
- No unresolved blocking implementation finding in this bounded review. Complete brief-present run through persistence/planning/media refusal is still not exercised by an integration fixture. Portable acceptance is schema testing, not a real export/import round trip with this brief. These remain validation gaps and must not be reported as completed end-to-end proof.
- Style/audience/platform matching remains session/reviewer judgment, not automatic enforcement. Actual voice availability remains checked later by existing adapter.
