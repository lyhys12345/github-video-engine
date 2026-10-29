# Cross-project explanation capability experiment

The previous REA revisions exposed ambiguous handoff, automatic/manual control confusion, infographic-heavy explanation, and repeated narration. This experiment adds a versioned ExplanationPlan between factual research and rendering, preserving the M0–M4 runtime.

`src/contracts/explanation.ts` validates audience/purpose/input/output, evidence, comprehension questions, causal beats and visual state sequences. `src/explanation/composition.tsx` is a single project-independent SVG scene renderer with persistent entity identity and interpolated transitions. Both fixture files use that same renderer; game/document/subject visuals are data-defined shapes, not branches in rendering code. This is a minimal extensible animation representation, not yet a semantic automatic storyboard generator.

After independent round1 findings, shared event-based rule drivers now integrate visual movement from event rates, drive labeled update pulses and expose a relative-speed readout. Causal rule beats bind an actual driver, not only before/after prose. Changing a rate changes target position in real rendered frames. Rates are time-compressed pedagogical visual units, not execution traces from target software. Generic proximity reactions can follow the same driver. Other factual/creative interpretation still requires a judge; no automatic semantic truth validator is claimed.

Reuse: TaskRunner persisted tasks, ArtifactStore immutable content-addressed commit, source canonical hashing, owned browser runtime cleanup, pinned Noto font, Remotion 4.0.538, existing FFmpeg media normalization/full decode verification. Existing 30–60s PlanningPackage and historical artifacts remain unchanged. No dependencies added.

Run from engine root:

```powershell
pnpm exec vitest run tests/explanation.test.ts
pnpm typecheck
pnpm exec tsx src/explanation/render.ts examples/cross-project-v1/rea-proof.json examples/cross-project-v1/rea-preview
pnpm exec tsx src/explanation/render.ts examples/cross-project-v1/rembg-proof.json examples/cross-project-v1/rembg-preview
```

Repeat commands demonstrate cached task reuse; changed plan or source hashes produce a new task. Use a fresh output folder after changes: delivery refuses to overwrite mismatched bytes. Runtime state is under `C:/Users/luyuh/Documents/Codex/work/gve-explanation-v1`; each preview includes original frames, evaluation and CAS identity manifest.

REA source is its official dinosaur lab. rembg documentation/source is pinned to c5b48b0417a0254df7d461efa14573597f369a83. The schematic cup/mask is original code-native art and is **not rembg output**. Only source documents were read; no target code/model executed. Code MIT license does not imply all model weights or optional remote providers have the same terms. No paid APIs were used.

Both clips deliberately have no voice. Narration drafts are part of the editable contract; approved Chen audio from the old REA script is not reused because it would mismatch these new timings and the rembg content. Audio naturalness remains pending. Human continuous watching/final acceptance and real platform retention measurement are separate from this bounded proof.

Acceptance: `reviews/cross-project-v1/contract.md`. Actual execution and independent reports are recorded separately; this document does not certify success.
