# Huihui WinRT 独立可靠性与安全复审

**判定：PASS。** 冻结清单 SHA-256 为 d373039aedeff5bfa604a31a84cea2f0ecbe6d3a2ea1fc81cc6a341c9325a49a。425 份冻结文件与解包的 12 个改动文件全部匹配清单。冻结候选未改动。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 复用 219 个本地包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/tts.test.ts tests/presentation.test.ts tests/usage.test.ts tests/operations.test.ts` 退出 0，64/64 通过，覆盖旧本地导入、旧调用模式、缓存、展示及用量，以及新增文字和 WAV 界限。此次未重复运行全套默认测试。
- `pnpm exec tsx work/verify-huihui.mjs` 从原 Express 状态的隔离副本运行，退出 0。真实本地 WinRT worker 取消后进程关闭，临时目录和侧车删除。同一任务第 2 次成功，重提生成和导入命中缓存，修改文字产生不同任务。生成 ID cdcdf401610d1d9c6b31ae4cf5485f4e9afb11c1ab3105234d149d6d9731b793、WAV 摘要 f8e64f10778b1058815ea68e0261c7638c08c9746e41d8087ce2162e74a882dc、生成清单摘要 eda7456702d33c69bf9ec6443b391f5eae3f8e4bae35f145b77c69202d7389a9 与冻结一致。生成 WAV 和中文预览完整解码通过。禁用 FFmpeg、FFprobe 后的生成状态、收据导出、导入及预览读取均通过。损坏生成清单后逐级拒绝；恢复后成功。哈希自洽但文本伪造的导入记录被拒绝。输出见 work/judge-huihui.log。
- `node --import tsx work/judge-injection.mjs` 退出 0。通过实际 worker 发送包含 PowerShell 命令分隔符、命令替换语法和 SSML 标记的中文文本。拦截观察到固定 argv、shell=false，文本只以原字节存入独立请求 JSON，父进程合成秘密环境标记未传入。进程关闭时注入标记不存在，后续目录清除；同样输入重提只启动了一个真实 worker。记录见 work/judge-injection-verification.json。
- 静态核对固定 Huihui OneCore token、zh-CN 和纯文本合成方法。输入限 120 Unicode 码点，worker 读出限 2 MB，WAV 要求 16 kHz mono 16-bit PCM、30 秒、非数字静音，严格校验 RIFF 边界。worker 30 秒、任务尝试 45 秒。固定项目脚本和系统目录为受信任的本地安装，依赖正常 Windows 进程树终止能力。本轮实测正常取消，未模拟终止工具故障、硬杀或 worker 整体超时。未审计 Windows 语音子系统网络活动。

独立新状态的生成和导入指纹一致，展示 MP4 也逐字节一致，但本次新导入收据及其 artifact 的 createdAt 不同，改变了收据摘要，随后语音与预览任务 ID 不同。这是跨独立导入的身份限制，不影响同一状态缓存或历史字节。未进行听音、语音内容、连续感知或所有者验收。
