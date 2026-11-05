# Codex user path

Open the trusted **engine checkout**, with its installed engine dependencies and local media runtime, as the Codex project. Do not open the target repository as the working project. Sign in to the official Codex CLI with your ChatGPT account (`codex login`, then `codex login status`); no separate model API key is required for this path. Account eligibility, limits and current authentication options are governed by [official authentication documentation](https://learn.chatgpt.com/docs/auth?surface=cli).

In Codex, give an ordinary task:

```text
请把 https://github.com/OWNER/REPO 做成可编辑的中文有声技术预览。
```

No explicit skill invocation or author JSON is required. The project AGENTS.md selects the repository skill; the actual session Agent reads pinned sources, authors source-bound scripts/animation, measures speech, handles timing, and continues to preview. The engine executor does not call an LLM. An `awaiting-session-agent` capture is an intermediate checkpoint, not a completed preview. Historical engineering reviews and continuation handoffs are not prerequisites for a new URL.

The equivalent CLI entry from this checkout is:

```text
codex exec --sandbox workspace-write "请把 https://github.com/OWNER/REPO 做成可编辑的中文有声技术预览。"
```

The normal installed CLI configuration and sign-in apply. Verify ChatGPT authentication before running if API billing is prohibited; do not substitute API-key authentication or disable policy/sandbox checks. For a continuing CLI session, use the actual returned session ID:

```text
codex exec resume SESSION_ID "例子太抽象，请把输入和结果说清楚，画面先显示输入，再出现结果。"
```

The Agent should interpret feedback, export verified feedback context, author an explicit modification plan and run the guarded [feedback workflow](narrative-feedback-plan-v1.md). It preserves source claims and old versions. A chat alone is not portable project state; retain the owned workspace and follow [portability](long-preview-portability-v1.md).

## Actual fresh-session check, 2026-11-05

Installed `codex-cli 0.166.0-alpha.6`, signed in with ChatGPT, received only this ordinary prompt: `请把 https://github.com/lukeed/clsx 做成可编辑的中文有声技术预览。` No skill name, author files or task-specific developer prompt was supplied. Two real model sessions independently announced selecting `github-explainer`. This is actual model selection evidence beyond the earlier metadata-only [discovery probe](codex-session-discovery-v1.md).

Both sessions then failed to read `.agents/skills/github-explainer/SKILL.md`: the environment rejected the tool command with `blocked by policy`. The second used documented `--no-daemon` while retaining `workspace-write`; the denial persisted. The model's own description of a read-only workspace was not independently confirmed as the cause; the directly observed failure is the command-policy denial. One ordinary feedback sentence was sent to the first real session, but without a completed source/author/media checkpoint, this cannot establish feedback application.

A separately labelled operator control ran only the trusted engine's public GitHub capture. The initial sandboxed network call failed with retryable `SOURCE_NETWORK`; the authorized network-enabled run succeeded at `awaiting-session-agent`, pinning clsx commit `925494cf31bcd97d3337aacd34e659e80cae7fe2`. It was **not** performed by the fresh model session and does not establish automatic authoring or preview completion.

No policy bypass, target installation/execution, paid model API, Judge or formal film was used. No preview or feedback media was produced by these blocked sessions. Speech, animation and media generation remain unverified for this fresh-session path. Existing engine/media tests on other projects do not close this gap. A supported read/write Codex environment permitting trusted local commands and read-only GitHub network access is needed for the next end-to-end retest. Do not weaken policy as an automatic recovery.

Sanitized observations and hashes of private local logs: [evidence](evidence/codex-user-path-2026-11-05.json). Raw logs remain under ignored `work/codex-user-validation`; they can include unrelated connector inventories and are intentionally not published.
