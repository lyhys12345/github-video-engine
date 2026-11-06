# Open-source comparison and local preview closure

Reference code was read as untrusted text at fixed commits, never installed, imported or executed. No Claude account or paid API is available or required for the checks below.

| Official reference | Observed pattern | Project decision |
| --- | --- | --- |
| [Anthropic skill template](https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/template/SKILL.md), commit `ca45fc496a3436251f191354091d557da31c15b5` | Minimal name/description metadata plus procedure body | Keep the existing thin Claude project skill and canonical shared workflow. Add only conditional local-resume guidance, not a duplicate procedure or permission pre-approval. |
| [OpenAI structured-output sample](https://github.com/openai/openai-node/blob/a523d74b7c82fc4379259eb2352a13ee400d8b4b/examples/responses/structured-outputs.ts), commit `a523d74b7c82fc4379259eb2352a13ee400d8b4b` | A declared schema and a separately consumed parsed result | Preserve the API call/validated-author boundary; make subsequent local production an explicit operation that cannot call the provider. The sample uses Responses API; our existing transport remains the narrower Chat Completions subset. |
| [OpenAI parser implementation](https://github.com/openai/openai-node/blob/a523d74b7c82fc4379259eb2352a13ee400d8b4b/src/lib/ResponsesParser.ts), same commit | Parsing is gated by completed-response state | Require a completed source-bound planning receipt and exact current candidate before local continuation. This durable checkpoint design is our application, not functionality claimed to exist in that SDK sample. |

The [Claude skill documentation](https://code.claude.com/docs/en/skills) and [project import documentation](https://code.claude.com/docs/en/memory#import-additional-files) support the checked-in `.claude/skills` and `CLAUDE.md` layout. They do not establish actual discovery or compliance on an unavailable Claude CLI. No SDK dependency or reference source was copied into the runtime.

## Implemented functional loop

`api-author` previously ended at planning and exposed a generic engine resume array. Retrying author generation to recover local rendering could create another charged request. The new `api-continue` accepts only an existing candidate, workspace and explicit `speech`/`preview` target. It has no config/key/enable input and makes no provider request.

It checks the completed API receipt, all four original author hashes, current source and author ownership, then reuses the engine's lock-time precondition. Changed/stale inputs fail closed. Local continuation appends its own history; it never rewrites the API receipt, switches candidates silently, grants review, adjusts timing or retries model generation. The Claude wrapper documents this same guarded path.

## Actual verification

- Nine localhost HTTP/CLI/unit checks passed, including altered author/source, invalid stage and unwanted API flags.
- The opt-in local-media test passed in about 57 seconds: synthetic fixed-source fixture → one localhost mock author response → server closed → local speech → editable preview → cache repeat.
- Physical output: **18 seconds, 540 frames, H.264 video and 48 kHz AAC audio**. FFprobe measurement matched the authored timeline; full FFmpeg decode exited zero.
- Three produced scenes have complete local recordings; two unsupported scenes remain silent visible placeholders. This is explicitly test content, not an evidence-backed explanation of the reference repositories.
- Repeated preview reused the narrated movie, every produced source preview/asset and recording cache. Source and original API-receipt hashes stayed unchanged; no test credential was persisted.
- A separate actual CLI `api-continue` repeat passed with cached media, `providerRequests: 0`, `keyRead: false` and no running mock server.
- TypeScript and static project-entry checks passed. No broad regression or Judge was started.

Reproduce with `node --import tsx --test tests/byo-api-preview.node.ts`, using the already installed trusted local media tools. Read [keyless continuation](byo-api-author-v1.md#keyless-local-continuation) for normal project commands. [Evidence](evidence/open-reference-local-preview-2026-11-05.json) includes fixed source URLs/hashes and actual test/media records.

Real Claude Code selection/execution, real-provider compatibility/inference/billing, audience quality, full listening and semantic/final owner acceptance remain unverified. The local mock supplies predetermined author JSON; it is not a substitute LLM or a demonstration of automatic repository understanding. API feedback generation and automatic timing repair are outside this change.
