# chi 修订候选 / J1 产品 Judge 复审

- 复审对象：`C:/Users/luyuh/Documents/Codex/gve-chi-review/runs/eed4fe8f929b7ec2-907523fdaad9/editable-preview/.asset-staging-ee4f0c24-9fad-4c57-8da3-53d5e601d5e5-5CqmAO/excerpt.mp4`。
- 实测 SHA256：`3250f6d598945148451ffbc2bee8682b78d160785e8dcd47ff64cc50f34f047a`，与交付冻结值一致。FFprobe：63.8 秒，720×1280，H.264/AAC。
- 独立性：只检查候选、HTML入口及自己的首轮问题；未读取其他 Judge 复审报告，未改被审代码或产物。
- 结论：**作为已完成正式成片仍不能放行：FAIL（成片身份）**。无背景观众是否真正看懂、完整产品可用性及听看仍 **UNVERIFIED**；不替其他专项或用户最终验收作结论。

## 首轮问题复验

| 问题 | 复核结果 | 本轮依据与限制 |
| --- | --- | --- |
| J1-01 成片身份 | **未解决** | 实际首帧明确显示 `COMPLETE TECHNICAL PREVIEW`、`NOT A FINISHED VIDEO` 与 `listening pending`；根目录 HTML 同样标为 experimental / not reviewed。用户要求正式成片审阅，不能把该技术预览判为已交付正式成片。视频抽帧记录是事实，是否达到观众满意的正式美术与音频还需另审。 |
| J1-02 缺少普通观众上下文 | **部分改善，尚不能认定解决** | 约 4 秒和 8 秒的采样帧中，字幕增加“chi 是 Go 的路由工具。请求来了，它决定交给哪个处理器”，相比首轮直接引入 404/405，有了项目作用和输入用途。画面仍以小型文件符号与连线为主，仍出现 Go、路由、请求、处理器等术语；是否足以使无背景观众理解，单凭离散帧无法证明。应做无背景用户理解测试或由授权审阅者真实视听。 |
| J1-03 可编辑交付与错误边界 | **UNVERIFIED** | HTML 含 editable source 链接，但本轮未在隔离副本完成实际编辑、错误输入与重导出。 |

## 方法

1. `Get-FileHash <候选> -Algorithm SHA256`，核对冻结值。
2. `ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height -of json <候选>`，读取真实媒体信息。
3. `ffmpeg -hide_banner -loglevel error -i <候选> -vf 'fps=1/4,scale=288:-2,tile=6x3' -frames:v 1 -y work/chi-formal-review-20261106/product-recheck-frames/contact.png`，退出码 0，并实际查看生成图。抽样每 4 秒一帧，约覆盖开头、上下文、示例、边界和结尾；黑色尾格为拼图无帧，不代表成片黑屏。
4. 只读检查 `workspace-preview.html` 的实际入口与状态说明。

## 限制

没有连续观看或听音，因此语速、音色、连续衔接、自动字幕对齐及普通观众真实理解均未验证；事实准确性由内容专项独立判断。本结论只覆盖上列首轮产品问题，保留先前未经验证的用户编辑和恢复场景。建议生成明确的正式候选并完成事实、可编辑性和视听验收后，再以同一新版本复审。
