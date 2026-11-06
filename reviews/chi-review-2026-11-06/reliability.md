# chi 预览 / J2 工程可靠性

- 角色：J2 reliability；定义 `reviews/judges-v2/common.md`、`roles/reliability.md`。
- 候选：`gve-chi-branches/work/chi-405-zh/chi-404-405.mp4`，SHA-256 `29a5e9008baef1713e3e144139f704e464a0aec09dfe387659ec7605e1e34e46`；任务 `b390669df8b6b8b135e120b1652a45c2b8d255a6cad559f70ff5df3b724b74e9`。独立检查；未读取其他 Judge 报告；未改动候选或共享代码。
- 结论：**UNVERIFIED**。能证实候选可完整解码，并存在可编辑映射；本次未验证候选渲染进程中途终止与恢复、跨设备恢复或最终交付闭包。明确标注为技术预览的包不能凭这些结果推断正式成片可靠性交付已完成。

| 条款 | 结论 | 本轮证据与限制 |
| --- | --- | --- |
| 文件身份与媒体完整性 | PASS（该项） | 对候选及 `editable-preview/.asset-staging-64d1c407-95b7-4826-ad19-988de334d491-pY5r7E/excerpt.mp4` 分别计算 SHA-256，均为上述值。FFprobe 实测 MP4 / H.264，720×1280，30fps；AAC 单声道、48kHz；43.3秒。`ffmpeg -v error -i <candidate> -f null -` 返回 0。未实际听音。 |
| 可编辑产物 | UNVERIFIED | `workspace-preview.html` 引向实际 bundle 的 `index.html`；index 链接 `excerpt.json`、`narrative.json`、`audio-ledger.json`，明确写有 `NOT A FINISHED VIDEO` 及视听/事实待审。本轮未在独立机器编辑、重渲或验证完整导出包。 |
| 故障与恢复 | UNVERIFIED（整片任务）；PASS（定向组件测试） | 在生成该候选的独立 checkout `gve-chi-branches` 中运行 `pnpm exec vitest run tests/tasks.test.ts -t "failed work cleans temporary output"`，退出 0：1 passed、10 skipped。测试写入 partial.mp4 后注入 retryable error，检查临时目录为空、第二次 attempt=2 成功且此前提交输入可验证。这是测试回调故障注入，不是对本视频真实 Remotion 渲染中途终止/跨进程恢复的证明。 |
| 并发、取消、跨设备、完整回归 | UNVERIFIED | 本轮未执行，不以历史报告或已通过的其他案例替代。 |

## 发现与复验

- **J2-01（证据缺口）**：没有本候选真实渲染中断后恢复、重启与输出完整性证据。影响：不能按正式成片可靠性要求签字。需要对候选副本进行真实渲染中途终止，验证子进程清理、已提交产物、状态恢复和最终媒体，再独立复验。
- **J2-02（证据缺口）**：未在干净环境或第二台电脑恢复可编辑项目并重导出；需要保留版本/源依赖的实际迁移验证。是否属于此次正式验收硬条件仍需以正式合同确认。

该报告仅覆盖运行可靠性与可复现性，内容事实、审美和声音自然度由其他角色或用户审阅。未更改候选、未运行目标仓库、未运行付费 API。
