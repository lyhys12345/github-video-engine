# 自动对齐待听审预览 v1

这是新的、明确标记的 owner-review preview consumer。它读取已生成的本地 alignment draft，验证后派生独立的预览 timeline，并复用现有 continuous renderer。它不修改原 draft 的 `renderable: false`，不生成已听审 timing schema 1.1，不写 `reviewBasis` 或批准声明。既有 reviewed sidecar 接受规则和省略 sidecar 时的 weighted fallback 保留原行为。

工程依据为 [预览合同](../reviews/unreviewed-preview-v1-contract.md) 与既有 owner AV deferral。中间的六切点反馈不是启动工程预览的前置听审确认；没有回答不等于听过或同意切点。最终 continuous AV、语音内容及字幕同步继续待 owner 检查。

## 显式输入与本地运行

`SegmentInput` 新增可选 `unreviewedAlignmentPath`，与 `cueTimingPath` 互斥，只适用于 `presentation: continuous-explainer`。从准备好的 input 另存新文件，添加指向原 draft 的绝对路径即可，例如：

```json
{
  "unreviewedAlignmentPath": "/absolute/local-alignment-v1/rembg-candidate-2/draft.json"
}
```

这是新增字段示例，不是完整 SegmentInput；保留原 source-pack、current visual plan、whole original audio、exact transcript/provider/voiceLabel 和 canonical generation receipt。原始 MP3 不按 shot 切分。draft 同目录必须保留它绑定的原始 `decoded.wav`，consumer 直接读取文件核对 WAV 和 PCM payload 的 SHA-256、完整 RIFF/PCM16 mono16k 结构、帧数、时长；不执行 draft 的命令、不加载模型、不重新解码或生成音频。

既有入口消费这一明确的输入模式，不需要新 CLI flag：

```sh
GVE_FFMPEG=/absolute/tools/ffmpeg GVE_FFPROBE=/absolute/tools/ffprobe \
  work/tools/node-v24.11.0-darwin-arm64/bin/node --import tsx \
  scripts/render-short-segment.ts /absolute/preview-input.json /absolute/new-preview-output
```

具体 CLI 参数顺序沿用该脚本，输出使用全新目录。启动真实 render 是独立工程动作；本说明和单元测试不代表已经渲染或听过。本模式没有远程服务、收费 API、声音合成、目标项目执行或发布流程。

## 输入验证与时钟

`unreviewed-alignment.ts` 对完整 draft 使用严格、有界 schema；要求版本 `local-forced-alignment-draft/1.0`、`PROPOSED_UNREVIEWED`、`renderable: false`、timing/content `UNVERIFIED`、owner `pending`，诊断 errors 必须为空。拒绝 promotion、额外的 reviewer basis、非法/非有限数值、错误数量、unsupported text 或伪造的绑定。

绑定精确 whole voice hash/bytes、visual-plan 原字节 SHA-256、完整原文、每 phase 原文的有序 SHA-256、canonical generation receipt，以及实际读取的 decoded PCM。容器时长须与 renderer 实际 ffprobe 和声明时长相差不超过 .005 秒；PCM duration 必须等于 frames/16000，容器与 PCM 的差值也须与 draft 精确一致，并限制在 .005 秒以内。

consumer 重新执行 exact mixed Chinese token ledger，保留 codepoint/UTF-8 offsets 和 discarded punctuation/whitespace；不做大小写、Unicode 或数字归一化。phase index/text/hash/offset/token range 和每个 postprocessed item 的顺序必须完整对应。非有限、负数、反向、越界、overlap spans 都拒绝。切点由相邻 phase 的最后/第一个 token anchors 重算 midpoint，逐项核对声明的 left end、right start、gap、midpoint、boundary array、zero-duration/gap/prospective frame evidence。不能单凭 `assessment.boundariesSeconds` 绕过验证。

重算出的 source boundaries 必须严格递增，30fps 取整后每 cue 至少 4 帧；不足时停止，绝不挪动边界来掩盖问题。既有技术 coverage 0/容器末端不被描述成 speech boundaries。修复列表、零时长 flags、source container/PCM clocks 及实际模型 `timestamp_segment_time=80 ms` 保留在 timeline；返回秒数显示三位小数不代表毫秒精度。强制对齐提供的词并不是独立 ASR 或真实内容核验。

## 预览输出

- Timeline 标记 `purpose: owner-review-preview`、`cueMethod: local-forced-alignment-proposal-unreviewed-preview` 和 `confidence: forced-alignment-proposal-unverified-by-listening`；timing/content/listening 继续 `UNVERIFIED`，owner/G6 pending。
- 全程烧录固定“自动对齐·待听审”标记，位于 title 与 cue 标题之间，放在 content fade group 外。首帧、正中帧、末帧均明确采样；原有教学/模拟 disclosure 和字幕保留。图形工作坐标 720×1280，既有输出 1080×1920。
- 保存原样 `alignment-draft.json` 和读取的 `alignment-decoded.wav`，原声 whole source 保存在 `source-audio.bin`；精确 draft hash 纳入 fingerprint，new validator 纳入 implementation closure。原 draft 不被改为 reviewed/renderable。
- 字幕名为 `captions.unreviewed.srt`，预览不会另写 `captions.srt` 或 reviewed timing sidecar。
- Evaluation 的 technical success 与 timing/content/listening 未验证状态分开，`gateApproval: not-granted`；原始声音维持播放速度、0.4 秒 lead、至少 0.6 秒 tail。本 rembg 源时长 31.555875 秒，对应 977 帧 / 32.5667 秒预览，而不是整 32 秒。

Draft-only 改动（包括去掉 preview field）会使 timeline、captions、frames、MP4、review approval 失效。使用新目录完整本地重渲染，不沿用历史接受结论。渲染结束重复核验原输入、captured draft/audio/plan/receipt 与 implementation 字节，变化则停止，不发布 technical success。

## 聚焦验证

```sh
work/tools/node-v24.11.0-darwin-arm64/bin/node node_modules/typescript/bin/tsc --noEmit
work/tools/node-v24.11.0-darwin-arm64/bin/node node_modules/vitest/vitest.mjs run \
  tests/unreviewed-preview.test.ts tests/short-segment.test.ts tests/continuous-segment.test.ts
work/local-voice-v1/venv/bin/python -m unittest discover -s tests -p local_alignment_test.py -v
```

测试 fixture `tests/fixtures/rembg-alignment-proposal.json` 保留实际模型输出的必要数据和完整被消费 schema，非消费的机器绝对路径替换为明示 `/fixture/` 占位。测试不依赖 ignored work 目录、旧机器文件或模型，不冒称新运行模型、实际音频解码或听审。覆盖 exact positive、voice/plan/text/phase/PCM 错绑定、promotion/errors、token 次序/offset、anchor/midpoint/gap、非有限/span、coherent sub-four-frame proposal、互斥 timing route、既有 reviewed/fallback 回归、首中末 SVG badge 和 draft-only 失效。真实 MP4、PNG、全片/听审与独立 judge 必须在另一个冻结候选中记录。
