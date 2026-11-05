# Per-scene animation profiles in complete unified runs

The existing `repository-narrative-run-author/2.0` complete profile now accepts an explicitly versioned animation set in its existing `animation.json` file. No run-author version or file whitelist changed. The session Agent chooses source-supported scene choreography; the user still supplies a URL/preferences and requests edits in prose. There is no automatic model dispatch.

```json
{
  "schemaVersion": "narrative-scene-animations/1.0",
  "storyId": "owning-story-id",
  "scenes": [
    {
      "sceneId": "mechanism-scene",
      "profile": "causal-operation/1.0",
      "animation": {
        "schemaVersion": "1.2",
        "storyId": "owning-story-id",
        "shots": [{"shotId":"owning-shot-id","operationId":"existing-source-operation","start":0.08,"arrive":0.33,"processed":0.62,"end":0.9}]
      }
    }
  ]
}
```

The snippet illustrates one entry, not a runnable complete author package: actual complete plans require every supported scene exactly once in narrative order and at least two produced scenes. Gap scenes have no animation entry and remain visible, silent and unresolved. Each entry must contain exactly that scene's ordered shots, with the owning Story identity. Profiles are `legacy-animation/1.0` (animation 1.0), `independent-flow/1.0` (animation 1.1) or `causal-operation/1.0` (animation 1.2). The respective existing compiler still validates the exact derived source Story; profile selection cannot invent operations, change source binding, connect independent examples or bypass unsupported compound operations. Causal native stages reject a separate context overlay. Existing standalone animation 1.0/1.1/1.2 inputs retain their previous normalization and behavior.

The shared pure-data normalizer is used by unified-run planning, per-scene asset production and controlled portable-project author verification. The run rewrites only the derived child Story identity, preserving exact per-scene animation data. Source/graph hashes, whole source ranges, every scene, complete original-speed recording/caption fit and the existing 300 second cap remain enforced. The packet's animation schema now describes both old inputs and the new scene set. Child closures in the current pending execution facts packet retain their exact authored animation schema, compiled operation/state mapping and rendered layout; the run cache result also lists each explicit scene profile. The exact owning four-file author package stays hash-bound and exported by controlled project packaging. This is integrity/provenance, not semantic or listening approval.

Actual experiments used the existing pinned PocketBase and rembg long projects through `runNarrativeWorkspace` (the same unified `explanation run` implementation), with repository transport disabled. New `author-mixed` directories preserved old author files, request/source identity and movies. No source repository code, model, service or example was executed; there were no new TTS/model calls or formal-film approvals.

| Project | Complete technical experiment | Profiles | Complete original speech |
| --- | --- | --- | --- |
| PocketBase | 114 seconds / 3420 frames / 10 scenes | 2 causal + 6 legacy + 2 silent gaps | 8 recordings / 102.895 seconds |
| rembg | 98 seconds / 2940 frames / 9 scenes | 1 causal + 7 legacy + 1 silent gap | 8 recordings / 89.22 seconds |

Both movies passed full FFmpeg decode, exact frame/stream probe, actual non-silent 48kHz mono AAC, every original scene in order with zero omissions, whole transcript/caption coverage and silent gap checks. Their entire PCM is byte-identical to the original long version. Source file hashes and all historical author-file/movie hashes were checked unchanged. Actual native/legacy/gap frames were viewed for both projects. This round preserved the old layouts on old profiles; it does not redesign every scene as a causal view.

Cache reporting is deliberately separate by version. The initial code/compiler change missed all 8source asset/preview caches in each experiment; all 8local voice generations/imports reused verified cache. A same-version repeat then hit every scene asset/preview, parent plan, voice and assembly in both projects. A new PocketBase author directory changed only route's operation `end` from 0.9 to 0.84. Its actual 114 second edited movie rerendered only route's source/asset and assembly; the other 7 source scenes, all 8Story/voice caches and parent plan were reused. PCM stayed identical, old original/mixed movie bytes stayed unchanged, and the edited movie/current pending packet hashes changed. Before/after actual frames show the corresponding signal position change; this is authored timing, not measured execution latency.

The PocketBase mixed project also passed controlled pure-data export with its exact mixed author package (244 files), exercising the shared author/child animation verification. The trust boundary remains controlled own exports; no arbitrary package safety, new mixed import or second-machine test is claimed.

Local evidence: `work/mixed-long-checks/pocketbase` and `rembg`. Each has source/author identity snapshots, actual results, full-media verification, same-version cache records, actual frames and `result-preview.html`. PocketBase additionally has `edited-result-preview.html`, full edited verification, `edit-cache-verification.json`, before/after frames and the controlled export receipt. Owning author data remain under `work/service-pocketbase/{author-mixed,author-mixed-edited}` and `work/long-portable-v3-rembg/author-mixed`; original author/project metadata are retained. Large/local artifacts are ignored and not in this code commit.

Initial PocketBase task: `21aa619495015707fc107cc9c1dba4ce0739bd9bea3ad336fddc2c5df34b0237`.
Edited PocketBase task: `4566e4f058190ae52e3c9e3a12d8d54a2966f12be1a84400537e5f45ba89bb21`.
rembg task: `80d33541a61217cd1580947ca353abedcfe0c7f489b4fced011eb4915dcf951c`.

Typecheck and 29 necessary targeted tests passed: 11 new mixed normalization/negative cases, 7 unified entry checks, 2 complete duration/coverage checks and 9 controlled portable negative cases. They cover missing/duplicate/reordered/gap scene entries, version/profile mismatch, cross-scene shots, wrong Story IDs, unknown fields/operations, native overlay rejection and legacy compiler equivalence. Media ran sequentially; no bundler stall occurred this round. No Judge or full regression ran.

Limits remain explicit: existing legacy scenes can be sparse/diagnostic and their source text can be small; Chinese gap holds are not proven adequate reading time. Causal views show source-curated relationships and artificial signals/artwork, not real runtime or mask pixels. Compound extract/composite remain outside the causal adapter, and cross-scene state continuity is not asserted. Facts, transcript accuracy, word/sentence alignment, natural listening, continuous perceptual AV, phone/ordinary-viewer acceptance and final owner acceptance remain pending. These full-coverage experiments are technical previews, not formal films or a 90% readiness claim.
