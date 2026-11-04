# Express 混合 1.0/1.1 语音账本序列独立复审

**判定：PASS，记录跨独立编码的 H.264 字节与像素差异。** 清单 SHA-256 为 e55aef9c427b30cbf543515cbeb11d7d769a4e5ac9e7f08f4018b58bec7805df。逐项核对 777 份冻结文件与解包源码清单的 568 份文件，字节数与哈希均一致。冻结候选未修改。

## 独立执行

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 离线复用 219 个包。将 GVE_EXPRESS_INPUT_STATE 指向冻结 pristine 输入，依次运行 `pnpm exec tsx work/express-sequence.mjs` 和 `pnpm exec tsx work/verify-sequence-media.mjs`，均退出 0。脚本在审查目录创建独立状态并真实编码。两子任务的完整计划、预览与语音闭包通过校验，五项作者绑定一致，共用计划及四段录音，PCM 原字节一致。旧语音 1.0 提供 4 条实测 clip-level cue，新语音 1.1 提供 8 条 caller-declared cue。全局 12 条 cue 的文本、ID、样本位置及 VTT 毫秒舍入通过重建验证。完整两流解码通过。字幕卡区间 [480,516)，原 PCM 与解码 AAC 在 72,000 个样本的区间峰值均为零。关闭媒体工具后 status、完成 resume、离线重导出通过；同一已提交任务的六项输出逐字节一致，重复提交命中缓存。原始日志为 work/judge-express.log 与 work/judge-media.log。
- `node --import tsx work/judge-negative.mjs` 退出 0。错误预览清单摘要、重复子任务、手工注入 voiceTaskId、历史完整闭包失败均在派发前拒绝。旧候选 19c33c26… 返回 PRESENTATION_INTEGRITY，原始历史字节未改。选用完整校验成功的后续 1.0 子任务。对 1.1 子任务 PCM 原大小翻转一个字节，status 与 export 均拒绝，未创建目标。恢复原字节后重新校验通过。输出见 work/judge-negative.log。

## 独立编码差异

重跑得到相同任务 ID 7feb23c449d709805a977ef1883e7b7c0ee5fe8701ac821e52df1532669243e6，PCM、VTT、字幕账本 SHA-256 与冻结完全一致。冻结 MP4 SHA-256 为 eb2d32dc0a4fedaf5c141de73959c8c0d9754f4dbe97da19605eab703d54b893，独立编码为 ed37848d6c8033d58ec8cdad639cabf87edf2e56eef8db64927e8645e5d3b1a9。用 FFmpeg `-map 0:v:0 -map 0:a:0 -c copy -f streamhash -` 及去掉 `-c copy` 的解码版分别比对。两份的 AAC 包流和完整解码音频样本各自逐字节一致，H.264 码流与解码像素有差异。使用 `ffmpeg -v error -i INPUT -map 0:v:0 -f framemd5 -` 与双输入 `psnr=stats_file=work/psnr.txt` 比对，996 帧中仅第 386–479 帧像素哈希不同，差异帧 PSNR 最低 61.08 dB，均值 75.67 dB。章节卡及第二子场景逐帧完全相同。ffprobe 两份时钟 JSON 完全相同：720×1280、24 fps、996 帧，H.264 与单声道 48 kHz AAC 均从 PTS 0 开始、时间基 1/48000、时长 TS 1,992,000。

该差异局限在第一子场景尾部的 H.264 编码及解码像素，未改变音频、章节卡、场景边界或帧时钟。现有技术验收要求同一已提交状态可缓存并离线重导出，该项实测通过。跨独立编码的 MP4 不具备字节确定性。本轮未执行人工听音或连续画面感知验收，也未重新进行取消和最大资源压力试验。
