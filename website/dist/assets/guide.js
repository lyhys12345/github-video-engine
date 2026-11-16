const install = `git clone https://github.com/lyhys12345/github-video-engine.git
cd github-video-engine
pnpm install --frozen-lockfile --ignore-scripts
pnpm gve doctor --first-owner`;

function initialPrompt(t) {
  return t(
    'Use github-explainer to explain https://github.com/OWNER/REPO.\nAudience: people who have never used this project.\nPlan a concise vertical short video. Choose the duration and style to suit the story.\nStart with one useful result, then explain what makes it possible.\nFor this step, research and prepare the full narration, shot-by-shot storyboard and source evidence only.\nObtain an independent script review and fix supported findings. Show me the revised script for approval.\nDo not generate media or execute the target repository. Before any later rendering, clarify the supported visual assets and voice route with me.',
    '请用 github-explainer 解读 https://github.com/OWNER/REPO。\n受众：第一次接触这个项目的普通观众。\n策划一条简洁的竖屏短视频，根据故事选择合适的时长和风格。\n从一个具体有用的结果切入，再解释它为什么能实现。\n这一步只研究资料，并准备完整旁白、逐镜头分镜与来源证据。\n先让独立 Agent 审稿，修正有依据的问题，再把完整脚本给我审核。\n不要生成媒体，也不要运行目标仓库。之后生成前，先和我确认受支持的画面素材与配音方式。'
  );
}

