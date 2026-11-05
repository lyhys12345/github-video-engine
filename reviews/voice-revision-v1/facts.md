# Voice revision / candidate-v2 / evidence + content_facts

- 角色定义：reviews/judges-v2/common.md、roles/content-facts.md；本轮受父任务明确委派证据及事实检查。
- 输入版本：proof/candidate-v2.json SHA256 39523c872f068d83f9f0c10b871db2360740ea3df95349748dc29b6d744644ba；源码 archive hash eeb63121e98c0bb0c9a50b2d858948735f3a9049bcf01f7341283fe8fd214ba0。
- 环境：Windows，本地只读候选；2026-11-05 03:59–04:04 UTC。独立输出目录 reviews/voice-revision-v2-facts/。
- 总体结论：UNVERIFIED（正式阶段必需合同/条款映射缺失）；本次明确委派的来源、文本事实、manifest 绑定、真实非静音音轨技术检查通过。不能将本报告用于完整里程碑、G4 或 G6 PASS。
- 独立性：先读合同规则与候选原始证据；未读实现者总结、其他 Judge 报告。未修改候选、源码、测试或原证据。

## 一页结论

两版共 20 个 citation 实例的 source hash、行号与逐字引用均匹配。两版各四份来源一致固定到 sharkdp/fd commit cc4e40fa4e32d61733cd72926e233a3fb6c8d56d。亲自打开 src/cli.rs 的本地固定副本第 32–49 行，及 main.rs 308 / walk.rs 352 上下文：默认忽略点号前缀隐藏项、--hidden 关闭该过滤、其他 ignore 规则独立的文本事实有支持。没有执行 fd，不能把模型遍历解释当作实测 fd。

新旧每条 narration 均与 generation 输入、receipt、voice binding、字幕相符，原 WAV/manifest 哈希完整。新修订的 author、voicePreparation、render child 与 base manifest 绑定均通过独立哈希核对。新旧 MP4 各自用 ffprobe 与 ffmpeg 全流解码成功，且解码音轨非静音；这不证明发音、说词、逐字同步或听感。

新稿将第二句的口播忽略规则提醒删去，但明确说“示例中的”，画面样本 233（9.708s）仍显示“合成示例·未运行目标项目”和“未检查忽略规则·顺序仅为示意”。对本次图解范围没有发现重要失实说法。只审了该静帧，不声称连续看审或听审。

## 条款与证据

| 范围（非虚构合同编号） | 判定 | 原始证据 | 检查方式与限制 |
| --- | --- | --- | --- |
| 冻结身份 | PASS | candidate-v2.json、proof 下 18 项、源码 archive、两份导出 receipt | 独立 SHA256；未执行归档源码 |
| 固定来源与全部引用 | PASS | 两个 bundle/editable/evidence.json、source-1..4.txt、proposal.json | 所有引用逐字/行号/hash 检查；远端来源未重新下载，结论针对冻结副本 |
| 新旧文本事实 | PASS | proposal claims/全部 4 段 narration、captions.vtt | 原文语义比对；合成模型非实测 |
| 子任务和音频绑定 | PASS | revised author/session/revision/voice-preparation/voice manifests、两版 originals | 独立哈希、task ID、文本 hash、四个源音频 hash |
| 真实音视频 | PASS（技术） | 两版 preview.mp4；本目录 ffprobe/decode/volume 日志 | ffprobe/ffmpeg 实跑，非静音；没有听审 |
| 合成标识 | PASS（抽样） | revised/samples/233.png；proposal、presentation | 静帧看到合成/未运行/忽略规则限制；非连续视频覆盖 |
| speechContent、speechAlignment、ownerAcceptance | UNVERIFIED / pending | 原 manifest 明确如此；owner-av-deferral-2026-10-26.json | 保留最终人审，不制造 G4 PASS |
| 阶段合同/全部必需条款覆盖 | UNVERIFIED | 父任务确认无本轮独立里程碑合同 | 无法证明“所有 mandatory criteria”成立 |

