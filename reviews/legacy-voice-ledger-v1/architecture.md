# Independent review: historical voice-ledger reader

Candidate SHA-256: `3338c5784333d1c9709ea8c3d41d973ebc75dc9518754a1c989ede1ff07c4411`.

**PASS for architecture, evidence and content facts within the narrowly scoped historical-reader contract.** No blocker/major reproduced. This adds verified historical read compatibility; it does not recreate the old producer, migrate or rewrite the original ledger, authenticate a speaker, transcribe speech, or approve audiovisual quality.

## Frozen identity and review method

Read OPERATOR and the narration/sequence contracts before judging implementation and actual retained data. Builder success claims were not used as proof; no builder verifier script or another judge report was read. The equivalence receipt was itself a requested artifact to verify, not accepted as a verdict. Ran independent scripts against extracted engine source and copied state in this judge directory. No Express target code, synthesis, paid service or deployment ran.

`identity.mjs` / `identity.json`: candidate SHA and all **446** listed file hashes/lengths match. All **568** source files match base Git commit `b6e204970e54e7a881972fcbf1285d273b2896cd` except exactly the declared changes to `docs/presentation-narration-v1.md`, `src/presentation/cli.ts`, and `src/presentation/runtime.ts`. Declared base and changed hashes were checked independently. The source ZIP hash is included in the verified inventory. Candidate source and artifacts were not changed.

This judge's earlier Express report remains intact: that candidate did reject the earlier task. This new candidate is the versioned fix under review, not a reinterpretation of the earlier failure.

## Profile selection and exact validation

The alternate historical projection requires all of:

- the read-only historical verification path;
- recorded implementation fingerprint `5fcc6b1dde72b2ce7dd45894b11d547503e20988fbf219d9f6c7b4117c41ff2c`;
- `presentation-voice-bindings/1.0`;
- a full canonical ledger regenerated from the verified plan and retained voice closure, with each event projected to exactly beatId/frame/sample, equal byte-for-byte to the retained ledger.

Current-form validation continues unchanged. The historical alternative is computed deterministically; it does not catch and downgrade arbitrary integrity exceptions. Receipt, source, parent, task identity, artifact closure, PCM, binding JSON and subtitle derivation checks occur normally. Only the exact alternate ledger comparison is admitted. Returning `files` now preserves retained artifact bytes after verification; the returned historical ledger has the original three-field event shape. The profile appears separately in completed status/CLI/resume, not inserted into immutable manifests.

`checks.mts` and `supplement.mts` independently tested the profile against **hash-consistent separate fixture tasks**, created through the engine's TaskRunner without disabling successful-task immutability. Unknown producer fingerprint, a hybrid extra event field, wrong sample value, missing sample, missing event, reordered events and wrong parent manifest all reject. A separate real voice-1.1-derived fixture retains correct other payloads but supplies the early three-field event projection; it rejects specifically at `voice-manifest.json`. Thus a damaged hash alone is not the reason these profile cases fail.

New narrated render with the historical voice and resume of a separately created incomplete historical render both fail `PRESENTATION_INTEGRITY: Voice derivation differs: voice-manifest.json` before media-tool dispatch. The profile is for successful historical reads, not a historical writer/replay mode.

The recorded fingerprint is a format discriminator inside the verified task identity, not proof that the unavailable old producer source was authenticated or rerun. OPERATOR accurately preserves that limit. No missing kind/claimIds/relativeToClipStartSamples fields are invented in the old ledger.

## Historical bytes and equivalent revision

Original preview `19c33c266d4e6d4b70d7e8160123fa0d7ba5cc245589de098393940ca279fb6f` and voice `11fd3a7e3b5bebf0543f1bcbe7754ffc1e33c253b26455264bb2a6c22969b36c` now pass complete offline read verification. Original ledger SHA remains `60cc3ea71227378ccb9c24601c851d2a403d8ac98c29b066659bae2d631c613b`; original preview manifest SHA remains `a594a7c1c0a83c54d419d1a11c28d90977438a117e4a56fdeb7967521940bec2`.

With both FFmpeg and FFprobe paths disabled, independently checked voice/preview status, actual CLI status, completed preview resume, export and repeat export. The profile is `voice-ledger-1.0-early-event-trace`. All **51** exported files match the checked original bytes. The entire copied **317-file state tree hash map** is identical before and after these positive read/export operations. Later adversarial fixtures were added separately; the original successful task record still compares equal after all testing. Temporary corruption was restored.

