# C2 产品与视觉独立复审

候选 `C:/Users/luyuh/Documents/Codex/gve-revision-c2-final/work/c2/candidate.json` 的 SHA-256 实测为 `89cdb40ca08c97820c3930d7a303c8530c65de8fd25dd24b7b0352e7182ca6e7`，与指定值一致。

结论：两例 C2 实际新样片的抽帧仍显示所请求修订，示意及未执行标签清楚；在本次抽帧范围内未见视觉阻断。这是有限视觉结论，不能替代 owner 最终验收。

- fd 新片实际 SHA-256 `0ec45cfe1f9d63c499d6926e9227056f0831d38b9b0c24c77202a8ec1165bf7e`，与 C2 清单及此前 C1 新片相同。抽帧可见 `cache-index-v2.json` 在场景树和启用 `--hidden` 的示意结果中；画面注明“本机旁白·合成示例·未运行目标项目”及“未检查忽略规则·顺序仅为示意”。
- Fastify 新片实际 SHA-256 `6958771e906e22a09b9cf143adbf342e15aa2ebc26d7307f345aa56a7946a207`，与 C2 清单及此前 C1 新片相同。首段显示 `Listen for incoming requests`；画面注明 `Silent · Illustration · No observed execution`。此前针对字节相同 C1 片的逐帧对比中，旧片零起始第 24 帧出现端口，新片第 25 帧出现，支持一帧延迟。

方法：直接从 C2 清单对应的 MP4 计算哈希，以 ffprobe 检查媒体并每秒抽帧形成同目录联系表；视觉检查两张联系表。两片均为 720×1280、24 fps；fd 长 16.5 秒且含音轨，Fastify 长 9 秒且仅有视频流。没有连续观看或试听，语音自然度及音画对齐未验证；未执行目标仓库，未修改候选。建议保持现有未验收状态，待 owner 完成适用的连续视听验收。
