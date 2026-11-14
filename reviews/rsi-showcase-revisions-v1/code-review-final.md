# Independent final showcase revision review

Reviewer: /root/rsi_revision_architect. Date: 2026-11-13. Disposition: scoped PASS. No remaining blocker/major found for the fixed engineering contract. Original findings in code-review.md and the earlier scoped code-review-recheck.md remain intact.

This is a technical approval of the bounded revision workflow. It is not creative, voice-naturalness, continuous audiovisual or final owner acceptance. The reviewer made no source changes and started no new showcase render.

## Final candidate and late corrections

Final src/showcase/revision.ts SHA-256: 7af445a82659928d9c6e10639e85b7fb37e27791982cbb3522350f506edf94dd. All six other source digests listed in code-review-recheck.md were independently rehashed and remain unchanged.

The first media run exposed a real receipt serialization mismatch: the publisher emits pretty JSON with a newline while the finalizer expected canonical bytes. The correction retains the exact supplied receipt SHA-256 check and compares parsed canonical structure against the expected task/file inventory. This accepts the actual publisher's formatting without permitting changed receipt bytes under the original supplied digest. The prior failed run remains a failure; it is not counted as a successful validation.

The final overlap guard rejects final destinations equal to, inside, or containing the draft publication container before publication. It uses resolved paths and relative containment; existing publication checks still reject linked path components. The guard only changes revision.ts, outside the rendering fingerprint source list.

## Independently executed final checks

Actual detailed results are preserved in independent-final-evidence.json and independent-standalone-evidence.json. The reviewer executed the following checks against retained real synthetic outputs; none regenerated media:

- Reloaded baseline and revised URL source/render tasks through their full integrity-checking loaders. Revalidated exact asset closure, source provenance, script/owner binding, output hashes and artifact inventories.
- Compared original and revised PCM buffers byte for byte. Both hash to ff897d27697643876908df847d38b553b9502a11824c3c08e501ffc7408f6c49. Narration descriptors, original audio bytes, local-import receipts, footage, font and pinned source bytes remain identical.
- Read the fresh raw script review and verified its exact hash 1b719f610e4804b473792f847b272f816c2d629e05849f41fca2581611145b74, TEST_ONLY reviewer, passing decision and new script hash. The baseline script review rejects the new script hash. The baseline retains one video review; the revised candidate has zero inherited video reviews.
- Reopened both exported and imported URL portable packages and the imported source task. Their exact fresh script-review bytes and source binding survive the round trip.
- Checked actual shot task IDs: the edited shot changes; the unaffected shot retains its original task with attempt 1. The saved runtime result reports one rendered and one reused shot. Decoded midpoint PNG hashes differ for the edited shot and match for the control shot.
- Ran current public CLI finalization with nonexistent browser/FFmpeg paths: nested, ancestor and same-publication output destinations were rejected; the nested output was not created. A disjoint exact retry reused the existing receipt and source task. The same operation through the now-advanced URL workspace rejected the stale baseline.
- Independently reopened and validated historical ArtCraft and O-B manifests, including 17 files/6 lines and 15 files/5 lines respectively. Their original manifest hashes match the root's retained after-validation evidence.

The URL fixture is D:/gve-anna-render-temp/gvsrev-57vXJS, with revision-evidence.json and its baseline/revised/export/import directories. The actual revised MP4 hash is 45387ed497e93bc4738f379315ebe9fa1272792c81b6501259428f1b51ce5457. It is a 12-frame synthetic engineering fixture, not a production video or creative holdout.

## Standalone reviewer-closure recheck

The successful standalone fixture is D:/gve-anna-render-temp/gvsstand-obdf0u. Independently reading its finalized manifest retains standaloneReviewSha256 and the exact raw script-review bytes. Removing both the optional manifest review and source digest is rejected by the approved script's reviewPolicy; supplying a conflicting digest is rejected by the closure validator. The normal manifest's computed source task ID matches the actual exported render's source task ID. The moved package and imported task retain the raw review.

Verified standalone source task: adb534b6087cbd3f60020e9b56ce46a056339853f81dee54af61ad87bdda5e05. Exact script-review hash: c0af244b7da25c5efcca33cd6690f38fcc3a81155ce6e77ab555deb87d77dbce. This directly closes original finding R1. Original finding R2 remains closed by the exact per-shot description count, complete resulting shot specs in the review document, and the independently passed count regression.

## Executed versus inspected evidence

This reviewer independently ran the 7-file / 35-test regression reported in code-review-recheck.md and the final no-render checks above. The builder's successful 2-test real media run, final typecheck and full-decode assertions were reported and their retained output closures inspected; the reviewer did not rerun the showcase renders or full-decode command. The two late revision.ts-only changes are covered by the final actual CLI checks. No full integration/provider/Python regression was run.

Terra's separate anonymous four-frame inspection is the visual observation record. This review only compared the retained frame hashes. Sampled frame agreement and crop changes do not establish continuous AV quality, narration naturalness or audience retention. The low-resolution crop can enlarge source pixels; that remains an editorial tradeoff, not a failed technical cache test. Source facts, perceptual review and owner acceptance remain unverified/pending in the actual runtime outputs.
