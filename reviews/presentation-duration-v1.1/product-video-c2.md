# Independent targeted product and visual review — duration freeze v2

Candidate `candidate.json` SHA-256 `d3d0948fda6782cef33961a8c3b8695bb1ce0908c5b441b8ca325855487a80b4`. All 679 manifest files independently matched stated lengths and SHA-256. Read OPERATOR and source contract; no other judges' conclusions used. Exact-source extraction, copied state, PNGs and exports are isolated under this directory. No target repository was executed.

## Product regression — PASS for tested scope

Independently ran the actual CLI without `--kind` against new narrated task `934471e420c6ba960d3120a4c60eb3bc5bbf656cbbc0c62312645ae1fc01291c`, prior narrated task `b9bdbf075c54eb13259e212c1ee7f43eed3b9e19b1c2951c6c7ac3e073484c8c`, and historical silent preview `9cc7773f618a1288376d02a917c4158b034ef768e43d500907f06ffa8ae04c1b`. For each, status returned succeeded and integrity verified with the correct inferred kind; resume returned succeeded and `cached: true`; export returned receipt-v1 and review pending in `export-narrated`, `export-legacy`, and `export-silent`. This fixes the original false-integrity error for the reproduced paths. Completed-task resume is not a test of actual interrupted-process recovery.

For status, resume and export, separately tested new narrated task with explicit `--kind preview`: each exited 1 `PRESENTATION_TASK_KIND`, explaining to omit kind or use narrated. Malformed ID `abc` gave `PRESENTATION_TASK_ID`; a well-formed absent all-a ID gave `EXPLAIN_TASK`, each for all three commands. These are the specific negative cases tested; no independent corruption or forged-identity test was performed.

Prior long narrated task remains accessible via default status/resume/export. Its newly exported MP4 SHA-256 `2a30788d303b0910977570cacd5cedc3f2d4b50e13f313b27441288529b8ed17` matches the C1 reviewed movie. New movie SHA-256 `e9d3b84616c8d7f3a39f7db6cda4e4ea460a2fb99f468b0fe0c254610b0d356f`. Retention conclusion covers these actual historical tasks and bytes; no new revision was authored in this targeted check.

## Actual visual check — targeted change PASS; overall audiovisual UNVERIFIED

Independently ffprobed the exported new MP4: 720×1280 H.264, 24 fps, 1842 frames, duration 76.75 seconds, 48 kHz AAC. Full decode to null succeeded, exit 0. Independently extracted 360×640 PNGs from its actual bytes and individually viewed frames 745, 750, 755, 756, 762, 768, 780, 800, 866 (`frame-01.png` through `frame-09.png`).

The original declared subtitle cue is 31.2917–36.0854 seconds: “The diagram keeps the same GET request in view as it moves toward the server.” Frame 755 has that subtitle before the request card appears; at 756 the GET / card appears beneath the client, and its position descends toward the server in 762, 768 and 780. At 800 and 866 the card remains at its lower position. This directly addresses the former mismatch in the specified cue window: the sampled motion now occurs during the text, although it finishes before the cue ends. Comparison of selected stills does not establish motion smoothness, spoken synchronization or whether the passage feels natural in playback. The sparse card diagram and small bottom subtitle noted in C1 remain visible; actual phone safe areas were not tested.

No continuous viewing or listening was performed. Speech content, voice identity/naturalness, exact alignment, editorial pacing, overall audiovisual quality and owner acceptance remain UNVERIFIED / pending; an audio stream is not evidence of intelligible speech. The 76.75-second technical preview is not a 300-second render or final film. No independent active cancellation, interrupted resume, new full render, full test suite or broader project regression was run in this targeted review.
