# Narration voice preference

The default is the owner's local Anna-style approximation (anna-local), generated offline with the Windows CUDA Qwen3-TTS adapter. It is reference-conditioned, not the original Anna model. No paid service is called. The reference and profile are not distributed with this repository; their rights and availability require separate verification. If the selected profile is unavailable, generation fails clearly without silently substituting another voice.

The ignored profile is work/local-anna-profile.json; GVE_ANNA_PROFILE overrides its path. It uses the same locked model and runtime format as the Chen profile, and points to local reference audio and its transcript. Windows, compatible CUDA hardware, separately installed Python and locked model files are currently required. Offline flags and the Python network audit hook are not an OS-level network sandbox.

In PowerShell, select another voice with $env:GVE_NARRATION_VOICE="chen-local" or $env:GVE_NARRATION_VOICE="windows-huihui". Set anna-local or remove the variable for the default. The existing Chen profile is work/local-chen-profile.json; GVE_CHEN_PROFILE overrides its path. Previously approved briefs with another selected voice require that voice on resume; select it explicitly.

Do not commit voice references, profiles, credentials or model weights. Other users need their own authorized reference and compatible runtime. Listen to generated narration before use.
