# Short preview quality baseline

The owner rated dotenv v3 **2/10**. The opening sounded like a technical slide deck, there was an awkward gap around 8–10 seconds, and the sparse vertical layout and typography distracted from the explanation. The earlier REA dinosaur sample is the editorial reference for a concrete object that changes on screen and gives the audience a reason to ask how it works.

## Frozen evidence

- dotenv v3 task `a4d7adca49e8ba79bf50ee2b8eb2de707a46a0d33c1227e09fdc6925667833e8`, 30 seconds. MP4 SHA-256 `daf86a82597c57e87c9d760566492de9acdff84151ecb0ed1fcd09ec1088693c`. Local workspace `work/independent-dotenv-20261107`, author `author-visual-v3`. Use the immutable candidate and the existing v3 fact and visual reports for comparison.
- chi factfix task `ce5636f7b0ad624534eb5320fabd69dc97c6d395583ce2bf45503a325eb09c71`, 63.8 seconds. MP4 SHA-256 `417c4f3b03414972a64d47cd0ef584dcbbe53b5a3a7aa32fb7212790882d002e`. Local workspace `gve-chi-review`, author `author-factfix`. Keep its prior visual and independent reliability reports.

The dotenv v3 caption ledger places the first recording at 2.000–8.720 s and the second at 10.000–15.840 s. The gap between these declared recording intervals is 1.280 s. FFmpeg `silencedetect=noise=-42dB:d=0.65` on the actual MP4 detected low audio at 8.658–10.020 s (1.362 s), 15.829–18.237 s (2.408 s), and 22.392–30.016 s (7.624 s). This measures audio level. The user's listening is the evidence that the first internal gap feels awkward.

## Checks for the replacement candidate

| Owner feedback | Change | Evidence for review |
| --- | --- | --- |
| The opening is too technical | Show a recognizable problem or result before naming the library or API | First three seconds and opening line, assessed without a technical briefing |
| It feels like narrated slides | Follow one object through input, a visible change, and an outcome | Silent 8–12 second mechanism sample and independent review of what changes |
| The 8–10 second gap feels accidental | Use measured recording lengths and intentionally place any pause | Compare cue intervals and silence detection against this baseline, then listen continuously when available |
| Blank space and unattractive type | Give the main action a larger share of the portrait frame, use legible captions, and keep names like `dotenv` intact | Representative frames at phone width and overflow tests |
| Quality should transfer across repositories | Reuse the same layout and timing logic for a chi request/branch example | Two editable candidates and one change-and-rerun showing what regenerated |

Record judgments about the story and phone layout separately from the technical result. Continuous playback and listening remain unverified until somebody with access to the full audiovisual stream performs them.
