# Independent architecture / evidence / content-facts review

Candidate SHA-256: `d373039aedeff5bfa604a31a84cea2f0ecbe6d3a2ea1fc81cc6a341c9325a49a`.

**Architecture and evidence: PASS within tested scope. Content-facts: PASS with one minor metadata wording finding. No blocking or major issue found.** This validates a bounded installed-Huihui technical route and retained provenance, not Chen identity, naturalness, transcription accuracy, word-level alignment, or owner listening acceptance.

## Identity and independence

All **425 declared files** independently match sizes/hashes. ZIP SHA is `f832e675690d69e26a6846108df2143c6451d9971150b72d7b514f5f85928c93`. All **591 source files** match Git base `5ade51ad36c126e0bd64fc86c267e6c623c25498` plus the **12 declared changes** (10 modified files, 2 additions). Reviewed OPERATOR, actual provider/worker, TTS integration, presentation integration, process/environment change and task-accounting diff. No other judge report or builder verification script/result was relied on. Tests ran in this directory's extracted source and copied state. Frozen files were not modified, and no target Express/rembg code or paid provider was executed.

## Architecture, identity and closure

The generation input admits only exact one-line text with at least one Han character, at most 120 Unicode code points, and no control/line-separator characters. Alternate voices, reference audio, credentials and SSML controls are not accepted by the request schema. The worker calls plain-text WinRT synthesis, selects the exact installed Huihui OneCore token plus `zh-CN`, and has no fallback. Its output voice metadata must exactly match that fixed selection.

Generation task identity binds schema, provider, exact unnormalized text, full voice token, language, worker SHA-256, Windows release and architecture. `readTask` rechecks the task fingerprint; the generation reader checks both CAS artifacts, task fingerprints, WAV layout/content bounds, and a complete canonical manifest reconstruction. Audio content is hashed after actual synthesis. Installed voice defaults are used; the identity is not a cryptographic version of all Windows voice engine files, nor a guarantee of deterministic synthesis across installations or changes to system components.

WAV checks require exact bounded RIFF/fmt/data layout, 16 kHz mono 16-bit PCM, correct byte/sample geometry, a nonzero sample, at most 30 seconds and 2 MB. The worker checks stream size before byte allocation. Worker timeout is 30 seconds and task timeout 45 seconds; explicit retry is bounded to three attempts. No truncation/retiming path was introduced. Generation uses local TaskRunner accounting separately from the existing held remote-TTS reservation system. A zero local provider fee is not an assertion about all machine costs or Windows network behavior.

The dedicated `local-import-huihui-v1` receipt derives text, fixed voice label and WAV digest from the verified generation and binds its task/manifest hashes. It cannot accept a caller override of those fields. `readLocalTts` verifies the parent again; presentation clip loading goes through that reader and exports the exact generation manifest beside original audio/receipt. The original remote and ordinary local-import interfaces/identities remain separate; legacy local imports still require their exact legacy canonical adapter input. A failed local import can remain held under the existing TTS reservation semantics; this review does not claim automatic replay of that import phase.

The native process helper's default environment behavior is unchanged. Only the new worker opts into `inheritEnv:false`, receiving a minimal Windows environment and owned temp directory. The implementation uses fixed trusted PowerShell code and JSON input, not target-repository scripts or reference-audio model loading. The adapter makes no explicit remote API request; the Windows subsystem's network activity was not independently audited. No absolute offline/privacy guarantee is made.

## Actual independent synthesis and media checks

This reviewer actually called `generateHuihui` in a fresh judge state for:

> 示例监听三千端口。请求根路径时，处理器返回问候。

The first result was **not cached**. It produced task `cdcdf401610d1d9c6b31ae4cf5485f4e9afb11c1ab3105234d149d6d9731b793`, a **229,646-byte**, **114,800-sample / 7.175-second** 16 kHz mono WAV. SHA `f8e64f10778b1058815ea68e0261c7638c08c9746e41d8087ce2162e74a882dc` matches the frozen sample in this execution. Repeating with an invalid Windows runtime path returned a verified cache hit, establishing that successful cache reuse did not launch the worker. This single matching fresh result does not promise byte determinism for other texts/runs.

