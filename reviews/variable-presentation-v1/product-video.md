# Variable presentation v1 C1 / 独立产品与视频审查

- **产品：PASS，限定本轮已保存 proposal 和两个模块的编辑/渲染路径。** 两项目原计划成功读取与缓存复用；分别自行新增一个 2 秒 beat，产生新 proposal、计划和非缓存实际视频，旧版仍可导出；非法和未支持输入明确拒绝。未代判来源语义、安全/并发与完整产品范围。
- **视频质量：UNVERIFIED。** 当前静音 MP4 全解码、有限静帧的因果/标记检查通过；没有连续观看、音频、实际手机观看或零背景观众测试，不能把静帧当作整体质量 PASS。原 owner 延期允许工程继续，不是审阅者观看/听音或最终 G4/G6 通过。
- `candidate.json` SHA-256 `086c56ab440ec21dd534ee101731a1fad00e41af24379246dd8f6e9f8c18b154`；806/806 项逐条核验哈希和长度一致。解压 source-exact.zip 并复制 state 到 `judge-product-visual`，链接本机依赖；所有输出仅此独立目录。2026-11-03 PST。先读 OPERATOR、docs/variable-presentation-v1.md 和角色规则，未读 builder 总结或其他 judge 报告；原提案与计划取自冻结包，未独立重新作者原片或重新捕获仓库。未执行目标仓库、付费或部署。

## 独立产品操作

Express 原 proposal `1eefc7fefefdeeb0a342368fc9e771c0b5f068a41735350ca1afd0af012da6f9` → `http-exchange/1` 计划 `96dc238a9b1e8201e4256c4d242a7d409a7f798db8c09d76c2a65e35f08d94ed`（4 beat、480 帧）；rembg 原 proposal `e7cd91f64a71ac8a0654b6ce8a5bbf86d43734292010822f293182e820fd8dea` → `image-output-choice/1` 计划 `dd2e102ac12d76dad44692bc3a3e904d76b37d781f76a6758e2fcf569632e259`（5 beat、540 帧）。调用 `project presentation-plan` 和 `presentation render` 均成功但原结果 cached:true；独立 status 验证 succeeded/integrity verified 后新目录导出，不能声称原片本轮新渲染。

本人在两原 proposal 末尾自行增加 `judge-hold` beat，并在计划中追加 48 帧无事件以保留前景状态，重新提交 proposal；新计划 `7d010e12601de647d4dcd2fe17801674cc7d2a9022b95d35150f0469dab67ef9` 为 5 beat/528 帧，`d8fe5713c668af5453767d79fa148e0c489cee539db48e7e14a03400932f2eff` 为 6 beat/588 帧，均 cached:false。实际 `presentation render` 各自 cached:false/succeeded，随后 status integrity verified，独立导出 22 秒和 24.5 秒新 MP4；对应末帧 `express-insert-export-final.png` 和 `rembg-insert-export-final.png` 亲自查看，均呈本人新增回顾标题并保留上一个结果。原版仍可导出且 SHA-256 与新片不同：原 Express `93eb8bc70ffed1b89fd03629ac485f7ce02983b0db1e8fc33151ab1fab6b125d`；新 `1831fbdb07b77a0b1804d6fda29b02b04a9cf93d7db870bc2ec4b08a347885a4`；原 rembg `bd36c98fae4fe4192c63cf00e7366e15dd69d3e82ad8ffb6f4570e13f4b96be9`；新 `b0a21f883f7582577ad09b7142ae9ddad98456588785a8a62e4a29d22d57c4e6`。此处是尾部插入，不证明任意位置、任意事件都正确。

四份 receipt 重算其列出文件的哈希与长度：原 Express 27/27、rembg 34/34，新 Express 28/28、rembg 35/35 匹配，receipt digest 与返回值一致。Express 首镜设 1 帧被 `PRESENTATION_SCHEMA` 拒绝、退出 1；p-limit 队列提案套 HTTP 模块被 `PRESENTATION_UNSUPPORTED` 拒绝、退出 1。详细 stdout 及输入保存在 `*-plan-run.log`、`*-insert-*.log`、`invalid.log` 和 `unsupported.log`。本轮未实测新 proposal 的源语义、任务真正中断/恢复或全部 1–20 beat/60 秒边界。

## 实际 MP4 与手机尺寸抽帧

独立 ffprobe 两原版：H.264、720×1280、24fps、仅视频流；Express 480 帧/20 秒、rembg 540 帧/22.5 秒。FFmpeg 对两片完整解码退出 0。直接从各 MP4 解码 360×640，逐张用图像工具看 Express 帧 0、18、119、120、138、239、240、262、359、360、380、479（`express-frames/01–12.png`）；rembg 帧 0、12、95、96、108、191、192、208、311、312、327、407、408、422、472、539（`rembg-frames/01–16.png`）。

Express 样帧可追踪监听 3000、GET /、处理函数高亮、响应返回 Hello World；常设“Silent · Illustration · No observed execution”。rembg 样帧保持同一鸟：原图、普通命令、透明抠图、-om、蒙版及并排比较；各示意明确，未看到旧版彩色结果标作完成蒙版或关键对象互相遮挡。静帧给出因果线索，但零背景观众是否能实时理解术语与过程并未受试；画面为稳定卡片与图示，确有时序状态变化，是否像 PPT 或动作流畅须连续观看，不能仅凭点样判断。

**V-1（minor / 手机可读性风险）**：rembg 327/472/539 等帧的完整命令很小，在 360×640 输出中 `-om` 与路径不易区分；前一镜大标题有 `-om`，但比较画面两条命令依赖小字。建议突出差异或简化路径，并在真实设备/平台叠层及实际停留时间下复核。此处不是声称已在实体手机证明不可读。两片字幕为单独中文 VTT，对应镜头时间；没有声称语音对齐，也未观察字幕播放器实际呈现。

## 未覆盖

未连续观看或听音（影片明确静音）、未做零背景观众复述、主观节奏和平台安全区验证；未运行全套或中断恢复，来源事实和其他角色不代判。后续改动须冻结新版本、回看受影响事件和邻近切换，最终 owner 视听与接受仍待执行。
