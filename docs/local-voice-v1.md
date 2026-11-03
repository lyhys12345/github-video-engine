# 本地 Chen 参考音色 v1

这是独立的本地短样本实验入口：用用户授权的一份完整参考录音，对固定 Qwen3-TTS Base 模型做 reference conditioning。它不训练模型、不提取 ElevenLabs 模型、不取得原始 ElevenLabs 权重，不调用远程语音服务。参考人物相似度、自然度、转录准确性均为 `UNVERIFIED`，最终听审为 `pending`。

模型固定为 `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit`，revision `e7dd0585652209fa0d7783659aad4e8a324de11c`。运行时固定为独立 Python 3.12.14 / mlx-audio 0.6.4 环境，实际依赖由 runtime lock 逐项核验。本入口没有下载、自动重试或换模型流程。

## 在新机器准备固定环境和模型

Git 保存的 `config/local-voice-v1/requirements.txt` 包含固定版本及 wheel 哈希，`model-lock.json` 保存固定模型 revision 的全部文件长度和 SHA-256，`runtime-lock.json` 保存约定 Python/包版本。准备与推理是两个明确分开的动作；以下安装与公开模型下载命令须由操作者显式运行，推理入口不会自动安装、下载或联网生成。

在支持 MLX 的 macOS Apple Silicon 上，从仓库根目录创建新环境：

```sh
uv venv --python 3.12.14 work/local-voice-v1/venv
uv pip install --python work/local-voice-v1/venv/bin/python \
  --require-hashes --only-binary :all: -r config/local-voice-v1/requirements.txt
mkdir -p work/local-voice-v1/setup work/local-voice-v1/models
work/local-voice-v1/venv/bin/python scripts/prepare-local-voice.py \
  --runtime-lock-out work/local-voice-v1/setup/runtime-lock-local.json
```

`--runtime-lock-out` 是纯本地操作：先与 Git lock 核对精确 Python 和每个包版本，再采集当前安装的 RECORD 哈希，写全新的本机 runtime lock。同版本在不同路径安装时 RECORD 可有差异，因此不沿用另一台机器的 RECORD 哈希；不会放宽或自动更换版本。新锁同时绑定 Git runtime lock 与 requirements 的 SHA-256。Profile 的 `runtimeLockPath` 应指向这份新生成的锁。

显式下载约 3.104 GB 的公开模型数据到新目录：

```sh
work/local-voice-v1/venv/bin/python scripts/prepare-local-voice.py \
  --model-out work/local-voice-v1/models/qwen3-tts-1.7b-base-8bit
```

准备脚本仅使用 Python 标准库，只接受上述固定官方 HF repository/revision 的 Git model lock。只下载锁内数据文件，限制 HTTPS Hugging Face 域名及其 CDN 重定向，不读取录音、API key 或 token，不导入/执行下载内容，不启动推理。每个文件包括小 JSON/词表都核验锁内长度和 SHA-256；JSON 拒绝 `auto_map`。已存在的目录/文件拒绝覆盖；下载中或校验失败保留 `.partial`，不自动重试、不自动替换模型，失败后应保留该目录并选择另一全新目录重试。只有单个文件完全验证后才生成其正式文件名。模型目录不添加额外 receipt，方便推理入口精确核验文件集合。

之后将 profile 的 `modelPath` 指向新模型目录，`modelLockPath` 指向 Git `config/local-voice-v1/model-lock.json`，`runtimeLockPath` 指向本机新锁。参考录音和全文转录仍需操作者单独准备并核对 WAV 哈希；准备脚本不会取得或处理它们。

## 本地输入

`--profile` 为 JSON，内部相对路径相对 profile 所在目录；建议使用绝对路径。示例中的路径须替换为已准备好的本地文件：

```json
{
  "schemaVersion": "local-reference-profile/1.0",
  "modelPath": "/absolute/local/model-directory",
  "modelLockPath": "/absolute/local/model-lock.json",
  "runtimeLockPath": "/absolute/local/runtime-lock.json",
  "referencePath": "/absolute/local/full-rembg-24k-mono-pcm16.wav",
  "referenceSha256": "<sha256-of-that-wav>",
  "referenceText": "<与完整参考录音对应的完整原文>",
  "authorization": "user-declared-permission",
  "referenceTranscriptVerification": "caller-declared-not-independently-transcribed"
}
```

本轮实际只使用恢复的完整 rembg 录音转换得到的 24 kHz、单声道 PCM16 WAV，不裁切、不拼接其他录音；参考原文使用 `fixtures/continuous/generation-receipt.json` 对应 rembg 的 exact text。转录状态明确保留为调用方声明、未经独立听写确认。授权字段记录用户声明，不声称已独立审查服务条款。

Model lock 格式为 `{repository, revision, downloadOnly: true, remoteCodeDownloaded: false, files: [{path, sha256, bytes}]}`，可额外保留上游 LFS SHA-256。每一个本地文件都必须在锁中，逐个核验长度和 SHA-256；拒绝缺失、额外文件、symlink、路径穿越、Python/pickle 等可执行格式和任意 JSON `auto_map`。必须有本地权重和 speech tokenizer。

Runtime lock 格式为 `{schemaVersion: "local-voice-runtime-lock/1.0", pythonVersion, runtime: "mlx-audio", runtimeVersion: "0.6.4", packages: {name: version}, distributionRecords: {name: recordSha256}}`。验证精确 Python/包版本，以及锁内各 distribution 的 RECORD 文件哈希；RECORD 哈希是安装元数据绑定，不代表已重新逐一哈希包内每个文件。

