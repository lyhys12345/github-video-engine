# Presentation narration v1 — independent architecture / evidence / content-facts

**Architecture PASS; evidence PASS; content_facts PASS for the bounded technical contract.** No blocker/major found in this review. Content-facts PASS covers the documented example claims, script/subtitle text and inspected schematic images; **actual speech transcription, voice identity by listening, naturalness, word-level synchronization, continuous AV and final owner approval remain UNVERIFIED/pending**. These are separate dimensions, not implicitly passed by the role verdict.

Review date: 2026-11-03. Windows, local Node 24 / FFmpeg / FFprobe. Contract: `docs/presentation-narration-v1.md`, `src/presentation/narration.ts`, existing variable presentation contract; role definitions in `reviews/judges-v2/roles/evidence.md` and `content-facts.md`, plus explicitly assigned architecture role. Read OPERATOR as required, actual source, inputs and source/voice receipts. Did not read builder verification scripts, result summaries/logs, or other judge reports. OPERATOR claims were not accepted as proof. Worked only in this judge directory and copied state; no target project execution, paid request, network generation, deployment or candidate change.

## Identity and independent work

- Candidate SHA-256 `0a3b53df40561913ad8cdc7caf6106257d49cd7a5de1c45676564f9eae0bb767`.
- Actual source commit `20c435831267cb8de397cfd35f51f744bb8c9003`; actual Git tree `0f9ceb3af0e081529296fce14d6e0e07f4bd0602` matches manifest.
- All **553** listed files match lengths/hashes, checked initially and again at end. All **507** canonical archive files match Git blob IDs. Exact-runtime archive has **58** CRLF/LF-only differences; no other difference. Testing used exact-runtime source. Full record: `identity.json`, script `identity.mjs`.
- Independently rederived current renderer codeHash equals both final preview environment records (`probe-results.json`). Audio source/receipt identity was checked through the live copied TTS store and independently against the exported files.
- `pnpm typecheck` passed. Focused independent rerun: `tests/presentation.test.ts` 5 tests and `tests/voice-handoff.test.ts` 2 tests, **7/7 passed**, including native saved binding/revision/CAS tests. `typecheck.log`, `targeted.log`. Offline dependency installation used cached packages with `--ignore-scripts`; initial sandbox symlink denial required local filesystem permission. No downloads/lifecycle scripts/target code.
- `probe.mts` independently checks two complete exported/CAS chains, exact sources/claims and all nine clips; independent full decode/re-encode described below; six scratch tamper cases.
- `bindings-probe.mts` independently exercises 11 invalid/stale binding cases, one real new timing revision, successful explicit rebinding, cache reuse and old-movie preservation. Total **17** rejection cases across both scripts, all rejected as expected. Raw results/logs retained.

## Architecture: exact binding, rate and timing

New voice and narrated-preview task kinds are separate from historical silent-preview records. Voice binding names an exact plan task, raw plan manifest hash and proposal hash; each beat requires one recording with exact transcript and text hash, TTS receipt fingerprint/hash and audio hash. `readLocalTts` checks local-import adapter input, media/hash, receipt label, no remote request ID and local-import charge basis. Arbitrary display labels do not prove identity: `windows-sapi-zira-technical-fixture` only enforces the explicit declared Zira label; the documentation correctly calls this a declaration, not a biometric or generation authentication check.

The new path accepts `playbackRate` only as literal 1. It probes captured bytes, verifies the measured container matches the receipt, fully decodes without `-t`/trim/atempo, normalizes to 48 kHz mono PCM16, and places complete decoded samples. One 24 fps frame is exactly 2,000 samples. Placement must fit the assigned beat, otherwise it fails and reports actual samples, available samples and required extra frames. Missing clips do not silently produce a successful narrated video. The scope remains ≤60 seconds; resizing the plan requires an explicit new task, not automatic truncation or speedup.

Every placement in the actual two movies was independently verified. Full decode of each original WAV produced byte-identical saved normalized PCM; this verifies rate-preserving conversion for these inputs. The independently zero-initialized full mix, populated only with complete clip PCM at its specified sample offset, is byte-identical to exported `narration.pcm`. Thus first/last samples, silence gaps, sample count and no overlap/truncation are covered, not just container duration. Original raw audio bytes remain preserved.

Clip-level captions are generated from measured sample windows. VTT uses outward millisecond rounding; burned captions use outward frame rounding, so they may persist by less than one video frame beyond the exact sample endpoint. I independently regenerated the VTT exactly. Event offsets remain explicit authored timing; the ledger records their relative sample positions. Neither the code nor this report establishes the spoken word at an event instant.

