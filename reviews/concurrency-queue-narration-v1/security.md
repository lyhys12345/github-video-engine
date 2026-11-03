# 旁白队列候选 J6 安全与隔离独立原始报告

**结论：PASS，限于冻结样本、可信本机工具、独占状态目录和新 presentation receipt-v1。**

候选 SHA-256 4b2d7debf53bbc7bffe7a590613dfe01b316fa3f823599ef5df50392cccf20b1。源 Git 归档和 exact ZIP 的 541 个条目逐字节一致，与已审队列 c2 的 Git 内容相比无运行、契约及测试代码变更。exact 源的行尾差异单列在 J2。699 个清单文件及归档摘要已核验。

- 目标仓库资料和转录文本作为只读数据。队列与声音输入绑定到精确计划、收据、原音和 PCM。独立试验拒绝把旧 voice 派发到已变更计划，实际 CAS 损坏拒绝 status/resume/export 且没有发布目录。
- 只使用本机可信媒体工具与已有本地录音，真实重新解码对比，没有运行目标仓库代码、使用真实秘密、付费、部署、外发或网络合成。
- 禁用本地渲染工具路径时，已有成功任务可验证并离线发布。新导出碰撞拒绝而保留用户占位文件。输出文件和 receipt 的摘要由独立脚本校验。
- 取消/恢复记录属于已冻结的真实运行。当前仅独立从 SQLite 验证状态历史并重新读取实际成功媒体；本轮未重演取消。

## 旧通用导出单列

先前 SEC-1/SEC-2 是旧通用 staging 的两项历史 major。本地并发写入者可替换 staging 路径，历史实测分别导致路径式递归清理删除用户替换目录，以及 rename 错误发布。此次源码不修旧 generic helper，未重放竞态。当前结论限于新 presentation receipt-v1。原复现见 C:/Users/luyuh/Documents/Codex/gve-proposal-preview-bridge-freeze-v1/judge-engineering/security.md。

未评估恶意同账号全量重写、跨用户隔离、敌对文件系统竞态穷举、实际网络隔离、浏览器 OS 沙箱和录音权利。没有全系统安全声明。

