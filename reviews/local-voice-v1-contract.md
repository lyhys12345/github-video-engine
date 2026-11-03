# Local Chen reference voice — bounded experiment

Authority: on 2026-11-02 the user accepted a local voice and explicitly requested an approximation of Chen, stating ElevenLabs had agreed. This permission is recorded as a user declaration, not independently verified provider correspondence. It authorizes a local reference-conditioned short audio experiment; it does not authorize paid APIs, key creation, deployment, full-film production or extraction of a proprietary model.

The implementation uses an open Base TTS model with a local reference profile. It is not fine-tuning and does not acquire ElevenLabs' original model. Prior caption-timing candidates and uncommitted work are preserved.

## Criteria

- L1: Use only the hash-verified recovered recordings under the user's declaration. Record the selected reference and exact declared transcript; if cropping, bind exact crop times and matching crop text. Do not label submitted text as independently transcribed. No silent voice/model substitution.
- L2: Pin Python/runtime/dependency versions and model repository revision. Record local model file sizes/hashes, safetensors LFS checks and runtime lock identity. No model-supplied Python/pickle/remote custom code. Code and locks may enter Git; model weights, references, profiles and generated media stay local under ignored work/.
- L3: Download preparation and inference are separate. Inference accepts only complete hash-verified local model/reference paths. Disable model downloads and telemetry; execute generation in a macOS deny-network child sandbox. Retain an actual OS network-denial check separately from Python/offline environment settings. Missing isolation fails closed.
- L4: Provide an independently callable bounded script and preflight. Accept a UTF-8 text file and explicit profile, create a new output directory, reject reuse and invalid inputs, bound text/tokens/process time, and do not retry or change model automatically. Failure retains diagnostic evidence without a successful receipt.
- L5: Bind receipt to exact script/profile/reference/model/runtime-lock hashes, text, seed and all effective sampling parameters. Record requested versus library-adjusted parameters; notably installed Qwen3 ICL enforces repetition_penalty at least 1.5 even when 1.05 is requested. A seed is not a cross-platform byte-determinism guarantee.
- L6: Produce one real short local audio sample, verify nonempty finite audio-only output, duration/sample format and complete FFmpeg decoding. Preserve timing, command, exit and actual input/output hashes. No test double or technical decode is a listening result.
- L7: Record method=reference-conditioning, finetuned=false, modelExtracted=false, originalElevenLabsModelObtained=false, remoteProviderCalls=0 and providerChargeUsd=0. Do not call local hardware/electricity/download cost measured zero. New generated audio is not historical ElevenLabs output.
- L8: Chen similarity, naturalness, pronunciation, transcript accuracy and user acceptance remain UNVERIFIED/pending without actual listening evidence. No reviewed subtitle timing is fabricated. Existing owner AV deferral permits conditional engineering work but not all-role or final human PASS.
- L9: At minimum validate hash mismatch, missing model, existing output, failure/no-success receipt, actual OS network denial, and actual sample decoding/bindings. Preserve original failures and freeze code/contract/inputs/evidence before independent review. Fixes create new candidates and affected-role regression.

## Active independent roles (recorded before review)

Product: L1, L4, L7–L8. Reliability: L2–L6, L9. Evidence: L1–L9. Video quality: L1, L6, L8 (actual voice similarity/listening). Security: L1–L4, L7, L9 (new local runtime, supply chain and reference privacy). No project factual narration is changed; content_facts is not triggered by neutral test text. Astra designs and independent reviews, Sol implements; Terra PNG review is not claimed for an audio-only experiment.

All active roles must pass mandatory evidence before overall release. Missing actual listening is UNVERIFIED and cannot be waived by technical tests or another role's PASS. No aggregate all-role PASS or owner/G6 acceptance may be inferred from a runnable sample.
