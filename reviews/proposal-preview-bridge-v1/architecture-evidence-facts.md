# proposal-preview-bridge-v1-c1 / architecture、evidence、content-facts 独立审阅

- 候选：`proposal-preview-bridge-v1-c1`。
- candidate.json SHA-256：`fb1972acf1bc55e6052540049d877b2d68136fe0c0470a1e581afd8d5801e8ef`。
- Source commit：`1350dc3ffbcd9bb8c6e89d1030449be4409fc53f`；tree：`533586f11090d5facc5c071f6b2ec11591ca8b3b`；base：`cc47ed1c2a5073704a508241a8a13395aa970711`。
- 合同：OPERATOR 与 `docs/proposal-preview-bridge-v1.md`；审阅范围是两种显式作者 mapping、精确来源谱系、5–15 秒静音技术预览和 unsupported 拒绝。不是通用语义转换或完整视频制作。
- 环境与日期：Windows，Node 24.22.1；2026-11-03，约 12:23–12:33 UTC。独立目录为本文件所在 `judge-architecture`。
- **结论：PASS，本角色范围无确认的 blocker/major。** architecture、evidence 和两项目受限内容事实分别有下列证据；不代表整体 gate、连续视听质量或最终 owner 接受。
- 独立性：先读合同/实际 source，再检查实际 proposal/mapping/source/media。没有读取 builder author.mjs、builder 测试或媒体检查总结、其他 judge 报告。OPERATOR 提供范围与位置，但其成功陈述未作为证明。归档内历史 review 文件仅参与机械字节比较，未阅读其内容。

## 一页结论

433 个冻结文件在初检、末检均匹配 hash/长度。canonical ZIP 的 486 个 Git 文件逐个验证通过，source tree 一致。exact ZIP 与 canonical ZIP 的 54 个差异均仅 CRLF/LF；以 exact ZIP 独立运行。Story/asset 所记录的 46 个 compiler entries 均匹配实际文件，preview 的代码环境指纹也与 exact source 的重算值相同。

两项目的 saved proposal → mapping → bound Story → asset → preview 已独立重建检查。全部发布文件与 CAS 逐字节一致；Story narration/visual 来自原 proposal，引用与原始 README exact lines 相同；asset 与 preview 重验上游并保留 proposal/mapping hashes。实际静音 MP4 三份（含 timing edit）均独立 FFprobe 和 FFmpeg full decode 通过。

独立负例覆盖错误 binding、跨镜 claim、视觉角色替换、超限文本、未支持机制、与引用不一致的 HTTP body label，以及真实/假冒 HTTP 的 p-limit。已保存 proposal/mapping/source/movie CAS 损坏会使下游 preview 失效。进一步构造了三种**所有新 task/artifact hashes 有效，但上游串接错误**的任务：Story repository binding 错、asset 的 Story parent 被移植、preview 的 asset parent 被移植，分别被拒绝。不是只测随意改字节后的 SHA 失败。

实际五条主张与冻结原文相符；独立从 MP4 抽出的两组八帧展示 HTTP 请求、路由和响应，及同图的 cutout/mask 对照。始终可见“示意·未执行”，图像是作者 SVG 鸟形插画，未冒充真实 rembg 处理结果。内容与原文的支持范围详见事实表。

精确引用不等于语义成立：另造“相同正确引用支持月亮是奶酪”的纯编译负例可通过结构检查。没有提交或渲染此假 claim；这是合同明示的语义审阅边界，提醒不能用本程序的 provenance-checked 当作 fact-approved。正式两项目样本经过本角色另行内容判断，没有依赖该机械检查得出事实结论。

## 冻结身份与实际执行

| 项目 | 本轮实际证据 |
| --- | --- |
| manifest | `hashes.json`、`final-hash-check.json`：433 全部匹配，原候选未改变 |
| Git/source | `source-verification.json`：486 blobs，tree 一致，54 个 exact archive 差异全部仅换行；Git 对象从 `gve-authoring-mapping-v1` 的本机对象库读取 |
| runtime 指纹 | `compiler-identity.json`：46 entries 无 mismatch；preview codeHash `223f19fd2f73fe4a21bfba8c18762714a5f37777c8e158b895c24e3bdded5a57` 与 exact source 重算一致 |
| 类型与现有测试 | `typecheck.log` 退出 0；`mapping-tests.log`，2 项测试通过。未重跑 builder 所称整个默认回归 |
| 自选链路/负例/媒体 | `probe.mts`、`probe.log`、`independent-results.json`：8 组通过，内含 7 mapping 负例、2 个 p-limit 拒绝、4 类 CAS damage 和 3 份媒体检查 |
| 完整重哈希伪造 | `forgery-probe.mts`、`forgery-results.json`、`forgery-probe.log`：3 级上游移植拒绝；timing edit 全链验证；语义边界负例单独标识 |

