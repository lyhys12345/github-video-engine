# session-agent-authoring-v1-c3 / reliability 差异复验

- Judge：同一 c2 reliability 角色，遵循 judges-v2 common/reliability 定义。
- 候选：`session-agent-authoring-v1-c3`；candidate.json SHA-256 `287d61ce50ffe2f5788a7cf304d66b3fb7a4233f504ef5c672cc6a21e8f763e7`。
- Commit `e8372d8ae87dbd6ceb4c1028594a27cb03164c11`；tree `8f8e13d800b677f5205e48aa4909c676eeb45dda`。
- 对比：c2 commit `a04354a3edd749c6aeae96bb66b1029e09e9ac8d`；本角色 c2 报告位于相邻 freeze-v2/judge-reliability。
- 环境：Windows / Node v24.22.1；2026-11-03 约 12:03–12:10 UTC。独立输出目录：本报告所在 `judge-reliability`。
- **结论：PASS，仅本次 planning-only 合同下的 reliability。** 无本轮确认的新 blocker/major。不是安全专项通过、最终里程碑通过或任意项目自动视频能力声明。
- 独立性：先读 OPERATOR、冻结合同、实际 diff 和源文件；未读其他 judge 报告或其原始 race 输出，也未读 builder 测试日志/作者总结。本轮 OPERATOR 本身提及旧问题，这是合同上下文，不作为独立复现依据。

## 一页结论

126 个 manifest 文件的哈希和大小初检/末检均匹配；472 个 ZIP 文件逐一匹配声明 commit 的 Git blob，tree 一致。与 c2 比较，465 个源码文件字节相同，7 个变化。原候选未被修改。

本轮实际重跑 typecheck、44 项相关 Vitest 测试、2 项 mechanism Node 测试；全部通过。另重跑 12 组迁移/恢复/capture 探针，运行 5 组新增原生发布/旧 generic 兼容探针，并以网络阻断的真实 CLI 对三项目六版本完成 author、submit、status、export、重复和冲突导出、audit。三项目 packet 和六份 export 文件逐字节匹配冻结包。

重要语义变化已经实测：作者发布不再使用可重命名 stage；其取消不代表立即中止 native helper。helper 启动后收到取消，本轮观察到先自然退出、写完整文件，再返回 CANCELLED，完整目录可原样重试。故障导致不完整目录时，原文件保留，同目录重试拒绝，换新目录成功。这符合 c3 明示合同；不能沿用 c2 作者发布的“取消清理 stage”结论。

旧 generic `project export` 的 staging 路径仍保留。本轮只确认正常重复、冲突保护和协作取消行为未回归；不把它称为具有新原生路径的并发写入保护。合同要求该旧入口使用独占控制的输出父目录，其已披露 race 不因本角色 PASS 而消失。

## 实际差异与影响

证据：`tree-and-diff.json`、`source.diff`、`input-diff.json`。

| 变化 | 影响与复验 |
| --- | --- |
| `scripts/mechanism-publish-windows.ps1` | 新增 exactReview 分支、现有输出逐文件读取校验、直接最终目录 exclusive create、持有 handles 后检查全量文件；失败保留原文件。执行新增 native 探针及 mechanism 兼容测试。 |
| `src/mechanism/publish.ts` | 包装 `publishExactReview`，原 mechanism 调用显式 exactReview=false。重跑原 mechanism 2 项 Node 测试。 |
| `src/workflow/review-export.ts` | 只有 exactFiles=true 路径调用 native，Windows/local drive 限制；generic 调用继续原路径。新 native 与 generic 两种模式分别验证。 |
| `src/workflow/agent-authoring.ts` | work-package.json/review.json 移到最后的 payload 顺序；没有变更 proposal 语义、身份或存储。三项目实际 packet/export 与冻结物匹配。 |
| 两份文档、authoring 测试 | 明确平台、取消、partial 保留和 legacy 边界；增加原生测试。阅读合同并重跑测试，不以测试文本代替行为证据。 |

