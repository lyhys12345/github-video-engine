# 烧录字幕布局独立可靠性与安全审查

清单 SHA-256 b4e0172e8aaa7c2b90985551b04b56c4dc9c2b32fd1fa0c7991e7988d2e5ae29。逐一校验 1054 个冻结文件的大小及哈希，另核对解包后 6 个改动文件，零差异。冻结候选未改动。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个缓存包且下载数为零。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts tests/tts.test.ts` 退出 0，58/58 通过。字幕布局测试覆盖混排、ASCII token、UTF-16 边界、补充平面汉字、两三行及过宽、缺字形和不支持字素。
- `node --import tsx work/verify-caption-rejection.mjs` 在隔离副本退出 0。来自冻结产物的独立克隆用于自洽哈希伪造。错误和缺失范围、未知 profile 均被拒绝；旧未完成任务不能按旧身份派发。原始输出 work/judge-rejection.log。
- `node --import tsx work/judge-cancel.mjs` 退出 0。从独立复制的旧版状态新渲染，取消真实运行的 Remotion worker。进程关闭、临时目录及侧车消失。任务 d2c44e1f4e244a57f5666810c3a2eaa912978f2cd654fc8a51c93f75427c48e0 第 1 次为 cancelled 且 retryable，第 2 次以相同 ID 成功，重提命中缓存。原始输出 work/judge-cancel.log。

实现核对：字体在解析 cmap 和 advance 表之前核对固定哈希并限制 30 MB。选择断点以字素为单位，映射回原 UTF-16 偏移，复算用于完整清单校验。浏览器按相同字体、字号、字重、空格、方向和连字设置实测宽度。文字通过 DOM textContent 或 React 文本渲染。布局仅接收完整验证的语音 cue，继承 100 字符权重、每 20 个录音至多 40 cue、音频/视频及帧上限，再限制最多三行。没有把复杂脚本或任意 Unicode 纳入支持范围。未执行最大 cue 数、最长视频或硬杀后租约的压力试验。

## 媒体验证与最终判定

**PASS。** `pnpm exec tsx work/verify-caption-layout.mjs` 退出 0。真实重渲染保留 Huihui、混排 Huihui 和三行中文样本，逐项完整解码、对照行数、确认范围拼接为原文、复验缓存，并以媒体工具关闭状态恢复历史和新任务。保留 Huihui 的 WAV、PCM、VTT、语音清单与旧状态相同，旧与新 MP4 的解码 AAC 字节相同。旧预览仍能按原身份读并导出。对照冻结，三条新预览各自的 MP4、PCM 和 VTT 摘要均完全相同。混排和三行的独立新导入任务在生成相同媒体后，其导入收据和内部 artifact 的 createdAt 变化。归一这两项后各对收据相同；其未经归一的收据摘要进入语音与预览身份，故这两条任务 ID 跨独立导入有差异。同一状态内缓存不受影响。

在独立解包副本中翻转固定字体的末尾字节且保持原大小，禁用媒体工具后运行 `node --import tsx src/cli.ts presentation status --kind narrated --task d2c44e1f4e244a57f5666810c3a2eaa912978f2cd654fc8a51c93f75427c48e0 --data work/final/state`，返回 PRESENTATION_INTEGRITY 和 Pinned presentation font differs。恢复原始字体字节后返回 verified。未做人工听音、连续感知验收或设备播放。
