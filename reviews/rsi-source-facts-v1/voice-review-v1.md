# voice source review v1

Overall: REVISE / incomplete full-script source coverage. Enumerated claims supported; complete-script contains unverified assertions.
Candidate binding: 51b16198add6212ba57a59cb4804a0ecf04df42dfce00002a46b0672d216850e
Packet binding: e82af391bd45605c9960a58e23a890b793c93c6b63935116ebc32c2b43478eb4

Raw source SHA-256 values were independently checked against packet source index and match. Candidate raw bytes hash is distinct from semantic candidateHash; receipt uses supplied semantic binding. Complete candidate and relevant raw source context inspected. No network lookup, media generation or listening performed.

- claim:local: supported. README 9-11 and 85-87 document on-device operation and locally downloadable models.
- claim:default: supported. README 108 explicitly states default VoiceStudio is powered by k2-fsa/OmniVoice.
- claim:inputs: supported. Model 284-345 accepts text, ref_audio, ref_text and calls generate. Optional reference transcription is also present, so script is valid as one path, not a universal requirement.
- claim:clone: supported. README 68-70 documents familiar-voice speech from reference recording.
- complete-script: unverified. UNVERIFIED opening attribution: supplied README establishes app tour and bundled demo voice but does not identify a specific original/clone audio pair or the assets intended for reuse. Supply exact pair provenance/labels or remove attribution from reviewed script. Multi-engine UI, local operation, default engine and generation path are documented. Game example is explicitly hypothetical, and comment links are future actions. No sample-model identity or fidelity inferred.
- creative-brief: supported. Chinese ordinary-viewer source-first script brief is clear. Max duration is a target; local voice profile is a production choice, not evidence of performed narration.

Source-text support only at frozen commit; no runtime, historical primary-source, rendered-media, listening, owner or publication approval.
Re-review must use a new frozen packet if candidate or evidence changes. These findings do not declare the unsupported additions false; they require evidence or narrower wording.
