# Express HTTP story and editable animation assets

The experimental Story contract can represent a request, matching handler, and response. Use the `http-request`, `route-handler`, and `http-response` object kinds with `match-route` and `send-response` operations. Each operation needs an identified tool actor, evidence claims, and a connected chain when both operations appear. The fixed 18-second `explain` compiler has its own legacy operation set.

The Express example follows the documented root handler. The request and response cards are illustrative. The README was read at the pinned commit and its commands were never executed.

```sh
pnpm gve project intake --repo https://github.com/expressjs/express --ref 43fca52d28a422c8be48fd489cbd4f2d6152bab6 --id express-http --data work/http/state
pnpm gve project evidence --id express-http --data work/http/state --out work/http/evidence
pnpm gve project story --id express-http --spec examples/http-story-v1/express-story.json --root work/http/evidence/bundle --data work/http/state --out work/http/story
pnpm gve story asset-plan --task <story-task-id> --plan examples/http-story-v1/express-animation.json --voice examples/http-story-v1/express-voice.json --data work/http/state
pnpm gve story asset-status --task <asset-task-id> --data work/http/state
pnpm gve story asset-export --task <asset-task-id> --data work/http/state --out work/http/asset
```

Use the task ID returned by `project story` for `asset-plan`. This path reads the verified, committed Story and exact source bytes from local task state. The evidence workspace and authored Story file can be moved after that task completes. The asset task and export manifest record the Story task ID, graph hash, pinned repository and commit, and evidence fingerprint. An authored animation must cover each Story shot and bind its actions to the shot's claims. Edit `express-animation.json` to change its object labels or action timing and run `asset-plan` again to create a distinct task.

Open the exported `bundle/index.html` to see the diagnostic samples and their review links. `animation.json` and `portable-story.json` are editable inputs. `compiled.json` provides the sampled timeline, and `provenance.json` keeps the claims and exact source locations. The Express example supplies an empty voice binding, so all three shots retain estimated narration timing. The output includes nine static diagnostic SVG samples. Transfer arrows show the direction of the illustrated request, route match, and response. The last arrow moves right to left back toward the client. Diagnostic format 3 wraps the complete disclosure and keeps captions at their endpoint as the transfer token moves. Earlier stored packs retain their original layout. It has pending editorial review and includes no executed server result, recorded audio, or movie.
