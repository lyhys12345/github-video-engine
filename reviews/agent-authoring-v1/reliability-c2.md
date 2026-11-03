# session-agent-authoring-v1-c2 / reliability 独立原始报告

- 角色：reliability，遵循 frozen `reviews/judges-v2/common.md` 与 `roles/reliability.md`。
- 合同范围：OPERATOR 的 planning-only session-authoring；`docs/agent-authoring-v1.md` 的不可变版本、历史证据、本地 status/export、重复恢复、v1/v2 workflow 与只读 audit。无 renderer、真实媒体或最终视听通过声明。
- 候选：`session-agent-authoring-v1-c2`；candidate.json SHA-256 `d086228c725521a8f9832d4d7aba19502d936321393af16b7908914c061926d9`。
- sourceCommit `a04354a3edd749c6aeae96bb66b1029e09e9ac8d`；sourceTree `9dc98f1f92620fa46f0be49f86b977e96e8d1827`；base `1531bb4bd36db0c94e51b703e94273af029c9e1b`。
- 本轮：2026-11-03，约 11:52–12:04 UTC；Windows，本机 Node v24.22.1；独立目录为本文件所在 `judge-reliability`。
- **结论：PASS（仅本角色、此冻结 planning-only 范围）。** 无确认的 blocker/major；不代表整个里程碑或 90% 已通过。
- 独立性：先读 OPERATOR、合同、实现与测试；未读实现者 author.mjs、实现者测试日志/总结或其他 judge 报告。对 operator 提及的成功不直接采信，以下均独立运行或明确标为代码检查。未读相邻 c3 候选。

## 一页结论

122 个清单文件在初检和末检均匹配哈希及长度。source.zip 中 472 个文件与声明 commit 的 472 个 Git blob 字节一致，commit tree 匹配。只在解压的引擎和复制的工作状态上操作；原候选末检未变化。

独立 typecheck 退出 0；五个相关测试文件共 43 tests 通过。另编写并执行了 9 组状态/迁移/故障检查以及 3 组 capture 检查。覆盖 legacy plan 保留、c1 风格已有 proposal 的 v1 升级、未来 DB 版本拒绝、重复/编辑、CAS 完成但 DB 尚未提交时取消、提交与来源变更竞争、历史 proposal 导出、导出中途取消清理、捕获失败/取消重试、复制的真实 p-limit 状态离线读取及损坏拒绝。

取消后的 blob 可以成为未引用的完整 CAS blob；本次验证它不产生 proposal 行，并可由同输入重试安全复用。没有把这种未引用 blob 误报为部分发布，也没有宣称垃圾回收已实现。

尚未验证断电、强杀进程、磁盘满、长期压力、多个 OS 进程的高并发竞争或跨平台行为。此纵切的读取/写作阶段没有目标仓库执行或渲染子进程，未进行媒体恢复和视听评价。

## 条款与证据

以下 R 编号是本报告为已声明合同作的索引，不替换 gate owner 的正式条款。

| 条款 | 判定 | 证据与实际方式 | 限制 |
| --- | --- | --- | --- |
| R1 冻结版本一致 | PASS | `hashes.json`、`tree-verification.json`、`final-hash-check.json`；实际 SHA-256/长度及 Git blob 重算 | 提交对象来自本机 Git 对象库，未联网重新拉取；zip 文件自身也有冻结摘要 |
| R2 v1/v2 迁移与旧数据 | PASS | `probe.mts`、`independent-results.json`；实际创建 v1 legacy plan，迁移后原 revision 行逐项相同且可读取；模拟 c1 带 proposal 的 v1 升级保留两条；version 3 拒绝且 schema/version 不降级 | c1 路径以准确表状态构造模拟，不声称运行旧二进制；本轮无从 v2 回滚旧版本保证 |
| R3 取消/恢复和提交一致性 | PASS | 独立注入 CAS 完成后 abort：0 proposal 行，完整 blob 保留；重新打开后相同提交成功，第二次 reused；提交中另一 store 更新源导致 WORKFLOW_CHANGED，不写新 proposal 行 | 注入发生在真实 CAS commit 返回边界；不是强杀或断电 |
| R4 重复与变更 | PASS | 两个并发 Promise 重复提交同 hash；编辑产生新 hash，记录数从 1 到 2；旧 plan 仍可读取；新 source 使旧提交 stale、旧 proposal 可 status/export 且 currentSource=false | 单进程内两个工作流调用；不是跨进程压力 |
| R5 状态/导出完整性 | PASS | 真实 frozen p-limit state 的独立副本：禁用 fetch，audit 成功且所有 data 文件前后 byte hash 不变；status 成功；修改 CAS proposal 后 status 拒绝，原字节恢复后成功。导出保存 canonical proposal hash。43 项测试也覆盖 exact export 重复、冲突及多余文件 | audit 的只读性实测；status/export 会开 WorkflowStore，不能把它们说成只读 SQLite 命令 |
| R6 发布中断与清理 | PASS | `probe.mts` 中发布到真实临时 stage，检查到两文件后注入 cancelled signal；无 output，无残留 stage；重试和重复导出成功，6 文件完整 | 信号 getter 故障注入，不是用户 UI 取消或 OS kill；native adversarial 路径 race 留给 security |
| R7 有界捕获失败/取消 | PASS | `capture-probe.mts`、`capture-results.json`：真实 capture 流程、mock GET；blob 503 后 source/project/events 不变；最后 blob 返回后 abort 同样不变；相同请求重试成功一次，之后 stale 且未新增网络调用 | Mock GitHub 响应，没有本轮外部请求；不证明真实网络环境/限流可用性 |
| R8 状态意义不虚报 | PASS | 代码检查 reviewState + 本轮返回值：provenance-checked，semantic/editorial/AV pending，renderable=false / needs-adapter；旧 source 可追溯 | 不证明内容事实正确；这是另一个独立角色职责 |

