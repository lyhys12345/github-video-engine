# Independent product and video review — duration freeze v1

Candidate `candidate.json` SHA-256 `7f5588b650b0a390ca560e103ac73beb3b0c2a742f4ed07261799fefc89635fd`. Independently compared all 984 declared files against byte counts and SHA-256: 984 match, zero failures. Read OPERATOR and applicable material in exact-source copy. Other judges' findings were not consulted. All outputs of this review are in this directory; target repository was not executed.

## Verdict and scope

**Product: UNVERIFIED overall.** The independently executed focused tests below pass and the three frozen output media decode; no independent end-to-end creation/export of a new duration project or CLI failure test was completed. The 300-second case is a component-level compile, placement, mixing and boundary test, not a 300-second rendering. The actual extended video is a 76.75-second technical preview, not a finished film.

**Video quality: UNVERIFIED overall.** Static phone-size observations and technical decoding below are actual checks. Continuous viewing, listening, speech accuracy, naturalness, exact speech alignment, editorial quality and final acceptance are not assessed. Owner deferral of listening/continuous review is separate from a pass. AAC stream existence does not demonstrate intelligible or non-silent speech.

## Independently exercised input and limits

Extracted `source-exact.zip` into isolated `engine` and linked already available local dependencies. Ran `node node_modules/vitest/vitest.mjs run tests/presentation.test.ts`: 9/9 passed, log `boundary-independent.log`. These are frozen implementation tests run independently by this reviewer, not an independent new suite or CLI end-to-end replay. They cover invalid events/assets/citations/unsupported profiles/over-budget plans, schema 1.1 frame compilation through 7200 frames, 7201-frame rejection, exact 14,400,000-sample mix/last cue and one-sample overflow rejection; digital zero PCM rejected as `VOICE_EMPTY`, beat overflow as `VOICE_DOES_NOT_FIT`, and missing narrated voice along the tested command path. A synthetic sample with a nonzero last sample is accepted in the placement test; that does not establish that arbitrary imported audio contains intelligible speech. Tests do not render a 300-second movie.

First run in the sandbox had two EPERM failures creating artifact hard links; the same tests in the isolated copy outside the sandbox passed. The bundled builder log `boundary-tests.log` says eight tests; independent current exact-source run reported nine. No inference about another execution is made from the different count.

## Actual media and stills

Independent ffprobe and full ffmpeg decode to null of each frozen final MP4 succeeded (exit 0):

- Extended Express: H.264 720×1280, 24 fps, 1842 frames, 76.75 s, AAC 48 kHz; MP4 SHA-256 `2a30788d303b0910977570cacd5cedc3f2d4b50e13f313b27441288529b8ed17`.
- Short Express: 480 frames, 20 s, H.264/AAC; MP4 SHA-256 `a085206167bcce3564826ba9dadc88f5de125f4efbeebc8898180cc5854f8b86`.
- Short rembg: 540 frames, 22.5 s, H.264/AAC; MP4 SHA-256 `a98ad137285eccdd6cc69d4361e124724fddb70c7b763c34c57d0b7827a98b7d`.

Independently decoded and individually viewed 360×640 images from the extended MP4 at frame 5, and both sides of all three declared frame-range joins: 479/480, 959/960, 1439/1440, plus final frame 1841 (`long-01.png` through `long-08.png`). Paired join frames preserve the same scene and visible caption; no obvious single-frame scene or subtitle jump is visible at these exact cuts. This is not a continuous-playback or audio splice assessment. Captions seen at the joins correspond to VTT lines about root path, registration, and the send call; final frame has no subtitle, consistent with final cue ending at 75.679 s. VTT explicitly says transcript caller-declared and speech alignment unverified.

**Presentation risk, moderate:** inspected phone-size images use a sparse client/server card diagram with repeated `Read ...` titles; at the examined joins much of the screen remains unchanged, giving a diagnostic-slide appearance. Captions are small and near the bottom edge. A zero-context viewer can see named client, server, root handler and request labels, but the inspected stills alone do not establish an understandable causal sequence or effective pacing. Actual phone player overlays and accessibility were not tested. This risk is not an assertion that unseen motion or unheard narration fails.

I also individually viewed actual 5-second stills from both short videos (`express.png`, `rembg.png`): Express shows the request diagram; rembg shows a bird and command illustration, with the command extremely small at this size. This is a limited static regression sample; frozen short MP4 hashes match the prior reviewed versions, and I did not run fresh short-project renders. No broad semantic, spoken content or quality pass follows from these checks.
