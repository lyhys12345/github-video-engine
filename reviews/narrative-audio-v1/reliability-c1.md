# narrative-audio-c1 / independent reliability + security

- Judge: audio_security_judge, 2026-11-05; Windows / Node v24.22.1 / local ffmpeg+ffprobe. Independent output: C:/Users/luyuh/Documents/Codex/audio-security-judge.
- Result: PASS for the narrated technical-excerpt integrity/reliability/security slice. No blocker or major found. Natural listening, actual speech/transcript alignment, facts, continuous perceptual AV and owner acceptance remain UNVERIFIED/pending and are not granted here.
- Candidate: narrative-audio-c1, commit 9ec1c6b83b6c7ebbbd41c39764a1db62df41cf7f. candidate.json SHA256 7419ad5cd233376fc1c6d32915d38efd48086d118bf14cdae7ea0c1e2a6aa112.
- Read main AGENTS.md, judges-v2/common.md and report template before raw evidence. Read candidate source/docs/narrative-audio.md as the explicit separate narrated contract. The older docs/narrative-technical-excerpt-review-contract-v1.md is the historical SILENT contract; this report does not claim narrated output satisfies that silent requirement. Parent must retain this scope distinction.
- Independence: no peer reports read. No candidate modification; no source snapshot, target repository, npm test, network, paid API or publisher executed. Raw evidence inspected before OPERATOR summary was used as context.

## One-page conclusion

The frozen materials match their manifests and candidate hashes. I authored audit.cjs independently and used only trusted local media decoders and standard filesystem/crypto APIs. For all nine available final narrated bundles (Express baseline/edit/relocated/restarted/recovered and rembg baseline/edit/relocated/restarted), decoded each raw recording completely to mono 48kHz s16le and proved byte-for-byte equality with its exact PCM placement. The entire remaining mix is zeros. Each is 672000 samples / 420 frames / 14 seconds with 30fps video, 48kHz audio and exactly one video, audio and mov_text stream; full media decode succeeded.

No actual listening was performed. Digital silence is proven for the exported lossless mix; AAC encode can introduce nonzero boundary ringing, so this does not assert every decoded AAC sample outside speech equals zero. Caption timing is authored, not speech alignment evidence.

## Clauses and evidence

| Requirement | Result | Evidence and method | Limitation |
| --- | --- | --- | --- |
| Frozen identity | PASS | Own audit.json: 739/739 source and 1232/1232 material files match bytes/hash. source/archive/material manifest hashes match candidate. zip.json compares all 739 archive entries to source manifest. | No Git commit object comparison; source archive/directory exactness is independently established. |
| 30fps / 48k / complete PCM / silent gaps | PASS | Own audit.cjs/audit.json; complete raw source decode and exact whole-mix reconstruction across nine bundles. Express clips 126000/131520 samples; rembg 126960/126720. Every clip stays inside its sourceSceneInterval and starts on 1600-sample frame clock. | PCM preservation is not content/transcript truth. |
| Caption complete text / bounds | PASS | Own audit: per-scene cue concatenation equals full ledger transcript; every cue stays inside complete clip. Source narrative-audio.ts lines 32-40 enforces exact text hash, Unicode character partition, no omission/overlap, frame projection and readability. | Did not independently exercise every invalid schema through engine runtime. |
| Changed text, stale review and tampering refusal | PASS (code + historical raw checks) | Source narrative-audio.ts lines 33,43-46,58: exact current narration before dispatch, receipt/source hashes, selected-scene bijection, reinspection and execution/PCM/VTT/ledger/packet closure. evidence/*/negatives.json contains seven rejection cases per project; revision.json preserves old-receipt refusal. Evidence real.ts shows probes fail if unexpectedly accepted. Affected log: 71 pass. | No fresh engine behavioral negative run. Builder logs are historical corroboration, not my execution. |
| Edit identities / relocation / restart | PASS | Baseline and edit task IDs and execution packet hashes differ in actual result/edit-result JSON. Nine media bundles independently decoded. checked() re-inspects input closure; TaskRunner cache verifies artifact hashes. | No new rendering or fresh cache run in this review. |
| Cancellation/recovery | PASS (read-only durable evidence) | Own recovery-state.json read directly from frozen SQLite: task 9dc4... started attempt1 08:31:29.076Z, CANCELLED 08:31:29.132Z, resumed attempt2/new owner 08:31:31.156Z, succeeded 08:31:34.097Z. Both terminal accounting outcomes agree. Recovered bundle independently passed media/PCM audit. tasks.ts initializes result:null/outputs:[] and commits only successful owned work. | Controlled cancellation/restart only; no force-kill crash proof. Cancelled transient output state not independently captured before overwrite; raw recovery.json states it and code establishes initialization. |
| Legacy clocks/schema/stream rules | PASS (code review) | narration.ts decodeClip(maxFrames) still delegates using legacy FRAME_SAMPLES (48k/PRESENTATION_FPS); new decodeClipSamples accepts explicit bounded sample budget. New narrative uses explicit 30fps/1600. Strict separate schema disallows old schemas. preview.ts verifyMovie defaults unchanged: silent1/narrated2; only explicit narrated mov_text adds one stream; new assembly additionally demands exact3. | No new legacy render; affected tests historical. |
| Input/process isolation | PASS (code review) | All audio staged to owned fixed index.audio/index.pcm; fixed movie/caption filenames; protocol_whitelist=file; explicit format; bytes/IDs/frames/samples bounded; shell:false. Author text goes to VTT/JSON, never interpolated into executable/filter commands. task signal propagates into owned child commands; process kill scoped to spawned PID tree. | General adversarial OS/media-decoder exploitation is outside this contract. |

## Actual commands and artifacts

- node C:/Users/luyuh/Documents/Codex/audio-security-judge/audit.cjs: exit0. Uses ffmpeg full raw decode, ffprobe stream inspection, full movie decode, own crypto and byte comparison. audit.json is raw result.
- node C:/Users/luyuh/Documents/Codex/audio-security-judge/state.cjs: final exit0. Uses node:sqlite readOnly:true, no writes to candidate. recovery-state.json retains event and accounting rows.
- PowerShell System.IO.Compression.ZipFile read-only per-entry SHA256: 739 checked, zero mismatches; zip.json.
- Initial Python launcher failed because WindowsApps python alias unavailable; no Python verification is claimed. Initial SQLite inspection queried nonexistent events table, then corrected to actual task_events schema; final evidence is the successful script/result.

## Findings / recheck

No blocker/major observed. Documentation-scope ambiguity is a minor integration note: keep the historical silent contract and the new narrated contract visibly separate in the gate summary. Never relabel this PASS as silent-contract compliance or speech/listening approval.

Future code changes require a fresh candidate and affected regression. A newly observed stale receipt acceptance, corrupt output acceptance, clipped raw recording, nonzero gap mix, incorrect subtitle count or cancellation commit would change this verdict. My strongest fresh execution evidence is media/byte integrity; dynamic engine rejection and lifecycle are reviewed through frozen raw records and code rather than fresh engine invocation.
