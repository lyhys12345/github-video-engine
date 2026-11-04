# Express mixed-voice-ledger sequence: independent review

Candidate SHA-256: `e55aef9c427b30cbf543515cbeb11d7d769a4e5ac9e7f08f4018b58bec7805df`.

**PASS — architecture/evidence/content-facts for the supplied Express mixed-caption sequence.** No new blocker or major was reproduced. The specifically identified earlier task remains rejected; this review does not certify that all historical successful voice tasks are readable. Subjective AV, speech accuracy, voice identity and owner acceptance remain unverified/pending.

## Identity and scope

Read OPERATOR, sequence and narration contracts, actual source-bound proposal, README capture, trace, original receipts and voice bindings. OPERATOR claims were not used as proof. No builder media-verification script/result or other judge report was read. Executed only trusted engine tools and independent judge scripts, using extracted source and copied state under this judge directory. No Express application code, synthesis, reference conditioning, paid API or publishing/deployment ran. Candidate remained unchanged.

`identity.mjs` / `identity.json`: all **777** candidate files match the frozen lengths/hashes; source archive matches its declared SHA-256. All **568** extracted source files match Git blobs at `b6e204970e54e7a881972fcbf1285d273b2896cd`. Sequence, sequence-audio, presentation runtime, narration, presentation contract and presentation tests are byte-identical to the prior independently reviewed narrated-sequence candidate. The earlier architectural analysis and 33 affected tests/typecheck are reused by impact, not represented as rerun here. This round independently exercises the real Express media and mixed voice versions that were previously absent.

## Source and factual claims

Both accepted children have the same full binding: repository `https://github.com/expressjs/express`, pinned commit `43fca52d28a422c8be48fd489cbd4f2d6152bab6`, project `express`, snapshot `4f3d291c9f759f66dad3dd91964ff51fef5923b0069c13dd0cb185a1362d9ce8`, evidence fingerprint `94a066cb6a155615a652b7cd10fa950abd811a0bc2c14f40fdb4ffc497706a58`.

The supplied README SHA is `3cf5f3e224dbb9b5e2bc0ac255871de453762ae7a277f868da5f4a69d6ff2509`. Independently checked every citation hash and exact line range, and manually read the relevant code as text. Lines 41–43 register GET `/` and send `Hello World`; lines 45–47 listen on port 3000. The four narrated statements match this bounded example. The identical child state traces contain listen/request/match/respond at local frames 18/138/262/380, or global frames 534/654/778/896 in the second scene. These are authored illustration times, not measured networking or actual Express execution.

Proposal exclusions, illustrative depiction and the actual picture label disclose the technical nature of the example. Sequence titles/order are caller-authored. Both children use the same plan, recordings and PCM; the second scene changes caption timing/segmentation. Thus this is a real second repository family after p-limit, but not two distinct Express stories or a multi-repository combined sequence. No arbitrary-URL automatic creation is established. The pinned remote repository was not fetched anew in this review; the supplied source capture and retained binding are what were verified.

## Original recording, PCM, final AAC and captions

`media.mjs` / `media.json` and `aac-trace.mjs` / `aac-trace.json` were adapted from this judge's own independent prior scripts, not builder scripts, and executed afresh against this freeze.

