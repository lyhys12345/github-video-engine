# Independent technical media QA

Reviewer: /root/rsi_benchmark. Candidate: work/rsi-voice-media-v1/candidate-v2/review.mp4. SHA256 a9cd56c9c309b0f75f46c008032e139fa5537a0270bda414074871cc9918e40f. Technical scope PASS; perceptual audio and continuous viewing UNVERIFIED.

Actually executed independent FFprobe frame count and stream inspection: 720×1280, 30fps, 1410 video frames, exactly47.000s, H264/AAC. FFmpeg -v error -xerror mapped both audio/video to null, exit0 with empty error log. Candidate v1 and v2 movie hashes are identical; v2 strengthens input receipt binding, not media content.

Approved script SHA da6bb1a7af0aef52ac7c6a1128cec8563cce8bedd7b4dbd91f8931692d5a50c7 matches owner declaration. All five WAV file hashes match generation/import receipts; receipt text and manifest text equal exact approved narration. Independently decoded source PCM sample counts match manifests:9.52,7.44,7.44,9.84,5.28 seconds,39.52s total. This verifies declared text binding, not spoken transcription or naturalness.

Independently reconstructed all seven source segments using FFmpeg24kHz mono s16: two repository sample excerpts match declared ranges, all five narration recordings retained whole. Every sample equals the corresponding pre-AAC sequence slice, with zero-only frame padding0.103–0.127s per segment. Sequence hash7bc6b277153fa0bad231dbc57058e59a52ab48d2828afe1527038f95b988f9fc. No trim/time stretch of narration; ordinary16k→24k resampling. AAC is lossy and no byte-equality of decoded AAC is claimed.

Actual timeline: samples0–3.033 and3.033–6.867; intro6.867–16.5; structure16.5–24.067; model24.067–31.633; use31.633–41.6; close41.6–47. Full narration checks and timeline proof accompany report.

Independent silence measurement: FFmpeg silencedetect noise=-42dB,d=0.65. Candidate two windows9.324958–10.034917(0.709958s),20.542292–21.236458(0.694167s), both inside source narration, not assembly gaps. No automatic removal requested: low amplitude is not proof of unnatural silence. Accepted reference v2(56s) has one0.723833s hit20.1995–20.923333; v4(41.1s) has three0.650292/0.717208/0.668958s hits. Thus cannot claim overall pacing superiority from count alone.

No subjective listening, continuous AV, word-level alignment or aesthetic approval. Subtitle cues remain proportional estimates. Source evidence/production rights and sampled-image review are other roles. Candidate is a review preview, not published. Raw scripts/probes/logs retained work/rsi-voice-qa-v1; no media or voice references committed.
