# GitHub Video Engine — M0 实施与验收报告

本文件保留首次实施时的 24 项测试记录。随后完整验收、真实渲染中途终止/取消测试、错误提示修复和最新测试数量，见 [M0-acceptance-report.md](M0-acceptance-report.md)。

日期：2026-10-25，America/Los_Angeles。

**结论：本机 M0 基础执行链路已实现并通过所列实测。累计 24 项自动测试通过，0 失败，0 跳过；真实 MP4 已生成并检验。没有进入 M1。** 这不代表生产级高可用或所有平台已经认证。

## 工作区与保留情况

开始时本聊天目录只有空的 `work/`、`outputs/`；已登记项目列表为空，当前目录也不是 Git 仓库。相关 Codex 目录中没有找到现成 GitHub Video Engine 代码。

新建独立本地 Git 仓库：

```text
C:\Users\luyuh\Documents\Codex\2026-10-25\referenced-chatgpt-conversation-this-is-an\outputs\github-video-engine
```

未设置 remote、未提交或推送、未部署。源代码文件尚未 Git commit，可直接审阅。

找到原 `github-video-workflow-plan.md` v7，并原样复制为 [product-plan-v7.md](product-plan-v7.md)，原文件未改动。原件与副本 SHA-256 均为 `103194efff0e66f6e11db0fde7f6e41fbe91f8f16f9605678d977f6bbf0fe200`。原聊天读取只返回占位符；随后以用户在本聊天提供的完整 M0 正文为权威规格实施，没有继续猜测原规格。

## 实际文件与组件

| 位置 | 实现 |
| --- | --- |
| `src/contracts/`、`schemas/` | 七类严格 Zod 契约及 v1.0 JSON Schema |
| `src/core/` | 稳定哈希、分类错误、无 shell 子进程和进程树终止 |
| `src/orchestrator/` | SQLite WAL、五阶段任务、检查点、事件、租约、防并发、重试、缓存、恢复 |
| `src/assets/store.ts` | SHA-256 寻址、同卷硬链接原子提交、拒绝覆盖、完整性校验 |
| `src/renderer/` | Remotion 接口/适配器、独立 worker、可编辑 React 动画模板 |
| `src/evaluation/media.ts` | FFprobe 参数检验和 FFmpeg 全片解码 |
| `src/providers/local.ts` | 本地依赖发现和执行环境指纹，无远程 AI provider |
| `src/cli.ts` | doctor、render、jobs status/resume/cancel |
| `examples/demo.v1.json` | 12 秒标题 → 架构图 → 收尾示例 |
| `tests/` | 合同、编排、文件系统、进程恢复/取消及真实媒体测试 |
| `demo-output/` | 实际视频、帧图、报告、manifest、任务数据库副本 |

采用一个 pnpm workspace package 和明确的逻辑模块边界，未创建空的微服务或无用 package。结构与取舍见 [architecture.md](architecture.md)、[contracts.md](contracts.md)、[decisions.md](decisions.md)。

## 实际视频与持久化任务

- 可播放文件：[demo.mp4](../demo-output/demo.mp4)，**694,388 bytes**。
- 格式：MP4 / H.264 / yuv420p，720×1280，30 fps，360 帧，12.000000 秒。
- 音频：无音轨，与 fixture 的 `audio.mode="silent"` 一致。
- SHA-256：`674b8011fc227b47c493f097fe424fc85c9f24e3dc091cb8db0a0ac3b187cc73`。
- 主验收任务：`9126497d-cf8b-4e65-ada4-f804a75d68fc`。
- 独立安装 CLI 新建任务：`405a64a3-9b94-4a29-a2d5-dd0e7456ec84`。
- 便携状态样本：[jobs.sqlite](../demo-output/persisted-job/jobs.sqlite)，旁边保留所有 hash 命名 artifacts。
- [FFprobe/解码检查](../demo-output/evaluation.json)、[manifest](../demo-output/manifest.json)、[任务证据](../demo-output/smoke-proof.json)、[已打包状态检查](../demo-output/packaged-job-status.json)。

副本从已经关闭、无 WAL 待写文件的数据库复制；复制后再次执行 `jobs status`，校验所有引用的文件。原运行记录和开发失败记录仍保存在本机 `.gve/` 与 `test-output/`，没有伪装成成功运行。

