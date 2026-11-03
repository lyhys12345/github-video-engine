# Local Chen reference voice — saved local pilot

2026-11-02. The user authorized a local approximation of Chen, stated ElevenLabs had agreed, and listened to the first actual preview, responding **“比较接近，可继续使用”**. Provider agreement is recorded as a user declaration, not independently inspected correspondence. The response supports this voice pilot; it is not film/G6 acceptance or independent Judge listening.

The implemented capability uses local **Qwen3-TTS 1.7B Base 8-bit reference conditioning**, with the recovered rembg recording as its reference. It is not fine-tuning, proprietary model extraction, or a downloaded ElevenLabs Chen model. New text is synthesized locally; this entry has no ElevenLabs generation call or per-call provider charge. Hardware/electricity costs were not measured or represented as zero.

## Actual result

- New Chinese test text produced a **10.96-second, 24 kHz mono PCM16 WAV**, with 137 audio tokens. FFprobe and complete FFmpeg decoding passed.
- The first run took 53.19 seconds. The repaired entry's same-input run took 28.42 seconds on this 16 GB Apple Silicon machine. These are two observations, not a performance guarantee.
- The two WAV files are byte-identical: SHA-256 `5b14969365a4ee0cd0f011812a32df61fe726733d5556d702c5300c4866a994c`. The limited owner pilot preference therefore refers to the same audio bytes now delivered.
- Both real inference runs used an OS deny-network child sandbox. The internal worker entry was subsequently hardened to verify current-process OS network denial before Python audit hooks, reference access or model imports. Unisolated direct worker invocation now fails closed.
- The 3,104,157,269-byte model is pinned to revision `e7dd0585652209fa0d7783659aad4e8a324de11c`; all 13 model files were rehashed. Python 3.12.14, mlx-audio 0.6.4 and 38 package versions are fixed, with hash-locked installation requirements. RECORD checks bind installation metadata, not every installed package byte.

Local files:

- Audio: `work/local-voice-v1/generated-sample-candidate-2/audio.wav`; receipt, probes, worker stdout/stderr and complete-decode result are beside it.
- Reusable voice profile: `work/local-voice-v1/chen-profile.json`; full decoded reference: `chen-reference-rembg.wav`. The declared full transcript matches the checked-in generation receipt; it is not independently transcribed.
- Model: `work/local-voice-v1/models/qwen3-tts-1.7b-base-8bit/`; isolated runtime: `work/local-voice-v1/venv/`.
- [Preparation and reuse instructions](../docs/local-voice-v1.md): explicit model download, fixed dependency installation, local runtime-lock creation, preflight and bounded generation. No automatic download, retry or model substitution during inference.

Code, dependency/model locks, tests and these records are suitable for the local Git commit. Weights, references, profiles and generated media remain under ignored work/, not in ordinary Git. A new computer must download the public pinned weights and separately receive the authorized reference/profile; downloading the public weights does not incur an ElevenLabs generation charge.

## Frozen review

Final frozen candidate 3 manifest SHA-256: `04522a3a168f7cce63a50daa9b8680fe34d5ac3b9ec4b5e449062fa3f8b8046c`. It contains 23 source/document/lock files and 35 evidence files. Candidate 1 and its sample were retained after the builder found the hidden-worker isolation gap; candidate 2 fixed it. Candidate 3 only added an initially omitted preparation-test file to the frozen closure. Its generation source, model, runtime, reference, text and audio did not change; the real candidate-2 sample is explicitly reused rather than relabeled as a new run.

The frozen source passed **18 focused Python tests**, including real isolated/unisolated worker contrast, bad inputs, hash/model rejection and output preservation. Original default-sandbox preflight failure, successful permitted sandbox runs, prototype media and logs remain local. One test invocation was not launched because automatic approval review timed out; the permitted single retry completed the final frozen suite. No unsafe-action rejection was inferred from that timeout. Existing caption implementation and its six pending changes were preserved; the unrelated full JS suite was not rerun for these standalone Python scripts.

| Independent role | Verdict | Boundary |
| --- | --- | --- |
| Product | PASS | Preflight, bad input, output reuse, preparation and local-pilot usability |
| Reliability | PASS | Fault states, real timeout/process cleanup, bindings and preserved outputs |
| Evidence | PASS | Frozen files, model/runtime identity, original-to-reference PCM and actual sample chain |
| Security | PASS | Bounded local experiment: fixed data-only model, direct-worker denial and real OS isolation |
| Video quality | UNVERIFIED | No independent perceptual listening; owner pilot preference is retained separately |

**Overall remains UNVERIFIED, with no all-active-role or audiovisual release.** J4-C3-01 is a major missing-listening evidence gap, not a demonstrated quality defect. Similarity, naturalness, pronunciation and exact spoken-text accuracy are not independently verified. Owner film/G6 acceptance remains pending. The existing conditional engineering authority is not revoked by this limitation.

Original independent reports, scripts and logs are at `work/local-voice-v1/judges/candidate-3/<role>/`. [The machine-readable result](local-voice-v1-candidate-3.json) binds their hashes. No peer votes were used to waive J4, and no historical UNVERIFIED report was rewritten.

No paid generation API, API-key creation, upload of reference audio, full-film production, deployment, publication or research-target repository/model execution occurred. The new local TTS runtime/model execution was explicitly authorized by the user. Future new text should still be heard for correctness; the current 256-token entry is a short-sample tool, not a completed long-narration workflow.
