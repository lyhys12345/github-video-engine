# Codex user path

Open the trusted **engine checkout**, with its installed engine dependencies and local media runtime, as the Codex project. Do not open the target repository as the working project. Sign in to the official Codex CLI with your ChatGPT account (`codex login`, then `codex login status`); no separate model API key is required for this path. Account eligibility, limits and current authentication options are governed by [official authentication documentation](https://learn.chatgpt.com/docs/auth?surface=cli).

In Codex, give an ordinary task:

```text
请把 https://github.com/OWNER/REPO 做成可编辑的中文有声技术预览。
```

No explicit skill invocation or author JSON is required. The project AGENTS.md selects the repository skill; the actual session Agent reads pinned sources, authors source-bound scripts/animation, measures speech, handles timing, and continues to preview. The engine executor does not call an LLM. An `awaiting-session-agent` capture is an intermediate checkpoint, not a completed preview. Historical engineering reviews and continuation handoffs are not prerequisites for a new URL.

The equivalent CLI entry from this checkout is:

```text
codex --approve-for-me exec "请把 https://github.com/OWNER/REPO 做成可编辑的中文有声技术预览。"
```

The normal installed CLI configuration and sign-in apply. `--approve-for-me` uses the documented workspace-write sandbox with on-request automatic approval; it does not waive denials. Keep the installed Windows sandbox configuration. Do not add `--ignore-user-config` as a troubleshooting shortcut: configuration can contain the required sandbox backend and approval settings. Verify ChatGPT authentication before running if API billing is prohibited; do not substitute API-key authentication or disable policy/sandbox checks. For a continuing CLI session, use the actual returned session ID and the same approval mode:

```text
codex --approve-for-me exec resume SESSION_ID "例子太抽象，请把输入和结果说清楚，画面先显示输入，再出现结果。"
```

The Agent should interpret feedback, export verified feedback context, author an explicit modification plan and run the guarded [feedback workflow](narrative-feedback-plan-v1.md). It preserves source claims and old versions. A chat alone is not portable project state; retain the owned workspace and follow [portability](long-preview-portability-v1.md).

## Actual fresh-session check, 2026-11-05

Installed `codex-cli 0.166.0-alpha.6`, signed in with ChatGPT, received only this ordinary prompt: `请把 https://github.com/lukeed/clsx 做成可编辑的中文有声技术预览。` No skill name, author files or task-specific developer prompt was supplied. Two real model sessions independently announced selecting `github-explainer`. This is actual model selection evidence beyond the earlier metadata-only [discovery probe](codex-session-discovery-v1.md).

Both sessions then failed to read `.agents/skills/github-explainer/SKILL.md`: the environment rejected the tool command with `blocked by policy`. The second used documented `--no-daemon` while retaining `workspace-write`; the denial persisted. The model's own description of a read-only workspace was not independently confirmed as the cause; the directly observed failure is the command-policy denial. One ordinary feedback sentence was sent to the first real session, but without a completed source/author/media checkpoint, this cannot establish feedback application.

A separately labelled operator control ran only the trusted engine's public GitHub capture. The initial sandboxed network call failed with retryable `SOURCE_NETWORK`; the authorized network-enabled run succeeded at `awaiting-session-agent`, pinning clsx commit `925494cf31bcd97d3337aacd34e659e80cae7fe2`. It was **not** performed by the fresh model session and does not establish automatic authoring or preview completion.

No policy bypass, target installation/execution, paid model API, Judge or formal film was used. No preview or feedback media was produced by these blocked sessions. Speech, animation and media generation remain unverified for this fresh-session path. Existing engine/media tests on other projects do not close this gap. A supported read/write Codex environment permitting trusted local commands and read-only GitHub network access is needed for the next end-to-end retest. Do not weaken policy as an automatic recovery.

Sanitized observations and hashes of private local logs: [evidence](evidence/codex-user-path-2026-11-05.json). Raw logs remain under ignored `work/codex-user-validation`; they can include unrelated connector inventories and are intentionally not published.

## Permission diagnosis and normal recovery

A later isolated check on the same installed CLI used normal user configuration and `codex --approve-for-me exec`. A new real model session read the first line of AGENTS.md and wrote it to an owned workspace file; its command exited zero. No policy file, account setting, environment security variable or sandbox enforcement was changed. The official [approval documentation](https://learn.chatgpt.com/docs/agent-approvals-security) describes automatic approval at the existing boundary; approval is not a guarantee that an action will be allowed.

Read-only inspection of the **two diagnostic sessions' actual permission metadata** established this difference:

| Session | Effective filesystem permission | Approval mode | Observed result |
| --- | --- | --- | --- |
| Earlier ordinary-URL session | Root read only; no workspace write entry | `never` | Local read command rejected by policy |
| Normal configuration + `--approve-for-me` | Root read plus owned checkout/tmp writes; protected metadata stays read only | `on-request` | Local read and owned-file write succeeded |

The earlier CLI text included `--sandbox workspace-write`, but that was not its recorded effective permission. `codex doctor --json` in the successful configuration reported a restricted filesystem/network, Windows `elevated` sandbox backend, and sandbox provisioning complete. Applicable user rules contained no explicit forbidden decisions. Startup requirements inspection found no returned requirements. These observations locate the failure at the effective runtime permissions/approval boundary, rather than a missing engine skill or a target repository error. They do not prove the unique internal cause of the permission downgrade or a CLI defect.

A proposed single-variable repetition of `--ignore-user-config` was rejected by automatic approval because skipping user configuration could bypass its safety rules. The repetition was **not run**, and no indirect workaround was attempted. Therefore the separate effects of that flag and the earlier approval defaults remain unisolated. Use the verified normal path above; never respond to a denial by ignoring rules/configuration or selecting unrestricted access.

## Actual URL and feedback continuation after recovery

With that normal configuration, a new real Codex session received only the ordinary clsx URL prompt above. It automatically read the skill, captured a fixed public commit, expanded to `src/index.js` and `src/lite.js`, authored seven chapters, measured local Chinese narration, fixed its own caption/timing checkpoints and produced editable narrated media. The first physical movie was 100.5 seconds/3015 frames; the session then corrected an input-number wording boundary and delivered 101 seconds/3030 frames. Both were independently fully decoded with FFmpeg and checked with FFprobe (H.264 video/AAC audio). This was actual model authoring and tool execution, not replayed author data or a deterministic executor pretending to be an LLM.

A priority reminder plus ordinary array-example feedback was queued while the session was finishing; queue acceptance alone was not treated as delivery. After the first turn ended, the same session was explicitly resumed with that feedback. Thus the initial URL reached a preview without supplied author JSON or explicit skill instruction, but the entire experiment was not free of human/validation-operator intervention.

The feedback turn produced a 101-second version with simpler array narration and input appearing before the result. The guarded feedback helper refused the original segmented captions with `NARRATIVE_AUTHOR_REVISION`. The session transparently authored an explicit fork, fresh caption partition and supported animation changes, recording the refusal and fallback in `array-feedback/feedback-report.json`. **This is a successful session-Agent fallback, not a successful `feedback-apply` execution or automatic subtitle repartition.** Supporting segmented-caption plans directly remains a workflow limitation.

Independent physical verification decoded the changed movie and confirmed old author/movie hashes were unchanged. The result reused the six unchanged scenes' assets and source previews; the array scene rerendered. The session's separate change report checked source claims and unchanged scene recordings, and exported before/after frames showed input alone followed by input plus result. Only these targeted actual checks were run; no production code changed or broad test suite ran.

All three versions, source packet, author history and private session logs remain under the owned `work/clsx-cn` and `work/policy-diagnostic` directories. Fact review, full listening, continuous audiovisual review and owner acceptance remain pending; code-node labels are small in the current visual style. No target repository code ran, and no Judge, paid API or formal film was used. [Permission, media and feedback evidence](evidence/codex-policy-diagnostic-2026-11-05.json) records task IDs, metrics and private-log hashes separately from the earlier blocked observation.
