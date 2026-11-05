# Review binding C1 / 产品与视频 Judge

- 候选：review-binding-c1，声明提交 3236062258f2c02cdc6f702d799de0a9a16a8eba；冻结文件 C:/Users/luyuh/Documents/Codex/gve-review-binding-freeze-v1/candidate.json。
- 角色：独立产品/视频审阅，检查预览与审阅包的一致性、可编辑交付和限制；事实语义及实现可靠性不代替专项判断。
- 环境：Windows；独立输出 C:/Users/luyuh/Documents/Codex/gve-review-binding-judge-product；2026-11-04。
- 结论：UNVERIFIED。两个预览的有限抽帧与包中的示意主题一致，交付包含结构化可编辑材料及归属式事实审阅；但冻结源码归档与清单不完全一致，无法确立整个审阅输入为声明的同一精确快照。连续视听和最终验收另行保留。
- 独立性：先读归档内 AGENTS、common、合同及原始产物；未读其他 Judge 报告。合同本身是实施证据说明，不能作为测试证明。

## 条款与证据

| 项 | 判定 | 检查与限制 |
| --- | --- | --- |
| 冻结身份 | UNVERIFIED | source-files.json 和 evidence-files.json 自身 SHA256 分别为 b0194237…、c16098ed…，匹配 candidate；755 项证据文件哈希匹配。source-exact.zip 的 689 项中 2 项与清单不符，见下。builder checkout HEAD 显示声明提交，但未证明归档及清单均等于提交。 |
| 两项目实际画面 | 有限抽帧通过；完整视听 UNVERIFIED | 对 independent-export 的 preview.mp4 用 ffprobe 和 ffmpeg fps=1/5、tile=3x3 生成本目录 fastify-contact.jpg 和 fd-contact.jpg；人工查看图像。Fastify 为 720×1280、18.208333 秒；画面出现端口 3000、GET /、handler、hello: world 和示意/未运行提示。fd 为 720×1280、16.5 秒；画面出现默认跳过、--hidden、合成路径、忽略规则未检查及顺序示意提示。抽帧不是连续观看，未核对每帧、音画同步或听觉质量。 |
| 包与画面 | 有限一致 | 导出 fact-review/packet.json 的 Fastify 单元包含 port/route/reply，fd 包含 default/include-hidden 与合成目录限定；抽帧可见这些主题。fact-review/result.json 标记 attributed-review-complete、approval none、identityAuthentication not-provided、semanticTruth not-machine-verified。此观察不独立证明全部事实、所有时间点或身份认证。 |
| 编辑交付 | 部分验证 | 两导出含 editable/proposal.json、presentation.json、trace.json、evidence.json、source 文本、plan-manifest.json、captions.vtt 和审阅 packet/receipt/result；支持结构化再编辑的材料存在。未执行独立重编辑重渲染，不能证明用户无需原系统即可编辑或证明可直接导入通用剪辑软件。fd manifest 明示 voice omitted；预览有 AAC，不等于交付包含可再用声音素材。 |
| 最终验收 | UNVERIFIED | preview manifest 保留 audiovisual、editorial、owner、speech content 等 pending/unverified；未听审、未连续观看，也未运行目标仓库。 |

## 发现

- PV-1，major（候选版本一致性，影响审阅可归属性）：比较 source-files.json 与 source-exact.zip 同名条目。预期所有源文件字节哈希一致；实际 docs/fact-review-binding-v1.md 清单 2658 字节、SHA256 9fc037e6cefb964ea59d5bdcbff078230b44090b6b9c3ba8af1c6a4fbf0b1998，归档 2657 字节、0d8d471c8212456a940a5206d78234d0def88a0566da2904ec9d11fb7282bcc7；docs/fact-review-v1.md 清单 3761 字节、bcf9cd0556199ea24b98b14128f0fd8b8fcd5d6a910662f3f51dd90078f2de14，归档 3760 字节、b2e8272a11961882243196f7d8c51fd24d2def126afb476e5e294fc8049a556d。每项差 1 字节，具体差异未判定。影响是不能把读取的归档合同自动归属于清单精确版本；不推断功能错误。新冻结需对提交树、清单和归档逐文件重算，并复核受影响合同及本角色。

## 检查记录与自我限制

PowerShell Get-FileHash 比较两清单与全部证据；.NET ZipFile 和 SHA256.HashData 对每个归档条目计算。ffprobe 检查实际媒体流；ffmpeg 抽帧命令为 `ffmpeg -v error -i <independent-export/preview.mp4> -vf "fps=1/5,scale=360:-1,tile=3x3" -frames:v 1 <project>-contact.jpg`，各次成功生成图片。缩略图为空黑部分是 tile 未填满，不能据此判断视频黑屏。未听审、未连续观看、未实测重编辑、未验证来源事实或执行目标项目；画面取样可能漏掉闪烁、截断、过渡与同步问题。用户最终人工视听验收仍待进行。
