# Existing browser startup boundedness check

Independent read-only source inspection prompted by the first V5 run stalling at browser-starting. No renderer change proposed or made.

- src/short-segment/worker.ts lines 30-31: explicit 45-second startup watchdog writes browser-start-timeout and kills its own process tree. Whole standard worker stop timer is 600 seconds.
- src/story-planner/preview.ts: worker subprocess deadline is 660 seconds; TaskRunner deadline is 900 seconds.
- Pinned node_modules/@remotion/renderer/dist/open-browser.js passes 25-second launch timeout.
- src/core/process.ts kills by owned PID tree, never by Chrome process name. It awaits taskkill completion without a second timeout; this is an existing general OS-process-control limitation, not introduced by public voice.

A stalled attempt is not V5 success. Preserve its logs and retry using the existing owned task/resume mechanism. A later completed, frozen actual CLI evidence run can satisfy V5 without falsely claiming the initial attempt succeeded. No new major source defect was established by this inspection. Do not describe the stall as missing all startup deadlines.
