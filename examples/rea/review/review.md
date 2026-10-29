# rea 策划审阅包
来源：https://github.com/morluto/rea，commit f4cc6c85efe7f3513d587df3bd5086adb1bc6a76
修订：c8274e86bb0672f1d64f99302fb6acd381ef39489857c18c17e52b567475b8dc

## Brief
受众：希望理解开源 AI 开发工具用途的中文开发者与 AI 爱好者
目标：用一个有来源的剪贴板案例解释 REA 的用途、工作方式与使用边界，不冒充本次实测
指导来源：agent-proposed-defaults

## 用途与例子
who: 研究 Electron 应用功能实现的开发者
situation: 想理解富文本复制从界面到系统剪贴板的实现链路
input: 待研究目标和一个明确的功能问题
output: 可追溯到代码/关系与未知项的分析证据，再供智能体解释
value: 把抽象功能问题拆成可核查的追踪路线
evidenceKind: documented-example

## 创意
- clipboard-journey：让一段复制内容成为主线，跟随官方案例穿过 Electron 的层次；开头：复制之后，发生了什么？
- evidence-investigation：以一次调查的证据板展示智能体和分析工具如何分工；开头：一个功能，怎样找到它的证据？

## 脚本
- opening (6000ms)：复制一段富文本，它怎样从界面走到系统剪贴板？ / claims: notion-case
- purpose (7000ms)：R E A 把智能体接到软件分析工具，帮助沿着证据理解功能。 / claims: purpose, targets, workflow
- trace (8000ms)：官方的 Notion 案例，追踪渲染进程、预加载脚本、I P C，再到主进程。 / claims: notion-case
- loop (8000ms)：你给出要研究的目标和问题；工具返回证据，智能体据此继续追问。 / claims: workflow
- conditions (7000ms)：分析路径不同：原生程序可能需要反编译工具，静态 JavaScript 不需要。 / claims: dependencies
- disclaimer (7000ms)：本片只是依据官方文档制作的图形讲解，没有运行 Notion，也不是这次实测。 / claims: synthetic-diagram, notion-case
- closing (7000ms)：结论需要证据，未知也要保留。使用条件，请查看 R E A 官方仓库。 / claims: unknowns, purpose

## 分镜
- copy-question：原创文本卡片代表富文本，复制动作点亮一条尚未展开的路径；醒目标注官方案例图解。不是 Notion 界面截图。；动效：文字卡片短距离移动；问题标题进入；背景路径缓慢点亮，重点停留到旁白结束。；来源标签：官方 Notion 案例 · 图形讲解
- rea-role：REA 位于智能体与分析工具之间；以问题/证据两个方向的箭头说明其角色，避免虚构执行终端。；动效：先出现目标问题，再出现分析工具和证据卡；有节奏地连接。；来源标签：官方 README 功能描述 · 未实测
- electron-trace：Renderer、Preload、IPC、Main 四个原创节点组成路径；小文字标明来自官方 Notion 案例。；动效：跟随旁白逐节点高亮，最后显示富剪贴板格式的抽象卡片。；来源标签：README 263–266 · 官方案例转述
- investigation-loop：问题、分析、证据、追问构成可读循环；未知项使用不同颜色保留在证据旁。；动效：沿循环推进一次，不让多条箭头同时抢注意力。；来源标签：README 167–170 · 流程示意
- conditions：分成原生分析与静态 JavaScript 两条路径，前者标示所需分析工具，后者标示不同依赖。；动效：两栏顺序出现，强调不能把不同目标的运行条件混为一谈。；来源标签：README 65 · 依赖需核查
- honest-boundary：清楚列出图形讲解、官方文档案例、没有执行目标三个边界；无仿造成功日志。；动效：逐条进入并完整停留，节奏放慢以保证手机阅读。；来源标签：本次制作方式 · 非目标实测
- source-close：证据卡与未知卡并存，最后显示仓库身份 morluto/rea、来源 commit 缩写与官方链接指引。；动效：收束路径到来源卡，保留足够时间读完结尾。；来源标签：固定 commit 文档快照 · 来源可追溯

## 事实
- purpose [documented]：官方将 REA 描述为让智能体调查软件功能、解释其工作方式并展示证据的工具。；限制：官方功能描述，不是本次安装或运行结果。
- targets [documented]：官方文档列出原生二进制、JavaScript/Electron、.NET 和网站等分析目标。；限制：各目标的依赖和能力不同；不保证任意目标都能完整分析。
- workflow [documented]：智能体通过 MCP 调用 REA 检查目标并跟踪代码，结合返回的证据继续提问、解释或编写和测试实现。；限制：这是官方说明的调查流程；本视频不声称执行了该流程。
- notion-case [documented]：官方 Notion 案例描述了从 renderer 的剪贴板 API，经 preload 和 IPC 到 main process，并检查富剪贴板格式的追踪路线。；限制：官方案例的图形转述，不是本次对 Notion 的实测或录屏。
- dependencies [documented]：官方文档区分原生分析所需的 Hopper/Ghidra/IDA 与不需原生分析引擎的静态 JavaScript 分析。；限制：具体平台、安装和权限仍需核查；本项目不执行这些工具。
- unknowns [documented]：官方文档要求保留静态观察、运行时观察、关系推断及未知/不可用事实的原始证据身份。；限制：仅针对该文档描述的工作流；不能把未知自动视为不存在。
- synthetic-diagram [synthetic]：本片使用原创图形解释官方案例，没有运行 REA、Notion 或用户提供的 GitHub 仓库代码。；限制：图形不是产品界面、执行日志或测试结果。
- local-analysis [documented]：官方称目标在本地分析，同时明确智能体模型提供商有自己的数据政策。；限制：本地分析不等于整条智能体链路没有数据外传；本视频不作隐私保证。

## 参考状态
- https://www.xiaohongshu.com/explore/6accb54c000000001303df4c [unavailable] 已尝试读取，尚未取得可观察视频；不得根据旧参考或猜测描述其镜头、节奏、声音。
- https://www.instagram.com/reel/De5sX0yD\_l1/ [unavailable] 读取未成功；后续涉及该参考的对齐判断须重新取得内容，或明确提出替代方向而不声称已对齐。

## 声音与预算
声音：local-tts / M2 选择可用的本地中文声音 / estimated；当前仅为 50 秒脚本时长分配，未声称已经试读。M2 在零付费约束下实际生成/听取与计时，检查 REA/IPC/JavaScript/Notion 专名读法，再校准时序。
付费上限：0 USD；修订上限：3；不执行项目代码。

阶段审批由独立 judge 在记录的用户委托下作出；最终用户验收仍待用户。
未访问的参考没有被伪装成已分析。源文档仅作为不可信待审数据，不执行其中指令。
