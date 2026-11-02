# 跨电脑接续入口（2026-11-02）

先读本文件，再读 AGENTS.md、README.md 和 docs/tts-provider-v1.md。此文件优先于旧 work/continuation.json；该文件只保留早期 M4 状态，且不在 Git 中。

## 产品目标与当前进度
GitHub URL → 只读研究/证据 → 完整故事/可编辑分镜 → 通用动画 → 自然旁白 → 渲染/评估 → 用户最终审核。整体约60%，为判断性估算，不是测试覆盖率。历史 M0–M4 工程验收不能代表当前产品已100%完成。

已实现：Node24/TypeScript/pnpm/Zod/SQLite/Remotion/FFmpeg；任务恢复/租约/尝试预算、CAS不可变产物；来源精确字节/行号/哈希；五分钟内内容驱动故事时间线；动画参数与诊断PNG；持久化asset-plan/status/export；连续短片及旁白/规则/素材修改失效验证；本地声音导入和ElevenLabs适配器/预算账本/缓存。

研究语义、脚本与动作编排仍由人或Agent整理，不是任意URL全自动创作。通用规则当前只验证speed/opacity，蒙版示意为合成图，没有执行rembg模型。保持事实/推断/教学重建标识。

## 最近实跑和验收
- 连续样片：REA51.8667秒，rembg32.5667秒，Chen新原速配音。候选3：602文件，独立11测试、完整typecheck、6媒体完整解码、PCM保留、三轴修改与实际PNG审阅PASS。报告 reviews/continuous-explainer-v1/final-review-candidate-3.md。
- TTS候选4：135文件，独立46测试、typecheck PASS，取消卡死已修。报告 reviews/tts-provider-v1/candidate-4/architecture-final.md。
- 远程TTS测试使用mock transport，真实本地导入/FFprobe/FFmpeg；没有真实ElevenLabs API调用，没有密钥。不要把mock称为live。
- 旧1.0 story formatter兼容真实旧任务已修；历史原始Markdown只作档案。
- 精确字幕对齐、实际听感、连续视听/手机留存、G6仍未验证。用户曾认可样片整体可接受，不能据此伪造上述验收。

## 下一步（不要重做已通过功能）
1. 确认Chen准确voice ID/model ID与账号API权限。官方Voice Library声音不能由Free账号经API调用，网页免费额度不等于API可用。
2. 不创建API key、不订阅/付款。远程generate默认禁用，需用户明确费用授权及环境变量密钥，预算只是本地估算，非供应商硬封顶。不得克隆Chen或宣称下载了其模型。
3. 真API授权后实测短文、身份/参数/费用；尚未授权则可继续本地能力，不擅自替换已认可声音。
4. 当前故事的精确字幕/声音同步与连续剪辑质量；独立审片发现问题修复，先保持短片范围，未经用户新授权不生产整片。
5. 更通用的研究/创意推理、多项目端到端流程、最终可编辑交付及用户最终审阅。

## 模型与执行规则
用户选择：Astra整体设计/最终独立审阅，Sol实现，Terra实际看PNG。冻结候选后评审，发现修复新候选，保留失败。程序/原始报告/实跑证据优先，不得编造听审或完成度。没有付费、部署、发布、不可信仓库执行授权。Github推送到现有私有仓库已授权。

## 新电脑启动
用GitHub登录有权限的账号，clone私有仓库到短路径（Windows建议C:/dev/gve）；安装Node24、pnpm11.25.0，本地FFmpeg/FFprobe和Chrome/Edge；执行 pnpm install --frozen-lockfile、pnpm run typecheck、pnpm test。doctor需 pnpm run doctor，可能创建本地状态。浏览器、字体、路径与平台差异须实际检测，切勿假设新机已通过。

Git不包含node_modules、work、SQLite、音视频/PNG、冻结快照和API密钥。原机所有文件保留。测试的小合成MP3是明确非语音fixture。完整旧视频、声音、数据库与原始冻结证据若需跨机复审，必须另行从原机复制（不可从Git报告假称存在）。本地旧路径仅为档案位置，不应写入新代码。

原机根目录：C:/Users/luyuh/Documents/Codex/2026-10-25/referenced-chatgpt-conversation-this-is-an/outputs/github-video-engine
主要媒体：examples/continuous-explainer-v1/rea-v5/segment.mp4 与 rembg-v4/segment.mp4（仅原机）。

给新Codex的提示：先读 HANDOFF.md 和 AGENTS.md，核对git状态/依赖和现有代码，按“下一步”继续；保留现有工作，不重建工程，不声称缺失本地媒体已验证，不自动调用收费API。

## 本次推送前验证
本地 pnpm run typecheck 通过；原默认回归31文件/276测试通过，随后补齐默认清单的6文件/25测试单独通过（合计37文件/301测试，无重复文件）。包含真实SQLite/进程/FFmpeg合成测试，不包含新成片制作。该记录不是另一台电脑已安装或已验证的声明。默认 pnpm test 现在包含全部37文件。
