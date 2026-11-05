# c2 独立可靠性与安全复审

候选 SHA-256 为 `d5c048b908da3a2183f713b7dd516cd55ce492ce159a962e72ffed28e6a9049d`，源码为 `b6bdb17b00c3b042722a44beb6c9a2b5cdb96ff4`。验证候选、源码 ZIP、直接引用及冻结索引全部 204 项的字节数与 SHA-256。

- **版本和复绑。** 三个 c2 样片均声明 narrated layout/2，布局哈希和预览任务 ID 与相应 c1 layout/1 不同。c2 预览的计划与语音任务引用匹配同案 render checkpoint。依据冻结的 trace、evidence 和源码重新验证引用字节，fd 两案均为 32–37 行，ripgrep 为 177–191、196–198 行。
- **旧布局读取及回归。** 在隔离的状态副本上，c2 代码实际读取、命中缓存并重新导出三份 c1 与三份 c2 产物。六套导出均与对应冻结产物逐相对路径哈希一致，c1 和 c2 各 131 个文件。
- **音源和时长。** 独立完整解码三份 MP4，时长为 16.5、16.875、16.5 秒。WinRT Huihui 生成及导入凭据、源 WAV 和重新采样的 PCM 均匹配，混音重建逐字节相等，c2 混音也与对应 c1 混音逐字节相等。实际 AAC 音轨和混音的样本相关性为 0.999960–0.999989。
- **损坏拒绝。** 在隔离状态内分别翻转 MP4 和源 WAV 的最后一个字节，发布分别返回 `PRESENTATION_INTEGRITY` 和 `INTEGRITY`，两个目标目录均未创建。

临时导出需要 Windows 原子文件操作，已批准在沙箱外运行隔离副本。初次断言把 MP4 损坏的错误码写成通用 `INTEGRITY`，实际为 `PRESENTATION_INTEGRITY`。修正断言后全套通过。未改候选、未执行 fd 或 ripgrep、未调用 TTS 或付费服务。朗读语义、自然度及逐词对齐不在本次技术复审结论内。

原始日志为 `reliability-c2-media.log`、`reliability-c2-runtime.log` 和 `reliability-c2-runtime-first.log`。
