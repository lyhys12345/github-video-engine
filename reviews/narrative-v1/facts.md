# Narrative v1 / independent content-facts review

- Role: J5 content_facts, reviews/judges-v2/common.md and roles/content-facts.md.
- Scope: two complete authored five-scene narrative plans, their pinned sources and bundled linked Stories. Written content only, as explicitly clarified by the coordinator.
- Verdict: **PASS for written-plan factual semantics; engineering milestone acceptance UNVERIFIED pending frozen candidate/contract/activation manifest.**
- Independence: read original authored text and raw source files; did not read other judges' reports or use their votes. No shared implementation, tests, contracts or original evidence modified.
- Environment: Windows, PowerShell/Node; independent outputs in this directory. Review date 2026-11-04 local; mechanical check UTC timestamp is in checks.json.

## Version binding

| Plan | Canonical candidate hash | Packet hash | Required items |
| --- | --- | --- | --- |
| Express | e105516469088894691f446d755445ae407583c44a5e6add118cbfe0801b6058 | 54815d42260b90b9556ca92fba174984316ddb5a1093e8313191bbbcfb34a10c | 34 |
| rembg | 044e31d896626dc1a40db3cbfb583b864cdebbd58e5f3b6622431db43c70dbd3 | 3c12734439fa421fb131303894f01682efe42b341ebf84c1c77d5f6f75d23f87 | 33 |

The independent receipts bind these exact packets, not a future engineering build. Checks.json records exact bundle paths, every source hash, and receipt byte hashes. A changed packet requires a new review.

## Claim and scene findings

| Item | Raw support | Judgment and limits |
| --- | --- | --- |
| Express example-listens | source-1.txt lines 45–47, commit 43fca52d28a422c8be48fd489cbd4f2d6152bab6 | Supported: the example calls listen with 3000; no running server claimed. |
| Express root-match | same README lines 41–43 | Supported: documented GET root handler; route diagram is a reasonable explanatory representation of the code. |
| Express send-greeting | same README lines 41–43 | Supported: the handler passes Hello World to send; not empirical client-output capture. |
| rembg local-file | source-1.txt lines 127–131, commit e2c2e3f72701357b9bb3f2be32a4330d74ce8f47 | Supported: README labels the local-file input/output command as background removal. |
| rembg mask-only | same README lines 148–152 | Supported: -om is labeled mask-only. Comparing the same sample path does not claim output pixel quality. |
| Both briefs | All respective source lines above and complete plan text | Supported: source attribution and schematic/no-execution scope are explicit. |
| First three scenes, both plans | Read every narration, visual, title, caption, transition and linked Story | Supported within documentation/schematic scope. Express says Imagine and example; rembg repeatedly specifies schematic panels. No test output is substituted for real execution evidence. |
| Fourth scenes | Full plan/package contents and needs-evidence disposition | Supported as disclosure of an unresolved empirical question, not support for the unknown empirical result. No workload measurements or model-output set were supplied. |
| Fifth scenes | Closing text and absence of closing Story link | Supported as bounded future work; needs-adapter stays unresolved. No final video or observed-result adapter is claimed. |
| All execution units | Independently hashed linked Stories; shot IDs and links checked | Supported as planning links only. Does not establish actual renderer output, successful target execution, durable task-state closure, or full video assembly. |
| Estimated timing | Explicit estimatedSeconds fields | Editorial intent, not measured speech duration or AV synchronization. |

The receipts contain a separate judgment, reason and limitation for **every** required item, including all transitions and endings. All 67 reviewed items are supported in this strictly written-plan scope. Unknown empirical outcomes remain unknown; this verdict does not promote needs-evidence or needs-adapter scenes to executable scenes.

## Source and rights limitations

Opened the bundled Express README and MIT LICENSE, and the rembg README including usage and model/license sections. Express license includes notice-retention conditions. rembg README explicitly distinguishes model-weight licenses from the tool's MIT license, including a paid commercial-use condition for its described default model. Neither narrative claims unrestricted commercial rights, uses actual model output, or authorizes downloads/execution. The source package is not a clearance record for future photos, weights, audio, or rendered assets. Future production requires those materials' actual records; no legal certification is given.

This review verifies the local pinned source bytes and their recorded repository URLs/commit IDs. It does not independently re-fetch remote GitHub bytes or validate signatures. It does not endorse unrelated feature/marketing claims elsewhere in the README.

## Check record

Ran `node reviews/narrative-facts-independent/check.mjs` from the repository root; exit code 0. The independent script checks canonical packet/plan hashes, curated-versus-bundled plan identity, all supplied source byte counts and hashes, every claim's exact line range/quote, and all linked Story graph hashes and referenced shots. It writes checks.json and two receipts; it does not execute either target repository.

Initial attempted source lookups under fact-review/ and sources/ returned missing paths. Inspection established that source files live at each bundle root, as named in the packet. Successful source and hash checks use that root. These lookup mistakes are not source-integrity failures.

No media was generated, watched, listened to, or judged. No engine test-suite result is claimed. No paid API, deployment or target command was executed. No rendered-media or owner approval is granted.

## Remaining acceptance input and recheck

The coordinator confirmed that the frozen engineering candidate, contract and activation manifest are still being prepared. They are necessary for milestone acceptance and must be independently matched after freeze. This is an acceptance limitation, not evidence that these written narratives contain a false claim. Recheck the exact candidate/packet/source hashes and any changed scene text; repeat affected semantic review if hashes differ. The packet-bound receipts may be imported as written-content review only.
