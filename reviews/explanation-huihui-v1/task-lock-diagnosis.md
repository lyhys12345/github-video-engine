# TaskRunner 并发 SQLite 锁独立诊断

Builder 证据位于 C:/Users/luyuh/Documents/Codex/gve-explanation-huihui-v2/work/task-lock-diagnosis/summary.json。旧 TaskRunner、usage、evidence planner、CLI 和相关测试的哈希在 c1/c2 相同。普通双进程试验 c1 为 1/18，c2 为 0/18。受控持锁两代均失败，释放锁后同请求可重新执行。这支持共享 TaskRunner 既有缺陷，并非 Huihui 导入修复新增的回归。

## 定位和独立复现

从 gve-explanation-huihui-v2 工作目录运行 `node C:/Users/luyuh/Documents/Codex/judge-task-lock/run.mjs`。脚本使用三份新的测试数据库。它从候选位置只读加载原 TaskRunner，所有数据库、锁和可选探针只在本报告目录。未改候选或调用通用导出。

| 场景 | 结果 |
| --- | --- |
| 另一个进程持有 2 秒 BEGIN EXCLUSIVE，未调整原 TaskRunner | 退出 1，约 864 ms。捕获到 PRAGMA user_version 的 .get() 抛 errcode 5、database is locked |
| 同样的独占持锁，在构造器首个 PRAGMA user_version 前模拟设置原有 5 秒 busy_timeout | 约 2.05 秒等待后正常打开 |
| 已初始化的 DELETE journal 有并行读事务，需恢复 WAL，提前设置相同 timeout | 约 2.04 秒等待后正常打开 |

原构造器先读 user_version，后设置 busy_timeout=5000。构造器抛出的原生 SQLite BUSY 没有 EngineError 分类，CLI 将其输出为 UNEXPECTED/permanent。约 864 ms 含 Node/tsx 启动时间，短于持锁的 2 秒。当前探针确定了最早失败语句；未将 builder 的每个自然竞态都归因于同一语句。

## 最小修复和回归边界

把既有 `PRAGMA busy_timeout=5000;PRAGMA foreign_keys=ON` 移到构造器内首条 user_version 读取之前。保持版本检查、迁移内二次版本检查、schema/trigger 比较、WAL、FULL、事务和账本语义。若同时修正错误分类，仅在已关闭连接后的构造器边界将原生 SQLite BUSY 基码 5（含其扩展码）映射为明确 retryable；版本、schema、权限及损坏错误应原样返回。此映射与顺序修复是两个独立验证点。不要扩大到所有 SQLite 错误或无界重试。

应覆盖短独占锁释放后成功、持锁超过 5 秒的有界退出、两进程空库初始化与既有 v0 迁移、无竞争的 v1、未知 schema/trigger 拒绝，以及 usage、TaskRunner、CLI 和缓存回归。增加的等待发生在同步 SQLite 连接上，单次最多现有 5 秒配置，不能承诺同步等待期间即时响应 JS 取消。没有生产补丁，未重跑全套回归。
