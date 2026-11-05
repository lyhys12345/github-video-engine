# narrative-source-clock-c1 / 独立产品与视频质量抽检

- 角色：product、video_quality；候选 e1c6fcb8dc13dee521b8612b80321ccc993e3eee；candidate.json SHA-256 196682a1b6255f38fd151561ae4f444063836d208a7cb537e75ead72249ab6e2。
- 范围：同一 child、相邻 source-clock 桥接的静音技术摘录；不代表完整影片。结果：产品/视频有限静态抽检 PASS；连续感知视听质量 UNVERIFIED，按所有者授权延后；最终验收 pending。不能将本结论转换为 G4 PASS 或当前媒体批准。
- 独立性：共享候选只读，未运行目标仓库，未看同伴报告；先阅读 AGENTS、common 和冻结合同；在看到 OPERATOR 中的实现摘要后形成结论，故不宣称完全盲审。独立目录 C:/Users/luyuh/Documents/Codex/gve-continuity-judge-visual。

## 条款和证据

| 内容 | 结果 | 证据及限制 |
|---|---|---|
| 冻结身份 | PASS | 实算 candidate、两个 manifest、zip 的 SHA 与 candidate 相符；审阅 verify-freeze.py 后执行，733 源文件及 644 材料文件零错误。仅验证列入清单的内容。 |
| Express 边界 | PASS，静态抽检 | boundary-frames 输出 148–151 对照源 262–265；149→150 的标题由“请求发往服务端”变为“匹配请求路径”，GET /、客户端及服务器位置保留；与对应源帧所示阶段一致。该帧抽检不证明动态流畅。 |
| rembg 边界 | PASS，静态抽检 | 输出 148–151 对照源 216–219；149→150 标题和处理阶段改变，输入图保留，输出图出现；显示“示意·未执行”。并非声称观察到真实 rembg 输出。 |
| 未完成场景 | PASS，抽检 | 两工程原版及修改版从视频抽样帧可见 SCENE 3 NEEDS EVIDENCE、SCENE 4 NEEDS ADAPTER，明确 NOT PRODUCIBLE；修改版 rembg 帧 300、390 实际查看。截图显示原因分别为无验证结果或执行、无绑定适配器。 |
| 修改版 | PASS，局部 | 两工程 edit.json 起始区间不同于原版，抽看各自 edit-export 视频帧 119、120、149、150、179、180 及卡片，看到相同输入实体与后续阶段，未发现抽样中的错误重置；未逐帧复核完整电影或独立证明 edit 桥接精确映射。 |
| 状态和限制 | PASS | result.json 标记 silent、approval none、currentReview 和 ownerAcceptance pending、continuousPerceptualAv unverified；历史书面审查仅归因，不是当前影片批准。 |
| 连续视听 | UNVERIFIED / 授权延后 | 未播放连续视频、未收听；无音轨，静态帧和 PSNR 不能证明动态流畅或 AV 体验。保留至所有者最终 review。 |

## 检查记录及发现

直接查看冻结边界 PNG 与本地 FFmpeg 从原版和 edit-export 抽取的帧，独立目录保留 montage.py、两张 sheet 和抽帧。以原始媒体为输入，无目标仓执行。对该限定范围未发现可确认的 blocker 或 major；不对审美、动态感知或完整影片作判断。抽检也不能排除其他时间点、手机实机可读性或帧间闪烁等问题。第三个受支持场景被明确省略，不能据此宣称完整叙事覆盖。

最可能遗漏的是非抽样帧的问题及连续运动效果；逐帧视觉核对与最终连续播放可提供额外证据。修复复验不适用，本次并非修复版验收。
