# Claude Code project entry

Open this trusted engine checkout as the Claude Code working project, with its existing Node dependencies and local media runtime. The checked-in `CLAUDE.md` imports shared project instructions; `.claude/skills/github-explainer/SKILL.md` routes to the maintained `.agents` workflow. This avoids a second copy of the production procedure. The [official memory documentation](https://code.claude.com/docs/en/memory#import-additional-files) documents relative `@` imports, and the [official skills documentation](https://code.claude.com/docs/en/skills) documents project skills and task-based invocation. These mechanisms support this layout; they do not prove this particular model will select and finish it.

On a machine already authorized for Claude Code, inspect `claude --version` and `claude auth status` locally first. Confirm the existing authorized subscription/account mode; do not switch to API-key/Console billing when paid APIs are prohibited. Do not export credentials. The [official CLI reference](https://code.claude.com/docs/en/cli-reference) documents authentication status and interactive sessions. Installation, registration and login are not performed by this project.

From the engine checkout, start normal interactive Claude Code with ordinary permissions:

```text
claude "请把 https://github.com/OWNER/REPO 做成可编辑的中文有声技术预览。"
```

Approve permitted trusted local tools/read-only GitHub requests through the normal permission mechanism. Do not disable permissions, bypass a denial or pre-approve target code. The current Claude session reads pinned sources, authors the JSON and continues through planning, measured narration and editable preview. `awaiting-session-agent` is an authorship checkpoint, not a completed video. The user supplies no JSON. In the same session, ordinary feedback such as “把数组例子说得更直白，画面先输入后结果” should use the shared explicit modification-plan workflow, preserving old versions and pending review.

## Verified locally on 2026-11-05

`claude` was unavailable on the normal host PATH; three conventional native/npm/WinGet executable locations were also absent. No login state was inspected or inferred. No Claude model session, automatic skill selection, media generation or feedback execution was tested. Nothing was installed, registered or billed to work around that blocker.

The following executable check passed:

```text
node scripts/check-agent-entrypoints.mjs
```

It verifies real local files, canonical routing, shared imports, skill metadata and linked workflow references. It starts no CLI/model, does not parse account settings and grants no tool permissions. Syntax and diff checks also passed.

A separately labelled **trusted-engine operator control**, not Claude, captured `https://github.com/sindresorhus/escape-string-regexp` at fixed commit `a7f7dabaf336bda98d2166848af15d9168b10bcf`. It reached `awaiting-session-agent` with `modelCalls: 0`; target code was not executed. This checks the shared engine entry only. [Evidence and local-log hashes](evidence/claude-entry-2026-11-05.json) retain the distinction.

The remaining acceptance step is a real new Claude Code session receiving only an ordinary URL task, then a normal feedback turn, on an already authorized machine. Verify physical media, source/caption/audio coverage, old versions and cache reuse there. Current support is **checked project-entry compatibility; Claude end-to-end execution unverified**. Existing Codex results are separate and do not establish Claude behavior. No Judge, paid API, target execution, formal film or segmented-caption implementation changes were made here.