Independently full-decoded the original WAV and actual **216-frame / 9-second** preview MP4 `a1a6dd73a3effccd1140a50dc3bdbb5469cbe65e9156ddebd54f063e01b2887e`. Independently resampled the original recording: **344,400 samples** at 48 kHz, hash `d399b47f015706b6a1abdabcd9d4ba96bbe23660e16dd596470fc59c5119a9d4`, exactly matching the retained clip. Rebuilt all **864,000 bytes** of the preview PCM: SHA `d43331cc2115b0cace79b9f2465b6702532fa3c289657b514ef46f1196361a6d`. Independent AAC encoding matches the entire extracted ADTS stream: **95,261 bytes**, SHA `b408337dc35f83c4f97f519ac13e612790333db814e7e15a8f01bf5f928692c4`.

The original clip is placed at samples `[14000,358400)`, without speed change or clipping. Caption frame interval is `[7,180)`; VTT outward rounding is `00:00:00.291 --> 00:00:07.467`. Exact text/digests agree across generation manifest, import receipt, proposal, voice binding/ledger and VTT. This is clip-level timing and declared text binding, not ASR or word timing verification. Viewed actual extracted frame 100: Chinese subtitle/title are present and the scene retains “Local voice · Illustration · No observed execution.” Continuous viewing and listening were not performed.

## Source facts and one minor finding

The Chinese technical example binds retained Express commit `43fca52d28a422c8be48fd489cbd4f2d6152bab6`, snapshot `4f3d291c9f759f66dad3dd91964ff51fef5923b0069c13dd0cb185a1362d9ce8`, evidence `94a066cb6a155615a652b7cd10fa950abd811a0bc2c14f40fdb4ffc497706a58`. Independently checked exact captured README hash `3cf5f3e224dbb9b5e2bc0ac255871de453762ae7a277f868da5f4a69d6ff2509` and quotation line ranges. The source examples support port 3000, GET root-path handler and `Hello World` response. The narration is a bounded description of that example, not a measured request or actual target execution. No fresh GitHub fetch was performed.

**Minor:** `editable/proposal.json` contains `useCase.exclusions[1] = "English technical audio fixture. Visuals are illustrative."` although this new example's text and installed voice are Chinese Huihui. The second sentence remains accurate; the first is stale copied metadata. Correct it in a new authored revision, retaining this frozen artifact and its hashes. The exact voice identity in generation/receipt is correct and there is no Chen claim, so this does not break the technical closure.

## Independent positive/negative and compatibility tests

With media tools disabled, verified retained generation status/export/repeated export; cached import; full new presentation read/cached resume/exact 34-file export. Parent generation manifest bytes in the preview match the original manifest. Three historical narrated previews remain readable and resumable, including old Express `19c33…` with `voice-ledger-1.0-early-event-trace`, old rembg `b5d578…`, and later Express `cc063…`.

**13 refusal checks passed:** corrupt parent manifest and parent WAV each block generation, import-status and preview (6); separately appended hash-consistent TTS request/receipt fixtures with altered text, wrong parent-manifest hash or false Chen label fail parent verification (3); reference audio, alternate voice, multiline text and 121-code-point text fail admission before state creation (4). Mutated CAS bytes were restored in finally blocks. All **34 original task JSON rows** and preexisting artifact bytes remain unchanged. Fixtures were new records only, never edits to successful historical rows.

Independently ran TypeScript checking plus affected presentation/TTS/usage/operations suites: **64/64 pass**. These include old remote reservation behavior with mocked transports; no real remote calls occurred. The reported full 413-test default suite was not rerun or adopted as this judge's result.

This judge did not independently repeat the builder's live cancellation/process-exit cleanup or child-secret-environment sentinel test. Those behaviors were source-reviewed, and ordinary process/accounting regression tests passed; the builder's stronger live observations are not claimed as independent executions here. Network isolation, voice naturalness, intelligibility, speaker similarity and owner approval remain unverified/pending. The technical checks do not promote those gates to PASS.

Raw evidence: identity.mjs/json/log; checks.mts/json/log and fresh-state/fresh-export; media.mjs/json/log and sample PNGs; typecheck.log; focused.log. All original candidate records remain intact.