## Actual audio and movie evidence

All nine input records declare `Windows SAPI`, Zira registry token, rate 0, and exact text. Their SHA-256 values match the original WAVs under `work/operator/wav`, copied local-import receipts and exported originals. The final artifacts carry the exact label `Microsoft Zira Desktop / Windows SAPI / rate 0 / technical fixture`; they do not claim Chen. I did not independently regenerate SAPI or hear/transcribe those recordings, so that source-generation identity remains receipt-based.

| Project / beat | Exact declared script | Measured placement seconds | Decoded samples |
| --- | --- | --- | ---: |
| Express/listen | The example listens on port three thousand. | 0.291667–3.515667 | 154752 |
| Express/request | Send a GET request to the root path. | 5.125000–7.904063 | 133395 |
| Express/match | The root path matches the registered handler. | 10.125000–13.293854 | 152105 |
| Express/response | The handler sends Hello World. | 15.125000–17.699125 | 123558 |
| rembg/input | Both options use this same input image. | 0.291667–3.370688 | 147793 |
| rembg/normal | Choose the standard command. | 4.125000–6.429146 | 110599 |
| rembg/cutout | The regular output removes the background. | 8.125000–11.348917 | 154748 |
| rembg/mask-option | Use the mask only option. | 13.125000–15.484146 | 113239 |
| rembg/compare | Compare the cutout and the mask. | 17.125000–19.644104 | 120917 |

Raw exact sample endpoints, per-clip original/receipt/PCM hashes and full source claims are in `probe-results.json`. Times above are rounded for reading; assertions used integer samples.

Both final MP4s independently pass full FFmpeg decode, have 720×1280 H.264 /24 fps plus one 48 kHz mono AAC stream, and have correct frame counts and stream duration. Express: 480 frames /20 s, SHA `a085206167bcce3564826ba9dadc88f5de125f4efbeebc8898180cc5854f8b86`. rembg: 540 frames /22.5 s, SHA `a98ad137285eccdd6cc69d4361e124724fddb70c7b763c34c57d0b7827a98b7d`.

**Additional independent AAC proof:** I encoded each independently reconstructed full reference PCM with the specified native AAC 128k encoder, extracted ADTS AAC from that new file and from the final MP4, and compared the complete bytes. Both are **byte-identical**. Express extracted AAC SHA `26b198769d09ecc856dc0ebd0b7607314cf224bce01fca2ae81e23bd2e01e81b`; rembg `03bd68bf964080f526193a4437f9bef489dff989a8a6bce534d9aa3d1abfabaf`. This establishes that these final audio streams are exactly the expected encoding of the complete verified mix, including padding/codec behavior under this toolchain. It does not establish correct pronunciation or pleasant speech. AAC is lossy; source PCM and decoded AAC are not asserted sample-identical.

Task chains:

- Express plan `dffa4b5231e1a51193c0315b64df76a9181fafda865baa2918103c7c5ceb16f9` → voice `7001d9868a95f2b95248b457bad4b911c70b49347e9bedf7d6fd44cd6b3e9b33` → movie `cc06313b6aba522f69c4631cf5ab7e17e4be5e5e0a61703723df2c17638b56da`.
- rembg plan `ccd0ee2c4450499630513d62d22d8d7532e6df072ede1f741f775f19546f8380` → voice `3920d496aa53cdd9a17c53d711b03067466579ae2389a841dda1e2fb4fb0df98` → movie `b5d578bc68f8092f25b5cd4b79d4cbff3612e97ad372c4ff2f9ffbb3b87038d9`.

## Source facts and assumptions

Personally read actual captured README passages, proposal text/claims, plan parameters, event trace and rendered samples. All citations independently matched raw source SHA and exact line ranges; final compiled trace rederived identically. No fresh GitHub network capture was performed in this review.

| Claim group | Pinned primary source | Supported scope and limits |
| --- | --- | --- |
| Express listen/port | expressjs/express commit `43fca52d28a422c8be48fd489cbd4f2d6152bab6`, README L45–47 | Example calls `app.listen(3000, ...)`. English script, title and `:3000` are consistent. Not a measured server launch. |
| Express route/match/response | Same README L41–43 | `app.get('/', ...)` and `res.send('Hello World')` support root GET handler and exact response. Request motion/matching is an explanatory diagram of the documented example, not captured traffic or measured latency. |
| rembg normal/cutout | danielgatis/rembg commit `e2c2e3f72701357b9bb3f2be32a4330d74ce8f47`, README L127–131 | Local-file background-removal command is documented and displayed exactly. No measured removal quality, speed or model internals are asserted. |
| rembg mask | Same README L148–152 | `rembg i -om path/to/input.png path/to/output.png` is documented as mask-only output. The displayed monochrome bird is illustrative, not actual pixels returned by rembg. |
| Same-input/comparison beats | Engine-authored explanatory staging, tied to the two documented command forms | Same geometric subject across colored cutout and mask makes the comparison intelligible. It is not a benchmark or a claim that two real runs were performed. |

