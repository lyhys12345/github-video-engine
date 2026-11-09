# Creator style research — 2026-11-08

Research and proposed creative profiles, not enabled renderer presets or proof of audience retention. Observations below concern individual works, not every video by the creator. No full continuous listening/viewing, downloaded video dataset, model training or creator-voice imitation was performed. Long-form references need new short-form scripts, not automatic cropping.

## Source observations and limits

| Reference | Evidence actually inspected | What supports a reusable choice |
| --- | --- | --- |
| Fireship, [100+ JavaScript Concepts you Need to Know](https://www.youtube.com/watch?v=lkIFF4maKMU) | Official description; browser opening image at 0:00; exported auto subtitles, opening 0:00–1:05 read | Opening contrasts benefits and frustration, then promises a compact overview. Adapt contradiction + compressed explanations; individual technical facts in auto captions are not verified. No measured cutting rate or audible prosody claim. |
| Juxtopposed, [I Redesigned the ENTIRE YouTube UI from Scratch](https://www.youtube.com/watch?v=OUM6XmhViN4) | Browser actual frames around 0:06 and 0:16; exported English subtitles read through 2:41 | Familiar UI, user problems, specific inconsistency, proposed fix. Adapt an observable friction→change→benefit loop. Later redesign animation not visually inspected. |
| Two Minute Papers, [OpenAI's DALL-E 2: Even More Beautiful Results!](https://www.youtube.com/watch?v=lbUluHiqwoA) | Browser images at 0:00 and about 0:11; exported subtitles read through 6:02 | Defines text→image, explains noise refinement, moves to varied examples and a limitation. Adapt one striking result + one explanatory mechanism + one boundary; do not inherit the long example list or historical model claims. |
| 林亦LYi, [一只鹈鹕，怎么成了全球顶级AI的噩梦？](https://www.youtube.com/watch?v=fIBjO3RljGw) | Official visible title/description, thumbnail and actual first frame with bird/bicycle drawing. Transcript export unavailable | A concrete, unusual object anchors the larger evaluation question. Challenge-driven profile below is our hypothesis, not an observed reconstruction of the entire video. |
| 大羽玩AI, [影视飓风的 AI 高能片段，是我做的。制作幕后](https://www.bilibili.com/video/BV1cb2jBhEbM/) | Search-indexed creator title/description only; direct page returned 412 | Candidate reference for artifact→making-of narrative. No frames, timing or listening examined; proposed backstage profile remains lower-confidence. |

YouTube browser observations succeeded after text fetch returned only shell/429; initial transcript export before page readiness failed for two videos, subsequent export succeeded. Chinese transcript remained unavailable. No conclusions about Xiaohongshu/TikTok performance, creator-wide behavior or current follower ranking.

## Proposed selectable profiles

These are our design rules inspired by observed structures, not exact copies or claims about the creators' complete methods. Suggested durations are starting points, subordinate to user limits and actual material.

### dense-contrast — high-density technical contrast

- Opening: one supported benefit and a meaningful constraint, without a long introduction.
- Story: surprising fact/result → what it does → two connected mechanics → who should use it.
- Screen: selected UI/code excerpts, short keywords, a single moving cause/effect object; avoid paragraphs. Suggested 30–60s.
- Voice direction: crisp clauses, purposeful emphasis, no digitally sped-up narration. Actual prosody requires audition.
- Fit: developer tools, CLI, libraries. Risk: jargon and joke density exclude nontechnical viewers.
- Judge: can a new viewer explain the purpose without knowing the terminology?

### product-friction — demonstrate the improvement

- Opening: show one visible inconvenience before naming the tool.
- Story: friction → real action → changed state → why the project can do this → limitation.
- Screen: same UI/object persists through the action; tight crops retain context; a before/after must share conditions. Suggested 35–75s.
- Voice: conversational and concrete; do not narrate every click.
- Fit: graphical apps, maps, image/audio editors. Requires actual capture, not animated invented functionality.
- Judge: can the viewer see the change without explanation cards?

### result-to-mechanism — visual discovery

- Opening: show the strongest supported result immediately.
- Story: result → input → one mechanism → second contrasting example only if useful → takeaway/limit.
- Screen: real output dominates, mechanism diagram explains that same example; label illustrations. Suggested 40–90s.
- Voice: curious, measured emphasis; no exaggerated performance claims.
- Fit: image, audio, 3D, research demos. Requires verified result provenance.
- Judge: does the mechanism explain the result, rather than merely list architecture boxes?

### single-challenge — a test with an answer

- Opening: one concrete question that can be answered by observable evidence.
- Story: define criterion → input → attempt → success/failure → what it means.
- Screen: persistent task/object, visible result and criterion; retain meaningful failure. Suggested 30–75s.
- Voice: question and resolution; never invent test outcomes or fake urgency.
- Fit: agents, code tools, model capabilities. Needs authorized real test evidence; unsupported execution remains a blocker.
- Judge: can another person reproduce or inspect the claimed outcome? This profile is tentative pending deeper reference inspection.

### artifact-backstage — how this result was made

- Opening: finished artifact, then one production problem.
- Story: result → obstacle → one or two decisions → return to artifact → useful lesson.
- Screen: real intermediate artifacts, meaningful stages, no fabricated failures or first-person experience. Suggested 45–90s.
- Voice: explain the decision rather than recite instructions.
- Fit: video/audio creation, automation workflows. Needs actual build receipts and intermediate assets.
- Judge: does the takeaway transfer to the audience? This is a proposed profile from metadata-level research, not a frame-verified imitation.

## Integration with this engine

Today creative-brief/1.0 has a free-text style field. These profiles can guide session-agent planning there; they are NOT new executable style IDs. Keep local voice identity separate from vocal direction. Reference provenance never authorizes asset reuse or cloning another creator's voice.

For a future versioned style profile persist narrative mode, tone, information density, capture requirements, motion rules, caption rules, voice direction, ending, reference URLs and observation coverage. Keep hard duration/voice/payment constraints separate. Judge evaluates the selected profile, not one universal fast-cut preference.

Existing engine building blocks: verified screenshots/audio, configured flow/timeline visuals, caption chunks, frame-only checks and review repair. Missing: reliable generalized interactive capture, sustained object identity across scenes, authored emphasis-aware speech, and actual style-conditioned quality validation. Do not equate a profile string with those capabilities.

## Next controlled experiment

Use the SAME approved VoiceStudio facts and rights-cleared assets to draft three alternatives: product-friction, result-to-mechanism and dense-contrast. Keep audience, voice, duration range and factual scope fixed. Present complete scripts/storyboards for owner approval before rendering. Then compare anonymized outputs with equal evidence coverage. Assess opening comprehension, causal clarity, repetition, readable product imagery and actual listening. Preserve failures, allow ties, and do not infer retention without audience data. Defer challenge mode until a real authorized task/result pair exists.

No new video or preset implementation was produced by this research. Existing untracked reel-style-content-framework.md was read for context and left untouched.
