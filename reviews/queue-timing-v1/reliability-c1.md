# 队列时序诊断独立可靠性与安全复审

**判定：PASS。** 冻结清单 SHA-256 为 ba3022463042593f63b97cdbd6c2f56276e9bb2e0306876cdc770b43295fefe3。139 个冻结文件的大小与哈希和解包后的 4 个改动文件全部匹配。冻结候选未修改。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 离线复用 219 个包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts` 退出 0，36/36 通过。
- `pnpm exec tsx work/verify-queue-timing.mjs` 退出 0。从独立状态副本用真实 CLI 重跑七项诊断、缓存、离线 status 与收据导出。task-3 等待窗 [187,217)，另一任务启动引起位移并截断，静止窗 [206,217) 满 11 帧通过、12 帧失败。无关并行事件不截断同一位置，running、fulfilled、rejected 分别验证 93、125、150 帧重叠。提前 cue 为 0 帧。仅变更 exact subject 就改变身份。错误归属的真实任务、伪造摘要、错误 outcome 和未知 state 均拒绝。留存预览清单与 MP4 字节保持，18 张边界 PNG 从原 MP4 解码。输出见 work/judge-queue.log。
- `node --import tsx work/judge-model.mjs` 退出 0。用独立 v2 解包源码作基线，对真实 p-limit 1,059 帧与明确虚构样例 603 帧逐帧深比较，输出完全一致。诊断判定要求卡片在目标槽或列、不移动、全不透明，未计算其他卡片遮挡。证据中的 313 帧交叉只用于说明这个边界。
- `node --import tsx work/judge-queue-negative.mjs` 退出 0。先将独立脚本字段名从 cutoff 校正为持久格式中的 interruption；候选没有改动。真实 TaskRunner 与 CAS 写入哈希自洽却去掉中断并延长窗口的报告。真实 CLI 的 status 和 export 均拒绝该报告且无输出。父 trace 等长翻位导致 status 与重新提交拒绝，恢复精确字节后 verified。合成取消提交夹具的状态为 unchecked；重提精确规格在同一 ID 第 2 次成功保存 failed 报告，返回 2，缓存命中也返回 2。日志见 work/judge-queue-negative.log。
- 在禁用媒体工具的独立状态执行 `node --import tsx src/cli.ts presentation timing-check-export --task 138538bd7b05f169844d729537a7c6e13c36bba5cc282b7c3bc8b88757357822 --data work/proof/legacy-state --out work/judge-old-export`，退出 0，实际发布的旧报告 SHA-256 为 df46d618eaec365d83fbd2e64a9e47804b73da87519a297399d5b654bcd6d917，与 v1 原件一致。其状态退出 0，重提命中原 ID 且退出 2。

未执行真实硬杀、最大场景压力测试、像素遮挡验证、连续观看或听音。诊断描述卡片位置状态模型及作者声明。目标仓库代码未执行。
