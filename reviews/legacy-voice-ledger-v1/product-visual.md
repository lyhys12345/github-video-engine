# Independent product review — historical voice ledger compatibility

Candidate `candidate.json` SHA-256 `3338c5784333d1c9709ea8c3d41d973ebc75dc9518754a1c989ede1ff07c4411`. Independently verified all 446 listed lengths and hashes, zero mismatches. OPERATOR read; no other judge report used. Extracted exact engine and copied state into this adjacent review folder; candidate and target repository were not modified or executed.

## Scoped verdict

**PASS for the examined legacy status, retained original export and sampled sequence frames.** Overall correctness, speech content, identity, continuous viewing/listening, naturalness, actual user comprehension and owner acceptance remain UNVERIFIED. `integrity: verified` is an artifact/derivation verification result, not evidence that voice or spoken content has been accepted.

## Actual legacy CLI and field visibility

Independent actual default preview status for `19c33c266d4e6d4b70d7e8160123fa0d7ba5cc245589de098393940ca279fb6f` and status `--kind voice` for `11fd3a7e3b5bebf0543f1bcbe7754ffc1e33c253b26455264bb2a6c22969b36c` succeeded with `integrity: verified` and explicit `voiceLedgerProfile: voice-ledger-1.0-early-event-trace`. Completed preview resume returned the same profile and `cached: true`. The voice status exposed four original event objects with only `beatId`, `frame`, `sample`; it did not fill in later event fields such as event kind, claim IDs or relative-to-clip sample offset. Both status review blocks retain `transcriptVerification: caller-declared`, `speechContentReview: unverified`, `voiceSimilarityReview: unverified`, `ownerListening: pending`, and semantic/editorial/audiovisual review pending.

Actual independent default export of that original preview succeeded into `legacy-export`, receipt-v1, review pending. Exported original voice manifest SHA-256 `60cc3ea71227378ccb9c24601c851d2a403d8ac98c29b066659bae2d631c613b` retained the same three-field event shape; exported MP4 SHA-256 `a085206167bcce3564826ba9dadc88f5de125f4efbeebc8898180cc5854f8b86`. This demonstrates the tested original payload is preserved and does not create new historical metadata; it does not independently test all export payloads or reproduce the earlier writer.

**Minor transparency risk:** the returned profile name is a machine-oriented identifier and does not itself explain to a first-time user which historical fields are absent. Actual `sequence-status` for `cd149aa6ef5e06b02326f569f2e5797e3e29a2a90976a1f78be46445688ade77` reports verified and review pending but does not surface the legacy child profile in its summary. The child can be queried directly and its raw original manifest inspected. A short explanation or per-child profile in sequence status would make this compatibility distinction easier to discover; this observation is not a finding that absent fields were fabricated.

## Actual assembled media

Independently ffprobed and fully decoded the frozen assembled MP4: SHA-256 `38d03895592d40ae0384b68a704fa0cc3c5d9499ffc2a0536b5a04bc7f93ffbf`, H.264 720×1280 24 fps, 996 frames / 41.5 seconds, plus 48 kHz AAC; full ffmpeg null decode exit 0. AAC presence and decode do not prove audible, accurate or natural speech.

Independently extracted and individually viewed 360×640 frames 40, 479, 480, 497, 515, 516, 556, 557, 671, 672, 995 (`f-01.png`…`f-11.png`). The first child visibly labels the scene `Local voice • Illustration • No observed execution`. Frame 479 ends the response scene; 480–515 show `CASE 2 OF 2 / Separate example / Multi-cue timing`; 516 restarts the same Express example. Pairs 556/557 and 671/672 show direct subtitle changes. The card prevents the reset being silently presented as a continuous state. As in the prior mixed-caption review, `Separate example` does not explicitly say it is a replay of the same example; this is a minor wording risk for an audience-facing product, not a blocker for the stated compatibility fixture. Subtitle boxes are close to the bottom edge and actual phone/player overlays were not tested.

No continuous viewing or listening, speaker verification, independent historical producer replay, active interrupted recovery, exhaustive payload comparison, device/audience study or final owner approval was performed. The declared Zira technical voice must not be described as verified Chen or as naturally spoken based on these checks.