`--text-file` 是 1–300 个 Unicode 字符的 UTF-8 文本文件（文件末尾换行也计入长度），必须有非空白内容，不得有 NUL。固定调用一次 generate，不按换行分段。为方便首轮人工听审，应准备约 8–15 秒的新文本。生成使用 `seed=42`、`temperature=0.7`、`top_k=50`、`top_p=1.0`、`max_tokens=256`、`lang_code="Chinese"`、`stream=false`。

调用请求 `repetition_penalty=1.05`；mlx-audio 0.6.4 的 ICL 路径内部强制提高到 1.5，因此 receipt 同时记录 requested=1.05、effective=1.5。该版本 generate 的有效语言参数名是 `lang_code`。256 个 12 Hz token 的预算只适合短样本，不保证完整读出所有 300 字；工程检查不能证明文本完整性，仍须听审。

## 运行与预检

从仓库根目录运行；输出目录必须不存在，其父目录必须存在。环境变量指定真实的绝对可执行文件路径，路径及其父目录不允许 symlink。

```sh
GVE_FFPROBE=/absolute/tools/ffprobe GVE_FFMPEG=/absolute/tools/ffmpeg \
  work/local-voice-v1/venv/bin/python scripts/local-chen-reference.py \
  --profile /absolute/profile.json --text-file /absolute/newtext.txt \
  --out /absolute/new-check-directory --check
```

去掉 `--check`，并使用另一个全新的输出目录，即进行真实生成。预检核验输入、模型文件、运行时和 OS 禁网能力，不导入/加载 MLX 模型，不产生音频，写 `check.json` 而非成功 receipt。

此入口要求 macOS `/usr/bin/sandbox-exec`，以 `(version 1)(allow default)(deny network*)` 启动 worker，先实测本地 socket bind 被 OS 拒绝。Sandbox 不可用或探针失败时停止；Codex 外层沙箱可能限制嵌套 sandbox-exec，此时须在允许 sandbox-exec 的执行环境运行，不能关闭入口自身的网络隔离。

内部 `--worker` 入口第一步直接在当前进程创建 socket 并尝试 bind `127.0.0.1:0`；必须实际得到 `PermissionError` 才继续。bind 成功即关闭 socket 并拒绝，其他异常同样停止。此检查先于 Python audit 安装、参考文件读取和模型导入；不会启动嵌套 sandbox 来替代当前进程的隔离证明，因此直接绕过 outer 入口也会 fail closed。

Worker 设置 `HF_HUB_OFFLINE=1`、`TRANSFORMERS_OFFLINE=1`、`HF_HUB_DISABLE_TELEMETRY=1`、`DO_NOT_TRACK=1`，在导入模型依赖前安装 Python socket audit 拒绝钩子。钩子仅为 OS 禁网的补充。Worker 使用本地 `Path` 加载器和固定安装架构 `qwen3_tts`，不传远程仓库名。当前加载 API 未显式实现有效的 `trust_remote_code` 参数，不能把 `**kwargs` 接受参数误报为禁用远程代码的证据；通过拒绝模型代码/auto_map、使用安装架构及 OS 禁网约束执行。

单次 worker 最多 600 秒，超时终止整个进程组。输出必须是非空、有限数值、非全静音且不超过 30 秒的单声道 PCM16 WAV；随后用指定 ffprobe 检查实际流/时长，并用 ffmpeg `-xerror` 完整解码。通过后才写 `receipt.json`。失败保留日志和 `failure.json`，不写成功 receipt；已有输出目录完全不覆盖，拒绝时只在 stderr 报错。

Receipt 绑定 profile、reference WAV、完整 reference text、输入文本、脚本、model lock、runtime lock 的哈希，记录有效参数、WAV 哈希/时长、完整解码结论、worker 信息、`remoteProviderCalls=0` 和 `providerChargeUsd=0`。这些费用字段仅指本入口的本次执行，不代表历史 ElevenLabs 消费为零。

## 验证范围

```sh
work/local-voice-v1/venv/bin/python -m unittest discover -s tests -p local_voice_reference_test.py -v
work/local-voice-v1/venv/bin/python -m unittest discover -s tests -p prepare_local_voice_test.py -v
```

测试须在允许 sandbox-exec 且自身未受网络拒绝的外层执行环境运行，以免 Codex 外层沙箱影响直接 worker 的对照测试。包含实际未隔离 worker 在读取输入前被拒绝、实际已隔离 worker 通过 guard 后进入输入校验两个独立子进程测试；另有 mock 测试仅验证 guard → audit → preflight 顺序，不冒称真实隔离。

测试独立于默认 JS test 列表；涵盖缺模型、同长度哈希篡改、ref hash、路径/symlink、额外文件、auto_map、运行时版本、文本边界、已有输出保留、Python audit 和真实 OS 禁网探针。测试使用假权重文件验证输入拒绝路径，不把它们声称为真实生成。真实模型生成、媒体原始证据和独立 judge 结论由冻结候选的单独证据记录提供，不能用单元测试替代。

准备脚本另有两个离线拒绝测试：已有模型目录不发起网络请求、同长度的小文件 hash 错误保留 `.partial` 并拒绝发布正式文件。这些测试使用内存响应，不能声称已实际重新下载完整模型。

模型、环境、三份录音登记和真实输出位于 ignored `work/local-voice-v1/`。只将脚本、这份说明和聚焦测试纳入代码变更；不改变既有字幕冻结候选或六个在改文件，不自动生成影片，不新增付费 API。
