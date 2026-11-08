# voice source re-review v2

Packet: work/rsi-source-facts-v1/voice-packet-v3
Candidate: 15d3585c2be2a1f2945c186c9b5d43fdb0aeaf9b9305d09afbd4bc73b29de73b
Packet hash: 277f263e8be9ebdbda9fe58b6c401aa9cdfb33e5474121c7e72092309a2ba9a7
Overall: REVISE remaining sample role caption
All raw source hashes independently matched worksheet index. Prior claims rechecked against unchanged source hashes; added raw sources and full revised candidates inspected.

- claim:local: supported. README 9-11 and 85-87 document on-device operation and locally downloadable models.
- claim:default: supported. README 108 explicitly states default VoiceStudio is powered by k2-fsa/OmniVoice.
- claim:inputs: supported. Model 284-345 accepts text, ref_audio, ref_text and calls generate. Optional reference transcription is also present, so script is valid as one path, not a universal requirement.
- claim:clone: supported. README 68-70 documents familiar-voice speech from reference recording.
- claim:sample-files: supported. Pinned samples directory raw JSON lists demo_voice.wav and demo_clone_output.wav with exact paths and git blob identities. Existence and filenames supported; contents, pair relationship and roles not established by listing.
- complete-script: unverified. Narration 仓库里的声音样例 now supported by pinned sample listing and future-use plan. Remaining storyboard 原声样例 label infers a source/role from demo_voice.wav; filename alone does not establish original/natural/reference status. Replace both captions with exact repository filenames or neutral 仓库样例, or provide role evidence. Other narration and planned mechanisms remain supported.
- creative-brief: supported. Chinese ordinary-viewer source-first script brief is clear. Max duration is a target; local voice profile is a production choice, not evidence of performed narration.

No source code executed, media created or sound heard. PASS is source support, not production or whole-film approval. Old raw findings remain immutable.
