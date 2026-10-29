# M0 完整验收报告

历史记录说明：本报告对应原 31 项测试的构建。随后三个独立 judge 发现了额外的长标题裁切及阶段初始化清理问题，首轮判定为 FAIL；最新状态须查看 reviews/M0 的候选版本与 judge 报告，不能把本报告的历史通过直接当作当前最终批准。

日期：2026-10-25，America/Los_Angeles。以下均为实际执行结果。

**结论：修复后的 M0 构建完整验收通过。最终同一轮 31 项测试通过，0 失败，0 跳过。** 其中新增 6 项验收全部使用真实 Remotion、Chrome、FFmpeg/FFprobe，没有替换媒体 renderer 或 evaluator。

## 逐项实际结果

| 验收项 | 实际结果 | 证据 |
| --- | --- | --- |
| 全新安装 | 在另一独立目录从锁文件安装 219 个缓存包；类型检查和 peer 检查通过，doctor 成功 | [安装日志](acceptance-final-install.log)、[完整运行日志](acceptance-final-run.log) |
| 基准生成 | 新 CLI 任务生成 12 秒、720×1280、30 fps、360 帧、H.264/yuv420p 静音 MP4；10 项媒体检查通过 | [视频](../acceptance-output/run-eMfam7/baseline.mp4)、[FFprobe](../acceptance-output/run-eMfam7/baseline.ffprobe.json) |
| 修改输入 | 首场景标题改为 My own / video test.，强调色从 #8BFFCE 改为 #FFAA00；新任务、新视频哈希，原视频保持原哈希 | [修改后视频](../acceptance-output/run-eMfam7/modified.mp4)、[画面对照](../acceptance-output/run-eMfam7/title-comparison.png)、[修改证明](../acceptance-output/run-eMfam7/edit-proof.json) |
| 重复提交 | 相同输入返回同一任务 148d9df5-f7aa-4059-a062-684e930a350e；阶段、事件、文件时间与哈希均不变；本次调用 434 ms | [去重证明](../acceptance-output/run-eMfam7/duplicate-proof.json) |
| 非法输入 | 宽度 721、版本 99、损坏 JSON 均退出码 1；任务数保持 2，未生成成功输出 | [拒绝记录](../acceptance-output/run-eMfam7/invalid-proof.json) |
| 真实渲染中途强杀 | 终止前记录 77/360 帧；只强杀主 CLI，旧 worker 与观察到的 12 个子进程均退出；不发布半成品 | [终止前后状态与 PID](../acceptance-output/run-eMfam7/crash-proof.json) |
| 强杀后恢复 | 使用默认 30 秒租约；活跃时第二个进程收到 JOB_BUSY。到期后新 CLI 恢复，VALIDATE/RESOLVE_ASSETS 仍各 1 次，RENDER 第 2 次完成；临时目录清空，10 项媒体检查通过 | [恢复视频](../acceptance-output/run-eMfam7/recovered.mp4)、[最终状态](../acceptance-output/run-eMfam7/recovery.status.json) |
| 真实取消并恢复 | 实际帧数到 13/360 时请求 CLI cancel；退出码 130、状态 cancelled、无成功输出，worker 和观察到的 12 个子进程均退出。随后恢复成功，RENDER attempt=2 | [取消记录](../acceptance-output/run-eMfam7/cancel-proof.json)、[恢复视频](../acceptance-output/run-eMfam7/cancel-resumed.mp4) |

## 发现并修复的问题

首轮真实验收的功能结果通过，但发现一个诊断问题：非法 VideoSpec 和损坏 JSON 被标成通用 UNEXPECTED，字段信息也被嵌套转义，不便定位。

- 编排入口现在返回永久 INVALID_SPEC 错误，并给出字段路径，例如 video.width、schemaVersion。
- CLI 对损坏 JSON 返回 INVALID_JSON，并指出输入文件。
- 增加一项基础回归测试，要求错误分类正确且不创建任务；真实验收也加入错误码与字段断言。

修复后重新建立全新安装目录，并完整重跑所有测试。没有修改五阶段流程或增加 M1 功能。

另补充真实帧进度快照 render-progress.json，以记录终止发生在实际渲染过程中。它来自 Remotion onProgress 回调，属于临时观测文件，不是成功产物或恢复检查点。正常结束或恢复清理会移除临时目录，验收证据另存快照。

## 最终测试记录

