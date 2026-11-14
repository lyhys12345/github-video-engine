# Product completion roadmap

The product is an agent-operated skill for GitHub owners to turn repository evidence into an engaging, editable short video. Completion means an unfamiliar owner can use the supported host, review an exact script/storyboard, produce supported media, request a revision and recover/export the project without relying on the original author's private workspace. It does not mean that every repository or every creative request works automatically.

This is an ordered implementation plan, not a statement that the following work is complete or permission to bypass a production review. Keep the existing durable runtime, CAS, schemas, pinned research, review receipts and showcase adapter. Reuse them rather than adding account systems, a web platform or distributed infrastructure.

## Current bounded improvement

Phone text/occlusion and narration-action audience audit: browser-derived editorial text geometry, sampled original candidate evidence, source-frame/cue checks and explicit speech-evidence limitations. See [audit workflow](showcase-audience-audit-v1.md) and [actual results](rsi-audience-audit-results-2026-11-13.md). Pixel-budget checking and guarded shot revisions already exist. Neither substitutes for actual viewer comprehension or listening.

## Ordered modules and acceptance

| Priority | User-facing capability | Existing foundation to reuse | Evidence required before calling it complete |
| --- | --- | --- | --- |
| P0 | Guided first-owner run | Doctor capabilities, creative brief, imported WAV/silent modes, two renderer paths, script approval | Fresh checkout with no ignored owner data, unknown URL, plain-language preferences and edit; Agent authors all JSON, chooses a supported path or reports missing evidence, stops at exact script approval, produces an approved technical fixture and portable editable output. Anna references must not be assumed present. |
| P0 | Evidence-backed demo selection | Pinned source capture, media declarations, artifact hashes, fact review | Inventory official visual candidates with source/time/hash and rights declaration; Agent selects a concrete demonstration and observed source-frame windows. Exercise two categories plus a held-out project; an inaccessible/missing demo remains needs-evidence. Source changes invalidate affected claims; target repository is not executed. |
| P0 | Reliable local speech observation | Existing optional speech-report/import contract, silence diagnostics and caption drafts | Add an optional available local recognizer adapter, test known zh/en recordings with omissions/repeats/pauses against independent timing annotations. Preserve original audio and provider confidence; distinguish recognition from forced alignment. Missing model fails clearly. Low confidence never becomes content/timing/naturalness approval. Model installation is a separate bounded setup action. |
| P1 | Consistent repair and restart navigation | Existing RSI repair chains, persisted ordinary/showcase jobs, CAS, guarded edits | One discoverable next/status path across supported flows. Interrupt after committed stages, resume in a fresh chat, recover moved/missing inputs with an explicit plan. Narration/new-media changes invalidate exact cues, shots and approvals; unchanged assets remain byte-identical. Corrupt cache produces a repair proposal and preserves accepted output. |
| P1 | Platform delivery variants | Existing covers/copy/subtitles/portable exports | Explicit configurable aspect ratios and safe areas; two real output geometries validated with actual fonts/frames, approved facts/audio preserved, required storyboard changes reviewed, portable relink succeeds. Platform layout assumptions are versioned, not universal or permanent guarantees. Export only, no automatic posting. |
| P1 | Real host acceptance kit | Shared canonical Skill, Codex/Claude entrypoints, static checks | The same plain-language task, revision and restart scenario in fresh supported Codex and an available authorized Claude session. Record host-specific actual results, imported/silent media and approval behavior. Static routing cannot substitute for a real Claude session. No account purchase or paid API activation is implied. |

Sequence: finish and validate the current audit, then first-owner integration and demo selection, then reliable observed speech, followed by unified repair and delivery/host coverage. Each module has its own fixed experiment, targeted tests, independent review, preserved failures and Git checkpoint. If a new formal video is needed, present the complete script/storyboard and obtain its approval first.

## Useful optional features after P0

- User-selectable reference/brand profiles: palette, typography, pacing and reference observations with provenance; keep choice optional and permit different stories/shot orders. See [the original deferred requirements](future-todos.md).
- A review packet that makes exact script, phone frames, playable clips, missing evidence and requested decisions easy to inspect together. Reuse the current local artifact packet before proposing a web UI.
- Publishing experiment kit: export two approved hooks and allow import of owner-supplied watch-time/completion/click/star observations. Compare actual results; Judge preference is not measured platform retention. No automatic messaging or posting.
- Storage inspection: show artifact reachability, sizes and damaged-input diagnosis. Cleanup remains separately authorized, dry-run first and protective of accepted media/reviews; it is not needed to prove creative quality.

## Release decisions and honest support boundaries

The original-code distribution license remains an owner decision. Private Anna/Chen references and local profiles are not bundled or redistributed. A first-time user must select an available voice they can use, supply an authorized recording/reference, or explicitly choose silence; do not silently substitute another voice.

Capabilities must be labeled separately as implemented, locally exercised, independently reviewed, or unverified for a host/platform. Current Windows results cannot certify macOS/Linux or an untested Claude session. Keep one current support/capability index and preserve historical reports as history.

A releasable supported path requires: no owner-only hidden assets, truthful source/asset provenance, deterministic job recovery, exact review gates, understandable failure recovery, original audio and editable project preservation, a real independent viewing record for representative approved material, and a usable cross-machine handoff. Final owner approval and actual audience response remain separate.
