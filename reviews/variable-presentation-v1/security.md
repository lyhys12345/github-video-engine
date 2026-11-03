# J6 安全与隔离原始报告

**结论：PASS，范围限于 variable-presentation-v1-c1 的单用户本地新路径及声明的可信状态目录。已知 legacy generic export 有独立的历史 major，见下节。**

审查对象是候选清单 SHA-256 086c56ab440ec21dd534ee101731a1fad00e41af24379246dd8f6e9f8c18b154，源码 commit 88f04942c1c5512c4bd53cc1c2ae1dfac3e2a856，tree 02afd90b9067b0b2472fd6695815cd1300d0836c。独立核对清单 806 个文件的大小和 SHA-256，零不匹配。两个源码归档的 500 个文件逐一比较，55 处为 CRLF 差异，归一化后零差异。运行 exact 归档的独立副本，受控破坏只发生在 scratch。详见同目录 J2 原始报告及隔离目录中的 identity.json 和 archive-comparison.json。

| 入口与信任 | 允许的动作和控制 | 本轮验证 |
| --- | --- | --- |
| Express 和 rembg 捕获来源，均不可信 | 固定原始字节和证据引用。React 文本节点显示 HTTP 参数、命令和字幕，不构造 shell 指令。工作器从可信 engine 路径启动，接收单独的 JSON 输入。没有将目标路径当作执行入口。 | 检查 src/presentation/compile.ts、composition.tsx、runtime.ts 及短片 worker。四个已生成任务通过新入口读取和导出。未运行目标仓库脚本、依赖、HTTP 请求或模型。 |
| 计划、来源和资产 CAS，属于本地完整性边界 | 严格输入校验、引用及哈希闭合。图像模块使用固定摘要的本地鸟形插画。 | 实际 SQLite/CAS 独立副本中，损坏的映射、原始来源、固定资产均被拒。重算伪造任务 ID 仍不能将原预览附给另一父计划。恢复字节后完整性重新为 verified。 |
| 可信本地工具链 | 启动本机 Node、Chrome、Remotion、FFmpeg 和 FFprobe。任务环境指纹包括源码、工具和浏览器身份。只对授权隔离副本运行引擎。 | 观察实际启动浏览器渲染的工作器取消并退出，任务和工作器临时目录均无残留。相同任务重试正常退出并提交，随后命中缓存。同一浏览器使用等价路径字符串时创建新的任务身份。 |
| 用户指定导出父目录 | 新路径调用 receipt-v1、检查已提交文件闭合及既有路径所有权。 | 四个任务经新路径实际重新发布并比对视频字节。独立目录中的碰撞和历史重导出见 J2。 |

## 单列的 legacy generic export

历史 SEC-1 和 SEC-2 为 major。此前独立报告证明，具有导出父目录写权的并发本地参与者能在 generic staging 路径上替换目录，分别诱发路径式递归清理删除用户文件和 rename 将替换目录误当作成功结果。冻结源码 src/workflow/review-export.ts 仍可见该 generic 分支的 rename（第 77 行）及递归 rm（第 92 行）。Git 比对确认该文件自候选 base 未发生变化。本轮按范围只记录静态确认和历史实测，没有重放对抗竞态。该历史问题保留，当前 PASS 只覆盖调用 receipt-v1 的新 presentation 导出。旧 scalar 正常重导出只能证明相同字节兼容性。旧问题来源为 C:/Users/luyuh/Documents/Codex/gve-proposal-preview-bridge-freeze-v1/judge-engineering/security.md。

未验证项目包括恶意同账号全量重写、跨用户隔离、凭证隔离强度、浏览器系统沙箱边界、敌对本地文件系统最终检查后的全部竞态，以及真实网络阻断。没有使用真实秘密作为探针。没有付费、部署、发布到外部系统或改写候选。源内容的事实真实性和视听评审归各自角色。

