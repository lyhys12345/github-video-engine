# Capability checks and narration

```sh
pnpm gve doctor --capabilities --phase planning --data "<workspace>/state"
pnpm gve doctor --capabilities --phase speech --voice imported --language en-US --data "<workspace>/state"
pnpm gve doctor --capabilities --phase preview --voice none --language en-US --data "<workspace>/state"
pnpm gve doctor --capabilities --phase preview --voice anna-local --language zh-CN
pnpm gve doctor --capabilities --phase speech --voice qwen-public --language en-US --data "<workspace>/state"
```

A phase is ready when every listed check for that phase passes. Omitting `--phase` checks all phases for the current voice and language. The report includes adapter coverage and omits local paths, tool output and profile contents. An existing `--data` directory is checked directly. For a new state path, the nearest existing parent is tested. Omit `--data` to check the system temporary filesystem.

| Phase | Local requirements |
| --- | --- |
| Planning and source research | Node 24.x, writable state, hard links and SQLite WAL. Initial public repository capture also needs GitHub access. |
| Speech timing and voice | FFmpeg/ffprobe and the selected local adapter, or verified finished WAV receipts. Explicit silent runs skip these media steps. |
| Animation | Chrome/Chromium, FFmpeg with libx264 and drawtext, and ffprobe. |
| Preview | Animation requirements and the chosen narration mode. Narrated output also requires AAC. |

Browser discovery verifies the executable exists. A completed render verifies the actual media. Local profile checks validate the locked model and required reference inputs for Anna/Chen, or the reference-free public model for qwen-public, then probe the pinned Python/CUDA runtime. Huihui checks enumerate the exact installed WinRT voice. The preflight makes no GitHub requests and creates no speech or video.

Run `explanation run --through planning` to capture and bind the authored script and storyboard without rendering tools. The session agent prepares the author JSON. Brief-bound runs require a script review receipt against the exact author snapshot before rendering.

## Narration choices

- **Public local synthesis.** Explicit `qwen-public` uses built-in Serena for `zh-CN` or Ryan for `en-US`, with no reference audio. Follow [public voice setup](public-local-voice-v1.md). It is a separately installed Windows CUDA option, not an automatic fallback.
- **Owner/local alternatives.** Anna remains the existing owner's default, requires a configured Windows CUDA profile via `GVE_ANNA_PROFILE`, and supports `zh-CN`. Chen and Windows Huihui remain explicit `zh-CN` alternatives with their own installations. A missing local voice stops the run; selecting public English does not enable English for these legacy adapters.
- **Finished recording.** The `imported` mode accepts `zh-CN` and `en-US` WAV narration. A supplied WAV can use the authored timeline without GPU, Python models, or WinRT.
- **Silent preview.** The `none` mode accepts `zh-CN` and `en-US` briefs. Use `"voice":{"mode":"none"}` and an empty `speech` array in the complete run author file. The complete preview keeps the authored visual sequence and unresolved scenes. The verified MP4 has one video stream. The bundle includes the editable plan and pending fact review packet.
- Standalone reference cloning, custom narration APIs and local synthesis for additional languages require adapters. Language selection does not translate the script or visual templates.

## Bind authorized finished WAVs

1. Set `creative-brief.json` to `"voice":{"mode":"imported","voiceLabel":"Presenter","rightsConfirmed":true}`. Author exact scene text and caption partitions. Planning can reach script review before WAVs are supplied.
2. Supply one original-speed, authorized, audio-only WAV per produced scene. Prepare a local import spec with `schemaVersion: "1.0"`, `provider: "local-import"`, `mediaType: "audio/wav"`, `text` containing the exact scene narration, `voiceLabel` matching the brief, and `sourceSha256` from that file. Run `pnpm gve tts import --spec "<scene-import.json>" --audio "<scene.wav>" --data "<workspace>/state"`.
3. Add `recording` to each produced scene's `run.json` speech entry. Use the returned `fingerprint` as `receiptFingerprint`, `receiptArtifact.sha256` as `receiptSha256`, and `receipt.artifact.sha256` as `sourceAudioSha256`. Set `transcriptSha256` to SHA-256 of the exact UTF-8 scene text. Keep evidence and adapter gaps unvoiced.
4. Bind the script review receipt to the final author snapshot, then run through `speech` and `preview`. The engine measures the complete decoded recording at 48 kHz, validates authored captions and checks the recording fits the scene. The preview and portable project preserve the original WAV and its receipt.

Changing scene narration requires a matching new receipt and caption partitions. Portable export preserves the committed reviewed author binding for new complete previews. An altered brief or script goes through review before it can be exported with newly rendered media. A voice label and transcript in an import receipt are caller declarations. Human listening is needed to assess delivery, speaker identity and spoken content.
