# 独立可靠性与安全审查

候选 SHA-256 为 `a2377c4008888730898ec611b6d114660a5f8047f26e744cb5ea6c7d9b7c8390`。以冻结索引、原始证据、三份 MP4 和干净的候选源码 `b17ac9a67c1a5f5caa78faa9fb05b2194b9be7bd` 为输入。运行测试的状态是临时副本。未执行 fd 或 ripgrep，未调用生成服务或付费服务。

| 核验 | 独立结果 |
| --- | --- |
| 冻结完整性 | 候选、源码 ZIP、冻结索引及其 158 项文件、清单直接引用的文件全部通过 SHA-256 与字节数检查 |
| 音轨完整性 | 三份样片 720×1280、24fps，H.264/AAC 单声道 48kHz，完整解码成功。时长 16.5、16.875、16.5 秒 |
| 音源、时长及实际封装 | 逐段匹配 WinRT Huihui 生成记录、导入凭据与 WAV 哈希。独立 FFmpeg 重采样与冻结 PCM 逐字节相等，以各段起点重建的混音完全相等。最终 AAC 解码与该混音的样本相关性为 0.999960–0.999989。凭据记载无远程派发、无请求 ID、预估成本为零 |
| 版本隔离 | 三个案例的请求均为 1.4，叙述规格均为 1.1。实时验证旧规格标记、错误 voice preparation SHA 和放置空间不足分别返回 schema、binding 和 voice-fit 错误 |
| 旧产物 | 五个新旧导出目录逐相对路径比对，181 份文件哈希一致，涵盖两份静默、一个不支持路径、两份旧 Huihui |
| 已有缓存 | 隔离副本中已有已完成任务 resume 返回相同任务 ID、attempt 1、cached=true |
| 篡改拒绝 | 隔离副本中翻转源 CAS WAV 一个字节，导出返回 INTEGRITY，目标目录没有创建 |
| 取消恢复 | 冻结日志和状态记录同一任务 attempt 1 cancelled → attempt 2 succeeded。独立新任务在隔离副本中同样由 attempt 1 cancelled 恢复至同一任务 ID 的 attempt 2 succeeded，重复 render 返回 cached=true。Windows 沙箱内硬链接 EPERM，经批准在沙箱外使用隔离副本复验通过 |

音频来源结论依据生成与导入记录及实际 WAV、混音、封装音轨的字节或样本关联。朗读内容、自然度和逐词对齐属于另行人工审查。候选的机制测试日志有一项媒体用例跳过。

原始证据见 reliability-media.log、reliability-runtime.log、reliability-runtime-sandbox-temp.log 和 reliability-runtime-sandbox-workspace.log。对应脚本为 reliability-media.mjs 与 reliability-runtime.mts。

