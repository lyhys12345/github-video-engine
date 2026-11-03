# Caption timing integrity — bounded continuation contract

Date: 2026-11-02. Base: `2a3b66d8e51f3afb24b02882e95cd5a9275daf31`.

This checkpoint hardens the existing short-clip timing sidecar and recovers existing recordings. It does not approve exact speech synchronization, generate narration, or produce a film. Historical candidates, failures and UNVERIFIED records remain intact. Owner audiovisual review and G6 remain pending.

## Observable criteria

- C1: Sidecar 1.1 binds the exact audio, transcript, measured duration and ordered raw caption-text SHA-256 values. Identical full text with changed phase segmentation rejects stale timing. Missing, reordered or mismatched hashes reject. Legacy 1.0 rejects with a requirement to review current segmentation again; no automatic promotion or fallback.
- C2: Runtime timeline entry validates sidecar structure, not only the renderer. Both declared methods work. Existing monotonicity, count, endpoint, duration and minimum-four-frame requirements remain enforced.
- C3: Timeline, cue confidence and render evaluation distinguish caller-declared timing review from independent timing review (UNVERIFIED) and owner acceptance (pending). No sidecar retains the existing explicitly estimated fallback and SRT/frame behavior.
- C4: A cueTiming-only revision invalidates timeline, captions, frames, MP4 and review approval, while preserving prior outputs. Fingerprint types include cueTiming.
- C5: Recovery records compare actual downloaded bytes with the checked-in receipt. Only exact matches are restored under historical recording names. Unmatched downloads stay identified as unmatched. Probe/decode results are technical evidence only.
- C6: Typecheck and relevant tests run on the frozen candidate, with exact environment, logs and source hashes. Failed installation/test attempts are retained. No paid calls, new credentials, voice generation, deployment, full-film production or target-repository execution.

## Review activation and boundaries

Record this activation set before freezing: product (C1–C3, C5–C6), reliability (C1–C4, C6), evidence (C1–C6), video_quality (C3 plus actual synchronization/continuous audiovisual status). Product/reliability/evidence use fresh independent contexts and isolated scratch/output directories. The earlier Astra design context is not an independent Judge context. The project-selected Sol implements; fresh Astra contexts review. Terra PNG review applies when new actual PNG/media is produced; this checkpoint produces no new visual candidate.

Video_quality must record actual listening, precise subtitle sync and continuous audiovisual quality as UNVERIFIED unless independently observable evidence is obtained. Its UNVERIFIED verdict blocks overall audiovisual release; engineering checks cannot waive it. No aggregate all-role PASS or G6 acceptance is permitted at this checkpoint. No factual narration/source claims change, so content_facts is not newly triggered. Reading the user's existing audio for local hash/probe checks creates no credential/remote-asset implementation change; security is not newly triggered. Any scope expansion must update activation before review.

Freeze source, tests, contracts and documentary inputs with SHA-256 before Judges start. Judges may not modify shared files or read peers' verdicts before their own first conclusion. Fixes require a new candidate and affected-role regression.