`store.ts`、authoring schema、GitHub provider、CLI、audit 与 c2 字节相同。其 c2 代码检查可按影响保留；关键迁移/恢复路径仍在 c3 重新执行，没有只靠历史 PASS。

五份 v1/v2 作者输入与 c2 字节相同。只有 p-limit-v2 的 mechanism visualIntent 与两个 beat 的 purpose/timingIntent 共五处字段变化；所有三项目来源文件保持相同字节。新 p-limit-v2 proposal hash 为 `88fb1f7e2f08efc6a561c7434188b5ffe4505787015d5735241b5066d911888d`，本轮重新提交/导出核验，未沿用旧 hash。对新文字的内容事实判断交给独立 content-facts 角色，本报告只检查它的持久化和绑定。

## 本轮实测

### 三项目作者路径

脚本 `three-projects.mjs`；原始每条命令、stdout/stderr/status 见 `three-projects-log.json`，结果见 `three-projects-results.json`。

从冻结工作状态的独立副本出发，使用实际 `src/cli.ts` 子进程，以独立 preload 将 fetch 全部拒绝。每个项目：打开 packet 两次；提交 v1、v2（已存在版本应 reused=true）；逐个 status；各自 export 两次；把 v2 导出到 v1 目录应拒绝且 byte hashes 不变；最后 audit。

| 项目 | 固定 commit | 本轮结果 |
| --- | --- | --- |
| REA | f4cc6c85efe7f3513d587df3bd5086adb1bc6a76 | 两版本重放、重复和冲突保护通过；packet/export 与冻结物一致 |
| rembg | e2c2e3f72701357b9bb3f2be32a4330d74ce8f47 | 两版本重放、重复和冲突保护通过；packet/export 与冻结物一致 |
| p-limit | a8a6fbec4e0e866d6d779b10889bb4f5567e70eb | 两版本含新的 v2 均通过；旧 revisions 仍在复制 state；audit 通过 |

共 36 次真实 CLI 调用：33 次退出 0，3 次预期的冲突导出退出 1。均在独立目录；没有重新联网 intake，也没有重新让模型创作三份内容。这是存储和 CLI 重放证据，不是新一轮 agent 创作能力证明。

### 迁移/恢复/重试

脚本 `probe.mts` 与 `capture-probe.mts` 从本角色 c2 探针复制并在 c3 实际执行。唯一行为调整是 stage 取消测试使用不带 exactFiles 的 legacy generic 分支；作者 native 分支另测。`independent-results.json` 9 组通过；`capture-results.json` 3 组通过。

- v1 legacy plan 升级到 v2 后 SQL revision 行相同，原 plan 可读取。
- 已有 proposal 的 c1 风格 v1 DB 升级到 v2 保留历史；version 3 拒绝且 schema/version 保持。
- 预取消不插入 proposal。真实 CAS commit 返回后注入取消，DB proposal 行仍为 0；重新打开后相同提交复用完整 blob 并成功，重复 reused=true。
- 并行重复调用同 hash；编辑得到新 hash；提交期间另一 store 改源时拒绝 WORKFLOW_CHANGED，不添加新 proposal；旧 proposal 可 status/export，currentSource=false。
- p-limit 真实 state 副本离线 audit 前后所有 data 文件 hash 不变；损坏 proposal 后 status 拒绝，恢复原 bytes 后成功。
- capture 在 blob 503 或最后 blob 返回时 abort：project/sources/events 不变；相同请求重试成功一次；随后过期请求在联网前拒绝。

### 新原生发布与旧 generic 兼容

`native-probe.mts`、`native-results.json`、`native-probe.log`，5 组通过：

