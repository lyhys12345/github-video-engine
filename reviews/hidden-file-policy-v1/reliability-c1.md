# Hidden-file policy 独立可靠性与安全复审

**判定：PASS。** 清单 SHA-256 d34af12c5434725bda538248fb6462642bc23abe60e20ebf7cdf897f9663b582。压缩包、源码清单、操作文档及 362 项证据匹配清单，653 份解包源文件的大小和哈希全部匹配。冻结候选未修改。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个本地包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/url-intake.test.ts tests/presentation.test.ts tests/concurrency-queue.test.ts tests/agent-authoring.test.ts` 退出 0，52/52。含受控传输的新版本生成、来源绑定、路径和树拒绝、模型、时序诊断不适用与旧流程回归。
- `node --import tsx work/judge-negatives.mjs` 退出 0。从独立新状态副本用真实离线 CLI 验证路径穿越、树自环和重复 ID、伪造初始状态及颠倒事件模式均拒绝。越界引用、具有正确哈希及准确文本但来自未选 README 的规则引用、提交 profile 降级均拒绝。实际固定来源确认 request 1.3、packet 1.4 和 capability 1.0；原作者提交命中缓存，既有渲染离线恢复命中缓存。原始日志 work/judge-negatives.log。
- `node --import tsx real/judge-fault.mts` 退出 0。复用冻结故障脚本，独立修订第一 beat 少两帧以生成新的 238 帧任务。真实 Remotion worker 到达 rendering marker 后取消，外层和子任务均 cancelled 且无提交产物。禁用网络的新 CLI 以相同外层 4be25f0530bfb765fa876bfea1778afa45d65fa3912bc98a86e28cac63dd7f51、子 7639b63ef8b0e2c59ac34b00eb34c83cca7b43592819466b71ca0e9bb916f4a7 恢复，第 2 次成功，单流 238 帧完整解码。再执行同规格的真实 render 返回 cached true。另一个副本的子清单损坏使 status/export 拒绝且未生成输出，独立原件仍 verified。日志 real/judge-fault.log 与 real/fault/verification.json。
- `./history/verify-history.ps1` 退出 0。五代旧包分别保留 10、13、14、14、17 项原字节，旧 fd unsupported 的 12 项文件逐字节相同。五代 profile/身份保持。另 `./history/verify-existing-receipts.ps1` 退出 0。旧 Fastify 53 项与 p-queue 63 项原字节匹配、重复发布重用收据。

本轮没有新 GitHub 网络请求，读取冻结来源和受控传输，目标项目未执行。树为作者合成示意，ignore 规则和实际目标行为未验证。未进行默认全套、连续视听或设备验收。
