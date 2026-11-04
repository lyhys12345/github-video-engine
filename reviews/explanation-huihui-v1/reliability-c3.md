# 有声 explanation session c3 独立可靠性复审

**判定：PASS。** 冻结清单 SHA-256 为 ccfd2d582965d9dd2c964ca4bf93a6a52bc343f6c9904b500d13cb9e49444c0f。562 个冻结文件与解包后的 3 个相对 c2 改动均匹配清单。冻结候选未改动。

## 原 F1 重验

在独立副本保留原 c1 复现的进程注入时机，改用 c3 源码并断言修复行为。

- `node --import tsx work/judge-schema-race.mjs` 退出 0。首次导入打开新 TTS 库，在 schema 前暂停 2 秒。两份真实 CLI 同时提交同一生成任务，均成功，恰有一次命中缓存、胜者收据完全相同。后续重试仍缓存。原 c1 同位置曾令第二进程永久报错。
- `node --import tsx work/judge-schema-crash.mjs` 和 `node --import tsx work/judge-transaction-crash.mjs` 均退出 0。真实 CLI 分别在建表前以 88 退出，在请求 INSERT 后、结果 INSERT 前以 87 退出。各自在独立新状态测试，后续首次标准导入成功、第二次命中缓存，无人工修复。原 c1 建表前退出曾导致正常入口持续失败。
- `pnpm typecheck` 退出 0。`pnpm exec vitest run tests/tasks.test.ts tests/explain-runtime.test.ts tests/tts.test.ts` 49/49 通过，含 16,001→48,003 奇数样本、TTS 回滚和 held 行原语义、旧版约束、SQLite BUSY 及 Windows 路径边界。

## SQLite、WAL 与路径

- `node --import tsx work/task-lock-proof.mjs` 退出 0。真实独占锁提前释放时 CLI 成功；长时间持锁时退出 1，结构化 TASK_BUSY/retryable。阻塞进程墙钟约 7.97 秒，包括 CLI 启动和前置工作。锁释放后真实 CLI 成功。12 组普通双进程试验无永久锁错误，同请求只有一个任务身份。输出见 work/judge-lock.log 和 work/lock-proof/verification.json。
- `node --import tsx work/wal-race-proof.mjs <CHECKOUT> retry` 与 `busy` 均退出 0。以真实 TaskRunner 事务在大小检查与读取之间让 WAL 从 53,592 增长至 107,152 字节，一次变化后返回旧任务 verified。连续三次实际增长耗尽预算，返回 EXPLAIN_BUSY/retryable。同一实验对普通文件执行长度改变，仍返回 EXPLAIN_INPUT/permanent。输出见 work/judge-wal-retry.log 与 work/judge-wal-busy.log。
- `node --import tsx work/judge-path.mjs` 退出 0。WAL 为目录、WAL 达 64,000,001 字节、状态祖先为 Windows junction 均按预期永久拒绝。额外尝试创建 Windows 文件 symlink 在本机返回 EPERM，改用 junction 复验重解析祖先。没有放宽符号链接条件。

## 历史和媒体

`node --import tsx work/judge-history.mjs` 退出 0，旧 v1 Huihui 收据及旧静音会话媒体原字节一致，已完成状态离线缓存。使用冻结 c3 状态副本运行 `node --import tsx work/real/verify-media.mjs` 退出 0，两份 c2 历史收据导出的所有载荷与原件一致。两份 c3 媒体通过真实 FFprobe 和完整双流解码，PCM、VTT 和可编辑 trace 与 c2 原字节一致。此处验证冻结媒体，没有重新渲染。未运行默认全套回归、人工听音或设备播放。
