# 原录音本地对齐提案 v1

`scripts/propose-local-alignment.py` 是独立 CLI，只对原始 Chen `rea.mp3`、`rembg.mp3` 与当前 exact caption phases 提议时间点。它不生成声音或视频、不改变录音、不修改 renderer、字幕来源或已审阅 timing schema。输出始终为 `PROPOSED_UNREVIEWED`、`renderable: false`；`independentTimingReview`、`speechContentReview` 为 `UNVERIFIED`，`ownerAcceptance` 为 `pending`。技术校验及 token 一致不能证明实际说话正确或切点听感正确。

模型限定 `mlx-community/Qwen3-ForcedAligner-0.6B-8bit`，revision `0e1a68e91d815300c7c9754b2a7639378b23db15`，配置锁为 `config/local-alignment-v1/model-lock.json`。复用现有 `work/local-voice-v1/venv` 的 Python 3.12.14、mlx-audio 0.6.4 及 `config/local-voice-v1/runtime-lock.json`。不安装新依赖；runtime RECORD 绑定的具体含义见 [本地声音说明](local-voice-v1.md)。

模型准备与推理分开。操作者可显式使用 Hugging Face 下载固定 revision，但最终目录只能含 model lock 的 `files[].path`，逐项满足长度和 SHA-256。不要用会在模型目录留下 `.cache`、下载 receipt、README 以外额外元数据或 symlink 的默认 snapshot/cache 目录直接推理。以下是手动下载单个锁内文件的形式，`<locked-file>` 必须来自 lock；逐个完成全部 allowlist，下载到全新目录后独立验证，不覆盖失败目录、不自动重试：

```sh
curl --fail --location --output '<new-model-dir>/<locked-file>' \
  'https://huggingface.co/mlx-community/Qwen3-ForcedAligner-0.6B-8bit/resolve/0e1a68e91d815300c7c9754b2a7639378b23db15/<locked-file>'
```

该命令是操作者显式的公开模型数据下载，不是推理入口行为。推理入口不联网、不下载或切换模型。该 pinned 模型的 tokenizer 数据布局为 `tokenizer_config.json` + `vocab.json` + `merges.txt`，没有 `tokenizer.json`；同时必须有 `config.json`、`preprocessor_config.json` 和 safetensors 权重。模型只接受锁定的 `.json`、`.txt`、`.md`、`.safetensors`，拒绝额外文件、缺失项、symlink、可执行权限、代码格式、路径穿越和递归 JSON `auto_map`。

## 运行

从仓库根目录运行。`GVE_FFPROBE`、`GVE_FFMPEG` 必须为真实、无 symlink 的绝对可执行路径；输出目录必须不存在，父目录必须已存在。参数支持本地路径；worker 转为绝对路径。

```sh
GVE_FFPROBE=/absolute/tools/ffprobe GVE_FFMPEG=/absolute/tools/ffmpeg \
  work/local-voice-v1/venv/bin/python scripts/propose-local-alignment.py \
  --model work/local-alignment-v1/models/qwen3-forced-aligner-0.6b-8bit \
  --model-lock config/local-alignment-v1/model-lock.json \
  --runtime-lock config/local-voice-v1/runtime-lock.json \
  --receipt fixtures/continuous/generation-receipt.json \
  --recording rea --audio work/chen-continuous-voice/rea.mp3 \
  --plan reviews/continuous-explainer-v1/rea-visual-plan.json \
  --out work/local-alignment-v1/new-rea-check --check
```

实际对齐去掉 `--check` 并另选全新输出目录。rembg 使用 `--recording rembg`、原始 rembg MP3 和 `rembg-visual-plan.json`。不接受 rembg revision 替换原录音。

预检检查 canonical fixture 本身、固定原录音 SHA-256/字节数、当前 visual plan 全部 phase 拼接与 canonical exact text 一致、每 phase 原文哈希、最多 32 phases、5000 字符、60 秒。source ffprobe 容器时长与 fixture `measuredSeconds` 差必须不超过 .005 秒。完整 ffmpeg `-xerror` 解码为 16 kHz mono PCM16 WAV，不使用 trim、时间缩放、静音填充或拼接；保存原始 MP3 的完整副本与哈希、PCM 文件哈希、PCM payload 哈希、帧数、时长及容器与 PCM 时长差。`--check` 也做原录音完整解码，但不导入/加载模型、不合成音频、不写 draft。

入口复用固定仓库路径 `scripts/local-chen-reference.py` 的 stdlib helper，绑定脚本与 helper SHA-256。前置、worker、生成后重复核验全部输入、模型 hash 与 runtime lock；生成后还核验 decoded PCM、完整 source 副本、processor 文件哈希。模型只传本地 `Path` 与安装架构 `qwen3_forced_aligner`。

## 禁网与上游行为

