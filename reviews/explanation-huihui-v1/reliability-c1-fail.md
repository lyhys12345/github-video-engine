# 有声 explanation session 独立可靠性与安全审查

**判定：FAIL。** 首次 SQLite 初始化时，Huihui v2 并发导入可能错误退出，初始化途中进程退出可留下正常入口无法恢复的状态。事务开始后的原子性、已初始化状态并发、媒体与历史兼容通过。清单 SHA-256 为 d3003aa01c9e25a0aad6feaff17869e740ac1b3b2f9dc4de16d920b34da1a243。453 个冻结文件和 12 个改动文件均与清单匹配。冻结候选未修改。

## 阻断项 F1

`src/tts/runtime.ts` 的 importHuihuiTts 先尝试 openState(data,false)。文件存在即打开只读连接并查 tts_requests。openState(data,true) 先创建 SQLite 文件，再单独执行 schema。处于两者之间的文件可被第二进程当作可读状态，但 tts_requests 还不存在。SQL 错误绕过缺状态处理，CLI 映射为 UNEXPECTED/permanent。若首进程在该处退出，后续导入不会走初始化分支。

- `node --import tsx work/judge-schema-race.mjs` 退出 0并确认缺陷。在只复制 generation 所需的 tasks.sqlite 与 CAS、没有 tts.sqlite 的独立状态，首进程打开新文件后由 preload 在首个 schema exec 前暂停 5 秒。第二进程直接走真实 CLI 同一生成任务，退出 1，报 no such table: tts_requests 和 permanent。首进程随后成功，第三次重试命中缓存。
- `node --import tsx work/judge-schema-crash.mjs` 退出 0并确认缺陷。另一独立初始状态，导入进程打开 SQLite 后、建表前实际以 88 退出。随后两次正常 CLI 均以 1 退出，报同样永久错误。该中断造成状态持续无法用正常导入入口恢复。日志见 work/judge-schema-race.log 与 work/judge-schema-crash.log。

严重性为重大可靠性问题。空状态首次导入是正常入口；该窗口的进程中断破坏正常恢复，并发调用也不总能读到胜者。未发现因此产生已提交半条用量记录或收费。

## 通过项

- 离线安装复用 219 包，`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/tts.test.ts tests/url-intake.test.ts tests/usage.test.ts` 退出 0，42/42。真实 FFmpeg 将 16,001 个源样本解码为 48,003。已有 schema 的测试覆盖收据 CAS 后取消与 SQLite outcome 插入触发器回滚。
- `node --import tsx work/judge-atomic.mjs` 退出 0。测试子进程已写入请求但尚未写入结果时强制 process.exit(87)。新连接确认没有请求或结果半行。已初始化状态的两个真实 CLI 并发提交，恰一份成功结果和一份零估算请求，两个调用读取同一胜者收据。合成历史有费 held 预留、旧 Huihui v1 held 和预算行在操作前后逐字段一致。首次独立脚本的校验查询错误地按 id 对 tts_policy 排序，修正后用全新状态复跑通过。日志见 work/judge-atomic.log。
- `node --import tsx work/real/verify-narrated.mjs` 退出 0。在冻结状态副本实测两条有声样本的缓存、离线读取导出、完整双流解码、音频父闭包和 PCM 重构。Fastify 437 帧、874,000 样本；p-queue 505 帧、1,010,000 样本。一帧溢出、错误父绑定和篡改 WAV 拒绝，精确恢复通过。日志见 work/judge-narrated.log。
- `node --import tsx work/judge-cancel.mjs render` 与 `node --import tsx work/judge-voice-cancel.mjs voice` 在两个独立状态分别取消真实 Remotion 和 WinRT worker，确认进程退出、临时目录及侧车清除。用新 CLI 进程恢复，同一外层及子任务 ID 第 2 次 verified。新渲染为 506 帧，语音第一项 generation ID 保持。日志见 work/judge-cancel.log、work/judge-cancel-resume.json、work/judge-voice-cancel.log、work/judge-voice-resume.json。
- `node --import tsx work/judge-history.mjs` 退出 0。旧真实 Huihui v1 收据摘要保留 68e8634c1fc7404bea449c764cb5b8386ef6d1c5961c5c89aad6d264239205ad；禁用媒体工具后旧静音 ID 完成态缓存及旧 MP4 原字节均通过。独立脚本以 receiptBytes 重算摘要。

未发起新的 GitHub 网络请求或实际付费合成。付费路径由现有模拟测试和历史预留验证。未做人工听音、设备回放、全默认回归或最大时长压力试验。
