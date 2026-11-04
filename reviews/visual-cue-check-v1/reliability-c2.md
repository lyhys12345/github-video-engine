# 时序诊断 v2 独立可靠性复审

**判定：PASS。** 冻结清单 SHA-256 为 1951af4ca1208146aafefd1f1aa9e19bf1dd34da92b7f7fc1ffda5439aab2146。77 个冻结文件与解包后的 3 个改动文件全部匹配。timing-check.ts 的哈希与独立 v1 解包副本完全一致。冻结候选未修改。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个本地包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts` 退出 0，35/35 通过。
- `pnpm exec tsx work/verify-cli-exits.mjs` 退出 0。独立复制四份父状态、禁用浏览器与媒体工具，以实际 CLI 分别执行 fresh、cached、status、export。两例通过均 fresh/cache 退出 0，两例失败均 fresh/cache 退出 2。失败仍输出完整 JSON、状态 succeeded、诊断 failed，并持久保存可读取的报告。四份状态与导出均退出 0，报告与 v1 原字节一致，任务 ID 一致。独立复制的旧 v1 失败报告缓存命中并退出 2，畸形规格退出 1 且不输出成功 JSON。原始 stdout、stderr 和退出码在 work/proof，汇总见 work/judge-cli-exits.log。
- `node --import tsx work/judge-retry.mjs` 退出 0。模拟提交阶段取消以建立独立的未完成任务，随后所有读取、重试和导出均由真实 CLI 子进程执行。取消状态 exit 0、diagnostic unchecked，取消产物导出 exit 1 且未创建目标。同规格重提保持 ID，第 2 次成功提交 failed 报告，exit 2。再次重提命中缓存，exit 2。完成态 status 与 export 均 exit 0，发布报告字节与新报告精确匹配。日志见 work/judge-retry-log.json。
- 在同一个已完成的失败任务独立执行 `pnpm gve presentation timing-check --spec work/proof/rembg-early/timing-spec.json --data work/proof/rembg-early/state` 和 `pnpm --silent gve` 加同参数。两个 wrapper 均传播退出码 2；silent stdout 通过 JSON 解析，包含 failed 和 cached true。

CLI 修订只在直接执行 timing-check 并已获得诊断结果后设置 process.exitCode，status/export 仍可成功读取历史失败诊断。复审未模拟操作系统实际 Ctrl+C 或硬杀，也未重跑默认全套测试。没有媒体重渲染或所有者视听验收。
