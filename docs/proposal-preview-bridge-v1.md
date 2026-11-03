# From a saved proposal to a short preview

Ask the session assistant to author a mapping for a saved proposal. The mapping chooses supported graph objects, storyboard roles, action intervals, and shot lengths. The program copies the proposal's narration, visual descriptions, selected claim text, and exact source citations. The proposal and mapping stay editable and versioned.

```sh
pnpm gve project adapt-proposal --id <project> --proposal <hash> --spec <mapping.json> --data work/project
pnpm gve story preview-render --task <assetTaskId> --data work/project --mode silent --presentation audience-v1
pnpm gve story preview-status --task <previewTaskId> --data work/project
pnpm gve story preview-export --task <previewTaskId> --data work/project --out work/review
```

The first command validates the saved proposal and mapping, commits the derived Story and asset pack, and returns both task IDs. Render prints its prospective task ID on stderr. Repeat the same commands after a recoverable failure. A successfully committed Story can be reused when asset planning is retried. Render can resume using the asset task alone. Renderer environment changes produce a new preview task. Receipt publication uses a fresh controlled destination or verifies an existing matching receipt. Keep the returned receipt digest. `story asset-export` also supports the mapped Story, with receipt publication as its default. Use these exports for the editable mapped materials.

The mapping contract is defined in [proposal-mapping.ts](../src/contracts/proposal-mapping.ts). Set `schemaVersion` to `1.0`, `kind` to `session-proposal-mapping`, and copy `proposalHash`, `binding`, and `authoringRequestId` from the persisted proposal and its receipt. Declare `authorship.kind` as `session-agent` or `human`. Choose one of the supported profiles below. Each graph object and actor binds to a proposal entity. Every operation binds its endpoints and claim IDs to a proposal mechanism. The three shots map every proposal beat in its original order. A shot names its `beatId`, `beat` role, `visualSeconds`, two entity-bound visual objects and one supported action. Its action cites the complete visual claim set for that beat. Reused visual IDs retain their proposal entity. The exported `editable/mapping.json` can be copied and edited for another run.

| Profile | What it can show |
| --- | --- |
| `audience-http-v1` | The supported JavaScript README example shape, with a numeric `app.listen` port, a short literal request path and method, and a short literal `res.send` body. The displayed request, port, and response must agree with both the pinned excerpt and the mapped entities. |
| `audience-rembg-outputs-v1` | An illustrated same-input comparison between the exact rembg single-file commands for background removal and mask-only output. Its bounded graph relates the input to the requested mask. The comparison does not assert a model architecture or a real pixel result. |

These profiles require three authored beats, 5–15 seconds, and 24 fps. The mapping parser accepts up to 200 kB, and a mapped proposal can be up to 300 kB in canonical form. Each selected claim statement and inference rationale must fit the Story limit of 240 characters. Quotes must fit 3,000 characters. If a proposal cannot be represented without losing authored content, revise the proposal explicitly and submit the new revision. The prior proposal stays addressable. Queueing and other unsupported mechanisms remain available as proposals.

The Story task commits the exact proposal and mapping, source bytes and derived Story. The asset task rechecks that closure and commits the same proposal and mapping, the compiled assets and the explicit empty voice handoff. Preview reads the committed asset task and preserves both upstream hashes. The receipt export includes the proposal, mapping, Story, animation, sources, samples, captions and MP4. Changing a mapping or proposal produces new task identities. Previously completed tasks remain readable. A new adaptation checks that the proposal's evidence is current before planning and between stages. If the current source changes while planning, the command reports staleness and any already committed intermediate remains available as pinned history.

Mapped previews are explicitly silent. Their captions are estimated editorial timing, and all independent semantic, editorial and audiovisual review stays pending. The local renderer does not execute target repositories, call a model, or consume a paid service.
