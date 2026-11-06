# Fresh Codex Redis preview and feedback

A new real Codex session in an isolated engine checkout at `747f4b3` received only:

```text
请把 https://github.com/redis/redis 做成可编辑的中文有声技术预览，优先一个能由固定源码支持的清晰机制和例子。
```

Normal `codex --approve-for-me exec` used existing ChatGPT sign-in. No skill name, author JSON or step-by-step author instructions were supplied. The model automatically selected/read `github-explainer`, captured the repository, chose a TTL example, authored six scenes and local Chinese narration, and completed a 64.5-second editable technical preview. No runtime code repair was needed. A measured speech deficit of one frame was resolved by the Agent explicitly changing one shot from11 to11.5seconds; this was authorship, not automatic timing padding. The initial restricted GitHub fetch failed with retryable `SOURCE_NETWORK`; the normal approved retry succeeded.

The fixed Redis commit was `28c3a18203432f28999e175a9ca9f36490efbdfb`. Additional sources were [TTL](https://github.com/redis/redis/blob/28c3a18203432f28999e175a9ca9f36490efbdfb/src/commands/ttl.json), [EXPIRE](https://github.com/redis/redis/blob/28c3a18203432f28999e175a9ca9f36490efbdfb/src/commands/expire.json), and [PERSIST](https://github.com/redis/redis/blob/28c3a18203432f28999e175a9ca9f36490efbdfb/src/commands/persist.json). These are command-source metadata, not a reading or execution of the full C server implementation. The cart key and positive countdown reading are teaching illustrations; Redis was not installed or run.

After the first turn actually ended, the same session received one validation-operator user-role feedback message:

```text
请只把负一和负二的区别讲得更直白：负一是键还在但没有到期时间，负二是键不存在。对应画面先突出负一，再突出负二，保留旧版。
```

The model authored `closing-feedback-plan.json`, ran the existing guarded `feedback-apply` through speech and preview, and retained the original version. No fallback or author JSON was supplied by the validation operator. Both model turns ended normally. This feedback is a test intervention, not final owner creative approval.

Observed results:

- Both movies independently measured **64.5seconds / 1935frames**, H.264 video with48kHz AAC audio; complete FFmpeg decode exited zero.
- Feedback changed only `cart-6`: complete narration/subtitles and a renderable sequence revealing/emphasizing `-1`, then `-2`. Sampled frames at55.5 and59.5seconds visibly showed the requested order. These frames do not establish continuous audiovisual or word alignment quality.
- Original movie, all four original author files and immutable request/source hashes stayed unchanged. Source claims were deeply equal. Guarded serialization changed object key order; an initial raw-JSON comparison false alarm was corrected to structural equality without changing data.
- Five unchanged scenes reused source-preview/asset caches and the same speech-generation identities. Only the changed scene rerendered and acquired a new recording identity.
- Stable edited and original preview pages, author history, exact plans, immutable exports and raw local session logs remain in the owned workspace. [Sanitized evidence](evidence/codex-redis-session-2026-11-05.json) records hashes and paths. No broad tests were run because implementation code was unchanged; the actual source/planning/speech/media/feedback chain and independent file/media checks were the necessary validation.

Local artifacts under this isolated checkout: `work/redis-ttl/workspace-preview.html` (edited), `work/redis-ttl/original-preview.html` (original), `work/redis-ttl/closing-v2` (guarded revision), and `work/session-check` (private logs and independent checks). To continue, open this engine checkout and owned workspace, verify `explanation workspace-status`, and give the current Agent ordinary feedback; do not refetch HEAD or overwrite the author history.

Facts, listening, continuous AV and final acceptance remain pending. Small source-diagram labels remain a visual limitation. This proves this real Codex/session/environment path for this pinned command-contract example, not arbitrary repository understanding, cross-device recovery or approved video quality. No separate paid API/provider, target-code execution, Judge, deployment or formal film was used.
