# 独立产品复审：遮挡范围透明度

结论：针对原发现的机器可读范围标注，限定范围 PASS。并非无遮挡或视频最终验收 PASS。

- 冻结 candidate.json SHA-256 为 66226c461f7e9390ca5c38e450648abef2d168494090d91733036e0e6fe3bd7a；清单 199 项逐项核对长度与 SHA-256，0 项不符。
- 独立解析冻结内七组 profile3 fresh、cache 和 status 的实际保存 stdout：报告版本 1.2 全部有顶层 `occlusion: unchecked`、`speechAlignment: unverified`，包括两个时序失败案例。失败 fresh/cache 退出码为 2；状态读取退出码 0，报告 verdict 仍为 failed。其余五组 verdict passed。这里的 passed 仅指声明的时序关系。
- 七份 profile2 status 保存输出均可解析原 1.1 报告且没有 occlusion 字段；合成案例 profile2 export 记录退出码 0，冻结中的旧 bundle 及其 report 哈希包含在已核验清单中。旧报告缺字段表示当时未记录范围，绝不表示无遮挡。新旧 status/export 记录为实现者执行的留存证据，本轮未亲自重新运行 CLI；因此实时兼容性在本轮范围内 UNVERIFIED。
- 再次实际查看上一轮从同一保留视频抽出的 360×640 合成帧 312、313（原图 `gve-queue-timing-judge-product/s-04.png`、`s-05.png`）：移动中的 Tile D 在 Tile B 左边缘相接并局部重叠；313 帧 C 显示 rejected。报告中视觉区间从帧 313 起代表模型定义的静止状态，不证明所有卡片无像素遮挡；新 unchecked 标注与这一事实一致。候选没有新视频，也未宣称检查过遮挡。
- 新旧报告均保留 `speechAlignment: unverified`；没有连续观看或听审，语音自然度、音画真实同步、整片遮挡及真实手机设备体验均 UNVERIFIED。此处仅复审已见画面和报告语义。
