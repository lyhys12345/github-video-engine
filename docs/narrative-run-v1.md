# Reusable URL-to-narrated-preview entry

Run from the trusted engine checkout:

```text
pnpm gve explanation run --repo https://github.com/OWNER/REPO --workspace <NEW_SHORT_DIRECTORY>
```

The first call captures actual public GitHub README/license bytes at a resolved commit, records the immutable request/source binding and returns `awaiting-session-agent` plus the complete author packet. It performs no model dispatch or invented interpretation. Fill the emitted data drafts in a separate author directory. Required files are `story.json`, `narrative.json`, `animation.json`, `document-card.json` and `run.json`; the packet's other declared JSON/text drafts may stay alongside them. Unknown files, executables, links and subdirectories are refused. All consumed content and all accepted author-file bytes are bound by exact SHA256 in an immutable candidate manifest.

```text
pnpm gve explanation run --repo https://github.com/OWNER/REPO --workspace <SAME_DIRECTORY> --author <AUTHOR_DATA_DIRECTORY> --through planning
pnpm gve explanation run --repo https://github.com/OWNER/REPO --workspace <SAME_DIRECTORY> --author <AUTHOR_DATA_DIRECTORY>
```

`--through planning|animation|voice|preview` returns after a real committed checkpoint. Repeat the same command to resume. The default is preview. For explicitly authored longer content, select run-author2.0/complete-technical-preview1.0 in run.json; see complete-technical-preview-v1.md. The old short profile remains unchanged. Existing TaskRunner/CAS verifies and reuses committed stages; a captured workspace does not silently refetch HEAD. A new source version/request needs a new workspace. Initial defaults are recorded Chinese/generic audience, at most60seconds of editorial intent, a silent source animation and the existing at-most30second narrated technical-excerpt profile. The default URL entry captures README/license. Optional --ref/--doc/--source-path now expose the existing1.2 bounded source-capture contract directly; source paths require a full fixed commit. See run-source-paths-and-mechanisms.md for the actual independent REA/rembg runs. Changed explicit source options require a new workspace.

## Actual Agent inputs

Read the source text, authoring-guide and existing schemas. The Agent must supply factual claims/quotes, complete five-role narration/visuals/ending, every supported or unresolved scene disposition, animation primitives, selected source-shot ranges, and full transcript caption partitions. Source and semantic approval remain pending. Nothing in run executes source-repository code or calls a language model.

Only designated structural fields may use these literal tokens:

- Supported narrative scene `storyTaskId: $STORY_TASK_ID`, `expectedGraphHash: $STORY_GRAPH_HASH`.
- Card `expectedParentPlanHash: $NARRATIVE_PLAN_HASH`, `expectedBindingHash: $BINDING_HASH`, `expectedOriginalSceneHash: $CLOSING_SCENE_HASH`.
- Run speech cue `endSample: $FULL_RECORDING_SAMPLES` binds the actual complete48kHz decoded recording length. Character ranges and any other sample positions are authored. This is a whole-recording cue, not verified word alignment.

The engine resolves those exact fields, never interpolates prose/code or fills meaning. `run.json` binds the exact `captureTaskId` and `bindingSha256`, declares generic/audience-v1 presentation, lists every complete narrative scene in original order with exact slices/placeholders, and lists full recording/caption partitions for every selected Story scene and the documented closing. It generates the exact Chinese scene scripts with free local Windows Huihui and imports their receipts. Original-speed full recordings must fit; mismatched text, missing speech, invalid glyph/cue layout, source binding or frame selection is refused. Evidence/unsupported placeholders remain visibly unproduced and silent.

## Editing, caching and history

Change an author data file and rerun. Exact byte changes create a new candidate/attempt; original inputs, outputs and failure records are preserved. Candidate directory display keys use shortened prefixes for Windows path compatibility, while immutable manifests bind the full author/code hashes and refuse collisions. Active-workspace locks reject concurrent writers; stale process locks are preserved under distinct names before reacquisition.

Tested: changing labels in two different animation scenes produces new source-animation and narrated-preview tasks and actual different MP4/packet hashes, while reusing unchanged Story, plan, card and all complete recordings. Story/narrative prose or timing edits must update their owning source-bound files and caption character ranges; changed speech requires a complete new exact recording. Unsupported operations/layouts are not accepted just because an author edited JSON. Final facts, listening, alignment, continuous AV and owner approval stay pending.

Keep workspace paths short on Windows: deeply nested paths can still hit underlying SQLite publication limits. An initial long-directory publication failure was retained; after shortening candidate display keys, the same committed Story/plan tasks resumed with cache hits. No forced mid-render process-kill recovery was tested.

## Actual new-directory Marked run

`work/reusable-run-checks/` records the complete entry: source-result.json (fresh actual URL capture then pause), agent-authorship.json, planning-recovered.json, current-complete.json, cached-result.json, edited-result.json, portable-result.json and verification.json. Both original and two-scene edited previews are22seconds/660frames with all five scenes, five exact original-speed speech clips, H264+AAC and burned safe-area captions. Both were fully decoded; original movie bytes remained intact, edited movie/current packet hashes changed, and PCM stayed unchanged because scripts did not change. With fetch disabled, every same-input stage and recording cache hit.

`work/reusable-marked-portable/` is a verified complete multi-scene editable project: source/owner/request, closed tasks.sqlite/tts.sqlite, regular CAS artifacts, author data and a directly viewable `preview/index.html`. During the test the original workspace was temporarily renamed out of the way, fetch was disabled, and the same run command in the new absolute path reused every exact bound task and reexported identical edited MP4 bytes. The original workspace was restored in finally. Do not copy historical runs/publication directories when relocating; copy the sufficient owned source/state/author closure and create fresh outputs, as this package does. It requires a compatible trusted engine checkout/dependencies; uncached new Chinese speech requires local Windows Huihui. It is not a standalone video editor application.

Three targeted entry tests plus TypeScript pass. This entry is a reusable deterministic executor around actual Agent authorship and existing media contracts. It does not establish automatic source understanding, arbitrary mechanism support, audience-ready visual design or90% readiness. No Judge, full regression, paid API, target execution, deployment or formal full film was run.

The complete experimental profile now supports whole authored multi-scene narratives up to300seconds with scene-level source caching; it has been physically verified at95seconds. See [complete technical preview](complete-technical-preview-v1.md) for exact scope, strict audio-fit recovery and remaining visual/review limits.
