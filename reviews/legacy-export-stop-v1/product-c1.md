# 独立产品审查：停用旧 PlanningPackage 导出

结论：停用范围与错误含义在留存的正常 CLI 证据和源码中清楚；不能把其他导出或 status 视作旧 PlanningPackage 文件导出的等价替代。新操作的独立实时 CLI、其他平台及所有历史数据的兼容性 UNVERIFIED。

冻结 candidate SHA-256 a9f84cbf89c2cc45e5d4ed08a81ee4e639c358bd2395cecea599f0378be6d383；其 19 个 evidence 条目逐项核验大小及 SHA-256 全通过，source-exact.zip 哈希 8922583574831be49adf2c136839a0e9a0307663c97e9e2f819d5a587ed62c01 符合候选记录。此 manifest 使用 evidence 而非 files 数组。

## 产品影响与诊断

普通 `project export` 无论项目都直接返回永久 LEGACY_EXPORT_DISABLED，文案明确旧 PlanningPackage 文件导出已停用，并提示 project status 检查 stored revisions。源码在打开 state 前拒绝，留存实现者 CLI stderr 同此文案、退出码 1，记录缺失状态和输出目录均未创建；本轮未亲自成功运行 CLI。状态可提供项目、revision、approval history、事件和当前状态，但不是原 review 文件包，用户需要交付旧格式文件时目前没有等价替代，属真实功能减少，须在发布说明中突出。

`docs/url-intake-v1.md` 指示已有导出目录仍为历史文件、状态用来检查修订；`docs/operator-runbook.md` 提及 authoring 和 explanation 的独立路径。`project author`/`project export-proposal` 分别发布作者工作包或 proposal，不导出旧 PlanningPackage；其文档说明 native publisher 要本地 Windows 驱动器。`explanation export` 发布 explanation session 的 receipt 及关联输出，仅适用于该工作流，不是对任意旧 PlanningPackage 的迁移。留存 Fastify、p-queue explanation export 和重复导出记录分别显示 receipt-v1、review pending、reused true，验证摘要列出文件；这些是实现者执行的证据，不是本轮独立重放。未检查每类历史包和非 Windows 行为。

诊断可理解但轻微改进空间：错误建议 status，而没有在消息中直接说明没有等价 PlanningPackage 导出、历史文件仍可读取以及其他路径仅适用于不同产物；应链接简短迁移说明以免用户误以为 status 可生成文件。帮助列表不再列 project export，旧用户仍能从错误知道停用。

## 执行边界

独立解压了经哈希核验的 source-exact.zip 到报告目录；尝试使用已有离线依赖 junction 被系统拒绝访问，尝试 offline pnpm 恢复则报 SQLite store 无法打开；没有运行候选 CLI。未编写攻击复现、未修改冻结候选或共享源码。CLI 行为与两份历史 receipt 的结论限定于已保存原始结果和源码观察；正常新状态、已有 PlanningPackage 真实状态读取/旧目录读取、非 Windows 实测和其他替代命令实际导出均未独立验证。
