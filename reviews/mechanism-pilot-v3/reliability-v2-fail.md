# Standalone scalar SVG pilot v2 / Independent reliability and security

- **FAIL**. 两项 Major：输出路径隔离可被绕过；一个通过输入校验的文本可使 CLI 成功交付不可解析 SVG。
- candidate-hashes.json SHA-256 e12b6c3a4a3fbc3c19fbe5ac484741bfb542c280c82cb4d6fe32d80fa9d79980。101 个列出路径全部一致。这是选定文件清单，不是对整个源码依赖树或 state 的完整文件清单。输入 state 仅用隔离副本，已提交 Story 来源另外逐项验证。
- 2026-11-03，Windows x64、Node 24.22.1。本轮运行可信引擎及测试，只写 judge-reliability。未运行目标仓库、未打开历史源页面、未调用外部网络或媒体生成。
- 本范围是独立的单标量、固定点、静音 SVG pilot。Mechanism 自身没有任务/CAS，Story 输入确实来自已有持久任务与 CAS。连续视频、音频、动画图接入和生产审核均不适用本轮，未作为通过依据。

## 独立结果

| 条款 | 判定 | 证据 |
| --- | --- | --- |
| 捕获来源、Story 和固定引用绑定 | PASS（字节与结构） | audit.log、focused-native.log。两 Story 导出的所有来源及隔离 CAS 均匹配 Story 哈希与冻结清单。REA 官方页以历史 standalone URL 和固定字节保存，未附会 Git 关联。另一些来源 URL 带有各自 Git commit，不能据此把官方网页或整个 Story 关联到该 commit。fill 是 locally authored fixture，example.invalid 不作网络来源。不存在的数字、篡改 quote、Story ID 混用及错 graph/source-manifest 哈希均拒绝，损坏的同尺寸官方 CAS 也拒绝。 |
| 输入限制、时间和可复现性 | PASS（已测范围） | audit.log、frozen-reproduction.log、focused-native.log。REA 的 19 个文件和 fill 的 12 个文件都在两个独立 CLI 运行中逐字节一致，且与各自冻结 review 输出完全相同。文件闭合、sidecar 摘要、编译器文件摘要逐一核对。非法事件、路径样式 ID、越界时间、过大文件、非法 UTF-8 均拒绝并未创建输出。候选 node:test 1/1 原生通过，覆盖固定点边界、超阈值比较、跳过、手动及 repository-bound 拒绝；其中仓库绑定为构造测试，不执行目标代码。 |
| 同址保护与中断恢复 | PASS（声明范围） | audit.log、barriers.log。已完成输出拒绝覆盖，前后哈希一致。真实 SIGKILL 在成功写入 sidecar 后留下未完成目录且无 manifest；同址拒绝并保持字节，文档指定的新目录重试成功。未承诺清理、自动继续或同址幂等缓存。 |
| 输出路径边界 | FAIL | audit.log、barriers.log、prepare-path.log。静态 preview 输入、state、输出父目录的 junction 均拒绝。prepare 的 sidecar 路径接受静态 junction，preview 对已建输出目录的并发 junction 替换无防护。 |
| 恶意文本安全及可解析产物 | FAIL（SVG 完整性）；所测 XSS PASS | xml.log、source-xss.log、audit.log。sidecar 中脚本、外部 image href、onload 和合成来源的精确恶意引文均保持文本，严格解析后无活跃标签/属性。U+FFFE 则被写入成功清单里的 SVG，标准 XML 解析拒绝。没有在浏览器中主动执行恶意源码。 |

## J2-MECH-01 / Major / 输出路径隔离

准备入口直接 writeFile(sidecar,{flag:wx})，未预检输出祖先。真实本机命令 prepare-rea-rule-pilot.ts 使用独立 state、正常 story 目的地和 scratch-only path-junction/generated-sidecar.json（指向 path-user）。退出 0，文件落到 path-user，原 sentinel 保留。这与 preview 静态拒绝联接父目录不一致。另用单独 CLI 在真实 mkdir(output) 返回后暂停，另进程把新目录重命名并在原路径建指向另一个 scratch 目录的 junction。释放 IPC 后实际 preview 退出 0，把全部 SVG、JSON 和 manifest 写到无关目标，原来自己创建的目录仍空。所有文件写入和 junction 均真实，IPC 仅固定时序。参见 barriers.mjs、barriers.log 和 prepare-path.log。影响为能被利用的路径重定向及成功回报与实际目的地不一致。此复现要求调用者传入含联接路径，或竞争进程能改写目的地父目录，没有证明提权或已存在文件被覆盖。复验应同时覆盖两个入口、静态/替换联接、已有用户数据和普通目录。

## J2-MECH-02 / Major / 成功清单中包含无效 SVG

将合法 sidecar 的 state.unit 改为普通文本加 U+FFFE，UTF-8 合法、schema 接受且来源绑定未改。原生 CLI 退出 0，写出 manifest，System.Xml 禁止 DTD 的严格解析器拒绝 beat-001-start.svg，提示 invalid character 0xFFFE。XML 文本函数会转义标记及去掉一部分 C0 字符，但该字符仍进 SVG。预期是输出完整可读 SVG，或在建立输出目录和 manifest 前明确拒绝这种输入。清单哈希只能证明坏字节没有变化。正常 REA/fill 和两种恶意标记 fixture 经同一个解析器可读。参见 audit.mjs、xml.log。复验应覆盖 U+FFFE、U+FFFF、一般 Unicode、格式边界与已有 XSS 转义。

## 范围与限制

- 实际 SIGKILL 仅针对本轮专用子进程。中断屏障是测试注入，真实 writes 和退出信号区分记录。未做断电持久化、任意并发替换的穷举或跨平台认证。
- 恶意引文使用另行生成、完整提交的本地合成 Story/CAS，目的是覆盖从精确来源引用到 SVG 的文本路径，不能拿来证明真实网页语义或现代网站状态。未做浏览器执行、联网或全套 CSP 渗透。固定来源结论只涉及捕获字节和引用绑定。
- 不要求 mechanism 专用 CAS、连续视频或音频，也未以冻结 PNG 冒充本轮媒体生成。历史报告、候选及原件均未改。
