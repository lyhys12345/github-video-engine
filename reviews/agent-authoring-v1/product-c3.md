# session-agent-authoring-v1 C3 / 独立产品回归

**结论：PASS（限定 planning-only 产品与本轮 Windows 回归）**。三个已保存项目的默认作者包、提交、状态、导出与修订历史实测成功，非法引文拒绝，未见自动生成媒体或语义通过的虚假声称。不是最终内容事实认可或平台安全结论；J4 不启用。

C3 `candidate.json` SHA-256 `287d61ce50ffe2f5788a7cf304d66b3fb7a4233f504ef5c672cc6a21e8f763e7`；126/126 清单项目按 SHA-256 和大小重算匹配，包含 `source.zip` 与 OPERATOR。清单自述 source commit `e8372d8ae87dbd6ceb4c1028594a27cb03164c11` 和 tree `8f8e13d800b677f5205e48aa4909c676eeb45dda`；本轮验证 archive 字节和解压运行，未独立重建 Git tree。2026-11-03 PST，`judge-product` 独立源码、状态和输出；未改冻结候选、执行目标仓库、付费或部署。读 OPERATOR、source/docs/agent-authoring-v1.md、J1 规则并先形成独立结论；未读其他 judge 报告或 builder 结论。OPERATOR 本身含版本历史叙述，未将其作为实测。

## 实际产品路径

复制三个关闭状态数据库到隔离目录，调用无特殊模式的 `project author`，REA/rembg/p-limit 均成功输出 `awaiting-author` packet 与 pinned binding；各包含 proposal 草稿/schema、来源、引用与界限。复用本人 C2 审查时从原始包独立编写的三个 proposal，以 C3 packet 的 binding 和请求 ID 绑定并调整标题；不是 builder 的草稿，也非 C3 的自动作者。依次 `submit-proposal`、`proposal-status`、`export-proposal` 均成功，直接打开 review.txt 和 proposal.json。提交的原始 hash 分别：REA `13c53c7046f413b260c517502861043091ae8442e8b6408851c351cc1bff347b`；rembg `4f08a1b7bd71eeba790bcd8fd7eae5d3d1de2fc5278743b124f33016cf6c4b8d`；p-limit `859928a2b4f8a7bde57c95fa467c06410f3f389e1e8227b90bf041d090c7205d`。状态和导出均 `provenance-checked`，semantic/editorial/AV pending，`needs-adapter`、`renderable:false`。p-limit 与 REA 选择 unmapped 的原因明确，rembg 的 image-mask 仅候选仍需适配器；输出明确无模型、目标执行或媒体生成。

各项目修改 title 提交生成新 hash，分别 `ee2512e3e77690b8231e616923ff82f44b148a81c0b8b0e73a60792eebb98377`、`59e7055e648c76f2a3336056baca727b3aed5192913f64b93e97bce42bee184e`、`61eb86cf3b6201dc4aef41443f0aea936f8eef9330379398360245de7ebabd16`。按 hash 分别再次导出旧、新版本，实读 title 确认旧题目与 revised 题目各自保留。独立将 rembg 引文改为不匹配文本，submit 返回 `AUTHORING_CITATION`、退出 1。操作记录与实际审阅包在本目录 `*-author.log`、`*-submit.log`、`*-status.log`、`*-export.log`、`*-old-review`、`*-new-review`、`invalid-submit.log`。

## 平台、范围和剩余风险

文档明确作者包和 proposal 发布要求本地 Windows 驱动器；本次在 Windows 上经授权解除沙箱对本机 native helper 的阻止，以默认 CLI 发布成功。未实测非 Windows 拒绝，也不能推断其他系统可用。文档要求旧式 `project export` 使用可信且独占输出父目录；本轮只测 author/export-proposal，未代判安全竞态是否修复。状态来自冻结副本，本轮未重新通过网络 intake 或重测补充来源获取；C2 我本人曾新建三个固定 URL 并走通同一上层作者路径，但该旧结果不是 C3 的新运行证据。

作者包仍要求当前会话作者阅读证据、创建嵌套 proposal JSON；不是模型已嵌入 CLI 或自动生成视频。降低底层内部 Story 编排负担并保留未映射意图，但首次作者仍承担引用和结构化写作；这是已披露的可用性限制（minor），并非本阶段必需行为失败。事实蕴含、并发安全、可靠性、全套测试和最终人类接受不由此角色代判。
