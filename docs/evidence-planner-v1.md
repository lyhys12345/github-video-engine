# Evidence-grounded explanation compiler

New path: pinned source files → exact citation verification → agent-curated typed semantic graph → deterministic comprehension goals/topological plan → shared operation animation → durable TaskRunner/CAS media. Existing v1 storyboard fixtures and renderer remain untouched.

Inputs are examples/evidence-planner-v1/*-evidence.json. There are no scene coordinates, hand-written timelines, shapes, narration scripts or references to previous project storyboards. Agents still interpret evidence into operations; that reasoning is explicitly declared. Exact quotes/hashes prove provenance, not entailment. Inferences retain rationale and original evidence, with separate fact Judge review.

The compiler sorts artifact dependencies, checks input/output types and supports one connected chain. Scene count and allocation change when semantic operations change. Unknown operators and ambiguous/disconnected graphs fail. Six shared operators: handoff, rate-change, control, segment, extract, composite. No branch by project ID, name or source URL. Illustrative game and cup sprites are a bounded visual vocabulary, not universal generated motion design.

One small scene label replaces repeated explanatory boards. Handoff object and same game stage persist; rule update pulse and game movement share a rate integrator. Mask colors, background removal and compositing are actual visual state changes. Manual control does not appear during automatic rule explanation. Rate units are compressed pedagogical units, not source execution traces.

Commands:

```powershell
pnpm test:evidence-plan
pnpm typecheck
pnpm schemas:evidence-plan
pnpm exec tsx src/evidence-planner/render.ts examples/evidence-planner-v1/rea-evidence.json examples/evidence-planner-v1/rea-preview-v1
pnpm exec tsx src/evidence-planner/render.ts examples/evidence-planner-v1/rembg-evidence.json examples/evidence-planner-v1/rembg-preview-v1
```

New tests are also in pnpm test. JSON Schema exports are schemas/evidence-planner-v1. Cross-field graph checks, exact quote/file checks and compiled provenance equality require the runtime Zod/compiler checks; JSON Schema alone cannot enforce these relationships.

The renderer verifies evidence before opening TaskRunner, hashes compiler/contract/renderer/worker/motion source, compiles the plan, then publishes media and compiled-plan.json through immutable CAS. Repeats reuse the exact input task. Changed graph or source creates a new task. Never overwrite an existing output directory with different content; choose a new versioned directory.

Both outputs intentionally have no narration. Synthetic rembg art is not inference output; REA interpreter role is our agent-mediated inference while official page documents returned script and rebuilt demonstration. rembg code/model licenses are separate. No target repository or model is executed. Final human AV/retention remains unverified.
