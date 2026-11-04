# FFprobe 元数据回归补丁独立复审

**判定：PASS。** probe-metadata-test.patch 的 SHA-256 为 c6918a234b613701c6a1ceef95eb9cbbb62e15d114556033411a55bb83697b77。git apply --stat 与基线文件差异均显示仅 tests/presentation.test.ts 增加 66 行，原测试和生产源码未修改。git apply --reverse --check 在已应用补丁的测试副本通过。

新增测试用真实已提交计划和 CAS 保存合成预览闭包。旧分支以无 profile 的输入计算原身份，读取完整闭包时验证原始任务 ID、verified 状态、保留含 filename 的清单字节，并从任务存储核对输入仍等于原输入。新 profile 生成不同 ID，无 filename 的清单按原字节通过读取，带路径字符串或 null filename 的自洽闭包均按指定完整性错误拒绝。未知 profile 同样写成自洽闭包后，通过实际读取入口以预期输入完整性错误拒绝。测试未绕过闭包和父绑定检查。

从 C:/Users/luyuh/Documents/Codex/gve-preview-probe-regression-test-v1 运行 pnpm typecheck，退出 0。运行 pnpm exec vitest run tests/presentation.test.ts -t 'validates location-free preview metadata'，退出 0，1 项通过、12 项按筛选跳过。补丁使用合成 MP4 字节和探测记录，覆盖读路径、持久身份和拒绝分支；实际 FFprobe 写路径与重渲染由独立路径稳定性候选报告覆盖。本复审未改生产文件。
