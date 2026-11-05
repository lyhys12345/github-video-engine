# Narrative audio C2 — independent architecture/source-facts Judge

- Candidate: narrative-audio-c2-caption-safe, commit c8a0c814535eaa33e24c3546719cb4709b6ad2ae.
- Candidate SHA256: de9393b86b79f7c1239b2a0c30f02b4c637edb9817824a5a4437dc8d9c8b7b8f.
- Renderer codeHash: 199deca36162642ee9a70d46ab83174be792903b883036a105efd8fda4bbb359.
- Role: architecture and source-facts binding; active for versioned captions, exact execution/review identity, historical compatibility and source attribution.
- Date/environment: 2026-11-05, Windows, local Python and FFmpeg. Independent output: C:/Users/luyuh/Documents/Codex/gve-narrative-audio-architecture-judge.
- Verdict: PASS within this bounded scope. No blocking architecture/source-binding defect found. Natural listening, speech truth/alignment, continuous perceptual AV and owner approval remain pending/unverified.
- Independence: read AGENTS/common, candidate and OPERATOR contract, frozen implementation and raw evidence. Builder messages were received as context, not treated as proof; no other current Judge vote was used. Candidate was not modified; no target repository code executed.

## Findings and evidence

| Requirement | Result | Method and evidence | Limit |
| --- | --- | --- | --- |
| Immutable candidate | PASS | Independently checked candidate/source/material/archive hashes, every 741 source and 1434 material file, and exact ZIP membership/bytes; check-c2.py and c2-independent-check.json | No source mutation |
| Real burned-caption timeline | PASS | Independently FFmpeg-decoded caption region of all four final 420-frame movies, 1680 actual frames total; bright-pixel presence matched every bound half-open cue interval with zero mismatches | Presence/timing test, not OCR or listening |
| Movie/execution identity | PASS | Four actual movie hashes match exported manifests; each embedded input codeHash matches frozen candidate; all currentReview pending and approval none | Did not independently rerun the complete renderer |
| Clock regression evidence | PASS | Independently decoded retained draft Express media: frame60 has zero bright caption pixels; frame120 has321. New final frame60 matches the cue. c2-compat-clock-check.json | Draft deliberately remains failed evidence |
| C1 compatibility | PASS by impact analysis | Old narrative-audio.ts is byte-identical to C1; separate kind/profile/CLI for1.1. Optional caption-safe source layout leaves old default unchanged | C1 live status not independently rerun this round |
| Historical versus current review | PASS | New layout/font/lines/cues and global clock policy are bound in execution packet; current media SHA included; all current review statuses remain pending | No inherited current approval |

The actual implementation uses a pinned font copied into the owned runtime, complete source scaling576x1024 at(72,96), and reserved bottom1120..1280. Text is written into owned textfiles with expansion disabled. Drawtext uses gte(n,start)*lt(n,end), and -reinit_filter0 prevents n resetting on input parameter changes. Final output requires video+audio only; the HTML has no default subtitle track. External VTT remains editable data. The new task identity includes environment and executionHash; status/export reconstruct commitments and compare artifact closure and packet hash.

The original60-frame clock failure has not been hidden or converted to success. Its media and exact source overlays are preserved. Our actual-frame comparison demonstrates the final cue timing behavior across that boundary rather than relying solely on the proposed flag.

## Source-facts and preserved limits

C2 is a rendering-layout revision of the short source-bound Express/rembg Chinese narrative slice examined in C1. The exact local recordings, current narration matching, full-recording/no-stretch/no-truncation placement and historical English receipt separation remain in the implementation. Source documents are pinned illustrative evidence, not executed target repositories or measured rembg image results. Unsupported gaps are still explicit and unproduced. The existing C1 report provides the independently checked full PCM reconstruction/source-quote checks; this round did not repeat all PCM decoding or source quote validation and does not describe that historical work as a new C2 test.

Reviewed C2 raw verification records additionally retain complete-recording PCM, silence, source-region correspondence, relocation and edit checks. Those are builder evidence, separately attributed; our independent additions are freeze checks, actual1680-frame decoding, media/codeHash checks and old-module/failed-draft verification. No full test-suite rerun was performed by this Judge for C2; candidate's483-test claim is not counted as independent test execution.

## Non-blocking hardening note

captionSafeLines accepts broad Unicode Han/Latin/number/punctuation categories and wraps by22 code points. This is sufficient for the four examined short captions, but it is not a font-cmap coverage or measured glyph-width proof for every accepted Unicode character. A future general international-text claim should validate actual glyph coverage/metrics or narrow its repertoire, and test unsupported glyphs explicitly. No missing glyph was established in the current examples; this is a bounded follow-up, not a fabricated current failure.

## Acceptance limits

The engine-burned layout fixes the architectural dependency on subtitle-player positioning. This report does not certify arbitrary third-party player behavior, natural pronunciation, word alignment, all-frame visual aesthetics or final human acceptance. Current facts review remains pending, speechContent and speechAlignment unverified, approval none. Original C1 conclusions remain preserved. No user decision is needed to complete this bounded engineering review.
