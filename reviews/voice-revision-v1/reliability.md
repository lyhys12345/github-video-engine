# 有声改稿候选 v2 / J2 工程可靠性

- 角色依据：reviews/judges-v2/roles/reliability.md、common.md；覆盖本轮真实有声稿、固定来源/父子绑定、取消恢复和重放、篡改拒绝与媒体完整性。具体行为依据 docs/explanation-session-v1.md 的 Revision 小节。
- 候选：39523c872f068d83f9f0c10b871db2360740ea3df95349748dc29b6d744644ba；源码提交 af374796dc5b44c16912d442f4dfe3cbe42e9f9f；源码 tar SHA-256 eeb63121e98c0bb0c9a50b2d858948735f3a9049bcf01f7341283fe8fd214ba0。
- 时间与环境：2026-11-04 19:59–20:03 PST，Windows PowerShell / Node.js 24，独立目录 C:/Users/luyuh/Documents/Codex/gve-voice-judge-v2。未改候选、原始状态或原产物。先审原始证据与源码，未读其他 Judge 报告。
- 结论：PASS，本次有声改稿工程范围。审听、实际口播内容、逐词对齐、音质/自然度与最终接受保留 pending 或 unverified。

| 核验点 | 判定 | 原始证据与方式 |
| --- | --- | --- |
| 冻结身份、基线不变 | PASS | media-integrity.log 复算候选、tar、全部清单条目、两个发布收据和全部包文件哈希。原包与原任务再导出均 44 文件逐字节一致，改稿 47 文件。 |
| 新稿与旧/新音频 | PASS | bindings.log；固定 sharkdp/fd cc4e40fa4e32d61733cd72926e233a3fb6c8d56d。两句中文均改；两个 beat 的声明稿、生成任务、源 WAV 哈希均更新，复算四个 WAV。来源包 source-2 第 32–37 行、source-3 第 308–313 行及 source-4 第 352 行支持默认过滤与选项关系，演示目录是合成模型，忽略规则仍单独控制。 |
| 源和子任务绑定 | PASS | bindings.log / cache.log；导出 revision manifest 固定基线、子任务、会话、提交、快照、证据、改稿和配音。直接读取冻结状态库的 child input，与 cancelled checkpoint 内 childRender 比较规范化内容，完全一致。隔离恢复的子任务同样与取消 checkpoint 精确一致。 |
| 媒体 | PASS | media-integrity.log；两个实际 MP4 各全解码退出 0，H.264 720×1280、396 帧、16.5 秒，AAC 48 kHz、16.5 秒；新版峰值 -0.4 dB，旧版 -0.6 dB。VTT 两句及分段边界更新；声轨非静音仅为信号证据。 |
| 取消、跨进程恢复、重复提交 | PASS | cancel-fresh.log / proof/interrupted.json：复制改稿前基线，独立 Node 进程产生真实 Huihui 改稿配音及取消的 revision，attempt 1。退出后新 CLI 进程恢复同一 ID 10aa48eb314429fb358b25b27a5aeff4d81baee6494e48e42345cc7ba93b6722，resume.log 为 succeeded / attempt 2 / cached:false。第三个进程重新提交相同编辑，cache.log 为同 ID / attempt 2 / cached:true。子任务 attempt 1，因此本次证实父 checkpoint 恢复并完成子任务，未证明中断活跃的子渲染后继续。恢复后 tmp 为空。 |
| 错配和篡改 | PASS | proof/negative.json / wrong-base.log。独立副本旧配音错配在公告前被 EXPLANATION_REVISION_VOICE 拒绝。错误父哈希在公告前被 EXPLANATION_REVISION_HASH 拒绝，原有任务均 succeeded、tmp 空。对新 WAV 第 128 字节 XOR 255，status/export 均 INTEGRITY，未产生 corrupt-export 目录；未改副本和被篡改副本中的旧基线均可用。 |

## 检查记录和边界

- 冻结 replay.log 对应同进程取消与恢复；冻结 cli-resume.json 是已成功任务的缓存读回。真正跨进程恢复证据为本报告独立生成的 cancel-fresh.log 和 resume.log。新试验任务 ID 与冻结 ID 分开记录，独立任务的渲染输入不替代冻结输入。
- cancel-fresh.mts 在候选 replay 脚本的取消步骤后停止；用候选引擎 CLI 的 explanation resume --task ID --data fresh-baseline 恢复；独立 check-cache.mts 校验子输入与重复提交。第一次沙箱运行硬链接 EPERM，见 cancel.log；独立 Windows 本机复跑按授权仅写本目录，成功退出。代码从冻结候选目录读取，脚本和状态均留本目录。
- 媒体命令为 ffprobe -v error -count_frames -show_entries stream=codec_name,width,height,sample_rate,nb_read_frames,duration -of json，ffmpeg -v error -xerror -i INPUT -map 0:v -map 0:a -f null NUL，以及音轨 volumedetect。均对候选新旧预览运行。
- 冻结 negative-first.log 是验证脚本的断言谓词失败，已捕获的实际 EngineError 为 EXPLANATION_REVISION_VOICE。冻结的修正后脚本在独立副本重新通过，且独立增加错误父哈希负例。
- 未强杀活跃渲染器，未运行目标 fd 仓库，未测试恶意本机管理员改写全套哈希。未发现本范围 blocker/major。
