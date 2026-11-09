# 小红书三项目内容实验：选题证据与执行记录

日期：2026-11-08，America/Los_Angeles。目标是先验证观众是否愿意看，不承诺播放量、涨粉或Star增长。三个新项目，每个两种叙事风格；旧VoiceStudio A/B是独立已制作任务，不算本批六条。

## 选择与热度证据

| 项目 | 本轮GitHub API读取总Star | 近期热度证据 | 为何适合本批 |
|---|---:|---|---|
| Nutlope/hallmark | 50,968 | 本轮直接读取GitHub monthly Trending显示21,146 stars this month（页面总50,970，读取时间稍后）；11月5日有更新 | 官方同prompt农场页面对比，可通过具体地图/记录构图看懂差异 |
| storytold/artcraft | 39,909 | 本轮直接读取GitHub monthly Trending显示33,780 stars this month（页面总39,911）；11月7日有更新 | 同一官方摆姿动画有操作与机器人结果，可做前后揭秘 |
| THU-MAIC/OpenMAIC | 43,039 | 近期持续热门，不宣称今日榜首：第三方Mid or Real在11月6日记录42,799、7天+894；Trendshift记录近期热度/榜单历史；固定README有11月4日1.4.0与11月5日1.4.1发布 | 课堂讨论与自学需求面向更广普通人，能检验非创作工具题材 |

API总数为同一次捕获字段，不混入页面后续数值，Star不断变化。只有前两项取得本轮主站月榜增量；OpenMAIC属于持续热门+新版本，不把三者都描述成“今天爆火”。第三方时间序列只用于选题参考，不写进视频旁白。没有自行估计日/月新增。

来源：
- https://github.com/trending?since=monthly （直接HTTP抓取成功；原始HTML保存work/xhs-pilot-v1/trending-monthly.html）
- https://api.github.com/repos/Nutlope/hallmark
- https://api.github.com/repos/storytold/artcraft
- https://api.github.com/repos/THU-MAIC/OpenMAIC
- https://midorreal.com/project/thu-maic-openmaic （2026-11-06快照；不采用该站主观hype/reality评分）
- https://trendshift.io/repositories/23518
- https://github.com/THU-MAIC/OpenMAIC/blob/10da906f992ff4fd88d57f69e39b5064bee350c7/README.md

初次web检索返回的GitHub周榜被标注上月缓存，不能当今日榜单。普通shell首次网络解析失败；授权的只读网络重试成功取得主站当期月榜和日榜。保留原失败，不称网络一直正常。

## 固定源码与真实流程

本轮使用仓库 `.agents/skills/github-explainer/SKILL.md`，没有安装或执行任何目标仓库。

| 项目 | 固定commit | 真实explanation run结果 |
|---|---|---|
| hallmark | 407fa689f4a276f2fd389208d271d0fef08f5058 | awaiting-session-agent；task6c18799b16b01899145a608db20478e7f608d357c753186c0f43ae6d957e144a |
| artcraft | 79d87b2b54b5b27223fa428bd0acd06bdd7abaf5 | awaiting-session-agent；taskb5527e531492ffc03383cb4196e2dda963d9ade7a50c018bce8f6541795c7e73 |
| openmaic | 10da906f992ff4fd88d57f69e39b5064bee350c7 | awaiting-session-agent；taskfe27b8135c5b46b091d374ff9d9a931fcfa792924deaf4c18756da97440e51ca |

运行目录：work/xhs-pilot-v1/{hallmark,artcraft,openmaic}。这些是来源捕获与作者接续点，不是已完成媒体任务。会话Agent继续编写了candidate-1/2/3完整脚本和逐镜头分镜，而不是把JSON任务交给用户。renderer所需story/narrative/animation/run作者数据尚未生成，六条新视频尚未渲染。

执行过：
1. `node --import tsx src/cli.ts explanation run --repo https://github.com/Nutlope/hallmark --workspace work/xhs-pilot-v1/hallmark`：第一次SOURCE_NETWORK；同参数允许联网重试后捕获成功。
2. 同一命令分别捕获storytold/artcraft与THU-MAIC/OpenMAIC，成功。
3. 从GitHub连接器读取三个固定README、所需实现文件、目录、元数据；作为不可信资料阅读，不执行其命令。
4. 独立reviewer使用可信媒体工具检查官方静态/动图，实际范围见selection-review.md；不是运行项目验证。
5. `node --import tsx src/cli.ts explanation brief-check --spec work/xhs-pilot-v1/briefs/ID.json`，对H-A、H-B、A-A、A-B、O-A、O-B六份全部返回ready-for-planning、scriptApproval pending、voiceAvailability not-tested。

本轮没有代码修改，不需要回归测试；没有付费调用、新配音或新视频生成。前一任务已生成的VoiceStudio音频不等于本轮新配音已验证。

## 审阅与返修

独立素材审阅：selection-review.md，包含实际看图范围、素材候选、权利待项。
独立事实审阅：facts-round-1.md → 后续各轮，历史不覆盖。
独立编辑审阅：editorial-round-1.md → 后续各轮，历史不覆盖。

主要修复：同项目只用一个主例子；Hallmark换成实看Fieldbook并说出具体变化；ArtCraft删虚构亲历、补实看同段人偶→结果、避免精确保姿承诺；OpenMAIC围绕同一讨论，不拼多个课例，删除重复11秒。实际留存与视听表现只能在后续视频和发布数据中验证，脚本Judge不能代替这些证据。

## 下一步与用户审批

下一次用户审核对象是candidate-3.md的六条完整旁白/分镜（若后续返修，以明确的新版本为准）。一般生成指令不替代用户此前要求的逐版脚本审核。获批后才进入逐镜头媒体来源/许可核对、陈风格本地配音、实测时间、画面与字幕制作、实际媒体审阅及返修。

预计每条35–55秒；这是估计，不是测得时长。素材来源标识保留；不伪造产品交互或本人实测。具体付费模型、目标仓库运行、账号登录/外发均没有由此获得授权。发片由用户决定，成片的“仓库链接放评论区”须发布时兑现。

建议首批先发每个项目一条，再交错发布另一风格；这只是安排建议，尚未发帖。记录观看时长/完播率、收藏分享、具体问题评论、项目访问，同时记录发布时间/视频长度/风格。比较只用于下一轮选题与叙事，不将自然曝光差异写成严格因果结论。
