# chi 候选 — J3 证据与复现 Judge

- 角色：J3 evidence，`reviews/judges-v2/roles/evidence.md` / `common.md`；角色负责版本、输入到产物证据与可复核性。
- 范围：用户选择的 chi 43.3 秒技术预览，以正式成片标准作差距检查；**没有针对该候选批准的正式成片验收合同，不能视为正式成片验收**。
- 候选 `chi-404-405.mp4` SHA-256 `29a5e9008baef1713e3e144139f704e464a0aec09dfe387659ec7605e1e34e46`；引擎当前 checkout `a6c0ca1032b811d0dc7e200395b799bb255daa12`，历史生成报告记录 `eb28928`，不能拿当前源码检查冒充历史构建重跑。
- 窗口：2026-11-06 00:05 -08:00；Windows，本角色未执行目标仓库。结论：**UNVERIFIED**。
- 独立性：未读取其他 Judge 报告；在检查原始 candidate 前已读项目的历史验证文档，故不能声称完全先形成结论后读了 builder 总结；最终判断基于下列独立读取和命令。

## 一页结论

当前 MP4 与当前持久化任务引用的输出字节一致，固定源码快照的五个 SHA-256 与记录一致，作者文件的 14 条引文均与捕获文件的对应行及哈希匹配；独立完整 FFmpeg 解码成功。但这是自标为未审的技术预览，事实语义、听看、正式交付与用户验收仍 pending，且没有完整重跑、干净安装或跨电脑复现的当前证据。不能将这些尚未验证的项目折算成通过。

## 条款和检查

| 内容 | 判定 | 实际证据与限制 |
| --- | --- | --- |
| 候选与产物绑定 | 本轮实测一致 | `current-run.json` 的 result SHA 为 `eb6a76eeb5ad49b0df23a2cca73a817102fb030c65b91edc8e1b9d880e7aa5b8`；校验该文件后，`tasks.narratedPreview=b390669df8b6b8b135e120b1652a45c2b8d255a6cad559f70ff5df3b724b74e9`，其 bundle 的 `excerpt.mp4` 与候选视频同为上述 SHA。历史原始 `de724.../result.json` 同记录的 `1e733376b00af983e1d831f650f20019f06f84741ab3f338198a4d94e12dbe91`；二者是不同 attempt，不是同一 JSON。|
| 最小实测 | 通过 | `ffmpeg -v error -i chi-404-405.mp4 -f null -`，退出码 0；FFprobe H.264 720×1280、AAC、43.3 秒；这验证完整可解码，不证明口播正确、可听懂或符合任何审美。 |
| 来源链 | 本轮实测一致 | `request.json` 固定 commit `9f8adb1aabaa8a91180a821111d3f8e668d1c0bf`，`source.json` task `0dbf83d7a5d30570d06bb81c3642a9f575b66b1479f1e6991f420aef6d98f7fd`；`capture/fd967bae32ed/.asset-staging-43b45fe8-1362-4dba-b9ee-9153ac17668c-BWQAeY/source-{1..5}.txt` 的 SHA256 与 `docs/evidence/codex-chi-three-file-2026-11-05.json` 完全相同。|
| 精确引文 | 本轮实测一致 | PowerShell 对 `author/narrative.json` 六条 claim 的全部 14 citations，读取 source 文件、按 1-based 行提取、与 quote 逐字及 SHA256 比较，失败 0。仅能说明引文与本地捕获一致；来源版本真实远端对应与语义是否支撑结论未由 J3 单独重抓/判断。|
| 正式交付与复现 | UNVERIFIED | 工作区有可编辑作者 JSON、`index.html`、媒体及字幕账本，但本角色未执行干净安装、独立重渲、跨机器恢复及完整工程回归；未证明任意环境可重现。 |
| 人审及内容 | UNVERIFIED | bundle 的 `currentReview`, `ownerListening`, `ownerAcceptance` 为 pending，`speechContent`, `speechAlignment`, `continuousPerceptualAv` 为 unverified。本人没有持续观看/听音；事实正确性由 J5 单独判断。 |

## 发现与复验

**E-01（证据缺口，正式成片交付未验证）**：候选自标 `Experimental preview — not reviewed`，且无该视频特定已批准正式合同；最小复现为读取 `workspace-preview.html` 与上述 `result.json` 的 review/acceptance 字段。影响：用户无法从当前证据认定正式成片质量或验收完成。需先明确最终标准，再补相应的听看、事实核查、独立可编辑交付/复现及所有必需角色结论。此项不声称技术渲染失败。

**E-02（版本边界）**：候选生成记录使用引擎 `eb28928`，现主仓 `a6c0ca1`；既有结果不能直接作为当前代码重渲通过的证明。若主张当前版本可复现，应在独立副本使用受控相同输入实跑并绑定新源码哈希；本轮未做。

未读取其他 Judge 报告；未修改来源、原媒体、共享任务数据；未运行目标代码、完整回归、Judge gate 或付费 API。形式验收标准可能需要用户校准，本报告不是最终用户 G6 批准。
