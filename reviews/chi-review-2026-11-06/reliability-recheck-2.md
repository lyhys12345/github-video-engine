# chi 新版 / J2 可靠性独立复审

- 判定：**UNVERIFIED**。真实媒体及可编辑数据入口存在并能确认字节身份，但旧版 J2 对真实中断恢复、干净环境和跨设备恢复的证据缺口没有由这次复审消除；不能签正式成片可靠性通过。
- 受审视频：`C:/Users/luyuh/Documents/Codex/gve-chi-review/chi-audience-review.mp4`，SHA-256 `139b8f46a527e3f29b5459d034db87abe2efe8b132bd736af87a5da4598a024c`；独立计算与指定候选一致，bundle 内 `excerpt.mp4` 同哈希。
- 工程声明候选实现 `c4d0c6a`；本轮没有把代码哈希与视频独立重新编译比对，因此该代码到媒体的构建关系未独立证实。未读取其他 Judge 新报告、未修改受审文件。

| 项目 | 结果 | 本轮证据与界限 |
| --- | --- | --- |
| 文件身份与解码 | PASS（该项） | FFprobe：MP4、H.264 720×1280 30fps、AAC 48kHz、63.8秒；`ffmpeg -v error -i <candidate> -f null -` 实际退出 0。未听取音轨或评定自然度。 |
| 持久检查点与可编辑资料 | 部分通过 | `current-run.json` 所指 result 实际 SHA-256 `5eac443d42c849c1b208419fa83ae2c1ae2f31b92ffd76aa1ad635f42760a681` 与指针一致；状态 `editable-preview-complete`，任务 `89df154a2600e08deabf9fc19607f8609b4bce7c0892c3c9678cf9b4e420f2c8`。作者目录四个 JSON 存在；bundle 的 `excerpt.json`、`narrative.json`、`audio-ledger.json`、`fact-review/current-execution-packet.json` 均存在。只是文件存在和身份检查，未独立对其完整依赖做迁移、编辑重渲或校验全部内容。 |
| 交付状态 | 限制 | bundle 的 index 明确写 `NOT A FINISHED VIDEO`，并将听感、对齐、事实及连续视听标记为未验证；因此不得把实验包当已验收正式成片。 |
| J2-01 实际中途终止与恢复 | UNVERIFIED | 本轮未对该新视频进行真实 Remotion 中断、确认子进程清理、重启并恢复的试验；旧报告的合成故障测试不能替代。 |
| J2-02 跨设备/干净环境 | UNVERIFIED | 本轮未在另一台电脑、干净安装或迁移后重导出；资料链接存在不代表便携工程已验证。 |

首次 shell 检查因 PowerShell 空管道语法错误而未运行，纠正命令后得到上述结果；未将失败命令算作通过。未做全面回归、并发/取消压力、真实目标仓库执行、付费调用或主观听审。
