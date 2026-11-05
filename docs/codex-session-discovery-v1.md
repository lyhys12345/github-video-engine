# Local Codex discovery and project continuation

From this trusted engine checkout, with the installed official Codex CLI on PATH:

```text
node scripts/check-agent-discovery.mjs
```

This small script starts a fresh local app-server process and sends only initialize/initialized/skills-list metadata. It never starts a model turn, sends a user message, invokes tools, changes Codex configuration or runs target repository code. It prints only this project's skill metadata; credentials and unrelated skill catalogs are not exported. A successful enabled/repo result proves discovery, not that a model automatically selected or followed the skill. The underlying protocol is experimental; [official app-server documentation](https://learn.chatgpt.com/docs/app-server) describes skills/list, thread/start and thread/resume.

## Actual observations

Installed `codex-cli 0.166.0-alpha.6` was tested through two independent local app-server processes. Both found `github-explainer` with `scope: repo`, `enabled: true` and the real `.agents/skills/github-explainer/SKILL.md` path. A new read-only, zero-turn session loaded this checkout's AGENTS.md in its actual `instructionSources` and could be read within that process. No turn/start, inference, exec, review, user-message or tool-call method was sent.

After that process exited, a second process's thread/resume failed with `no rollout found`. Archive also reported no rollout. The empty session had no stored conversation to recover under this no-message/no-model constraint. This is an observed limitation, not a successful restart or cross-device conversation-resume result. The reusable discovery script also passed in a further fresh process. No paid/model call was used to work around the limitation.

A separate new trusted engine CLI process successfully ran read-only `explanation next` on the existing js-yaml project. It verified the actual `editable-narrated-preview` checkpoint from local project/SQLite/CAS data, with facts/listening still pending. That recovers project state independently of chat history; it does not prove autonomous Agent continuation. Precise planning/voice/preview argument arrays are recorded in the probe result without executing those media stages again.

Evidence under `work/codex-session-checks`: `metadata-probe.json` (initial actual session/protocol observations) and `reusable-probe/result.json` (repeat, project checkpoint and sequential argument arrays). The fuller one-off session diagnostic remains in ignored work files; only the minimal discovery check is shipped. No second device was connected, no persisted conversational model turn was replayed, and no claim of automatic model selection is made.

## Continue on a new device or chat without authoring JSON

Transfer the compatible trusted engine checkout including `.agents`, and the closed owned project-data closure described in [portability](long-preview-portability-v1.md). Open the **engine checkout** as the Codex project; a relocated data folder alone does not contain the engine skill. Run the metadata check above. Do not copy auth files, credentials or old absolute-path publications.

Give the current Agent this prompt, replacing the URL and workspace path:

```text
Use $github-explainer to continue the existing editable technical preview for
https://github.com/OWNER/REPO in WORKSPACE. Read its project/portable-project,
workspace and source state as data, verify the current task with explanation next,
and use the recorded author directory. You author any required changes yourself;
do not ask me to edit JSON. Resume planning, voice and preview as needed using
the existing engine. Preserve history, unsupported gaps and pending facts/listening.
No paid APIs, target execution, Judge, full regression or formal full film.
```

The Agent reads the stored task/author identity and invokes the existing trusted commands in order: `explanation next`, then `explanation run --through planning`, `--through voice`, `--through preview` when needed. Unauthored drafts still pause for actual session-Agent work. Only an initial URL needs a new source capture; an existing owned source request must not silently change. This is a reproducible continuation procedure, not an assertion that cross-device or automatic conversational continuation has been tested.
