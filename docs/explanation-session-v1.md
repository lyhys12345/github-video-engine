# Repository explanation session 1.0

The explanation session coordinates a silent technical preview. A session agent reads the pinned source packet, authors the proposal and then authors the presentation plan. The CLI validates, records and executes those stages.

```text
pnpm gve explanation start --spec request.json --data STATE --out PACKET
pnpm gve explanation proposal --task START --spec submission.json --data STATE
pnpm gve explanation render --task PROPOSAL --spec plan.json --data STATE
pnpm gve explanation status --task CHECKPOINT --data STATE
pnpm gve explanation resume --task CHECKPOINT --data STATE
pnpm gve explanation export --task CHECKPOINT --data STATE --out OUTPUT
```

A request has schema version `explanation-session-request/1.0`, a public GitHub root `repository`, `audience`, `language` (`en-US` or `zh-CN`), integer `maxSeconds` (1–300), and explicit `voiceMode: "silent"`. Optional `ref` defaults to HEAD and optional `documents` selects bounded repository text paths through the existing intake rules. Once a request succeeds, the session uses its captured commit on replay. For a different source revision, submit an explicit new ref. Language guides the author. The engine does not infer language or translate the renderer's built-in UI labels.

A proposal submission has schema version `explanation-session-author/1.0`, the returned `sessionTaskId`, `snapshotHash`, `authoringRequestId`, the requested `language`, and `authorship: "session-agent"`. A `disposition: "proposal"` includes a complete `proposal`. Its exact stored proposal hash is returned only after validation. Use that hash and the exact source binding in the authored `session-presentation-plan` passed to `render`.

`work-package.json` in the start command's returned bundle contains the session-specific command, evidence pointers, strict submission schema and prefilled drafts. Copy a draft outside the bundle and complete it before submission. The command takes the same state directory used for start. The `explanation-author-packet/1.0` profile gives newly started sessions their own task IDs. Earlier checkpoints retain their original packet bytes and remain readable.

`unsupported` and `needs-evidence` are author-declared outcomes. Both include `reason` with a bounded `detail` and exact `citations` into the pinned source. The code is `unsupported-mechanism` or `unsupported-operations` for unsupported and `insufficient-pinned-evidence` for needs evidence. Unsupported includes the authored proposal. Needs evidence can stop before proposal. These outcomes publish editable evidence and an explicit reason. Invalid JSON, schema, source references or plans are execution errors that can be revised.

The session can record a gap against its pinned source. To gather additional documents, start a new request with `documents`. Set the previous commit as `ref` to retain that revision.

The render checkpoint binds the accepted proposal, exact authored plan, child plan and renderer environment. The requested limit is enforced against the compiled and verified video frame counts. Status and export verify completed stages and their parent artifacts. Resume uses retained inputs for recoverable work. Output directories must be separate from the data root and use receipt publication. All artifacts retain their caller-declared authorship and pending review labels.

The CLI uses public GitHub read-only intake and existing local rendering. Repository text is untrusted evidence. Automatic use-case selection, arbitrary renderer generation, paid services and final production are outside this interface.

## Huihui technical preview

Use `explanation-session-request/1.1` with `language: "zh-CN"` and `voiceMode: "windows-winrt-huihui"`. An accepted proposal enters `awaiting-voice`. Write one Chinese narration line of at most 120 Unicode code points per beat, across up to 20 beats. The installed Windows WinRT Huihui voice synthesizes the exact text from the accepted proposal. If the voice is unavailable, the command reports the error. The engine sends no explicit provider request for this mode. Windows speech subsystem network behavior has not been audited.

```text
pnpm gve explanation voice-prepare --task AUTHOR --data STATE
pnpm gve explanation narrated-render --task VOICE_PREPARATION --spec narrated.json --data STATE
```

`voice-prepare` records each source WAV, its verified generation and import receipt, and the actual decoded 48 kHz sample count. Its JSON returns `voicePreparationManifestSha256`, `minFrames` per beat at 24 fps, and the next command. Use these measurements to author the plan and each offset. `narrated.json` has schema version `explanation-narrated-render/1.0`, the exact `voicePreparationManifestSha256`, an authored presentation `plan`, and an ordered `offsets` array of `{beatId, startOffsetFrames}`. The start packet includes the full schema. The allowed duration is at most the requested `maxSeconds` and the plan version's limit. A clip that does not fit yields a beat-specific error so the author can revise. The engine keeps the original words, playback rate and timeline.

By default each clip uses one caption and the existing weighted-length limit. To author multiple cues, add `captions` to every offset with the exact code-point and relative 48 kHz sample ranges described in the existing presentation voice bindings 1.1 contract. These cues have caller-declared timing. Semantic, editorial, speech alignment and owner listening remain pending.

New Huihui renders use the `presentation-ui-zh-cn/1` visual profile. Author short Chinese headings in proposal beat `purpose` fields and Chinese labels for the entities used by the plan, including queue lanes and tasks. Keep source-backed identifiers, code, command arguments and payloads in the existing plan parameters. The fixed renderer supplies Chinese notice and state labels. It validates editable text against the pinned Noto Sans SC font and available display width. A missing glyph, overly wide label or missing Chinese prose yields a field-specific error. Queue task cards use separate 26 px and 22 px lines for the task label and state on the 720 px canvas. This profile preserves the event trace, narration and caption timing.

Status, resume and receipt export use the same explanation commands. Resume by the checkpoint ID printed on stderr after cancellation or interruption. Completed exports verify the pinned authoring, generation, imports, voice ledger and media offline. The narrated export retains editable plan/proposal, exact source recordings, VTT and reference PCM alongside the H.264/AAC technical preview.
