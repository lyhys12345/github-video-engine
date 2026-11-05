# Source-bound scene focus v1

Animation `1.4` / scene profile `multi-input-focus/1.0` adds authored camera/object emphasis to existing evidence graph `1.3`. It supports the existing two-input image/mask and ordered-page relations. It introduces no API operation, target execution, real pixel composition, real document contents, or semantic approval. Old animation `1.3` and all earlier profiles remain accepted.

Each shot retains `shotId`, `operationId`, `start`, `arrive`, `processed`, `end`, and adds one strict `focus`:

```json
{"schemaVersion":"scene-focus/1.0","kind":"inspect-input","objectId":"mask","start":0.08,"end":0.7}
```

- `inspect-input`: `objectId` must be one of this exact operation's two source inputs. The object moves and enlarges during the normalized focus interval. Other input identity remains visible. There are no processing signals and no generated output.
- `converge`: `{ "schemaVersion":"scene-focus/1.0", "kind":"converge" }`. Only this view runs the operation's four explicitly authored phase windows. No extra focus interval is permitted.
- `inspect-output`: the same bounded interval fields, but `objectId` must be the exact independent output. The camera moves toward an already-authored output illustration; this is an observation view, not a new processing/saving step. Ordered pages retain source colors/identities and the evidence-bound output order.

Intervals are editable fractions of the owning shot, must resolve to positive frame ranges, and change the source task/cache identity. They are author timing, not measured target latency. Inspection shots still retain valid operation phase fields for contract compatibility, but do not animate those phases. Only the focus interval controls their camera motion.

A complete-run animation can mix the new profile and old profiles in `narrative-scene-animations/1.0`. Existing exact scene order, source binding, claim coverage, same-source scene evidence overrides and no-separate-overlay rules apply. Unknown focus kinds, arbitrary text/geometry, wrong-role or unknown objects, missing claims and profile/version substitutions are rejected. All displayed focus labels/boundary copy are compiler data included in the pending execution facts packet; captions and original complete recordings remain separate bound inputs. Vocabulary/claim binding does not establish semantic entailment.

This does not license animating undocumented mechanisms. For example, PDF load/save text may be explained from its pinned source, with the limitation explicitly stated, or remain a gap; selecting a page focus does not simulate either implementation. Actual page content and correct pixel composition remain unverified.

## Actual local validation

Checkpoint baseline: `419470f` (source-bound evidence overrides / complete portable runs).

- TypeScript typecheck passed.
- `tests/multi-input-operation.test.ts`: 25 passed, including new focus state/renderer, invalid-object/interval/claim/text, per-scene normalization and overlay/profile rejection cases.
- `tests/narrative-scene-animations.test.ts`: 11 passed.
- `tests/narrative-scene-evidence.test.ts`: 11 passed.
- Total: 47 cases in one targeted invocation. No full regression or Judge.

Two real fixed-source local selected-reset narrated technical previews, using the previously controlled imported projects and original recordings:

| Project | Views | Movie | Original speech |
| --- | --- | --- | --- |
| rembg | question: inspect mask; compose: converge; ending: inspect cutout | 39.5 s / 1185 frames | 3 whole recordings / 33.865 s |
| pdf-lib | indices: inspect donor B page; mechanism: converge; closing: inspect ordered output | 46.733 s / 1402 frames | 3 whole recordings / 37.63 s |

Artifacts under `work/focus-checks/{rembg,pdf-lib}/`: `preview.html`, `result.json`, `verification.json`, `plan.json`, `spec.json`, each owning `*-story.json`, `*-animation.json`, selected early/late actual movie PNGs, plus editable exported preview bundles. These ignored artifacts are local evidence, not part of the commit. Recordings were compared byte-for-byte against the old long-preview PCM. Both actual AAC streams were non-silent; full video/audio decode, frame counts, complete captions, no audio spill, every evidence gap silent/visible, disclosed supported-scene omissions, fixed source hashes, current packet binding and cached identical repeat passed. Actual early/late frames were inspected for source-object focus and reserved top/caption areas. This is not phone or perceptual acceptance.

The rembg first assembly attempt correctly refused an old author adapter declaration after switching question/ending to the two-input graph. Only author data was corrected; all three finished sources were reused. Preserved failure: `work/focus-rembg-failed-adapter.log`. No production guard was weakened.

Editing proof: `focus.end` from .7 to .5 on the input-inspection shot creates a different actual rendered source. `edit-verification.json` records the new source and unchanged source-cache reuse. This narrow timing edit does not recompose another full voiced assembly; the separate voiced candidate above is fully decoded. Old complete long previews and author inputs are unchanged. These short selected candidates demonstrate the new capability; existing long projects are not automatically rewritten and their old repetitive views remain in historical versions.

All new visible labels, source identities and focus settings remain facts-pending. Listening, precise speech alignment, semantic source entailment, accurate pixel/PDF content, phone acceptance and final owner acceptance remain pending/unverified. No new speech/model calls, target execution, network source fetch, formal film, paid API, or Judge. Code changes invalidate older source-code-hash caches; cache reuse claims refer to repeated candidates within this implementation.

For actual unified-run complete long-story, single-scene editing and controlled portable validation, see [unified long focus validation](unified-focus-long-validation-v1.md).
