# Independent architecture / evidence / content-facts review

Candidate SHA-256: `d34af12c5434725bda538248fb6462642bc23abe60e20ebf7cdf897f9663b582`.

**Overall: CHANGES_REQUIRED. Architecture and mechanical provenance: PASS_BOUNDED. Content-facts source support: FAIL, one major M1.** No target repository code was executed. No other judge report was read. OPERATOR was read as the contract, not as independent proof.

## M1 — documented default behavior is not supported by its selected claim citations (major)

Locations: `evidence/real/fd/submission.json` and `evidence/real/ripgrep/submission.json`, `proposal.claims[id=default-rule]`; their corresponding mechanism default rule references citation index 0. The claims are carried into the actual saved proposal/plan/trace and exported materials.

- fd says "The default enables hidden-entry filtering in the file walker." Its two citations are main.rs:308 `ignore_hidden: !opts.hidden,` and walk.rs:352 `.hidden(config.ignore_hidden)`. These express a boolean relationship and forwarding, but do not establish the option's default or the API's filtering contract. Neither citation shows that opts.hidden is false by default. The actual captured cli.rs:32–37 explicitly documents default skipping, dot names and the continued effect of ignore rules, but the default claim does not cite it.
- ripgrep says the default enables hidden-entry filtering and files beneath a hidden directory do not enter the illustrative result. Its only citation is hiargs.rs:895 `.hidden(!self.hidden)`. This does not establish self.hidden's default, directory pruning semantics or the example's result. The captured GUIDE.md:177–191 explicitly describes default filtering and hidden files/directories, but is not cited by the default claim. The later include claim cites GUIDE.md:197 only for the flag, which does not cure the default claim's missing support.
- The default/result illustration can be legitimate, but the material must separate the documented tool rule from the synthetic reducer's descendant propagation. A documented citation to a boolean expression is not evidence that the selected synthetic tree was traversed or yielded those results. The media's synthetic/not-run labels correctly avoid claiming actual execution; M1 concerns the claim-to-evidence contract, not an allegation that the described defaults are false.

Reproducibility: inspect the saved claims and their exact quoted ranges against the numbered/raw source files. `checks.mts` independently confirms all quotes match the stated bytes and are accepted by `verifyProposal`; that is precisely the distinction between integrity and entailment. A separate non-persisted semantic-prose mutation is also accepted by the structural verifier, consistent with pending semantic review, not itself a software defect.

Suggested bounded correction: add exact pinned documentary ranges that state the default and hidden-vs-ignore boundary to each relevant claim; retain the source-selected code link required by the session contract. For fd, cli.rs:32–37 is already captured. For ripgrep, GUIDE.md:177–198 is already captured. Explicitly describe descendant/result propagation as this synthetic model's inference or assumption, or add sufficient pinned implementation evidence for the stronger factual statement. Revise the author materials and regenerate the dependent proposal/plan/trace/receipts under new identities. Do not rewrite the old artifacts. No automatic language-understanding checker is requested.

## Frozen identity and inspected implementation

- Independently hashed all **653 source files and 362 evidence files**; no mismatch. Source ZIP SHA-256 `2f522be1079d253bcfc81387d0861a062807c8ec7359d84bc3a17502365ffe9b`; manifest `b898feeaee115400c64926c7e7b2d52103f7dafb50f0570655de2e2c9e4e3072`.
- Independently archived Git base `8edb5ef0f5598ec3f56688b811d184b99b14ccaa`. The exact 19 changed/new paths match the declaration; 634 other candidate source files are unchanged. Raw comparison: `git-diff.json`.
- Read the request, submission, proposal, presentation contracts; session binding/validation; authoring identity and exact quotation verifier; compiler; tree/policy reducer; renderer; relevant compatibility and timing paths.
- New request 1.3 selects the capability explicitly, packet 1.4; submission 1.1, nested proposal 1.2 and presentation 1.4 are separate branches. Capability enters the authoring request identity. Session validation ties the selected rule reference to a documented claim and a selected sourcePaths file. It does not claim semantic entailment.
- Original `StoryProposal` and `Submission` remain old-only serialization branches. `HistoricalPresentationPlan` retains old narrated schema bytes. The legacy unsupported mechanism set is unchanged. New unsupported is explicitly unsupported-operations. Existing packages are not automatically upgraded to the new module.
- The model is deliberately bounded: two policy beats, 3–8 entries, three levels, short ASCII POSIX-style names, <=5 result files, synthetic basis, silent preview. It is not arbitrary multi-beat authoring, a filesystem executor, a gitignore implementation, or automatic project interpretation. Timing-check rejects the new module; that limitation is documented.

