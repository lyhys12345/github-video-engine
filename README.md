# GitHub Video Engine

**Turn your GitHub repository into a short video people want to watch and can understand.**

English | [简体中文](README.zh-CN.md)

<p align="center">
  <a href="docs/media/engine-flagship.mp4"><img src="docs/media/engine-flagship.jpg" width="280" alt="GitHub Video Engine product video: you build the project, we help explain it"></a>
</p>
<p align="center"><a href="docs/media/engine-flagship.mp4"><strong>▶ See how a repository becomes a video · 57 seconds</strong></a></p>

Using OpenMAIC as an example, see the journey from a repository link and script review to a finished video and editable project. [Production and review notes](docs/flagship-video/README.md)

A README can explain your project. A short video can first show what it does, then help viewers understand how it works. Give Codex a GitHub link and describe your audience. Review the narration and storyboard before deciding whether to generate a narrated vertical video and editable project files.

[Watch the demos](#product-demos) · [Try your own repository](#try-your-own-repository) · [Engineering docs](#engineering-docs)

## Product demos

Click a cover or an MP4 link to watch. These four examples are Chinese-language vertical videos.

| The World We Know | VoiceStudio |
| :---: | :---: |
| <a href="docs/media/worldknow-demo.mp4"><img src="docs/media/worldknow-demo.jpg" width="165" alt="The World We Know: a giraffe story on a historical map"></a> | <a href="docs/media/voicestudio-demo.mp4"><img src="docs/media/voicestudio-demo.jpg" width="165" alt="VoiceStudio: a new line in a reference voice"></a> |
| **How did a giraffe reach Ming China?**<br>A story leads into the real map, showing how time and perspective change the view. | **The same voice, a new line.**<br>Hear the official sample comparison, then see the roles of reference audio and new text. |
| [Watch MP4 · 43 seconds](docs/media/worldknow-demo.mp4) | [Watch MP4 · 41 seconds](docs/media/voicestudio-demo.mp4) |

| ArtCraft | OpenMAIC |
| :---: | :---: |
| <a href="docs/media/artcraft-demo.mp4"><img src="docs/media/artcraft-demo.jpg" width="165" alt="ArtCraft: a robot on Mars"></a> | <a href="docs/media/openmaic-b-demo.mp4"><img src="docs/media/openmaic-b-demo.jpg" width="165" alt="OpenMAIC: AI teachers and classmates in a discussion"></a> |
| **Hard to describe a pose? Show it to AI.**<br>An official demo connects a character pose, a text prompt and the resulting robot. | **The teacher and classmates are AI—and you can join the discussion.**<br>See the official classroom demo, then learn how a topic or source material becomes a course. |
| [Watch MP4 · 25 seconds](docs/media/artcraft-demo.mp4) | [Watch MP4 · 46 seconds](docs/media/openmaic-b-demo.mp4) |

Curious about the process? The [70-second workflow demo](docs/media/engine-workflow.mp4) uses The World We Know to show how project evidence informs a script, how feedback leads to revisions, and how an editable project is delivered.

## Try your own repository

1. Open a configured **GitHub Video Engine repository** in Codex. For first-time setup, see the [installation and usage guide](docs/codex-user-path-v1.md).
2. Share a GitHub URL and describe your audience and publishing platform. You can also specify the duration, style and voice.
3. Review the complete narration and shot-by-shot storyboard. Once you approve, generate a video and receive an MP4 and editable project files. You can request later changes in plain language.

For example, ask Codex:

```text
Turn https://github.com/OWNER/REPO into a vertical short video for a general TikTok audience.
Open with a concrete example and explain the problem it solves and how it works.
Show me the full narration and storyboard for review before generating the video.
```

**Currently intended for use in a configured Codex environment.** The Codex session researches the repository and develops the script and visuals; the engine persists evidence, approvals, jobs and rendering artifacts. The built-in research flow reads the target repository without executing it. Local narration requires a separately configured voice runtime, model and reference audio you have the right to use. [Voice configuration](docs/narration-voice-preference.md)

## Engineering docs

| What you want to do | Start here |
| --- | --- |
| Create a narrated preview from a URL with Codex | [User guide](docs/codex-user-path-v1.md) · [Unified run entry point](docs/narrative-run-v1.md) |
| Review facts, handle revisions and export an editable project | [Fact review](docs/script-facts-v1.md) · [Revision workflow](docs/rsi-repair-v1.md) · [Cross-machine portability](docs/long-preview-portability-v1.md) |
| Use Claude Code or your own API | [Claude Code](docs/claude-code-user-path-v1.md) · [Bring your own API](docs/byo-api-author-v1.md). Entry points exist; full end-to-end video production with a real model remains unverified. |
| Explore rendering, architecture and licensing | [Showcase editing adapter](docs/showcase-reel.md) · [Operator runbook](docs/operator-runbook.md) · [Architecture and licensing](docs/decisions.md) |

<details>
<summary>Local installation, tests and CLI</summary>

The verified environment is Windows x64/NTFS. You need Node.js 24.x, pnpm 11.25.0 and a filesystem that supports same-volume hard links. Rendering also requires local Chrome/Chromium, FFmpeg and FFprobe.

```sh
pnpm install --frozen-lockfile
pnpm run doctor
pnpm run typecheck
pnpm test
```

`pnpm run test:smoke` and `pnpm run test:acceptance` generate local media. Some Windows tests require hard-link and directory-junction permissions. Short checkout and state paths are recommended. Common environment variables include `GVE_DATA`, `GVE_BROWSER`, `GVE_FFMPEG` and `GVE_FFPROBE`.

```sh
pnpm gve research --repo https://github.com/OWNER/REPO --out work/snapshot.json
pnpm gve render --spec examples/demo.v1.json
pnpm gve jobs status
pnpm gve jobs resume <job-id>
```

[Evidence planning and export](docs/planning-runtime-v1.md) · [Design decisions](docs/decisions.md) · [Repository scope](docs/repository-setup.md)

</details>

<details>
<summary>Sources and review scope</summary>

- The World We Know uses real product interaction; mechanism illustrations are labeled in the video. [Source repository](https://github.com/Greenere/the-world-we-know)
- VoiceStudio's voice comparison uses official pregenerated audio samples. The application footage in the video is an illustration.
- ArtCraft uses an official pose-editing example and retains the pose-reference and model-cost disclosures. [Source repository](https://github.com/storytold/artcraft) · [Review notes](reviews/artcraft-result-refine-v1/README.md)
- OpenMAIC uses the classroom-discussion version (pilot O-B) and official classroom footage; course generation is illustrated. [Pilot record](reviews/xhs-pilot-production-v1/final-binding.json)
- Demos are production examples. Sampled-frame reviews, media decoding, continuous audiovisual reviews and final owner acceptance are recorded separately. Original working artifacts and local voice models are stored separately.
- Remotion, fonts and project assets have separate licensing terms. [Architecture and licensing](docs/decisions.md)

</details>

Maintainer handoff for continuing on another machine: [Google Drive handoff](https://drive.google.com/file/d/1YtEYD-TT-qk87WjYjGPi05OIQpTespxd/view).
