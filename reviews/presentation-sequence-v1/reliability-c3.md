# c3 本地化序列 1.2 独立可靠性与安全复审

**判定：PASS。** 未发现阻断项。冻结清单 SHA-256 为 2a4658749ff29b3302a580e13fdd572219fe5e2b6b2dcdf577a4733a35ac1c2d。逐一校验 677 个清单文件的大小及 SHA-256，并复核解包后的 6 个改动文件。两组均零差异。未改动冻结候选。

## 独立执行记录

命令均从本报告目录执行，测试和篡改操作仅在独立副本进行。获准使用 Windows 本地 CAS 和收据发布所需的硬链接。

- `pnpm install --offline --frozen-lockfile` 复用 219 个缓存包且下载数为零。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/presentation.test.ts tests/concurrency-queue.test.ts` 退出 0，32/32 通过，耗时 9.03 秒。
- `node --import tsx work/judge-locales.mjs` 退出 0。断言缺少 locale 或指定 zh-TW 返回 LOCALE，英文标题含汉字、中文标题纯 ASCII、13 个汉字、滤镜选项片段、文本表达式、换行、路径穿越场景 ID 返回 SCHEMA。语法允许但字体缺失的汉字 U+31350 返回 GLYPH。单独修改独立副本的字体和 OFL 文件各一字节，均返回 FONT，随后恢复精确字节。所有拒绝均在任务派发前发生。状态目录重叠发布被拒且未创建目标。含混合字符和标点的实际中文标题“单槽（A），示例！”成功编码，产生不同于英文基线的 ID ed3e7049dfc33fa02a6509b832dbded0a9bfe80082b3935d8208f8eaf3aad892，1,019 帧。重复提交命中缓存。导出清单保留 zh-CN、原题文字、[528, 564) 区间以及字体和授权文件的固定哈希。原始输出为 work/judge-locales.log。
- `node --import tsx work/judge-history.mjs` 退出 0。冻结历史脚本在独立状态和输出副本中重跑，1.2 旧导出引用指向 c3 冻结路径。禁用媒体工具后，1.0、1.1、1.2 的 status 均 verified，已完成 resume 均 cached，重复发布均重用原收据。三代新导出的 sequence.json、sequence-manifest.json 和 sequence.mp4 分别与各自冻结版逐字节一致。1.0 和 1.1 的新提交均返回 VERSION 且未派发。原始输出为 work/judge-history.log。

## 实现检查与限制

语言和标题使用有界、严格结构验证。字形检测只解析固定 SHA-256 的字体，使用 format-12 cmap；未知字体和授权文件先被拒绝。标题和本地化固定文字写入编号的 UTF-8 文件，drawtext 的 expansion=none，用户内容不直接插入滤镜参数。规范化规格和字体及授权摘要参与任务身份；缓存重读验证历史字节并保留原版清单格式。中文合同限定 zh-CN 和字形可用范围，不提供一般 Unicode 或其他字体承诺。20 MB 字体、20 KB 授权、32 KB 规格、2–4 场景、7,200 帧含标题卡、160 MB 子文件验收限制及 80 MB 视频输出限制均在实现中保留。160 MB 不代表 RSS 上限。

本轮未重跑最大资源压力、硬杀租约恢复或连续画面检查。序列发布专项使用 receipt-v1。实际中文媒体通过编码和提交前完整解码，版式和感知验收另行评定。