export function renderGuide({t, href, doc, external, codeBlock, cta}) {
  const nav = [
    ['install', t('01 Install & check', '01 安装与检查')],
    ['agent', t('02 Open in Codex', '02 在 Codex 中打开')],
    ['brief', t('03 Prepare your brief', '03 准备需求')],
    ['review', t('04 Review, then create', '04 审核后生成')],
    ['export', t('05 Keep the project', '05 保留项目')],
    ['voices', t('Voice & media options', '声音与媒体选项')],
    ['support', t('Compatibility', '兼容性')]
  ];
  return `<main id="main">
    <section class="page-intro guide-intro container">
      <p class="eyebrow">${t('GET STARTED', '开始使用')}</p>
      <h1>${t('First, a story.<br> Then, your video.', '先把故事讲好，<br> 再让画面动起来。')}</h1>
      <p>${t('Start with a script you can review. The recommended path is Windows + Codex, using your existing agent session.', '先拿到一版可以审核的脚本。建议从 Windows + Codex 开始，使用你现有的 Agent 会话。')}</p>
      <div class="guide-badges"><span>Windows x64</span><span>Node.js 24.x</span><span>pnpm 11.25.0</span></div>
      <div class="guide-route"><strong>${t('Your first milestone', '你的第一个成果')}</strong><p>${t('A complete narration, storyboard and source list — ready for your approval. You can get there before setting up a voice model.', '一份完整旁白、逐镜头分镜和来源清单，等你审核。还没有配置语音模型，也可以先做到这里。')}</p></div>
    </section>
    <div class="guide-layout container">
      <aside class="guide-sidebar"><span class="eyebrow">${t('YOUR FIRST PROJECT', '第一个项目')}</span>${nav.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</aside>
      <div class="guide-content">
        <section id="install" class="guide-step">
          <span class="step-number">01</span><h2>${t('Install. Check. You’re ready to plan.', '安装并检查，开始策划。')}</h2>
          <p>${t('Prepare Node.js 24.x, pnpm 11.25.0 and Git. Clone this engine into a short local Windows path, then run its setup check.', '准备 Node.js 24.x、pnpm 11.25.0 和 Git。将引擎克隆到较短的 Windows 本地路径，再检查环境。')}</p>
          <details class="guide-detail"><summary>${t('Need the prerequisites?', '还没安装环境？')} <span>+</span></summary><p>${t('Use the official downloads below. Select Node.js 24.x and the Windows x64 installers. After installing Node and Git, reopen your terminal and install the pinned pnpm version.', '从下方官方入口下载，选择 Node.js 24.x 和 Windows x64 安装包。安装 Node 与 Git 后，重新打开终端，再安装指定版本的 pnpm。')}</p><p>${external('https://nodejs.org/en/download', t('Node.js downloads — choose 24.x', 'Node.js 官方下载 — 选择 24.x'), 'inline-link')} · ${external('https://git-scm.com/install/windows', t('Git for Windows', 'Git 官方 Windows 下载'), 'inline-link')}</p>${codeBlock('prerequisite-command', 'npm install --global pnpm@11.25.0', t('AFTER NODE IS INSTALLED', '安装 NODE 后运行'))}</details>
          ${codeBlock('install-command', install, 'TERMINAL')}
          <table class="guide-preflight"><caption>${t('Install what you need for the next step.', '按下一步需要，分阶段准备。')}</caption><thead><tr><th scope="col">${t('Your next step', '下一步')}</th><th scope="col">${t('What you need', '需要准备')}</th></tr></thead><tbody><tr><th scope="row">${t('Plan & review', '策划与审稿')}</th><td>${t('Git, Node 24.x, pnpm 11.25.0 and writable local storage. Use your existing Codex account; no separate model API key.', 'Git、Node 24.x、pnpm 11.25.0 与可写的本地存储。使用现有 Codex 账号，无需另配模型 API 密钥。')}</td></tr><tr><th scope="row">${t('Render video', '生成视频')}</th><td>${t('Add Chrome/Chromium, FFmpeg and FFprobe.', '再准备 Chrome/Chromium、FFmpeg 和 FFprobe。')}</td></tr><tr><th scope="row">${t('Add narration', '加入配音')}</th><td>${t('Import authorized WAVs, or set up a supported local voice. Only the local neural voice route needs the separate NVIDIA/Python setup.', '导入有授权的 WAV，或配置受支持的本地声音。只有本地神经语音方式需要单独配置 NVIDIA 显卡与 Python。')}</td></tr></tbody></table>
          <div class="guide-checkpoint"><span class="check-label">${t('WHAT TO LOOK FOR', '检查结果怎么看')}</span><p>${t('Look for planning.status: ready. That means the local runtime and storage checks passed. Media checks marked not-checked can wait until after script review.', '看到 planning.status: ready，表示本地运行环境和存储检查已通过。媒体项显示 not-checked 时，可以等脚本审核后再准备。')}</p></div>
          <details class="guide-detail"><summary>${t('Read the setup check', '读懂环境检查结果')} <span>+</span></summary><dl class="doctor-states"><dt><code>ready</code></dt><dd>${t('The listed checks passed for this phase.', '这个阶段列出的检查已通过。')}</dd><dt><code>blocked</code></dt><dd>${t('Resolve the reported blocker, then run the check again.', '按报告解决阻塞项，再重新检查。')}</dd><dt><code>not-checked</code></dt><dd>${t('Outside this check’s scope. This is expected for media during planning.', '不在本次检查范围内；策划阶段的媒体项通常如此。')}</dd><dt><code>awaiting-selection</code></dt><dd>${t('Preview setup still needs an explicit voice and language choice.', '预览环境还需要明确选择声音方式和语言。')}</dd></dl><p>${t('Doctor checks locally; it does not contact GitHub, launch a browser or generate media. Source capture checks access to your public repository later.', 'Doctor 只检查本地，不访问 GitHub、不启动浏览器，也不生成媒体。之后抓取来源时，才会实际访问你的公开仓库。')}</p></details>
          ${external(doc('first-owner-quickstart'), t('Setup details & troubleshooting', '安装详情与排查'), 'inline-link')}
        </section>
        <section id="agent" class="guide-step">
          <span class="step-number">02</span><h2>${t('Open the engine folder in Codex.', '在 Codex 中打开引擎文件夹。')}</h2>
          <p>${t('Use the github-video-engine folder you just cloned as your working project. Its github-explainer skill is included. Your target repository is an input link, not a project you need to install or run.', '将刚克隆的 github-video-engine 文件夹作为工作项目打开，里面已包含 github-explainer Skill。你想介绍的仓库只需要提供链接，无需安装或运行。')}</p>
          <div class="agent-tabs" role="tablist" aria-label="${t('Agent setup', 'Agent 配置')}"><button role="tab" aria-selected="true" aria-controls="agent-panel" id="codex-tab" data-agent="codex">Codex</button><button role="tab" aria-selected="false" aria-controls="agent-panel" id="claude-tab" tabindex="-1" data-agent="claude">Claude Code</button></div>
          <div id="agent-panel" role="tabpanel" aria-labelledby="codex-tab" class="agent-panel"></div>
          <p class="guide-hint">${t('The session route does not need a separate model API key. Your coding-agent account and usage terms still apply. Claude Code is an alternative entry with a narrower verification status; see Compatibility below.', '会话流程无需另配模型 API 密钥，编程 Agent 的账号与用量规则仍然适用。Claude Code 也有入口，但验证范围更有限，详见下方兼容性说明。')}</p>
        </section>
        <section id="brief" class="guide-step">
          <span class="step-number">03</span><h2>${t('Give it a link and an audience.', '一个链接，加上你想讲给谁听。')}</h2>
          <p>${t('Copy the example below, or tailor it here. The agent can suggest the creative direction; you do not need to design every scene yourself.', '复制下面的示例，或在这里调整需求。不必先设计好每个镜头，创作方向也可以让 Agent 建议。')}</p>
          <form id="prompt-builder" class="prompt-builder" data-state="example" novalidate>
            <div class="builder-grid">
              <div class="builder-field builder-wide"><label for="brief-repo">${t('GitHub repository', 'GitHub 仓库')}</label><input id="brief-repo" name="repository" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://github.com/owner/repository" aria-describedby="builder-privacy builder-status"></div>
              <div class="builder-field"><label for="brief-platform">${t('Platform', '平台')}</label><select id="brief-platform" name="platform"><option value="tiktok">TikTok / Reels</option><option value="xiaohongshu">${t('Xiaohongshu', '小红书')}</option><option value="readme">GitHub README</option></select></div>
              <div class="builder-field"><label for="brief-duration">${t('Target length', '期望时长')}</label><select id="brief-duration" name="duration"><option value="agent">${t('Let the story decide', '让故事决定')}</option><option value="30">${t('Around 30 seconds', '约 30 秒')}</option><option value="60">${t('Around 60 seconds', '约 60 秒')}</option><option value="90">${t('Around 90 seconds', '约 90 秒')}</option></select></div>
              <div class="builder-field builder-wide"><label for="brief-style">${t('Opening style', '开场风格')}</label><select id="brief-style" name="style"><option value="result">${t('Show a useful result first', '先展示有用的结果')}</option><option value="problem">${t('Start with a familiar problem', '先讲一个熟悉的问题')}</option><option value="agent">${t('Let the agent suggest', '交给 Agent 建议')}</option></select></div>
            </div>
            <div class="builder-actions"><button class="button dark" type="submit">${t('Prepare my prompt', '生成我的提示词')} <span aria-hidden="true">↗</span></button><p id="builder-privacy">${t('Browser-only. Nothing is submitted, stored or generated on a server.', '仅在浏览器中整理文字，不提交、不保存，也不在服务器生成内容。')}</p></div>
            <p id="builder-status" class="builder-status" role="status" aria-live="polite">${t('Example prompt below. Replace OWNER/REPO before using it, or enter your repository above.', '下方是示例提示词。使用前请替换 OWNER/REPO，或在上方填写你的仓库。')}</p>
          </form>
          ${codeBlock('starter-prompt', initialPrompt(t), t('COPY INTO YOUR CODEX CHAT', '复制到 CODEX 会话'))}
          <p class="guide-hint">${t('This prompt asks for script review only. Voice and media generation come after your approval and a compatible setup.', '这条提示词只要求准备和审核脚本。你批准后，再确认兼容的语音与媒体环境，开始生成。')}</p>
        </section>
        <section id="review" class="guide-step">
          <span class="step-number">04</span><h2>${t('Approve the story. Then make it move.', '故事确认了，再开始制作。')}</h2>
          <p>${t('The agent researches the repository and prepares the full narration, storyboard and sources. Independent script review helps catch issues before you see the revised draft. Read it, ask for changes, and approve the actual version you want produced.', 'Agent 会研究仓库，准备完整旁白、分镜和来源；独立审稿帮助提前找出问题，再把修订稿交给你。你可以继续修改，确认想制作的那一版。')}</p>
          <p class="guide-hint">${t('Your first successful stop is awaiting-script-review: the draft is ready for you. If you see awaiting-session-agent first, let Codex continue reading the source packet and authoring the script.', '第一个预期成果是 awaiting-script-review：草稿已经准备好，等你审核。若先看到 awaiting-session-agent，让 Codex 继续阅读来源资料并编写脚本即可。')}</p>
          <blockquote>${t('“Show the result first. Then explain the one idea that makes it work.”', '“先展示结果，再讲清楚它能做到这件事的关键。”')}</blockquote>
          <div class="guide-checkpoint"><span class="check-label">${t('THE NEXT CHECKPOINT', '下一处检查点')}</span><p>${t('Before rendering, choose a supported visual and voice route with the agent. Rendering needs Chrome/Chromium, FFmpeg and FFprobe; local synthesis has additional requirements below. A changed script needs renewed approval.', '渲染前，和 Agent 确认受支持的画面与配音方式。生成视频需要 Chrome/Chromium、FFmpeg 和 FFprobe；本地语音还需要下方列出的环境。脚本改变后，需要重新审核。')}</p></div>
          <p class="guide-hint">${t('Source capture is not a finished video. Review the resulting picture and sound yourself; technical checks and agent reviews do not replace your final acceptance.', '抓取来源不等于生成成片。最终仍请你亲自看画面、听声音；技术检查和 Agent 审阅不能代替你的最终验收。')}</p>
        </section>
        <section id="export" class="guide-step">
          <span class="step-number">05</span><h2>${t('Keep the result. And the project.', '拿到成片，也保留项目。')}</h2>
          <p>${t('Supported exports include an MP4 and editable story, animation, caption definitions and source records. You can return to that project to revise it, instead of starting again.', '支持的导出包含 MP4，以及可编辑的故事、动画、字幕定义和来源记录。之后可以回到这个项目继续修改，而不必从头开始。')}</p>
          <blockquote>${t('“Shorten the opening and use a clearer example.”', '“把开头缩短，换一个更好懂的例子。”')}</blockquote><p>${t('Reopen the engine project and ask your agent. It revises the plan for your approval, then reuses valid unchanged work when making the next version.', '重新打开引擎项目，直接告诉 Agent。它会修改计划交给你审核，制作下一版时复用仍然有效、没有变化的内容。')}</p>
          <div class="export-chips"><span>story.json</span><span>narrative.json</span><span>animation.json</span><span>run.json</span></div>
          <details class="guide-detail"><summary>${t('What the export includes', '导出具体包含什么')} <span>+</span></summary><p>${t('This is an editable engine project, not a Premiere or CapCut project. Supported narrated packages can preserve selected original WAVs. Packages exclude credentials, local voice profiles, model weights and environments. Transfer the entire package plus its digest, and install a compatible engine to continue on another machine.', '这是可编辑的引擎项目，不是 Premiere 或剪映工程。支持的有声项目包可保留所选原始 WAV；凭据、本地音色配置、模型和运行环境不会打包。换电脑时，需要完整传递项目包及摘要，并安装兼容的引擎。')}</p>${external(doc('portable-long-project-v1'), t('Export & import guide', '导出与导入说明'), 'inline-link')}</details>
        </section>
        <section id="voices" class="guide-step">
          <p class="eyebrow">${t('WHEN YOU ARE READY TO RENDER', '准备生成时再配置')}</p><h2>${t('A voice route that fits your setup.', '选择适合你的配音方式。')}</h2>
          <p>${t('The voices heard in some demos are private configurations, not bundled presets. Choose from these supported routes with the agent.', '部分示例里的声音来自私人配置，不是仓库随附音色。你可以和 Agent 从这些受支持的方式中选择。')}</p>
          <details class="guide-detail"><summary>${t('Free public local voices', '免费公开本地音色')} <span>+</span></summary><p>${t('Ryan for English and Serena for Chinese. No reference recording or paid TTS account is required. Separate setup: Windows x64, Python 3.12.14 and NVIDIA CUDA with native BF16 support. RTX 3070 has been exercised. The model download is about 2.50 GB, plus runtime and CUDA space.', '英文 Ryan，中文 Serena。不需要参考录音或付费 TTS 账号，但需单独配置 Windows x64、Python 3.12.14，以及支持原生 BF16 的 NVIDIA CUDA 显卡。已在 RTX 3070 上实测。模型约 2.50 GB，另需运行环境与 CUDA 空间。')}</p>${external(doc('public-local-voice-v1'), t('Install the public voice runtime', '安装公开语音环境'), 'inline-link')}</details>
          <details class="guide-detail"><summary>${t('Bring your own audio or local voice', '导入录音或配置本地音色')} <span>+</span></summary><p>${t('Import authorized finished WAV recordings that match the approved scene text, or configure an authorized supported local voice. Anna/Chen reference recordings and private profiles are not distributed. A missing voice produces an explicit error rather than silently changing your choice.', '可以导入有权使用、与已批准场景文案一致的 WAV 录音，或配置有授权、受支持的本地音色。Anna/Chen 参考录音与私人配置不随仓库分发。音色不可用时会明确报错，不会擅自换声。')}</p>${external(doc('narration-voice-preference'), t('Voice preference details', '音色偏好说明'), 'inline-link')}</details>
          <details class="guide-detail"><summary>${t('Start with a silent technical preview', '先做无声技术预览')} <span>+</span></summary><p>${t('Explicitly choose silence to review supported diagrams and visual transformations without a voice model. Some storyboard titles, copy and transitions can remain export-only. Real product footage and editorial cuts need the separate showcase route and authorized assets; silent technical support does not promise every planned scene can render.', '明确选择无声，可以先检查受支持的图示与视觉变化，不需要语音模型。部分分镜标题、文案和转场可能只保留在导出计划中。真实产品素材与剪辑需要独立的 showcase 流程及有授权的素材；无声技术预览并不代表所有计划中的镜头都能渲染。')}</p>${external(doc('first-owner-quickstart'), t('Supported media routes', '受支持的媒体流程'), 'inline-link')}</details>
        </section>
        <section id="support" class="guide-step">
          <p class="eyebrow">${t('COMPATIBILITY', '兼容性')}</p><h2>${t('Know your starting point.', '了解当前支持范围。')}</h2>
          <details class="guide-detail" open><summary>${t('Recommended: Windows + Codex', '建议使用：Windows + Codex')} <span>+</span></summary><p>${t('Windows x64/NTFS, Node 24, SQLite and same-volume hard links are the verified environment. Real Codex URL-to-narrated-media and feedback continuation are documented with operator involvement. Native macOS/Linux execution is unverified, and automatic reproduction of the showcase is not guaranteed.', '已验证环境为 Windows x64／NTFS、Node 24、SQLite 与同卷硬链接。真实 Codex 已有 URL 到有声媒体及反馈续改记录，期间有人参与操作。macOS／Linux 原生运行尚未验证，也不保证自动复现作品库水准。')}</p></details>
          <details class="guide-detail"><summary>${t('Claude Code and BYO API status', 'Claude Code 与自备 API 状态')} <span>+</span></summary><p>${t('Claude Code project routing is statically checked; real end-to-end media generation and revision remain unverified. Optional BYO API authoring is experimental, with real-provider interoperability unverified. The Codex session route needs no separate model API key; the host still has its own account and usage requirements.', 'Claude Code 项目入口已做静态检查，真实端到端媒体生成与改稿尚未验证。可选自备 API 策划接口仍属实验能力，真实服务商兼容性尚未验证。Codex 会话流程无需额外模型 API 密钥，但宿主平台仍有账号与用量要求。')}</p>${external(doc('support-and-release'), t('Full support & release notes', '完整支持与发布说明'), 'inline-link')}</details>
        </section>
      </div>
    </div>${cta()}
  </main>`;
}