抽取并查看第 2、6、10 秒真实帧：[三场景总览](../demo-output/storyboard.png)。标题、架构节点/连接和收尾信息均可见。自动抽样第 3、20、60、180、300 帧，五个解码帧哈希不同，记录见 [frame-hashes.txt](../demo-output/frame-hashes.txt)。这提供动态变化证据，不替代未来产品的完整人工审片；本次没有声称完成逐帧美术验收或最终 REA 成片。

## 自动测试实际结果

| 测试文件 | 数量 | 执行性质 | 结果 |
| --- | ---: | --- | --- |
| `core.test.ts` | 18 | 契约、真实 SQLite/文件系统；编排中的媒体 renderer/evaluator 为显式 mock | 全通过 |
| `recovery.test.ts` | 5 | 真实独立进程、SQLite、进程树终止；视频数据为显式 mock | 全通过 |
| `smoke.test.ts` | 1 | 真实 Remotion、Chrome、FFmpeg/FFprobe，多个新 CLI 进程 | 通过 |
| **合计** | **24** | **0 失败、0 跳过** | **通过** |

记录来源：[完整一轮 23 项原始 JSON](test-results.json)、[补充后最新 5 项恢复测试 JSON](recovery-results.json)、[去重汇总](test-summary.json)。恢复测试由原来的 4 项扩展为 5 项，最新记录替代旧记录；24 是三个最终测试文件的唯一用例总数，不把重复执行累加。日志见 [test-run.log](test-run.log)、[recovery-run.log](recovery-run.log)。最终 `tsc --noEmit` 通过，`pnpm peers check` 没有兼容性警告。

### 已验证的关键行为

1. **契约**：有效 fixture、独立 SceneSpec；未知版本、非法尺寸/fps/时长、重复 ID、缺失资产、额外字段、非支持音频模式均被拒绝。
2. **持久化与阶段顺序**：五阶段按序执行；关闭/重开 SQLite 后任务和输出仍在；已提交 step 的更新/删除受数据库约束保护。
3. **故障恢复**：分别在 VALIDATE 完成后，以及 RENDER 正在写临时文件时，真正强制终止 worker。另一个进程在活跃租约期间被拒绝。租约到期后由全新进程恢复，原 VALIDATE 哈希和 attempt 保持；未完成 RENDER 增加一次 attempt，临时残留被清除。
4. **真实渲染恢复**：Remotion 实际产生 MP4 并提交后注入 retryable failure。新 CLI 进程从 VERIFY_MEDIA/PUBLISH 继续。最终成功，RENDER attempt 仍为 1，未重新渲染。
5. **重试**：瞬时故障可恢复；永久故障不自动重试；连续瞬时故障只执行两次，后续 resume 不重置预算。
6. **取消与超时**：通过真实 `jobs cancel` CLI 请求取消正在运行的任务，确认真实父/子进程均终止、无输出被当作成功、临时目录清空；恢复复用旧检查点。另用真实等待子进程验证超时和两次尝试上限。
7. **去重/失效**：相同 spec 返回同一个 job ID；重复 render 不增加尝试。改 style 生成新任务、使 RENDER 失效，但复用不变的 RESOLVE_ASSETS。改运行环境拒绝旧计划恢复。资产内容不匹配声明哈希时明确失败。
8. **原子性/完整性**：并发提交相同大块数据指向同一路径；不留下成功的 partial artifact；损坏 blob 被发现且拒绝覆盖；路径越界被拒绝；失败 evaluation 保留证据且不 PUBLISH。
9. **实际媒体**：10 项检查全通过，包括容器、流、编码、像素格式、尺寸、帧率、帧数、时长、静音约定、全片解码；5 个采样帧确认图像变化。
10. **CLI 错误码**：不存在任务、非法 spec 返回非零；正常 doctor/render/status/resume/cancel 经实际进程调用。

## 全新安装验证

在 `work/clean-install` 新建独立目录，只复制源码、fixtures、schema、package/lock/config，没有复制 node_modules。

实际执行：

```sh
pnpm install --offline --frozen-lockfile
pnpm run typecheck
pnpm run doctor
pnpm gve render --spec examples/demo.v1.json --data .gve
pnpm gve jobs status 405a64a3-9b94-4a29-a2d5-dd0e7456ec84 --data .gve
pnpm gve jobs resume 405a64a3-9b94-4a29-a2d5-dd0e7456ec84 --data .gve
```

全部成功；从本机已缓存的 219 个包安装，零网络下载。新任务状态 succeeded，恢复仍 succeeded，RENDER attempt=1，所有哈希有效，视频 SHA-256 与主验收视频相同。这不是空缓存或全新操作系统测试。

