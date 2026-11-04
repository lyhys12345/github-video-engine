# FFprobe 路径稳定性独立可靠性与安全复审

候选清单 SHA-256 为 a07052f525a69e67981ab88edd46e203a29fe95ecfd5991de487fbf948409d43。1708 个冻结文件的字节数与 SHA-256 全匹配，解包后的唯一改动 runtime.ts 亦匹配。未修改冻结候选。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个包，下载数为零。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts tests/tts.test.ts` 退出 0，54/54 通过。
- `node --import tsx work/verify-probe-negative.mjs` 在独立副本退出 0。内部哈希一致的正确 fixture 可验证；原始文件名、null 文件名、缺 format、未知 profile、错误视频摘要、错误流几何均拒绝。旧取消和失败任务无法按旧身份续跑。原始输出见 work/judge-negative.log。
- 检查代码确认 profile 固定且参与任务输入身份，writer 去掉 format.filename 的同时保留原 probe 供正常媒体验证。新读取明确要求 format 是对象并拒绝任何自有 filename 属性。旧输入没有补默认值，旧成功记录由原规则按原清单字节验证。该兼容策略仍依赖实际记录的任务和 CAS 完整性，不是对任意自洽数据库的外部来源证明。

相关 P2 缺陷已写入此前 rembg c2 独立报告。复现为以同一 pristine 数据独立重跑两次 c2，比较相同任务 ID 和相同子 MP4 的两份完整子清单。唯一变化是随机 format.filename，却进入子摘要和序列身份，导致重复编码和缓存占用。固定输入身份是这次修复的验收项；跨独立 H.264 编码的字节确定性另计。

在两份冻结合并视频上，独立使用 ffprobe、FFmpeg 解码音频 streamhash、视频 framemd5 与 psnr 复核。双流时钟 JSON 和完整解码音频 SHA-256 完全一致。1,204 帧中 290 帧解码像素哈希不同，差异帧最低 PSNR 52.16 dB、均值 78.09 dB。这是已知跨独立 H.264 编码的限制。它不改变该两份输入身份，已提交产物通过自己的文件摘要独立校验。

## 实际重渲染及最终判定

**PASS。** 从冻结 pristine 输入独立运行 `pnpm exec tsx work/verify-probe-stability.mjs` 退出 0。真实渲染两条有声 rembg 预览和一条静音 Express 预览，均未命中已有缓存，三条原始 ffprobe 临时路径均不同。完整组装通过双流解码，1,204 帧、2,408,000 样本、10 条字幕。重复提交序列命中缓存。关闭媒体工具后完成态恢复命中缓存，旧序列六项载荷和旧子预览完整载荷逐字节保留，旧文件名及无 profile 的原始格式保持原样。原始输出见 work/judge-render.log。

`node --import tsx work/judge-compare.mjs` 退出 0。对照两份冻结独立运行与本次第三份运行，共九个不同临时文件。对应的三组子任务 ID、完整子清单内容、子清单摘要与子 MP4 摘要均相同。三次序列 ID 均为 71536d5dd5cace2fc5d2f62505437e2766418949255080c3876d73f6e6941648，PCM、VTT、字幕账本哈希相同。第三次组装 MP4 SHA-256 为 62ed1bfa426c6409319c294e661bd17ce3ad2f4abf25fdd86abe36c1601257ab，与两份冻结独立编码均不同。`node --import tsx work/judge-cache.mjs` 退出 0，在本次状态重提三个子预览，全部命中原任务缓存。日志见 work/judge-compare.log、work/judge-cache.log。

未执行全套默认回归、连续感知审核、人工听音或设备回放。
