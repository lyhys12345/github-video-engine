# Independent audience-audit code and evidence review

Reviewer: independent final code/evidence Judge. Date: 2026-11-13.
Candidate: uncommitted frozen implementation over baseline 193c01919c942030376dbe8d181686d602e7a1ca, as enumerated by work/rsi-audience-audit-v1/source-freeze.json.

## Decision

PASS for the bounded code/logic/evidence scope of A1-A6 and local A7 integration. No unresolved blocker or major implementation finding was identified in this review. This is not an all-A1-A7 delivery-complete vote: GitHub push and Google Drive handoff are remaining A7 release conditions, not verified here. Original-movie perceptual acceptance, continuous viewing/listening and final owner acceptance remain UNVERIFIED/pending. The separate actual-frame review is required and is not replaced by this report.

This judgment came from source inspection, independent execution and exact evidence verification. The first code/evidence assessment was formed without opening the Terra review reports. The root's later result document contains a summary of visual observations; that summary was not used to establish my code verdict. I did not watch clips or hear audio and do not claim to verify their semantics or naturalness.

## Exact frozen evidence

The 20 entries of source-freeze.json were independently rehashed and all matched. The workflow evaluator was independently recalculated from the literal implementation list and canonical path/hash pairs:

- Workflow evaluator SHA-256: d0a31f6ee8675caa8bbca20bcd6857eb1f15964bf3dda53796ce7ec5693ce765.
- ArtCraft bindings.json: b3b1f87ba3b7828e748fcd2fab7cc03510c9b5073d2d61fc2553f47295e04ed0; 30 inventory entries.
- OpenMAIC bindings.json: 735c5907d257185a087bada0a99478d538e48ec2cd0c6380bc1847e11a87b2ef; 24 entries.
- Durable checkpoint bindings.json: 5851363c904dd97eef0c8a5f1686087282c0f2283f0fc0e74956a9074a925e31; 15 entries.

For all three completed packets, every inventoried file's bytes and SHA-256 matched, there were no missing/unlisted files other than the intentional inventory self-exclusion, the workflow evaluator matched current source, and every nested renderer source hash and canonical aggregate matched. The packets were read only after bindings.json existed. These checks independently confirm 69 file entries, not just root's aggregate assertion.

ArtCraft original candidate: bfba63b87a5744de2e14d589adf8c70cd3c95b480605b8d234ed4aa44cb8b1a5. Seven samples: 127,136,150,158,170,178,197 of 735 frames (0.9524% still coverage). Original-derived clip [124,204), 80 frames, 2.666667 s video.

OpenMAIC original candidate: 5e7e52d3360117b12ff70433a1bc6f5b54576153fdd60ed14eceb18454b5bc5e. Five samples: 270,300,313,350,390 of 1375 frames (0.3636% still coverage). Original-derived clip [270,390), 120 frames, 4 s video. Frame 390 is a separate still outside that half-open clip.

FFprobe independently confirmed both clips are H.264 1080x1920 at 30/1 fps with AAC 24 kHz mono audio. This is technical stream evidence, not listening. Ten recorded original manifest/movie/script/approval/selected-narration hashes were independently recalculated and unchanged. Other loaded source assets are bound and verified by readShowcaseSpec/validateSource; this review does not invent a pre-run full-filesystem snapshot.

## A1-A7 assessment

A1 PASS, technical scope. Strict versioned request/report/bindings schemas, bounded input reads, exact source hashes, dedicated CLI route and new output directory keep this separate from quality/revision payloads. Historical media does not acquire fabricated completed runtime records. Report hashes bind manifest, normalized manifest, candidate, script, approval, font, timeline, renderer props, media and narration; nested renderer provenance records Chromium and source hashes. The packet is append/refuse-by-API plus a verifiable inventory, not OS-level tamper-proof storage.

