# REA teaser v4 — 30-second owner review sample

## Scope and provenance
Only the owner-requested preview, not a full film. Previous versions remain intact. No target repository execution, paid API calls, upgrade, or publication.

Narration: 小恐龍跑太快？調慢一點，就好跳多了。該改哪裡？R E A 把網頁載入的程式碼交給助手。助手找到規則：每次更新，速度就加一點。看，更新不斷累積，恐龍也越跑越快。弄懂原因，就能照著規則，做出可以調速的小演示。難的不是拖滑桿，是找到該改的地方。

ElevenLabs logged-in Free account UI: Chen Mandarin Chinese, Eleven v4, stability 0.5, similarity 0.75, clone strength 0, no emotion tags. One continuous 28.368938-second source MP3, original rate; no time stretching or sentence splicing. Source `work/owner-revision-1/teaser-v4-voice/clip-01.mp3` and SHA256 manifest are retained. First 133-character version was 32 seconds and was not used; final version is 119 characters. Observed credits 9706 before and 9454 after (252 free credits consumed). UI screenshot records selected voice/model/result. No subscription action was taken.

## Visual construction

- 0–4 s: game and slider immediately demonstrate slowing down; running/jumping remains live.
- 4–9.8 s: same game moves down continuously. A code object travels from webpage via REA toward AI assistant. Labels distinguish REA's clue transfer from assistant interpretation.
- 9.8–12.5 s: assistant locates the simplified rule. Full code appears for only 2.7 seconds, replacing v3's long static code hold.
- 12.5–20.8 s: update count, per-update increment, accumulated speed bar and moving dinosaur share a single speed model. Pulses follow the dependency arrows. 6000 updates are compressed into 7.5 seconds, explicitly labelled time compression; this is not a real-time update rate claim.
- 20.8–30 s: game continuously grows back; assistant's new teaching reconstruction demonstrates slider changes 12 → 6 → 10 → 6.

The displayed pseudocode checks speed < 13 before adding 0.001; it does not claim a hard mathematical clamp at 13. The causal demonstration runs only from 6 to 12. Manual control is a newly authored teaching example. All content is explicitly labelled teaching reconstruction, not a recording of actual REA execution. Grounding: https://rea.tools/examples/dino-lab/ .

## Review boundaries

Caption intervals are manually authored, not forced aligned. The model has not verified subjective voice naturalness or continuous audiovisual rhythm by listening. Owner review remains required. Retention is a creative objective, not a measured result. This is no milestone or human acceptance sign-off.

## Actual execution and inspection

Command executed: `node --import tsx examples/rea/revision-1/teaser-v4/render.ts`.
Remotion rendered 900 frames. Pipeline FFprobe counted 900 H.264/yuv420p frames at 1080×1920 and 30/1 fps; duration 30.000 seconds; AAC stereo 48 kHz. Full FFmpeg decode completed with exit 0. TaskRunner committed the MP4, narration, seven sampled PNGs and evaluation into the local content-addressed artifact store.

Task ID: e9fb03221f3c94f00f2f76c62f350053a1e4cebf9088820114ba0ed960fea364. First execution, cached=false.
MP4 SHA256: 1626dd2e5e8c0098a6e34c0106beb57260a8429e1a1740b7aa01227e8d4835f3.

Viewed actual frames 45, 180, 285, 420, 540, 750, 850, plus FFmpeg-extracted final-MP4 frame at 11 seconds. Sampled layouts are legible without subtitle clipping; handoff object's arrival overlaps the assistant icon deliberately, and the assistant attribution remains readable. Frames 420 and 540 show consistent count/speed pairs (1200/7.200 and 4400/10.400), with the same speed reflected in the lower game. Code is limited to the rule and visible for 2.7 seconds. Existing committed evaluation preserves its pre-inspection `sampled-frames-pending` field; this document records the subsequent actual inspection.
