# C7 / 独立产品与视频质量审查

- 结论：**product UNVERIFIED**（下述两条完整静音关键路径、回执与输入边界限定 PASS；真实中断恢复与若干合同条款未由本角色亲验，不能变作角色总体 PASS）。**video_quality UNVERIFIED**（C5 字节相同、关键帧及解码限定 PASS；实际连续观看、听音、主观视听和最终 owner 接受待审）。没有将 owner AV 延期算成通过。
- 冻结标识：`url-to-preview-candidate-7`；manifest SHA-256 `274c43e69592159e7e271dcc471155c46319e7189df8b11942c8f444bfda3d62`；628/628 列项 SHA-256 重算一致，0 缺失/不符。范围限清单，不证明目录外文件。合同 `source/docs/url-to-preview-acceptance.md` 与 `source/reviews/owner-av-deferral-2026-10-26.json`。2026-11-03 PST；隔离目录 `judge-product-visual-c7`；使用冻结源码副本和已安装本地依赖，未执行目标仓库、付费、部署或改候选；未读其他 judge 报告。

## 产品实际路径

独立从公开 GitHub URL 发起只读 intake（网络可用），固定 Express `43fca52d28a422c8be48fd489cbd4f2d6152bab6` 与 rembg `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`；两者分别保存来源、导出证据、以冻结示例 Story 规划、资产规划、`preview-render --mode silent`（不指定 presentation，因而默认诊断画面）、状态检查、默认 `preview-export`。不执行仓库代码。操作 stdout 保存 `express-*.log`、`rembg-*.log`，状态和回执及独立 state 在本目录。Story 带明确绑定并 review pending；首次 rembg 资产规划漏传 `--voice` 正确返回 USAGE/退出1，提供空 clips 后成功。

| 项目 | Story task | 原资产 task | 预览 task |
|---|---|---|---|
| Express | `c6c7bb239e83d547424de43a85a26c179b6174c77b0fc7033bc871e9b8ac6314` | `03b2a4af6e294392dec40f84effd517988f120f220be6d4386a489c4db9375f3` | `710ad18cd804c164d13cf29087dfb1ec56c14f4099fec4cf79abe23874a2522e` |
| rembg | `b402f79a61ffe21f54f22652357b33ca48349a583baf9a525dece9c750b8b743` | `2851ace9a73569fc52bdfefecac696701ededcae77c0b4398f58f39febc7ca53` | `46d73f4c53faf5a527f94c09602419f32646c3c20210481dfff388c08fca4f74` |

两状态均 succeeded、integrity verified。默认 `receipt-v1` 返回实际 bundle 和 receipt：Express digest `2d2bf4614725ecf60e5c34f63e7749a695894d2f733d79559de3748517289a14`；rembg `a64cbf367538ed8a65ec2ece6f9fb676f0e7c8bbd4d0bbc2857665b7434f6144`。重算回执摘要与返回值一致；两者各列 34 个文件，逐项实际 SHA-256/大小和数量均匹配。以本地无头 Chrome 打开两个返回路径的 `index.html`，首帧、播放器控件、编辑与字幕链接及未执行/静音说明可见；截图在 `express/index.png`、`rembg/index.png`。未点击播放或听音。两次对同一目标重导出均返回原 digest、`reused: true`。

独立修改两个动画首个对象标签：Express 新资产 ID `f7d32b615295f56a2bf2732019d3b9d793f05643e3974ed5562f821fe6875645`，rembg `1a58e542fe9cafd90c2acf952c58af418fe1838a7090dd36a371ca60edec8984`，均不同于原任务。原、新资产均独立导出成功；变更标签只在新动画 JSON，原件保留。此验证到资产层，未为修改件另渲染视频。非法 `https://example.com/invalid` 返回 `REPOSITORY_URL`、退出 1，未误报成功。

附加完整性恢复：初始验证后，在**独立 Express 导出**的字幕追加测试文字，再重放原任务到同一目标；旧受损文件留存，返回 `reused:false` 的新 bundle 和 receipt，新的 34 项哈希全匹配，新字幕恢复原哈希 `2ba3a145391287616a9af221e33d8cf92c9055d68c49cec25c6545bbb99500f6`。新 receipt SHA-256 `fbf995607c716a35ff33d7484bbf317afe9ec1751651deaabd21c7ac1aaceffc`。这是导出干预后的重放，不是实际中断进程恢复；未篡改冻结候选或原任务 CAS。

## 视频与产品表现

C7 与 C5 两份冻结 MP4 分别实测 SHA-256 相同：Express `67743696a508df46118c2036e2f1d004e854abf6d9580b1f20893dae1c353559`，rembg `cc30912595fc5c25bfb5582a1db3981df09dbac233e26de14b33283a2fa1ae8c`。两份 FFmpeg 全解码退出 0；直接从 C7 文件抽 360×640 图片，Express 145/436/709 帧呈请求、匹配、响应；rembg 461/462/519/705/717 帧呈透明抠图、明确标示过渡、最终黑白蒙版，C4 原错配未在这些帧重现。图片在各自 `frames/`。静帧和解码不证明连续节奏、音质、字幕同步、平台安全区或零背景实测理解；实际声音自然度与最终接受均待 owner。

默认模式的独立新渲染是**诊断卡片画面**，不是 C5/C7 的 audience-v1 画面；文档说明需显式指定 `--presentation audience-v1`。入口可用，但用户若按默认命令期待观众版，可能误判视觉完成度；这是产品可发现性风险（minor，合同明确允许默认诊断模式），不把默认样帧视为最终视频艺术 PASS。分离 VTT 是镜头级脚本估计；播放器未内置字幕轨，听音对齐未证。

## 未验证和复验

未亲自模拟渲染任务中断和恢复、变更后的完整预览、第二项目的破坏性完整性故障、音频样本绑定/速度、正式用户测试与连续 AV；本角色未运行全测试集。两项目已实测入口、变更和错误边界，但这些未检合同项使整体 product 保持 UNVERIFIED。其他角色不由本报告代判；新候选/修复须重核版本并执行受影响回归。最终 G4/G6 和主观 AV 不由工程授权替代。
