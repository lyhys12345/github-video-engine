# rembg 有声序列独立可靠性复审

**判定：PASS。** 冻结清单 SHA-256 为 9f56f1752350bd65a63a16ae1f114f89ba538f4edb23b6a0b002d760dde88ca0。逐项核对 778 份冻结文件与 577 份解包源码文件，大小及 SHA-256 全部一致。冻结候选未改动。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 离线复用 219 个包。`pnpm typecheck` 退出 0。将 GVE_REMBG_INPUT_STATE 指向冻结 pristine 输入，依次运行 `pnpm exec tsx work/rembg-sequence.mjs` 和 `pnpm exec tsx work/verify-sequence-media.mjs`，均退出 0。冻结脚本在独立副本实际拼接，FFmpeg 取消后子进程关闭且临时目录消失。同一任务 68b137ce13a8ddab9253bf964faf209c4984f2c5f3d9cb57d2fc352725a96d25 第 2 次成功，再次提交命中缓存。
- 独立验证 1,116 帧与双流 2,232,000 声明样本。完整解码通过，两段子 PCM 及所有保留子文件与原件一致。10 条全局字幕与源账本偏移一致，72,000 样本的章节卡区间在原始 PCM 和解码音频中均为零。禁用媒体工具后状态、已完成恢复及重导出通过。已提交状态的 MP4、规格、清单、PCM、VTT、字幕账本六项逐字节一致。输出见 work/judge-rembg.log、work/judge-media.log。
- 错误父清单哈希在派发前被拒绝。对子 PCM 追加一个样本后 status、resume、export 均返回 PRESENTATION_INTEGRITY，未创建损坏导出；原字节恢复后通过。占用输出目录的哨兵不变。
- `node --import tsx work/judge-source.mjs` 退出 0。独立补测在 CAS 中将 editable/source-1.txt 翻转一位且保持 27,006 字节原大小。assemble、status、resume、export 均返回 PRESENTATION_INTEGRITY，派发哨兵未触发且没有导出目录。恢复精确原字节后重新校验通过。输出见 work/judge-source.log。

## 跨独立重编码

同一任务 ID 独立编码的 MP4 SHA-256 为 7e938699b6e1032b2fe573fcecb39c5ef4b152f921a1eb97aa333c5e3dece00f，冻结为 9b6378a0bf91fd371ac0f2f83b783cee6f59495d34f4278e31a3f02c852c93bd。使用 ffprobe 指定帧数、尺寸和时间字段，双方时钟 JSON 完全一致。用 FFmpeg 解码音频 streamhash，双方 SHA-256 均为 7f0790e81ddf36901f096ffa2bf8b50a86d22d66c414b1e98aaddea66f72ebe2。用视频 framemd5 与 psnr 比对，1,116 帧中 80 帧像素不同，第一子场景 59 帧、第二子场景 21 帧、章节卡 0 帧。差异帧最低 PSNR 51.78 dB、均值 58.70 dB。独立编码视频不具备字节确定性，同一已提交状态的缓存及离线重导出验证通过。

本轮未运行默认全回归、设备播放、人工听音或连续观片。测试使用既有录音及本地 FFmpeg。
