# Independent queue timing architecture/evidence/content-facts review

Candidate SHA-256: `ba3022463042593f63b97cdbd6c2f56276e9bb2e0306876cdc770b43295fefe3`.

**PASS_BOUNDED. No blocker or major found.** The new diagnostic correctly binds a particular task and event, distinguishes reducer state from completed card movement, and truncates a selected event at the next event affecting that card. Existing HTTP/image report identities and bytes remain readable and reusable. This is not semantic, occlusion, listening or final audiovisual acceptance.

## Independent scope and identity

Verified all **139** manifest entries for unique safe relative paths, byte length and SHA-256, exact source ZIP SHA-256, and **610 source files** against Git base `63dddefe030ffec1ee791a6dc5fefb2f6c9af8ff` plus four declared changes. The changed files are the timing contract, `queue-frame.ts`, `timing-check.ts` and queue tests. Final identity recheck also passed.

Read actual operator instructions, contract, source, exact author specifications and retained proposal/source/trace artifacts. Builder scripts and replay results and other judge reports were not used as proof. All tests and negative mutations ran in judge-owned source/state copies. No candidate source or frozen original artifact was modified; no captured target project was executed and no paid service was used.

## Architecture and binding

Specification `presentation-visual-cues/1.1` selects profile `presentation-rendered-state/2` and report schema 1.1. It is explicitly queue-only and requires presentation plan **1.3**. Old specification 1.0 retains profile /1 and report schema 1.0. A stored profile/spec mismatch is rejected rather than silently upgraded.

Each new check binds exact plan and voice parent IDs/manifests, trace bytes, canonical cue and full trace-event records, and the canonical compiled `{id,label}` task row. The event must actually name that subject, including membership in a multi-task enqueue. The requested waiting/running/fulfilled/rejected state must match the event kind and outcome. Visual caching and duplicate-relationship checks include the subject, preventing two cards from incorrectly sharing a result. Switching the valid subject alone yields a distinct diagnostic identity.

The timing checker calls the same `queueFrame` card model used by the React composition. `queueCardAtRest` requires no movement phase, full opacity, and exact assigned position; it also checks pending membership, the selected start slot, or the selected settlement outcome. At the start/settle event, reducer active/outcome values are already populated, but the card is still entering/leaving and is correctly not at rest.

The event window ends at the first later event whose before/after positions or outcome differ for that card. Consequently another task's start can truncate a waiting card's anchor by shifting its row; an unrelated event does not truncate the anchor. Later rest intervals cannot be borrowed back into that earlier declaration. The report includes the window and interrupting event's beat, frame, kind and exact digest. Since valid traces have strictly ordered absolute event frames, that combination is unambiguous.

Bounded work is inherited from at most 32 declarations, 7,200 frames, eight tasks and 24 queue events. Per-frame queue states are cached within the derivation. Raw UTF-8 spec identity, exact derived-report verification, immutable parent closure, retries and receipt publication remain in use.

## Independent positive, negative and compatibility checks

Seven newly formatted specifications were independently submitted; all first results were uncached. Each was then repeated, read and exported, including repeat export. Results:

| Declaration | Selected window | At-rest evidence / overlap | Verdict |
| --- | --- | --- | --- |
| p-limit task-3 waits | `[187,217)` | `[206,217)`, 11 frames | Minimum 11 passes |
| Same task/event | `[187,217)` | 11 frames | Minimum 12 fails |
| Same cue/enqueue, task-4 | `[187,217)` | 11 frames, distinct task identity | Passes |
| p-limit task-1 runs | `[217,906)` | `[237,906)`, cue overlap 93 | Passes |
| p-limit task-2 fulfills | `[534,1059)` | At rest from 554, cue overlap 125 | Passes |
| Same settlement, earlier cue | `[534,1059)` | Zero cue overlap | Fails |
| Synthetic Tile C rejects | `[293,603)` | At rest from 313, cue overlap 150 | Passes |

The task-3 waiting anchor ends at task-1's frame-217 start, even though task-3 can later be at rest again. Task-1's running anchor survives another task's frame-234 start. Exact finish boundaries 237, 554 and 313 pass the at-rest predicate; each immediately preceding frame fails with entering/leaving phase, despite logical active/outcome state already being set.

