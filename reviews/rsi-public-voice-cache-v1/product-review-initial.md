# Independent product review — initial candidate

Candidate manifest SHA-256: 98e3daa1d8db5a16e21f790a57f8833f6ffc75c1f205e2a808e05c611c63ed38.

Finding: The results document says the source audio “says” the declared task text, although actual spoken content has not been verified. This overstates evidence; describe it as the task's declared text. Integrator agreed to correct and re-freeze. Verdict pending recheck.

Independent checks: All 34 manifest file lengths and SHA-256 digests matched. The two actual WAV files matched recorded hashes, ffprobe reported PCM16 mono 16 kHz at 2.56 s and 2.16 s respectively, and ffmpeg full decode exited 0 for each. This establishes media metadata and decode, not spoken words, naturalness, alignment, listening or AV acceptance. The raw timing records and missing-model behavior were inspected; results and public guidance otherwise distinguish cache reuse, doctor readiness and new generation.
