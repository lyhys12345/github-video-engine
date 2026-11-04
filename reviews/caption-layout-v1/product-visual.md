# Independent targeted Chinese caption layout review

Candidate `candidate.json` SHA-256 `b4e0172e8aaa7c2b90985551b04b56c4dc9c2b32fd1fa0c7991e7988d2e5ae29`, matching requested version; all 1054 declared file sizes/hashes independently checked, zero mismatches. Candidate unmodified; no other judge report used. The original Huihui finding and original images remain separately preserved in `gve-huihui-judge-product`.

## Targeted verdict: PASS for the observed orphaned-word defect

The actual re-rendered retained Huihui sample now displays `示例监听三千端口。` and `请求根路径时，处理器返回问候。` on two lines. Frames 7, 48, 100 and 179 show the complete word `问候` together and no orphaned final `候。`; this directly resolves the earlier reported case. Frame 6 has no caption; the selected active frames match the recorded cue window at frame granularity.

The actual mixed Chinese/English frame shows `示例使用 Express。发送 GET /` followed by `时，处理器返回 Hello World!`. The individual Latin tokens `Express`, `GET`, and `Hello World!` are visible and punctuation is not orphaned; the phrase breaks between `/` and `时`, an acceptable but stylistically imperfect syntactic break in this example. The three-line Chinese example displays `示例监听三千端口。客户端请求` / `根路径，路由匹配后返回问候。` / `这一段展示文档描述的请求与响应。`; no character or punctuation is isolated and all lines are within the box in the inspected frames. These checks do not establish general Chinese word segmentation: the contract expressly uses deterministic Han character breaks, not a dictionary, so other inputs may split words.

In the sampled three-line active frames the progress bar is immediately above the box but appears separated by only a few 360px pixels; no actual overlap or caption clipping is visible. The two-line examples have more space. Subtitles are visibly larger than the earlier sample at this scale. Device/player overlays, accessibility settings, reading speed and other languages were not tested; the narrow gap and bottom placement remain real-device QA items, not a confirmed defect.

## Actual media and frames

All three exported actual H.264/AAC MP4s independently fully decoded to null, exit 0. Retained Chinese sample SHA-256 `e18bb5a9fe30637862a8c3421989dbc5aacf09b2b241036f62dc13d19971824f`, 216 frames / 9 s; mixed sample `d8f6c73d77857aab9b7e7e7dd1dc6717a0919f19e4affcd7ba5a905786d119a2`, 216 frames / 9 s; three-line sample `b3356780302bfbb348e5030822b33dcb52d083fc98f13dd5594d88a3a23e1958`, 315 frames / 13.125 s. Each is 720×1280 at 24 fps with AAC 48 kHz.

Independently extracted and individually viewed 360×640 frames 6, 7, 48, 100, 179 from each actual MP4 (`retained-huihui-*`, `mixed-huihui-*`, `three-line-huihui-*`), plus mixed 173/174/215 and three-line 300/301/302/314 (`*-end-*`). The 3-line 301 caption remains visible and 302 does not, consistent to frame granularity with VTT ending 12.547 s. The exact original text is preserved in the exported VTT; this inspection does not independently prove all metadata or timing integrity.

No continuous viewing, listening, speech recognition/word-level alignment, subjective audio naturalness, actual mobile playback, broad multilingual/edge-case visual review, or owner acceptance was performed. Caller-declared timing and local voice provenance are not an audio-quality or semantic pass. Overall audiovisual approval remains UNVERIFIED; the result is specific to the prior orphaned-word finding and the sampled layouts.
