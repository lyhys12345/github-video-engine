# 时序诊断独立可靠性与安全复审

**判定：PASS。** 清单 SHA-256 为 b2943e17d574f9b990bf55e53ffd6a837d9427facc41fdb5886a124aee4a2139。1483 个冻结文件的长度与 SHA-256、解包后的 7 个改动文件的 SHA-256 均与清单一致。冻结候选未修改。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个本地包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts` 退出 0，35/35 通过。
- `pnpm exec tsx work/verify-timing.mjs` 退出 0。独立复制各原始状态、禁用浏览器和媒体工具，从公开 CLI 对四个主案例及额外早期 cutout 声明重跑。原 rembg 无重叠且诊断失败，修订 rembg 61 帧、Express Huihui 71 帧均通过。较早 Express 首 cue 0 帧、后续 cue 28 帧分别失败和通过，聚合失败。旧 cutout 只能在选定事件至下一事件的窗内计量。任务均可以成功保存报告，同时诊断判定独立。精确规格和报告重导出、重复发布、同规格缓存及原预览字节均验证。报告 CAS 损坏拒绝，恢复后 verified。原始输出 work/judge-timing.log。
- `node --import tsx work/judge-negative.mjs` 退出 0。32,001 字节、无效 UTF-8、33 个 checks 均拒绝。分别伪造计划、语音、trace 父摘要和 cue/event 记录摘要，均在派发前拒绝。对真实父 trace 等长翻位，submit、status、export 均拒绝，未创建输出；恢复精确字节后 verified。人为注入 commit 阶段取消夹具，任务状态为 cancelled、诊断 unchecked，无法导出。以同一份精确规格重提保持任务 ID，第 2 次成功提交诊断 failed，再次重提缓存命中。原始输出 work/judge-negative.log。
- `node --import tsx work/judge-forged-report.mjs` 退出 0。通过实际 TaskRunner 和 CAS 写入一个哈希、任务身份及文件闭包自洽、但把 failed 改写为 passed 的报告。status、export 均因与父输入重新推导结果不符而拒绝，未创建输出。原始输出 work/judge-forged-report.log。

规格受 32 KB、32 checks、7,200 帧及严格字段上限约束，派生报告受 128 KB 上限约束。重复关系拒绝，重复视觉状态计算在同一推导内复用。每帧循环检查取消信号。TaskRunner 的 60 秒计时约束提交阶段，父读取与推导在计时之前并依赖各自预算和取消检查。未做满负载压力测试、真实进程硬杀或所有者视听验收。结果反映调用方声明和确定性画面状态模型，语音对齐保持 unverified。