## 执行记录

所有代码均为冻结的引擎代码或 judge 自编故障探针；未执行目标项目代码。

1. `pnpm install --offline --frozen-lockfile --ignore-scripts`，在 judge 解压副本安装冻结依赖。首次 sandbox 遇 pnpm project registration symlink EPERM；获准本地权限重跑退出 0，见 `install.log`。没有 install lifecycle scripts、下载或付费调用。
2. `node node_modules/typescript/bin/tsc --noEmit`，退出 0，`typecheck.log`（无诊断输出）。
3. `node node_modules/vitest/vitest.mjs run tests/agent-authoring.test.ts tests/operations.test.ts tests/operations-cli.test.ts tests/url-intake.test.ts tests/workflow.test.ts`。首次 default sandbox 只输出 runner header 后停滞，由本轮会话 Ctrl-C 终止；`targeted-tests.log` 保留。获准本地权限重跑退出 0，5 files / 43 tests；`targeted-tests-escalated.log`。不把第一次中止记为通过。
4. `node --import ./source/node_modules/tsx/dist/loader.mjs probe.mts`。初次 sandbox 的 CAS hardlink EPERM 导致 setup 未完成及依赖失败；保留 `probe-sandbox.log`、`independent-results-sandbox.json`，不混入成功计数。改用新的 `run-local` 目录、获准本地权限，退出 0；`probe-local.log`、`independent-results.json`，9/9 组通过。
5. `node --import ./source/node_modules/tsx/dist/loader.mjs capture-probe.mts`，本地权限，退出 0；`capture-probe.log`、`capture-results.json`，3/3 组通过。
6. Git tree 验证曾遇 PowerShell 未引用 `^{tree}` 的解析问题，改为 Node `execFileSync` 参数数组后成功。可选 Python 探针因系统别名不可运行而未执行；未把它计为检查证据。实际 tree 比对由 Node 完成。

## 状态前后关键对照

- legacy revision `7ac9d796d76eb4cd63405169c10c03aac5031bf5839d425a654017dae0562f10` 在迁移前后保持一致。
- 首次 proposal `85827ad11f3cc7b39e1ab8ca60bb7be53629daaff99286bedd28322328f97b5b`：取消后记录 0；重启重试后记录 1；重复 reused=true。
- 修改 timingIntent 得到 `fd9bb7c4017f86d7ce41e35bcb77ce536e0d4af3d6d6c5d4e76397d151168cb6`：历史保留，记录共 2。
- 提交中 source 被更新：新 proposal 无记录，既有 2 记录保留，历史 status currentSource=false，历史导出原字节相同。
- capture 失败与取消：完整 project/sources/events 三组 SQL 读结果逐项相等；成功重试新增一个 source，旧 request 随后在网络之前返回 AUTHORING_STALE。

## 发现与未完成项

没有在本轮范围发现可复现产品 blocker/major。环境 EPERM 与 runner 中止均为真实未成功执行，已经保留原始结果并以成功的独立本地重跑覆盖相关合同项，而非删除失败记录。

下列不作已完成声明：

- 没有重跑整个默认回归套件；只跑上述相关 43 项及独立探针。
- 没有执行 OS 强杀/断电/磁盘满注入，没有验证跨进程或跨机器高并发。
- 没有验证真实 GitHub 网络恢复、真实限流等待；源码网络测试是可控响应 mock。
- 没有声称 proposal-status/export 是无写命令；第一条 authoring 命令按合同可能迁移 DB。只读承诺限 audit，已对实际复制状态实测。
- 未验证 arbitrary GitHub 项目可理解、内容正确或可渲染；这些不由本 reliability 通过推导。

无本角色修复请求。若候选改动 store/CLI/audit/capture/export，则应按改动影响重新跑原始故障输入和邻近回归；不得把本报告直接用于 c3。
