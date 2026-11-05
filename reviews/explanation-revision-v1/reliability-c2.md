# 预览修订 C2 / 独立可靠性复审

候选 SHA-256 `89cdb40ca08c97820c3930d7a303c8530c65de8fd25dd24b7b0352e7182ca6e7`，源码提交 `d41b8af765353bca2fe9db72f897e05567458846`。独立校验候选、源码 ZIP、声明的 Git blob 与 140 项冻结索引。使用临时状态副本，候选与原始证据只读。

| 核验 | 实测 |
| --- | --- |
| 环境变化拒绝 | 新的 fd 修订在 attempt 1 取消。把 `GVE_BROWSER` 改为另一个现有可执行文件后，resume 返回可重试的 `EXPLANATION_ENVIRONMENT` |
| 未消耗重试 | 变更环境后的父任务、准备好的子任务 SQLite 行和事件逐项一致，总任务数 50 保持不变 |
| 恢复子任务 ID | 独立从取消行的 `childRender` canonical fingerprint 计算预期 ID。恢复原环境后验证同一修订 ID 在 attempt 2 成功，实际子任务 ID 和输入均匹配准备值，再次提交命中缓存。父/子任务临时目录均清空 |
| 已完成旧记录 | 用 C2 对 fd、fastify 的 C1 与 C2 修订执行实际 resume 与重新导出。四案均命中缓存，全部 160 个文件按相对路径与各自冻结产物哈希一致 |
| 未完成旧记录 | 用原 C1 输入结构插入单独的合成取消记录，resume 返回 `EXPLANATION_REVISION_LEGACY_RESUME`，原行和任务计数均未变。第一次尝试修改已成功记录时，SQLite 的不可变约束拒绝了修改，因此改用合成新记录 |

主脚本 `revision-c2-reliability.mts`，原始日志 `revision-c2-reliability.log`。旧记录探针为 `revision-c2-legacy.mts`，保留 `revision-c2-legacy.log` 和首次的 `revision-c2-legacy-first.log`。Windows 原子提交经批准在沙箱外的隔离副本执行。没有执行目标仓库、调用付费服务或部署。主动注入的是浏览器环境漂移，未单独替换 FFmpeg 二进制或注入在途进程崩溃。
