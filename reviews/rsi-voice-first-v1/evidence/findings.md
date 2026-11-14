# First public Qwen generation on Windows

The public worker at checkout `57795ea` rejected Windows x64 in the adapter's scrubbed environment. Six scratch invocations stopped at the platform check before importing the runtime. A Node child process with the same selected environment reproduced `platform.machine() == ""` and `sysconfig.get_platform() == "win-amd64"`. Restoring only `PROCESSOR_ARCHITECTURE=AMD64` returned `platform.machine() == "AMD64"`. See `windows-architecture-proof.json` and the failing `baseline-1/verification.json`. This reproduces the base code's failure in the current environment and does not attribute earlier incidents.

## Successful fresh-process trials

The four successful runs executed sequentially, each in a fresh Python process at the worker's 300-second limit. Model SHA-256 and sizes were checked before each launch. The host filesystem cache was not flushed. The success timings restored only `PROCESSOR_ARCHITECTURE` to the adapter's scrubbed environment to let the exact original platform gate run. Offline flags and the Python socket audit remained active.

The worker copies preserved the public Serena preset, `zh-CN`, seed 42, CUDA BF16, SDPA, and `max_new_tokens=384`. Their changes were timing markers and, in two cases, the named thread settings. Phase timings synchronize CUDA after model loading and inference. FFprobe and a full FFmpeg decode ran after timed worker exit. The 39-character request includes punctuation and uses synthetic text unrelated to private recordings. No reference audio was used.

| Run | Torch CPU intra/inter | Verify model | NumPy/Torch import | SciPy/Qwen import | Model load | Inference | WAV write | Worker wall | Hash + worker |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Default 1 | 4 / 12 | 2.53 s | 12.66 s | 22.50 s | 4.44 s | 62.39 s | 0.035 s | 106.43 s | 108.96 s |
| Trial 4/2 | 4 / 2 | 3.59 s | 4.22 s | 14.60 s | 3.49 s | 54.91 s | 0.007 s | 79.39 s | 82.97 s |
| Default 2 | 4 / 12 | 2.39 s | 4.92 s | 11.99 s | 3.38 s | 58.62 s | 0.016 s | 81.04 s | 83.43 s |
| Trial 2/1 | 2 / 1 | 2.26 s | 4.16 s | 12.36 s | 3.65 s | 66.80 s | 0.016 s | 89.09 s | 91.35 s |

All WAVs had SHA-256 `fcafb9ae49253debc8a45385ce3d837a68f744e9f66f82cdf7ae196eadc495ae`. FFprobe reported 9.040 s of mono 16 kHz signed 16-bit PCM, and full decode returned exit 0. Source identity, per-phase timings, diagnostics, and formats are recorded in each trial's `verification.json`.

Inference occupied most worker time; runtime imports accounted for most time before inference. The NumPy/Torch import difference between default 1 and later trials preceded application of either thread setting. On comparable import timings, 4/2 improved measured hash-plus-worker time by 0.46 s (0.55%) in one trial. 2/1 took 7.92 s longer than default 2. These results do not justify changing the default thread settings. The experiment did not replicate candidates because the apparent gain was marginal and the RTX 3070 was needed for the next sequential experiment.

## Reproduction identity

- Platform was Windows x64, Intel Core i7-12700 with 20 logical CPUs, NVIDIA RTX 3070 with 8192 MiB, driver 595.95, CPython 3.12.14, CUDA runtime 12.8 and PyTorch 2.8.0+cu128. Pinned Qwen-TTS 0.1.1, Transformers 4.57.3 and Accelerate 1.12.0 passed the worker's version gate.
- Model was Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice at revision `85e237c12c027371202489a0ec509ded67b5e4b5`. Eleven files totaled 2,498,383,610 bytes. The first exact verification while diagnosing startup measured 14.34 s and subsequent attempts generally measured 2.26–3.59 s. The scratch SHA profiler used 8 MiB read blocks, so hash-plus-worker figures are measurements of the scratch path.
- Model lock SHA-256 `4951f1df7f2581651052e740594dbabf8c1c20af0cec1c731db5909e173a572a`. Runtime requirements SHA-256 `00f3bc66834e1162b14d398bc44e8213ef2c53e16d54d87029ea25d677bd9500`. Python launcher SHA-256 `b95409b2edc04f3db3f2a5021fa52d2e0791ae978c13cdeb857cab0f35476919`.
- Frozen original worker SHA-256 `1ce1b69f8ed426a7814e159ff077d6d5594bce3593cc87ea396781164a08714c` and Git blob `466de54dfbe12f51c3588c0e7486624f44010527` at `57795ea`. The raw bytes of the frozen file come from the Windows checkout.

## Node locked-model verification

With no CUDA worker running, Node 24.22.1 verified all model files in six interleaved trials. Each run checked the exact directory entries, ancestor types, file size, modification time, inode and SHA-256. The host filesystem cache had been warmed by the preceding verifications.

| Read buffer | Total verification times | Median | Median throughput | Read chunks |
| --- | --- | ---: | ---: | ---: |
| Current Node default, 64 KiB | 3.522, 4.199, 2.963 s | 3.522 s | 676.5 MiB/s | 38,131 |
| 1 MiB | 1.616, 1.776, 1.587 s | 1.616 s | 1,474.8 MiB/s | 2,391 |

The 1 MiB buffer saved 1.91 s (54.1%) in the median verification stage over all 2,498,383,610 bytes. Maximum observed chunk size was the requested 1 MiB. All SHA-256 values matched the lock in every trial. One mid-read cancellation for each buffer returned `ABORT_ERR` before hashing the complete model weight file. Rejection followed signal delivery by 2.59 ms at 64 KiB and 0.77 ms at 1 MiB in those trials. These measure verification and cancellation in isolation. See `hash-read-benchmark.mjs` and `hash-read-benchmark.json`.
