# 旧 PlanningPackage 通用导出停用独立可靠性与安全复审

**判定：PASS。** 清单 SHA-256 为 a9f84cbf89c2cc45e5d4ed08a81ee4e639c358bd2395cecea599f0378be6d383。源码压缩包、源码清单及 operator 文档哈希匹配，解包后的 641 个文件逐项核对大小和哈希全部一致。冻结候选未修改。

- 独立审读三个入口。project export 的拒绝在解析和打开 workflow 状态之前；WorkflowStore.export 方法体立即抛错，在调用方法前已由调用方构造的 store 不在该零访问范围；publishReviewExport 默认和 exactFiles:false 在处理目标或检查取消前立即拒绝。停用错误为永久 LEGACY_EXPORT_DISABLED。explicit exactFiles:true 的原生发布和 explanation receipt-v1 路径保留。
- `node --import tsx judge-normal.mjs` 退出 0。普通已存在历史输出和缺失目标夹具验证三个入口。直接真实 CLI 退出 1、stdout 空，stderr 为结构化永久错误，未创建 CLI 状态或目标父目录，已存在历史 review.md 名称和内容保持原样。测试使用普通目录，未编写竞态或绕过证明。
- `pnpm install --offline --frozen-lockfile --ignore-scripts` 离线复用依赖。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/workflow.test.ts tests/agent-authoring.test.ts tests/production.test.ts tests/repairs.test.ts` 退出 0，36/36 通过。包含现存状态文件哈希、历史计划与批准、保留历史审查文件，及实际可用作者包与提案收据。
- 禁用浏览器和 FFmpeg/FFprobe 后，从独立工作区执行 `./verify-existing-receipts.ps1` 退出 0。真实 CLI 首次及重复发布 Fastify 和 p-queue explanation 产物。Fastify 53 项、p-queue 63 项载荷与历史冻结原件逐字节一致，第二次重用同收据。原始记录在 receipt-regression/verification.json 及相邻进程输出。

本轮未重跑默认全套测试或媒体渲染。结论限于旧三个入口停用、历史保留和此次复验的现行发布路径。旧竞态历史记录未改。
