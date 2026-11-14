# Independent durable showcase review

Reviewer: /root/speech_alignment  
Candidate checked: 2026-11-13, after the URL storyboard digest repair  
Verdict: **PASS for the scoped engineering checks. Continuous AV review and final acceptance remain pending.**

I read the source intake, workspace provenance, TaskRunner/CAS integration, local render worker, and portable import/export implementation. Pinned source, exact approved script bytes, the normalized storyboard, narration receipt and decoded audio, render settings, and candidate-specific review each have explicit bindings. Workspace authorization binds the storyboard before render. The regression changes an operational annotation and confirms the old script and receipt no longer authorize it. A second negative case changes the pinned source commit. Once the synthetic author obtains a new exact approval, the unchanged shot fingerprint still reuses the first shot.

The independent command `pnpm exec vitest run tests/showcase-durable.test.ts tests/showcase-reel.test.ts tests/approved-reel.test.ts` passed **21 tests** in 3 files after the storyboard repair. I inspected the builder's separate real-media recovery artifacts under `D:/gve-anna-render-temp/gvs-3MFT8M`. That synthetic run produced a 12-frame, technically decoded video. Its import and fresh offline rebuild recorded an identical movie hash, historical review, and pending perceptual and owner review. I did not independently render or watch the fixture, listen to the narration, or assess real project findings.
