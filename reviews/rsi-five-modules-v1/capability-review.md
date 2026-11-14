# Independent capability and narration review

Reviewer: /root/speech_alignment  
Initial candidate reviewed: 2026-11-13 working tree with the capability authoring and silent/imported paths  
Scope: no-media planning, exact script review, silent and imported narration, edit invalidation and portable closure.

## Initial finding

**REVISE for portable author and preview lineage.**

On an isolated copy of a completed synthetic silent fixture, I changed only the creative brief audience and exported the previously rendered preview task. The CLI succeeded. The historical preview task `a9703dc13b84517228c5a73b68a98ce187009b645fdcc3d3ee34a9a480c25ba9` had an approved author snapshot `6da9066e173eb83ec11c860d9ff3c40f23b8bef7448d059e9f727cf5dfbb4818`. The new package instead bound `05410adc999f0719e445764584c0c6076b51f61d7c5946361c392bec56eb2c8f` as its author SHA-256 and carried no script review. The package advertised `approval:none`, so the reproduction concerns historical preview attribution. It did not create a new render or grant approval.

The same selection logic checked the local path's language but omitted the local voice profile. This would allow an unchanged local render to be associated with a different local voice brief. The imported branch does additionally check the exact imported voice label and receipt bindings.

A brief-bound final task should carry the exact author snapshot and approved script report binding. Export and import should verify the exact author hash for that selected preview. Historical outputs without such a binding require explicit handling. The status response should provide the verified saved script receipt on exact resume or indicate that a receipt is needed.

## Verified scope before the repair

- Reviewed capability storage isolation, phase tool requirements, the brief-bound author snapshot gate, recorded-WAV verification, silent output selection, edit invalidation and portability.
- Approved media requires the exact author hash before dispatch. Silent preflight and speech skip the default voice and media tools, while preview still requires the animation stack. Imported speech requires explicit rights, exact per-scene transcript, receipt, source WAV and label matches. Editing narration drops the affected receipt and preserves unrelated bindings.
- `pnpm exec vitest run tests/capabilities.test.ts tests/creative-brief-runtime.test.ts tests/narrative-run-recovery.test.ts tests/narrative-speech-checkpoint.test.ts tests/project-portable.test.ts` passed all **23 tests** in 5 files. I copied and re-exported the completed synthetic fixture without creating new narration or video. Actual speech identity, language delivery and perceptual quality remain pending.
