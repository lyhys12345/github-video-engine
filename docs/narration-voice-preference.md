# Narration voice preference

The owner selected the previously accepted **local Chen-style approximation** as the default for future videos and does not authorize paid voice platforms. This is a preference for an approximation, not a claim that the original provider's model or weights were obtained.

The current unified `explanation run` speech/voice/preview path has no integrated local Chen-style adapter. It therefore fails with `CHEN_LOCAL_UNAVAILABLE` before generating or substituting narration. Planning and explicitly silent animation remain available. Existing media and recordings are not changed. The older local reference-conditioned experiment is described in [local voice](local-voice-v1.md); its documented MLX runtime requires Apple Silicon macOS, and its model files are not in this Windows checkout. Neither its availability nor quality is asserted on this machine.

Only when the owner explicitly asks for the alternative, set `GVE_NARRATION_VOICE=windows-huihui` for that particular run. This is the existing Windows voice, not Chen. A low-level explicit Huihui command also remains available for technical testing; neither makes it the default. Never set this variable automatically to bypass the preferred-voice failure.

This preference does not establish that the selected approximation works here. The remaining work is an appropriate local adapter and runtime, reference/weights availability, voice-and-text-bound receipts, per-scene regeneration and timing, and owner listening. Do not call paid services or label an unverified sound as Chen.
