# 冻结候选独立可靠性与安全审查

**判定：PASS。** 本次复验未发现阻断项。候选清单 SHA-256 为 74929d7e32245343e3373d8ec6fdf3d5cea241113e7552352b281ae2c90f8bda。独立复核清单所列 555 份文件长度与哈希，零差异。由 source-exact.zip 解出的 6 个改动文件同样零差异。冻结目录未修改，全部测试及篡改操作位于本报告同目录的副本。

## 实测记录

命令从本报告目录执行。Windows 默认沙箱禁止 pnpm 项目注册符号链接，也禁止发布收据硬链接。对应命令以获准的沙箱权限在审查副本中重跑。

- `pnpm install --offline --frozen-lockfile` 成功复用 219 个已缓存包，下载数为零。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts tests/story-preview.test.ts` 退出 0，33/33 通过，耗时 73.17 秒。既有 story-preview 回归文件包含 legacy-v2 预览发布测试。本审查的序列发布专项只调用 sequence-export 的 receipt-v1 路径。
- `node --import tsx work/judge-adversarial.mjs` 退出 0。该脚本由冻结证据中的 sequence-adversarial.mjs 复制，只将导出 bundle 引用改为审查副本中的本地相对路径。损坏子 MP4 后，status、resume 和 export 均拒绝，且无输出目录。恢复原字节后校验通过。已有非受管输出目录被拒绝，哨兵字节保持一致。更改当前 rembg 快照后新任务以 STALE 拒绝，历史已完成的任务仍可重读。结果见 work/sequence-evidence/adversarial-verification.json。
- `node --import tsx work/judge-cancel.mjs` 退出 0。该脚本从冻结 smoke 的取消段改写，另复制状态并使用新场景 ID 触发新任务。真实 FFmpeg 拼接时取消，进程关闭，工作目录不存在，任务 6795b54526ae1e85f0c331ca6276e88ba117f7dd3a3254a2f24ab06641ebfeac 第 1 次显示 cancelled/retryable。resume 以同 ID 第 2 次提交 983 帧的结果，复用同规格获得 cached true。原始输出见 work/judge-cancel.log。
- `node --import tsx src/cli.ts presentation assemble --spec work/sequence-evidence/negative-CASE.json --data STATE`。cross 使用 work/sequence-image-state，dup、narrated、wrong-sha 使用 work/sequence-queue-state。四次均退出 1，依次返回 PRESENTATION_SEQUENCE_SOURCE、PRESENTATION_SEQUENCE_DUPLICATE、PRESENTATION_SEQUENCE_MODE 和 PRESENTATION_SEQUENCE_MANIFEST。另将 cross 错指向 queue 状态也被拒绝，返回 EXPLAIN_TASK。
- 将 GVE_FFMPEG、GVE_FFPROBE 分别设置为 judge-does-not-exist-ffmpeg 和 judge-does-not-exist-ffprobe。`node --import tsx src/cli.ts presentation VERB --task 7ac30f22f840ce6510b8b4033f9ab9549f461528c500a943a4c88ce4486e4a0b --data work/sequence-queue-state` 的 sequence-status、sequence-resume 均退出 0，后者 cached true。sequence-export 额外使用 `--out work/judge-offline-export`，默认沙箱在收据硬链接处返回 EPERM。获准后在同一输出路径重跑成功，第二次复用同一收据，SHA-256 为 20015685a0900769ad5e456b67f140ff4d3d171eadfa1fba50daa6bcc74f18b1。
- 同一 sequence-export 指向 `--out work/sequence-queue-state/judge-path-rejected` 退出 1，报 Output and task state overlap，目标目录未创建。将 assemble 的规格分别改为 `--spec work/judge-traversal.json`、`work/judge-five.json`、`work/judge-oversize.json`，对应场景 ID ../escape、5 个场景、超过 32,000 字节。全部退出 1，前两项为 PRESENTATION_SEQUENCE_SCHEMA，超长文件为 EXPLAIN_INPUT。

## 实现检查与范围

任务身份绑定规范化后的有序子清单、来源绑定和工具链。父任务逐项验证文件闭包、CAS 字节和绑定，汇总检查 7,200 帧及 160 MB 子文件限制。160 MB 是总验收限制，各子任务依自身文件及闭包上限读取后才计入汇总，不能将 160 MB 当作进程 RSS 上限。MP4 写入采用 FFmpeg 80 MB 输出限制，提交前再次读取检查并进行完整解码。正常取消和已完成重读已实测。此次未执行四场景、300 秒或 160 MB 的边界压力试验，未模拟硬杀后租约过期，也未做连续画面或人工验收。
