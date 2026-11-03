# Local narration for variable presentations

Use an existing verified presentation plan and import one authorized local recording per beat. Keep the import specification and exact original recording available for review. The existing `tts import` command accepts WAV, MP3 and FLAC.

```text
pnpm gve tts import --spec local-import.json --audio original.wav --data state
pnpm gve presentation status --kind plan --task PLAN --data state
pnpm gve presentation export --kind plan --task PLAN --data state --out plan-export
pnpm gve presentation voice-bind --spec voice-bindings.json --data state
pnpm gve presentation status --kind voice --task VOICE --data state
pnpm gve presentation render --mode narrated --task PLAN --voice VOICE --data state
pnpm gve presentation export --kind narrated --task MOVIE --data state --out movie-export
```

The binding is editable JSON. Use the exported `plan-manifest.json` raw SHA-256, the proposal hash from the plan, and the exact text from each proposal beat. Use the import output's `fingerprint`, `receiptArtifact.sha256` and `receipt.artifact.sha256`. Set offsets in 24 fps frames relative to the start of each beat.

```json
{
  "schemaVersion": "presentation-voice-bindings/1.0",
  "planTaskId": "<64-hex plan task ID>",
  "planManifestSha256": "<64-hex exported plan manifest SHA-256>",
  "proposalHash": "<64-hex proposal hash>",
  "playbackRate": 1,
  "voicePolicy": "caller-declared-local-import",
  "clips": [
    {
      "beatId": "listen",
      "receiptFingerprint": "<64-hex local import fingerprint>",
      "receiptSha256": "<64-hex import receipt SHA-256>",
      "sourceAudioSha256": "<64-hex original audio SHA-256>",
      "transcript": "The example listens on port three thousand.",
      "transcriptSha256": "<64-hex SHA-256 of the exact UTF-8 text>",
      "startOffsetFrames": 7
    }
  ]
}
```

Every beat must have exactly one complete clip. The technical fixture policy `windows-sapi-zira-technical-fixture` requires the declared label `Microsoft Zira Desktop / Windows SAPI / rate 0 / technical fixture`. The label remains caller-declared. Choose recordings the operator is authorized to use. The API checks binding and integrity. Spoken content, voice identity, rights and listening approval remain review responsibilities.

Voice binding verifies local import receipts and original bytes, repeats FFprobe container measurements, then fully decodes each recording to 48 kHz mono PCM16 at its original playback rate. Each presentation frame spans 2,000 samples. A clip is copied in full to its sample offset, with silence in unused regions. Empty audio and digital silence are rejected. If it cannot fit, the error reports the beat, actual samples, available samples and minimum extra frames where measurable in scope. Edit the affected beat's duration and build a new plan, then bind it explicitly. The selected [plan version](presentation-duration-v1.1.md) sets the total duration limit. A permanent invalid binding remains in history and requires corrected input. Cancelled local tasks can be retried by repeating the same request.

The VTT uses each clip's measured start and end, rounded outward to milliseconds. The burned captions use the same cue data, rounded outward to frames. Narration is kept exact in the ledger. The bounded display accepts short single-line text. Use additional authored beats with corresponding recordings for longer text. Event frames remain author-controlled. The ledger includes their offsets relative to the clip. Word-level alignment, semantic review and owner listening remain pending.

Narrated export includes the H.264/AAC movie, VTT, sampled PNGs, pinned editable plan and proposal, exact local import receipts and original recordings, normalized clips, PCM mix and cue ledger. AAC is a lossy carrier. The reference PCM is the basis for verifying exact sample placements. For a voice-only export, use `--kind voice`. For existing silent preview records, keep using `--kind preview`. Silent rendering still uses `--mode silent` and beat-timed script VTT.

A text, audio or timing revision requires an explicit new binding to the exact plan. Previous successful task IDs remain readable from their retained state. Export validates immutable CAS and publishes through the existing receipt mechanism. Keep the state and exported recordings in an authorized location.
