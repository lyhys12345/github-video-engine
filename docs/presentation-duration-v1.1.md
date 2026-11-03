# Extended presentation duration

Presentation plan schema `1.1` allows up to 7,200 frames at 24 fps, or 300 seconds. Schema `1.0` retains its 1,440-frame limit. Both keep 1–20 authored beats and the existing two visual modules. Supply the version explicitly when authoring a revised plan. Actual duration is the sum of authored beat durations. For recorded narration, allocate at least the clip offset plus the ceiling of decoded samples divided by 2,000, and allow room for authored events and deliberate visual holds. A binding that overflows a beat fails with the measured fit error. The operator can revise the plan and bind it again. Existing plan, voice and movie tasks remain readable. A revised plan needs a new binding even when it reuses identical source recordings.

```text
pnpm gve project presentation-plan --id PROJECT --proposal PROPOSAL --spec plan-1.1.json --data STATE
pnpm gve presentation voice-bind --spec voice-bindings.json --data STATE
pnpm gve presentation render --task PLAN --mode narrated --voice VOICE --data STATE
pnpm gve presentation export --task MOVIE --kind narrated --data STATE --out NEW_DIR
```

Status and export identify the task kind from the recorded task. An explicit `--kind` checks that the ID belongs to that kind. Use `pnpm gve presentation resume --task MOVIE --data STATE` to retry an interrupted or cancelled render with its recorded plan and voice. If the current inputs or renderer produce a different task ID, the command asks for an explicit new render. Completed tasks can be verified without starting the renderer.

The renderer selects a fixed internal extended profile above 1,440 frames. It renders absolute ranges of at most 480 frames with one local browser and two workers. It probes every intermediate part and stitches them in order before one full-timeline audio mux. The final H.264 stream and optional 48 kHz mono AAC stream must match the exact frame and duration contract and fully decode before publication. The extended final video uses an explicit 1.7 Mbit/s peak rate and 3.4 Mbit video buffer. Intermediate parts are capped at 12 MB apiece and the published movie at 80 MB. The final media check rejects any truncation caused by the size limit. The default short segment renderer retains its previous limits and encoding settings.

- The renderer requires 2.62 GB free on its work volume and 320 MB free on its state volume before starting. It samples its owned scratch tree every two seconds and cancels when the observed 2.2 GB or 50,000-entry budget is exceeded, or the available-space floor is crossed. These are admission and monitored budgets. Host processes can allocate resources between checks.
- The full normalized mono PCM mix is at most 28.8 MB. Valid normalized clips together occupy at most the same size. The existing per-source 25 MB and aggregate 32 MB input limits apply. A decode that exceeds its output ceiling fails. Offset and cue math uses exact sample positions. PCM is the exact reference and AAC is the playable, lossy delivery.
- There are at most 48 sampled PNGs at 2 MB per file, with explicit aggregate artifact budgets. At full capacity, sample priority goes to the first and last frame, beat starts, voice starts and then other boundaries until the cap. The complete trace and cue ledger remain available. The bundle also includes the editable proposal and plan, exact pinned source bytes, local voice bindings, import receipts and original audio.
- The extended worker has a 30-minute soft deadline and a 31-minute parent deadline. The task has a 50-minute deadline, up to three attempts, and up to five minutes for final mux, probe or full decode individually subject to the overall deadline. Cancellation stops the owned process tree. A retry starts the render again with the same input and reuses committed upstream results.
- Burned and VTT captions retain the existing clip-level measured timing and short-caption contract. Caller-declared transcript, actual speech and timing within a clip, source meaning and final listening remain separate review items. An unsupported visual module remains unsupported at any length.

A boundary check at 300 seconds establishes the plan and sample arithmetic. A media claim applies to the length that actually rendered and fully decoded. The runtime does not generate or pad a script to five minutes.
