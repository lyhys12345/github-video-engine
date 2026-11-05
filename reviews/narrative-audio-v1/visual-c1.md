# Narrative audio c1 — product/video independent review

- Candidate: candidate.json SHA-256 7419ad5cd233376fc1c6d32915d38efd48086d118bf14cdae7ea0c1e2a6aa112; commit 9ec1c6b83b6c7ebbbd41c39764a1db62df41cf7f.
- Roles: product and video quality, limited to visual/caption inspection assigned by coordinator. Conclusion: UNVERIFIED for full role; sampled picture and extracted caption evidence below are positive, but actual player caption display and continuous AV/listening are not verified. Owner's express deferral leaves natural listening and continuous perceptual AV pending, not passed. No other judge reports read. OPERATOR was read after AGENTS/common and before first conclusion; its claims were not taken as proof.
- Environment: Windows, 2026-11-05; scratch outputs C:/Users/luyuh/Documents/Codex/2026-10-25/referenced-chatgpt-conversation-this-is-an/judge-0.jpg through judge-3.jpg and cap-0.vtt through cap-3.vtt. Candidate was read-only.

## Checks and evidence

| Requirement | Result | Evidence / method | Limit |
| --- | --- | --- | --- |
| Two actual visual excerpts plus edits | Sampled, no observed failure | ffmpeg decoded each frozen bundle excerpt.mp4 at fps=1, tiled 4x4; judge-0/1 Express baseline/edit, judge-2/3 rembg baseline/edit. First scenes show request/route and input/foreground illustrations, respectively; diagram indicates illustrative/not executed. | Samples only, not continuous playback or every frame. |
| Visible unproduced gaps | Sampled positive | At approximately 8–10s scene 3 card says NOT PRODUCIBLE / needs evidence; approximately 11–13s scene 4 says NOT PRODUCIBLE / needs adapter, in both projects and edits. | No independent audio silence audit or listening here. |
| Selectable caption data | Partial positive | ffmpeg decoded each MP4's 0:s:0 to VTT. Express baseline 2.000–4.625 and 5.000–7.740; rembg baseline 2.000–4.645 and 5.000–7.640. Text is Chinese and short. No cue on gap cards. Index HTML uses default track src captions.vtt; referenced file exists. | Did not use an actual player to activate track, judge display legibility, or establish player positioning/occlusion; captions are not burned into sampled source images. Player-dependent placement may cover content. |
| Edit effects | Positive at data level | In each edited MP4 first cue begins 2.100 and ends 0.100s later; second cue unchanged. Images sampled appear same scenes/gap treatment. | Does not prove audible alignment or assess smoothness. |
| Natural listening/speech/alignment/continuous AV | PENDING | No actual listening or continuous playback performed. | Do not infer transcript accuracy, speech identity, perceptual quality or final acceptance from track extraction. |

No confirmed blocker or major established in these sampled checks. Actual player rendering and listening remain open evidence, not proven defects. No repair or recheck occurred.

Reproduction: locate each bundle basename from evidence/{express,rembg}/{result,edit-result}.json under respective audio-export/edit-export; decode using ffmpeg `-vf fps=1,scale=480:-1,tile=4x4 -frames:v 1` and extract `-map 0:s:0 -f webvtt`. Exit status 0. Keyframes and VTT are derivative scratch, not original evidence. Review is not a current facts or final owner approval.

Player follow-up: local CapCut ffmpeg filter list did not contain subtitles/libass. Attempt to open the frozen bundle's file: index.html in Chrome was rejected by the browser URL security policy; no bypass attempted. Thus actual subtitle activation, Chinese glyph legibility and occlusion in a player are UNVERIFIED. This is an evidence limitation, not a demonstrated rendering defect.

## libass subtitle rendering follow-up

The earlier filter finding applies only to the CapCut ffmpeg binary. `C:/Users/luyuh/scoop/shims/ffmpeg.exe -hide_banner -filters` lists subtitles/libass. Copied each baseline VTT to scratch and ran `ffmpeg -i excerpt.mp4 -vf subtitles=captest-N.vtt -ss 3|6 -frames:v 1` (output seek, exit 0). Viewed caption-0-3.png, caption-0-6.png, caption-1-3.png, caption-1-6.png in scratch. At 720×1280 all four Chinese sentences render with recognizable characters and strong black outline/white fill. Default bottom placement overlaps the source's bottom descriptive text in all four sampled frames (e.g., Express client-to-server label and rembg checkerboard explanation); main diagram remains visible. This is a libass default software-rendered simulation, not a real player's placement, size, activation or playback. The contract assigns subtitle placement to the player, so this demonstrates an actual placement risk rather than proving the renderer violates the contract. Verify the target player and viewing size. No listening or continuous playback performed; both remain pending.
