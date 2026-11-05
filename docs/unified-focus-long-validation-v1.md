# Unified complete long preview with source-bound focus

This is a local technical experiment based on `30b20e3`, not a formal film or approval. No production code change was needed: `repository-narrative-run-author/2.0`, `complete-technical-preview/1.0`, `narrative-scene-animations/1.0`, and `multi-input-focus/1.0` already compose through the unified run. The run does not call a model. The session Agent authored the scene/evidence/focus data.

## Preserved inputs and authored visual changes

The existing controlled imported rembg and pdf-lib complete projects were used with their pinned snapshots; no refetch or target execution. New author directories `author-focus-long` and `author-focus-long-edited` preserve the old author directories. Every original scene/order, narration, complete original recording, caption text/timing, duration and evidence gap remains. `run.json` was copied byte-for-byte. Only explicit scene visual/evidence bindings and animation choreography were revised.

rembg keeps all 8 supported scenes plus its silent evidence gap. Question inspects the illustrative mask, compose alone animates source-bound two-input convergence, and ending inspects the independent cutout. Question/ending carry explicit same-source, literal base-claim evidence overrides; their original additional narrative claims remain included. Other scenes retain their previous animation profiles.

pdf-lib keeps all 7 supported scenes plus both silent evidence gaps. Per-scene authored focus: opening observes the independent output illustration; inputs observes donor A; indices observes donor B; copy-scope observes donor A; mechanism alone animates convergence; serialize observes the independent output illustration; closing observes donor B. Repeated full overview cycles are removed from these seven scenes. Some source objects recur because the explanation discusses the same limited source example. This is not seven different demonstrated operations. In particular load/save internals are not simulated: their source-based narration remains, with explicit visual text that the frame only observes an authored object and does not depict loading/saving. Real PDF contents, actual image pixels, model behavior and target execution remain unknown.

The owning `*-animation.json` data makes object selection and focus timing editable. `converge` uses the four explicit operation phase fractions. Inspection uses its separate normalized focus interval, with no runtime processing signals. New versions alter cache identity; older source-code-hash caches are not guaranteed reusable across engine changes.

## Reuse from the trusted engine

Use the owning workspace and author directory, rather than rebuilding the source capture or asking the user to write JSON:

```powershell
node --import tsx src/cli.ts explanation run --repo https://github.com/danielgatis/rembg --workspace work/multi-restored-rembg --author work/multi-restored-rembg/author-focus-long --through preview
node --import tsx src/cli.ts explanation run --repo https://github.com/hopding/pdf-lib --workspace work/multi-restored-pdf-lib --author work/multi-restored-pdf-lib/author-focus-long --through preview
```

For the revised focus timing, use `author-focus-long-edited`. Each candidate retains a pending facts packet. Source/object/claim integrity checks do not prove semantic entailment. Listening, precise caption alignment, actual phone acceptance and final owner acceptance remain pending.

Targeted test invocation: `tests/multi-input-operation.test.ts tests/narrative-scene-animations.test.ts tests/narrative-run.test.ts tests/project-portable.test.ts`: **52/52 passed** under native filesystem permissions. The first sandbox invocation had 9 filesystem EPERM failures (hardlinks/symlinks); the same tests passed with the required authorized local filesystem access, with no safety-rule or fixture change. No full regression or Judge.

Local evidence is under `work/focus-long-checks/{rembg,pdf-lib}`; these media/state artifacts are ignored and not part of the code commit. Portable exports support controlled own pure-data engine exports only, not arbitrary untrusted packages. A second computer and another OS have not been tested.

## Completed actual long media, edit and portability results

| Project | Complete movie | Original speech | Complete scene coverage | Controlled portable export |
| --- | --- | --- | --- | --- |
| rembg | 98 s / 2940 frames | 8 whole recordings / 89.22 s | 8 supported + 1 silent gap | 247 files |
| pdf-lib | 102.6 s / 3078 frames | 7 whole recordings / 92.03 s | 7 supported + 2 silent gaps | 213 files |

Both original focus candidates and subsequent edited candidates were actually rendered and decoded in full. Exact frame/stream geometry, non-silent 48 kHz mono AAC, unchanged whole original PCM, all narration/caption characters, no speech spill, every scene in original order, all gaps silent/visible, pinned source hashes, exact derived scene evidence and compiled focus/timing, and actual movie/current pending packet binding passed. No supported scene was omitted. All original TTS generation/import stages were cached; no new TTS/model call. Actual long-preview frames were inspected for changed scene focus and reserved top/caption regions; the earlier small-window overview is not used for focus-native scenes. This is not a listening or phone acceptance claim; visual treatment is still simple and source objects intentionally recur.

An unchanged full unified-run repeat reused every scene asset/source preview, all voices and the final movie. A separate owning author revision changed only `focus.end` from .7 to .5: rembg question / pdf-lib indices. In each actual full run, only that source was rerendered, all other source scenes and every recording were cached, then the whole 98/102.6-second narrated assembly was rebuilt. The final PCM remained identical, the pending execution packet/movie identity changed, and both edited complete movies were decoded and checked again. Both historical author directories/movies remain available.

The edited complete candidate was exported through the existing controlled pure-data exporter and imported to a new directory. The original workspace was temporarily renamed unavailable, GitHub/source transport was disabled (`fetch` rejects; trusted local rendering may use localhost), and the imported unified run reused every scene/voice/final-movie cache with the same task and movie bytes. Each original was restored in `finally`; restoration journals and both original workspace files were checked. No second machine/OS or system-wide network firewall was used. Packages contain their selected data/claim/source/audio/editing closure, not raw SQLite/WAL or executable target code. Integrity hashes are not publisher authentication; arbitrary untrusted packages are not supported.

Final edited tasks:

- rembg: `3d42cdf6076f90fd987e095a716ef53491853432e7f9025b41037792d5e1ebe9`
- pdf-lib: `19f68aa244aef594b69a579add74c2a4b28a8b0eacae74cdb3bc308f4e5c94a8`

Final local delivery:

- `work/focus-l-restored-rembg/preview.html` and `author/`
- `work/focus-l-restored-pdf-lib/preview.html` and `author/`
- `work/focus-long-checks/handoff.json` lists absolute preview, task, author, verification, editing, package and restoration paths.
- Each project's evidence directory contains `result.json`, `verification.json`, `edited-result.json`, `edited-verification.json`, `edit-verification.json`, `portable-export-result.json`, `portable-import-result.json`, `portable-resume-result.json`, `portable-verification.json`, `portable-original-journal.json` and actual frame PNGs.

Original `project.json` and `preview.html` pointers were retained as `project-before-focus-long.json` / `preview-before-focus-long.html` before updating their current pointers to the edited complete candidate. The fresh imported projects directly identify their current `author` and task. The documentation checkpoint adds no new executor/framework code: this is verified authoring/integration of already-supported profiles. Facts/semantic entailment, listening, precise alignment, mobile readability and final owner acceptance remain pending. No Judge, full regression, target execution, paid API or formal film.
