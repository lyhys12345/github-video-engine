# 独立产品审查：sourcePaths 作者包

结论：冻结内作者包与 needs-evidence 的证据选择语义 **限定 PASS**；实时 CLI 与错误诊断实测 **UNVERIFIED**。sourcePaths 只增加源码证据，当前尚无隐藏文件过滤/遍历动画，不可说已自动生成或支持该动画。

candidate SHA-256 c015088d4bac3af71a7d640bf22e0efb1ac768514f813a6427f41835b0dffd28；205/205 evidence 文件长度和 SHA-256 匹配，source-exact.zip SHA-256 4a055accf392f0f0f4df09fd0a23843c909a70352f12a5c6af2578d720f36a84 匹配。独立解压源码到本报告目录，没有执行目标仓库。

## 作者体验与证据

实际查看冻结 fd 原 needs-evidence 状态：固定 commit cc4e40fa4e32d61733cd72926e233a3fb6c8d56d，README 行 25 给出隐藏文件默认规则，作者指出尚缺实现文件；proposalHash 为 null，审核 pending。其新 1.2 请求使用同一完整 commit 和 src/cli.rs、src/main.rs、src/walk.rs，获得新 awaiting-author 任务，旧 disposition 仍由保存的 status 显示。新包 work-package 1.3 给出 task ID、sourcePaths、sourceCaptureProfile、独立草稿与同一状态的提交命令；指导将 session-request 复制到新文件、使用 binding.commit、最多三个路径并保留旧 session。

实际核对 fd evidence.json 四条及 ripgrep 两条的本地文件哈希均与各自 sourceId 对应哈希相等；fd source-2/3/4 的 URL、路径和完整 commit 对应三个所选源码，ripgrep source-2 指向 crates/core/flags/hiargs.rs，commit af60c2de9d85e7f3d81c78601669468cf02dabab。此为冻结包内自洽和哈希核查，独立联网核对 GitHub 上游未做；保存的 GitHub GET 与离线 cache/status/export 是实现者的原始记录。Huihui 包标记 voiceMode 并说明须由作者填写中文旁白和后续 plan，本例未生成声音或视频。

文档对完整 40 字符 commit、1–3 个不同相对路径、每文件和总量限制、普通 Git 文件以及不遍历依赖有具体说明；工作包列明当前可视模块为 HTTP、image-mask、concurrency-queue，unsupported 和 needs-evidence 由作者声明并附理由和精确引用。因此隐藏文件的源码可以采集作证据，但本候选尚不提供隐藏文件动画。为帮助首次用户，建议在示例旁直接写出该具体边界，不要让“源码已采集”被误读成已有渲染器。

## 错误及限制

源码 schema 对路径重复给出“Use distinct source paths outside documents”，完整 ref、路径数量和中文 Huihui 语言约束也可见；文档解释超限、无效 UTF-8、符号链接和子模块拒绝。但未找到这轮真实 CLI 负例的用户 stderr 样本，也未独立运行错误输入，实际提示及修复指引的可理解性 UNVERIFIED。实现者 focused 测试有 schema 拒绝记录，不等同于本人的交互实测。

本机先前同类独立 scratch 的依赖 junction 被拒绝、离线 pnpm store SQLite 无法打开；本轮未再次运行 CLI 或联网，避免把留存执行记录说成亲测。语义真实性、实际隐藏文件行为、动画、音频以及最终视听验收均未验证。
