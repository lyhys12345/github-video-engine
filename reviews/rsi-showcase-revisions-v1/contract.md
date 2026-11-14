# RSI showcase revision cycle: fixed contract

Baseline source: fce903271f55d8595d426030eb2e2576dace5646. The owner authorized autonomous RSI continuation. This cycle changes the trusted engine and Skill, not a production video's approved creative content. No paid API, source-repository execution, deployment, or new unapproved production video.

Hypothesis: a complete, immutable feedback-to-review-to-approved-candidate path makes the cinematic renderer practically editable without discarding cache or weakening exact approvals. Current narrative feedback does not cover showcase. Stronger ASR is deferred to a separate cycle; its existing low-confidence findings remain.

Scope: verified completed showcase baseline; session-agent-authored explicit feedback plan; read-only impact; immutable unapproved draft and human-readable script/storyboard; exact fresh script review and owner authorization; finalized approved source usable through normal resume/render/export. Preserve exact narration text/audio/receipts, source capture, font, media inventory, beat order and beat durations. Edits may change supported shot/panel/crop/overlay/action/caption treatment and global theme/layout/cinematic settings. Unsupported text/voice/assets/duration edits fail explicitly. The engine makes no model call; the session agent interprets the user's language.

## Mandatory acceptance

1. Context/impact/prepare work through public CLI with browser, FFmpeg and voice paths unavailable. Context comes from integrity-checked source/render artifacts, not mutable original author paths.
2. Guard render/source/candidate/normalized-manifest hashes and explicit shot selectors (beat ID, shot index, expected canonical hash). Original raw manifest hash is named separately. Reject stale/unknown/duplicate edits, unsupported assets/text/duration fields, invalid cue/action intervals, tampered artifact bytes and irrelevant CLI arguments.
3. Draft contains no active old or fabricated approval and cannot render. Drafting preserves baseline state, artifacts, pointer and reviews. It includes the exact revised script/storyboard and readable review document. Edits to labels remain factual claims requiring review.
4. Fresh script bytes bind the new storyboard. Old owner/reviewer receipts fail, even for visual-only edits. Finalization requires exact owner authorization and independent script review, verifies closed draft files, and returns an approved source checkpoint/manifest usable by existing render commands. Review identity is a local declaration, not authentication.
5. Repeating an exact operation is idempotent, changing its input/output bytes is rejected, partial staging is not success, and unrelated workspace advancement is not silently overwritten. Finalization creates no movie or advanced playback pointer.
6. Impact is calculated using actual saved audio timing and exact shot dependencies. It labels cache eligibility under the saved environment, not guaranteed execution reuse. A global style change may affect every shot.
7. Real short synthetic two-shot test: visually change one shot, keep original narration/PCM, reuse unaffected shot, independently inspect changed and unchanged frame content, full-decode MP4, and export/import revised candidate. TEST_ONLY approvals stay explicit. No creative retention/naturalness claim from this fixture.
8. Real historical approved manifests still validate read-only. Targeted existing approval/showcase/CLI tests and typechecking pass. No full regression unless a new failure requires it.

## Roles and evidence

- Architect/final code reviewer: /root/rsi_revision_architect (Astra). Independent; no candidate edits during review.
- Implementer: /root/rsi_revision_builder (Sol 6.1).
- Root: orchestration, acceptance inventory, integration/CLI/Skill consistency, original evidence and release/handoff.
- Frame reviewer: Terra, activated after frozen synthetic frame artifacts are available. It sees actual anonymous frames; sampled images are not continuous viewing/listening.

Preserve each finding and recheck. Do not replace a failing reviewer or rewrite earlier reports. Fixes create a new frozen code candidate. All active scoped criteria must pass or remain explicitly UNVERIFIED. End this bounded engineering cycle after verified implementation and save/push/update handoff; later production changes require their own approved script/storyboard.