- Actual sequence task: `7feb23c449d709805a977ef1883e7b7c0ee5fe8701ac821e52df1532669243e6`; MP4 SHA `eb2d32dc0a4fedaf5c141de73959c8c0d9754f4dbe97da19605eab703d54b893`.
- Both child scenes are 480 frames, with a 36-frame chapter card: **996 frames / 41.5 seconds**. Full two-stream FFmpeg decode passed. Every video PTS is `frame × 2000`. Audio/video both start at zero with time base 1/48000 and declared duration 1,992,000 ticks.
- Independently decoded all eight original recording instances (four distinct recordings reused twice) to 48 kHz mono PCM16. Receipt hashes, audio hashes, exact declared text hashes, proposal narration, normalized PCM hashes and decoded sample counts match. Both full child mixes independently reconstruct to the identical SHA `bff1fe33481b844c281d4ceedbe7c01b79636b9eecc4435ceeaa5abe87f7e4cf`.
- Rebuilt the entire global PCM from original recordings and placement intervals, including silence and tails: **3,984,000 bytes**, SHA `51bd90585cfda335da9abfca79115707c15e0eef484f143a797adddcf82597ac`, exact byte match.
- Card `[480,516)` frames / `[960000,1032000)` samples contains **72,000 zero samples**, both in reference PCM and in this fixture's decoded AAC.
- Independently encoded the full PCM to AAC 128 kbit/s, then compared its entire ADTS packet stream with the supplied movie's extracted audio: **308,252 bytes, exactly equal**, SHA `7204ec8f8051af5c61e794580a5ccb57f075e221b0ffac257ce2f6619958e01a`. This is stronger than selected-span correlation and does not mean AAC is lossless.
- Raw AAC decode yields **704 trailing packet-padding samples** past the declared track interval. Both tracks' declared duration is exact; all original samples are present. No audio trimming, tempo change or child-AAC joining was used.
- Real child one uses voice-ledger **1.0**, four full clip-level measured cues. Child two uses **1.1**, eight caller-declared caption cues over the same four full clips. Independently reconstructed all eight segments from Unicode text ranges, recording start samples and authored sample ranges, then added the exact 1,032,000-sample / 516-frame scene offset. All twelve global cue IDs, texts, original coordinates, global samples/frames, timing provenance and nearest-millisecond VTT match. No cue overlaps the card.
- New global VTT is intentionally nearest-ms. Local 1.0 VTT retains its outward rounding; the new sidecar is not a promise of identical old VTT timing bytes. Full local artifacts are retained unchanged.
- Extracted actual seam and caption-boundary frames. Viewed the card at 498, caption transition at 556→557, and cleared caption by 602. The first authored segment changes from “The example listens” to “on port three thousand.” as expected; card has no caption. These sampled stills are not continuous playback or a listening assessment.

All receipt text is caller-declared, not an independent transcript. Zira technical-fixture labels are retained; no Chen or naturalness claim is established. No voiced word alignment can be inferred from byte or timing matches.

## Earlier task refusal and preservation

`checks.mts` / `checks.json` / `checks.log` independently reproduced the exact refusal for historical child `19c33c266d4e6d4b70d7e8160123fa0d7ba5cc245589de098393940ca279fb6f` in both input-state and after-state:

`PRESENTATION_INTEGRITY: Voice derivation differs: voice-manifest.json`.

Attempting sequence assembly with that child's correct recorded manifest also rejects before media-tool use. This is not a successful migration. The rejected voice task is `11fd3a7e3b5bebf0543f1bcbe7754ffc1e33c253b26455264bb2a6c22969b36c`.

Comparing its stored ledger to the later accepted 1.0 ledger shows the earlier `events` contain only beatId/frame/sample. The later events additionally include kind, claimIds and relativeToClipStartSamples. Implementation fingerprint and task ID also differ. The current derivation therefore does not accept that earlier representation. This observation does not independently establish whether the original artifact was valid under every historical implementation, nor whether it was corrupt; do not describe it as corruption merely because current verification rejects it.

The candidate uses later retained child `cc06313b6aba522f69c4631cf5ab7e17e4be5e5e0a61703723df2c17638b56da`, whose full closure independently verifies. This does not repair or reapprove the older child. All **29 original task JSON rows are byte-identical** before/after assembly; **316 of 317 input files** are byte-identical. Only `tasks.sqlite` changes as new sequence records are added. Old artifacts were retained rather than silently rewritten. This explicit legacy limitation must remain in the handoff; a blanket “all previous successful voice tasks work” claim is unsupported.

## Offline export and tamper checks

With FFmpeg and FFprobe disabled, both accepted children and the new sequence validate; completed resume reports cached. Sequence export and repeated export succeed. All **58 export files**, including original child MP4s, receipts, editable provenance and new PCM/VTT/ledger, exactly match the frozen bundle. Repeat export is reused.

In judge state copies, corrupting the real 1.1 caption binding, voice ledger or captured source makes sequence status reject with `PRESENTATION_INTEGRITY`; every file was restored and final status verifies again. Together with the two old-state refusals and assembly refusal, six negative executions are recorded. Broader mixed-project, legacy-sequence, schema and sample-budget negatives from the unchanged-code prior review are impact-reused, not rerun or newly counted here.

## Remaining boundaries

No new blocker/major for this frozen Express evidence addition. The rejected historical child is a recorded limitation, not a compatibility pass. No fresh render/cancel race, full default suite, device playback, subjective listening, automatic transcript verification, arbitrary repository support, four-scene or five-minute stress render was performed by this judge. The earlier review's code-level restrictions and own test evidence apply only where source identity is confirmed. Final owner AV remains pending.

Raw evidence and scripts are adjacent to this report; no candidate/source correction was made.
