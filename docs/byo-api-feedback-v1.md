# BYO API feedback and local preview continuation

This explicit mode sends one ordinary feedback message plus the verified current source/scene/author context to the configured compatible provider. It requests a strict `planJson` envelope, validates its contents locally, then uses the existing guarded `feedback-apply` executor. It does not give the model tools, credentials, commands or review authority. Ordinary session-Agent feedback remains unchanged and never automatically calls this API path.

Use an existing owned project with unchanged current authors. Only after authorizing that provider, source transmission and possible spending, use the same non-secret [API configuration and budget](byo-api-author-v1.md):

```text
node --import tsx src/cli.ts explanation api-feedback --workspace work/demo --spec YOUR_NON_SECRET_CONFIG.json --feedback "开场说得更直接，并让传递动画更快。" --out work/demo/api-feedback-v1 --enable-api --through speech
```

The config must also contain `enabled: true`. Its key comes only from the configured process environment variable. Existing HTTPS/public-address, redirect, size, timeout, output-token and caller-declared estimated-budget restrictions apply. There is one provider request and no automatic repair/retry. Real billing can differ from the local estimate, and a failed request may still be charged. No API key is required for the local mock checks below.

The new `narrative-feedback-plan/1.1` requires `interpretedBy: api-model`; version1.0 remains the session-Agent format. Original feedback text, checkpoint/author/source hashes must match exactly. Existing scene/animation/narration guards and supported operations are enforced before creating the edited author candidate. Source claims cannot be changed. Segmented captions require explicit complete partitions from the author; no automatic word alignment or timing extension occurs. Provider output is untrusted even when it satisfies JSON schema.

A fresh `api-feedback-NAME` child reserves this one request. The original input context, plan, plan hash and sanitized API receipt are retained. Invalid model plans stop before edit execution and omit raw provider output. A successfully prepared plan remains `plan-ready` if later local tooling fails; it should be continued locally, never by repeating the API call. Existing output is refused before another request.

After speech is measured, continue without a key, config or enable flag:

```text
node --import tsx src/cli.ts explanation api-feedback-continue --workspace work/demo --out work/demo/api-feedback-v1 --through preview
```

The continuation checks the stored exact plan and reuses `feedback-apply`'s original/current-candidate fences. It issues **zero provider requests**, appends its own report, preserves old authors/media and returns the actual engine checkpoint. A completed identical retry performs zero edit/render actions. Timing/caption checkpoints remain incomplete until an explicit owning revision resolves them; no model is silently asked to repair the plan. Pending facts, listening and owner acceptance are not promoted.

## Actual local validation

```text
node --import tsx --test tests/byo-api-feedback-media.node.ts
```

With already installed trusted local media tools, this opt-in test uses synthetic captured source data and predetermined localhost HTTP responses. One mock request creates the baseline author; one separately authorized mock request interprets feedback. It produces an 18-second baseline and 18-second modified preview (540 frames, H.264/AAC), changes one scene's complete Chinese recording and renderable transfer animation, closes the mock server, and verifies local continuation/history/cache behavior. Full FFmpeg decode, subtitle transcript, unchanged source/claim/old-author/old-video hashes and unchanged-scene caches are checked. A separate real CLI continuation also returned zero actions and zero provider requests after completion.

Eighteen targeted unit/regression tests passed, including legacy feedback, hostile/stale/foreign plans, modified user text, invented claims, false provenance, executable fields, credential-bearing feedback and duplicate request refusal. TypeScript passed. [Evidence](evidence/byo-api-feedback-2026-11-05.json) preserves the distinction between actual localhost/media work and unperformed model verification.

No real Claude session, provider inference/key, paid API, target repository execution, Judge or formal film occurred. The mock does not establish language understanding, factual quality, provider compatibility or listening quality. API feedback currently supports only the existing produced single-shot scenes and animation adapters. It is not an autonomous multi-call agent or a guarantee that arbitrary feedback can be rendered.
