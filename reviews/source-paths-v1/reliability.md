# sourcePaths 独立可靠性与安全复审

**判定：PASS。** 清单 SHA-256 c015088d4bac3af71a7d640bf22e0efb1ac768514f813a6427f41835b0dffd28。压缩包、源码清单、操作文档及 205 项证据匹配清单，646 份解包源文件的大小及哈希全部匹配。候选未修改。

- `pnpm install --offline --frozen-lockfile --ignore-scripts` 离线复用 219 个包。`pnpm typecheck` 退出 0。`pnpm exec vitest run tests/url-intake.test.ts tests/agent-authoring.test.ts` 退出 0，14/14。覆盖有序来源、BOM/CRLF、精确证据、旧状态、哈希损坏与收据。
- `node --import tsx work/judge-source-paths.mjs` 退出 0。受控 GitHub fixture 使用固定 commit、树路径与真实 Git blob SHA-1。拒绝路径穿越、重复与跨字段重复、HEAD、四文件规格；树中的 mode 120000 链接项在 blob GET 前拒绝；200,001 字节和伪造内容、错误返回提交均拒绝，未发布。受控传输首个 blob 返回后取消，未请求第二 blob、未提交任何输出、未创建包。另起真实 CLI 进程，通过只接受 GET 与禁止重定向的预载 fixture 恢复相同 ID，第 2 次 verified。导出两个编号文件精确保留原始 BOM/CRLF 及顺序。再提交命中缓存并重用包，传输哨兵未触发。日志 work/judge-source-paths.log。
- `./history/verify-history.ps1` 退出 0。预载 deny-network，使用四代历史状态副本。preprofile 10 项、packet 1.0 13 项、1.1 14 项、1.2 14 项文件逐字节一致；历史 fd unsupported 的 12 项载荷同样匹配。记录见 history/recheck/verification.json。
- 将最新冻结状态复制到独立目录，禁用网络后用真实 CLI 分别导出 fd 与 ripgrep 的已固定提交。fd 的三个来源与 ripgrep 的一个来源在编号文件的字节大小和 SHA-256 都与冻结独立 raw 证据一致。实际 GitHub 抓取来自冻结证据，本轮不重新抓取。

源码始终作为惯性文本，未执行目标项目或其依赖。未重跑默认全套、未使用付费服务、未生成媒体。本次取消恢复使用受控网络 fixture 和实际 CLI，真实 GitHub 取消记录来自冻结证据。
