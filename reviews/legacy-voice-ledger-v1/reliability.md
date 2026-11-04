# 旧语音账本读兼容独立可靠性与安全复审

**判定：PASS。** 冻结清单 SHA-256 3338c5784333d1c9709ea8c3d41d973ebc75dc9518754a1c989ede1ff07c4411。逐一核对 446 个冻结文件的大小与 SHA-256，另核对解包后的 3 个改动文件，全部一致。候选未修改。

## 独立执行记录

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个本地缓存包，下载数为零。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts tests/tts.test.ts` 退出 0，54/54 通过。
- `pnpm exec tsx work/verify-legacy-ledger.mjs` 退出 0。脚本从冻结输入只读复制状态到独立的正例与负例目录，完整执行。原始早期账本 SHA-256 60cc3ea71227378ccb9c24601c851d2a403d8ac98c29b066659bae2d631c613b。关闭媒体工具后的历史状态、恢复与导出通过，51 个导出文件均保留原字节，只读验证前后状态文件哈希一致。历史与现代修订的 51 份内容中只有语音与预览清单不同，独立等价收据 SHA-256 为 29b995ceec598e37e79ff790bd3db25267713b0ecb07dd94a85711279964c17d。
- 同脚本实测未知 producer 指纹、混合或变造事件形状、改值、漏字段、漏事件和父清单绑定错误等内部哈希一致的伪造任务均拒绝。新渲染和未完成历史任务恢复以旧账本启动时在派发前拒绝。独立损坏账本、整段 PCM、单段 PCM 与原始录音收据，状态与导出均拒绝，未出现目标目录，恢复原字节后验证通过。原始输出见 work/judge-legacy.log。
- 另用独立 CLI 进程执行 `node --import tsx src/cli.ts presentation VERB --task ID --kind KIND --data ../gve-voice-ledger-legacy-freeze-v1/work/state`，将 GVE_FFMPEG 和 GVE_FFPROBE 置为不存在的 judge-disabled。旧 voice 11fd3a7e… 与旧 narrated 19c33c26… 的 status 均 verified，返回 voice-ledger-1.0-early-event-trace；语音事件恰有 beatId/frame/sample。旧预览 resume 同 profile 且 cached true。现代 narrated cc06313b… 的 status 和 resume 均 verified，resume cached true，两者均无旧 profile。
- 独立复现重新拼接的混合序列 ID cd149aa6ef5e06b02326f569f2e5797e3e29a2a90976a1f78be46445688ade77，通过完整双流解码，996 帧和 1,992,000 声明样本。子清单和旧账本保留原字节。禁用媒体工具后 `node --import tsx src/cli.ts presentation sequence-resume --task cd149aa6ef5e06b02326f569f2e5797e3e29a2a90976a1f78be46445688ade77 --data work/state` 返回 verified/cached true。

## 范围与限制

兼容分支仅允许已固定 producer 指纹、1.0 绑定和完整规范化旧投影一致的历史读取。其余派生文件仍逐字节匹配，预览引用仍绑定原始父清单，渲染和未完成恢复保持严格校验。早期 producer 源码未恢复或重放，历史兼容依据已存字节和固定指纹。

同一已提交产物重读保留原字节；新拼接的独立编码 MP4 SHA-256 为 1e4d8c8081b9de62ad0694d1d4a47a94372534d9783525fcddd430e87dd62ed6，冻结为 38d03895592d40ae0384b68a704fa0cc3c5d9499ffc2a0536b5a04bc7f93ffbf。跨编码字节确定性不在此次兼容验收内。未进行人工听音、连续观片、最大资源压力或硬杀恢复。导出使用 receipt-v1。
