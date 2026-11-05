# Hidden Huihui candidate / architecture and facts review

- Role: independent architecture/content-facts; judges-v2 common rules; scope assigned by parent: source facts, modeled inference, audio/caption/version/history and dense-layout contract.
- Candidate SHA-256: a2377c4008888730898ec611b6d114660a5f8047f26e744cb5ea6c7d9b7c8390. Source commit b17ac9a67c1a5f5caa78faa9fb05b2194b9be7bd, base d0021a6.
- Date: 2026-11-04. Windows, independent output C:/Users/luyuh/Documents/Codex/gve-hidden-huihui-architecture-review.
- Verdict: FAIL, one major source-binding finding. No claim of media listening or full runtime verification.
- Independence: read original candidate, source diff and original exports; did not read peer reports. No shared source/evidence modified. Only own Python verification script executed; no target repository code, TTS, network, paid service or deployment.

## Finding ARCH-FACT-01 (major)

The exact rule citation selected for default behavior does not establish the default. In all three exported proposals, mechanisms[0].rules.default.citationIndex is 0. fd source-3 line 308 is only `ignore_hidden: !opts.hidden,`; ripgrep source-3 line 895 is only `.hidden(!self.hidden)`. Neither says how hidden defaults, that dot names define hidden, or documents the default behavior. The compiled trace retains only this selected citation under trace[0].rule.citation. src/presentation/hidden-file-policy.ts selects claim.citations[rule.citationIndex] and embeds that single citation; it does not embed the other claim citations as the rule's evidence.

Contract: explanation-author-packet.ts instructs linking EACH hidden-file rule to an exact documented citation in selected sourcePaths; the compiler says each policy requires a documented mechanism claim with an exact citation. The output's exact machine-readable rule anchor therefore fails to support the policy it justifies. This is an evidence-binding defect, not an assertion that the narrated default statement is false: the complete claim does include good supporting documentation elsewhere.

Reproduction by inspection: open each case export editable/proposal.json, inspect rules.default and claim default-rule citations[0], then editable/trace.json trace[0].rule.citation. fd normal and dense select config inversion; ripgrep selects builder inversion. Expected: chosen citation actually establishes the default rule. Suggested fix: fd default and include rules select source-2 lines 32-37 (currently citation index 2); ripgrep default selects source-2 lines 177-191 and include selects source-2 lines 196-198 (currently index 1). Verify these source paths are in the request. Keep other implementation citations as supplementary evidence. Regenerate the changed proposal hashes, plans, voice/session bindings and exports into a new frozen candidate; do not patch current artifacts. Recheck all three rule traces and affected historical/media closures.

## Independently verified evidence

Own check.py exited 0 with checks.json retained. Candidate hash matched requested hash. Source archive and frozen evidence index hashes/sizes matched; all indexed evidence files matched their declared sizes and SHA-256. This validates frozen bytes, not their authors' claims.

For fd (396 frames), ripgrep (405 frames), and fd dense (396 frames), independently verified all exact source quotations against exported raw source bytes and line ranges: 10, 6, and 10 citations respectively. Source SHA-256 matched each citation. No remote refetch performed. Source semantics: complete fd docs support default hidden exclusion, dot-prefix convention, --hidden, and continued independent ignore behavior. Complete ripgrep docs support default hidden exclusion and --hidden inclusion; its POSIX dot-prefix scenario remains an expressly scoped synthetic model. Inference claim model-descendants is labeled inference, with no target-execution claim. Notices and footer retain synthetic input, unchecked ignore rules and illustrative order.

Independently reconstructed each complete PCM by placing the two original decoded clip PCM files at ledger sample offsets into silence; bytes matched narration.pcm exactly. 48 kHz samples matched original 16 kHz WAV frame counts times three. Clip hashes, original audio hashes, exact narration/transcript text, beat containment and full timeline sample lengths matched. Root VTT matched voice VTT. fd clip counts 361680/373200; ripgrep 379200/373200; dense 361680/373200. These are clip-level technical checks, not speech-content/word-alignment validation.

Independently compared original historical frozen export directories with candidate historical re-exports, by full relative-path/hash maps: fd silent 27 files, ripgrep silent 26, fd unsupported 12, Fastify Huihui 53, p-queue Huihui 63; all byte-identical. No claim to have rerun their status/resume commands.

Code inspection: request/1.4 and author-packet/1.5 create a distinct new request identity; request/1.3 remains silent. narrated-render/1.1 accepts hidden plan; old /1.0 remains historical-only. The same mechanism capability 1.0 is retained while workflow versions and hiddenVoicePreparationTaskId marker separate voice eligibility. verifiedPlan checks that marker equals the actual voice-preparation parent. Worker props now carry both verified hidden layout and caption cues. hidden-file-narrated-layout/1 reserves a stricter content-height bound of 824 versus silent 860, with layout hash in preview input. Timing-check remains explicitly unsupported, as documented; this is not a word-level or state-alignment feature.

## Visual inspection

Viewed original fd/stress-phone-boundaries.png: four 360x640 frames showing before result, settled result, subtitle tail, and ending. Eight nodes, five result paths, wrapped long path, two-line heading and two-line subtitle fit without observed overlap or truncation; scope footer remains above progress bar and captions. This demonstrates the supplied dense case, not a proof over every accepted layout. No continuous viewing, real handset test, audio listening, or independent MP4 full-decode run in this role.

## Limits

No separate new stage contract/activation mapping was supplied; used assigned scope, AGENTS and explicit authoring/workflow contracts. Historical audio/continuous-AV deferral remains applicable and is not promoted to PASS. Tests logs are builder evidence, not this role's executions. New multi-cue caption boundaries are supported by inherited code but not exercised by the three single-clip-caption examples in this review. Pending semantic/editorial/speech/owner labels are retained. Source archive SHA verified but archive-to-live-source member equivalence was not independently compared. This report's FAIL is specifically the exact selected rule citation, and does not invalidate the independently verified checks above.
