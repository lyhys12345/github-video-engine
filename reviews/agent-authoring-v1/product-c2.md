# session-agent-authoring-v1 candidate 2 / 独立产品 Judge

**结论：PASS（本阶段 planning-only 产品范围）**。三个新 URL 均实走到可审阅草案；同时对三个冻结状态副本亲验修改历史保留、对 rembg 错误引文亲验拒绝。未见把作者推理、适配器或媒体生成虚报完成。结论不认证每条语义事实，不意味着已自动生成 Story、视频或最终接受；这些明确待审。J4 本阶段不启用，不评价影音。

## 身份与独立性

候选 `session-agent-authoring-v1-c2`，`candidate.json` SHA-256 `d086228c725521a8f9832d4d7aba19502d936321393af16b7908914c061926d9`；122/122 列项逐一哈希与字节数一致。source.zip 按清单校验后解压于 `judge-product/engine`，状态副本和全部输出只在 `judge-product`。2026-11-03 PST。先读 OPERATOR、`docs/agent-authoring-v1.md`、`reviews/judges-v2/common.md`、J1 规则、原始包和来源；未读取 builder 总结或其他 judge 报告。只读公开 GitHub API，运行本地引擎，没有执行目标仓库代码、付费、部署或修改冻结候选。

## 实测路径

对 REA `f4cc6c85efe7f3513d587df3bd5086adb1bc6a76`、rembg `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`、p-limit `a8a6fbec4e0e866d6d779b10889bb4f5567e70eb` 各自从全新 state 调用公开 `project intake --repo ... --ref ...`：均成功 `EVIDENCE_CAPTURED`，指引打开作者包。随后各 `project author` 输出 `awaiting-author`、绑定及原始与带行号来源、空 draft、JSON schema 和限制。以作者身份亲自读取源码文本并独立编写方案（REA 的 Electron/ASAR 静态分析、rembg 的本地图像输入/输出、p-limit 的并发为一），保存 `fresh-*-proposal.json`，无运行目标命令。对三种项目各调用 `submit-proposal`、`proposal-status`、`export-proposal`，均成功；新 state 的三个 hash：

| 项目 | 独立草案 hash | 可渲染状态 |
|---|---|---|
| REA | `95e02a3786712b6195c747ee6fb0c1f5c682be5e0cfdfa8a34b7661cdc2454de` | needs-adapter / unmapped |
| rembg | `25e8e993e2caa765cfeb3997f10e7c1e8f1eb74ada673b05ccf47ab60eb102b9` | needs-adapter / image-mask 候选仍需输入适配 |
| p-limit | `36954d04713e9c15b10189c4a2a454201d6652be3f4774e3e188e3abb535a23a` | needs-adapter / unmapped |

每个提交和导出明确 `provenance-checked`、`semanticReview: pending`、`editorialReview: pending`、`renderable: false`，并说明未运行模型、目标仓库、适配器或媒体生成。审阅目录含 proposal、review.txt、review.json、evidence 与原始来源，可直接读取；`fresh-*-*.log` 保存实测。自写草案是简短单镜说明和测试输入，不是本 Judge 对作品内容完整性或来源蕴含的批准；事实和编辑仍应由相关角色审查。

另在各冻结 state **副本**生成 `*-packet`，独立提出首版，再改标题提交为新 hash；三项均返回新 ID，修改后分别把旧、新按 hash 重新导出，实读两个 proposal 的标题，原题目和 revised 题目均正确保留。p-limit 冻结副本的来源含补充文件，因此其 snapshot 和首版 hash `eaa15677592a7eedbe335775ebef7464f070214874b25412ac12dc1bf260bbe9` 不同于上表新 intake 的 README-only snapshot；不得混为一版。对 rembg 草案故意将精确引文改为虚构字符串，提交返回 `AUTHORING_CITATION`、退出 1。旧、新导出在 `*-old-recheck` / `*-new-recheck`；负例在 `invalid-submit.log`。

## 首次用户体验与边界

作者包自动提供仓库/commit/snapshot 绑定、原始及带行号文本、空草案、可机读 schema、引用约束和下一步；当前会话助手可以依据它撰写一个通用 proposal，而不需要从零制作底层图结构或动画 Story JSON。**这不是无 JSON 或全自动创意生成**：本次仍须作者选择用途、阅读来源、编写 claims/entities/mechanisms/beats、复制精确行和组织嵌套 proposal JSON。CLI 不调用模型，自己停在 awaiting-author；对人类首次使用者操作负担仍高。`author-independent.mjs` 是本 Judge 为完成传输编写的脚手架，不是候选交付的自动作者能力。此界限明确、符合本阶段合同；作为 minor 易用性改进，可提供交互式填表或更小示例，不应把来源检查解释为事实蕴含检查。

本次未验证可选 capture-text 的网络恢复、并发写、恶意源安全边界或全测试套件，也未尝试任何媒体/J4；不由产品角色代判这些专项。三份新 intake 仅使用其 README/LICENSE，保存的 p-limit 扩展来源副本用于版本历史测试；没有断言该扩展在本轮重新捕获。未把最终人类接受或语义审校计入 PASS。
