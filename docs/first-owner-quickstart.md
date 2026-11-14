# Your first repository video

Open this trusted engine checkout in your existing Codex or Claude Code session. Give the agent a GitHub URL and describe who should watch the video. The agent reads source evidence and writes the script and storyboard; you review them before it generates a video. You do not need to prepare author JSON or buy a model API key for the current-session workflow. Your chosen host still has its own account and usage requirements.

## Install and check the supported path

Use Node 24.x and the repository-pinned pnpm 11.25.0. Keep Windows checkout/workspace paths short. Clone only this engine; do not install or run the repository you want explained.

```sh
git clone https://github.com/lyhys12345/github-video-engine.git
cd github-video-engine
pnpm install --frozen-lockfile --ignore-scripts
pnpm gve doctor --first-owner
```

This checks planning first. It does not generate media, pick a voice, start an LLM, or approve a story. When the URL and workspace are known, the agent can request concrete next arguments:

```sh
pnpm gve doctor --first-owner --repo https://github.com/OWNER/REPO --workspace work/my-video
```

Planning needs Node, writable storage with SQLite/hard links and public GitHub access for capture. Rendering additionally needs local Chrome/Chromium, FFmpeg and FFprobe; doctor reports missing capabilities. Install these normal public prerequisites for your platform or set `GVE_BROWSER`, `GVE_FFMPEG` and `GVE_FFPROBE` to their executables. The check is not proof that rendering or a particular repository's story succeeds.

Choose narration explicitly with the agent:

| Choice | What you supply | What is included here |
| --- | --- | --- |
| Silent technical preview | Explicitly choose no audio | Supported diagram rendering and editable project; no voice model needed |
| Finished WAV recordings | Recordings you may use, one per approved scene, matching the exact approved words | Import, exact transcript/receipt binding, timing checks and composition; the agent handles the data |
| Public local synthesis | Install the [public model and runtime](public-local-voice-v1.md); explicitly choose `qwen-public` | Chinese Serena / English Ryan presets, no reference recording or paid TTS account; Windows NVIDIA CUDA is the bounded supported path |
| Reference-conditioned local synthesis | Your authorized local profile, runtime and model/reference | Owner Anna/Chen remain optional and private; their references are not distributed |

Example readiness checks after choosing:

```sh
pnpm gve doctor --first-owner --phase preview --voice none --language en-US
pnpm gve doctor --first-owner --phase preview --voice imported --language en-US
pnpm gve doctor --first-owner --phase preview --voice qwen-public --language zh-CN
```

Imported readiness means the tools are present, not that your recordings have been supplied or verified. A missing local voice stops with a clear reason; it does not silently substitute a different voice or silence. `reference` and `byo-api` preferences are not working adapters just because a brief can describe them.

## Give the agent the task

```text
Use github-explainer to explain https://github.com/OWNER/REPO.
Audience: developers who have never used it. Platform: a vertical short video.
Keep it concise; choose the duration based on the story. Explain one useful result
and the implementation detail that makes it possible. For now, plan a silent
technical preview. Show me the complete script, storyboard and sources before
producing media. Do not execute the target repository.
```

Duration, style and voice are optional choices to clarify or explicitly delegate, not a large form you must fill in. The agent saves a creative brief, pins source evidence and chooses a supported renderer. You can ask for changes in ordinary language. Missing evidence or an unsupported animation must be explained, not fabricated.

There are two supported authoring paths. Technical diagrams and supported transformations use the narrative workflow. Real footage, product screenshots and editorial cuts use the [showcase workflow](showcase-runtime-v1.md), which requires authorized visual assets and its own approved manifest/audio. Silent narrative support does not imply silent showcase support or automatically available product footage. The agent chooses based on evidence and current capabilities.

The public narrative entry is:

```sh
pnpm gve explanation run --repo https://github.com/OWNER/REPO --workspace work/my-video
```

`awaiting-session-agent` means the agent must read the packet and author the project. It is not a finished video or a request for you to write JSON. New projects include `creative-brief.json` with the owning story, narrative, animation and run files. Planning produces an exact candidate hash.

## Review before rendering

The agent first obtains an independent script review, fixes supported findings, then shows you the full narration and shot-by-shot storyboard: hook, duration, inputs/outputs, sources, illustrations versus observed demonstrations, and ending. `awaiting-script-review` is the expected stop before your approval. No media should be generated from this real project at that stop.

Your approval is for that exact candidate. A material change to the brief, words, evidence or storyboard needs a new review and approval. The agent records the decision and resumes the same workspace through supported rendering; it must not invent your approval or reuse another video's receipt. Technical test fixtures may use conspicuously labelled test-only receipts; those do not authorize your film.

## Receive and continue the editable project

The narrative result contains a real MP4 and editable source-backed story, animation, caption definitions, evidence and supported audio. In the current silent technical renderer, supported source-diagram labels/actions are rendered; parent storyboard titles, on-screen copy and transitions can remain export-only. Do not promise that all planned copy or GitHub screenshot crops will appear without a compatible renderer/asset plan. A silent storyboard must communicate through the supported visible labels/actions instead of relying on future narration. It is project data for this compatible engine, not a standalone desktop video editor. Rendering and media verification do not replace viewing/listening or your final acceptance.

For a complete supported narrative preview, the agent uses the current status to select its exact task and author:

```sh
pnpm gve explanation workspace-status --workspace work/my-video
pnpm gve explanation project-export --workspace work/my-video --task PREVIEW_TASK --author AUTHOR_DIRECTORY --out work/my-video-package
pnpm gve explanation project-import --package work/my-video-package --digest EXPORTED_DIGEST --workspace work/my-video-restored
```

Use a new package and import destination; existing output is never overwritten. Transfer the entire package and its digest, plus install a compatible engine on the destination. The package includes the selected reachable media and author/source/review closure, excluding unrelated projects, local profiles, credentials and model weights. Review selected content before sharing. Imported audio belongs to the selected project and may still carry usage restrictions.

A reviewed import exposes a script receipt outside the author directory and trusted `resume` arguments. The `resume` array contains arguments for `pnpm gve` (or `node --import tsx src/cli.ts`), not a shell script. Execute it from the engine checkout; do not guess an old machine path or copy a review from another project. Legacy imports without a bound review still need review. For an edit, the agent changes the owning author inputs, prepares the changed script/storyboard and obtains fresh approval before rendering. Unchanged verified outputs can be reused; an engine/runtime change may invalidate media caches.

See [portable project details](portable-long-project-v1.md), [source-backed authoring](general-authoring-document-flow.md) and [current support boundaries](support-and-release.md). A source-only checkout test on Windows is not a second-machine, macOS/Linux, automatic skill discovery or Claude end-to-end certification.
