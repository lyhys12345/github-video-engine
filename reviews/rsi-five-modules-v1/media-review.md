# Independent scoped review of multimodal RSI

Reviewer: /root/speech_alignment  
Candidate: module 4 working tree after the accepted-review binding repair, checked on 2026-11-13  
Scope: media package closure, exact review binding, comparison coverage, and the existing bounded repair chain.

## Verdict

**PASS for the scoped engineering checks. Perceptual comparison remains UNVERIFIED.**

- Read `src/workflow/rsi-media.ts` and the existing experiment and repair code. The reviewer receives A/B manifests and material under generic names. The operator retains role mapping. The verifier recomputes packet and asset digests, requires expected media roles, and checks that each claimed modality has declared complete exact-artifact observations for both labels.
- Static review of the initial implementation found that it searched for any raw file whose abstract report matched the repair chain. A substituted observation list could therefore present the same abstract decision with a new filename digest. The repair writes a single accepted raw digest tied to the chain record and abstract report, rejects competing raw submissions before writing them, and verifies the original raw on status reads. An independently assembled fixture altered only accepted observation notes and moved the raw file to its new digest name. The fixed implementation rejected the substitution. No pre-fix red test was run. The receipt and chain are ordinary trusted local metadata. This check does not authenticate the reviewer or defend against someone rewriting the acceptance receipt together with its files.
- `pnpm exec vitest run tests/rsi-media.test.ts tests/rsi-repair.test.ts tests/rsi-experiment.test.ts` passed all **9 tests** in 3 files. These cover changed media, omitted coverage, a bare legacy report, reviewer continuity, the three-attempt limit, and exact raw review conflicts. Synthetic assets exercise contracts only.
- `pnpm gve rsi-media summary --spec work/rsi-five-modules/media-real/roots.json` reverified the VoiceStudio and WorldKnow calibration chains and the video-engine holdout chain. All three are attempt-one controls, with **3 pending**, **0 improved**, and **0 regressions**. The inputs establish the requested category/split structure. I did not view frames, listen to narration, or continuously review any MP4 in this scope.