## Independent execution and provenance

`checks.mts/json/log` are independent scripts/results, using copies of saved engine states with explicit Node fetch disabled during replay.

- Re-ran focused url-intake, presentation, concurrency-queue and agent-authoring suites: **52/52 passed** (`focused.log`). Typecheck completed successfully (`typecheck.log`). No full default-suite claim is made.
- Independently parsed both real proposals/plans, verified exact source quotations and binding, and recompiled each. Default descendants with blockedBy are `unvisited-ancestor`, absent from consideredIds and results. Include-hidden results contain the model's files. Ignore rules are `unchecked`, order `illustrative`, tree `synthetic`, execution `none`.
- Own negative checks reject altered quotations, proposal hash mismatch, parent cycle, reversed policy order and inadequate animation/settling interval for both projects (10 cases). These do not execute source text.
- Replayed status and actual receipt export of both saved preview checkpoints and compared complete exported payload closure byte-for-byte.
- Independently fetched **all seven source files** through public raw GETs at their exact commits and compared bytes with the source manifest: fd README, cli.rs, main.rs, walk.rs at `cc4e40fa4e32d61733cd72926e233a3fb6c8d56d`; ripgrep README, GUIDE.md, hiargs.rs at `af60c2de9d85e7f3d81c78601669468cf02dabab`. All matched. See `remote-sources.json` and saved remote text. An initial PowerShell path construction error and sandbox DNS restriction were corrected before this successful check; neither was a candidate fault.
- Copied and independently replayed/exported five historical author packet formats: preprofile, 1.0, 1.1, 1.2, 1.3. All **10/13/14/14/17 files** respectively remained byte-identical and packet hashes matched.
- Old fd unsupported task `dbdfdf660403111463b8f02585a30d30d8432cef9991363b6fc9942a07404f46` retained unsupported stage, full original reason and all **12 original payload files**. New capability did not reclassify it.

## Actual media and factual labels

- Independently FFprobed both existing MP4s: single video stream, 720×1280, 24 fps, 240 decoded frames, no audio. Independently full-decoded both with FFmpeg and checked all frame PTS against n/24 (within 1 microsecond). No fresh render was required for these checks.
- Extracted and inspected actual frames 66 and 186 from each MP4, not merely builder PNGs. The default frame shows skipped hidden directory and untraversed descendant, while include-hidden shows the descendant among illustrative paths. A direct hidden file in fd is separately skipped. Synthetic/no-target-execution and unchecked-ignore/order labels are visible.
- These labels avoid claiming `--hidden` disables ignore rules or that shown paths are measured real command output. The reducer never sends a focus/consideration step to a pruned descendant. The two examples share a renderer/reducer, with project facts supplied through authored inputs; source code has no repository-name branch for the model.
- The fixed two-beat layout is an honest limited capability, not fulfillment of arbitrary content-driven storytelling. Sampled still inspection and technical decode are not continuous perceptual acceptance. No voice synthesis/listening was performed because these are silent examples.

## Limits and disposition

M1 remains open and prevents the content-facts role from passing this candidate. The source assertions can be repaired using already captured evidence; preserving pending semantic labels does not waive the independent facts gate.

I did not freshly run Git API capture, rendering cancellation/recovery, or the two historical narrated media re-exports; provided evidence for those was hash-checked only. I did not execute fd/ripgrep, invoke paid services, modify shared source, or modify frozen artifacts. Report, independent scripts, copied states, exports and extracted frames are confined to judge-architecture. Raw evidence includes identity.json, git-diff.json, checks.*, remote-sources.json, *-compiled.json, *-probe.json, *-actual-*.png, focused.log and typecheck.log.
