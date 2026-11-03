# Variable-beat repository presentations

A session author can turn a saved proposal into a continuous illustrated scene. The author chooses a supported module, binds proposal entities to its stable roles, supplies cited parameters, and places events in each beat. The program preserves all proposal beats and keeps their original order. The renderer consumes the authored data and compiled event trace.

```sh
pnpm gve project presentation-plan --id <project> --proposal <proposal-hash> --spec <plan.json> --data work/project
pnpm gve presentation status --task <plan-task> --kind plan --data work/project
pnpm gve presentation render --task <plan-task> --data work/project --mode silent
pnpm gve presentation status --task <preview-task> --data work/project
pnpm gve presentation export --task <preview-task> --data work/project --out work/review
```

Use `presentation export --kind plan` to inspect the committed editable plan and evidence before rendering. Preview export publishes the MP4, frame samples, captions, and editable input closure using receipt-v1. Keep the receipt digest and use an output directory you control. Status and export recheck the committed artifacts locally. Repeat the render command with the same plan and toolchain after a recoverable failure. A cached render retains its task identity and original bytes. A renderer environment change creates a new render task.

The [strict presentation contract](../src/contracts/presentation.ts) accepts a single scene with 1–20 authored beats, 24 fps, and a total of at most 60 seconds. A beat is at least one second. Supply `schemaVersion: "1.0"`, `kind: "session-presentation-plan"`, the saved proposal's hash, `binding`, and `authoringRequestId`, and the caller's declared `authorship.kind`. Each `beats` item contains `beatId`, `frames`, and ordered `events`. Events specify a `kind`, frame offset `atFrame`, and the relevant proposal `claimIds`. Beats may hold the prior scene state with an empty `events` array. The proposal's beat purpose becomes the visible title. The original narration stays in the editable artifacts and supplies escaped, whitespace-normalized WebVTT cues at authored times.

| Module | State and parameter limits |
| --- | --- |
| `http-exchange/1` | An illustrative listener, request, handler and response with stable proposal entity IDs. The author supplies a port, method, path and response body. Events proceed through `listen`, `request`, `match`, and `respond`. |
| `image-output-choice/1` | One illustrative subject that persists across input, cutout and mask. The author supplies two command strings for display and an asset reference. Use `show-input`, explicit `select-cutout` or `select-mask`, then the corresponding `show-cutout` or `show-mask`. `compare` requires both outputs to have been shown. |

Both modules start with `initialState: "ready"`. All role IDs come from the proposal. Each parameter has a `value` and an `evidence` object with a documented proposal `claimId` and zero-based `citationIndex`. The corresponding full source reference is committed in `trace.json`. The image module uses the bundled `paper-bird/1` illustration with SHA-256 `1ecf28d75d12af4e3d0c5eb8b23a99d1576fbf0a59885ef5484ff8bce9a7e690` and `basis: "illustrative"`. Its `claimId` must be cited by a visual beat. Source code and command strings remain text. The renderer never uses them as executable code.

Event legality, source bytes, claim references, parameters, and asset identity are checked before rendering. A structurally cited value may still misinterpret its source. Independent factual, editorial, and audiovisual review remain pending. Unsupported mechanisms such as queueing retain the separate authored proposal. They receive an explicit refusal when the selected module cannot represent them.

Each edit creates a new plan identity. Submit a new proposal revision first when changing the narration, entity labels, claims or beat count. Timing and event-only edits can reuse the same proposal. Old plan and preview IDs remain readable. The original three-beat mapping, Story, and scalar workflows keep their versioned readers. This presentation path renders silent illustrated previews and does not claim recorded speech, execution results, or five-minute rendering.