| 测试文件 | 数量 | 性质 |
| --- | ---: | --- |
| core.test.ts | 19 | 真实 SQLite/文件系统；编排单元测试中的媒体为显式 mock |
| recovery.test.ts | 5 | 真实进程、并发和清理；媒体为显式 mock |
| smoke.test.ts | 1 | 真实渲染完成后注入失败，新 CLI 复用已提交视频继续验收 |
| acceptance.test.ts | 6 | 完整真实 CLI/渲染/终止/取消/恢复验收 |
| 合计 | 31 | 31 通过、0 失败、0 跳过 |

[Vitest 原始 JSON](acceptance-final-tests.json)、[完整日志](acceptance-final-run.log)、[可机器读取汇总](acceptance-results.json)。最初实施的 24 项记录保留在旧报告中，不与本轮数量相加。首轮新增 6 项验收记录也保留为 acceptance-tests-initial.json，作为错误提示修复前的记录。

另对交付源码运行 doctor，确认其执行指纹与全新安装中受测源码完全一致，并再次检查恢复任务的所有产物哈希：[交付构建证明](accepted-build-proof.json)、[重新查询的任务状态](accepted-recovery-status.json)。原 demo 和 v7 产品计划的哈希保持不变。

## 实际执行方式

最终构建在下列独立工作目录执行：

C:\Users\luyuh\Documents\Codex\2026-10-25\referenced-chatgpt-conversation-this-is-an\work\m0-acceptance-final-20261025

没有复制 node_modules；运行 pnpm install --offline --frozen-lockfile、pnpm run typecheck、pnpm peers check、pnpm exec vitest run。包来自本机缓存，未把这次安装描述为空缓存或全新操作系统测试。

验收通过公开 CLI 执行 doctor / render / jobs resume / jobs cancel。实际强杀仅针对记录到的本次主进程 PID；没有按进程名批量终止用户浏览器。Windows CIM 只将本次任务的后代进程写入证据。恢复使用默认 30 秒租约和两次尝试预算，没有缩短租约、隐藏故障开关或模拟媒体。

可以在项目目录自行重跑：

```powershell
pnpm run typecheck
pnpm test
pnpm run test:smoke
pnpm run test:acceptance
```

每轮 acceptance 创建新的 acceptance-output/run-* 目录，保存输入、原始 CLI 返回、视频、画面、PID 和状态证据。完整执行需要数分钟。

## 视频与完整性

- baseline：任务 77884ae9-d16b-4e78-9231-da10d92dcc05；694388 bytes；SHA-256 674b8011fc227b47c493f097fe424fc85c9f24e3dc091cb8db0a0ac3b187cc73；10 项媒体检查通过。
- modified：任务 148d9df5-f7aa-4059-a062-684e930a350e；714789 bytes；SHA-256 d084489b987781405ab2d2f26ec8e5b852e4d64e0bc7058074e380163e024062；10 项媒体检查通过。
- recovered：任务 2b83c858-75d1-47f7-82cd-812c21ee5ec1；726480 bytes；SHA-256 f7e0cc109d327d71243357066a41d91c1b45914992b2a859759c624adee6b12d；10 项媒体检查通过。
- cancel-resumed：任务 b805f4c4-7976-4f3c-9f54-022c975708f8；726003 bytes；SHA-256 db408531f537d4f91ef0be87ec2fdb97c4478a07b08c4c11c1e7901474d02853；10 项媒体检查通过。

上述 4 个视频的导出副本再次与任务中的内容哈希比较，均一致；每个 evaluation JSON 已另存到同一验收目录。state/jobs.sqlite 和所有 hash artifacts 保留，可查看完整持久化记录。原始 demo、旧测试结果和产品计划均保留。

## 画面检查和剩余边界

实际抽取第 2 秒进行标题与颜色对照；确认新文字和橙色生效，首屏未发现明显裁切或重叠。恢复/取消后的完整视频经过 FFprobe 和全片 FFmpeg 解码。样帧检查不等于最终创意质量评审，也未声称完成逐帧人工审片。

恢复与取消后的视频也抽取了真实画面：[恢复画面对照](../acceptance-output/run-eMfam7/recovery-comparison.png)，标题与本轮输入一致。

本次解决了此前缺失的真实渲染中途终止及真实取消覆盖。仍只在 Windows x64 验证；没有做长时间连续运行、断电、磁盘满、重负载或跨平台认证。进程清理证据覆盖本次记录到的 PID，不代表所有操作系统故障方式。当前没有本轮验收未解决的阻塞。

保持 M0 范围：未调用付费 AI API、未运行外部 GitHub 仓库、未部署、未开始 M1。
