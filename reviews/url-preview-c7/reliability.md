# URL-to-preview candidate-7 / J2 Reliability

- **PASS（当前默认预览发布与本轮 final-delivery 回归范围）**。c6 已关闭的默认预览缺陷未复发。final-delivery 的目标读取竞态及动画故障测试屏障分别通过原输入对照。没有发现新 Major 或 Blocker。显式 legacy-v2 兼容限制保留；历史 c4/c5 报告不变。
- 主审验收观察 4，技术复核观察 3、6。frozen-c7 manifest SHA-256 274c43e69592159e7e271dcc471155c46319e7189df8b11942c8f444bfda3d62。628 项全部通过长度和哈希校验，其中 429 源、199 证据。独立递归清单精确闭合，两个 receipt 的版本文件精确闭合。见 hashes.log、closure.log。
- 2026-11-03，本机 Windows x64、Node 24.22.1、Remotion 4.0.538、本机 Chrome、FFmpeg/FFprobe。只写独立目录。复制运行状态用于重放，不当作冻结清单内容；其产物与冻结 receipt 及其逐文件哈希绑定。目标仓库未执行。候选与历史报告和坏输出未改。

## 条款与独立结果

| 条款 | 判定 | 证据 |
| --- | --- | --- |
| 4 默认 preview-export 的原 J2-PV4-01 | PASS | receipt-probes.log。无 publication flag，NTFS link 之前同尺寸改写 staging MP4，CLI 返回 ASSET_EXPORT_STAGE，不暴露固定 out/bundle；失败记录及坏版本保留，不能通过哈希闭合。同址重发新的有效版本，57 项文件与冻结证据相同。draft 替换、畸形 receipt、缺失版本及自洽伪造内容亦未被当作已提交，保留原字节。 |
| 4 同址恢复、重复发布及竞争 | PASS | receipt-probes.log、supplemental.log。真实 SIGKILL 在 link 前后分别触发恢复：link 前只有 draft/stage，六个真实 CLI 只有一个新发布；link 后、stdout 前退出，重试回传同一经复验的 receipt/digest 和 reused=true。常规重复也回传原版本。未知用户目录拒绝并保留数据。 |
| 4 final-delivery 目的地读取竞态 | PASS | baseline-race.log 对比 fixed-boundaries.log、focused-native.log。仅在独立基线副本恢复 c6 的 final-delivery 实现并使用同一个 c7 测试，旧实现实际误报 Existing delivery is incomplete。c7 识别并复用竞争者提交的完整目录，返回相同 manifestSha256，移除本次 staging。另一个并行相同输入测试得到一次 cached=false、一次 cached=true，相同 manifest，已交付文件逐项哈希且无 owned staging 残留。 |
| 4 动画导出进程终止证据 | PASS | baseline-animation.log、fixed-boundaries.log、focused-native.log。独立基线使用 c6 helper，c7 的 kill=true 断言失败，说明旧 helper 不能支持实际终止证明。c7 helper 保持进程活跃直到父进程真实 SIGKILL，测到退出 {code:null,signal:SIGKILL}。kill 前有真实可读的暂存 JSON，目标始终未发布半成品，同址重跑成功。 |
| 4 旧预览兼容路径、状态、缓存和 CAS | PASS（现代路径），已确认兼容限制 | durable.log、legacy-interference.log、legacy-crash.log。真实 Express/rembg 状态通过；Express 重复命中缓存，同尺寸 CAS MP4 损坏拒绝 status、默认 export、缓存命中。显式 legacy-v2 的固定 bundle 仍能在原竞争中坏掉，报错而同址永久拒绝；普通 staging 强杀仍可同址恢复。这是 c6 已知限制，旧 asset-export 未改。 |
| 3、6 技术媒体 | PASS（技术） | supplemental.log、frozen-media.log。两冻结 receipt 每份 57 项长度和 SHA-256 匹配，receipt digest 来自可信冻结命令回执。独立 FFprobe 和 FFmpeg 实际核对 H.264/AAC 轨道，Express 837 帧/27.9 秒，rembg 747 帧/24.9 秒，完整解码均退出 0。 |

## 原故障、复验方式和范围

- c6 旧 final-delivery 先进行一次缺失探测，再作独立存在判断。确定性观察注入在首次 lstat 实际返回 ENOENT 时，用真实目录 rename 放置已完整交付的竞争者结果。旧实现把该竞态转成永久不完整错误。c7 以一次 lstat 的缺失结果为该次观察，稍后在发布前或 rename 冲突后核验竞争者的 manifest 及文件。两实现用同一测试。实际文件读取、rename、manifest 校验和 SQLite/CAS 为真实，确定性调度注入，final-delivery 生产视频、供应商与评审均为 mock/fixture。
- 动画 helper 的 fs.link 屏障是测试注入，故障 child 内刻意不执行原始 link；创建真实暂存文件、读 JSON、进程 PID/退出信号、后续重新发布使用真实文件系统和进程。无渲染或视频结论。冻结的原 helper 探针另外记录 code 13 和 unsettled top-level await，修复 helper 探针记录 SIGKILL。本轮独立负对照直接观测旧 helper 的 kill=false。
- 预览导出探针用真实项目的已提交 c7 状态，真实 NTFS 写入、SQLite 锁、进程及 SIGKILL；IPC 仅固定 rename/link 边界。receipt 必须以成功回执或可信冻结清单的 digest 为基准验证全部文件。保留失败的最终命名 receipt 是诊断行为，文件名或可写目录自报的 digest 不证明成功。
- 已阅读冻结 full-regression.log（43 文件、370 通过）与 typecheck.log（退出 0）。这部分是候选冻结的原始运行日志。独立基线负对照均按预期失败，核心三个边界用例 3/3，扩大聚焦套件 4 文件、27/27 通过。未把全量日志记为本轮独立执行。story-preview fixture 使用合成来源和 tone，实际调用本机 Chrome、Remotion、FFmpeg 与 FFprobe。真实项目的视频证据另做完整解码。
- 未覆盖任意本机写者的全部 TOCTOU、实际断电、全部 Chrome 后代、预览 900 秒超时、真实尝试耗尽或旧 owner 接管后提交。没有实际听音、连续感知 AV 或 G6；这些保持待验。兼容导出限制与原坏输出保留。

