# mechanism-runtime-v1 / 产品 CLI 独立补充

原视觉报告保留。本轮对已有保存 Story/状态的两种机制完成公开 `render`、`status`、`export`、有效修改和非法输入验证，**产品角色对这条已保存 Story→机制媒体交付路径的限定工程结论 PASS**；不代表从零研究/编写 Story、跨平台发布、实测运行目标代码或最终视听通过。连续观看、听音和 owner 最终接受仍 UNVERIFIED；原视觉报告中的观看风险不被此补充抵消。

冻结身份和 173/173 清单校验见原报告。以候选源码必要文件与状态的独立副本、现有本地依赖，在 `judge-visual/source` 和 `judge-visual/state` 操作；未改候选文件、执行目标项目、付费或部署。2026-11-03 PST。命令 stdout/stderr 保存在本目录 `*-cli.log`、`*-status.log`、`*-export.log`。

## 原输入、修改、状态及导出

| 项目 | 原任务；原输入 render | 修改后任务；实际 render |
|---|---|---|
| REA | `54af7ffc938f1d4022890fa11df3a54b46a5346cb78d439df9798f9c9fe6c2f1`，cached true、succeeded | `a46a09ce6ee5b20d38f1465c590bb20166baa49c834833b97f8685ed37aa6cd7`，cached false、succeeded |
| 合成 fill | `767ca8c75c43fa5bde3842c8c380d7317dc52eb5f192d1acf15d82f8ea2761d0`，cached true、succeeded | `7538db9b59fab6ab0e81198502b541335bc0e1dfc5e9036c9723ad408e3d84db`，cached false、succeeded |

修改仅各自 sidecar 的标题，使用保存的来源和 Story 绑定；两个修改任务均实际新渲染并产生不同 task ID。四次公开 `status` 均 succeeded、integrity verified；四次导出到新的隔离目录均成功。独立重算每个 manifest 列出的文件哈希和大小：REA 原/新各 39/39 匹配，fill 原/新各 20/20 匹配。原导出 MP4 与冻结输入逐字节 SHA-256 一致：REA `66e00f28b5db372113ce6e9d2d3d173119165bb62b48540be070cf561abc3dfe`，fill `cbc0eb238fbc11fd87c100f9a774c106c26069663df33312ffb9a5f78d016adb`；新视频分别 `64ca0d1f017bdcea6277c665c6b5dd59cb3b2355c3c9fdbc038043f9745e2d7e`、`ec5c3e1ed871bc29e3a117c745195c80cda380f6c761075de66a386b8df089d1`，均不同于原件。以图像工具亲看两份修改导出的 `sample-0.png`，各自显示新标题。原任务修改后仍能 status 和 export，原件保留。原始 render 为缓存复用，不能声称原输入本轮重算；修改件为真实新渲染。

非法测试将 fill 的 `opacity` 投影配对不允许的 `track` 图形，公开 `render` 返回 Zod 错误，指出 `projection.glyph` 期望 `vessel`，退出码 1，没有成功任务。**minor 易用性**：用户会看到内部堆栈与本机源码路径，虽错误已明确拒绝，建议以后输出简洁可操作错误。日志 `invalid-cli.log`。

## 保留范围

本轮没有独立模拟运行中断与恢复或破坏已提交 CAS，亦没有重跑全套测试、检查每种输入、从零运行 Story 规划，不能将此报告用作这些特性的证明。合同允许复用已保存来源与状态；状态副本本身不在清单内，CLI 对绑定与任务完整性进行了检查，且原输出 MP4 与清单内冻结产物哈希一致。两段为静音工程预览，实际连续观看、节奏、手机可读性、主观艺术质量和最终 owner 接受继续未验证。