要求 macOS `/usr/bin/sandbox-exec` 的 `(version 1)(allow default)(deny network*)`，实际 socket bind probe 必须被 OS 拒绝。worker 第一步检查当前进程 socket bind 得到 `PermissionError`，然后才安装 Python socket audit、读取输入、导入模型。Python audit 为补充；worker 无 OS 隔离即 fail closed。`HF_HUB_OFFLINE=1`、`TRANSFORMERS_OFFLINE=1`、禁用 telemetry 同时设置。600 秒超时由已有 helper 终止整个进程组。

mlx-audio 0.6.4 的 aligner post-load hook 实际调用 `AutoTokenizer.from_pretrained(..., trust_remote_code=True)`；本入口没有把它虚报成 false，也没有编辑已安装库。数据文件精确 allowlist、拒绝模型代码/`auto_map` 与 OS 禁网共同约束加载。运行时 RECORD 哈希不等价于逐文件 runtime 完整性验证。

同版本 `ForceAlignProcessor.parse_timestamp` 内部会调用 `fix_timestamp`，使用最长非递减子序列、最近邻或插值修复时间。脚本运行时替换 processor 为 recorder subclass：在 `parse_timestamp` 进入时保留原始毫秒向量，在 `fix_timestamp` 调用 `super` 后保留修复向量、每一改变的索引与 delta。保留 processor 文件 SHA-256，并记录实际 `model.config.timestamp_segment_time`（毫秒）、原始分类时间分辨率、上游修复整数毫秒及返回秒数三位小数。三位小数是显示格式，不是毫秒对齐精度；修复后的值也可能不在原分类网格上。模型返回 items 已经后处理，字段因此叫 `postprocessedItems`，绝不叫 raw items。`processor-observations.json` 也尽可能保留失败中的原始证据（可含非有限 JSON 数字，仅供诊断）；成功 draft 严格拒绝非有限数值。

## 文本与切点规则

token ledger 精确复现 pinned Chinese tokenizer 支持的 CJK ideograph ranges：每个 CJK 字为一个 token；其他 Unicode letter/number 与 ASCII `'` 连续成 token，标点或空白 flush。例如 `index.js` 得到 `index`、`js`，保留大写 `REA`、数字和 Unicode 原样，不做 lowercase、Unicode 或数字归一化。保留 codepoint 与 UTF-8 byte offset，逐个登记 discarded separators；组合标记、symbol 和非空白 control 拒绝，而非静默丢弃。phase 边界落在连续 Latin/number token 中间直接拒绝。

返回文本必须与 ledger 的有序 token 逐项相等，不能只比拼接字符串/词集合。forced aligner 的词来自给定 transcript，这不构成 ASR、独立听写或真实内容验证。非有限、负数、越界、反向和 overlap spans 拒绝；零时长 token、间隙及 timestamp repairs 显式保留为 review flags，不假造时长或悄悄修正。

每个 phase 间切点只能取 `[左 phase 最后 token end, 右 phase 第一个 token start]` 的 midpoint，保留两端 anchor 与 gap。起点 0 和最终容器时长是技术覆盖端点，不是已证实语音边界。无法解析的 cut 保留 `null` 在 `diagnostics.json`，失败时不写成功 draft。另按既有 renderer 的 30fps 边界舍入（末帧 ceil）计算 prospective cue frames；不足 4 帧只 flag，绝不移动/伪造边界或声称可渲染。没有 `method=forced-alignment-reviewed`、schema 1.1 timing、`reviewBasis`、可渲染 sidecar 或导出捷径。

`auditions/` 生成每切点 ±1.5 秒的 PCM WAV，逐帧直接切原 decoded PCM（文件边界处截短），保留 source start/end frame、秒数、cut-relative sample、量化切点及左右全文。`review.md` 链接完整原录音与全部 audition。听审应检查切点是否切进音节、停顿归属、零时长与修复附近异常；所有听审结论待人确认。

失败保留日志、命令、部分 processor outputs、`failure.json`，不重试、不 fallback、不覆盖已有输出。成功只写技术提案 `draft.json`，从来不写 renderer 可消费的审阅证据。每次新输入/实现应使用新目录重新运行。

## 聚焦验证

```sh
work/local-voice-v1/venv/bin/python -m unittest discover -s tests -p local_alignment_test.py -v
```

离线测试覆盖 exact mixed Chinese/Latin/标点/数字及 offset、token 次序、phase inside-word、NaN/负数/越界/反向/overlap、零时长 flag、gap anchor midpoint、repair annotation/recorder、30fps 的 3/4 帧阈值与切点原样保留、空输出 null cut、已有输出不覆盖、缺模型、真实 10 文件布局（假字节）接受与缺 vocab/merges 拒绝、源 hash 拒绝、worker guard 顺序与真实 PCM 切片一致性。单元假 spans 不声称真实模型已运行或音频已听过。真实两录音运行及独立 judge 证据单独冻结；听审继续 `UNVERIFIED`。
