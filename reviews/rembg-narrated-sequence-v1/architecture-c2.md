# Independent c2 architecture / evidence / content-facts review

Candidate SHA-256: `e2a6b556ec7f4c22a0df2138d15ea69bacd86a2385f38c8be3829d67f41f13aa`.

Verdict: **PASS within the tested scope, with one minor wording observation.** No blocking or major issue found. The candidate is a manually authored timing repair to the same rembg illustration, not automated semantic alignment or a newly executed rembg example. Owner listening and continuous audiovisual acceptance remain pending.

## Identity and review scope

Read OPERATOR and the actual contracts, data and renderer. No builder audit/script or other judge report was used. All **858 declared files** match their hashes and sizes. All **577 source files** match Git commit `894c5ca612e74481d8015c2e8012a75e8098040e`. Source ZIP `c64fcc514af3737c0e8a4082ceb5348c045fb9889701533f3669522bd803b026` is identical to c1. Frozen candidate files were not changed; execution used this judge's extracted engine and copied state. No target rembg code, paid service, or fresh speech generation was executed.

I reuse my c1 factual interpretation and prior compatibility evidence only for unchanged code/data. The source identity, new audio/video, exact data differences, copied-state recovery/export, tamper refusals, and historical preservation were independently checked this round. The complete historical regression suite, a live cancellation race, and fresh rendering were not rerun.

## Exact author change and source closure

Independent recursive comparison shows presentation.json changes only `/beats/4/frames`: **132 → 176**. Each child becomes **540 → 584 frames**. Trace events remain at local frames 12, 108, 208, 327, 422, and 472. Trace differences are the final beat end, total frame count, and derived plan hash.

The final voice binding changes its relative start offset **3 → 90 frames**. Consequently its sample interval moves from `[822000,942917)` to `[996000,1116917)`, and the burned-caption frame interval moves from `[411,472)` to `[498,559)`. Clip length remains **120,917 samples**. New plan/voice task identities and hashes are expected derivatives; the newly created voice ledger records the current implementation fingerprint rather than copying the historical producer fingerprint. The other four local cue intervals are unchanged. The two c2 scenes continue to differ only by the first recording's one-frame / 2,000-sample shift.

For both children, the proposal, source evidence, captured README, illustrative asset, five original recording files, five receipts, and five normalized clips are **byte-identical to c1**. Full diff details are in diff.json. This proves a timing revision with retained material, not replacement narration or changed factual content.

Both scenes retain rembg repository `https://github.com/danielgatis/rembg`, commit `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`, snapshot `954ac356952f3716fdffffd10cab455ffd1b364bb968c089b7b0bbb23930436e`, and evidence fingerprint `f62e67dfb6598e15b3bd3d72b250a66d4887ac6403c38c7f969f859c69f8f8f7`. Captured README hash `8455c52c60130199ab61858d359f2d25440dd95772844e2b3a037e490b31179d` and exact quotation selections were checked again. The normal command and `-om` mask-only examples support the bounded narration. The bird, cutout and mask remain illustrative, not observed model output. This round did not remotely refetch GitHub.

## Independent actual media checks

Actual sequence task: `c3041f2474963a3000a8c330eb08ca12f8fe7327605dca87bd47b57abcef2965`.
MP4 SHA-256: `6739d2bdc5207299331f0324f85c1e386ff9b95a6340a2742b0ce28bafee2449`.

- Full audio/video decode succeeds. All **1,204** video timestamps equal `frame × 2000` samples. Both tracks start at zero and declare **2,408,000 samples / 50.166667 seconds**.
- Independently decoded all ten original-recording instances and reconstructed both child mixes and the sequence. All **4,816,000 PCM bytes** match: `95d9ddeee52cc36542c93da047dd271175c6fae1536de9397c555da096b9158b`.
- Independent encoding of that PCM matches the entire extracted AAC ADTS byte stream: **350,728 bytes**, SHA-256 `3ec6bb8a9ad4a098a9b90ea142d3d68317c2f268e9f1f9b492ee4225cae0470d`. Raw decode contains 448 trailing codec-padding samples beyond the declared interval, not additional intended narration. Recording-range correlations are approximately 0.999917–0.999993.
- All **10 cues** match original caller text, receipts, normalized-clip hashes, sample/frame projection, and the actual VTT. No audio speed change or truncation is involved. Exact text binding is not independent transcription or word alignment.
- Chapter interval `[584,620)` frames is `[1168000,1240000)` samples. All **72,000** samples are zero in source PCM and decoded AAC. Second-child projection starts at frame 620.

The renderer sets image panels' opacity from a 24-frame event progress. The unchanged compare event at 472 therefore reaches full opacity at 496. The revised caption begins at 498, two frames later, and ends at 559; its exact audio/VTT end is 23.269104 seconds locally. Second-scene comparison/caption boundaries are 1092/1116/1118/1179. This is a declared clip-level interval, not proof of when the spoken word “compare” occurs.

Extracted actual frames around both transitions and the chapter. Visually inspected frames **498, 558, 1118**: both labeled illustrations and comparison subtitle are simultaneously present. Frame **1179**: subtitle has ended, both illustrations remain. Frame **602**: chapter card is readable. The visible scene label still says “Local voice · Illustration · No observed execution.” I did not reproduce the builder's every-frame image metric or claim continuous perceptual viewing; source state math, complete PTS/decode and these independent actual frames are the stated evidence.

## Historical preservation and runtime checks

Compared c1 work/state with c2 work/state: **all 34 c1 task JSON rows** remain exact, and **all 298 prior CAS files** are byte-identical. Old movie remains `9b6378a0bf91fd371ac0f2f83b783cee6f59495d34f4278e31a3f02c852c93bd`. New tasks and media are separate revisions.

On copied c2 state, with FFmpeg/FFprobe paths disabled, both full child reads, verified sequence status, cached successful resume, export and repeated export pass. All **64 exported files** match the frozen bundle; read-only operations leave all **366** copied state files unchanged. Ten refusal checks pass: wrong child manifest, and status/resume/export for an appended PCM sample, changed recording receipt, and changed source byte. Mutations were restored in finally blocks; final status is verified and preexisting artifacts/task rows remain intact. See checks.json for error codes.

## Minor wording observation and remaining limits

**Minor:** chapter frame 602 combines the correct authored subtitle “Same case, new timing” with the generic headline “Separate example” and “CASE 2 OF 2.” The explicit subtitle and provenance prevent a substantive second-project claim, but the wording is mixed. Prefer “Timing variant” / “Version 2 of 2” for a future same-example chapter mode. This is not an audio/source integrity blocker.

Microsoft Zira technical fixture receipts are retained. This does not establish Chen identity, Chinese naturalness, accurate ASR transcription, owner listening acceptance, or automatic creative narration. The engine validates declared timing and integrity; the author supplied the semantic decision to delay this line until both outputs were visible. No claim is made that this correction generalizes automatically to other sentences or projects.

Raw independent evidence: identity.mjs/json/log; diff.mjs/json/log; media.mjs/json/log and extracted frames; aac-trace.mjs/json/log; checks.mts/json/log. Prior c1 report remains unchanged at the adjacent v1 judge directory.
