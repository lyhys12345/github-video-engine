# Independent selection and media-feasibility review

2026-11-08. Reviewer: rsi_intake. Scope: three candidate topics and source-media feasibility for ordinary Xiaohongshu viewers; NOT script approval, production approval, runtime testing, complete video viewing or media-rights clearance. No target installation/execution, model/API call, payment or video generation. Only this report written to repository; bounded public assets read into temporary scratch. Candidate scripts not edited.

## Verdict

All three are viable topics, but production readiness differs. Hallmark has the easiest immediate visible contrast; ArtCraft has the strongest spatial-action hook but its main demo and rights need shot-level checks; OpenMAIC has a broad relatable need but the current English/math-heavy assets demand focused crops. Recommend keep all three for script review, not claim all media cleared. They exercise different narratives rather than three versions of a generic AI-tool pitch.

Captured metadata records substantial stars and recent pushes (ArtCraft39909, Hallmark50968, OpenMAIC43039). This is popularity/activity evidence at the capture date, not evidence of recent star-growth or a verified trending rank. Do not say 今日爆火/新增N万star without time-series evidence.

## ArtCraft — conditional media readiness, strong visual topic

Pinned source: storytold/artcraft@79d87b2b54b5b27223fa428bd0acd06bdd7abaf5. README lines8–14 reference a two-minute official demo and a GitHub attachment; lines38–46 provide separate location, compositing, mesh, posing and scene-blocking demos. I read the actual README and downloaded/viewed the official character-posing.webp first frame (800x674,4119866bytes) at the README-pinned media commit22a27373707b13f48fc56405f1f89ca143c43d5d. It visibly contains a jointed mannequin in a3D environment with Move/Rotate/Scale and image-generation UI. This is usable product evidence, not a generated illustration. I did NOT watch the full two-minute video or establish its audio rights/shot continuity.

Best ordinary-viewer opening: “AI画图，人物站哪儿、镜头放哪儿，能不能先自己摆好？” Immediately show an actual pose/camera manipulation followed by its documented result if the same official demo contains that causal pair. Do not invent a before/after or imply precision guaranteed. Alternate result-first treatment: show the official end frame, then reveal the arranged scene; only after exact paired footage confirmed.

Focus on one differentiator: compose a scene spatially, then ask a connected generation model to produce the image. README provider catalog is evidence against calling the entire generation workflow free/offline. Avoid a model-name rollcall and do not advertise free unlimited output.

Required before render: inspect/select actual action and result frames from the official demo, capture source URL/hash/timecodes; determine whether main-demo soundtrack can be used, otherwise use our narration and omit original soundtrack. NOTICE explicitly excludes Nintendo sound effects, meme likenesses, certain skyboxes, Lumine MMD motion and Mixamo renders from its MIT/Apache grant; logos are trademarks. A public demo URL or open-source code license is not blanket permission for every visible/audible asset. Use attributable excerpts with a documented rights basis or owner permission, avoiding excluded media. A generic mannequin-only shot is preferable to a recognizable copyrighted character but is not automatic rights clearance.

Sources: https://github.com/storytold/artcraft/blob/79d87b2b54b5b27223fa428bd0acd06bdd7abaf5/README.md ; https://github.com/storytold/artcraft/blob/79d87b2b54b5b27223fa428bd0acd06bdd7abaf5/NOTICE ; https://raw.githubusercontent.com/storytold/github-media/22a27373707b13f48fc56405f1f89ca143c43d5d/character-posing.webp

## Hallmark — most immediately demonstrable, official comparison only

Pinned source: Nutlope/hallmark@407fa689f4a276f2fd389208d271d0fef08f5058. Read README, fixed site/index.html and site/js/compare.js. The site explicitly labels the left as a model-only page and the right as a Hallmark theme page from the same prompt. Data contains three pairs: Fieldbook, Closewise and Relay. Downloaded and actually viewed the top1000px of both Fieldbook full-page WebP assets: the bare version has a conventional text/phone hero; the Hallmark version has a contour-map composition and integrated record card. This confirms visually distinct official examples, not independently reproduced superiority. These are official same-prompt examples, not necessarily “redesigned the exact previous page” and not an experimental benchmark.

Best opening: “同样是让AI做网页，为什么一个像套模板，另一个有自己的样子？” Put the actual pair on screen with “官方案例 / 未独立复现”. Let viewers inspect2–3 concrete differences (layout, type hierarchy, subject-specific visual), then explain theme materials + browser checks + independent review. Do not promise perfect design or that a fresh agent guarantees quality. Avoid ridiculing the left as objectively bad; it is already coherent. Ordinary creators/shop owners will relate more than a CLI-install tutorial audience.

The source title names a model version; no need repeat that mutable/model-marketing detail in narration. The documented comparison is stronger than a fabricated sweep between unrelated screenshots. Show a matched crop or vertical reveal, not two complete long webpages shrunk into illegibility. Preserve identical case identity and author attribution.

Rights gap: README MIT code license plus a library of individually licensed photos (CC0/PD/CC BY/CC BY-SA), not blanket image permission. Preserve/retrieve per-photo attribution and license where a showcased page contains photos. The inspected Fieldbook hero is graphics-forward, reducing but not resolving asset provenance obligations. Official provenance is clear; full redistribution permission for every page asset is not independently cleared.

Sources: https://github.com/Nutlope/hallmark/blob/407fa689f4a276f2fd389208d271d0fef08f5058/site/index.html ; https://github.com/Nutlope/hallmark/blob/407fa689f4a276f2fd389208d271d0fef08f5058/site/js/compare.js ; fixed site/assets/cmp/fieldbook-bare-full.webp and fieldbook-hallmark-full.webp.