export function bindGuideTools({t}) {
  const form = document.getElementById('prompt-builder');
  if (!form) return;
  const repoInput = document.getElementById('brief-repo');
  const status = document.getElementById('builder-status');
  const prompt = document.getElementById('starter-prompt');
  const copy = document.querySelector('[data-copy="starter-prompt"]');
  const setState = (state, message) => {
    form.dataset.state = state;
    status.textContent = message;
    if (copy) {
      copy.disabled = state === 'dirty' || state === 'invalid';
      copy.setAttribute('aria-describedby', 'builder-status');
    }
  };
  const markDirty = () => {
    repoInput.removeAttribute('aria-invalid');
    setState('dirty', t('Your choices changed. Prepare the prompt again before copying it.', '需求已修改。请重新生成提示词，再复制使用。'));
    prompt.textContent = t('Prepare your prompt above to apply the current choices.', '请点击上方“生成我的提示词”，应用当前选择。');
  };
  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);
  setState(form.dataset.state || 'example', status.textContent);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let url;
    try {
      url = new URL(repoInput.value.trim());
      const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash || parts.length !== 2 || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(parts[0]) || !/^[A-Za-z0-9_.-]{1,100}$/.test(parts[1]) || ['.', '..'].includes(parts[1])) throw new Error('Invalid repository');
      const repository = parts[1].replace(/\.git$/, '');
      if (!repository || ['.', '..'].includes(repository)) throw new Error('Invalid repository');
      url = `https://github.com/${parts[0]}/${repository}`;
    } catch {
      repoInput.setAttribute('aria-invalid', 'true');
      setState('invalid', t('Use a repository link like https://github.com/owner/repository, without credentials, query parameters or a file path.', '请输入 https://github.com/owner/repository 形式的仓库链接，不要包含凭据、查询参数或文件路径。'));
      prompt.textContent = t('Correct the repository link above, then prepare a new prompt.', '请先修正上方仓库链接，再生成新的提示词。');
      repoInput.focus();
      return;
    }
    repoInput.removeAttribute('aria-invalid');
    const platform = document.getElementById('brief-platform').value;
    const duration = document.getElementById('brief-duration').value;
    const style = document.getElementById('brief-style').value;
    const platforms = {tiktok: 'TikTok / Reels', xiaohongshu: t('Xiaohongshu', '小红书'), readme: 'GitHub README'};
    const styles = {
      result: t('Open with one useful result, then explain the idea that makes it possible.', '先展示一个具体有用的结果，再解释它能实现的关键。'),
      problem: t('Open with a familiar problem, show how the project helps, then explain the key idea.', '从一个熟悉的问题切入，展示项目如何解决，再讲清关键原理。'),
      agent: t('Suggest an opening and visual style based on source evidence and the audience.', '根据项目证据和受众，建议合适的开场与视觉风格。')
    };
    const length = duration === 'agent'
      ? t('Choose the length based on the story, under five minutes. Prefer a concise short-video format.', '根据故事决定时长，控制在五分钟以内，优先简洁的短视频形式。')
      : t(`Aim for around ${duration} seconds. Prioritize clarity over filling time.`, `目标约 ${duration} 秒，以讲清楚为准，不要为凑时长重复内容。`);
    const output = [
      t(`Use github-explainer to explain ${url}.`, `请用 github-explainer 解读 ${url}。`),
      t('Audience: people who have never used this project.', '受众：第一次接触这个项目的普通观众。'),
      t(`Platform: ${platforms[platform]}.`, `平台：${platforms[platform]}。`),
      platform === 'readme' ? t('Suggest a suitable video aspect ratio for the README.', '请建议适合 README 展示的视频比例。') : t('Use a vertical short-video format.', '采用竖屏短视频形式。'),
      length,
      styles[style],
      t('For this step, research and prepare the full narration, shot-by-shot storyboard and source evidence only.', '这一步只研究资料，并准备完整旁白、逐镜头分镜与来源证据。'),
      t('Obtain an independent script review, fix supported findings, and show me the revised full script for approval.', '让独立 Agent 审稿，修正有依据的问题，再把修订后的完整脚本给我审核。'),
      t('Do not generate media or execute the target repository. Before any later rendering, clarify supported visual assets, voice and language with me.', '不要生成媒体，也不要运行目标仓库。之后生成前，先和我确认受支持的画面素材、声音与语言。')
    ].join('\n');
    prompt.textContent = output;
    setState('ready', t('Your prompt is ready below. Copy it into Codex; nothing has been submitted.', '提示词已在下方更新。复制到 Codex 中使用；这里没有提交任何内容。'));
  });
}
