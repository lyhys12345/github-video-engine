# 旁白队列候选 J2 独立原始报告

**结论：PASS，限于冻结本机样本及复验的时序修订路径。**

候选清单 SHA-256 4b2d7debf53bbc7bffe7a590613dfe01b316fa3f823599ef5df50392cccf20b1。699 个冻结文件长度和摘要核对无差异。实际 main commit c78de74ec764211baab03bdd98ac15d5f513a970 的 tree 是 4304139991c185f39a85fa9a92e748ce0b9130ca。直接从 Git 生成的归档与 exact ZIP 的 541 个条目逐字节一致。对照已独立审查的队列 c2 canonical ZIP，原文件只改一份文档，另增 12 份评审 Markdown。运行、契约、测试代码和锁文件的 Git 内容均相同。两个 exact 归档还存在六项 CRLF 差异，其中五项是源码或测试，因此环境指纹仍按当前 exact 字节独立核验。使用独立 exact 归档、复制状态及标准离线 pnpm 布局，禁用安装脚本。

| 条款 | 独立实测 |
| --- | --- |
| 两部实际成片 | 真实 FFprobe 数得 1,059 和 603 帧，720×1280、24 fps H.264，配套 48 kHz 单声道 AAC。各自双流真实 FFmpeg 完整解码退出 0，视频 SHA 与候选清单一致。 |
| 音频与字幕闭合 | 十段实际原 WAV 独立重新解码正规化，每段 PCM 与归档逐字节一致。逐段核对原音、收据、参考 PCM 的摘要、混音里的完整切片和所有零填充。独立重建 VTT 向外取整时间和文本。实际解码 AAC 对齐样本和参考 PCM 的每片余弦相似度最低分别为 0.9999085 和 0.9999280。 |
| 缓存和离线发布 | 两部原电影同 ID 调用实际命中缓存。禁用浏览器与媒体工具路径后成功 CLI resume 保留原 attempt，离线 export 并再次复用。独立逐项核对 receipt SHA 和 80／62 个载荷原字节。 |
| 时序修订和旧绑定 | 独立将第一拍延长 2 帧，得到新计划 183fc752…。以旧 voice 对新计划尝试实际 render，派发前收到 VOICE_PARENT。按精确计划摘要重新绑定，新 voice 583b2595…，源录音和正规化 PCM SHA 保持，后续五段起点准确移动 4,000 样本，第一段不动，整轨摘要变化，重复绑定命中。 |
| 已有取消记录 | 从冻结复制的 SQLite 独立提取真实 synthetic task 5048aa9a… 的 events，同一 ID 有 task_started attempt 1、task_failed CANCELLED、task_resumed attempt 2、task_succeeded 以及对应 usage 序列。冻结工作器阶段记录为 rendering PID 37016。既有 verifier 记录了工作器退出判定。独立验证实际 attempt 2 成片和随后缓存。本轮未重做取消，未声称重新观察旧 PID。 |
| 损坏与保留 | 复制状态中分别破坏原录音、混音、MP4，真实 status/resume/export 都拒绝且无输出目录。恢复每项字节后 verified。普通非关联输出碰撞返回 ASSET_EXPORT_EXISTS，用户占位文件原字节保留。 |

独立 typecheck 通过，五个聚焦测试文件共 58 项通过。因为引擎源码的实质内容与队列 c2 相同，引用其独立历史格式、真实恢复和旧路径结果作为范围证据。未重跑默认全套，也未将更旧 c1 的 405 项记录当作本轮回归。没有运行目标仓库、合成新录音、使用付费服务、部署或外发。没有对语音内容、听感、声音身份、语义或 owner acceptance 作结论。

独立时序修订实际生成新影片任务 0ac046f51456ecf19a9daa85ebd188182a67fc28a4c0227273a02139712102d0。真实 FFprobe 读到 1,061 帧和 48 kHz 单声道 AAC，双流完整 FFmpeg 解码退出 0。重复命中该新任务缓存，旧影片 1d058582… 逐字节重导出，摘要仍为 61705aa28af8410a94cb835d477dccad901318ffcf6c657b154a3e559be89710。最后复核全部 699 个冻结文件，无改动。原始输出和脚本见 evidence/。