A2 PASS, instrumented geometry scope. The production Showcase Reel mounts opt-in markers and a Remotion Artifact. FontFace loading, document.fonts.ready and selected media-image readiness precede measurement. Text rectangles come from DOM Range; clipping ancestors, layout bounds, source bounds, foreground sibling order and declared box/text/SVG regions are measured. No second approximate HTML is substituted. Phone images are Lanczos-scaled rendered pixels at 360x640, not reflow or a physical-device test. Largest-rectangle geometric overlap deliberately includes envelope whitespace; it is not an alpha/ink/contrast score or whole-compositor pixel analysis. Embedded video/image text remains UNASSESSED. The real browser test independently verifies exact production PNG parity with audit instrumentation off at the tested frame.

A3 PASS, mapping scope. sourceFrameAt performs actual anchor interpolation with rounding; showcasePanelSourceFrame bypasses parent anchors for explicit panel media or frame ranges and clamps independently. Correspondence traverses actual shot/cue frames, panel reveals and media hashes, with exact cue text, exclusive boundaries and source range validation. It rejects stale, duplicate and contradictory expectations. Workflow cross-checks DOM panel/source selections against timeline mapping. Tests cover parent interpolation, independent media/ranges and no-overlap cue edges. A mapping OVERLAP remains a declared-window calculation, not recognition of the depicted event. Missing bindings are exposed in JSON and sampled/clip-overlapping unbound cues are named in review.md.

A4 PASS, provenance and uncertainty. Saved speech report bytes/request bytes, approved script/line, WAV digest and byte count, transcript and original source duration must bind exactly. Recognition and forced-alignment methods remain distinct; unavailable/contradictory provenance and overlapping phrase timing are refused. Null/low-confidence/sub-frame or non-whole-phrase matching stays UNVERIFIED. The two real projects supplied recognition evidence; all four expectation speech results remain UNVERIFIED. ArtCraft confidences are approximately 0.2466 and 0.5670; OpenMAIC approximately 0.1535 and null. No report upgrades caption time to spoken-word truth.

A5 PASS for actual bounded exercise. Both requested existing projects have completed, independently verified packets with decoded original frames, original-derived AV clips and current-layout inspection. ArtCraft is explicitly authored-caption timing; OpenMAIC is estimated-caption display. Historical manifest/movie association remains declared and current timelines are reconstructed from bound original narration. The separate 12-frame durable checkpoint uses verified producer records, three samples and no clip. I independently compared the current read-only SQLite schema and every table cell against checkpoint-before.json: unchanged 12 tasks,24 task events,24 usage events,2 sqlite_sequence rows,user_version1. Recorded logical digest: dcc54f19cbf82b9129fe83e74cb0d8e01b338479cf9ced2d2f0103b36d8a07a5. No job-state mutation was observed.

A6 PASS for specified targeted engineering coverage. Independently executed 30 targeted tests and the real Chromium test, plus standalone TypeScript check. Browser assertions cover long captions within supported length, narrow labels, overflow vs clipping, annotation overlap, moving panels, cue boundaries, independent playback, production pixel parity and cancellation cleanup. Unit tests cover missing timing, stale/tampered bindings and existing-destination refusal. Initial builder failed-fixture execution is retained as an explicitly transcript-based account; it is not a passing run or a raw runner file. Initial real audit packets are preserved separately from final packets. This is not a full repository regression or continuous AV test.

A7 PASS for inspected local integration; delivery pending. Canonical Skill routes existing-candidate phone/text/action feedback to this audit and keeps agent-authored requests, independent review and exact approval for production edits. The workflow describes bounded repair/re-review, immutable originals and marker-last publication. The completion roadmap has concrete onboarding, demo-selection, speech-observation, repair/recovery, delivery and supported-host exit criteria. Test catalog classifies both new files. Actual GitHub push and Drive handoff, including exclusion of private voice/media/config/models, must be completed and verified by root before A7 is called delivered.

## Security, cleanup and compatibility observations

