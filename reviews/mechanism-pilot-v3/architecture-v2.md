# Architecture / evidence / content-facts review — mechanism v2

Verdict: PASS for the documented standalone scalar-model SVG pilot. This is not whole-product, continuous-video, speech, audience-quality or owner acceptance.

Candidate manifest: candidate-hashes.json SHA-256 e12b6c3a4a3fbc3c19fbe5ac484741bfb542c280c82cb4d6fe32d80fa9d79980. All 101 listed files matched before and after review. The active media evidence is rea-review and fill-review. The sibling rea-final/fill-final directories reference older renderer hashes and are not selected by this manifest; they were not used to establish current-output correctness. The listed reproduction preserves a 1.0 sidecar and is historical input, not a successful 1.1 result.

Role scope: independent architecture, source integrity and content/fact review requested by coordinator. Read actual plan/state/visual implementation, Story loader, prepare/preview scripts, sidecars, captured sources, traces and source scope document before forming judgment. Did not read builder summaries or other judge reports. Earlier architectural recommendations were mine; I did not implement this candidate or change its source. Original source/evidence remained read-only. Independent state copies and all new evidence are under judge-architecture.

## Findings and limits

No unresolved blocker or major identified within this pilot scope.

A1 — acknowledged semantic-validation limit, not a newly discovered bypass of the stated contract. The loader verifies exact source citations and the presence of a numeric token. It does not prove that this token is the threshold/increment described by the author. Independently changing lessThan from 13 to 6 passes because both values appear in the exact quote. The documentation explicitly discloses this limitation. The frozen REA parameters themselves are supported: SPEED 6, ACCELERATION 0.001, MAX_SPEED 13 and an eligible no-collision update. Content review must remain required; calling this automatic semantic parameter verification would be incorrect.

A2 — minor clarity improvement. The slider's documented provenance establishes that the teaching reconstruction has a fixed-speed slider; the rendered 0–16 range is authored. The scope document says this, the frame says “illustrative scenario” and “Illustrative projection”, and the assigned 4 is explicitly illustrative. A future contract should attach separate illustrative provenance to display bounds, or label “authored range” beside the slider, so a downstream consumer does not read controls.provenance as evidence for every number. No factual source claim for 0–16 is accepted here.

A3 — bounded extensibility. The implementation supports one scalar, positive conditional addition, context/manual events, two permitted projection/glyph pairs and variable beat counts. The fill example is expressly hypothetical, not a second real project's observed behavior. It is not arbitrary-repository understanding. The source scope explicitly excludes animation-graph integration, mechanism task/CAS export, continuous video and matching audio. These limits must remain in the release summary.

## Criteria and evidence

| Criterion | Result | Independent evidence |
|---|---|---|
| Candidate identity | PASS | hash-verification.json; 101/101 before and after |
| Source task/graph/manifest binding | PASS | independent-probe.mts rejects changes to all three identities |
| Captured source and quote integrity | PASS | changed CAS bytes, quoted text, line range and claim rejected; independent-results.json |
| REA web vs Git source distinction | PASS | official URL remains https://rea.tools/examples/dino-lab/ with hash a045d256cd040a21f163ad2f662c81d77e3fa47df6bc8add92b10f0b901dd769; other sources retain their GitHub blob URLs at f4cc6c85efe7f3513d587df3bd5086adb1bc6a76. The task has no repository association; loadStandaloneStory rejects repository-bound tasks |
| Numeric/eligibility semantics | PASS | actual fixed-point trace: initial 6; first eligible update 6.001; 1000 eligible updates 7; ineligible check holds 7; threshold check holds 13; manual assignment 4 without advancing update count |
| Exact threshold behavior | PASS | independent hypothetical start 12.9995 advances to 13.0005 then holds; no clamp; decimal model is distinguished from original JS execution |
| Per-update vs wall-clock units | PASS | event trace represents checks; visual text says per eligible update and compressed model time; no inference of original game FPS from teaching-game 60 updates/second |
| Collision/manual disclosure | PASS | actual inspected rea-review/png/beat-004-end.png and beat-007-end.png: teaching world illustrative; “Collision blocks this increment”; assigned 4 illustrative; original recorded execution is not claimed |
| Non-speed and variable beats | PASS | exact four-beat fill trace 5→8→11→11→2; actual vessel SVG/PNG, no track glyph; independent eleven-beat variation; existing test also compiles a grouped three-shot case |
| Current output rederivation | PASS | independently regenerated both complete traces and every selected SVG byte-for-byte, and checked output manifests |
| Safe bounded typed input | PASS | unknown eval event, excessive count, mismatched glyph, collision-on-vessel and missing shot coverage rejected; no target code executed |

## Actual execution

1. Read-only PowerShell SHA-256 verification of candidate-hashes entries: 101 matching files, zero mismatches; repeated after tests.
2. Independent script judge-architecture/independent-probe.mts, using a copied state directory and frozen engine imports: 23 explicit checks passed. Raw results: independent-results.json; console: probe.log. The script independently reproduces all active trace and SVG output bytes.
3. Frozen tests/mechanism-pilot.node.ts was run independently with Node v24.22.1 and the already installed tsx loader. The test uses isolated temporary state and removes only its own temporary directory. Sandbox run failed before semantic tests on EPERM hard-link creation; regression.log preserves it. Authorized unsandboxed rerun exited 0: one node:test case containing the detailed assertions passed; regression-unsandboxed.log.
4. First independent-script attempt used an overly narrow expected error string for a swapped claim. The engine correctly rejected it earlier as invalid claim reference; the harness expectation was widened and the entire script reran successfully. No product code changed.
5. An initial pnpm exec attempt was blocked by the environment's project-registration symlink operation. Execution subsequently used the existing explicit tsx loader and made no dependency installation claim.

Actual images inspected: rea-review/png/beat-004-end.png, rea-review/png/beat-007-end.png, fill-review/png/beat-002-end.png. This was a content-label check, not a replacement for the independent visual Judge. No audio or continuous video was listened to or reviewed.

## Content observations

The official historical page lines 297–304 report script retrieval; the pilot says the official example reports it, not that this run operated REA. Lines 309–316 support the values and eligible branch. Lines 333–341 support the separate teaching slider and explain that drawing/jump/collision code was newly written. The current manual setting and collision scene are teaching demonstrations. The trace skips this increment when ineligible; it does not purport to model the whole game's post-collision behavior.

The chosen fixed-point arithmetic is stated. Reaching exactly 13 from 6 through 7000 decimal increments is a model result, not evidence of bit-identical original floating-point execution. The hypothetical fill model correctly overshoots its trigger limit because comparison precedes addition. Its local authored source uses a reserved example.invalid URL and remains explicitly invented throughout; it is not external research.

The deterministic compiler never requests a model or executes source text. Arbitrary titles/captions and parameter meanings are still author decisions. Passing this review certifies the checked authored pilot and its stated integrity/arithmetical behavior, not all possible truthful uses of the schema.

Final owner audiovisual acceptance remains pending. No paid API, publication or target-repository execution performed.
