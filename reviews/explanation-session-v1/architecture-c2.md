# Independent c2 author-handoff recheck

Candidate SHA-256: `e7d7cacceff5573801aaca20aa6a5c3aaf73169adedd4e5cc81717553cfe87c0`.

**PASS_BOUNDED — c1 major F1 is fixed. No new blocker or major found.** I followed the new packet from a genuinely empty state through successful proposal and needs-evidence submission, and verified historical packet identity and descendants. This does not certify automatic authorship, semantic correctness of arbitrary submissions, or final audiovisual acceptance.

## Identity and code impact

Verified all **99** listed files for safe unique paths, length and SHA-256; the candidate and previous candidate identities; the exact source ZIP; and **622 extracted source files**. The actual six-file c1→c2 difference matches the manifest. The remaining **616** source files are byte-identical. The previous c1 source-to-Git-base verification is reused by impact. Final post-test identity check passed.

The new `explanation-author-packet/1.0` field is included in newly submitted StartInput, and therefore in task identity. New packets replace the generic project instructions with the exact `explanation proposal` command, requested audience/language, source bindings, a strict runtime-derived submission schema and prefilled proposal/needs-evidence envelopes. They remove the obsolete capture schema and standalone proposal draft. Unsupported instructions name its required reason fields. The packet explicitly says this session has no evidence supplement command and describes creating a new request, optionally retaining the commit ref.

Old StartInput omits the optional packet profile. Its reconstruction continues to use the original packet format, and its manifest omits the new field. Extracting `authoringDraft` preserves the old standalone authoring bytes. The protocol does not silently mutate old receipts or pretend the old packet had been correct.

I read OPERATOR, the actual contract, new packet implementation and all changed code. I did not use builder scripts/results or another judge's verdict as proof.

## Fresh start-only reproduction of the repaired path

`handoff.mts` created a new, initially nonexistent `fresh-state` using a counting simulated read-only GitHub transport that replayed the retained real Fastify README. This was an uncached start with no workflow database before submission. The transport is a fixture, not a new live network capture; that distinction is recorded in `handoff.json`.

I opened the resulting packet, read its source manifest/raw lines, copied its advertised proposal draft outside the receipt bundle, and authored a new proposal rather than copying the builder's completed submission. It explains the pinned callback example's port 3000 and root GET handler/greeting object, with exact source lines and explicit illustration assumptions. The packet had already filled the correct session/snapshot/request/language/authorship bindings and audience.

I executed the packet's exact `submitCommand` through an actual PowerShell/`pnpm gve` process, replacing only `<SUBMISSION_JSON>` and `<STATE>` and using the engine directory as instructed. It exited 0, returned `awaiting-plan`, and created the required workflow state through the correct session path. The returned proposal hash equals the canonical authored proposal hash. Semantic/editorial/audiovisual/owner reviews remain pending.

I separately filled the advertised needs-evidence draft with a reason and exact citation and ran the same packet command. It exited 0, returned `needs-evidence` and a null proposal hash. No project command, manually created workflow or implementation knowledge was needed to get either accepted author checkpoint.

The exported `submission.schema.json` is deeply equal to `z.toJSONSchema(Submission)` from the runtime validator. Seven independent negatives rejected changed language, session ID, snapshot, audience, an extra nested claim field, a changed quote, and an invalid unsupported-mechanism assertion for a proposal that declares only the supported HTTP family. These checks distinguish general schema validity from exact per-session binding. Repeat start used the same new identity and verified cache without calling the deliberately failing transport; repeat proposal also returned cache.

This directly resolves the c1 failure: a start-only recipient now receives and can execute the correct session command with the required envelope. Separate presentation planning remains explicitly required after `awaiting-plan`; this review did not treat that checkpoint as a rendered video.

## Historical identity and regression

Using an untouched copy of the original frozen c1 state, I independently read/exported all three old start checkpoints and compared every payload file with my c1 packet exports:

| Historical case | Byte-identical packet payload files | Descendant replay |
| --- | --- | --- |
| Fastify | 12 | Same render ID, cached `preview-ready` |
| p-queue | 10 | Same render ID, cached `preview-ready` |
| fd | 10 | Same author ID, cached `unsupported` |

The old start IDs, saved packet hashes and absent packetProfile field were retained. All 13 original c1 task JSON rows remained unchanged. Media-tool locations were invalid during these completed-stage resume checks. These were new compatibility executions, not a restatement of the builder's result.

Typecheck passed. The changed intake/authoring/proposal-mapping suites passed **13/13** tests. Final frozen identity check also passed.

## Reused evidence and boundaries

The c1 three-repository source/fact checks, two complete video decodes, exact media identities, technical media limits and retained cancellation history are reused by code-impact analysis. The rendering and factual example content were not changed by this fix. I did not re-fetch GitHub, create a new presentation plan/video, decode c1 media again, perform live render cancellation, generate speech or listen to audio in c2. The session remains a silent technical-preview interface with explicit agent authoring and pending semantic review, not an autonomous arbitrary-project video generator or a 90% readiness assertion.

Raw evidence: `identity.mjs/json`, `handoff.mts/json`, `commands.json`, `handoff-rerun.log`, authored submission/negative files, private new and historical exports, `focused.log`, and `typecheck.log`. The initial judge harness could not resolve a bare `zod` import from outside the extracted package; correcting that scratch-only import to the already installed source dependency resolved it before state creation. The original failure log is retained. No candidate files were altered, and no target repository code or paid service was executed.
