# Production public voice and Anna audition

The final candidate used the production adapters directly on Windows with Node 24.22.1. Worker and adapter source SHA-256 values are in the run evidence. The script did not restore `PROCESSOR_ARCHITECTURE` to the parent or add it to the adapter's scrubbed worker environment. State and temporary files were isolated from normal project state; the Anna profile was read locally and verified unchanged after both samples.

## Public Serena first generation and replay

The final worker SHA-256 was `aede4741e67518b10f820054fb59308de669fc97ab3c182d6bbb5ae6a0771090`. It generated a 9.040 s, 16 kHz mono PCM WAV through `generatePublicVoice` with the same 39-character Chinese input as the profiling runs. The SHA-256 matched all four earlier successful instrumented trials. Full FFmpeg decode exited 0.

The first successful generation invocation was a retry after a hard-link permission failure. It completed in 72.336 s, with no cache hit on that invocation. A second identical invocation returned the same task ID with a cache hit in 0.0559 s. The original trial's apparent latency was affected by its termination at the shell permission boundary. These wall observations are not a comparison that isolates a full-generation speedup. See `public-adapter.json`.

## Recoverable publication failures and cancellation

Under the original restricted shell token, both the public generation and Anna A obtained worker outputs but failed publication when the artifact store's required same-volume hard link returned EPERM. A separate local hard-link preflight under the scoped approved shell passed. The existing attempts were preserved and retried in the approved shell. Both original task IDs then succeeded on attempt 2. History shows started → publication failure → resumed → succeeded for each, with no task output in the failure record and one verified output in each successful task. See `public-failure.json`, `anna-failure.json`, `task-attempts-during.json`, and `task-attempts-final.json`.

An independent public task in separate scratch state was cancelled after observing the live worker request. Cancellation surfaced in 372.2 ms from delivery. Task state was `cancelled` with no result and zero outputs; owned runtime and task temporary directories were empty. Successful calls and cache replay also left these scratch temporary directories empty. See `public-cancellation.json`.

## Anna A/B local listening samples

Both samples used the same read-only profile, locked Qwen3-TTS 0.6B Base revision, seed 42, Chinese text words, and playback at 1.0×. Only punctuation changed. Anna B is 0.240 s shorter in this pair (4.4%). Both samples and both local WAV copies passed complete decode with exact matching hashes. Technical verification cannot establish which performance sounds more natural. Listening preference remains pending.

| Sample | Synthetic text | Duration | Local listening copy |
| --- | --- | ---: | --- |
| A | 把项目链接发给它，先看看脚本。确认没问题，再生成视频。 | 5.440 s | D:/gve-anna-render-temp/voice-first-20261114/anna-a.wav |
| B | 把项目链接发给它，先看看脚本，确认没问题再生成视频。 | 5.200 s | D:/gve-anna-render-temp/voice-first-20261114/anna-b.wav |

See `anna-a.json` and `anna-b.json` for generation manifest and local TTS receipt hashes, and `anna-listening-copies.json` for byte counts and matching copy SHA-256. Only the two generated test samples were copied outside the scratch state.
