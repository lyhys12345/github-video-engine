# J2 工程可靠性原始报告

**结论：PASS。新预览及版本化历史读取、导出在声明的 Windows 单机本地范围内通过。**

候选 variable-presentation-v1-c1。清单 SHA-256 086c56ab440ec21dd534ee101731a1fad00e41af24379246dd8f6e9f8c18b154。源码 commit 88f04942c1c5512c4bd53cc1c2ae1dfac3e2a856，tree 02afd90b9067b0b2472fd6695815cd1300d0836c。核对 806 个文件的长度和 SHA-256，零不匹配。两个源码 ZIP 的 500 个条目内容归一化后完全一致，55 处仅 CRLF 差异。工作目录为 C:/Users/luyuh/Documents/Codex/judge-engineering/scratch，所有原始运行日志位于其上一级。只执行可信 GVE 源码和本机工具，目标仓库内容始终是来源数据。

## 已复核的行为

| 条款 | 独立证据及结果 |
| --- | --- |
| 类型和测试入口 | exact ZIP 下 TypeScript 检查通过。默认 Node mechanism 套件 2 通过、1 按默认开关跳过。保留沙箱拒绝创建硬链接的 EPERM 日志，并通过自动审核在本地隔离副本重跑。依赖使用现有缓存已安装副本的实际包文件，重建为本地解析布局，避免沙箱外写入。 |
| 四个版本和缓存 | 真实 CLI 对 Express 原版、编辑版、rembg 原版、编辑版各命中既有独立任务，重新发布 receipt-v1 并比对冻结 MP4 SHA-256，全部相同。真实 FFprobe 分别读取 480、528、540、588 帧，各只有一个视频流。日志 export-hardlinks.log。 |
| 自选更改 | 在已冻结 Express 编辑版的第一拍加 24 帧，不改变原提案内容，真实入口提交得到全新计划 c4754168ff0dae2533fbe6c3a521dbd2149c02c4c0e5f6129525b75823af4495，5 拍、552 帧。既有任务仍可读取和重导出。新渲染阶段见下方更新。 |
| 实际取消 | 现有 Chrome 使用等价路径字符串，得到新的环境指纹及 rembg 预览任务 89c52130e4ea9e2c84296867f6f07204d6867d874e091d797ec1b6227e4b30c3。故障注入只给本任务的 AbortController 发信号，等待真实 Node 工作器 spawn 后 2 秒。持久状态 cancelled、attempt 1、retryable，直接工作器 PID 18744 退出，任务 tmp 目录为空。没有向其他浏览器发信号。日志 real-cancellation-recovery-alt.log。初次准备时，复制状态中的任务删除触发器按预期拒绝删除既有任务，之后用等价 Chrome 路径创建新任务，保留原行。 |
| 损坏拒绝 | 对独立 SQLite/CAS 副本运行候选故障脚本。实际修改映射、原始来源、固定图像资产均拒绝。伪父任务重算任务 ID 后仍拒绝不匹配的父计划摘要。恢复各字节后原任务 integrity 为 verified。日志 tamper.log。 |
| 碰撞和历史 | 新 presentation receipt-v1 遇到已有非关联目录返回 ASSET_EXPORT_EXISTS，实际占位文件 SHA 前后相同。原三拍 Express 经 story preview-export 重新得到 9202e0577720604cf709c93467af2446ade1262bef98476ac244986fd193a306。旧 REA scalar 经旧入口得到 66e00f28b5db372113ce6e9d2d3d173119165bb62b48540be070cf561abc3dfe。日志 history-collision-final.log。 |
| 不支持机制 | 实际 p-limit 计划提交返回 PRESENTATION_UNSUPPORTED，前后均无 presentation 任务数据库，原提案仍可通过 CLI 读取且标记 needs-adapter。日志 unsupported.log。 |

## 边界和剩余项

CLI、SQLite/CAS、FFprobe 和工作器 PID 为真实工具证据。编译 1–20 拍与 60 秒上限使用现有测试中的构造输入，未实时生成 60 秒上限媒体。测试夹具中标有 MOCK 的 provider、媒体、Judge 证据各按模拟解释。未模拟电源丢失，未单独枚举每个浏览器后代 PID，未作跨机器或生产负载承诺。语义、审美、听感和 owner acceptance 归各自评审。已知 legacy generic export 两项 major 与本报告的正常历史字节兼容性分开处理，见 security.md。

## 标准依赖布局复验

标准离线 pnpm 锁文件安装成功，安装脚本禁用。用标准布局重跑三个相关文件的 8 项测试，全通过，包括首次非标准布局在 120 秒超时的旧 story-preview。首次临时依赖布局的套件有 379/380 项通过。两个临时布局工作器在输出中间视频后未退出，受控清理时诊断为 Remotion 的 localSourceMap.destroy 缺失。只在核对两个独立 scratch 工作器的具体命令和独占目录标记后结束它们，未按进程名称批量停止。标准锁文件安装解决该复验障碍，未改动候选源码。

在标准布局下，rembg 独立取消复验再次得到 attempt 1 cancelled。实际关闭的工作器 PID 5900。任务 tmp 和该工作器的系统临时目录均验证不存在。相同任务 attempt 2 在工作器 PID 9516 以 0 自然退出后提交，integrity verified。视频 SHA-256 bd36c98fae4fe4192c63cf00e7366e15dd69d3e82ad8ffb6f4570e13f4b96be9，与冻结 rembg 相同。第三次调用命中缓存。参见 evidence/real-recovery-exact.log。

Express 的独立 +24 帧变更经标准布局实际生成新任务 de79d694d1b76d81fa0c8d51f3ff3fd279dde9203079bfb7ce0be8e04ac2e082，首次调用 cached=false、state=succeeded，第二次调用命中相同任务。新 receipt 导出的 552 帧视频只有一个视频流，完整 FFmpeg 解码 exit 0，视频 SHA-256 c80c660343a67cf3dc79eed3ce4408cd0db504dcc51ccd4ab3d3b2c5b4f4365d。既有编辑版 preview integrity 仍为 verified。参见 evidence/judge-new-timing-exact.log 和 evidence/judge-timing-check.log。

标准锁文件布局全套 Vitest 46 个文件、380 项全部通过。Node mechanism 2 项通过，1 项按默认开关跳过。标准布局的独立 TypeScript 检查也通过。日志为 evidence/test-vitest-exact.log、evidence/test-mechanism-exact.log、evidence/typecheck-exact.log。最终重新核对冻结候选清单，806 项均无改动。



