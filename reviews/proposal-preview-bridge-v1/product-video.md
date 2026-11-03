# Proposal-preview bridge C1 / 独立产品与视频审查

- **Product：PASS，限定本阶段两种已保存提案映射路径。** 两项目的原版适配、预览状态和导出亲测，原版渲染是缓存命中；两项目分别自行修改映射时长后生成新 Story/资产并实际新渲染导出，原版保留；非法与不支持输入明确拒绝。此结论不代替完整语义、可靠性或安全专项。
- **Video quality：UNVERIFIED（有限静帧与解码检查通过）**。未连续观看，9 秒节奏、动效连贯、真正手机可读性和无背景观众理解不能凭静帧断定。影片明确静音，仅视频流；未听音，不制造听审 PASS。owner 既有视听延期允许工程推进但不等于本 Judge 已体验或接受，更不是 G4/G6。
- 冻结 `candidate.json` SHA-256 `fb1972acf1bc55e6052540049d877b2d68136fe0c0470a1e581afd8d5801e8ef`；433/433 清单项哈希和大小核验一致。使用 source-exact.zip 解压副本、闭合 state 副本、本机依赖；所有输出 `judge-product-visual`。2026-11-03 PST。先读 OPERATOR、docs/proposal-preview-bridge-v1.md、角色规则；未读 builder 总结或其他 judge 报告。采用冻结包的已保存 proposal 和 mapping 作为输入，**没有独立重新作者或捕获来源**。未执行目标仓库、付费或部署。

## 产品实际操作

`project adapt-proposal` 对 Express proposal `1707fd5fd070a4ee7d5b123234ff11e2dbf5adf46f1abf6936d86c9495a38639` 和 rembg `b6bf42b2445ee5b15bf18f01717c1477fd6965b4c7caa11def37e2826a54245f` 返回各自源绑定、Story 与 asset；原项目的 Story/asset 均 cached:true。`story preview-render --mode silent --presentation audience-v1` 均返回 succeeded/cached:true；独立读取 status 并以默认 receipt-v1 导出。Express 原预览 task `b40576c102e799118e573eae7926135ea31ab9007c69d0ccd7d2cb54f1991052`；rembg `cf7ded8fe9639a2fe9011d435222e1e567122a178ac813594548c633b9753ed9`。原始复用不是本轮新渲染。

独立将两份映射首镜 `visualSeconds` 从 3 分别改为 3.5 与 3.25 秒，重新适配均 storyCached/assetsCached false；新 asset 分别 `502575c790467514d8dd0d407f99843686b9183f5bf91369c5e9cb62de2b09cd`、`682a6d553f3abe657fe73635578e14c75c868e68620a4fba28923030288c7684`；实际 preview-render 均 cached:false/succeeded，得到新 task `bd1e3fa5804bd2b5332db11120b141cb6b779331ca952d5d8fbd9fb2e0adc808`、`c79e5e23a0ea048536f73ef3b2d2ba6b7552b6c39bb9e83208d000a30a029025`。导出后 ffprobe 分别为 9.5 和 9.25 秒，不同于原版各 9 秒；新旧 MP4 哈希不同，原任务和导出仍可用。修改只测试时长，不主张任意视觉编辑被支持。

独立校验四份 receipt 及全部列出文件大小/SHA-256：Express 原 57/57、新 57/57，rembg 原 56/56、新 56/56；各 receipt 文件 SHA 与命令返回值匹配。两原版 MP4 SHA-256 分别为 Express `9202e0577720604cf709c93467af2446ade1262bef98476ac244986fd193a306`、rembg `69f0fd21b041cb24be7adbabcaedff312fe978f2a182cb7721841763e99df399`。新文件和记录见 `*-edit-export` 与 `*-edit-*.log`。

无效 rembg 首镜 0.1 秒返回 `MAPPING_SCHEMA`，说明最少 0.5、退出 1；p-limit 真实未映射提案使用 HTTP 映射返回 `MAPPING_UNSUPPORTED`，退出 1，隔离负例中未创建 tasks.sqlite。来源、mapping、proposal 和原始提交闭合由 status/导出校验并在导出包保留；本 Judge 没有独立证实语义蕴含。

## 视频实际帧

独立对两份原版 MP4 ffprobe：H.264、720×1280、24fps、216 帧、9 秒、仅视频流；ffmpeg 各完整解码退出 0。由本次导出的 MP4 抽取帧 0、36、71、72、107、143、144、165、190、215，缩至 360×640 并逐张查看，文件在 `express-frames/` 与 `rembg-frames/`。Express 抽帧显示 GET / 从客户端到服务器、路由匹配、处理函数产生 Hello World 并回到客户端；rembg 显示同一鸟图、透明抠图、标为“正在生成蒙版/过渡预览”的彩色过渡及最终黑白蒙版。所有样帧有“示意·未执行”标识，抽查无旧版彩色结果冒称完成蒙版的问题。抽帧体现状态差异，不能证明连续动作观感。

两片各三镜、每镜 3 秒，360×640 下主要标题和图示可辨；处理函数、命令、说明小字和九秒节奏在实体手机、平台覆盖及零背景观众下尚未实测。卡片信息图风格可见，是否有 PPT 感或是否足以理解须连续观看与用户校准；不因个人审美判失败。中⽂画面与英文 VTT 分离；VTT 声明 shot-level timing，仅供编辑，未验证与任何语音同步。源/提案事实、语义与编辑均 pending，静音不意味着声音质量已通过。

## 未覆盖

未测试实际中断恢复、恶意源/并发写、全测试集、不同语言或一般项目的任意适配；该桥仅支持两个规定的三镜 profile。未体验音频、连续观看，未完成最终 owner 接受。修改版本如影响叙事或时间还须关联字幕和 owner 全片审阅。

