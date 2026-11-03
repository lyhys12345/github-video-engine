# URL intake v1 — engineering result

Candidate 4 SHA-256 `f649be2f3672dfc6b833e510b6ca44d07c8b3d7e9a610466c8b95b75ecf30b5b`; 312 files. Five active roles PASS via `node reviews/check-gate-v2.mjs work/url-v1/candidate-4/candidate.json reviews/url-intake-v1-gate.json`. The local raw candidate/reports remain in ignored `work/` and are not included in Git. Candidate 1–3 failures and original logs remain local.

Real public URL checks: rembg pinned `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`, Express pinned `43fca52d28a422c8be48fd489cbd4f2d6152bab6`. rembg URL → pinned evidence → agent-authored Story → offline status/export was executed; Express used the generic authored planning path. Full regression 39 files / 360 tests passed, typecheck passed. Security reviews exercised real directory junctions, conflict and concurrent export; cancellation before and during staging left no partial output. Native file symlink fixture was denied by Windows; that case was reviewed by code inspection.

This is read-only research and authoring workflow, not automatic understanding or complete video generation. Captured sources are untrusted; exact quotations prove provenance, not entailment. No target repository execution, paid API, audiovisual or G6 acceptance is claimed. See `docs/url-intake-v1.md`.
