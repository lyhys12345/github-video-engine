# 多字幕 1.1 独立可靠性审查

结论：PASS。技术范围内无阻断项。候选工作目录为 C:/Users/luyuh/Documents/Codex/gve-multi-caption-v1。复验日期为 2026-11-03。候选源码及原始证据未修改。

## 执行记录

以下命令的工作目录均为候选目录。

1. `node node_modules/vitest/vitest.mjs run tests/presentation.test.ts`
   - 默认 Windows 沙箱退出 1，8 通过、2 失败。两次失败均在 `src/assets/store.ts:56` 创建测试 CAS 硬链接时返回 EPERM，发生在测试主体的持久化检查之前。
   - 获准以提升沙箱权限重跑完全相同的命令，退出 0，10/10 通过，Vitest 报告耗时 7.21 秒。测试覆盖 1.0/1.1 缓存复用、改动字幕时间后任务 ID 变化而 PCM 保持一致、两版语音文件重读、跨计划绑定拒绝、收据与覆盖范围检查、CAS 篡改检测及恢复、Unicode 字幕范围与非法文字及时间拒绝。
2. `node --import tsx src/cli.ts presentation resume --task f681cbfe0f77fed47dd45014e128f9ba73f3646b3cd97485120cfa5b3994c831 --data work/express-multicue-state`
   - 退出 0。真实 Express 1.1 持久预览返回 narrated、succeeded、integrity verified、cached true、attempt 1，480 帧、24 fps。
3. `node --import tsx src/cli.ts presentation resume --task 1d0585821f2e6c9087fa0ea70e8786ba23eee232a3d2cf084b18233b808f58b2 --data work/judge-legacy`
   - 退出 0。已有旧版 Queue 持久预览返回 narrated、succeeded、integrity verified、cached true、attempt 1，1059 帧、24 fps。
4. `Get-FileHash src/presentation/narration.ts,src/presentation/runtime.ts,tests/presentation.test.ts,docs/presentation-narration-v1.md | Format-List Hash`
   - 四个 SHA-256 均与 `work/express-multicue-evidence/source-hashes-unchanged.json` 一致。

| 文件 | SHA-256 |
| --- | --- |
| src/presentation/narration.ts | 7B5AB29ED6B6953520BDA585644FFD6F4AB17EC2E6AE401DB1FBF62E73B59AB4 |
| src/presentation/runtime.ts | 6BC2346628F5C7B3BE06001F04E47D83E4DBA820A30C3435532C62A79CA4EBC0 |
| tests/presentation.test.ts | 0868A6A7A36F8DD6B55A500F40610000E5A02B8496381ADC7BD2F0DDAB911E15 |
| docs/presentation-narration-v1.md | A8CFF6CF6D8B6B39156270E391059B5BBFC9681BBC73672100C9A43FFE39E982 |

## 审查范围与限制

读取流程验证计划和语音父清单、CAS 与重新派生文件。旧版语音沿用单字幕的时间舍入和原字幕格式。已完成任务的恢复重读经过实测。此次未触发进程中断后续渲染，未执行听音或连续画面目视检查。48 张诊断缩略图的上限可能省略高密度字幕的部分端点，渲染参数与 VTT 使用完整字幕列表。Express 原始证据另外记录了 4 个拆分点的逐帧检查。字幕时间为调用方声明，语音对齐和听音验收仍待审核。