1. 预取消：0 子进程，0 输出。
2. 在真实 Windows helper 的 spawn 事件取消：捕获 PID 42828，close 事件先于返回，exitCode=0；API 返回 CANCELLED，但两份完整文件保留；同输入重新发布成功。此为真实进程运行测试，不是 mocked child。
3. helper 在第一文件写入后故障：向真实 helper 提交故意损坏的第二个 base64 payload，退出 1，只有 source.txt，completion 文件不存在；同目录有效请求返回 EXPORT_EXISTS且原 bytes 保持；新目录成功。生产 wrapper 不会正常生成这份坏 base64，这是明确的 helper 边界故障注入，不作为可由普通用户输入触发的缺陷。
4. 冲突 bytes 和额外 sentinel：两类请求均拒绝，原文件和 sentinel 保持。
5. generic：相同预期文件再发布时保留额外 owner sentinel，修改预期文件时拒绝；行为未被 exactFiles 新分支改变。

独立 migration probe 同时再次验证 generic stage 写入两文件后取消，无最终输出且 stage 清理，重试成功。此结果只适用于受控父目录的协作取消；不是对恶意目录替换的保护证明。

## 相关现有测试与运行记录

- `pnpm install --offline --frozen-lockfile --ignore-scripts`，退出 0；`install.log`。只安装冻结引擎依赖，未执行 lifecycle scripts 或目标项目。
- `node node_modules/typescript/bin/tsc --noEmit`，退出 0；`typecheck.log` 无诊断。
- `node node_modules/vitest/vitest.mjs run tests/agent-authoring.test.ts tests/operations.test.ts tests/operations-cli.test.ts tests/url-intake.test.ts tests/workflow.test.ts`，退出 0，5 files / 44 tests；`targeted-tests.log`。
- `node --import ./node_modules/tsx/dist/loader.mjs --test tests/mechanism-pilot.node.ts tests/mechanism-publication.node.ts`，退出 0，2 tests；`mechanism-tests.log`。覆盖原 standalone/native 路径，没有新真实媒体生成。
- 本角色 probes 全部使用 c3 解压副本 imports，全部退出 0。Windows native helper 和 CAS hardlink 使用本地授权权限；没有把 default sandbox 可运行当成已证实。
- 三项目探针首次误将 Windows 绝对路径用于 Node --import，导致 loader 提前退出，记录在 `three-projects-harness-error.json/log`。修正为 file URL 后完成。另一次从 source 子目录调用 probe 导致 MODULE_NOT_FOUND，保存在 `source/three-projects.log`；这是 judge harness cwd 错误，未执行产品流程，不计产品失败或成功。

## c2 证据保留与撤换

保留：c2 对未变化的 schema、来源绑定、存储、audit 的代码检查；没有依赖 c2 的 builder/他人报告。上述 12 组关键运行证据均已重跑，因此本轮主要结论有 c3 实测。

撤换：c2 作者 exactFiles 的 staged rename/cleanup 行为结论不适用于 c3。新 authoring 的平台限制、取消后完整输出可能存在、partial 保留与 fresh-directory 重试，依据本轮独立 native 测试判定。

不混同：generic 仍是旧发布器，mechanism exactReview=false 仍是原模式。原 generic 的并发替换限制在合同中保留，本轮没有宣称已修复或已独立重现该 race。

## 未完成项与限制

- 未重跑整个默认 375 项回归；没有引用 builder 的全量 PASS 作为本轮结果。
- 未执行断电、强杀 native helper、磁盘满或跨进程高并发压力；partial 行为通过确定性 helper 故障注入检查。
- native helper 没有本轮新增的超时/强杀契约；取消在它退出之后观察。本轮 helper 正常自然结束，未模拟永久挂起，不能声称有有界取消延迟。
- 未独立开展 exactReview 的敌对目录替换或同账户攻击专项；原生正常 ownership/refusal 有实际测试，全面安全结论属于相应独立角色。
- 只对 local Windows/native helper 可用条件作运行结论；不声称 Linux/macOS/default sandbox 支持此新 authoring 发布路径。
- 无真实网络重取、目标代码执行、付费 API、部署或视听评估。

没有本角色的新修复请求。后续若修改 native helper、publisher、导出顺序或存储路径，应对本报告的取消/partial/重复/旧 generic 和 mechanism 输入重新复验。