Express README SHA `3cf5f3e224dbb9b5e2bc0ac255871de453762ae7a277f868da5f4a69d6ff2509`; rembg README SHA `8455c52c60130199ab61858d359f2d25440dd95772844e2b3a037e490b31179d`. Illustration asset remains engine-authored `paper-bird/1`, not a photographed or model-generated project result. No REA web content is mislabeled as Git evidence in these two stories.

Independently extracted and personally viewed both contact sheets from final MP4s (`run/express-contact.png`, `run/rembg-contact.png`), 180×320 per tile, covering each clip's start, an interior frame and end, plus first/last frame. Verified exact subtitles when present, disappearance at clip end, parameter/output labels and stable same-subject illustration. Every sampled frame states `Local voice · Illustration · No observed execution`; image outputs are labeled as illustrations. The exact frame list is in the raw results. Black trailing sheet tiles are layout padding, not movie frames. This is sample inspection, not continuous viewing/listening or a phone-legibility score.

## Changes and rejection checks actually run

Six independent CAS tamper/restore cases: raw audio, raw import receipt, normalized clip, full mixed PCM, VTT and captured source text. Each caused downstream narrated status rejection; restoration returned the original movie to verified state.

Eleven independent binding/dependency cases: missing clip, duplicate clip, changed exact transcript (with recomputed transcript hash), wrong receipt hash, wrong raw-audio hash, overflow, wrong plan manifest, wrong proposal hash, playbackRate 1.1, Express voice used for rembg, and old voice used after a real one-frame plan revision. All rejected. Concrete overflow report: 154752 required samples /2000 available /77 extra frames.

I then created the revised Express plan in copied state, explicitly rebound unchanged recordings, repeated that binding to verify cache reuse, and re-read the original movie successfully. New plan `d289fc06974da0fa15a01dce8286bb19e71f0459d56f3ad36aadecd821065944`; new voice `c0c1d2daaee483c6da64131ab2710c0079a870739b35323709c5a6397b668c63`. No revised movie was rendered in this review. This demonstrates exact timing-parent invalidation and retention, not a full narration regeneration/edit/AV acceptance cycle.

## Findings, limits and reproduction

No required-contract defect found. Important boundaries remain:

1. Receipt/text/hash equality is not speech transcription, authentic voice identification or rights certification. Source-generation records are caller-declared. A label alone cannot prove Zira or Chen. These actual candidate files explicitly use Zira technical fixtures; they are not replacements for the desired Chen Chinese films.
2. Source-cited parameter values remain author supplied. The structural binding cannot prove semantic correctness for arbitrary future input. This role independently checked the actual port, method/path, body and rembg commands.
3. `checkedVoice` reconstructs mixes from hash-verified stored normalized clips; it does not re-decode the original on every status/export. Initial binding runs the decoder. I independently re-decoded all nine final inputs in this review. The system is not a cryptographic-authenticity defense against unrestricted same-account replacement of every consistent database record, receipt, identity and media byte.
4. Word-level alignment, pronunciation, naturalness, sound level preference and perceptual cause-and-effect synchronization remain pending. Sample-math and AAC identity cannot promote those dimensions to PASS.
5. I did not run a new Remotion render, rerun the full default suite, regenerate SAPI, repeat cancellation/native publisher races, or re-audit old Chen recordings in this frozen candidate. OPERATOR assertions about those omitted operations are not adopted as independently reproduced. The two real movies were decoded and their audio independently reconstructed/re-encoded, which is distinct work.

Reproduce from this directory:

```text
node identity.mjs
node --import ./source/node_modules/tsx/dist/loader.mjs probe.mts
node --import ./source/node_modules/tsx/dist/loader.mjs bindings-probe.mts
```

From `source`: `pnpm typecheck`; `pnpm exec vitest run tests/presentation.test.ts tests/voice-handoff.test.ts`. Scripts/results/logs and independent PCM/AAC/probe/contact-sheet artifacts are retained here. Original candidate manifest files stayed unchanged after testing. Local failed test tasks intentionally remain in judge-owned copied state. Three role conclusions cannot waive another active role or final owner review.
