# 队列时序 c2 遮挡范围独立可靠性复审

**判定：PASS。** 清单 SHA-256 66226c461f7e9390ca5c38e450648abef2d168494090d91733036e0e6fe3bd7a。199 个冻结文件与解包后的 3 个改动文件均与清单匹配。候选未修改。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个本地包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts` 退出 0，36/36。
- 以独立 c1 复验生成的状态作为只读输入，`pnpm exec tsx work/verify-occlusion-scope.mjs` 退出 0。七个旧 profile 2 任务的 status 和实际收据导出均与 c1 原报告字节相同；旧 profile 1 的历史失败报告同样按原 ID、报告摘要和退出行为读取。新 profile 3 的七例 fresh、cache、status、export 都保留 occlusion=unchecked，包含失败诊断；首轮使用新 ID，重复命中当前 profile 缓存。各检查区间、归属、截断与判定同 c1。直接诊断通过返回 0、失败返回 2，status/export 返回 0。日志见 work/judge-occlusion.log 和 work/proof 下各进程记录。
- `node --import tsx work/judge-occlusion-negative.mjs` 退出 0。分别验证哈希自洽的 scope=passed、scope 缺失、旧 profile 2 注入 occlusion，以及 queue 规格误配 profile 1。四种伪造均在 status 和 export 拒绝，未生成发布路径。报告重建捕捉字段变化，输入验证拒绝错配 profile。输出见 work/judge-occlusion-negative.log。

诊断的 occlusion 字段标记像素遮挡未检查。此次未生成视频，也未进行连续观片、听音、全套默认回归或硬杀恢复。
