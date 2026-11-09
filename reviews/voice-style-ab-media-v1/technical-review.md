# Independent technical A/B media QA

Reviewer: /root/rsi_benchmark. Final review movies are work/voice-style-ab-v1/{A,B}/candidate-v1/review.mp4. Technical scope PASS for both; subjective listening, continuous AV and owner preference remain UNVERIFIED.

A: SHA256 b04a90046eab212f2f761252227ea50a1b1e8b86fda5e3393ac476cba05ed3fa,44.933333s,1348frames. B: SHA2561fdebd2b2760bd14bae167b367fe3d180248893062eb61cb11ea3dfaf47e6658,46.933s,1408frames. Independent FFprobe -count_frames: both720×1280/30fps H264/AAC. Independent FFmpeg -v error -xerror maps both streams to null: both exit0 with empty errors.

Independently parsed approved candidate-2.md narration rows and compared exact generated script text. Both authorization declarations bind document SHA2a2b284bd616dfc186df50b6424d8358e2737d3562b6d868c0f23bd38219dbde. A script SHA a783b58b548f00588e34040e7aef0b22e77301de33f09653ca9e35e1524eb8cd; B c71d44d66b03d88f6f9c76d3eb19612667c1d8157a60d787b4af2d6979e2329b. Every source WAV SHA, declared receipt text and decoded sample length match. All10 label local Chen-style/Qwen3-TTS0.6B, no replacement voice evidenced. This is declared transcript binding, not independent speech recognition or listening.

Independently decoded every input at24kHz mono s16 and compared exact bytes to the assembled pre-AAC PCM. All narration is complete; no time stretch, truncation, overlap or unexpected nonzero padding. A order: line1,line2,sample1,sample2,line3,line4,line5. B order: sample1,sample2,line1,line2,line3,line4,line5. Source narration totals A37.52s/B39.52s. PCM samples/frames exactly fill the respective timelines. Lossy AAC is not claimed byte-identical to original WAV.

Fairness: both use identical repository sample file hashes and cuts: demo_voice.wav0:70320 at24kHz(2.93s),demo_clone_output.wav6720:96000(3.72s). Both use same local voice provider/quality path. These reused excerpts exceed the approximate2s planning note; builder explicitly retained previously reviewed excerpts rather than choose unlistened new cuts. Actual values disclosed, not presented as2s. The versions differ in authored narration and order, so this is not an isolated hook-only scientific experiment.

Measured final silence threshold -42dB sustained>=0.65s: A no hits; B one19.835333–20.50425(0.668917s), inside line2 narration, not a scene assembly gap. Low-level windows do not prove unnatural delivery or audience retention and do not authorize removing silence from speech. No code/media defect found in this technical scope.

All raw check scripts, probes, decode/silence logs preserved work/voice-style-ab-qa-v1. No media or private reference audio committed. Actual image review handled separately; cue timing remains estimated, not word alignment. No final acceptance or publication claimed.
