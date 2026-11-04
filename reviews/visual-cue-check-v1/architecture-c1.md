# Independent architecture, evidence and content-facts review

Candidate: `b2943e17d574f9b990bf55e53ffd6a837d9427facc41fdb5886a124aee4a2139`.

**Conclusion: PASS within the documented diagnostic scope.** No blocking or major issue found in this review. This is not a semantic, transcription, listening or final audiovisual acceptance verdict. Architecture, evidence-binding and content-facts claims each pass only within the scope below.

## Identity and independence

I verified all 1,483 listed files for unique safe relative paths, lengths and SHA-256; the exact source ZIP; and 603 extracted source files against Git base `9720af310bccfb32d2ecceabe86b663d937d0a7d` plus the seven declared changes. See `identity.mjs`, `identity.json` and `identity.log`. The changed files are the new timing contract and implementation, two CLI files, shared frame-state/composition functions and presentation tests. Source ZIP SHA-256 is `02164546812b46f3a427b862d6e2fa74a8329641de9b09b1dd3d66ecb2ab69b2`.

I read the operator/contract and actual implementation and inputs, without relying on builder conclusions or other judges. I ran the extracted engine code and tests only in this judge directory, with copied evidence states. I did not execute any captured GitHub target project, use a paid service or edit candidate source/artifacts. Mutated negative fixtures are confined to private state copies and original bytes were restored. Original task JSON records and CAS objects in the copied states were checked unchanged after the tests.

## Architecture and evidence findings

`presentation-rendered-state/1` shares `httpResponseArrived` and `imageResultPanels` with the React composition. The refactor substitutes the previous expressions rather than changing their intended thresholds. I compared the new functions with those previous renderer expressions for every frame of four plans: **1,820 modeled frames**, all equal. HTTP arrival uses the same eased progress threshold; image completeness requires the appropriate panel set at full opacity.

A selected event is bounded by the next trace event, exclusively, or the presentation end. The checker enumerates that interval and measures the longest continuous intersection with the caption's half-open frame interval. It cannot borrow a later occurrence of a similar state to satisfy an earlier event declaration. A real cutout event at frame 208 yields `[232,327)`; a later cue `[411,472)` correctly fails with zero overlap.

The strict specification binds raw plan/voice manifest hashes, trace hash, parent task IDs and exact canonical cue/event record hashes. Voice and plan must match. Actual state and event kind must match the supported module. The task fingerprint also binds exact UTF-8 specification bytes, so even formatting changes intentionally create a new identity. Status, repeat and export rederive the report from verified retained parents and compare it with the committed artifact. A newly constructed, hash-consistent report that falsely claimed a failed real case passed was rejected with `PRESENTATION_TIMING_INTEGRITY`.

Source integrity is inherited through the existing verified presentation/voice parent closure. Damaging a captured plan source caused both status and repeated submission to reject. This protects the selected evidence identity; it does not prove the author selected an editorially appropriate cue/event relationship or that the words accurately describe the source. No such semantic approval is introduced.

The report always retains `relationshipSource: caller-declared`, `undeclaredRelationships: unchecked` and `speechAlignment: unverified`. It counts cues with no declaration. Even zero unchecked cues does not mean all possible relationships have been assessed. A diagnostic task may successfully commit a report whose declared checks failed; the operator instructions explicitly tell users to inspect `declaredTemporalChecks`. Incomplete attempts report unchecked and can be retried. Existing preview eligibility and review status are unchanged.

## Independent execution

Fresh checks used the actual immutable parent plans/voices with newly formatted specification bytes. Each first run was uncached; exact repeats reused a verified result. Read/status, exact-spec export and repeated export passed.

| Case | Cue frames | Selected visual frames | Longest overlap | Outcome |
| --- | --- | --- | --- | --- |
| Original rembg comparison | `[411,472)` | `[496,540)` | 0 | Failed |
| Retimed rembg comparison | `[498,559)` | `[496,584)` | 61 | Passed |
| Express HTTP, Huihui example | `[7,180)` | `[109,216)` | 71 | Passed |
| Express earlier response cue | `[363,396)` | `[397,480)` | 0 | Failed |
| Express following response cue | `[396,425)` | `[397,480)` | 28 | Passed |

The two rembg reports each retain four undeclared cues; the multi-cue Express report retains six. The retimed rembg check passes with a 61-frame minimum and fails with a 62-frame minimum, without changing the actual 61-frame overlap. A deliberately failed retryable diagnostic recovered under the same task ID on attempt 2.

Nineteen independent negative checks rejected as expected: empty checks; duplicate ID; duplicate relationship; wrong cue/event/trace/plan/voice digests; module/state mismatch; unknown queue state; zero minimum; extra semantic-review claim; invalid UTF-8; 32,001-byte input; corrupted report on status and repeat; corrupted captured plan source on status and repeat; and the separately constructed hash-consistent false verdict. See `checks.mts`, `checks.json`, `checks.log`, `forgery.mts`, `forgery.json` and `forgery.log` for exact inputs and error codes.

TypeScript typecheck passed. The focused suite passed **35/35 tests** (14 presentation and 21 concurrency-queue tests); see `typecheck.log` and `focused.log`. Browser, ffmpeg and ffprobe execution were disabled for my independent diagnostic harness. No fresh render is necessary for this bounded mathematical check, but that also limits the conclusion as stated below.

## Boundaries and remaining acceptance

1. **Minimum overlap is not whole-cue containment.** The Express cue starting at frame 7 passes because it overlaps the response from frame 109 for 71 frames. It does not assert that the response was visible when the cue began. This follows the implemented and documented contract; callers needing full containment must not interpret this result as that stronger guarantee.
2. Only `http-exchange/1` and `image-output-choice/1` states listed in the contract are supported. Queue timing is not covered and unsupported declarations fail closed. There is no automatic linguistic inference, retiming or authoring.
3. The calculation uses burned-caption frame intervals, including voice-ledger 1.0 and 1.1 reads. It does not check individual spoken words, PCM sample alignment, acoustic onset or perceptual synchronization. The original rembg repair and retained media were reviewed in my earlier rembg c2 review; this round independently recomputes the model and checks parent closure, and does **not** claim a new decode, pixel inspection or listening pass.
4. The diagnostic binds plan and voice artifacts, not a particular decoded preview movie or renderer binary. A passed report is therefore evidence about this profile's modeled states, not proof about arbitrary historical MP4 pixels. Future changes to predicates, thresholds or interval semantics must use a new profile/identity rather than silently redefining `presentation-rendered-state/1`.
5. The five-file export contains report, exact specification, trace and both parent manifests. It is not a standalone copy of all source/audio/CAS dependencies; full revalidation still requires retained parent state. The contract describes the actual export contents.
6. I did not run the full repository suite, fresh media rendering, continuous audiovisual review, ASR or owner listening acceptance in this round. Cancellation under process termination was not newly exercised; bounded retry recovery was.

The candidate may proceed as an independent, explicitly scoped author-declared timing diagnostic. No automatic content-review or audiovisual-quality approval should be inferred from this report.
