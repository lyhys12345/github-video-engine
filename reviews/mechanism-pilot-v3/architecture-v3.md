# Mechanism v3 — architecture/evidence/content impact review

Verdict: PASS for v2→v3 architecture, source-binding and content-impact recheck within the standalone scalar SVG pilot. Native filesystem race behavior is not independently rerun in this role; the new publication path needs its separate v3 reliability/security review. This is not a whole-product gate or final audiovisual acceptance.

Candidate-hashes.json SHA-256: ee744816c2177d15b5cffc59471f407df0aa2bc0c5098a82b2dcfe34d6d18a16.

Independence: original candidate source/inputs/outputs were read-only. Did not read builder verification summaries, logs as proof, or other v3 Judge reports. Read actual changed implementation, native helper, test source and scope documentation. New evidence and this report are under judge-architecture. Prior v2 architecture review was my independent review and is explicitly reused below by impact, not represented as a fresh execution.

## Fresh checks actually performed

- Recomputed all 102 candidate entry hashes: zero mismatches. See hash-verification.json.
- Compared the v3 candidate entries to the v2 manifest: 80 entries unchanged, 8 changed, 14 added. See v2-v3-hash-diff.json. Those counts are per current manifest and do not count removed historical entries as current files.
- Compared every file under both actual Story and review output trees against v2, not merely their summary claims. See full-artifact-comparison.json.
- Compared source/src, source/scripts and source/examples/story-planner-v1 trees against v2. Only seven implementation files are added/changed: plan.ts, visual.ts, new xml.ts, new publish.ts, mechanism-preview.ts, prepare-rea-rule-pilot.ts and new mechanism-publish-windows.ps1. No evaluator or authored example changes. See source-tree-diff.json.
- Recomputed all seven compiler hashes declared by each current review manifest and checked sidecarHash against actual sidecar bytes: both closures matched.
- Read the complete Windows native publication helper and its TypeScript caller, XML validator, changes to plan/visual/CLI, and publication test source. This is code review, not an assertion that the tests were executed here.

## Exact reuse evidence

| Evidence | v3 vs v2 | Reused conclusion |
|---|---|---|
| rea-story/bundle | All 14 files byte-identical | Exact historical captured source bytes, claims, seven-shot Story and task identity unchanged |
| fill-story/bundle | All 7 files byte-identical | Locally authored hypothetical source and four-shot Story unchanged |
| rea-review | 34 payload/PNG files byte-identical; only manifest changes | Sidecar, entire trace, all SVGs and actual rasterized PNGs retain v2 content |
| fill-review | 20 payload/PNG files byte-identical; only manifest changes | Same conclusion for the non-speed fill example |
| state.ts and Story loader | Byte-identical | Evaluator and verified standalone-source association logic unchanged |
| review manifests | Changed compiler closure only | New XML/publisher source identity is correctly represented; their seven declared hashes match v3 |

The Story export roots also contain .explain-owner.json markers outside candidate-hashes. Their owner nonces differ, while their task IDs match. These local reservation markers are not source content, Story binding or reviewed visual output. They are not treated as byte-identical evidence.

V2 independent results reused: 23 independent checks, complete trace/SVG rederivation, 6/.001/13 per-eligible-update values, strict comparison with one overshoot from 12.9995 to 13.0005, collision-ineligible hold, manual assignment without advancing the update counter, source/quote/binding tamper rejection, non-speed hypothetical fill and variable beat-count behavior. V2 test logs and report remain at ../gve-mechanism-v2/judge-architecture/. This review did not rerun those tests, re-render these images, or claim fresh viewing/listening.

## Facts and source boundaries

No change affects the checked factual interpretation. REA's official historical HTML remains a standalone URL with its previous content hash; GitHub source descriptors retain their distinct blob URLs and fixed commit. The pilot still rejects a task with a repository association. It does not attach the official webpage to a Git commit.

The declared model remains fixed-point decimal, with value 6, increment .001 per eligible update and a strict value < 13 guard; it is not original-code execution or wall-clock game timing. Collision and slider setting remain authored teaching scenarios. The fill model remains a hypothetical local source with example.invalid identity, not a second real project. Numeric-token presence still does not establish semantic parameter meaning; v2's explicit limitation and minor slider-range clarity recommendation remain applicable.

The source, sidecar and image identity checks justify reuse of v2 content and visual-label observations. They do not establish arbitrary-project semantic support, a new current upstream capture, a rendered continuous video, recorded narration or owner AV acceptance.

## Change impact

1. XML validation now rejects invalid XML 1.0 characters in authored text and exact quotes before publication. The visual escape routine also rejects them rather than silently dropping controls. The excerpt truncation now slices Unicode code points, avoiding a lone surrogate introduced by slicing a supplementary character. This narrows accepted invalid input; valid current examples produce identical SVG bytes. Quotes are not rewritten to make an invalid input pass.
2. Preview output is prepared in memory before publication. Filenames remain engine-generated; all SVGs are derived before the new helper creates the destination. Invalid text therefore cannot produce a successful partial SVG bundle through this CLI path.
3. Publication is delegated to a fixed repository helper using the system Windows PowerShell path, -NoProfile/-NonInteractive, hidden process, JSON through stdin and base64 payloads. Authored strings are data, not concatenated shell commands. The helper script itself remains trusted engine code.
4. prepare writes its final sidecar through the same helper after the existing Story preparation. Therefore a sidecar publication failure can leave the successfully created Story task/export behind. This is not a cross-artifact transaction; retries need suitable fresh destinations. Existing Story/CAS publication is unchanged.

## Native publication boundary, assessed from code

- Windows only; unsupported platforms are rejected. Only an absolute local drive-rooted path is accepted. This does not claim UNC/network-filesystem or portable POSIX support.
- The native helper opens the drive root, then each directory component relative to the retained checked parent handle. It opens reparse points themselves and rejects reparse attributes before descending.
- The destination directory is created with create-new semantics and the creating handle remains retained. Existing destinations are refused. File creation is relative to this handle with create-new semantics, so the implementation does not intentionally overwrite preexisting files.
- Parent/destination handles are retained with restrictive sharing. The same process holding them writes all payloads. This addresses the earlier pathname reopen/rename substitution design; the newly supplied race test uses a separate process against a paused instrumented test copy. I read that test but did not run it in this review.
- The helper writes and closes payload files in supplied order; the current caller appends manifest.json last. It is manifest-last publication, not atomic replacement of a complete directory. Failed/interrupted writes can leave incomplete output. There is no claim of fsync/Flush(true) power-loss durability, resumable mechanism TaskRunner integration, or automatic cleanup of unknown files. These limits agree with the updated scope document.
- The publisher's subprocess has no explicit AbortSignal/timeout in its signature. Do not inherit the general engine's cancellation/recovery guarantee for this standalone helper without testing/implementing it. The current pilot document appropriately leaves mechanism task/CAS integration out of scope.

No new major or blocker found for the requested architecture/content-impact scope. Runtime adversarial publication proof remains the independent v3 reliability/security role's work; this report cannot substitute for it. Current facts and visual observations may be reused only for the exact byte-identical material identified above.