Independently recomputed every entry of `work/evidence/equivalence-receipt.json` using current verified original and later `cc06313b6aba522f69c4631cf5ab7e17e4be5e5e0a61703723df2c17638b56da` exports. Of 51 payloads, **49 are byte-identical**; exactly `preview-manifest.json` and `voice/voice-manifest.json` differ. The movie hash for both remains `a085206167bcce3564826ba9dadc88f5de125f4efbeebc8898180cc5854f8b86`. Receipt authority is `technical-bytes-only`, and listening/speech accuracy remain pending/unverified. This is a separate frozen comparison artifact, not a modification to either historical task and not proof of producer or spoken-word equivalence beyond the actual matching bytes.

## New sequence and actual media

New task `cd149aa6ef5e06b02326f569f2e5797e3e29a2a90976a1f78be46445688ade77` references the original historical preview and the real multi-caption child. Independently checked that the first scene binds original preview manifest `a594a7…`, and export retains original ledger `60cc3e…`. Substituting the later revision's manifest while retaining the original child ID rejects with `PRESENTATION_SEQUENCE_MANIFEST`.

`media.mjs` / `media.json`, `aac-trace.mjs` / `aac-trace.json` were executed afresh on the supplied new movie:

- Movie SHA `38d03895592d40ae0384b68a704fa0cc3c5d9499ffc2a0536b5a04bc7f93ffbf`, **996 frames / 41.5 seconds**. Full two-stream decode and all video PTS pass. Audio/video both start at zero with time base 1/48000 and declared duration 1,992,000 ticks.
- Independently decoded eight original recording instances (four distinct reused recordings), checked receipt/audio/text hashes and proposal narration, and reconstructed all child clips, complete child mixes and the combined **3,984,000-byte PCM**. Byte-exact SHA `51bd90585cfda335da9abfca79115707c15e0eef484f143a797adddcf82597ac`.
- Chapter card `[480,516)` frames equals samples `[960000,1032000)` and contains 72,000 zero samples in PCM and this fixture's AAC decode.
- Independently re-encoded the full PCM to AAC and compared the entire ADTS stream with extracted movie audio: **308,252 bytes exactly equal**, SHA `7204ec8f8051af5c61e794580a5ccb57f075e221b0ffac257ce2f6619958e01a`. Raw AAC decode exposes 704 samples of packet padding beyond declared duration; reference samples are not truncated.
- All twelve global cues and exact VTT match source text/sample/frame offsets: four legacy measured clip-level cues and eight caller-declared multi-caption cues. The retained historical event projection is not substituted for the narration/caption data. No speech/transcript alignment is inferred from these checks.

## Source facts and corruption boundary

The source binding remains Express commit `43fca52d28a422c8be48fd489cbd4f2d6152bab6`, snapshot `4f3d291c9f759f66dad3dd91964ff51fef5923b0069c13dd0cb185a1362d9ce8`, evidence fingerprint `94a066cb6a155615a652b7cd10fa950abd811a0bc2c14f40fdb4ffc497706a58`. Source README hash and all exact quote ranges were rechecked by the independent media script. The prior manually inspected README claims—listen on port 3000, GET `/`, registered handler sends `Hello World`—are unchanged and supported. Authored event timings are illustration time, not observed server execution. Both voices remain Zira technical fixtures with caller-declared text. Current review status retains pending semantic, editorial and owner judgments; this change makes no automatic-creation claim.

Additional copied-state corruption of ledger, whole mixed PCM, individual clip PCM and original recording receipt causes both historical preview status and dependent sequence status to reject. All originals were restored and verified afterward. The original ledger's missing later annotations cannot be used to bypass any of those checks.

Four retained sequence tasks were also verified offline with the candidate reader: one each of silent sequence 1.0/1.1/1.2 and the prior real p-limit narrated 1.3 task (`history-regression.json`). This was an actual status/full-closure regression, not a new render/export of those four tasks.

## Validation accounting and limits

- Current no-emit TypeScript check passed; **54** affected presentation/concurrency/TTS tests passed.
- Independent positive/offline/export/receipt tests plus **20 negative executions** are recorded in `checks.json` and `supplement.json`. The first judge harness attempt used readTask's default planning kind accidentally; it was corrected to the explicit non-planning mode. This was a judge script issue, not a candidate failure; final checks ran successfully.
- No old producer source replay, fresh sequence render/cancel race, full default test suite, memory/low-disk stress, target project execution, speech transcription, speaker authentication, subjective listening or continuous device playback was performed. No owner AV pass is implied.
- Existing historical task failures and the prior Express review are not overwritten. This report documents acceptance only under this newly verified profile. Unknown historical formats remain unsupported.

All raw scripts/results are adjacent to this report. The frozen candidate remains unchanged.
