# Fresh Codex: Litestream cross-file preview

A new real Codex session at engine `6208c73` received an ordinary URL task, without a skill name or author JSON:

```text
请把 https://github.com/benbjohnson/litestream 做成可编辑的中文有声短技术预览。优先速度：聚焦一个由两到三份固定源码文件能闭合说明的跨文件机制，控制在约四十五秒到一分钟；未运行的效果明确标注。
```

Normal `codex --approve-for-me exec` used existing ChatGPT sign-in and retained normal configuration/permissions. The model automatically selected/read the project skill, fixed commit `057d39564c75ebd67ba042410a7ffa05ad4c242d`, and authored five scenes with complete local Chinese recordings. It completed one **55-second editable technical preview**, with49.61seconds of original-speed narration. No operator author data or extra model steering was supplied. No feedback was added, prioritizing speed.

The actual additional code files were:

| Fixed source | Contribution to the scoped mechanism |
| --- | --- |
| [replica.go:248–256](https://github.com/benbjohnson/litestream/blob/057d39564c75ebd67ba042410a7ffa05ad4c242d/replica.go#L248-L256) | Opens the selected LTX file and passes its reader to the backend write method. |
| [file/replica_client.go:164–176](https://github.com/benbjohnson/litestream/blob/057d39564c75ebd67ba042410a7ffa05ad4c242d/file/replica_client.go#L164-L176) | Captures bytes consumed while reading the header, then composes that prefix with the remaining reader. |
| [same backend:184–237](https://github.com/benbjohnson/litestream/blob/057d39564c75ebd67ba042410a7ffa05ad4c242d/file/replica_client.go#L184-L237) | Temporary output, copy/sync, close/rename/directory-sync and modification-time assignment from the decoded header. |

This is the conditional **file-backend** path, not proof of backend selection/configuration elsewhere. README and LICENSE were also captured. Source diagrams use authored code/text representations through the existing document-flow adapter; they are not real LTX bytes, an executed Go stream or a backup/recovery test. File-system effects, failures/crash durability and standard-library implementation details were not separately tested.

Independent checks after the real model turn ended verified:

- Actual H.264/AAC movie:55seconds,1650frames,48kHz audio; full FFmpeg decode exited zero.
- All five scene recordings retained complete original-speed coverage; total49.61seconds.
- Four exported pinned source copies matched their captured SHA-256 identities.
- One deterministic CLI repeat reused the same narrated-preview task and every scene asset/source-preview/recording cache. Original movie/request/source bytes stayed unchanged. This repeat was an operator verification, not another authoring model call.

The initial restricted source fetch returned retryable `SOURCE_NETWORK`; the normal approved retry succeeded. There was no timing repair loop or engine defect requiring a code patch. Only documentation/evidence changed, so no broad unit regression was run. Actual source capture, planning, speech, rendering, decode and cache checks are retained in [sanitized evidence](evidence/codex-litestream-cross-file-2026-11-05.json); private logs and media remain in `work/session-check` and `work/lite-file`.

Open `work/lite-file/workspace-preview.html` from this trusted engine checkout to inspect the editable result. Facts, full listening, continuous audiovisual review and final owner acceptance remain pending. Source-diagram labels can be small. No paid API, target repository installation/execution, Judge, deployment or formal film occurred. This verifies the actual Codex workflow for this bounded two-file mechanism, not universal repository understanding or approved production quality.
