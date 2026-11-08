# Approved-script reel adapter (experimental)

`node --import tsx scripts/render-approved-reel.ts --spec <manifest.json> --out <new-directory>` renders a supplied, exact owner-approved script and media manifest; add `--frames-only` for still preflight. Input paths resolve relative to the manifest. The manifest schema lives in `src/renderer/approved-reel.ts` (approved-script-reel/1.0). Outputs cannot overwrite an existing directory.

This bounded adapter supports screenshot crops/pans, a three-input mechanism flow, an illustrative audio timeline, and one or two original-speed sample excerpts. It does not choose a story, run a target repository, synthesize speech, or implement the durable narrative-run stages. VoiceStudio validated this adapter; generic cross-project finished-media quality is not demonstrated.

Every narration line must match the approved script in order and bind its audio, transcript hash and actual local TTS receipt. Receipts establish provenance, not independently verified spoken words. The approval record is local caller-supplied authority, not authenticated identity. Original narration PCM is resampled to 24 kHz and fully retained, with frame-boundary zero padding; no speech-rate changes or trimming. Caption times remain proportional estimates. Optional `captionChunks` preserve exact text and permit natural phrase boundaries; omitted/reordered text and isolated punctuation are rejected.

The renderer copies hashed source assets, receipts and approved script into its new output, saves an editable manifest/timeline/props, renders PNG preflight frames and a 720x1280/30 H264/AAC MP4, checks FFprobe properties and decodes the entire file. Listening, continuous motion review and final owner acceptance remain separate requirements.

Directed validation: `pnpm exec vitest run tests/approved-reel.test.ts` and `pnpm exec tsc --noEmit`. No complete regression claimed. Private voice references/models and generated media stay local and ignored. The project uses its existing pinned Remotion/license policy.
