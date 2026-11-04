# Independent product / visual review — queue timing diagnostic

Candidate `candidate.json` SHA-256 `ba3022463042593f63b97cdbd6c2f56276e9bb2e0306876cdc770b43295fefe3`, matching requested freeze. Independently verified all 139 declared file lengths and SHA-256; zero mismatches. OPERATOR, exact exported reports and specs were read; no other judge report consulted. Candidate unmodified, no target repository executed. Independent frames and report are outside the freeze.

## Scoped verdict

**PASS for the sampled report/model-state boundaries and truthful speech-review labeling; overall video/user acceptance UNVERIFIED.** The checker is an author-declared model diagnostic. A `passed` rest interval does not establish semantic truth, speech alignment, actual on-screen legibility, freedom from other-card occlusion, or acceptance. My independent work checked actual decoded boundary images against report claims; I did not independently run the CLI checks or reconstruct every model frame.

## Actual image/report comparisons

Using the retained real preview MP4s, I independently extracted and individually viewed 360×640 p-limit frames 205, 206, 216, 217, 218, 236, 237, 253, 254, 553, 554 (`p-01`…`p-11`) and fictional tiling frames 292, 293, 303, 312, 313, 462, 463 (`s-01`…`s-07`). The p-limit MP4 SHA-256 `61705aa28af8410a94cb835d477dccad901318ffcf6c657b154a3e559be89710`; synthetic `ecd822fb2be7a2f468e6c0b003153b315641f475e8b800d4384d636a942e2528`.

- The retained task-3 waiting report declares cue [183,330), anchored wait [187,217), at-rest [206,217), 11-frame overlap. Image 205 still labels the queued cards `Joining queue`, 206/216 label them `Waiting`, and 217 starts task-1's admission and the subsequent queue shift. The 11-frame threshold report says passed and otherwise identical 12-frame requirement says failed. This is a cutoff of the selected anchored window, not a claim that task-3 never rests later.
- Task-1 running report begins at-rest [237,906); frame 236 shows `Entering slot`, 237 says `Running`. Task-2 fulfilled report begins at-rest frame 554; frame 553 shows `Leaving slot`, 554 shows `Fulfilled`. Frozen reports record 93 and 125 cue-overlap frames respectively; these selected boundaries visually support the model labels but do not independently verify the entire reported intervals.
- Synthetic Tile C report declares rejected-rest from 313, 150-frame overlap with cue ending 463. Frame 312 shows C `Leaving slot`; 313 shows `Rejected` in results; 462 remains rejected with cue and 463 retains result after cue disappears. At 312/313, entering Tile D and running Tile B visually touch/partly overlap. C's selected card remains visible in those samples. This is a concrete reminder that a modeled card-rest verdict does not prove that all moving or stationary cards are unobscured.

## Report scope and transparency

The examined JSON reports do **not** assert no occlusion or listening approval. They state `relationshipSource: caller-declared`, `undeclaredRelationships: unchecked`, and `speechAlignment: unverified`; the p-limit and synthetic examples report five and three unchecked cues respectively. OPERATOR explicitly says modeled at-rest does not establish absence of pixel occlusion. **Minor transparency risk:** the machine-readable report itself does not expose an explicit `occlusion: unchecked` or equivalent explanation. If a report is detached from OPERATOR, a consumer may overread `queue-*-rest` and `passed` as a pixel-visibility pass. Add a concise machine-visible scope/limitation or a rendered-state-vs-occlusion explanation to exported reports, without treating it as a new occlusion test.

The builder's retained process logs and reports record pass/fail thresholds and exports; those runs are implementer-executed evidence, not independently replayed here. No continuous watching or listening, speech/word alignment, actual mobile/player test, real audience study, exhaustive source-fact review or owner acceptance was performed. The previews are caller-declared English local-voice technical fixtures; no approved Chen or voice-naturalness claim is made.
