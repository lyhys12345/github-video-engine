# Duration c2 — J2 可靠性独立复验

**结论：PASS，限于 c2 受影响本机路径。**

c2 manifest SHA-256 d3d0948fda6782cef33961a8c3b8695bb1ce0908c5b441b8ca325855487a80b4。679 个清单文件大小与 SHA-256 全匹配，两个归档摘要匹配，previousManifestSha256 绑定独立核验的 c1 清单。Git head 94df39dc2886e90ad554d1e9fc724bc15be5578f，tree 41dfd08d6a0dd8fd92b782a9e1606eea1f274091，直接父提交 b4b8ea9330e12c450b3d3bf07cccb03838883a70。c2 canonical 与 exact 两归档各 515 项，逐条内容相同。c1 exact 到 c2 exact 有 68 项原字节差异，其中 62 项只是行尾归一化，6 项为文档、CLI、presentation runtime、共享任务读取及测试。长工作器、编码和拼接算法、资源预算和声音算术没有实质变化。环境指纹仍覆盖源码字节，故现有成功任务的离线验证与新渲染身份分别核验。

独立用标准离线依赖复验，安装脚本禁用。所有运行使用 C:/Users/luyuh/Documents/Codex/judge-duration-c2-engineering/scratch，候选冻结文件只读。

- 冻结的 c2 成片实际 FFprobe 读到 1,842 帧 H.264、48 kHz 单声道 AAC，两流均 76.75 秒；双流 FFmpeg 完整解码退出 0。核对视频 SHA-256 e9d3b84616c8d7f3a39f7db6cda4e4ea460a2fb99f468b0fe0c254610b0d356f。
- 用同一可信本地 Chrome 的等效路径字符串产生独立任务身份。确实开始渲染第一段后取消，实际工作器关闭，独占系统临时目录消失。已取消记录自动识别为 narrated，attempt 1。切换回原工具指纹的恢复在派发前返回 PRESENTATION_RESUME_INPUT，失败后原状态逐字段相同。
- 旧 c1 的完整 386 项 Vitest 和真实 76.75 秒长渲染、300 秒计划及 28.8 MB PCM 边界是范围证据，见 c1 独立报告。c2 不声称重跑全套、重建 c1 或渲染 300 秒视频。本轮单独复验受影响的共享任务读取、CLI、旧 Story 及长任务 resume。标准离线 pnpm typecheck 通过，受影响的 presentation、short-segment、explain-runtime、story-preview 四文件共 38 项全部通过。

独立 CLI 矩阵共 47 次命令。plan、voice、preview、narrated 四种任务的 status 默认及显式正确 kind 一致，默认 export 成功。已成功的短静音、旧短旁白、c1 长旁白和 c2 长旁白，禁用媒体工具后仍可按原 ID 使用默认 status/export/resume，发布视频摘要与冻结来源一致。额外实际重导出三拍 Story 与 REA scalar，视频 SHA-256 精确等于原件。显式错误类型、非 presentation 任务、错误 ID、缺失任务、伪造哈希、哈希有效但形状不符的输入、原音字节损坏均被正确拒绝。恢复精确原音后重新 verified。受控普通导出碰撞没有改变占位文件。

恢复相同 Chrome 路径环境后，用无 --kind 的真实 CLI resume 重新渲染同一任务 ef525ab03d0b15f379f39565af08f303ba7b3545fb3188746ec81fc02df7927a，实际 attempt 2 提交并 verified。禁用媒体工具后再 resume 返回 cached=true 且 attempt 保持 2。恢复成片由外部真实 FFprobe 和 FFmpeg 独立验证为 1,842 帧、76.75 秒、48 kHz 单声道 AAC、双流全解码退出 0。独立新任务采用另一环境身份，成片 SHA-256 5e18c9d3ca1e70eeac73ad8f1bdcba954f2b3e9ffa6181f5eda8a4b76b576096，与原冻结 c2 媒体不同。旧记录的逐字节兼容性由相同旧 ID 重导出单独建立。最终重新核对清单 679 项均无改动。原始运行和测试脚本在 evidence/。


