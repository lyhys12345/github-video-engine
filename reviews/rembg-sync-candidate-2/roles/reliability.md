# rembg-sync-candidate-2 / reliability

- Role: reliability (J2), frozen `source/reviews/judges-v2/roles/reliability.md` and common rules.
- Active scope: P2–P3, P5–P7; R2–R6 reliability implications. Owner statement covers six boundaries only.
- Candidate manifest SHA-256: `4c96c26e364dca2c1eda1efce5bbf0196de774866779af577bd81be39613f566`.
- Environment: macOS arm64; repository Node v24.11.0; existing pinned dependencies. Review on 2026-11-02 local (independent checks completed 2026-11-03 01:27:42 UTC; media checks immediately afterwards).
- Output: `work/unreviewed-preview-v1/judges/candidate-2/reliability/`.
- Verdict: **PASS** for this bounded reliability role. No unresolved blocker or major found.
- Independence: read frozen contracts and implementation/raw evidence before forming conclusion; no peer reports read. No builder summary used as proof. No shared source, contract, test or original evidence changed.

## Conclusion

All 388 source files and 429 evidence files matched the frozen manifest, whose exact bytes matched the assigned hash. Thirty-six independent checks passed, including malformed/stale inputs, both timing paths, old-output corruption, draft removal, and preservation of persistent prior bytes. Both actual frozen MP4s independently decoded completely with exit 0 and empty stderr. Their narration stems contain the complete frozen PCM reference at the expected 0.4-second lead, with silent lead/tail and no omitted samples.

The unreviewed draft remains an explicitly unreviewed route. Candidate 2 consumes the strict reviewed sidecar, but its timing confidence remains caller-declared, independently UNVERIFIED and owner-pending. This verdict does not establish listening, whole-film/continuous AV quality, transcript correctness, or G6. The exact six-boundary owner declaration does not establish those broader approvals.

## Contract and evidence

| Clause | Verdict | Evidence and method | Limits |
| --- | --- | --- | --- |
| P2 / R2 | PASS | Direct execution against frozen actual draft, reviewed sidecar and plan: mutually exclusive paths reject; reviewed and weighted routes preserve methods; candidate 2 input contains reviewed path only. `independent-checks.json`. | No new render performed. |
| P3 | PASS | Direct negative mutations: malformed type, stale voice/hash/bytes, plan, transcript, receipt, decoded identity, caption order, phase offsets, unknown review claim, diagnostics, repairs, zero-duration flags, reversed spans, clock, audition sample, cut anchor, and oversized token ledger all reject. Code review confirms recomputed midpoint cuts and final four-frame lower bound. | Prior focused sub-four-frame test independently inspected, but not rerun in this review. Model inference/listening not performed. |
| P5 / R5 | PASS | Manifest verifies exact draft/implementation/media closure; real prior evaluation+MP4 copied to isolated scratch. Draft change/removal and unreviewed→reviewed transition invalidate timeline/captions/frames/MP4/review approval. Same content still requires pending review. Damaged or incomplete prior state rejects without modifying existing evaluation/MP4 or adding files. Renderer inspected for unique output dir, implementation recheck and preview input/copy recheck before evaluation. | During-render mutation/cancellation not injected into Chrome; no render authorized for this review. Reviewed route retains its preexisting capture behavior. |
| P6 / R4 | PASS | Independent full decode of both actual MP4s, exact media hashes, frozen probes (977 frames, 1080×1920 H.264/AAC, 30 fps, 48 kHz), and independent exact PCM/reference comparison. `independent-media-checks.json`. | PCM reference is frozen prior decode; this review did not regenerate it. Decoding and PCM equality are not hearing evidence. |
| P7 / R5 | PASS | Frozen typecheck exit 0 and full regression logs: 38 files, 346 passed, 2 skipped; includes 39 unreviewed-preview cases plus reviewed/weighted tests. Independently executed 36 targeted checks against frozen implementation. | Full suite/typecheck historical frozen evidence, not rerun here. The two recorded skips remain skips. |
| R3 / R6 | PASS within role | Actual timeline/evaluation remain independently UNVERIFIED and owner/continuous-AV pending. Sidecar basis explicitly limits owner's declaration; unreviewed prior output remains separately marked. | Other roles are independent; this report grants no all-role or G6 acceptance. |

## Fault injection and resource record

The direct script uses the actual frozen preview evaluation and MP4 in `/private/tmp/rembg-reliability-state-joUf0H`. For incomplete state, `technicalPassed:false` was injected; revision rejected while MP4 bytes remained identical. For interrupted/corrupt media, MP4 was replaced with `interrupted partial MP4`; revision rejected on output integrity. The original evaluation and damaged MP4 remained byte-identical after the failed call, and the directory contained only those two expected files. This checks persistent state rather than merely checking for a thrown exception.

The script then removed its owned scratch directory in `finally`; recorded cleanup is true. No renderer/model subprocesses were created by the state tests. Two separate trusted FFmpeg decode subprocesses completed naturally with exit 0, no timeout and empty stderr; each had a 60-second bound. No new media, model inference, network request, paid operation or target-project execution occurred.

Exact executable scripts and output are retained as `independent-checks.mts`, `independent-checks.log`, `independent-checks.json`, `independent-media-checks.py`, `independent-media-checks.log`, and `independent-media-checks.json`. Commands were Node v24.11.0 with the existing tsx loader against `/private/tmp/rembg-reliability-c2.mts`, then Python 3 against `/private/tmp/rembg-reliability-media.py`. Full FFmpeg argv are in the JSON evidence. Both commands exited 0.

## Findings and recheck

No actionable reliability blocker/major/minor identified within the bounded contract. This is a fresh candidate-2 review, not adoption of a prior judge result. No earlier peer findings were read or silently superseded.

## Judge limitations

No independent hearing or visual-quality judgment, new browser render, concurrency stress, renderer cancellation or mid-render filesystem mutation was performed. Renderer failure cleanup and end-of-render rechecks were inspected as code; state corruption/revision preservation and actual full decodes were executed. Frozen broad regression evidence supports existing runtime behavior but is distinguished from this review's direct tests. Changes to the frozen bytes, validator, timing route or source closure require a new review.
