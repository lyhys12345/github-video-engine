# Mechanism media runtime v1 — independent architecture/evidence/content review

Verdict: PASS for the bounded eight-second silent mechanism media task. No unresolved major/blocker found within this scope. This is not approval of a complete narrated video, arbitrary-repository generation, audience quality or final owner AV acceptance.

Candidate SHA-256 (candidate-hashes.json): 599cd65504fb2648d34be4ae44f80a3644b62c682b0c6f4b010eaa22858bb36e. All 173 listed files independently hashed and matched. See hash-verification.json.

Independence: read actual source, sidecars, Story/source closures, frame/model traces, media manifests and scope documentation before judgment. Did not read builder verification summaries or other Judge reports. Original candidate source, state and output were unchanged. All writes and intentional corruption occurred under judge-architecture; tests used a copied state directory.

## Fresh verification

The independent script probe.mts and independent-results.json record the actual checks. It:

- Recomputed every exported artifact's hash and byte length in both REA and fill bundles.
- Loaded each sidecar through the real verified Story/source loader against the copied state; rederived the entire mathematical trace, all 192 frame mappings and sample index sets. They exactly match the frozen exports.
- Confirmed successful status and successful-task resume for both tasks with GVE_BROWSER set to a nonexistent path. Resume returned cached without opening a browser. This tests the successful-task replay path, not interrupted render recovery.
- Reproduced the existing fill render identity 767ca8c75c43fa5bde3842c8c380d7317dc52eb5f192d1acf15d82f8ea2761d0. Changing the explicitly illustrative initial value from 5 to 4 produced identity 4ff7c7783365c40b6be64baeed6a88d767a309753213243ed21070780c75250d. The callback deliberately threw before TaskRunner creation/rendering, so no changed-video claim is made.
- Verified an ordinary direct SQLite update of a succeeded task is rejected by the successful-task immutability trigger.
- Corrupted the copied MP4 CAS blob; status rejected it as corrupt. Restored only the scratch copy afterward.

I independently ran full decode of both actual exported MP4 files with:

    ffmpeg -v error -xerror -nostdin -i rea-export/preview.mp4 -f null -
    ffmpeg -v error -xerror -nostdin -i fill-export/preview.mp4 -f null -

Both exited 0 with no decoder error output. Independent ffprobe results are in rea-probe.json and fill-probe.json: each is one H.264 video stream, 720×1000, 24 FPS, 192 decoded frames, eight seconds. No audio stream is present.

No new Remotion render, interrupted-task recovery experiment, native publication race test or continuous visual/audio review was performed by this role. Test source was read for architecture assessment but existing builder logs were not used as fresh proof.

## Source binding and factual integrity

The sidecar is captured exactly in task.input as base64 and binds its hash, Story task ID, graph hash and source manifest hash. Task identity additionally includes rendering code hashes, geometry and declared local tool identities. New task creation first loads the standalone Story and its verified captured sources. Replay of an unfinished task validates captured sidecar encoding/hash and recomputes identity before allowing TaskRunner work; changed environment requires a new identity. This unfinished replay behavior is code-inspected here, not freshly executed.

The exported Story graph and each source's hash are checked against committed bytes. REA's official HTML remains https://rea.tools/examples/dino-lab/ with hash a045d256cd040a21f163ad2f662c81d77e3fa47df6bc8add92b10f0b901dd769; it is not assigned a Git commit. Other graph sources retain their separate GitHub blob URLs at f4cc6c85efe7f3513d587df3bd5086adb1bc6a76. The runtime records standalone captured sources with no task-level Git association. It does not perform a new REA run or refresh the website.

The current parameter meanings remain the previously reviewed historical claims: initial 6, +0.001 per eligible update and a strict less-than-13 guard. Collision only disables the modeled increment branch; the model does not claim to describe the complete game's collision response. Manual assignment 4 and slider range are teaching choices. The hypothetical fill source remains locally authored with a reserved example.invalid URL, not a second real observed project.

Content/semantic review is still necessary. Numeric presence in an exact quote cannot prove parameter meaning. This limitation was disclosed and independently demonstrated in the earlier pilot review; the runtime does not remove it or claim otherwise.

## Time, frames and mathematical trajectory

The video time is fixed at eight seconds. The mathematical event time remains authored model time. REA spans 25,000 model milliseconds; fill spans 12,000. Every output frame is mapped by:

    modelMs = floor(frameIndex × modelDurationMs / 192)

REA therefore samples model times 0 through 24,869; fill samples 0 through 11,937. Frames are states at their sample time, not inclusive capture of the model endpoint. I verified every saved frame against the evaluator and this mapping, including sample indices around events.

The model's “milliseconds” are schedule coordinates, not measured original-game time. The rendered SVG explicitly labels illustrative projection and compressed model time, and the export manifest calls the result an eight-second silent preview. State arithmetic remains per eligible check. Track motion is integrated over authored model time with an illustrative scale; it does not establish real physical speed or original game update frequency. Teaching-game 60 updates/second is not used as original-game timing.

Dense updates may occur between video frames. The trace retains them all. The current two candidates retain their meaningful sampled branch/manual states, but this fixed-length sampler is not a general guarantee that every event or very short beat will appear. For a future full explanation, add event-visibility/dwell constraints or variable duration rather than claim complete perceptual coverage from the trace alone. This is a disclosed boundary of this proof, not a claimed factual execution.

## CAS/status verification boundary

Successful status verifies task/input identity, immutable task records, artifact fingerprints, hash/size, required closure and source hashes. Successful export uses that verified closure without requiring original sidecar paths or browser access. The expected Story and source bytes are committed alongside media, so offline inspection has the evidence needed.

Status does not independently regenerate trace/probe semantics or decode the movie on every read. I initially investigated whether a valid-hash output replacement could be used through normal state mutation; the ordinary SQLite update was rejected by the immutability trigger. No bypass is claimed, and no major finding is based on an attacker who can rewrite the whole authoritative database while restoring its schema. Keeping “integrity verified” distinct from a fresh semantic/media re-evaluation is important. This review independently rederived traces and decoded media precisely to assess those separate properties.

The first probe attempt stopped when the immutable trigger rejected that exploratory mutation; probe.log preserves the outcome. The finalized independent probe treats this rejection as the expected protection and completes all checks. No source fix was made.

## Architecture limits

- Trusted local renderer only; source text becomes escaped SVG/text. No target repository is executed.
- This task commits real silent MP4 plus source/input/trace/probe/PNG artifacts through the existing TaskRunner/CAS. The new export still depends on the previously reviewed Windows native publisher; fresh adversarial publication proof belongs to the runtime security/reliability role.
- Successful replay was tested. Cooperative cancellation, attempt budgets, failed/interrupted replay and owned-browser cleanup are implemented through existing runtime hooks and inspected, but not rerun here.
- The renderer uses system fonts in the SVG. Byte hashes prove the current rendered evidence, not cross-machine typographic identity or future human readability.
- The eight-second fixed geometry and silent content are a bounded mechanism proof. They do not complete full-story timing, narration, edit/review UX or owner acceptance.

No new unresolved major or blocker was found in the requested architecture/evidence/content scope. Final owner audiovisual acceptance remains pending.
