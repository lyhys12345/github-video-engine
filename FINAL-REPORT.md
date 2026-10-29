# GitHub Video Engine 工程交付

最终技术验收以 `reviews/M4/final-1/gate-final.json` 为准；本报告准备时尚待完整 M4 六角色放行。最终听看、主观质量及 G6 始终由所有者决定。历史 M2 G4 UNVERIFIED 保留。

## 实际产物

- `examples/rea/final-delivery/captioned.mp4`：57.4 秒，1080×1920，30fps，1722 帧，H.264/yuv420p/tv＋AAC；真实探测及完整解码通过。
- 同目录包含干净版、旁白、SRT/VTT、封面、平台文案、事实来源、质量/版本/用量数据、条件授权、工程 G5、六角色原始报告及可编辑 Remotion 工程。最终状态为 `FINAL_OWNER_REVIEW_PENDING`，未发布。
- 代码入口 `src/cli.ts`；分层为 contracts/core/orchestrator/assets/renderer/final-renderer/evaluation/operations/providers/workflow。安装和执行见 `README.md`、`docs/operator-runbook.md`；Architecture v8 见 `docs/architecture-v8.md`。

## 实跑与验证

当前代码指纹 `09da69a3488985661f3356a0b9b4ee43cccc0b4a5f6d8b422cfb784abc1867df`。

| 检查 | 实际结果与原始证据 |
| --- | --- |
| TypeScript 与完整回归 | 194/194，21 文件；`work/m3-regression-snapshot.log`、`m3-typecheck-snapshot.log` |
| 独立安装 | 219 个锁定依赖从本机缓存安装，0 下载；独立模块目录/文件副本。非全新机器认证。`work/m4-clean-install-validation/` |
| 真实 CLI 验收 | 前一版本192项＋6真实场景通过：改输入、重复、3类非法输入、渲染中断恢复、取消恢复。导出修复后59项相关测试＋当前代码真实12秒 CLI 渲染通过；原证明按未变更依赖保留，不重复计数。 |
| 完整生产与复用 | 两版真实生产范围共2次，未重置上限；当前任务 `f98411c2…` 成功，重复渲染/导出均命中已验证缓存。`work/m3-primary-evidence/` |
| 恢复/资源清理 | M0/M2/M3 真实中断及同任务恢复、取消、租约、私有目录/sidecar、历史/CAS保存验证。见 `work/m2-cleanup-current-integration/`、`m3-cleanup-current-integration/`、清洁安装验收。 |
| 可编辑交付 | 工程目录外独立安装后，两次完整57.4秒渲染通过；“复制以后”改“复制之后”实际可见，其他6个代表帧完全一致，音频/字幕一致。`work/m3-standalone-final-validation/verification.md` |
| G5与文件完整性 | 六角色 M3 初审均 PASS；实际工程锁定/新导出/重复调用、75个CAS引用及63交付文件验证通过，四角色后置确认均 PASS。`reviews/M3/round-2/acceptance-final.json`、`work/final-closure/`。 |
| 费用 | 最终主账本19次尝试，11次有记录，8次历史缺失；已知本地provider计算费用0，总额/已付/完整项目成本仍未知。克隆验证基线不重复相加。 |

实际命令包括 `pnpm install --offline --frozen-lockfile`、`pnpm run typecheck`、`pnpm test`、`pnpm run test:acceptance`、`pnpm run test:final`、公开 CLI 的 render/jobs/production/final/audit 命令，以及导出工程两次 `pnpm run render -- --out ...`。每条准确参数、退出码和产物哈希保存在相应日志；不把 mock 媒体测试说成真实渲染。

## 发现并修复的问题

修复了标题裁切、阶段准备清理、审批/缓存完整性、跨环境预算、像素格式、PCM尾部采样丢失、导出幂等性、报告字节绑定、浏览器临时目录泄漏，以及可编辑工程渲染期间输入/音频改变导致错误溯源。独立审查还复现了清理失败时定位记录或标记丢失、暂态错误分类和并发删除问题，均保留失败及复验。

保留的非产品失败包括 Windows 受限链接 EPERM、长路径试验、观察脚本竞态、fixture路径/封装错误、只读SQLite产生sidecar及精确恢复。详见各 raw 日志；没有将首次失败覆盖成成功。未执行听审/连续创意审片，明确 UNVERIFIED，而非“已通过”。

## 边界与后续

当前是单机 Windows/NTFS 上验证的引擎，尚无跨平台、断电、恶意管理员、分布式高可用或长期压力认证。创意/研究解释由 agent 提供结构化输入，CLI负责执行；不宣称任意URL一键生成已批准成片。字幕为句/场景级；Remotion工程可编辑，未集成整个 Workbench。

复用 video-shotcraft 采用 Option C，锁定 `43bd349a136651865ecfa6ea1cf012f6e957d304` 的已审阅最小视觉闭包；不执行目标仓库、不整库Fork、不引入不明音频。代码/字体/Remotion独立许可说明和原隔离Spike保留。未调用付费视频/语音API，未部署或发布。商业许可、app/model使用及硬件等不包含在本地provider零费率中。

下一阶段可考虑更多真实项目、获授权的模型/语音提供者和专业视听评估；不自动开始下一里程碑。所有者最终 review 应完整听看视频，核对读音、节奏、动效舒适度、手机/耳机/外放体验和创意质量。
