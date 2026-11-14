# Narration voice preference

New users without an authorized reference recording can explicitly select [qwen-public](public-local-voice-v1.md): a separate public CustomVoice model with built-in Serena (zh-CN) and Ryan (en-US). It does not reproduce Anna or Chen and does not require the owner's files. Its optional local installation is separate from rendering; paid TTS is not required.

The default is the owner's local Anna-style approximation (anna-local), generated offline with the Windows CUDA Qwen3-TTS adapter. It is reference-conditioned, not the original Anna model. No paid service is called. The reference and profile are not distributed with this repository; their rights and availability require separate verification. If the selected profile is unavailable, generation fails clearly without silently substituting another voice.

The ignored profile is work/local-anna-profile.json; GVE_ANNA_PROFILE overrides its path. It uses the same locked model and runtime format as the Chen profile, and points to local reference audio and its transcript. Windows, compatible CUDA hardware, separately installed Python and locked model files are currently required. Offline flags and the Python network audit hook are not an OS-level network sandbox.

In PowerShell, select another voice with $env:GVE_NARRATION_VOICE="chen-local" or $env:GVE_NARRATION_VOICE="windows-huihui". Set anna-local or remove the variable for the default. The existing Chen profile is work/local-chen-profile.json; GVE_CHEN_PROFILE overrides its path. Previously approved briefs with another selected voice require that voice on resume; select it explicitly.

Do not commit voice references, profiles, credentials or model weights. Other users selecting reference-conditioned voices need their own authorized reference and compatible runtime; the public preset path has no reference input. Listen to generated narration before use.

## Speaking pace and natural delivery

Speaking pace and generation latency are different preferences. This owner's current request is slightly brisk, conversational Anna narration with enough breathing room to stay natural. Other users can choose a different voice and pace. Record the request in the existing creative brief's `notes`, for example: "Delivery: slightly brisk and conversational; retain meaningful pauses; audition before choosing revised pacing." Notes guide the session Agent and reviewer; they do not set a hidden synthesis speed parameter.

The current 0.6B CustomVoice implementation ignores instruction text, and the Base voice-cloning interface has no supported native speaking-rate control. A "faster" instruction cannot be advertised as an implemented slider. For a requested audition, keep the spoken words, selected reference/voice and playback speed the same while comparing ordinary punctuation and more compact phrasing pauses. Save both exact input strings and recordings. A shorter generated duration is a measured observation, not proof that speech is complete, intelligible or natural.

Do not automatically choose the shortest recording, squeeze it into an already approved scene, change the reference recording or switch voices. Keep a natural breath at semantic boundaries. Generated auditions need actual listening; if the reviewer cannot hear, record naturalness and spoken-content completeness as unverified and let the owner choose. Any adopted text, voice or timing change must be reflected in the exact script review, audio receipts and caption/scene timing before formal video generation. No audition approves a film.
