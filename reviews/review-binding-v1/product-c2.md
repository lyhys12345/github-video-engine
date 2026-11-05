# Review binding C2 / 产品与视频 Judge 独立复验

- 输入：C:/Users/luyuh/Documents/Codex/gve-review-binding-freeze-v2/candidate.json，review-binding-c2，声明提交 3236062258f2c02cdc6f702d799de0a9a16a8eba，独立输出目录 C:/Users/luyuh/Documents/Codex/gve-review-binding-judge-product-c2。
- 角色范围：复验 C1 PV-1 冻结文件不一致、两实际媒体与 C1 的关系、有限画面与交付。Windows，2026-11-04；未读其他 Judge 报告。
- 结论：PASS（本次包装与抽帧复验范围；有明确视听和编辑限制）。C1 PV-1 在 C2 归档/清单/冻结源码副本之间已解决；本结论不构成连续视听、事实真实性或最终人类验收。

| 检查 | 本轮证据与结果 |
| --- | --- |
| 修复原问题及邻近边界 | source-files.json 摘要 b0194237006610ade793c4f816bf7f626c329c74f75a3fb2a7e38fbce879fa19、source-exact.zip 摘要 923c40b82e1a694a16abd42efb7adce9ae0047e30c5686c43df59b9e6a19f8f6、materials-files.json 摘要 51895c9560e9e97d8ee2d698300ac0c9a294d6d5b83b62067bb982ba49540369 均与候选匹配。逐项计算 689 个归档成员及源码副本的 SHA256，与清单一致，归档共 689 条；包含 C1 两个失败文件。886 个 materials 文件逐项哈希匹配。 |
| 提交关系 | builder checkout HEAD 为声明提交，git status --short 无输出；这是 Git 工作树状态检查，不宣称所有 Windows 工作树字节均等于 Git blob 原始字节。C2 包本身的字节关系由上述逐项检查直接证明。 |
| 实际媒体关系 | C2 fresh-export 的 Fastify preview.mp4 SHA256 def34b8bae6c73c3b6b652354bca90d7ac6ed77933e1aeca743a59d40e002569；fd b9c2fe2ced7551de14396bb651359451bfcdc0ba2d193c004245db99a279bf79；分别与 C1 independent-export 媒体字节相同。ffprobe 实测 H.264 720×1280、AAC，时长分别 18.208333 秒和 16.5 秒。 |
| 画面与审阅包 | 本轮从 C2 媒体以 ffmpeg fps=1/5 生成并查看 fastify-contact.jpg、fd-contact.jpg。Fastify 可见 3000、GET /、handler、hello: world、示意/未运行提示；fd 可见默认过滤、--hidden、合成路径及忽略规则未检查。画面与 C1 包中相应主题及限定一致，无法从稀疏抽帧证明所有画面或时间点。 |
| 交付及归属 | 两个 fresh-export 均包含 editable 的 proposal、presentation、trace、evidence、plan-manifest、来源文本，以及 fact-review 的 packet/receipt/result。结果为 attributed-review-complete，identityAuthentication not-provided，approval none，semanticTruth not-machine-verified；收据 hash 分别 ff544b6b… 和 3b7f0c5e…，与候选一致。未进行用户独立重编辑或通用剪辑软件导入测试。 |

## 复验与限制

PV-1 原失败文件和全部同清单其他成员均复核，原始不一致已解决；C1 报告保留历史。对媒体执行 `ffmpeg -v error -i <preview.mp4> -vf "fps=1/5,scale=360:-1,tile=3x3" -frames:v 1 <contact.jpg>`，成功生成并查看图片；未填充 tile 的黑色区域不是视频黑屏证据。未听审、未连续观看、未判断语音内容或音画同步，也未执行目标项目。现有音轨不证明听觉质量；final owner acceptance 和语义真实性仍待各自验证。未实测结构化材料重编辑重渲染；存在材料不等于无需原系统即可编辑。抽帧可能遗漏短暂遮挡或过渡问题。