Inputs are parsed as strict data, rendering uses approved local assets, and this path does not execute target repository code or call paid services. Local FFmpeg/FFprobe input formats/protocols are restricted. Artifact path shapes and ancestry checks prohibit unexpected traversal/symlinks, staged evidence is inventoried, and original inputs are copied into scratch. Checkpoint opening explicitly uses readOnly=true and audit baseline loading omits unrelated review loading/mutation. Default revision-baseline shape is preserved outside audit mode. Existing legacy-retry.json reports reused=true and renderTasksStarted=0; this is inspected historical compatibility evidence, not a retry I executed.

Publication reserves the new destination with mkdir, moves files and moves bindings.json last. It is not an atomic whole-directory rename. An interrupted publish may leave a partial directory; no valid completion marker means no completed packet, and the API refuses to reuse that directory. Current docs now say this explicitly. Cleanup removes owned stage/runtime scratch and does not roll back/delete the original candidate. Cancellation cleanup was independently exercised by the browser test. No claim is made about hostile concurrent filesystem replacement or interrupted-publish fault injection, which were not separately tested here.

## Commands and independent results

Working directory for all commands: D:/gve-flagship-publish.

```text
pnpm exec vitest run tests/showcase-audience.test.ts tests/showcase-quality.test.ts tests/showcase-reel.test.ts tests/showcase-revision.test.ts tests/speech-alignment.test.ts tests/cli-routing.test.ts
# 6 files,30 tests passed; start21:40:20;7.03s;exit0.
pnpm exec vitest run tests/showcase-audience-render.media.test.ts
# 1 file,1 real Chromium test passed;start21:41:04;39.89s;exit0.
pnpm exec tsc --noEmit
# Standalone final command exited0, no diagnostics.
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,nb_frames,duration -of json work/rsi-audience-audit-v1/artcraft-audit-final/candidate/clip-124-204.mp4
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,avg_frame_rate,sample_rate,channels,nb_frames,duration -of json work/rsi-audience-audit-v1/openmaic-audit-final/candidate/clip-270-390.mp4
```

Read-only Node checks used fs.readFileSync, crypto SHA-256 and sorted-key canonical JSON to recalculate the literal workflow implementation list, each renderer sources array, all packet inventory entries, all source-freeze entries and the ten original hashes. Packet file enumeration was compared against inventory plus bindings.json. A Node DatabaseSync connection with {readOnly:true} selected sqlite_master ordered by type,name, selected all table columns, sorted serialized row arrays and compared each to checkpoint-before.json; PRAGMA user_version matched. This is an independent row-by-row comparison, not reliance on root's reported digest.

First sandboxed Vitest attempt failed before tests with EPERM creating node_modules/.vite-temp; approved escalation enabled the actual independent run. A sandboxed SQLite read failed opening WAL-associated state; approved escalation enabled a read-only connection. The WindowsApps python alias was unavailable, so read-only verification used Node. Initial git status in the restricted context failed with 'must be run in a work tree'; no Git configuration was changed. No source, test, contract or original evidence was edited by this Judge. Only this report and its separate transcript-preserved execution log were written.

The companion judge-test-execution.txt preserves my observed tool outputs. It is explicitly a transcript copy, not fabricated output redirection. No reviewer replacement or majority vote was used to waive a failing requirement.

## Required closure conditions

1. Retain the same frozen evaluator/source hashes and all current evidence; any code change requires affected re-review and fresh packets where provenance changes.
2. Keep the actual-frame review and its dissent/limitations separate. Preserve tiny embedded text, unbound cue and low-confidence speech findings; no whole-film PASS follows from this report.
3. Root must finish/verify the authorized GitHub and Google Drive handoff actions and verify the committed file list excludes private voice references, configs, models and media. Until then, A7 remote delivery is UNVERIFIED.
4. Production changes remain explicit revision proposals with fresh exact script/storyboard approval. Final human acceptance remains pending.
