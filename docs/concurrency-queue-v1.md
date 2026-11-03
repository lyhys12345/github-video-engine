# Concurrent task queue presentations

Use a proposal 1.1 and presentation plan 1.3 to author the lifecycle of two to eight deferred tasks that share one to four fixed concurrency slots. The engine reads pinned repository text as evidence. Task cards and all scheduled intervals are illustrative, and the review status remains pending.

## Author and preview

1. Run `project intake --repo <url> --ref <commit> --id <id>` and `project author --id <id> --out <packet>`. Use `project capture-text` to add relevant implementation text at the same commit, then open a fresh packet.
2. Write a proposal using `proposal-queue.schema.json` from the packet. Use the `concurrency-queue` adapter candidate and one mechanism with separate stable entity IDs for the waiting area, slots, results, and each task.
3. Submit the proposal with `project submit-proposal`. Write a `session-presentation-plan` 1.3 with module `concurrency-queue/1`, preserving all proposal beats in order. Bind the plan to the submitted proposal hash and original evidence identity.
4. Run `project presentation-plan --proposal <hash> --id <id> --spec <plan>`. For an explicit silent preview, use `presentation render --task <plan-task> --mode silent --data <state>`. For locally sourced narration, use the existing voice binding workflow. Use `presentation status`, `resume` or `export` with the returned render task ID. See [Presentation narration](presentation-narration-v1.md).

## Plan contract

The unit is `in-flight-tasks`. Map the waiting, slots and results roles and the task IDs to proposal entities. In `module.rules`, link `admitUnderCapacity`, `releaseOnFulfilledOrRejected` and `waitingFunctionNotCalled` to documented claims and citation indexes. `module.capacity` carries a fixed value, a documented claim and citation, and a documented or illustrative basis. Illustrative capacity also links an assumption.

The illustrative scenario links three mechanism assumptions by zero-based index for task labels and selection order, motion timing, and outcomes. Use the ending `paused` if any shown tasks remain queued or running. All declared tasks must be submitted. The rules cover only fixed concurrent occupancy and normal settlement. Rate limits, priorities, runtime capacity changes, cancellation, retry, measured execution and scheduling guarantees lie outside this module.

Map each beat to a frame count and an ordered list of events. Each event carries the selected mechanism ID and beat-supported claim IDs. The events are `enqueue` with task IDs, `start` with a task ID and zero-based slot ID, and `settle` with a task ID and a fulfilled or rejected outcome. Set a beat-relative `atFrame` and `motionFrames` between 6 and 72. The compiled trace stores absolute frame anchors and records the state before and after each event. Counts change on the event frame. The card animation starts from the current visual position and continues across beat boundaries.

For plan 1.3, the final authored heading appears when its beat has begun and all scheduled motion has completed. Until then, the renderer displays a neutral in-progress heading. The final heading and state indicator share the same absolute frame boundary, with a minimum one-second hold. Historical 1.2 plans and renders keep their original interpretation and bytes. Use status, export or successful render-task resume to retrieve them. New queue submissions and renders require version 1.3.

The compiler checks IDs, citations and ordering. Review the source evidence to determine whether each rule mapping and each narration claim follows from the cited text. Only label the result as an illustrative explanation of the cited mechanism.