运行命令：

```text
pnpm install --offline --frozen-lockfile --ignore-scripts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/proposal-mapping.test.ts
node --import ./source/node_modules/tsx/dist/loader.mjs probe.mts
node --import ./source/node_modules/tsx/dist/loader.mjs forgery-probe.mts
node --import ./source/node_modules/tsx/dist/loader.mjs compiler-probe.mts
```

安装与需要 CAS hardlink 的测试使用获准本地权限，全部在 judge 目录。安装 offline 且禁 lifecycle scripts；probe 禁用 fetch。没有运行目标项目、付费 API、部署或新合成语音。曾在错误的旧对象库查候选 commit 失败，以及用错相对 work 路径读取失败；随后更正到实际对象库/绝对路径完成核验，这些初始定位错误没有计为成功检查。

## architecture / evidence 结论

### 明确作者映射，而非隐式语义转换

读取了 contracts/proposal-mapping、story-planner/proposal-mapping、workflow/adapt-proposal，以及 runtime、asset-pack、preview 中完整变化路径。输入只接受两个明确 profile、三 beats、有限 typed graph/动作；旁白、visual description、选中的 claim 和 exact citation 从原 proposal 复制。字段超限明确拒绝，无自动缩短或删镜。HTTP 显示 method/path/body/port 与原文提取值及作者 entity label 双重一致；只识别当前支持片段，不伪装广泛代码理解。

rembg graph 的 `segment` 只连接 image→mask；cutout 是同一输入的对照视觉意图，不被宣称为已还原工具内部网络。当前 schema 和文档明示该范围。原 proposal 仍完整保存，两个输出的 narration/visual 均留在三镜动画，不把未建模的真实内部处理步骤当事实。

### 谱系保存在实际任务内

实现采用 additive material/adaptation fields，直接把 exact proposal 和 mapping 放入既有 Story task，而非孤立旁注。Story 读取时重算 mapping 派生 Story，并对照绑定、材料 bytes 和 manifest；asset 读取其真正 parent Story，并重算 Story/animation；preview 校验 asset manifest digest、receipt 中 sourceStory/adaptation、timeline/audience/samples、media hash、captions 与 pending 字段。

两项目独立验证：

| 项目 | Proposal | Mapping | Story task | Asset task |
| --- | --- | --- | --- | --- |
| Express | 1707fd5fd070a4ee7d5b123234ff11e2dbf5adf46f1abf6936d86c9495a38639 | c6d07aa956d0474684072b7b89cc3b9714667543b911f82b34c7126a84137114 | f35a9600b5bc159a4458d072d00ad6287341a1cae3a00e528048ea27685fa011 | 9d5748083c7638165fdba5c6cd00f08b15f7fcb0266f9759a17eb8051ee75883 |
| rembg | b6bf42b2445ee5b15bf18f01717c1477fd6965b4c7caa11def37e2826a54245f | 08fcdcf78da8277cf450346ffc81ef00d2a43493074728d8c495ad317f7f43af | 84667a0368491c75fb25f30f72744780a7f0946c8e524d95e1c4a818a14f3081 | 072059f284a3df4da55ff0bdb9ae1c11d528e7bdfcc8410408d8e60b024cbed3 |

独立脚本将所有发布文件（preview 和 editable）与实际 task result/CAS 相比，全部相等。没有仅依据 operator receipt 自报的 hash 判断。

### 变更与伪造

- Express timing edit 保持同 proposal hash；mapping 改为 `381bc5bc40fea4cce366ea4931dddca35197de10b10e5afab494c512ab4c554a`，Story、asset、preview ID 均改变，旧版仍可读取。
- 新 Story 的 input.repositoryBinding 改 commit，但 material 保持原始，全部 new CAS/task hash 重新计算：`EXPLAIN_INTEGRITY / Proposal adaptation lineage mismatch`。
- 新 asset input 移植 rembg Story parent、其余保持 Express：`ASSET_ADAPTATION`。
- 新 preview input 移植 rembg asset parent：`PREVIEW_INTEGRITY / Asset manifest hash differs`。
- 原始 proposal、mapping、source 或 MP4 CAS blob 分别附加字节：preview-status 均拒绝；恢复 byte-identical 原件后成功。
- 真实 p-limit 的 unmapped mechanism 与 counterfeit HTTP negative control 均拒绝，独立 state 未创建 tasks.sqlite。

这些是针对错误关系的负例；不是宣称能检测可信本地操作者同时重写整个合法新输入集合的所有行为。当前调用者身份依然 caller-declared，本合同没有签名或外部身份认证。

