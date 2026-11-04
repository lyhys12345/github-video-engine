# 标题卡序列 1.1 独立可靠性与安全复审

**判定：PASS。** 未发现阻断项。复核候选清单 SHA-256 为 97fbaeb09bfa026a6f395d7979305b25d815e45943a8957cf4a012f4b23cb146。逐份校验了 643 个清单文件的字节数和 SHA-256，零差异。另核对从 source-exact.zip 解出的 6 个改动文件，零差异。冻结目录保持原样。

## 独立执行记录

以下命令均从本报告目录执行。仅对离线依赖安装和测试所需的本地硬链接启用获准的沙箱权限。

- `pnpm install --offline --frozen-lockfile` 成功复用本地 219 个包，下载数为零。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts` 退出 0，32/32 通过，10.24 秒。
- `node --import tsx work/judge-cancel.mjs` 退出 0。脚本取冻结 smoke 的取消测试段，用 v1 状态副本与全新场景 ID 执行。实际 FFmpeg 拼接进行时取消，确认子进程关闭、任务工作目录清除。任务 16966d1765510b2111911e996c5fdcac90422e1ac6feeeb2cad8b09132fb8757 第 1 次为 cancelled 且 retryable，第 2 次以同 ID 恢复成功并验证 1,019 帧，再次提交返回 cached true。输出见 work/judge-cancel.log。
- `node --import tsx work/judge-history.mjs` 退出 0。由冻结 history 脚本派生，禁用 FFmpeg 和 FFprobe，检查旧 1.0 和本审查新生成的 1.1。两者均通过 status、已完成 resume、收据发布及重复发布。实际字节比较覆盖 1.0 的 sequence.json、sequence-manifest.json 和 sequence.mp4，全部与 v1 冻结导出一致。日志中的布尔摘要沿用模板写为 true，1.1 分支没有执行这项旧档比较。旧版规格新提交拒绝且未派发，返回 PRESENTATION_SEQUENCE_VERSION。
- `node --import tsx work/judge-titles.mjs` 退出 0。拒绝 12 类非法规格，包括 FFmpeg 选项片段、路径分隔符、表达式标记、换行、Tab、22 字符、首尾空格、非 ASCII、路径穿越的场景 ID、5 个场景、缺失卡片和额外卡片属性。32,001 字节规格返回 EXPLAIN_INPUT。导出路径与状态目录重叠被拒绝且未创建。合法标题 Slots (one), now. 实际成功编码，产生不同任务 ID 76352a99a3445b086a066df3df4b32faf83262647c7142875a4fc72cf90a3638。再次提交命中缓存。导出清单的卡片区间为 [528, 564)，字体摘要与解包字体实际 SHA-256 相符。输出见 work/judge-titles.log。

## 实现检查与验证边界

标题数据写入独占创建的编号文本文件，drawtext 使用生成的文件名和 expansion=none。用户文本和路径字段无法直接进入滤镜语法。规格、字幕卡时长、合并帧数和字体读取都有界限。章节卡计入 7,200 帧验收上限。子文件总量 160 MB 属于验收限制，不代表 RSS。80 MB MP4 上限和完整解码验证仍在提交路径上。任务 ID 绑定标题和字体哈希，恢复前重新计算任务身份，提交前再核验工具链。已完成 1.0 的读取和发布可用。旧版未完成任务的重新执行按新版合同拒绝。

未执行最大帧数、最大体积或四场景压力试验，未模拟硬杀后租约过期，未做连续画面验收。本次序列发布测试只调用 receipt-v1。
