# Agent entry: GitHub URL to editable narrative preview

For the reusable single-command entry, use `explanation run --repo <URL> --workspace <NEW_SHORT_DIRECTORY>` and follow [run/resume/edit instructions](narrative-run-v1.md). It first pauses for real author data. The remaining commands below are the inspectable individual stages.

Give the agent a public GitHub URL and ask it to run this workflow. A human or session agent must interpret the source and author the story, complete plan, animation and subtitle partitions. The engine performs deterministic capture, binding, media generation, export and stale-input checks. `explanation next` never calls a model, runs its suggested commands, grants factual approval or dispatches Judge.

## Start from the URL

Create a request JSON using the actual URL, audience and language:

```json
{"schemaVersion":"explanation-session-request/1.0","repository":"https://github.com/OWNER/REPOSITORY","ref":"HEAD","documents":[],"audience":"普通观众","language":"zh-CN","maxSeconds":60,"voiceMode":"silent"}
```

Run `pnpm gve explanation start --spec request.json --data STATE --out NEW_CAPTURE_DIRECTORY`, then `pnpm gve explanation next --task CAPTURE_TASK_ID --data STATE`. Save the returned JSON if needed. It includes a verified source binding and `actions` with command argument arrays, required authored inputs, and explicit automation/review limits. Placeholder paths/IDs must be supplied from actual outputs; the guide does not execute them.

If README evidence is insufficient, inspect the public repository read only, choose bounded source paths, and create a new `explanation-session-request/1.2` capture at its exact40-character commit with `sourcePaths`. Source capture resolves ordinary Git-tree entries and verifies blob bytes. It does not install packages, run target scripts or execute the target repository. Preserve the first capture.

## Follow the verified next actions

Run `explanation next` again after each committed checkpoint. It supports source capture, source-bound Story, animation asset pack, real silent Story preview, complete narrative, documented closing card, and narrated editable preview. Every call revalidates the owning typed loader/CAS/source closure before returning guidance. Unknown, missing or unsuccessful tasks are refused.

1. Export `narrative-packet`; read authoring-guide.json, its seven dependent stages, the source-bound UNAUTHORED drafts, numbered pinned source bytes and exact Story/narrative schemas. Fill the actual drafts; they deliberately fail validators before authorship. Author factual statements with quotations, distinguish source-documented reports from observations/inferences, and retain unknowns.
2. Author Story shots and submit `narrative-story`; bind its actual task/graph hash in a complete narrative with hook, mechanism, example, limitation and closing, including every narration, visual, screen assertion and transition. Submit `narrative-plan`. All facts stay pending unless a real separately attributed review is supplied; this workflow never fabricates one.
3. Author supported bounded animation primitives and an explicitly silent child voice JSON. `story asset-plan` binds the animation; `story preview-render` creates an actual source movie. HTTP/image-output stories may use `--presentation audience-v1`; other supported scalar-rule or versioned document-flow diagrams use the generic source renderer. Both remain authored illustrations, not target executions.
4. Where an unresolved closing adapter can be truthfully narrowed, author a documented-summary card using only existing documented claims. Bind the exact parent/source/scene hashes. Preserve the old missing capability and every evidence gap. Other unsupported scenes cannot be silently promoted by this command.
5. Author `narrative-card-narrated-excerpt/1.0` with the current generated fork hash, exact source preview hashes and ordered source-shot frame ranges. Keep every unresolved scene as a visible placeholder. Use reset cuts unless a separate supported continuity profile proves more.
6. Generate each entire exact Chinese scene/card script with `tts huihui-generate` and import with `tts huihui-import`. This is a free local Windows prototype voice. Preserve generation and receipt references. Set `cardAudio: complete-recording`; bind one full recording and authored complete transcript/sample cue partitions for every selected Story scene AND card. Do not truncate, stretch or spill recordings; revise scene duration or prose and create a new bound candidate when needed.
7. Run `narrative-caption-preview`; inspect the actual MP4, pending current fact packet, full scene coverage, sources, original gap ledger, recordings and captions. `next` then provides byte-verified editable export and revision actions. Edit the owning JSON/input and rerun; changed hashes create new tasks/packets while preserving old candidates.

The output is a short technical preview, not formal full-film production. Source animations carry an audio-neutral `Authored illustration · No observed execution` footer so a later narrated composition does not falsely label itself silent. Caption pixels occupy a dedicated area below the complete source frame; external VTT is editable data only. Technical decode, hashes and sample timing do not certify semantic truth, transcript accuracy, natural listening or continuous audiovisual quality.

## Current real evidence

Three projects exercise the entry across seven actual committed stages each: `work/next-actions-v1/{express,rembg,rea}.json`; the recorded21-stage check dispatches no actions/model/review. Current media paths are the `output.bundle` in each result.json:

- `work/card-caption-v2/express/result.json`:15seconds450frames, three complete local speech clips, including a newly narrated documented closing.
- `work/card-caption-v2/rembg/result.json`:15seconds450frames, three complete local speech clips; the image/mask art is illustrative, not a model result.
- `work/rea-narrative-v1/result.json`:20seconds600frames, complete five-scene plan coverage and four complete new local recordings, from a fresh pinned GitHub source capture at `f4cc6c85efe7f3513d587df3bd5086adb1bc6a76`. The official historical investigation is reported with its limitations; this run does not repeat it. The expression diagram preserves `speed < 13` and `speed + 0.001`, without rounding it into a false6.00 measurement.

All three preserve explicit silent evidence gaps, original unimplemented capabilities and current pending facts/owner review. Current status distinguishes a rendered supported card from an unproduced evidence scene. Targeted checks and actual media support workflow connectivity. General repository-to-story quality, richer REA audience visuals, speech alignment/listening and final usability remain unfinished; this evidence does not establish90% readiness. No paid API, deployment, target execution, full regression, Judge or formal full film is part of this checkpoint.

A fourth previously unadapted repository, markedjs/marked, was captured, authored from the emitted drafts and rendered as a complete22-second five-scene/five-recording preview. The source-supported sanitization warning stays in the film. See [general authoring and document-flow evidence](general-authoring-document-flow.md). This adds Story evidence1.1/document-flow1.0 without widening the legacy EvidenceGraph or rewriting earlier schema closures.
