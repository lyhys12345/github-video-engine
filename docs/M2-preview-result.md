# M2真实预演：G4待验收

本文件记录实际执行，不代表M2/G4通过，更不是M3成片交付。

## 已观察结果

- M1：五角色PASS，真实G1/G2批准，原始56测试通过；见docs/M1-result.md。
- M2/G3：候选1三项major（G2竞态、文字覆盖、跨环境尝试预算）均保留失败证据并修复；候选2完整67测试实际66通过1失败（测试标记写完前被读取）；候选3修复测试原子标记及失败清理，完整67测试实际全部通过。六角色G3全部PASS，公开CLI真实记录G3，见reviews/M2/preflight-3。
- G3后首个Animatic被FFprobe拒绝：Remotion原始输出是yuvj420p。无成功MP4被提交。任务记录和失败恢复测试原始失败都保留。已补明确FFmpeg范围/像素格式归一化。
- 当前修正源码：typecheck通过；60个快速回归全部通过；11个制作/任务测试另有定向通过记录。67项完整运行属于G3冻结源码，不能伪称在格式修正后的源码上重新跑了67项。
- 实际Animatic：57.4秒、360×640、30fps、1722帧、H.264/yuv420p +48kHz单声道AAC；完整FFmpeg解码通过。SHA256 `172f09156055a49e832ab89b771fd2f51170bf39c2ff799c231e5a73f5c365c5`。
- 实际代表试片：7秒、720×1280、30fps、210帧、H.264/yuv420p +AAC；完整解码通过。SHA256 `ee222aa4592eff816fda9a07d16a539a8cd0f9bac97d84d15f495c113eb0750a`。使用完整purpose旁白6647ms，保留353ms停顿；不截断trace句、不加速声音。
- 主工作空间Animatic使用批准的两次总尝试（第一次格式失败，第二次修复成功），重复提交返回cached=true，不继续耗费尝试。永久失败任务原样保留。
- 独立真实恢复工作空间：从真实已批准的输入/回执建立，未重置主项目或复制动态任务历史；第27帧时只强杀自有CLI，确认自有渲染子进程退出，等待租约到期，随后同一任务第二次尝试成功。七段输入音频哈希保留、临时文件清理；并发重复CLI非零/TASK_BUSY。恢复MP4与主MP4实际哈希相同。原始proof在reviews/M2/real-recovery-format-fixed/proof.json，种子来源说明在reviews/M2/real-recovery-format-fixed-seed.json。

## 实际文件

`examples/rea/preview-review/`：animatic.mp4、motion.mp4、各自evaluation/manifest、七张scene PNG、contact-sheet、七段WAV、readthrough.json、production-input.json。公开CLI与CAS/SQLite记录在work/m1-live-state/workflow；该目录包含历史失败，不能只数成功任务来替代检查。

原M0交付视频与持久化工作已恢复保留；本轮新M0烟测输出另保存在reviews/M2/preflight-3/smoke-export。未删除旧产物或重置原项目。所有工作为本地，未部署、发布、付费API或运行REA/Notion。

## 必须保留的未覆盖项

当前模型的音频输入工具明确返回不支持audio input。实际听感、专名发音、语气与音画语义同步，不能由文件存在、FFprobe、波形或ASR替代。实际视频只能通过可用工具进行帧/时间轴采样时，也不能宣称完成了连续全片动态观看。G4必须由J4如实写覆盖范围；未覆盖就是UNVERIFIED。

参考主片仅抽样观察，辅助片只有限页面/画面观察，均未听音。不声称完整复刻参考片的镜头/声音/节奏。预演是图形解释，非本次REA/Notion运行结果。

当前制作composition仍包含REA专用的标题/剪贴板/分析条件图形与结尾，尚未证明不同仓库都能走通正式制作；M1的只读研究与策划合同较通用，不等同于跨项目生产能力。该扩展性及M4完整费用/版本/局部修正审计仍是未完成项，不把它们标为已完成。

G4未通过，不自动制作正式M3片或填写G5/G6。G6仍为用户最后验收。后续是否需要具备视听能力的审阅者，或由用户明确批准把特定视听检查留到最终审阅，必须根据实际能力/用户指令处理，不能自行豁免。
