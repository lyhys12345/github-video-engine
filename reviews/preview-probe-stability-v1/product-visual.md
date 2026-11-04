# Independent product / visual review — preview probe stability

Candidate `candidate.json` SHA-256 `a07052f525a69e67981ab88edd46e203a29fe95ecfd5991de487fbf948409d43`, matching requested version. All 1708 listed lengths and hashes independently verified; zero mismatches. OPERATOR and exact extracted source consulted; no other judge report used. The frozen candidate was not modified and no target repository was executed. Review scratch is this adjacent folder.

## Scoped result

**PASS for sampled product-visible scenes and independently exercised diagnostic examples.** Overall product, exhaustive cross-machine stability and audiovisual acceptance remain UNVERIFIED. Two assembly MP4 hashes differ; this does not by itself show a visible difference or establish bit-exact visual equivalence. No independent fresh renderer replay or end-to-end old failed-task recovery was undertaken.

## Actual two movies and stills

Independently ffprobed and fully decoded each actual sequence MP4 to null, both exit 0. A SHA-256 `f15bf2a6b363d07c386508c6bc5f2483685ec6b604a4d8365ca032ba9e494313`; B `954b07b0578208c8eb9ad85f8d30bbb939bc29728b3e60fecac78ec8b64161ec`. Each H.264 720×1280/24 fps has 1204 frames, duration 50.166667 seconds and 48 kHz AAC. Distinct bytes are a recorded limitation, not proof of visible impairment.

Independently extracted and individually inspected 360×640 images from both actual MP4s, each at frames 497, 498, 528, 558, 559, 583, 584, 619, 620, 1117, 1118, 1148, 1178, 1179 (`a-01`…`a-14`, `b-01`…`b-14`). In both, the comparison caption and fully visible cutout/mask panels coexist at the sampled start, middle and end in both children, preserving the previously repaired product expression. After the first scene, the visibly distinct card says `Separate example / Same case, new timing`, then the illustration resets. No substantive picture/caption discrepancy was observed at those sampled frames. This is not a framewise whole-movie comparison, audience study or continuous playback assessment. Command labels remain small at 360 pixels and captions close to the bottom; real device/player controls not tested.

Independently inspected the four exported child preview manifests: corresponding A/B SHA-256 hashes match (`80d1da62c1c7fe0daa6ef1e3a7b024b76d894d4a73fbb1fa675e958d1921d963` and `79290fd4f72259830e27971e31e2e3e48714a12adb62a4b63d51c0360f28236a`), each declares `ffprobe-no-location/1` and its `media.probe.format` has no `filename` property. This checks the frozen bytes, not an independent two-checkout re-render.

## Actual CLI and diagnosis

From exact-source extraction and a copied A state, independent `sequence-status` on `71536d5dd5cace2fc5d2f62505437e2766418949255080c3876d73f6e6941648` succeeded with integrity verified; transcript is caller-declared, speech alignment unverified and owner listening pending. Submitting a copy of the sequence with an all-zero expected child manifest digest exited 1 `PRESENTATION_SEQUENCE_MANIFEST: Preview manifest differs for original`, identifying the affected scene. An absent well-formed task returned `EXPLAIN_TASK: Task was not found`; malformed ID returned `PRESENTATION_SEQUENCE_TASK_ID` with the 64-character lowercase hexadecimal requirement. The wrong-digest message identifies the issue but does not itself explain how to obtain the current child digest, a minor usability limitation.

The old cancelled and failed task IDs named by the builder's negative fixture were absent from the copied A state: independent resume returned `EXPLAIN_TASK`, so this review did not reproduce their specific migration error. Source states that an unfinished historical preview without the new profile returns `PRESENTATION_RESUME_INPUT` with an instruction to repeat render explicitly for a new task. The builder's retained negative log describes separate self-consistent fixtures; that is builder-executed evidence, not this review's independent reproduction.

No listening, continuous watching, spoken-content or word-alignment verification, actual phone/device playback, full fresh two-checkout render, user testing or owner acceptance was performed. Zira is a caller-declared local technical fixture; AAC and decode success do not establish intelligible, natural or approved speech.
