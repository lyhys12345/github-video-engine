# GitHub Video Engine

**把你的 GitHub 仓库，做成一条看得懂、愿意看下去的短视频。**

<p align="center">
  <a href="docs/media/engine-flagship.mp4"><img src="docs/media/engine-flagship.jpg" width="280" alt="GitHub Video Engine 产品视频：你把项目做好，我们把它讲清楚"></a>
</p>
<p align="center"><a href="docs/media/engine-flagship.mp4"><strong>▶ 看看你的仓库如何变成视频 · 54 秒</strong></a></p>

以 OpenMAIC 为例，看一次从仓库链接、脚本审核到成片与可编辑项目的制作过程。[制作与审阅记录](docs/flagship-video/README.md)

README 能解释项目。短视频可以先让人看到它解决了什么，再带观众看懂原理。把 GitHub 链接交给 Codex，告诉它你想讲给谁听。你先审核旁白和分镜，再决定是否生成带旁白、字幕的竖屏视频和可编辑项目文件。

[看产品 Demo](#产品-demo) · [用自己的仓库试一次](#用自己的仓库试一次) · [工程文档](#工程文档)

## 产品 Demo

点击封面或下方的 MP4 链接查看。四个案例均为中文竖屏预览。

| 山海所知 | VoiceStudio |
| :---: | :---: |
| <a href="docs/media/worldknow-demo.mp4"><img src="docs/media/worldknow-demo.jpg" width="165" alt="山海所知：地图里的长颈鹿故事"></a> | <a href="docs/media/voicestudio-demo.mp4"><img src="docs/media/voicestudio-demo.jpg" width="165" alt="VoiceStudio：同一参考音色换一句台词"></a> |
| **一只长颈鹿，怎么走进明朝？**<br>从故事切进真实地图，展示时间和视角如何改变画面。 | **同一个声音，换一句台词。**<br>先听官方样音对比，再看参考音频和新台词各自起什么作用。 |
| [查看 MP4 · 43 秒](docs/media/worldknow-demo.mp4) | [查看 MP4 · 41 秒](docs/media/voicestudio-demo.mp4) |

| ArtCraft | OpenMAIC |
| :---: | :---: |
| <a href="docs/media/artcraft-demo.mp4"><img src="docs/media/artcraft-demo.jpg" width="165" alt="ArtCraft：火星上的机器人"></a> | <a href="docs/media/openmaic-b-demo.mp4"><img src="docs/media/openmaic-b-demo.jpg" width="165" alt="OpenMAIC：AI 老师和同学参与讨论"></a> |
| **动作说不清？先摆给 AI 看。**<br>用官方演示串起人偶姿势、文字描述和机器人结果。 | **老师和同学都是 AI，你可以加入讨论。**<br>先看官方课堂演示，再讲一个主题或一份资料如何变成课程。 |
| [查看 MP4 · 25 秒](docs/media/artcraft-demo.mp4) | [查看 MP4 · 46 秒](docs/media/openmaic-b-demo.mp4) |

想看制作流程？[70 秒工作流演示](docs/media/engine-workflow.mp4)以《山海所知》为例，展示如何从项目证据写出脚本、按反馈改稿并交付可编辑项目。

## 用自己的仓库试一次

1. 在 Codex 中打开已配置的 **GitHub Video Engine 仓库**。首次使用先看[安装与使用指南](docs/codex-user-path-v1.md)。
2. 贴上 GitHub 链接，说明观众和发布平台。时长、风格和声音可以一起指定。
3. 审核完整旁白和逐镜头分镜。确认后生成视频，拿到 MP4 和可编辑项目文件。后续可以直接用自然语言指出要改的地方。

可以直接在 Codex 里这样说：

```text
把 https://github.com/OWNER/REPO 做成一条面向小红书普通观众的竖屏短视频。
用一个具体例子开场，讲清楚它解决什么问题、如何实现。先给我完整旁白和分镜审核。
```

**目前适合在配置好的 Codex 环境里试用。** Codex 会话负责理解仓库、写稿和策划画面，引擎负责保存证据、审批、任务与渲染产物。内置流程只读研究目标仓库。本地有声制作需要额外配置语音运行时、模型和有权使用的参考音频。[语音配置](docs/narration-voice-preference.md)

## 工程文档

| 想了解什么 | 从这里开始 |
| --- | --- |
| 用 Codex 从链接做有声预览 | [使用指南](docs/codex-user-path-v1.md) · [统一运行入口](docs/narrative-run-v1.md) |
| 审阅事实、处理返修、导出可编辑项目 | [事实审阅](docs/script-facts-v1.md) · [返修流程](docs/rsi-repair-v1.md) · [跨机交付](docs/long-preview-portability-v1.md) |
| 使用 Claude Code 或自己的 API | [Claude Code](docs/claude-code-user-path-v1.md) · [自备 API](docs/byo-api-author-v1.md)。已有入口，实际模型端到端出片尚待验证。 |
| 看渲染实现、架构与许可 | [素材剪辑适配器](docs/showcase-reel.md) · [操作手册](docs/operator-runbook.md) · [架构与许可](docs/decisions.md) |

<details>
<summary>本地安装、测试与 CLI</summary>

已验证环境为 Windows x64/NTFS。需要 Node.js 24.x、pnpm 11.25.0、支持同卷硬链接的文件系统。渲染还需要本地 Chrome/Chromium、FFmpeg 与 FFprobe。

```sh
pnpm install --frozen-lockfile
pnpm run doctor
pnpm run typecheck
pnpm test
```

`pnpm run test:smoke` 和 `pnpm run test:acceptance` 会生成本地媒体。部分 Windows 测试需要硬链接和目录联接权限。建议使用较短的 checkout 和状态目录。常用环境变量为 `GVE_DATA`、`GVE_BROWSER`、`GVE_FFMPEG`、`GVE_FFPROBE`。

```sh
pnpm gve research --repo https://github.com/OWNER/REPO --out work/snapshot.json
pnpm gve render --spec examples/demo.v1.json
pnpm gve jobs status
pnpm gve jobs resume <job-id>
```

[证据规划与导出](docs/planning-runtime-v1.md) · [设计决策](docs/decisions.md) · [仓库范围](docs/repository-setup.md)

</details>

<details>
<summary>案例来源与验证范围</summary>

- 山海所知使用真实产品操作，机制示意在片中标明。[源仓库](https://github.com/Greenere/the-world-we-know)
- VoiceStudio 的音色对比使用官方预生成样音。片中的应用画面属于示意。
- ArtCraft 使用官方姿势编辑示例，保留姿势参考和模型费用提示。[源仓库](https://github.com/storytold/artcraft) · [复审记录](reviews/artcraft-result-refine-v1/README.md)
- OpenMAIC 选用课堂讨论版（试片 O-B），使用官方课堂片段，课程生成过程以示意呈现。[试片记录](reviews/xhs-pilot-production-v1/final-binding.json)
- Demo 是制作案例。抽帧审阅、媒体解码、完整听看和最终用户验收各有独立记录。工作目录里的原始产物和本地语音模型另行保存。
- Remotion、字体及各项目素材的授权分别适用。[架构与许可](docs/decisions.md)

</details>

**English** · Turn a GitHub repository into an editable, narrated explainer. Start with a repo URL and an audience brief, review a source-backed script, then render locally. [Getting started](docs/codex-user-path-v1.md)

维护者换机续作：[Google Drive 交接记录](https://drive.google.com/file/d/1YtEYD-TT-qk87WjYjGPi05OIQpTespxd/view)
