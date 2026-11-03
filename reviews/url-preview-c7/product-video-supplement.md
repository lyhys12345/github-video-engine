# C7 产品审查补充：改输入重渲染与工作子进程恢复

原始 `report.md` 不覆盖。经本轮新增独立验证，**J1 产品角色的本阶段非延期工程检查：PASS（限以下实际范围，无已确认 major）**。连续观看、听音、音画感知、G4/G6 和最终 owner 接受仍 **UNVERIFIED**，此处 PASS 不扩大为整体验收。源语义、音频逐样本与其他专项角色的结论不由 J1 代判。

冻结清单仍为 C7 manifest SHA-256 `274c43e69592159e7e271dcc471155c46319e7189df8b11942c8f444bfda3d62`；前轮 628/628 项哈希匹配。输出仅 `judge-product-visual-c7`；未改冻结候选、执行目标仓库、付费或部署。独立运行发生 2026-11-03 PST。

## 修改输入后真实渲染

原报告中两个修改动画资产分别为 Express `f7d32b615295f56a2bf2732019d3b9d793f05643e3974ed5562f821fe6875645` 与 rembg `1a58e542fe9cafd90c2acf952c58af418fe1838a7090dd36a371ca60edec8984`。本轮以各自资产实际执行 `story preview-render --mode silent`（默认诊断 presentation），均成功并以默认 receipt-v1 导出：

- Express 预览 `19cce10024d77068b185e8cfe91f020d2c7f214e6c649886de41de12f0752ca2`；MP4 SHA-256 `0f16e0dc27c7710e3e1515d0a0d8f532d020c96bcfb08b400edf3671bc25a93c`；receipt `71d7221a45cf95af92798e53fd992a7d60c70895b3e6d4083e2ed87475ce574a`。
- rembg 预览 `bb111019da33a83cfbf29c8024ca9575477bdbbb2a72b428af2465d4e4160410`；MP4 SHA-256 `a9bb5c6e83e24c21800e909a4cb27028c5e02bcf600b84b68eb95000b721025c`；receipt `3370b77d618e7ef1d08887c4ef0a441f777ed38690b59837eb36b12f3962db54`。

两个 receipt 的 34/34 文件哈希复核匹配，receipt 自身哈希与输出一致；实际用图像工具查看各导出 `samples/131.png` 和 `samples/108.png`，分别显示新标签 `Independent changed request label`、`Independent changed source image label`。新 MP4 与各自原预览字节不同；原资产仍可导出，rembg 原始预览 MP4 SHA-256 保持 `4b39a75c2d21266fdbf5d827aeec9ab02d8f70db3a9e28f63f2c023d44fe226f`；Express 原预览经历了原报告明确记录的独立导出篡改与再发布测试，原任务未改，恢复版本可用。以上验证不声称观众版 presentation 对任意编辑的适配。

## 实际工作子进程中断与恢复

对上述 Express 修改资产启动真实 CLI 父进程 PID 22532，观察其子进程 PID 42148 为本独立源码的 `short-segment/worker.ts`，在确认父子关系与命令行后仅强制终止该渲染子进程。原 CLI 返回 `PROCESS_FAILED`、classification `retryable`；`preview-status` 显示同一 preview task 失败、attempt 1。用相同资产与参数重试，状态曾显示同 task ID running、attempt 2，最终 succeeded，随后实际导出上列 MP4 与 34 项有效 receipt，样帧显示新输入。证据 `express-interrupt-pid.txt`、`express-interrupt-err.log`、`express-interrupt-status.log`、`express-resume-render.log`、`express-resume-status.log` 与 `express-changed-export.log`。此测试是**真实 worker 被杀并由存活的 CLI 报错后重试**；不是整个 CLI 被杀、lease 过期后的孤儿清理测试，不延伸其证明范围。

## 原始全量日志（实现者执行）

独立读取冻结 `evidence/full-regression.log`：显示 Vitest 3.2.4、43 个文件及 370 项通过、耗时 190.36 秒；包括 story-preview、URL intake、audience-preview、animation-task-adversarial 等。该日志 SHA-256 `840b2497ffc8a73a6d60a085a043185e024bed68f86fd8abde305a9d7c6edce7`；`evidence/typecheck.log` 记载 `tsc --noEmit; exit 0`，SHA-256 `a791b3f7748d796f9d21c7980d3b2dd2f97be07013f148e149c086e94e8c18a6`。日志及对应源代码列入 C7 manifest，内容和字节得到核验；**日志是实现者先前运行，本 Judge 没有重跑全套**，日志本身也不构成对当时实际执行源码字节的独立签名证明。它与本轮自主执行的两条路径、错误、输入变化、回执完整性和工作子进程恢复分开计证。

音轨聆听、连续观看和主观视听符合性依 owner 明确延期；不制造 PASS、G4 或 G6。真实 CLI 整体进程被杀和 lease 过期、连续 AV、修改输入后的 audience-v1 适配未覆盖；如这些以后作为单独验收要求，应另测。
