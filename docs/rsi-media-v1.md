# Multimodal RSI packages

`rsi-media` extends the existing text RSI chain; it does not dispatch models or grant script/video approval.

## Commands

```sh
pnpm gve rsi-media freeze --spec experiment.json --out new-packet
pnpm gve rsi-media verify --root new-packet
pnpm gve rsi-media start --root new-chain --spec experiment.json
pnpm gve rsi-media status --root new-chain
pnpm gve rsi-media review --root new-chain --expected CURRENT_RECORD_SHA --review raw-media-review.json
pnpm gve rsi-media apply --root new-chain --expected CURRENT_RECORD_SHA --spec new-candidate.json
pnpm gve rsi-media summary --spec chain-paths.json
```

An experiment uses `rsi-media-input/1.0`: id, repository URL, project category, split (`calibration` or `holdout`), requirements, rubric, requiredModalities, baseline and candidate. Each candidate contains an assets array with role, local path and expected SHA-256. Roles are script, brief, source, video, audio and frame. Script, brief and source are mandatory; required modalities require their corresponding assets. Media requires explicit `rightsConfirmed: true` for the intended local use; that declaration does not grant a redistribution license. Do not include voice references, model weights or credentials. A frame may also declare atSeconds; this is not proof of its extraction history.

The agent prepares these files. The user supplies goals/preferences and review feedback, not JSON.

Frozen A/B folders use anonymous filenames and contain actual copies of all declared artifacts, not paths back to a private workstation. The operator mapping stays outside the reviewer directory. Copies are streamed, hash checked and atomically published from a new staging directory. Source inputs remain unchanged; partial staging is not a committed packet. Failure staging is retained for diagnosis. Limits: 512 MiB/file, 2 GiB/candidate, 200 artifacts. Container/codec validity remains the media verifier's job; packet verification proves byte integrity, not playability, citation truth or media rights.

## Review and repair

A `rsi-media-review/1.0` wrapper contains the bindingSha256, the existing RSI report and observations. Each observation names A/B, modality, exact artifact hash, method (`read`, `viewed`, `listened`, `watched-and-listened`), whether coverage was complete, and notes. A claimed modality must have complete observations for all relevant assets in both candidates. Missing required coverage returns UNVERIFIED; it never becomes a technical PASS.

These are declared observations, not authenticated recordings of a reviewer's attention. Audio naturalness and continuous AV need actual listening/viewing. A decoded frame or a favorable text report is insufficient.

The chain binds each attempt to its frozen media package and preserves the exact raw report. Calling the legacy text review API without the matching multimodal report cannot produce a valid media-chain status. Fixed baseline, rubric, requirements, reviewer continuity and the existing three-attempt limit remain enforced. Changed candidate media requires a new candidate; exact apply retries reuse the committed successor. Hashes protect integrity in trusted local storage, not against an actor rewriting the entire chain.

The summary separates candidate preference, baseline preference, tie, neither and pending. Its comparison-set readiness requires two different calibration categories and a distinct holdout repository. It does not claim better audience retention, stars, or independent holdout isolation.

## Actual checks in this implementation

- Contract tests use deliberately non-playable synthetic bytes and labelled synthetic reviews. They check freezing, tampering, missing modalities, raw-review binding, fixed reviewer, three attempts and comparison-set coverage. They do not prove visual quality.
- Real existing VoiceStudio, The World We Know and engine flagship videos were frozen with scripts/source records, extracted audio and a decoded frame; restarting read/verification preserved their record hashes. Baseline and candidate were deliberately identical controls. No new film was made, and no quality improvement or AV PASS was asserted. Local evidence: `work/rsi-five-modules/media-real/result.json`.
- The engine video is held out from module contract fixtures for this integrity exercise; this is not proof of general creative performance on an unfamiliar repository.

Use new approved candidates and independent actual-media review for a quality experiment. Preserve old accepted films as references.

