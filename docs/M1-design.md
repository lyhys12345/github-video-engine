# M1：只读研究、策划与委托审批

M1 依据 v7 路线和用户 2026-10-26 的连续执行授权。研究只使用公共 GitHub GET 接口，固定到实际 commit；未执行 REA、Notion 或其他目标仓库的代码。策划由本聊天 agent 编写并导入，不把模板或规则处理伪装成一次模型 API 调用。

## 可运行入口

```powershell
pnpm gve research --repo https://github.com/morluto/rea --ref main --doc docs/javascript-application-workflows.md --out <new-source-snapshot.json>
pnpm gve project create --id rea --snapshot examples/rea/source-snapshot.json --data <state-directory>
pnpm gve project import --id rea --plan examples/rea/planning-package.json --data <state-directory>
pnpm gve project status --id rea --data <state-directory>
pnpm gve project export --id rea --out <new-export-directory> --data <state-directory>
pnpm gve project approve --id rea --gate G1 --candidate <frozen-candidate.json> --rules reviews/M1/gate.json --delegation examples/rea/delegation.json --data <state-directory>
```

`research` 不覆盖已有输出；`create` 的重复内容、`import` 的相同修订和相同导出可复用。`project list` 可查看项目。所有失败返回非零；fixture 与真实来源的运行记录分开。

## 合同与模块

- `contracts/planning.ts`：源文档/仓库快照、事实与行号引文、Brief/用途卡、两个创意与选择、脚本/分镜/时间预算、参考可读状态、声音计划和本地委托声明。
- `providers/github-readonly.ts`：主机/协议/入口限制，GET、拒绝重定向、15 秒请求超时，1.2 MB JSON 与单文档 200 KB 上限，最多 8 个文档。只接受安全 Markdown/text 额外路径；返回文件必须是有大小/编码信息的 UTF-8 内容。
- `workflow/store.ts`：独立 SQLite WAL 文件与内容寻址存储。source、revision、approval 的更新/删除被触发器拒绝；project 只更新当前指针，events 保留变化。
- `evaluation/judge-gate.mjs`：审批使用的程序闸门实现，和其他 runtime source 一起进入执行指纹。原有 M0 接口保持可用；新增 planning schemas 不重定义旧 VideoSpec。

GitHub 资料始终是不可信数据。快照校验固定 commit URL、内容 hash 和路径；事实导入检查引文确实出现在声明的行区间。程序不能判定自然语言蕴含关系，具体说法由 J5 独立核查。

## 不可变内容与修订

源记录的 `snapshotHash` 是除 `fetchedAt` 外的快照规范化内容哈希；获取时间保存在原始 source artifact 中，避免同 commit/内容的再次读取仅因时间变化而使已批输入失效。source artifact 自身另有精确字节 SHA-256。修订哈希是规范化 `{snapshotHash,plan}` 的精确字节哈希；`review-input.json` 以同样字节导出，因此可直接绑定候选。

新 source/plan 会切换当前指针，旧修订和审批仍在历史中；有效审批只从当前精确修订计算。切回完全相同输入可以复用那份输入的有效历史批准。修改事实、脚本、分镜或预算即产生新修订，不把旧审批套到新输入。存储先提交完整 blob，再提交 SQLite 引用；崩溃可能留下无引用完整 blob，不把它当成成功。

## 委托审批而非伪造人工签字

本机模式的操作者受信任；JSON 委托文件是操作者记录本聊天明确用户指令的声明，**不是身份认证或加密签名**。不声称能够阻止有本机文件/数据库控制权的管理员伪造材料。仓库内容不被用于自动建立委托或触发批准。

G1/G2 需要：当前项目/修订/Gate 绑定；候选包含同哈希 review input；候选冻结规则；实际规则和 M1 必需五角色一致；全部活跃角色报告通过且原始证据存在；委托允许该 Gate。G2 不得早于同修订 G1。候选、规则、委托和报告在检查中改变会拒绝。完整 review bundle、内容 hash 和来源声明保存在不可变审批 receipt 中，状态查询校验 receipt 完整性。

实际独立 judge 报告与测试中构造的报告明确区分：测试报告均注明 FIXTURE，不是实际独立验收。最终 M1 批准只使用真实 judge 输出，不把 fixture 当批准材料。

所有审批 `actor=delegated-judge`、`humanIdentityAuthenticated=false`。G6 的直接人工最终验收不能由此命令生成。M1 只实现 G1/G2；后续 G3–G5 需要相应阶段功能和产物，当前会明确拒绝，避免早期审批越级授权完整制作。

## 当前 REA 策划包

`examples/rea/source-snapshot.json` 是真实公共接口读取的固定 commit 文档；`planning-package.json` 有 8 项事实、7 个脚本/分镜段、50 秒预估分配。具体例子来自官方 Notion 剪贴板说明，均标成文档案例，不是本次运行。没有运行项目、没有生成正式旁白或预演。

两个参考视频尚未取得可观察内容，明确保存 unavailable 且 observations 为空；M1 没有声称已分析或对齐其风格。当前受众/语言/画幅与风格方向标为 agent 建议默认值，未来由委托 judge 按已知指导审阅；若关键方向无法解决再升级用户。

音频当前是 local-tts 计划，时间状态为 estimated。一次受限环境的系统声音枚举返回错误，尚未宣布系统没有声音；M2 需要用合适的本地权限重试并实际验证，不能把无声预演当成正式配音完成。

## 验证边界

新测试覆盖安全 URL/路径/大小/身份、quote/版本/ID/时长、持久化和不可变导出、去重、G1/G2 顺序、专项缺失/FAIL/错版本、规则弱化/委托越权、输入变更和 receipt 损坏，以及公开 CLI。M1 不声称完成 M2–M4、生产安全认证或最终用户审美验收。
