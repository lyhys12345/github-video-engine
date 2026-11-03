# 并发队列 c2 J2 可靠性独立报告

**结论：PASS，限于 c1→c2 受影响的本机路径。**

c2 清单 SHA-256 11aced43f326d05abdafad047e96abe967ec123c9993160bcdd2d69e01e4f9c3。665 项文件长度与 SHA-256 核对无差异。清单绑定 c1 manifest，两个源码归档摘要匹配，529 个条目仅 6 项 CRLF 差异。独立 Git 核对 head ac08ed9e8022dda376d219f90e6297b564107ebf、tree 02ff6c4198369cce678b954292aa8ab79b5eaee2。两候选 canonical ZIP 精确比较仅 11 个文件不同。三个 authored plan 的唯一区别是 1.2 改为 1.3。测试在独立 exact 源和复制状态上，标准离线 pnpm 安装并禁用安装脚本。

| 条款 | 本轮独立结果 |
| --- | --- |
| 1.2 历史读取与新写入门槛 | 禁用浏览器和 FFmpeg/FFprobe 路径后，三个原 c1 的计划 status、视频 status、成功任务 resume 缓存和离线 export 均通过。三个重导出的 MP4 逐字节匹配 c1。旧 trace 不新增 endingTitle。对三个实际 1.2 输入分别发起新 plan 提交和新 render，全部拒绝为 PRESENTATION_MIGRATION。拒绝后任务计数保持 19。 |
| 1.3 帧边界 | 从真实 trace 独立重算最后运动完成边界 498、422、245。evaluator 在 T−1 保持中性标题，在 T 和 T+1 显示最终标题，ended 同时切换。实际从三部 MP4 独立解码标题区域并比对，T−1→T 的暗像素掩码归一化差异分别约 0.812、0.812、0.837，T→T+1 均为 0。三个计划的精确 24 帧终态 hold 编译接受，缩成 23 帧的独立 CLI 实际拒绝。前两例为 PRESENTATION_DURATION，第三例同时低于独立的 beat 最小帧数，首先收到 PRESENTATION_SCHEMA。 |
| 1.3 真实媒体和任务恢复 | 三部冻结成片的实际 FFprobe/FFmpeg 得到 528／455／330 帧单视频流及全解码成功，独立同 ID render 均缓存命中。另在可信 Chrome 等效路径环境创建独立串行 1.3 任务 3d09d8f81f35b479045f9b5632c9562a7e87322ef389734c66e23353b0aba02c。实在 rendering 阶段取消，进程退出、独占目录清理、attempt 1 持久化。工具指纹不符时 resume 不派发。恢复同一环境后真实 CLI 同 ID 完成 attempt 2，离线重复 resume 命中缓存。恢复电影实际解码成功，455 帧 H.264。 |
| 破损拒绝与文件保留 | 隔离状态中的来源、计划、trace、MP4 分别损坏，status、resume、export 均拒绝，未生成拒绝的输出目录。每项恢复后重新 verified。对非关联目标目录的碰撞保留用户占位文件。 |
| 旧 HTTP/rembg 兼容 | 用当前入口从隔离的旧状态重导出两个真实旁白预览，两个视频和各自 trace、PCM 摘要逐项匹配，双流完整解码成功。 |

独立 typecheck 和聚焦五个文件的 47 项测试通过，包括真实旧 Story 回归。没有重跑 c1 的 405 项全量，也没有将其记为 c2 实跑。部分夹具明确为模拟，CLI、SQLite/CAS、Chrome 渲染、工作器取消和 FFmpeg/FFprobe 是真实执行。评审脚本先把历史平铺视频目录误当 receipt staging 层级，并把第三个 23 帧负例误判为 duration 先行，已纠正并保留两份原始失败日志。最终复核 665 个冻结文件无改动。没有执行目标仓库、付费、部署或外发。实际语义、审美、听感及 owner acceptance 留待相应角色。
