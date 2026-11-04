# rembg 有声序列 c2 独立可靠性复审

**判定：PASS。** 冻结清单 SHA-256 为 e2a6b556ec7f4c22a0df2138d15ea69bacd86a2385f38c8be3829d67f41f13aa。858 份冻结文件与 577 份解包源码的大小、SHA-256 全部与清单相符。候选未修改。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个本地包，下载数为零。`pnpm typecheck` 退出 0。
- 独立运行 `node --import tsx work/frozen-verify-sequence-media.mjs` 和 `node --import tsx work/frozen-verify-comparison-frames.mjs`，均退出 0。脚本仅将输入改指冻结 MP4、输出改到独立副本。媒体审计重建 10 个全局字幕与偏移。声明 2,408,000 样本，解码尾填充 448 样本，章节卡 72,000 样本在原 PCM 与解码 AAC 中峰值均为零。两个对照片段在 [498,559) 和 [1118,1179) 各验证 61 个连续帧中两块画面和字幕同时存在。量化检查包含紧邻的前后帧及最终停留。
- `node --import tsx work/judge-offline.mjs` 退出 0。禁用媒体工具，复制状态中的 c1 和 c2 均可 status、完成 resume、export 及二次重用原收据。两代各自的 MP4、规格、清单、PCM、VTT 和字幕账本六份文件均与冻结原件逐字节一致。旧序列 MP4 保持 SHA-256 9b6378a0bf91fd371ac0f2f83b783cee6f59495d34f4278e31a3f02c852c93bd。
- `node --import tsx src/cli.ts presentation assemble --spec work/negative-evidence/sequence.json --data work/negative-state` 退出 0，返回 c3041f2474963a3000a8c330eb08ca12f8fe7327605dca87bd47b57abcef2965、verified、cached true、1,204 帧。
- `node --import tsx work/judge-source.mjs` 与追加 `pcm` 参数的一次执行均退出 0。在独立状态分别对固定来源文本和子 narration.pcm 翻转一位而保持原大小。两种情况下 assemble、status、resume、export 均返回 PRESENTATION_INTEGRITY，未派发、未创建导出路径。恢复原字节后通过。原始输出见 work/judge-source.log、work/judge-pcm.log。

使用的是两个同源修订场景与现有录音。量化窗口只建立画面与字幕同时出现及技术时间关系。未执行人工听音、连续感知验收、设备回放或默认全回归。引擎源码未变。

## 独立重渲染

从 pristine 输入完整执行 `pnpm exec tsx work/rembg-retime.mjs`、`pnpm exec tsx work/verify-sequence-media.mjs`、`pnpm exec tsx work/verify-comparison-frames.mjs`，三步均退出 0。独立生成的新计划与两个子预览 ID 相同，子 MP4 字节哈希相同，原两子完整文件哈希和旧合并 MP4 再次通过。新合并的 PCM、VTT 和字幕账本哈希相同，两段 61 帧窗口复验通过。独立新序列 ID bc6f3066cc5cf4b7915016d63e6d9cecc9373d6c49cc3dba853474d5e4f0fd7a，MP4 SHA-256 ffdbe5cfe801e0f789114b7ad18b6c88490295f36faeedff6ca569775860c03a，均与冻结 c2 不同。逐字段比较两个子预览清单发现仅 ffprobe format.filename 的随机临时路径不同。完整清单摘要参与序列身份，因此独立重渲染生成不同序列 ID；已提交状态按原身份读写和离线重导出仍逐字节稳定。原始输出见 work/judge-rembg-retime.log、work/judge-verify-sequence-media.log、work/judge-verify-comparison-frames.log。
