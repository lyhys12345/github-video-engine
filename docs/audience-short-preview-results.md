# Audience short preview pilot results

The original dotenv v3 and chi factfix previews remain available as immutable candidates. See the [measured baseline](short-preview-quality-baseline.md) and [authoring instructions](audience-short-preview.md).

| Candidate | Actual MP4 | Local workflow evidence |
| --- | --- | --- |
| dotenv mechanism v2 | 10 s, 300 frames, 720 × 1280 H.264, silent. SHA-256 `dd88e6220286a842926759ff39d4980203026deb185671a073510f96a7e2b537`. Full decode passed. | `work/dotenv-value-trace/preview-v2`, task `4510623584afa1b67b6b683293a377c6a77d1ce29514226596794ef45b335218` |
| dotenv audience | 37.1 s, 1,113 frames, 720 × 1280 H.264 and AAC. SHA-256 `a79a1c2ffbc811415ac9fd2ade24b8a239e3a07773427c0f12e0e2a8edb3d729`. Full decode passed. | `work/independent-dotenv-20261107/workspace-preview.html`, author `author-audience-measured-v2`, task `b3b1366873e235992959ac02bc56e9de2f44232f0a81211dc3f8ba62c5c60f8c` |
| chi audience | 45.867 s, 1,376 frames, 720 × 1280 H.264 and AAC. SHA-256 `973e017d709850b5fb5609f8c64cf2adaae65babdcff6d72c734e5cf254535b7`. Full decode passed. | `gve-chi-review/workspace-preview.html` under the local Codex documents directory, author `author-audience-rhythm-v2`, task `97f0a2ecd392f9fc17a96409b60697039e0c927c597b3ffed228da7414c707f0` |

The original dotenv audio had a 1.362 s low-level interval around 8.66–10.02 s. In the replacement, FFmpeg detected no interval at least 0.65 s below −42 dB. The chi replacement had one 0.703 s interval around 40.99–41.70 s. These measurements include any low-level audio inside the clips. The timeline preflight caps time after the last sample of a recording, so it cannot promise how a pause sounds. The longest scheduled tail was 0.193 s for dotenv and 0.340 s for chi. Both opted out of the opening card.

All six dotenv recordings were generated locally and then reused after timing changes. The chi revision generated only the new opening, and the five unchanged recordings reused the prior voice tasks. Both final renders reused their previously measured recordings. Parallel rendering failed in Remotion's FFmpeg subprocess with a missing temporary output path. Serial retries succeeded. The root cause of the parallel failure remains unverified.

The facts judge corrected a missing dotenv condition in the first draft. The source-backed illustration assumes the file can be read and `HELLO` is not already present. The revised story and authored preview data were reviewed against the pinned captures. The visual judge reviewed frames and confirmed that the silent value path is clearer after separating the moving tag from the text. The longer dotenv opening remains visually static and the per-scene resets and mobile caption size still affect readability. These remain short review candidates. Continuous playback, listening, subtitle alignment and owner acceptance are pending.

Verification in this iteration included `pnpm typecheck`, 36 focused tests and 57 additional targeted narrative/presentation/entry regression tests. The full repository suite was outside this pilot. Local visual and engineering reports and immutable outputs are retained with the pilot under `work/dotenv-value-trace`. No target repository code was executed.
