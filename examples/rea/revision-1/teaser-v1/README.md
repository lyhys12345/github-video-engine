# Dinosaur teaser — owner review only

Scope: a 25-second, 1080×1920, 30 fps preview. No full film or publication is authorized by this preview request.

Timeline: 0–4.5s adjustable-speed hook; 4.5–10.5s update increments; 10.5–17.5s accumulation and threshold; 17.5–25s controllable result and REA/assistant roles.

Run from the engine root: `node --import tsx examples/rea/revision-1/teaser-v1/render.ts`.
The isolated runner uses the existing durable TaskRunner and content-addressed artifact store. Local state is in `C:/Users/luyuh/Documents/Codex/work/gve-dino-teaser-20261027/state`. Source hashes, voice hashes and font hash identify the candidate. The preview directory contains the MP4, narration, sampled frames, evaluation and artifact manifest after successful rendering.

The first sandbox browser launch stalled and was interrupted. A subsequent attempt initially returned TASK_BUSY; after the lease expired, the same task was resumed outside the sandbox. These attempt records are retained.

Visual inspection: frames 100, 220, 480 and 650 were actually opened. The speed comparison, increment values, threshold, captions and final role attribution were legible with no observed text clipping. This is sampled-frame inspection, not a complete perceptual motion review.

Audio: Microsoft Edge online `zh-CN-XiaoxiaoNeural`, rate -5%, four clips placed at 0.4, 4.9, 10.9 and 17.9 seconds. Voice provenance and clip hashes are in `work/owner-revision-1/teaser-voice/manifest.json`. No paid API was used. Naturalness and continuous audiovisual quality remain for the owner's listening review; retention is unmeasured. No background music was added so the voice is easy to assess. Public/commercial voice licensing is not asserted.

Grounding: https://rea.tools/examples/dino-lab/ . The video uses original teaching animation, not a recording of REA executing a target. It compresses update counts and does not equate an increment with one second. The actual rule tests speed below 13 before adding 0.001, so a last value slightly above 13 is possible. The rebuilt game is not presented as an exact clone. Existing frozen milestone candidates are unchanged.

Acceptance questions: Does the first three seconds earn attention? Does the visible accumulation explain acceleration without prior context? Does the voice sound conversational? Owner approval remains pending.
