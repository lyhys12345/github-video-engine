# URL explanation session c2 作者包独立可靠性复审

**判定：PASS。** 清单 SHA-256 为 e7d7cacceff5573801aaca20aa6a5c3aaf73169adedd4e5cc81717553cfe87c0。99 个冻结文件和解包后的 6 个 c2 改动文件均匹配清单。冻结候选未改动。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个缓存包，下载数为零。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/url-intake.test.ts tests/agent-authoring.test.ts tests/proposal-mapping.test.ts` 退出 0，13/13。
- `node --import tsx work/judge-packet.mjs` 退出 0。以空白状态和冻结 Fastify 快照构造受控 GitHub transport，重建同一提交、同一任务 ID、同一包摘要和 explanation-author-packet/1.0。受控调用只走仓库元数据、固定 commit、固定 commit README 与 LICENSE。生成包后无 workflow 数据库。重复 start 命中任务和收据缓存，且 transport 哨兵确认没有重新抓取。包内命令精确指向 explanation proposal 和相同任务，导出的 submission JSON Schema 与运行时 Zod Schema 的 JSON 导出深相等。
- 以包命令对应的真实 CLI argv 提交完成的 proposal 与 needs-evidence，分别返回 awaiting-plan 与 needs-evidence。后者 proposalHash 为 null。改变语言、快照或会话 ID 被拒，额外 nested path 字段被严格 schema 拒绝。状态输出重叠拒绝且无目录。重提 proposal 命中缓存，禁用媒体工具后新 start/author 的完成态 resume 也命中缓存。原始输出 work/judge-packet.log。
- 同一脚本对 c1 快照的独立复制执行离线导出。旧 Fastify 作者包的全部 12 个文件逐字节匹配原包，旧状态无 packetProfile。旧已完成预览以原 ID cb41c0c0127a362a50609473dae6ed3d9ec5bc56b8a393d8340644ac7eb51ec4 离线 resume，verified 且 cached true。
- `node --import tsx work/judge-profile.mjs` 退出 0。通过真实 TaskRunner 和 CAS 构造自洽闭包，未知 packet profile 被拒绝；修改请求后继续复用旧包摘要也被拒绝。status/export 都失败且无目录。恶意文档路径 ../README.md 在派发与抓取前拒绝。原始输出 work/judge-profile.log。

本轮没有发起新的 GitHub 网络请求或重新编码媒体。完整预览取消重试在 c1 独立报告验证；本轮复验 c2 对旧预览的完成态兼容。所有测试只用 explanation 收据路径，未调用旧通用导出。未执行完整默认回归或所有者视听验收。
