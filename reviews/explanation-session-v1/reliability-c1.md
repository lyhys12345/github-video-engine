# URL explanation session 独立可靠性与安全复审

**判定：PASS。** 清单 SHA-256 为 4bd20c8aa55ce315d68e0e9b835fca4b5289dc1006a3d6fb043790f09283b898。296 个冻结文件和解包后的 9 个改动文件均匹配清单。冻结候选未改动。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 离线复用 219 个包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/agent-authoring.test.ts tests/url-intake.test.ts` 退出 0，25/25 通过。
- `node --import tsx work/check/judge-explanation.mjs` 退出 0。复制冻结状态与规格，重跑冻结脚本。唯一复现脚本改动是输出根重定位后验证相同 packet 任务 ID 和本副本的重复发布路径。替换 fetch 为会抛错的哨兵后，Fastify、p-queue、fd 的 start 均复用原身份，无新抓取。Fastify/p-queue author 和 render 缓存通过；禁用浏览器和媒体工具时 status、已完成 resume 和收据导出可用，重复导出路径相同。原 216 帧与 240 帧静音 MP4 通过 FFprobe 与完整解码。fd 保留独立 unsupported 作者阶段，导出带证据且无 MP4，render 以 EXPLANATION_BINDING 拒绝。错父提案和超时长计划拒绝。修改作者提案产生新任务和摘要，旧预览保持有效。子清单篡改后拒绝，原字节恢复后 verified。占用目录内哨兵不变。日志见 work/judge-explanation.log 和 work/real/verify。
- `node --import tsx work/judge-security.mjs` 退出 0。通过替换 fetch 实测只允许目标 HTTPS GitHub API、GET、无 Authorization、redirect:error 和带 AbortSignal。伪主机、凭据、HTTP 和非法 query 在 fetch 前拒绝。响应 403 限流、404、503 正确映射为可重试限流、永久 HTTP 失败和可重试 HTTP 失败。伪仓库 URL、路径穿越、0 秒和 301 秒在派发及抓取前拒绝。真实已提交快照 CAS 等长翻位使 status/export 拒绝且无目录，恢复后 verified。输出与状态目录重叠也被拒绝。日志见 work/judge-security.log。
- `node --import tsx work/judge-cancel.mjs` 退出 0。新 p-queue 计划设为原请求上限 12 秒；289 帧的副本在派发前返回 EXPLANATION_DURATION。288 帧计划开始实际 Remotion worker 后取消。worker 关闭、临时目录与侧车清理，父和子均处于取消状态。新 CLI 进程 resume 保持父 ID 593737c8590741818501e580509e64e93afd46dbe1b25594b9c639f6dcb79f37 和子 ID 3d47e33d0551aeee70570691dc78eceb494d04aea4afa72efb6e9f420da931fe，第 2 次成功提交 288 帧。再次关闭媒体工具后已完成 resume 命中缓存。日志见 work/judge-cancel.log。

本轮未发起新 GitHub 网络抓取。HTTP 约束和错误映射由本地受控响应复验，原公开抓取的快照以冻结字节验证。未模拟真实网络超时、硬杀租约或连续观片。全程使用 explanation 收据发布，旧通用导出路径未调用。目标仓库源码始终作为证据数据。
