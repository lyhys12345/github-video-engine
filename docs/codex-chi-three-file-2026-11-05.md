# Fresh Codex: three-file chi branch preview

A new real Codex session in an isolated checkout at engine `eb28928` received an ordinary `https://github.com/go-chi/chi` task, with a35–45second preference and a requirement to use at least three fixed source files and distinguish facts, teaching assumptions and unrun effects. No skill name, author JSON or additional model steering was supplied. Normal `codex --approve-for-me exec` used existing ChatGPT sign-in and retained normal permissions/configuration.

The model automatically selected/read `github-explainer` and fixed commit `9f8adb1aabaa8a91180a821111d3f8e668d1c0bf`. All three code files contributed actual citations:

| Pinned file | Scoped contribution |
| --- | --- |
| [context.go](https://github.com/go-chi/chi/blob/9f8adb1aabaa8a91180a821111d3f8e668d1c0bf/context.go) | Defines and resets the pooled route context's method-mismatch state and allowed-method list. |
| [tree.go](https://github.com/go-chi/chi/blob/9f8adb1aabaa8a91180a821111d3f8e668d1c0bf/tree.go) | At a matching leaf, returns the method handler or records method-mismatch/allowed-method information. |
| [mux.go](https://github.com/go-chi/chi/blob/9f8adb1aabaa8a91180a821111d3f8e668d1c0bf/mux.go) | Acquires/resets context and dispatches the lookup result or error handler. |

The authored boundary matters: default error handlers can be overridden; an unknown method can enter the method-not-allowed handler before tree lookup; `/books` is a teaching assumption with only GET registered and default handlers, not an executed application. Middleware/mounting, pattern precedence and all other path/method combinations were not exhaustively analyzed or run. [Evidence](evidence/codex-chi-three-file-2026-11-05.json) records exact claim-to-file line ranges and the model's documented/inference classifications without treating them as final semantic approval.

The session authored six scenes, measured all local recordings, explicitly resolved a timing checkpoint and delivered a **43.3-second editable narrated preview**. Independent FFprobe and full FFmpeg decode verified43.3seconds/1299frames, H.264 video and48kHz AAC audio. Six complete original-speed recordings total39.56seconds. Five exported source copies (three Go files plus README/LICENSE) matched captured hashes. One deterministic repeat after the real model turn ended reused the same movie/task and every source/asset/voice cache; movie/source/request bytes stayed unchanged.

No general engine blocker required a code patch. Only this documentation/evidence changed; no broad unit suite or additional feedback was run. Raw actual session logs and verification data remain in `work/session-check`; the editable preview is `work/chi-405-zh/workspace-preview.html` with owning data in its author directory.

The work verifies this real Codex source→planning→speech→media path, not actual chi HTTP responses or universal routing correctness. Facts, full listening, word alignment, continuous audiovisual review and owner acceptance remain pending. No paid API, target code installation/execution, Judge, deployment or formal film occurred.
