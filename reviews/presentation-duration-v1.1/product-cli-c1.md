# Product supplement: actual CLI state, exports and length edit

This supplements `report.md`, which is unchanged. Tests below used the exact frozen engine copy and copied `work/live` state under this review directory. No target repository executed and no additional long video rendered.

## Finding: misleading error for default kind (moderate usability)

For all three valid narrated task IDs below, actual `presentation status --task ID --data ../state` (no `--kind`) exited 1 with `EXPLAIN_INTEGRITY: Task identity does not bind its planning input`, classified permanent. `presentation export` with the long ID and no `--kind` failed with the same error. The CLI defaults to `preview`, while the correct explicit `--kind narrated` returns succeeded/integrity verified for each of these same tasks. Thus this is a kind mismatch presented to the user as an integrity failure, not evidence that these artifacts are corrupt. The narration operator documents the explicit kind; this finding concerns discoverability and misleading diagnostics when using the CLI default. Recommend explaining required kind or selecting it from the task rather than reporting an integrity failure.

## Explicit narrated path and historical bytes

Actual `status --kind narrated` succeeded with integrity verified for long `b9bdbf075c54eb13259e212c1ee7f43eed3b9e19b1c2951c6c7ac3e073484c8c`, short Express `3f1cea6b7a519136932d3575c50f3e0d6e8a45724c726488333344c3e78028d3` and short rembg `970ff58a7f15c6617121e6b44c8959663e716b50fa71bc735ffa81bffd62b321`. Fresh `export --kind narrated` for each succeeded, receipt-v1, review pending, in `supp-export-long`, `supp-export-express`, `supp-export-rembg`. Exported MP4 hashes respectively `2a30788d303b0910977570cacd5cedc3f2d4b50e13f313b27441288529b8ed17`, `a085206167bcce3564826ba9dadc88f5de125f4efbeebc8898180cc5854f8b86`, `a98ad137285eccdd6cc69d4361e124724fddb70c7b763c34c57d0b7827a98b7d`, matching frozen originals. These are historical existing narrated outputs; no new render is implied.

## Actual edit and rejection

Copied long plan `long-valid.json` changes first beat from 143 to 144 frames. Actual `project presentation-plan --id express --proposal bf03baf72d2e471743d53fdec488f03dd8023347c8537402299ba81319aa7502 --spec ../long-valid.json --data ../state` succeeded noncached with new task `15d1219ef906596fbf41cca36fb509398d876f6b4500fe62d29fb0158cf779ee`, total 1843 frames, different from old task `3cd1db0d3a09777f125ac79c49d40269d0f0e6c30bd2b38fcd75cb883b1e8d34` and its 1842 frames. After that edit, actual explicit narrated export of old long task into `supp-export-long-after` succeeded and its MP4 SHA-256 remained `2a30788d303b0910977570cacd5cedc3f2d4b50e13f313b27441288529b8ed17`. This proves retention/export of this original video in the copied state for this plan edit; no edited narration binding or new movie was produced.

The second spec `long-over.json` sets the first beat to 5502 frames, yielding 7201 total. The same CLI submission exited 1 with `PRESENTATION_DURATION`, stating a maximum of 300 seconds. This is actual CLI rejection of this over-limit input; the 7200-frame acceptance and placement checks remain the component tests documented in the original report, not an actual five-minute render.

## Overall scope

The explicit engineering paths above pass for the tested cases, with the default-kind diagnostic finding. Other product paths and a changed-length full render remain unverified. Continuous viewing and listening remain owner pending; these results do not establish subjective audiovisual quality or final acceptance.
