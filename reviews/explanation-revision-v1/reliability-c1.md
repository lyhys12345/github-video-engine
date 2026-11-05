# 预览修订 c1 / 独立 J2 与 J6 边界核验

候选 SHA-256 `ab615a6aa1f0839699b7fdd320d933561fc9bcf9b472a06b13d8d0c028d32b33`。源码提交 `e514b391858d31920502c2e6a9f8207db56d95b9`。在 Windows、Node 24 上以冻结状态的独立临时副本运行。结论为 PASS。先检查合同、源码和冻结原件，再运行自写脚本。结论依据本轮记录，不依赖其他 Judge 的结论。

| 条款 | 本轮独立证据 |
| --- | --- |
| 冻结版本 | 候选、源码 ZIP、9 个声明源码 Git blob、222 项冻结索引校验 SHA-256 与字节数通过。工作区初次按原始字节核验触发 Git checkout CRLF 差异，改用冻结提交的 Git blob 重验通过 |
| 父子绑定与缓存 | fd presentation 与 fastify manuscript 均复核导出的父/子 manifest SHA、子任务 ID；同输入返回原任务 ID 及 `cached=true` |
| 历史导出 | 两案的 base 和 revision 四个包重新导出，44、47、30、33 个文件逐相对路径字节哈希一致 |
| 输入与跨源边界 | 假父哈希返回 `EXPLANATION_REVISION_HASH`，替换为已存在的 p-queue author 返回 `EXPLANATION_REVISION_SOURCE` |
| 篡改与发布边界 | 隔离副本中翻转 fd 基线 MP4 一字节，从该基线派生的 revision 导出返回 `PRESENTATION_INTEGRITY`，发布目标未创建 |
| 链深 | 实际构造并读取第 2–8 层，第 9 层返回 `EXPLANATION_REVISION_DEPTH` |
| 并发及恢复 | 同输入并发的第二调用返回 `TASK_BUSY`；活动 owner 被取消后持久状态为 attempt 1 cancelled。新任务恢复为同一 ID 的 attempt 2 succeeded，再次提交命中缓存。另起进程重读 SQLite 事件链，确认 started → cancelled → resumed → succeeded，running=0，所属临时目录=0 |

## 原始记录

在候选源码 checkout 执行 `node --import tsx <绝对路径>/revision-reliability.mts`。审批允许沙箱外的独立本地状态副本执行 Windows 原子文件操作。主脚本退出码 0；另起进程的检查脚本与日志为 `revision-reliability-reopen.mts` 和 `revision-reliability-reopen.log`，退出码 0。主日志为 `revision-reliability.log`；初次 checkout 换行差异原始日志为 `revision-reliability-first.log`。另独立执行 `node ./node_modules/typescript/bin/tsc --noEmit`，退出码 0。

## 范围

候选和原冻结产物均只读。未运行 fd、Fastify 或 p-queue 仓库，未调用付费 API 或部署。此次并发为单机同状态的两个异步调用。未做压力测试、OS 级进程崩溃注入、跨机器验证或独立主观视听审批。

