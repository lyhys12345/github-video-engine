# M2 当前实现与验收边界

M1五方通过，真实G1/G2批准脚本仍保留原修订。M2的制作包与试读是独立版本，不改动原脚本事实。估算50秒，Windows已安装的Microsoft Huihui Desktop中文声音以原速0实际产生7段WAV，经FFprobe测量分句长度，加入最少500ms停顿并向上对齐30fps后总长57.4秒。没有加速音轨来塞回50秒，也没有将“文件存在”说成听取通过。

`src/contracts/production.ts` 的 ProductionPackage/Readthrough 1.0独立于M0 VideoSpec1.0；不静默放宽旧合同。制作包绑定策划修订、读音文本和音轨哈希、共用字体/配色/字幕布局、每镜头的解释布局/事实ID和限定预演授权。图形布局数据适用于不同项目的人工/agent策划输入；没有伪称本地模板会自动理解任意GitHub项目。

实际命令：

```sh
pnpm gve production readthrough --id rea --data work/m1-live-state
pnpm gve production import --id rea --design examples/rea/production-package.json --data work/m1-live-state
pnpm gve production stills --id rea --data work/m1-live-state
pnpm gve production export --id rea --out examples/rea/preflight-v2 --data work/m1-live-state
pnpm gve production approve --id rea --gate G3 --candidate reviews/M2/preflight-1/candidate.json --rules reviews/M2/preflight-gate.json --delegation examples/rea/delegation.json --data work/m1-live-state
pnpm gve production animatic --id rea --data work/m1-live-state
pnpm gve production motion --id rea --data work/m1-live-state
pnpm gve production status --id rea --data work/m1-live-state
```

这些命令有依赖顺序；G3命令必须先有同一冻结版本的六方真实PASS报告，否则失败。上表列出接口，实际执行范围见原始日志，不代表已执行全部命令。G4需要再次独立验收完整预演；G3不允许完整生产。G6命令始终拒绝自动创建人类最终确认。

静帧和预演共用 `production-composition.tsx`。样式帧为720x1280，Animatic限定360x640，代表复杂路径镜头限定7秒720x1280。所有画面持续区分官方文档、编辑性图解与未运行目标；预演额外标临时声音/预演。当前配音仅Windows SAPI离线中文，缺声音明确失败，无远程/付费回退。代码字体Microsoft YaHei依赖当前Windows字体安装；尚未认证其他平台/声音的等效结果。

`tasks.sqlite` 按输入与环境哈希记录单次操作；SQLite立即事务、15秒所有权租约、心跳和提交时隔离令牌避免同任务重复；子进程有超时/取消和父进程死亡清理。失败/取消/过期任务在总尝试上限内恢复，永久失败要求修正输入。成功任务不可改删，重用前检查所有CAS内容。制作包和审批另保存在production.sqlite；不重写M0/M1表。新包使旧G3/G4不适用于当前选择，历史仍可查看。尚未声称已完成M4全部恢复与费用审计。

参考：主要参考已实际获取542.42秒公开媒体并解码抽样图（0/5/10/15/20/25秒、每60秒），观察到暖灰白背景、黑色标题、居中图标/窗口、底部字幕及局部黄色强调。辅助Reel只读取页面文案并观察约8秒画面，分段素材导出失败。两者均未听音；不声称完整动态/声音拆解或精确风格复刻。主要参考仅本地分析，未将其人物/画面用作输出素材。来源与覆盖范围见examples/rea/reference-observations.json。

本会话实际将WAV提交给模型音频入口时，工具返回 `audio content omitted because you do not support audio input`。因此当前模型不能声称听取旁白；J4必须把实际听取项标UNVERIFIED，除非另有确实可听取的审阅证据。静态G3可以明确授权临时声音预演；最终M2/G4不得据技术检查越过这个缺口。该能力缺口不通过修改验收标准消除。

G3首次候选被独立发现三项major：并发切换脚本可能检查旧G2而读取新脚本；长文本覆盖第四节点；不同环境各自重试可能超过总预算。候选2修复并独立复验，但完整67测试66通过1失败（辅助PID文件写完前已被读到），原始失败保留。候选3使用临时文件原子发布测试标记并在测试失败时清理自有进程；追加试片范围校正：7秒镜头使用完整的已批准purpose旁白（实际6647ms＋353ms停顿），不截断8582ms的trace句；退场按7秒片段端点计算。`motionAudioScriptId`显式进入未发布的1.0制作包草稿，绑定声音/脚本范围，不能悄悄替换或加速。当前静态制作包哈希b6d1ca0d…；这不代表G3或G4已经通过。
