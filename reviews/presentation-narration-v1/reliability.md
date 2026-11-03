# J2 工程可靠性原始报告

**结论：PASS。独立标准依赖回归、真实旁白修订和恢复、历史兼容性均通过。**

冻结候选清单 SHA-256 0a3b53df40561913ad8cdc7caf6106257d49cd7a5de1c45676564f9eae0bb767。源码 head 20c435831267cb8de397cfd35f51f744bb8c9003，tree 0f9ceb3af0e081529296fce14d6e0e07f4bd0602。核对 553 个文件及两个源归档 SHA-256，零差异。两个归档均 507 个文件，58 处为换行差异，归一化后无内容差异。执行环境为 exact 归档的独立 scratch，使用正常离线 pnpm 锁文件布局，禁用安装脚本，运行现有可信本机引擎和工具。审查时独立读取合同、冻结文件、源码及机器可读原始输入，未使用 builder 或其他 Judge 的结论。

| 条款 | 独立复验 |
| --- | --- |
| 音频变更身份与原结果保留 | 从已成功 rembg 旁白复制绑定，将第一段前移一帧。实际绑定生成新 voice 任务。起点精确早 2,000 样本，剪辑长度和剪辑 PCM SHA 不变，整轨 PCM SHA 改变。再次绑定命中缓存，旧旁白按原 ID 命中缓存且视频仍 verified。 |
| 实际取消与清理 | 新旁白 render 发出真实工作器 spawn 后 2.3 秒注入 DOM AbortError。状态持久化为 cancelled、attempt 1、retryable，工作器 PID 41488 退出，无结果文件可导出，实际任务 tmp 项及其专属系统临时目录均消失。取消只针对本次启动的进程树。 |
| 恢复与预览缓存 | 相同任务 8566f1967ed87a82ff23b9d1065e67d54fe70337e5a2d74d42221614252afa78 重试成功并提交 attempt 2，状态 verified。第三次调用缓存命中。真实 FFprobe 数得 540 个 H.264 视频帧，并测得 48 kHz 单声道 AAC。FFmpeg 对两个流完整解码 exit 0。读取正规化剪辑逐段对比混音，全部裁片原样复制，所有空隙样本为零。 |
| 损坏闭合与恢复 | 对评审副本分别修改原音频、原导入 receipt、正规化 clip、混音及 MP4。前两者返回 INTEGRITY，后三者返回 PRESENTATION_INTEGRITY。逐项恢复精确字节后均重新 verified。首次脚本断言把 INTEGRITY 错列为 TTS_INTEGRITY，应用实际拒绝符合预期，独立复验脚本纠正断言并全通过。 |
| 不合法绑定与永久错误 | 真实函数拒绝交叉父计划、重复、缺失和转录失配。实际音频置于无法容纳的偏移时返回 VOICE_DOES_NOT_FIT，错误记录可用样本和所需帧。重提完全相同输入维持原 task、attempt 1、permanent 和 retryable=false。 |
| 碰撞与历史 | 已有占位目录拒绝，原字节保留。候选 CLI 重导出旧 silent、三拍 Story、旧 scalar，精确视频哈希依次为 93eb8bc70ffed1b89fd03629ac485f7ce02983b0db1e8fc33151ab1fab6b125d、9202e0577720604cf709c93467af2446ade1262bef98476ac244986fd193a306、66e00f28b5db372113ce6e9d2d3d173119165bb62b48540be070cf561abc3dfe。 |

真实证据包括 Node 子进程、Chrome/Remotion 渲染、FFmpeg 和 FFprobe、SQLite、CAS 及发布收据。音源为候选自带的实际本地技术录音，未重新合成或听辨。单元和默认回归中标为 MOCK 的媒体、provider 或审批均为模拟证据。未执行 60 秒上限的新实时旁白渲染、强制断电、跨主机和压力测试，也未单独枚举全部 Chrome 后代 PID。旧通用导出历史 major 与正常历史兼容性分开记录，见 security.md。语音真实性、语义、听感和 owner listening 仍由相应评审决定。

另用真实 FFmpeg 将评审副本原 WAV 降低 6 dB，保持同一声明文本和相同位置，重新导入和绑定。新原音 SHA、PCM SHA 和 voice task ID 均不同，147,793 个样本及起始样本 14,000 不变，旧 voice 仍 verified。首次附加探针的变量名错误只影响评审脚本，已纠正并重跑。保留原失败及复验日志。

独立 pnpm typecheck 成功。标准依赖布局的完整默认回归中，Vitest 46 文件共 382 项通过，Node mechanism 2 项通过且 1 项默认跳过。默认跳过的旧机制测试未另启 opt-in 实时渲染，历史复验是旧实际 MP4 的读取和导出。审查后 553 项冻结文件复核均无差异。原始运行记录和脚本见 evidence/。