## OpenMAIC — actual assets sufficient, needs focused Chinese framing

Pinned source THU-MAIC/OpenMAIC@10da906f992ff4fd88d57f69e39b5064bee350c7. All requested GIFs exist in captured tree. Downloaded all four (total6761189bytes), FFprobe inspected real dimensions/durations, and viewed their actual first frames plus3-second frames for interactive/discussion/quiz. No listening or continuous playback claimed:

| asset | dimensions | duration | observed content |
|---|---|---|---|
| assets/interactive.gif |1908x1086|9.51s|LLM context stack with Add User Message and Generate Response controls; technical English example|
| assets/discussion.gif |1908x1086|32.33s|Join Discussion state, then active classroom chat/AI classmates and Stop Discussion|
| assets/quiz.gif |1878x1104|7.91s|Start Quiz, then selected answer and progress1/2|
| assets/slides.gif |1878x1104|7.16s|Math lesson slide with teacher explanation area; genuine product slide, not sufficient by itself for an interactive hook|

Best opening: “资料看不进去，能不能把它变成一堂能提问、能做题的课？” Show quiz selection or joining discussion immediately, then explain topic/document input→lesson scenes→interactive learning. This frames the value without asserting a measured learning improvement. Alternate result-first: “这堂课里，老师和同学都是AI。” Use the genuine discussion UI and immediately clarify the learner is human. Do not imply multi-agent opinions are independently factual or replace a real teacher.

These assets are enough for a short evidence-based official-demo story, but not enough to show a new Chinese lesson generated from our own input: no such run occurred. Crop to the changed control and its visible result; retain a small stable classroom context. Full landscape screenshots scaled into portrait would be unreadable and feel like PPT. The interactive GIF subject is fairly technical for ordinary viewers; discussion/quiz are stronger hooks. Slides should support context, not dominate the middle. Do not overlay translated UI as if native captured interface; translated explanation should clearly be editorial.

README documents model/provider setup and server dependencies; “open source” does not establish a zero-cost hosted service. MIT badge is code-level evidence; complete classroom content/avatar/media rights and generated-content accuracy remain unchecked. Keep “官方演示，非本轮实测” labeling. Do not narrate learning-efficiency gains, exact generation speed or universal document support as verified results.

Source URLs: https://raw.githubusercontent.com/THU-MAIC/OpenMAIC/10da906f992ff4fd88d57f69e39b5064bee350c7/assets/interactive.gif (and discussion.gif,quiz.gif,slides.gif at same base); fixed README and captured tree. Scratch inspection used trusted FFmpeg/FFprobe and image viewer only, not app code.

## Shared release gate

Script review can proceed now. Actual production still needs owner script approval, per-shot source/timecode/rights record, portrait legibility check, and explicit separation of official demo from our test results. No paid generation assumed. These are editorial topic recommendations and bounded source-image observations, not full fact/AV approvals or legal determinations. Raw captures remain temporary; before production refetch exact pinned assets and save hashes into the engine artifact store.

## ArtCraft narrow follow-up: actual pose→result frames

Decoded the existing character-posing.webp with installed Pillow because local FFmpeg could not decode animated WebP (`image data not found`); this is trusted image decoding, no AI generation or target execution.211frames,800x674, summed frame duration8651ms. Viewed actual frames0,35,60,80,105,210.

- frame35: mannequin arm rotation gizmo; frame60: knee/leg adjustment gizmo.
- frame80: full posed mannequin, one arm raised and one knee bent; visible prompt requests retaining the pose and turning it into a metallic robot ballet dancer on Mars. Generate control shows a23 credit-like indicator; this does not establish actual billing, but certainly does not support free generation.
- frame105: finished metallic robot in a reddish Mars-like landscape, raised arm/bent knee composition. This is a generated-looking result presented in the SAME official demo asset, not just editor footage.
- frame210: closer view of that finished robot. The demo is edited; no independent reproduction or proof of exact pose fidelity, model, elapsed generation time or price. Result's limb positions are not identical enough to promise exact preservation.

A concrete supported hook can therefore show the finished robot, then rewind to arm/knee posing and the prompt: “先把姿势摆好，再让模型出图。” Label official demo, do not claim we ran it. This strengthens footage feasibility; prior rights/source caveats remain.

Actual inspected absolute image paths:
- `C:/Users/luyuh/AppData/Local/Temp/gve-xhs-selection-review/artcraft-first.png`
- `C:/Users/luyuh/AppData/Local/Temp/gve-xhs-selection-review/artcraft-35.png`
- `C:/Users/luyuh/AppData/Local/Temp/gve-xhs-selection-review/artcraft-60.png`
- `C:/Users/luyuh/AppData/Local/Temp/gve-xhs-selection-review/artcraft-80.png`
- `C:/Users/luyuh/AppData/Local/Temp/gve-xhs-selection-review/artcraft-middle.png` (frame105)
- `C:/Users/luyuh/AppData/Local/Temp/gve-xhs-selection-review/artcraft-last.png` (frame210)

Previously viewed comparison/lesson paths share that same directory: `fieldbook-bare-full.png`, `fieldbook-hallmark-full.png` (actual hero crops); `discussion.png`, `discussion-3.png`, `quiz.png`, `quiz-3.png`; original downloadable assets remain there. Temporary scratch is not a committed media package.
