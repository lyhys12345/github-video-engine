# fd — independent content facts review

Conclusion: PASS for the frozen packet semantic scope only. Broader milestone/media acceptance: UNVERIFIED.

仅审查固定版本的书面语义及合成演示参数；未执行目标仓库，未观看视频、未收听音频，不证明运行结果、视听质量或最终人类验收。

Candidate: 4e3557077950705fa7f82e2a6a5ff221b68a466c3069de40b562c26334479a15
Packet: bcd486d1c62a1c600752d0116f69f3409d384601ae59ca62d8d42da6e0cb7f65

| Item | Verdict | Evidence and reasoning |
| --- | --- | --- |
| claim:default-rule | supported | cli.rs L32-34 直接说明默认跳过隐藏文件/目录并以点号定义；README L125-126 交叉支持。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| claim:include-rule | supported | main.rs L308 对 opts.hidden 取反，walk.rs L352 传入 hidden；cli.rs L35-37 明示 ignore 规则仍保留及 --no-hidden 可覆盖。按无覆盖参数的正常用法成立。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| claim:model-descendants | supported | 该句明确说合成示例的模型，不声称实测。README L125 说明不搜索隐藏目录，为抽象提供支持；最终 scenario 包含隐藏目录及其子文件。不能证明任何真实遍历日志。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| use-case | supported | 受众与问题是作者范围选择；明确限定为固定来源示例，排除的事项未被当作本次事实。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| entity:tree | supported | 实体是示意角色/输入/输出标签，与所述机制一致；不声称实际观察到该实体。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| entity:results | supported | 实体是示意角色/输入/输出标签，与所述机制一致；不声称实际观察到该实体。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| mechanism:filter | supported | 源码配置链支持开关控制隐藏过滤；assumptions 明示点号示例、ignore 未检查、后代状态为模型。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| open-questions | supported | 空列表不消除 scope 排除的 ignore、目标执行及输出顺序限制；实际限制已明确写入机制和旁白。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| title:default | supported | 作为本包限定示例中的标题，与对应 claim 及完整旁白一致。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| beat-context:default | supported | 实体与机制引用符合本包；timingIntent 是编排意图，不是已完成的感知验收。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| narration:default | supported | 默认规则有 cli.rs 和 README 支持；第二句限定为示例，符合隐藏目录不搜索的模型语义。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| visual:default | supported | 明确 depiction=illustrative，描述与引用机制一致；语义可支持，实际画面呈现仍未验证。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| title:include-hidden | supported | 在合成隐藏过滤模型范围成立；与紧随的 narration 忽略规则限定一起审查，不能抽离为所有隐藏文件必然出现的保证。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| beat-context:include-hidden | supported | 实体与机制引用符合本包；timingIntent 是编排意图，不是已完成的感知验收。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| narration:include-hidden | supported | 源码取反及传参支持；明确提醒未检查 ignore，未许诺真实搜索会列出所有文件。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| visual:include-hidden | supported | 明确 depiction=illustrative，描述与引用机制一致；语义可支持，实际画面呈现仍未验证。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |
| authored-presentation | supported | 已与外部 presentation.json 深度比对一致。六个条目为 basis=synthetic；.long-cache-root-dir、.local 是点号项，cache-index-v1.json 为隐藏目录后代；src/visible-command.rs、README.md 为普通项。两次事件明确 default/include-hidden；未声称实际输出顺序或真实执行。帧数及 motionFrames 是编排，不是性能。 来源：@cc4e40fa4e32d61733cd72926e233a3fb6c8d56d source-2 cli.rs L32-53; source-3 main.rs L308-313; source-4 walk.rs L350-358; source-1 README L124-142 |

No unresolved semantic blocker/major found. No target repository execution, media watching or listening occurred. No other judge report was consulted. All source hashes/byte lengths and quoted line spans were independently checked; external presentation matched the reviewed unit. Full source paths and limitations are preserved in the raw JSON.