**22 negative checks** rejected: unknown subject; bad subject digest; digest of a renamed label; valid task attached to the wrong event; wrong outcome; wrong cue/event/trace/plan/voice digests; extra approval claim; duplicate ID/relation; queue declaration under old spec; zero minimum; unknown unoccluded state; a hash-consistent forged passed report; profile/spec mismatch; damaged report on status/repeat; and damaged captured source on status/repeat. Private corrupted bytes were restored. The forged report used a valid newly created task and CAS object, so its rejection exercises deterministic rederivation integrity rather than only a raw hash mismatch.

Five real CLI invocations independently confirmed passing checks exit 0, failed checks exit 2, readable failed status exits 0, invalid subject exits 1, and the old failed rembg cache still exits 2.

**Four old HTTP/image diagnostic task IDs, report objects and exported report bytes** match my c1 independent records. The queue state's 30 pre-existing task rows and 448 CAS files, plus the old rembg state's 39 rows and 303 CAS files, remained unchanged in my private copies after the main checks. The additional three legacy report copies also preserved their old rows. This is a new execution of compatibility checks, not simply reuse of an earlier vote.

The modified and exact Git-base `queueFrame` outputs are deeply equal for every frame of both retained 1.3 traces: **1,662 frames**. A separately manifest-verified historical plan 1.2 trace was also compared for all **528 frames**, with equal output. New queue diagnostics for plan 1.2 are intentionally unsupported by the contract; a complete 1.2 diagnostic submission was not constructed or claimed tested. Existing historical renderer behavior is preserved rather than migrated.

TypeScript typecheck passed. Focused presentation/queue tests passed **36/36**.

## Source facts, sampled media and limits

Read the retained p-limit README and implementation capture. They support concurrent in-flight work, waiting functions, and release after fulfillment or rejection. The timing diagnostic introduces no per-second rate claim, measured runtime, FIFO guarantee or observed execution. Subject tasks, order, outcomes and teaching time remain illustrative assumptions. The contrast proposal explicitly identifies a fictional tiling service, invented task order/outcomes and synthetic evidence; it is not a second real repository execution.

Independently verified the two narrated preview closures and decoded exact frames **236, 237, 554** from the retained p-limit MP4 and **313** from the synthetic MP4. Their RGB24 pixels exactly match the frozen PNGs. I viewed those four images. They show the entering-to-running boundary, the fulfilled card at its destination, and the rejected synthetic card at rest while a different card is still moving. These are real sampled frames from retained media, not newly rendered movies.

The composition can contain overlapping moving cards. The candidate explicitly scopes its result to modeled card placement, not pixel occlusion. It does not prove the entire card or all text is unobstructed, and a passing result must not be presented as such. The displayed illustration/no-observed-execution labels remain present. Undeclared relationships remain unchecked and speech alignment remains unverified; the report does not approve the editorial meaning of the declared cue/event relation. Minimum continuous overlap is also weaker than whole-cue containment.

No new movie rendering, full-media decode, audio reconstruction, ASR, continuous audiovisual inspection, owner listening, full repository test suite or process-kill recovery exercise was performed this round. Prior voice/media facts are not represented as newly audited here. The five-file diagnostic export still requires retained parent state for complete source/audio revalidation.

## Raw evidence and harness notes

Evidence is saved in `identity.mjs/json`, `checks.mts/json/log`, `compatibility.mts/json`, `compatibility-rerun.log`, `media-and-parent.mts/json`, `media-and-parent-final.log`, `focused.log` and `typecheck.log`, alongside exact test specifications and exports.

The compatibility harness initially used a static import for a scratch TypeScript module outside a package; switching that harness to the already working dynamic import resolved it. The media harness initially supplied `preview` instead of the explicit `narrated` task kind, then had an FFmpeg expression-escaping error; both were corrected in the judge script before successful decoding. Initial logs are retained. These were harness errors, not candidate failures. Native Windows access was used only for judge dependency linkage and the existing atomic publication operations.