## J5 claim 表

| claim / 句子 | 类别 | 来源与版本 | 支持 / 不支持 | 判定 |
| --- | --- | --- | --- | --- |
| default-rule；新：默认隐藏过滤会跳过点号开头的文件和目录；旧：默认跳过隐藏文件和目录 | documented | 固定 commit，cli.rs 32–49；main.rs 308；walk.rs 352 | 支持默认点号规则及配置，不保证所有平台所有隐藏属性/组合参数结果 | PASS（本示例范围） |
| include-rule；旧：启用隐藏项选项后，隐藏过滤关闭；新：开启隐藏项后，示例中的隐藏目录也会被遍历 | documented + illustrative application | 同上，cli.rs 35–37 明示其他 ignore 仍生效 | 支持关闭隐藏过滤；新句限定示例，不是实际 fd 运行承诺 | PASS（保留画面限制） |
| model-descendants；旧：示例中，跳过的目录没有继续遍历 | inference / synthetic | proposal 明示 inference，walk.rs 352、cli.rs 32–37；presentation synthetic scenario | 支持教学模型；不能据单个 builder 调用证明库内部实际遍历记录 | PASS（仅模型陈述） |
| 旧：示例没有检查忽略规则；新画面：未检查忽略规则、顺序仅为示意 | scope limitation | proposal exclusions/assumptions、样本 233 | 与演示范围一致，无实测输出顺序声明 | PASS |

## 检查记录

- node reviews/voice-revision-v2-facts/check.cjs：退出 0；checks.json 保留全量 true/false、20 引用、4 clip 结果。
- node reviews/voice-revision-v2-facts/binding.cjs：退出 0；binding-checks.json 所有核对 true。
- 脚本内实际执行 ffprobe -v error -show_streams -of json <每版 preview.mp4>：均退出 0。
- ffmpeg -v error -xerror -i <每版 preview.mp4> -map 0:v -map 0:a -f null NUL：均退出 0。
- ffmpeg -i <每版 preview.mp4> -vn -af volumedetect -f null NUL：均退出 0。新稿 mean -25.8 dB / peak -0.4 dB；旧稿 mean -24.9 dB / peak -0.6 dB。仅为非静音技术证据，不作听感认证。
- 初次 python 检查脚本无法启动 WindowsApps python.exe（系统无法访问）；保留 check.py，改用独立 Node 检查并完成。没有把未运行脚本算通过。
- 实际查看 revised/samples/233.png。没有听任何音频，没有连续观看视频。

## 发现

F1（major，验收证据缺口）：没有本轮已认可的独立合同及预先冻结的角色—必需条款映射。common.md“任务输入”明确要求；父任务确认本轮是既有冻结修订专项复核而非独立里程碑。用户影响：本报告可支持上述具体检查结果，无法支持正式阶段全部通过。补齐既有认可标准及映射后须重新覆盖，不能事后改标准使候选过关。

L1（明确延期，不新增失败）：语音实际内容、逐字同步、连续视听及最终人审仍未证实。manifest/receipt/VTT 没有伪造已听或成功声明；依据已有 owner AV deferral 保留，不将技术非静音检查替代听审。

L2（适用范围）：声音来源记录为安装的 Windows WinRT Huihui technical fixture；本次未认证微软声音再分发/商业发布权利。当前无发布授权、只作本地技术审查；不能将本报告当发布素材权利许可。

## 修复复验与自我限制

未改候选，没有声称修复。若旁白、来源或媒体变更须新候选重验所有受影响的 hash、claim、字幕、音轨绑定。远端 commit 内容未重新抓取；本地来源及绑定足以支持本次固定证据复核，但不提供远端取得过程的独立认证。离线副本校验不能发现最初快照抓取真实性问题。没有比较源码 archive 每一文件与工作区；只验证归档 hash。最终听审可能揭示文本输入与实际发音不一致，此时本报告的 manifest 一致性不会推翻该发现。