## content-facts：独立语义核对

来源是冻结的实际 README 字节及其上下文；所有 exact ranges 又由本轮脚本核对。没有在本轮重新联网取证，不能把离线检查写成 fresh GitHub capture。没有把 REA HTML 或别的网页混入 Git evidence。

| 项目 / claim | 原文范围与事实支持 | 内容结论 |
| --- | --- | --- |
| Express listen | Readme.md L45–47 调用 `app.listen(3000, ...)` | 支持“示例监听端口 3000”；不证明服务器在本轮真实启动 |
| Express route | L41–43 是根路径 `app.get` handler | 支持 GET `/` 与该注册处理函数的示意关联；不推断别的路径/middleware |
| Express response | 同 L41–43 调用 `res.send('Hello World')` | 支持示例处理函数发送该字符串；不证明真实网络响应发生 |
| rembg cutout | README L127–131 标为本地文件移除背景，给出普通 `rembg i ...` | 支持旁白“normal command removes the background”和 cutout 示例；无真实像素、模型准确率、架构主张 |
| rembg mask | L148–152 明确 Return only the mask，命令含 `-om` | 支持 mask-only 选项及两个输出选择的对照；白主体/黑背景是本片的概念示意，非本次工具的观测结果或所有输入输出数值保证 |

Express 来源 SHA-256 `3cf5f3e224dbb9b5e2bc0ac255871de453762ae7a277f868da5f4a69d6ff2509`，commit `43fca52d28a422c8be48fd489cbd4f2d6152bab6`。rembg 来源 SHA-256 `8455c52c60130199ab61858d359f2d25440dd95772844e2b3a037e490b31179d`，commit `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`。

旁白全部保持原 proposal 的英文文本。英语 captions 是估计 shot timing；视频画面是固定中文版解释，未听到/未生成英文旁白，也不声称字幕已语音对齐。两项目的 useCase/exclusions/assumptions 都限定 README 示例和 teaching illustration，未声称执行。

## 实际媒体与图形事实

本角色重新对三个真实 MP4 做 `ffprobe -count_frames`，以及 `ffmpeg -v error -xerror -nostdin -i <file> -f null -` 完整解码。均只有一条 video stream、H264、720×1280、24 fps；Express/rembg 为 216 frames / 9 秒，Express edit 为 228 frames / 9.5 秒。输出 metadata 在 `run/*-ffprobe.json`；exact movie SHA 与 receipt 相同，见 `independent-results.json`。

从每个 MP4 独立解码帧 0、36、72、108、144、180、204、215，生成 contact sheets。**实际查看的是 Express 和 rembg 两张 contact sheet**，不是仅看 builder 提供 PNG。

- Express：客户端等待；绿色 GET `/` packet 到服务端/路径/handler；随后红色 Hello World 返回；最后客户端显示 Hello World。端口 3000、路由和 body 与原文一致。是因果示意，没有运行截图或虚构日志。
- rembg：相同鸟形插画作为 INPUT；普通命令下背景渐退为棋盘透明；改 `-om` 后过渡到白鸟/黑背景 mask；显示过渡预览，最终为蒙版。连续使用相同轮廓，支持“同一输入、两种输出”的解释。没有伪装真实照片或声称执行了 rembg。
- 两片所有抽样帧右上持续显示“示意·未执行”。原作者 SVG 图形与 trusted renderer 产生的媒体一致，目标仓库未运行。

抽样帧能核查关键因果状态和事实元素，**不等于连续观看或正式 video-quality/owner AV 通过**。本轮没有重新运行 Remotion 渲染，没有播放/聆听完整成片；实际 decode 与抽帧是本角色的媒体证据。

## 未完成与限制

- 结构性假 claim 配正确 quote 仍可能合法：本轮 false-claim 纯编译负例已明确证明。语义审阅须持续 pending，不能改变 UI 成“来源验证即事实通过”。两项目五 claims 的语义支持是本报告单独人工判断。
- 只支持三个作者 beat 和两个来源形状；p-limit 被拒绝是正确边界，不计第三项目支持。两项目成功不是任意仓库泛化证明。
- 未运行全量 regression、真实新 GitHub 请求、新模型创作、fresh Remotion render、连续 perceptual playback、音频或最终用户接受。
- native publication、取消压力与敌对路径专项不由本报告替代相应独立角色。
- 未对其他历史 trial receipts 作成功背书；只检查 -final main cases 和明确的 edited chain。

没有本角色修复请求。若事实、mapping、源码或预览变化，需用新候选 hash 复验受影响谱系与内容；本 PASS 不可直接移用到后续版本。