证据：[安装日志](clean-install.log)、[doctor 日志](clean-doctor.log)、[CLI 证明](clean-cli-proof.json)。

## 其他实际执行命令

```sh
pnpm install
pnpm install --frozen-lockfile
pnpm run schemas
pnpm typecheck
pnpm test
pnpm run test:smoke
pnpm peers check
pnpm exec vitest run --reporter=default --reporter=json --outputFile=docs/test-results.json
pnpm exec vitest run tests/recovery.test.ts --reporter=default --reporter=json --outputFile=docs/recovery-results.json
pnpm gve jobs status 9126497d-cf8b-4e65-ada4-f804a75d68fc --data demo-output/persisted-job
```

另运行了 FFprobe、完整 FFmpeg 解码、framemd5、场景帧抽取和 SHA-256 文件检验；精确媒体检查参数保存在 `src/evaluation/media.ts` 和测试源码。

## 实际遇到的失败与修复

- 最初受限进程无法访问 npm DNS；获准的普通本地执行访问后安装成功。
- pnpm 11 要求显式 `allowBuilds`，最初安装因 esbuild 安装脚本被忽略而退出失败；改为 `allowBuilds.esbuild=true` 后成功。
- 一次误用 `pnpm doctor` 调到了 pnpm 自身诊断，不是引擎命令；文档统一使用 `pnpm run doctor`。
- 受限环境对硬链接返回 EPERM；普通本地执行权限下真实原子提交测试通过。doctor 现在也检查这项能力。
- 初次 Remotion 打包不识别 `.js` 指向 TypeScript 源文件；配置 extensionAlias 后解决。
- 真实媒体最初为 yuvj420p，检查正确判失败；增加显式 FFmpeg 限幅/像素格式归一化后全部通过。
- webpack/schema-utils peer 版本不匹配；固定 webpack 5.112.2，重新安装、类型检查和真实渲染验证后无 peer 警告。
- 一次读取系统进程列表受限，未将其当作测试证据；进程清理证明使用独立测试保存的 PID 和实际存活检查。

这些早期失败均未计入最终通过结果；实际失败的运行没有被声称为成功。

## M0 验收与边界

版本化 VideoSpec、真实 MP4、FFprobe 检验、跨进程持久化/恢复、检查点复用、防并发、原子提交、缓存失效、取消/清理、全新目录 CLI、自动测试、README/架构文档均有对应实测或交付证据。当前没有阻碍本机 M0 使用的未解决环境问题。

仍然存在的限制：

- 仅 Windows x64 实测；macOS/Linux 未测试。Remotion 平台与许可检查记录在 ADR，不能把 npm 包可用当成跨平台验收。
- 单机、可信本地用户、有限并发。SQLite/WAL 和原子链接没有经历电源断电、磁盘满、网络盘或超大任务压力认证。
- 只支持 10–15 秒固定布局、静音和本地 PNG；长文本/不同宽高比可通过结构校验但没有完整视觉质量保证。
- 租约 30 秒、每 stage 最多两次总尝试；没有管理员强制解锁或重置重试预算的命令。
- 代码/工具变化后要求重新提交，缓存失效较保守；浏览器指纹是文件路径、大小和修改时间，没有锁定完整浏览器/字体镜像。
- 应用层不可变不防本机管理员直接篡改。哈希会发现损坏，不自动修复；崩溃留下的无引用 blob / `.partial-*` 没有自动垃圾回收。
- 支持的本地 adapters 配合 AbortSignal；任意未来注入的自定义 adapter 不能因此获得自动终止保证。parent-death watchdog 已实现，但未做长时间/高负载故障压力验证。
- 真实 Chrome/FFmpeg 正常渲染已实测；取消测试使用真实进程树但 mock 媒体，并未宣称覆盖所有 Chrome 崩溃方式。
- 两次编码有额外成本；本次少量重复渲染哈希相同，不承诺跨主机字节级一致。
- 无 AI 研究、付费 API、真实 GitHub 仓库执行、用户账号、G1–G6 产品流程、生产级美术、部署或自动发布。

## 后续建议（未实施）

M1 需先明确范围。建议从只读仓库研究及证据契约、一个受控适配器、与 v7 审阅节点的最小连接开始；任何真实仓库运行、付费 provider 或生产视频都应另行授权。基础设施后续可优先补跨平台持续测试、存储垃圾回收/备份和更严格的渲染环境固定。本轮不自动开始 M1。
