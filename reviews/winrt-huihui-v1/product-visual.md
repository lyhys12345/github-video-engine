# Independent product / static video review — WinRT Huihui freeze v1

Candidate `candidate.json` SHA-256 `d373039aedeff5bfa604a31a84cea2f0ecbe6d3a2ea1fc81cc6a341c9325a49a`, matching requested version. Independently verified all 425 listed file lengths and SHA-256; zero mismatches. OPERATOR and exact extracted source consulted; candidate unmodified, no other judge report read. Scratch engine/state, actual-frame images and report are outside the candidate.

## Scoped findings

**Product/visual technical path: PASS for inspected provenance and tested status/rejection, with a moderate subtitle readability issue.** Overall Chinese-audience production quality, spoken content, sync, voice naturalness and owner acceptance remain UNVERIFIED. This technical demonstration does not claim to be approved Chen narration.

**Moderate Chinese line-breaking issue:** actual 360×640 frames 7, 30, 70, 120, 178 and 179 (`f-03`…`f-08`) split the caption across two lines after `处理器返回问` and leave `候。` alone on the next line. This breaks the word `问候`, creates an orphaned final character/punctuation line, and the small text sits near the lower screen edge. It is visibly awkward and can slow reading. It does not alone invalidate the expressly scoped local Huihui generation/import technical demonstration, but it prevents calling Chinese audience-facing subtitle quality approved. Before a formal delivery, implement general Chinese-aware, punctuation-aware line wrapping and last-line balancing without altering the underlying immutable transcript, and render/review at 360×640 plus a real representative phone/player. English-only mechanism labels `Client`, `Server`, `Root handler` also remain in the Chinese scene and may limit comprehension for Chinese-only audiences; no user study was performed.

**Minor CLI diagnostics issue:** actual isolated CLI rejected empty text, 121 Chinese characters, and malformed task ID with exit 1 but wrapped all three as `UNEXPECTED` and serialized Zod diagnostics. The text includes the 120-code-point constraint or regex, so the failure is not silent, but it is not a clear input-validation category. Distinct concise validation error codes/messages would improve user recovery. Other input and missing-voice cases were not independently exercised.

## Provenance and actual CLI

Actual `tts huihui-status` for `cdcdf401610d1d9c6b31ae4cf5485f4e9afb11c1ab3105234d149d6d9731b793` in an isolated state copy returned succeeded, integrity verified, `provider: windows-winrt-huihui`, `language: zh-CN`, fixed Huihui OneCore voice ID and label `Microsoft Huihui / Windows WinRT / zh-CN / technical fixture`. The retained generation manifest in the exported preview also states `origin: installed Windows WinRT SpeechSynthesizer`, engine remote dispatch `none`, speech content unverified and owner listening pending. It binds WAV SHA-256 `f8e64f10778b1058815ea68e0261c7638c08c9746e41d8087ce2162e74a882dc`. The video says `Local voice • Illustration • No observed execution`, not Chen. Metadata is provenance evidence; I did not hear or independently identify the speaker, and Windows subsystem network activity was not audited.

## Actual images and media

Independent ffprobe and full decode of the frozen preview succeeded, ffmpeg null exit 0: SHA-256 `a1a6dd73a3effccd1140a50dc3bdbb5469cbe65e9156ddebd54f063e01b2887e`, H.264 720×1280 at 24 fps, 216 frames / 9 seconds, plus 48 kHz AAC. Extracted and individually viewed 360×640 frames 0, 6, 7, 30, 70, 120, 178, 179, 180, 215 (`f-01.png`…`f-10.png`). The caption appears at frame 7 and remains at 179, absent at 180, consistent to frame granularity with VTT 0.291–7.467 seconds. The illustrative diagram proceeds from server to GET and Hello World in selected stills. This does not establish speech-word timing, successful continuous pacing or the completeness of the source explanation.

No continuous viewing, listening, transcription verification, speech identity/naturalness assessment, real-device or audience testing, or owner acceptance was performed. AAC existence and decoding do not prove intelligible or correct speech. No paid service or target repository execution was used in this review.
